import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps, areEqual } from 'react-window';
import { createPortal } from 'react-dom';
import AutoSizer from '../common/AutoSizer';
import { VideoPlayer } from './VideoPlayer';
import { Play, Calendar, CheckSquare, Clock } from 'lucide-react';
import { SensitiveContent } from '../common/SensitiveContent';
import BatchToolbar from '../common/BatchToolbar';
import { SensitiveWarningBanner } from '../shared/SensitiveWarningBanner';
import Icon from '../common/Icon';

interface VideoItem {
  id: number;
  title: string;
  description?: string;
  filePath: string;
  fileType: string;
  isSensitive: boolean;
  albumId?: number;
  albumName?: string;
  metadata: {
    duration?: number;
    thumbnailPath?: string;
    transcript?: any[];
    chapters?: any[];
    [key: string]: any;
  };
  createdAt: string;
  entityName?: string;
  entityId?: number;
  tags?: Array<{ id: number; name: string }>;
  people?: Array<{ id: number; name: string }>;
}

interface Album {
  id: number;
  name: string;
  description?: string;
  itemCount: number;
  sensitiveCount?: number;
}

const naturalTitleCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const sortVideosInDisplayOrder = (items: VideoItem[]) =>
  [...items].sort((a, b) => {
    const titleCmp = naturalTitleCollator.compare(a.title || '', b.title || '');
    if (titleCmp !== 0) return titleCmp;

    const dateA = Number(new Date(a.createdAt || 0));
    const dateB = Number(new Date(b.createdAt || 0));
    if (dateA !== dateB) return dateB - dateA;

    return a.id - b.id;
  });

const VIDEO_THUMB_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect x="420" y="210" width="440" height="300" rx="20" fill="#0b1220" stroke="#1e293b" stroke-width="4"/>
      <polygon points="595,285 595,435 720,360" fill="#38bdf8" opacity="0.9"/>
      <text x="640" y="565" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="28">
        Video thumbnail unavailable
      </text>
    </svg>
  `);

const VideoCell = React.memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
  const {
    items,
    selectedItems,
    isBatchMode,
    onVideoClick,
    toggleSelection: _toggleSelection,
    columnCount,
    formatDate,
  } = data as any;
  const index = rowIndex * columnCount + columnIndex;

  if (index >= items.length) return null;

  const video = items[index];
  const isSelected = selectedItems.has(video.id);

  return (
    <div style={{ ...style, padding: '4px' }}>
      <button
        className={`w-full h-full group relative bg-[var(--glass-bg-strong)] border-[var(--glass-border)] rounded-[var(--radius-lg)] overflow-hidden cursor-pointer transition-all duration-300 shadow-[var(--glass-shadow)] hover:shadow-[var(--accent)]/20 ${
          isSelected
            ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30'
            : 'hover:border-[var(--accent)]/50'
        }`}
        onClick={() => onVideoClick(video, index)}
        tabIndex={isBatchMode ? 0 : -1}
      >
        <div className="aspect-video relative overflow-hidden bg-black">
          <SensitiveContent isSensitive={video.isSensitive} className="w-full h-full">
            <img
              key={video.id}
              src={`/api/media/video/${video.id}/thumbnail?v=${new Date(video.createdAt).getTime()}`}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.dataset.fallbackApplied === '1') return;
                img.dataset.fallbackApplied = '1';
                img.src = VIDEO_THUMB_PLACEHOLDER;
                img.classList.remove('group-hover:scale-110');
              }}
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-[var(--glass-shadow)] transform scale-90 group-hover:scale-100 transition-transform">
                <Play className="text-[var(--text-primary)] fill-white h-6 w-6 ml-1" />
              </div>
            </div>
          </SensitiveContent>

          {isBatchMode && (
            <div
              className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-[var(--accent)] border-[var(--accent)]'
                  : 'bg-black/50 border-[var(--glass-border)]'
              }`}
            >
              {isSelected && <CheckSquare className="h-4 w-4 text-[var(--text-primary)]" />}
            </div>
          )}

          {video.metadata?.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-[var(--text-primary)] font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.floor(video.metadata.duration / 60)}:
              {
                Math.floor(video.metadata.duration % 60)
                  .toString()
                  .padStart(2, '0')
                  .split('.')[0]
              }
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] truncate group-hover:text-[var(--accent)] transition-colors">
            {video.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(video.createdAt)}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}, areEqual);

