import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { Album, MediaImage, MediaStats, MediaTag } from '../types/media.types';

export type PhotoSortField = 'date_added' | 'date_taken' | 'filename' | 'file_size' | 'title';
export type PhotoSortOrder = 'asc' | 'desc';

interface PersonOption {
  id: number;
  name: string;
}

interface PhotoBrowserFilters {
  selectedAlbum: number | null;
  selectedTag: number | null;
  selectedPerson: number | null;
  hasPeopleOnly: boolean;
  sortField: PhotoSortField;
  sortOrder: PhotoSortOrder;
  searchQuery: string;
  excludeTextScans: boolean;
}

interface PhotoBrowserState {
  filters: PhotoBrowserFilters;
  images: MediaImage[];
  availablePeople: PersonOption[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  pendingViewerIndex: number | null;
}

type PhotoBrowserAction =
  | {
      type: 'SET_FILTER';
      key: keyof PhotoBrowserFilters;
      value: PhotoBrowserFilters[keyof PhotoBrowserFilters];
    }
  | { type: 'SET_AVAILABLE_PEOPLE'; availablePeople: PersonOption[] }
  | { type: 'FETCH_START'; append: boolean }
  | { type: 'FETCH_SUCCESS'; images: MediaImage[]; page: number; hasMore: boolean; append: boolean }
  | { type: 'FETCH_ERROR'; append: boolean }
  | { type: 'CONSUME_PENDING_VIEWER_INDEX' }
  | { type: 'SET_PENDING_VIEWER_INDEX'; index: number | null }
  | { type: 'UPDATE_IMAGES'; updater: (images: MediaImage[]) => MediaImage[] };

const PAGE_SIZE = 24;
const PHOTO_PAGE_CACHE_TTL = 30_000;
const photoPageCache = new Map<
  string,
  { images: MediaImage[]; total: number | null; timestamp: number }
>();

function getCachedPhotoPage(key: string) {
  const entry = photoPageCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > PHOTO_PAGE_CACHE_TTL) {
    photoPageCache.delete(key);
    return null;
  }
  return entry;
}

function setCachedPhotoPage(key: string, images: MediaImage[], total: number | null) {
  photoPageCache.set(key, {
    images,
    total,
    timestamp: Date.now(),
  });
}

function parseNumericParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInitialState(): PhotoBrowserState {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  return {
    filters: {
      selectedAlbum: parseNumericParam(params.get('albumId')),
      selectedTag: parseNumericParam(params.get('tagId')),
      selectedPerson: parseNumericParam(params.get('personId')),
      hasPeopleOnly: params.get('hasPeople') === 'true',
      sortField: 'date_added',
      sortOrder: 'desc',
      searchQuery: '',
      excludeTextScans: params.get('excludeTextScans') !== 'false', // Default to true
    },
    images: [],
    availablePeople: [],
    page: 1,
    hasMore: true,
    loading: true,
    pendingViewerIndex: null,
  };
}

function normalizeImage(image: Partial<MediaImage> & Record<string, unknown>): MediaImage {
  return {
    ...(image as MediaImage),
    isSensitive: Boolean(image.isSensitive),
    fileSize: Number(image.fileSize || 0),
  };
}

function reducer(state: PhotoBrowserState, action: PhotoBrowserAction): PhotoBrowserState {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.key]: action.value,
        },
      };
    case 'SET_AVAILABLE_PEOPLE':
      return {
        ...state,
        availablePeople: action.availablePeople,
      };
    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        ...(action.append ? {} : { images: [], page: 1, hasMore: true, pendingViewerIndex: null }),
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        images: action.append ? [...state.images, ...action.images] : action.images,
        page: action.page,
        hasMore: action.hasMore,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        ...(action.append ? {} : { images: [], page: 1, hasMore: false }),
      };
    case 'SET_PENDING_VIEWER_INDEX':
      return {
        ...state,
        pendingViewerIndex: action.index,
      };
    case 'CONSUME_PENDING_VIEWER_INDEX':
      return {
        ...state,
        pendingViewerIndex: null,
      };
    case 'UPDATE_IMAGES':
      return {
        ...state,
        images: action.updater(state.images),
      };
    default:
      return state;
  }
}

function buildImageQuery(filters: PhotoBrowserFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.selectedAlbum) params.append('albumId', filters.selectedAlbum.toString());
  if (filters.selectedTag) params.append('tagId', filters.selectedTag.toString());
  if (filters.selectedPerson) params.append('personId', filters.selectedPerson.toString());
  if (filters.hasPeopleOnly) params.append('hasPeople', 'true');
  if (filters.excludeTextScans) params.append('excludeTextScans', 'true');
  if (filters.searchQuery.trim()) params.append('search', filters.searchQuery.trim());
  params.append('sortField', filters.sortField);
  params.append('sortOrder', filters.sortOrder);
  params.append('page', page.toString());
  params.append('limit', PAGE_SIZE.toString());
  params.append('slim', 'true');
  return `/media/images?${params.toString()}`;
}

