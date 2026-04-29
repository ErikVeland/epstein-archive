import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@client/services/apiClient';

interface CollectionAlbum {
  id: number;
  name: string;
  description?: string;
  itemCount?: number;
  sensitiveCount?: number;
}

interface CollectionState<TItem> {
  items: TItem[];
  selectedAlbum: number | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

type CollectionAction<TItem> =
  | { type: 'SET_SELECTED_ALBUM'; value: number | null }
  | { type: 'SET_SEARCH_QUERY'; value: string }
  | { type: 'FETCH_START'; append: boolean }
  | { type: 'FETCH_SUCCESS'; items: TItem[]; page: number; hasMore: boolean; append: boolean }
  | { type: 'FETCH_ERROR'; message: string; append: boolean }
  | { type: 'UPDATE_ITEMS'; updater: (items: TItem[]) => TItem[] };

interface UsePaginatedMediaCollectionOptions<TItem> {
  mediaEndpoint: string;
  albumsEndpoint: string;
  pageSize?: number;
  initialAlbumId?: number | null;
  initialSearchQuery?: string;
  errorMessage: string;
  buildQuery?: (
    params: URLSearchParams,
    state: { selectedAlbum: number | null; searchQuery: string },
  ) => void;
  transformItems?: (items: TItem[]) => TItem[];
  extractItems?: (payload: Record<string, unknown>) => TItem[];
  extractTotal?: (payload: Record<string, unknown>) => number | null;
  syncAlbumToUrl?: boolean;
}

function defaultExtractItems<TItem>(payload: Record<string, unknown>): TItem[] {
  return Array.isArray(payload?.mediaItems) ? (payload.mediaItems as TItem[]) : [];
}

function defaultExtractTotal(payload: Record<string, unknown>): number | null {
  return typeof payload?.total === 'number'
    ? payload.total
    : Array.isArray(payload?.mediaItems)
      ? (payload.mediaItems as unknown[]).length
      : null;
}

const CACHE_TTL = 30_000;
const collectionPageCache = new Map<
  string,
  { items: unknown[]; total: number | null; timestamp: number }
>();

function getCachedPage<TItem>(key: string): { items: TItem[]; total: number | null } | null {
  const entry = collectionPageCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    collectionPageCache.delete(key);
    return null;
  }
  return {
    items: entry.items as TItem[],
    total: entry.total,
  };
}

function setCachedPage<TItem>(key: string, items: TItem[], total: number | null) {
  collectionPageCache.set(key, {
    items,
    total,
    timestamp: Date.now(),
  });
}

function invalidateCollectionCache(prefix: string) {
  for (const key of collectionPageCache.keys()) {
    if (key.includes(prefix)) {
      collectionPageCache.delete(key);
    }
  }
}

function createInitialState<TItem>(
  initialAlbumId: number | null,
  initialSearchQuery: string,
): CollectionState<TItem> {
  return {
    items: [],
    selectedAlbum: initialAlbumId,
    searchQuery: initialSearchQuery,
    loading: true,
    error: null,
    page: 1,
    hasMore: true,
  };
}

function reducer<TItem>(
  state: CollectionState<TItem>,
  action: CollectionAction<TItem>,
): CollectionState<TItem> {
  switch (action.type) {
    case 'SET_SELECTED_ALBUM':
      return { ...state, selectedAlbum: action.value };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.value };
    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        error: null,
        ...(action.append ? {} : { items: [], page: 1, hasMore: true }),
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        error: null,
        items: action.append ? [...state.items, ...action.items] : action.items,
        page: action.page,
        hasMore: action.hasMore,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.message,
        ...(action.append ? {} : { items: [], page: 1, hasMore: false }),
      };
    case 'UPDATE_ITEMS':
      return {
        ...state,
        items: action.updater(state.items),
      };
    default:
      return state;
  }
}