export const VideoBrowser: React.FC = () => {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [libraryTotalCount, setLibraryTotalCount] = useState(0);
  const [_pickerOpenId, _setPickerOpenId] = useState<number | null>(null);
  const [_investigationsList, _setInvestigationsList] = useState<any[]>([]);
  const [_addingId, _setAddingId] = useState<number | null>(null);

  // Transcript search (within album or across all videos)
  const [transcriptSearch, setTranscriptSearch] = useState('');

  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const abortControllerRef = useRef<AbortController | null>(null);

  const currentAlbum = useMemo(
    () => albums.find((a) => a.id === selectedAlbum),
    [albums, selectedAlbum],
  );

  // Load albums on mount
  useEffect(() => {
    loadAlbums();
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const loadTotals = async () => {
      try {
        const res = await fetch('/api/media/video?page=1&limit=1');
        if (res.ok) {
          const json = await res.json();
          if (typeof json?.total === 'number') setLibraryTotalCount(json.total);
        }
      } catch {
        void 0;
      }
    };
    loadTotals();
  }, []);
  // Load items when album selection or transcript search changes
  useEffect(() => {
    fetchVideos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchVideos is stable and defined below
  }, [selectedAlbum, transcriptSearch]);

  const loadAlbums = async () => {
    try {
      const res = await fetch('/api/media/video/albums');
      if (!res.ok) throw new Error('Failed to load albums');
      const data = await res.json();
      setAlbums(data);
    } catch (err) {
      console.error('Failed to load albums:', err);
    }
  };

  // Batch Handlers
  const toggleSelection = useCallback((id: number) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const handleBatchTag = async (tagIds: number[], action: 'add' | 'remove') => {
    try {
      await fetch('/api/media/items/batch/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedItems), tagIds, action }),
      });
      fetchVideos(1);
      setSelectedItems(new Set());
      setIsBatchMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchPeople = async (personIds: number[]) => {
    try {
      await fetch('/api/media/items/batch/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedItems), personIds, action: 'add' }),
      });
      fetchVideos(1);
      setSelectedItems(new Set());
      setIsBatchMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVideos = useCallback(
    async (pageNum: number) => {
      try {
        setLoading(true);

        // Abort previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '24',
        });
        if (selectedAlbum) params.append('albumId', selectedAlbum.toString());
        if (transcriptSearch.trim()) params.append('transcriptQuery', transcriptSearch.trim());
        // Always sort by title as requested
        params.append('sortBy', 'title');

        const res = await fetch(`/api/media/video?${params}`, {
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) throw new Error('Failed to load video files');

        const data = await res.json();
        const newItems = (data.mediaItems || []) as VideoItem[];

        if (pageNum === 1) {
          setItems(sortVideosInDisplayOrder(newItems));
        } else {
          setItems((prev) => sortVideosInDisplayOrder([...prev, ...newItems]));
        }

        setHasMore(newItems.length === 24);
        setPage(pageNum);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error(err);
        setError('Failed to load video content');
      } finally {
        setLoading(false);
      }
    },
    [selectedAlbum, transcriptSearch],
  );

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const loadMoreItems = useCallback(() => {
    if (!loading && hasMore) {
      fetchVideos(page + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, fetchVideos, page]);

  const showSensitiveWarning =
    currentAlbum &&
    (currentAlbum.name.match(/Sensitive|Disturbing|Testimony|Victim|Survivor/i) ||
      (currentAlbum.sensitiveCount && currentAlbum.sensitiveCount > 0));

  // Handle video click
  const handleVideoClick = useCallback(
    (video: VideoItem, _index: number) => {
      if (isBatchMode) {
        toggleSelection(video.id);
      } else {
        setSelectedItem(video);
      }
    },
    [isBatchMode, toggleSelection],
  );

  const gridData = useMemo(
    () => ({
      items,
      selectedItems,
      isBatchMode,
      onVideoClick: handleVideoClick,
      toggleSelection,
      formatDate,
    }),
    [items, selectedItems, isBatchMode, handleVideoClick, toggleSelection, formatDate],
  );

  // Update URL when item or album is selected
  useEffect(() => {
    const url = new URL(window.location.href);

    // For video items, we might not be tracking id in URL as strictly or we need to check how VideoBrowser handles item selection via URL.
    // Assuming we want to track albumId primarily here based on user request "route when I select album".

    if (selectedAlbum) {
      url.searchParams.set('albumId', selectedAlbum.toString());
    } else {
      url.searchParams.delete('albumId');
    }

    // Preserve other params if needed, or push state.
    window.history.pushState({}, '', url.toString());
  }, [selectedAlbum]); // Intentionally not tracking selectedItem here unless requested, as Video modal usually manages its own state or overlay.

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-[var(--app-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] overflow-hidden rounded-[var(--radius-lg)]">
      {/* Header */}
      <div className="app-header-glass flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-6 md:h-14 shrink-0 z-10 gap-2">
        {/* Mobile Album Dropdown */}
        <div className="md:hidden">
          <button
            onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] text-sm h-8"
          >
            <span className="flex items-center gap-2">
              <Icon name="Folder" size="sm" />
              {selectedAlbum ? currentAlbum?.name : 'All Videos'}
            </span>
            <Icon name={showAlbumDropdown ? 'ChevronUp' : 'ChevronDown'} size="sm" />
          </button>
          {showAlbumDropdown && (
            <div className="absolute left-3 right-3 mt-1 dropdown-surface z-30 max-h-60 overflow-y-auto">
              <button
                className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between ${selectedAlbum === null ? 'bg-cyan-900/20 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'}`}
                onClick={() => {
                  setSelectedAlbum(null);
                  setShowAlbumDropdown(false);
                }}
              >
                <span>All Videos</span>
                <span className="text-xs opacity-70">{libraryTotalCount}</span>
              </button>
              {albums.map((album) => (
                <button
                  key={album.id}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between border-t border-[var(--glass-border)] ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'}`}
                  onClick={() => {
                    setSelectedAlbum(album.id);
                    setShowAlbumDropdown(false);
                  }}
                >
                  <span className="truncate">{album.name}</span>
                  <span className="text-xs opacity-70">{album.itemCount || 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-1">
          <div>
            <h2 className="text-lg font-light text-[var(--text-primary)]">Video Recordings</h2>
            <p className="text-[var(--text-muted)] text-xs hidden md:block">
              Forensic video evidence
            </p>
          </div>
          <div className="flex-1 flex items-center gap-3 justify-end">
            {/* Transcript search within current album / all videos */}
            <div className="relative w-full max-w-xs">
              <Icon
                name="Search"
                size="sm"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="text"
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder={
                  selectedAlbum ? 'Search transcripts in this album…' : 'Search transcripts…'
                }
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              {items.length} loaded{libraryTotalCount ? ` / ${libraryTotalCount}` : ''}
            </span>
            <button
              onClick={() => fetchVideos(1)}
              className="px-2 py-1 rounded-[var(--radius-lg)] text-xs bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]"
              title="Reload"
            >
              Reload
            </button>
          </div>
          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-xs transition-colors ${isBatchMode ? 'bg-[var(--accent)] text-[var(--text-primary)]' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]'}`}
          >
            {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Albums sidebar - Hidden on mobile */}
        <aside className="hidden md:flex w-60 bg-[var(--glass-bg-strong)] border-r border-[var(--glass-border)] flex-col shrink-0">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
            Albums
          </h3>
          <div className="flex-1 overflow-y-auto">
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === null ? 'bg-cyan-900/20 text-[var(--accent)] border-l-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border-l-2 border-transparent'}`}
              onClick={() => setSelectedAlbum(null)}
            >
              <span className="truncate">All Videos</span>
              <span className="text-xs opacity-70 bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
                {libraryTotalCount}
              </span>
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-[var(--accent)] border-l-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border-l-2 border-transparent'}`}
                onClick={() => setSelectedAlbum(album.id)}
                title={album.name}
              >
                <span className="truncate">{album.name}</span>
                <span className="text-xs opacity-70 bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
                  {album.itemCount || 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 bg-[var(--app-bg)] flex flex-col overflow-hidden">
          {loading && page === 1 ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--app-bg)]/50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]"></div>
            </div>
          ) : null}

          {/* Sensitive Content Warning Banner */}
          {showSensitiveWarning && <SensitiveWarningBanner mediaType="video" />}

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 mx-6 mt-6 rounded-[var(--radius-lg)]">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-[360px] overflow-hidden relative">
            <AutoSizer>
              {({ width, height }) => {
                if (width < 50) return null;

                // Match PhotoBrowser padding and gap logic, but tuned for 16:9 video cards
                const minColumnWidth = 220;
                const gap = 16;
                const availableWidth = width - 48; // p-6 equivalent padding
                const columnCount = Math.max(
                  1,
                  Math.floor((availableWidth + gap) / (minColumnWidth + gap)),
                );
                const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
                const rowCount = Math.ceil(items.length / columnCount);
                // Video thumbnail (16:9) plus title/metadata block
                const rowHeight = (columnWidth * 9) / 16 + 72;

                return (
                  <Grid
                    columnCount={columnCount}
                    columnWidth={columnWidth + gap}
                    height={height}
                    rowCount={rowCount}
                    rowHeight={rowHeight + gap}
                    width={width}
                    itemData={{ ...gridData, columnCount }}
                    className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent p-6"
                    style={{ overflowX: 'hidden' }}
                    onItemsRendered={({ visibleRowStopIndex }) => {
                      if (
                        visibleRowStopIndex * columnCount >= items.length - 12 &&
                        hasMore &&
                        !loading
                      ) {
                        loadMoreItems();
                      }
                    }}
                  >
                    {VideoCell}
                  </Grid>
                );
              }}
            </AutoSizer>

            {loading && items.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[var(--text-muted)] font-medium font-mono text-xs uppercase tracking-widest animate-pulse">
                    Crunching Evidence...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-[var(--glass-bg-strong)] border-t border-[var(--glass-border)] flex items-center justify-between px-3 text-[10px] text-[var(--text-muted)] select-none shrink-0">
        <div>{items.length} items</div>
        <div>{selectedAlbum ? currentAlbum?.name : 'All Videos'}</div>
      </div>

      {/* Batch Toolbar */}
      {isBatchMode && selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-4">
          <BatchToolbar
            selectedCount={selectedItems.size}
            onRotate={() => {}}
            onAssignTags={(tags) => handleBatchTag(tags, 'add')}
            onAssignPeople={handleBatchPeople}
            onAssignRating={() => {}}
            onEditMetadata={() => {}}
            onCancel={() => setSelectedItems(new Set())}
            onDeselect={() => setSelectedItems(new Set())}
          />
        </div>
      )}

      {/* Video Player Modal */}
      {selectedItem &&
        createPortal(
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8">
            <div className="w-full max-w-6xl h-[90vh] max-h-[90vh]">
              <VideoPlayer
                src={`/api/media/video/${selectedItem.id}/stream`}
                title={selectedItem.title}
                transcript={selectedItem.metadata.transcript}
                chapters={selectedItem.metadata.chapters}
                onClose={() => setSelectedItem(null)}
                autoPlay
                isSensitive={selectedItem.isSensitive}
                warningText={selectedItem.description}
                documentId={selectedItem.metadata.documentId || (selectedItem as any).documentId}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