async function fetchLibraryTotalCount(): Promise<number> {
  try {
    const stats = await apiClient.get<MediaStats>('/media/stats', { cacheTtl: 60_000 });
    if (typeof stats?.totalImages === 'number') return stats.totalImages;
  } catch {
    void 0;
  }

  const response = await fetch('/api/media/images?page=1&limit=1&slim=true');
  const totalHeader = response.headers.get('X-Total-Count');
  return totalHeader ? Number.parseInt(totalHeader, 10) || 0 : 0;
}

export function usePhotoBrowserData() {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const requestKeyRef = useRef<string | null>(null);
  const loadMoreKeyRef = useRef<string | null>(null);

  const querySignature = useMemo(
    () =>
      JSON.stringify({
        selectedAlbum: state.filters.selectedAlbum,
        selectedTag: state.filters.selectedTag,
        selectedPerson: state.filters.selectedPerson,
        hasPeopleOnly: state.filters.hasPeopleOnly,
        sortField: state.filters.sortField,
        sortOrder: state.filters.sortOrder,
        searchQuery: state.filters.searchQuery.trim(),
        excludeTextScans: state.filters.excludeTextScans,
      }),
    [state.filters],
  );

  // Bootstrap data: albums, tags, and library total count via useQuery
  const { data: bootstrapData } = useQuery({
    queryKey: ['photo-browser-bootstrap'],
    queryFn: async () => {
      const [albumsResult, tagsResult, totalResult] = await Promise.allSettled([
        apiClient.get<Album[]>('/media/albums', { cacheTtl: 60_000 }),
        apiClient.get<MediaTag[]>('/media/tags', { cacheTtl: 60_000 }),
        fetchLibraryTotalCount(),
      ]);
      return {
        albums:
          albumsResult.status === 'fulfilled' && Array.isArray(albumsResult.value)
            ? albumsResult.value
            : ([] as Album[]),
        availableTags:
          tagsResult.status === 'fulfilled' && Array.isArray(tagsResult.value)
            ? tagsResult.value
            : ([] as MediaTag[]),
        libraryTotalCount: totalResult.status === 'fulfilled' ? totalResult.value : 0,
      };
    },
    staleTime: 60_000,
  });

  const albums = bootstrapData?.albums ?? [];
  const availableTags = bootstrapData?.availableTags ?? [];
  const libraryTotalCount = bootstrapData?.libraryTotalCount ?? 0;
  const bootstrapLoaded = bootstrapData !== undefined;

  const runPageFetch = useCallback(
    async (page: number, append: boolean, signal?: AbortSignal) => {
      const endpoint = buildImageQuery(state.filters, page);
      const requestKey = `${querySignature}:${page}:${append ? 'append' : 'replace'}`;
      const cacheKey = `${querySignature}:${page}`;
      requestKeyRef.current = requestKey;

      dispatch({ type: 'FETCH_START', append });

      try {
        const cachedPage = getCachedPhotoPage(cacheKey);
        if (cachedPage) {
          dispatch({
            type: 'FETCH_SUCCESS',
            images: cachedPage.images,
            page,
            hasMore:
              cachedPage.total !== null
                ? page * PAGE_SIZE < cachedPage.total
                : cachedPage.images.length === PAGE_SIZE,
            append,
          });
          return;
        }

        const response = await fetch(`/api${endpoint}`, { signal });
        const data = await response.json();
        if (signal?.aborted || requestKeyRef.current !== requestKey) return;

        const normalized = Array.isArray(data) ? data.map(normalizeImage) : [];
        const totalCountHeader = response.headers.get('X-Total-Count');
        const total = totalCountHeader ? Number.parseInt(totalCountHeader, 10) : null;
        const hasMore = total !== null ? page * PAGE_SIZE < total : normalized.length === PAGE_SIZE;
        setCachedPhotoPage(cacheKey, normalized, total);

        dispatch({
          type: 'FETCH_SUCCESS',
          images: normalized,
          page,
          hasMore,
          append,
        });

        if (!append && page === 1 && typeof window !== 'undefined') {
          const photoId = new URLSearchParams(window.location.search).get('photoId');
          if (photoId) {
            const initialIndex = normalized.findIndex((image) => image.id.toString() === photoId);
            if (initialIndex !== -1) {
              dispatch({ type: 'SET_PENDING_VIEWER_INDEX', index: initialIndex });
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Failed to load images:', error);
        if (requestKeyRef.current === requestKey) {
          dispatch({ type: 'FETCH_ERROR', append });
        }
      } finally {
        if (requestKeyRef.current === requestKey) {
          loadMoreKeyRef.current = null;
        }
      }
    },
    [querySignature, state.filters],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);

    if (state.filters.selectedAlbum)
      url.searchParams.set('albumId', state.filters.selectedAlbum.toString());
    else url.searchParams.delete('albumId');

    if (state.filters.selectedTag)
      url.searchParams.set('tagId', state.filters.selectedTag.toString());
    else url.searchParams.delete('tagId');

    if (state.filters.selectedPerson)
      url.searchParams.set('personId', state.filters.selectedPerson.toString());
    else url.searchParams.delete('personId');

    if (state.filters.hasPeopleOnly) url.searchParams.set('hasPeople', 'true');
    else url.searchParams.delete('hasPeople');

    if (state.filters.excludeTextScans === false) url.searchParams.set('excludeTextScans', 'false');
    else url.searchParams.delete('excludeTextScans');

    window.history.replaceState({}, '', url);
  }, [
    state.filters.hasPeopleOnly,
    state.filters.selectedAlbum,
    state.filters.selectedPerson,
    state.filters.selectedTag,
    state.filters.excludeTextScans,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    loadMoreKeyRef.current = null;
    void runPageFetch(1, false, controller.signal);
    return () => controller.abort();
  }, [querySignature, runPageFetch]);

  const setSelectedAlbum = useCallback((value: number | null) => {
    dispatch({ type: 'SET_FILTER', key: 'selectedAlbum', value });
  }, []);

  const setSelectedTag = useCallback((value: number | null) => {
    dispatch({ type: 'SET_FILTER', key: 'selectedTag', value });
  }, []);

  const setSelectedPerson = useCallback((value: number | null) => {
    dispatch({ type: 'SET_FILTER', key: 'selectedPerson', value });
  }, []);

  const setHasPeopleOnly = useCallback((value: boolean) => {
    dispatch({ type: 'SET_FILTER', key: 'hasPeopleOnly', value });
  }, []);

  const setSortField = useCallback((value: PhotoSortField) => {
    dispatch({ type: 'SET_FILTER', key: 'sortField', value });
  }, []);

  const setSortOrder = useCallback((value: PhotoSortOrder) => {
    dispatch({ type: 'SET_FILTER', key: 'sortOrder', value });
  }, []);

  const setSearchQuery = useCallback((value: string) => {
    dispatch({ type: 'SET_FILTER', key: 'searchQuery', value });
  }, []);

  const setExcludeTextScans = useCallback((value: boolean) => {
    dispatch({ type: 'SET_FILTER', key: 'excludeTextScans', value });
  }, []);

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    const nextPage = state.page + 1;
    const loadKey = `${querySignature}:${nextPage}`;
    if (loadMoreKeyRef.current === loadKey) return;
    loadMoreKeyRef.current = loadKey;
    await runPageFetch(nextPage, true);
  }, [querySignature, runPageFetch, state.hasMore, state.loading, state.page]);

  const loadPeopleOptions = useCallback(async () => {
    if (state.availablePeople.length > 0) return;
    try {
      const response = await apiClient.get<
        | { data?: Array<{ id: number; fullName?: string; name?: string }> }
        | Array<{ id: number; fullName?: string; name?: string }>
      >('/entities?page=1&limit=100', { cacheTtl: 60_000 });
      const people = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];

      dispatch({
        type: 'SET_AVAILABLE_PEOPLE',
        availablePeople: people.map((person) => ({
          id: person.id,
          name: person.fullName || person.name || `Entity ${person.id}`,
        })),
      });
    } catch {
      void 0;
    }
  }, [state.availablePeople.length]);

  const updateImages = useCallback((updater: (images: MediaImage[]) => MediaImage[]) => {
    dispatch({ type: 'UPDATE_IMAGES', updater });
  }, []);

  const consumePendingViewerIndex = useCallback(() => {
    dispatch({ type: 'CONSUME_PENDING_VIEWER_INDEX' });
  }, []);

  return {
    ...state,
    ...state.filters,
    albums,
    availableTags,
    libraryTotalCount,
    bootstrapLoaded,
    setSelectedAlbum,
    setSelectedTag,
    setSelectedPerson,
    setHasPeopleOnly,
    setSortField,
    setSortOrder,
    setSortOrder,
    setSearchQuery,
    setExcludeTextScans,
    loadPeopleOptions,
    loadMore,
    updateImages,
    consumePendingViewerIndex,
  };
}