export function usePaginatedMediaCollection<TItem, TAlbum extends CollectionAlbum>(
  options: UsePaginatedMediaCollectionOptions<TItem>,
) {
  const {
    mediaEndpoint,
    albumsEndpoint,
    pageSize = 24,
    initialAlbumId = null,
    initialSearchQuery = '',
    errorMessage,
    buildQuery,
    transformItems,
    extractItems = defaultExtractItems,
    extractTotal = defaultExtractTotal,
    syncAlbumToUrl = false,
  } = options;

  const [state, dispatch] = useReducer(reducer<TItem>, undefined, () =>
    createInitialState<TItem>(initialAlbumId, initialSearchQuery),
  );
  const requestKeyRef = useRef<string | null>(null);
  const loadMoreKeyRef = useRef<string | null>(null);

  const querySignature = useMemo(
    () =>
      JSON.stringify({
        mediaEndpoint,
        selectedAlbum: state.selectedAlbum,
        searchQuery: state.searchQuery.trim(),
      }),
    [mediaEndpoint, state.searchQuery, state.selectedAlbum],
  );

  // Bootstrap data: albums and library total count via useQuery
  const { data: bootstrapData } = useQuery({
    queryKey: ['paginated-media-bootstrap', albumsEndpoint, mediaEndpoint],
    queryFn: async () => {
      const [albumsPayload, totalPayload] = await Promise.all([
        apiClient.get<TAlbum[]>(albumsEndpoint, { cacheTtl: 60_000 }),
        apiClient.get<Record<string, unknown>>(`${mediaEndpoint}?page=1&limit=1`, {
          cacheTtl: 60_000,
        }),
      ]);
      return {
        albums: Array.isArray(albumsPayload) ? albumsPayload : ([] as TAlbum[]),
        libraryTotalCount: Math.max(0, extractTotal(totalPayload) ?? 0),
      };
    },
    staleTime: 60_000,
  });

  const albums = bootstrapData?.albums ?? ([] as TAlbum[]);
  const libraryTotalCount = bootstrapData?.libraryTotalCount ?? 0;

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (state.selectedAlbum) {
        params.append('albumId', state.selectedAlbum.toString());
      }
      if (buildQuery) {
        buildQuery(params, {
          selectedAlbum: state.selectedAlbum,
          searchQuery: state.searchQuery,
        });
      }

      const endpoint = `${mediaEndpoint}?${params.toString()}`;
      const requestKey = `${querySignature}:${page}:${append ? 'append' : 'replace'}`;
      const cacheKey = `${querySignature}:${page}`;
      requestKeyRef.current = requestKey;

      dispatch({ type: 'FETCH_START', append });

      try {
        const cached = getCachedPage<TItem>(cacheKey);
        if (cached) {
          const nextItems = transformItems ? transformItems(cached.items) : cached.items;
          dispatch({
            type: 'FETCH_SUCCESS',
            items: nextItems,
            page,
            hasMore:
              cached.total !== null
                ? page * pageSize < cached.total
                : nextItems.length === pageSize,
            append,
          });
          return;
        }

        const payload = await apiClient.get<Record<string, unknown>>(endpoint, {
          cacheTtl: CACHE_TTL,
        });
        if (requestKeyRef.current !== requestKey) return;

        const rawItems = extractItems(payload);
        const normalizedItems = transformItems ? transformItems(rawItems) : rawItems;
        const total = extractTotal(payload);
        setCachedPage(cacheKey, normalizedItems, total);

        dispatch({
          type: 'FETCH_SUCCESS',
          items: normalizedItems,
          page,
          hasMore: total !== null ? page * pageSize < total : normalizedItems.length === pageSize,
          append,
        });
      } catch (error) {
        console.error(error);
        if (requestKeyRef.current === requestKey) {
          dispatch({ type: 'FETCH_ERROR', message: errorMessage, append });
        }
      } finally {
        if (requestKeyRef.current === requestKey) {
          loadMoreKeyRef.current = null;
        }
      }
    },
    [
      buildQuery,
      errorMessage,
      extractItems,
      extractTotal,
      mediaEndpoint,
      pageSize,
      querySignature,
      state.searchQuery,
      state.selectedAlbum,
      transformItems,
    ],
  );

  useEffect(() => {
    void fetchPage(1, false);
  }, [fetchPage, querySignature]);

  useEffect(() => {
    if (!syncAlbumToUrl || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (state.selectedAlbum) url.searchParams.set('albumId', state.selectedAlbum.toString());
    else url.searchParams.delete('albumId');
    window.history.pushState({}, '', url.toString());
  }, [state.selectedAlbum, syncAlbumToUrl]);

  const setSelectedAlbum = useCallback((value: number | null) => {
    dispatch({ type: 'SET_SELECTED_ALBUM', value });
  }, []);

  const setSearchQuery = useCallback((value: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', value });
  }, []);

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    const nextPage = state.page + 1;
    const loadKey = `${querySignature}:${nextPage}`;
    if (loadMoreKeyRef.current === loadKey) return;
    loadMoreKeyRef.current = loadKey;
    await fetchPage(nextPage, true);
  }, [fetchPage, querySignature, state.hasMore, state.loading, state.page]);

  const refresh = useCallback(async () => {
    invalidateCollectionCache(mediaEndpoint);
    invalidateCollectionCache(querySignature);
    loadMoreKeyRef.current = null;
    await fetchPage(1, false);
  }, [fetchPage, mediaEndpoint, querySignature]);

  const updateItems = useCallback((updater: (items: TItem[]) => TItem[]) => {
    dispatch({ type: 'UPDATE_ITEMS', updater });
  }, []);

  return {
    ...state,
    albums,
    libraryTotalCount,
    setSelectedAlbum,
    setSearchQuery,
    loadMore,
    refresh,
    updateItems,
  };
}
