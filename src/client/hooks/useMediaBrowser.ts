import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@client/services/apiClient';

/**
 * Configuration for the media browser hook
 */
export interface MediaBrowserConfig {
  /** API endpoint for fetching media items (e.g., '/api/media/audio', '/api/media/video') */
  mediaEndpoint: string;
  /** API endpoint for fetching albums */
  albumsEndpoint: string;
  /** Number of items per page */
  pageSize?: number;
}

/**
 * Album type used across media browsers
 */
export interface MediaAlbum {
  id: number;
  name: string;
  description?: string;
  itemCount: number;
  sensitiveCount?: number;
}

/**
 * Base media item type - extended by specific media types
 */
export interface BaseMediaItem {
  id: number;
  title: string;
  description?: string;
  filePath: string;
  fileType: string;
  isSensitive: boolean;
  albumId?: number;
  albumName?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  entityName?: string;
  entityId?: number;
  tags?: Array<{ id: number; name: string }>;
  people?: Array<{ id: number; name: string }>;
}

/**
 * Return type for the useMediaBrowser hook
 */
export interface MediaBrowserState<T extends BaseMediaItem> {
  items: T[];
  albums: MediaAlbum[];
  selectedAlbum: number | null;
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  isBatchMode: boolean;
  selectedItems: Set<number>;
  showAlbumDropdown: boolean;
}

export interface MediaBrowserActions {
  setSelectedAlbum: (albumId: number | null) => void;
  setShowAlbumDropdown: (show: boolean) => void;
  setIsBatchMode: (enabled: boolean) => void;
  toggleItemSelection: (id: number) => void;
  clearSelection: () => void;
  loadMore: () => void;
  refresh: () => void;
  handleBatchTag: (tagIds: number[], action: 'add' | 'remove') => Promise<void>;
  handleBatchPeople: (personIds: number[], action?: 'add' | 'remove') => Promise<void>;
  getCurrentAlbum: () => MediaAlbum | undefined;
  showSensitiveWarning: () => boolean;
}

/**
 * Shared hook for media browser components (Audio, Video, Photo).
 * Consolidates duplicated state management and data fetching logic.
 */
export function useMediaBrowser<T extends BaseMediaItem>(
  config: MediaBrowserConfig,
): [MediaBrowserState<T>, MediaBrowserActions] {
  const { mediaEndpoint, albumsEndpoint, pageSize = 24 } = config;

  // Core state
  const [items, setItems] = useState<T[]>([]);
  const [albums, setAlbums] = useState<MediaAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // UI state
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);

  // Batch mode state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Fetch items function with useCallback to prevent recreation
  const fetchItems = useCallback(
    async (pageNum: number): Promise<void> => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: pageSize.toString(),
        });
        if (selectedAlbum) {
          params.append('albumId', selectedAlbum.toString());
        }

        const res = await fetch(`${mediaEndpoint}?${params}`);
        if (!res.ok) throw new Error('Failed to load media files');

        const data = await res.json();
        const newItems = (data.mediaItems || []) as T[];

        if (pageNum === 1) {
          setItems(newItems);
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }

        setHasMore(newItems.length === pageSize);
        setPage(pageNum);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load media content');
      } finally {
        setLoading(false);
      }
    },
    [mediaEndpoint, pageSize, selectedAlbum],
  );

  // Load albums function with useCallback
  const loadAlbums = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(albumsEndpoint);
      if (!res.ok) throw new Error('Failed to load albums');
      const data = await res.json();
      setAlbums(data);
    } catch (err) {
      console.error('Failed to load albums:', err);
    }
  }, [albumsEndpoint]);

  // Load albums on mount
  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  // Load items when album selection changes
  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  const toggleItemSelection = useCallback((id: number): void => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback((): void => {
    setSelectedItems(new Set());
  }, []);

  const loadMore = useCallback((): void => {
    fetchItems(page + 1);
  }, [fetchItems, page]);

  const refresh = useCallback((): void => {
    fetchItems(1);
  }, [fetchItems]);

  const handleBatchTag = useCallback(
    async (tagIds: number[], action: 'add' | 'remove'): Promise<void> => {
      try {
        await apiClient.batchTagMediaItems(Array.from(selectedItems), tagIds, action);
        fetchItems(1);
        setSelectedItems(new Set());
        setIsBatchMode(false);
      } catch (e) {
        console.error('Batch tag operation failed:', e);
      }
    },
    [fetchItems, selectedItems],
  );

  const handleBatchPeople = useCallback(
    async (personIds: number[], action: 'add' | 'remove' = 'add'): Promise<void> => {
      try {
        await apiClient.batchPeopleMediaItems(Array.from(selectedItems), personIds, action);
        fetchItems(1);
        setSelectedItems(new Set());
        setIsBatchMode(false);
      } catch (e) {
        console.error('Batch people operation failed:', e);
      }
    },
    [fetchItems, selectedItems],
  );

  const getCurrentAlbum = useCallback((): MediaAlbum | undefined => {
    return albums.find((a) => a.id === selectedAlbum);
  }, [albums, selectedAlbum]);

  const showSensitiveWarning = useCallback((): boolean => {
    const currentAlbum = getCurrentAlbum();
    if (!currentAlbum) return false;

    const hasSensitiveName = /Sensitive|Disturbing|Testimony|Victim|Survivor/i.test(
      currentAlbum.name,
    );
    const hasSensitiveContent =
      currentAlbum.sensitiveCount !== undefined && currentAlbum.sensitiveCount > 0;

    return hasSensitiveName || hasSensitiveContent;
  }, [getCurrentAlbum]);

  const state: MediaBrowserState<T> = {
    items,
    albums,
    selectedAlbum,
    loading,
    error,
    page,
    hasMore,
    isBatchMode,
    selectedItems,
    showAlbumDropdown,
  };

  const actions: MediaBrowserActions = {
    setSelectedAlbum,
    setShowAlbumDropdown,
    setIsBatchMode,
    toggleItemSelection,
    clearSelection,
    loadMore,
    refresh,
    handleBatchTag,
    handleBatchPeople,
    getCurrentAlbum,
    showSensitiveWarning,
  };

  return [state, actions];
}

/**
 * Format a date string for display
 */
export function formatMediaDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
