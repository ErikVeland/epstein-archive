import React, { useState, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps, areEqual } from 'react-window';
import { createPortal } from 'react-dom';
import {
  Icon,
  MediaBrowserCount,
  MediaBrowserDropdown,
  MediaBrowserDropdownItem,
  MediaBrowserHeader,
  MediaBrowserMobileTrigger,
  MediaBrowserPanel,
  MediaBrowserSearch,
  MediaBrowserSearchInput,
  MediaBrowserShell,
  MediaBrowserSidebar,
  MediaBrowserSidebarItem,
  MediaBrowserSidebarTitle,
  MediaBrowserStatus,
  MediaBrowserToolbar,
  MediaBrowserTriggerLabel,
  Spinner,
  StatusBanner,
} from '@design-system';
import AutoSizer from '../common/AutoSizer';
import { VideoPlayer } from './VideoPlayer';
import { SensitiveContent } from '../common/SensitiveContent';
import BatchToolbar from '../common/BatchToolbar';
import { SensitiveWarningBanner } from '../shared/SensitiveWarningBanner';
import { usePaginatedMediaCollection } from '../../hooks/usePaginatedMediaCollection';
import { MediaEmptyState } from '../shared/MediaBrowserLayout';

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
    transcript?: Record<string, unknown>[];
    chapters?: Record<string, unknown>[];
    documentId?: string | number;
    [key: string]: unknown;
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

function getInitialAlbumIdFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('albumId');
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

interface VideoCellData {
  items: VideoItem[];
  selectedItems: Set<number>;
  isBatchMode: boolean;
  onVideoClick: (video: VideoItem, index: number) => void;
  toggleSelection: (id: number) => void;
  columnCount: number;
  formatDate: (dateStr: string) => string;
}

const VideoCell = React.memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
  const {
    items,
    selectedItems,
    isBatchMode,
    onVideoClick,
    toggleSelection: _toggleSelection,
    columnCount,
    formatDate,
  } = data as VideoCellData;
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
        <div className="aspect-video relative overflow-hidden">
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
            <div className="absolute inset-0 bg-[var(--glass-bg-strong)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-[var(--glass-shadow)] transform scale-90 group-hover:scale-100 transition-transform">
                <Icon
                  name="Play"
                  size="lg"
                  className="ml-1 text-[var(--text-primary)] fill-[var(--text-primary)]"
                />
              </div>
            </div>
          </SensitiveContent>

          {isBatchMode && (
            <div
              className={`absolute top-2 left-2 z-10 w-8 h-8 md:w-6 md:h-6 rounded-md border flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-[var(--accent)] border-[var(--accent)]'
                  : 'bg-[var(--glass-bg-strong)] border-[var(--glass-border)]'
              }`}
            >
              {isSelected ? <Icon name="CheckSquare" size="sm" color="white" /> : null}
            </div>
          )}

          {video.metadata?.duration && (
            <div className="absolute bottom-2 right-2 bg-[var(--glass-bg-strong)] px-1.5 py-0.5 rounded text-[10px] text-[var(--text-primary)] font-medium flex items-center gap-1">
              <Icon name="Clock" size="xs" color="white" />
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
              <Icon name="Calendar" size="xs" color="gray" />
              {formatDate(video.createdAt)}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}, areEqual);

export const VideoBrowser: React.FC = () => {
  const initialAlbumId = useMemo(() => getInitialAlbumIdFromUrl(), []);
  const [selectedItem, setSelectedItem] = useState<VideoItem | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [_pickerOpenId, _setPickerOpenId] = useState<number | null>(null);
  const [_investigationsList, _setInvestigationsList] = useState<string[]>([]);
  const [_addingId, _setAddingId] = useState<number | null>(null);

  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const {
    items,
    albums,
    selectedAlbum,
    searchQuery: transcriptSearch,
    loading,
    error,
    hasMore,
    libraryTotalCount,
    setSelectedAlbum,
    setSearchQuery: setTranscriptSearch,
    loadMore,
    refresh,
  } = usePaginatedMediaCollection<VideoItem, Album>({
    mediaEndpoint: '/media/video',
    albumsEndpoint: '/media/video/albums',
    initialAlbumId,
    errorMessage: 'Failed to load video content',
    buildQuery: (params, { searchQuery }) => {
      if (searchQuery.trim()) params.append('transcriptQuery', searchQuery.trim());
      params.append('sortBy', 'title');
    },
    transformItems: sortVideosInDisplayOrder,
    syncAlbumToUrl: true,
  });

  const currentAlbum = useMemo(
    () => albums.find((a) => a.id === selectedAlbum),
    [albums, selectedAlbum],
  );

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
      await refresh();
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
      await refresh();
      setSelectedItems(new Set());
      setIsBatchMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

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

  return (
    <MediaBrowserShell className="soft-glass-panel-strong">
      {/* Header */}
      <MediaBrowserHeader className="app-header-glass">
        {/* Mobile Album Dropdown */}
        <div className="md:hidden relative">
          <MediaBrowserMobileTrigger onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}>
            <MediaBrowserTriggerLabel>
              <Icon name="Folder" size="sm" />
              {selectedAlbum ? currentAlbum?.name : 'All Videos'}
            </MediaBrowserTriggerLabel>
            <Icon name={showAlbumDropdown ? 'ChevronUp' : 'ChevronDown'} size="sm" />
          </MediaBrowserMobileTrigger>
          {showAlbumDropdown && (
            <MediaBrowserDropdown>
              <MediaBrowserDropdownItem
                active={selectedAlbum === null}
                onClick={() => {
                  setSelectedAlbum(null);
                  setShowAlbumDropdown(false);
                }}
              >
                <span>All Videos</span>
                <span className="text-xs opacity-70">{libraryTotalCount}</span>
              </MediaBrowserDropdownItem>
              {albums.map((album) => (
                <MediaBrowserDropdownItem
                  key={album.id}
                  active={selectedAlbum === album.id}
                  onClick={() => {
                    setSelectedAlbum(album.id);
                    setShowAlbumDropdown(false);
                  }}
                >
                  <span className="truncate">{album.name}</span>
                  <span className="text-xs opacity-70">{album.itemCount || 0}</span>
                </MediaBrowserDropdownItem>
              ))}
            </MediaBrowserDropdown>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-1">
          <div>
            <h2 className="text-lg font-light text-[var(--text-primary)]">Video Recordings</h2>
            <p className="text-[var(--text-muted)] text-xs hidden md:block">
              Forensic video evidence
            </p>
          </div>
          <MediaBrowserToolbar className="media-browser-toolbar-scroll md:justify-end flex-1">
            {/* Transcript search within current album / all videos */}
            <MediaBrowserSearch className="relative w-full max-w-xs">
              <Icon
                name="Search"
                size="sm"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <MediaBrowserSearchInput
                type="text"
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder={
                  selectedAlbum ? 'Search transcripts in this album…' : 'Search transcripts…'
                }
                className="text-xs placeholder-[var(--text-muted)]"
              />
            </MediaBrowserSearch>
            <MediaBrowserStatus>
              {items.length} loaded{libraryTotalCount ? ` / ${libraryTotalCount}` : ''}
            </MediaBrowserStatus>
            <button
              onClick={() => void refresh()}
              className="control min-h-[var(--control-height-compact)] bg-[var(--glass-bg)] px-[var(--space-2)] text-xs"
              title="Reload"
            >
              Reload
            </button>
          </MediaBrowserToolbar>
          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`control min-h-[var(--control-height-compact)] px-[var(--space-3)] text-xs ${isBatchMode ? 'bg-[var(--accent)] text-[var(--text-primary)]' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]'}`}
          >
            {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
          </button>
        </div>
      </MediaBrowserHeader>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Albums sidebar - Hidden on mobile */}
        <MediaBrowserSidebar>
          <MediaBrowserSidebarTitle>Albums</MediaBrowserSidebarTitle>
          <div className="flex-1 overflow-y-auto">
            <MediaBrowserSidebarItem
              active={selectedAlbum === null}
              onClick={() => setSelectedAlbum(null)}
            >
              <span className="truncate">All Videos</span>
              <MediaBrowserCount>{libraryTotalCount}</MediaBrowserCount>
            </MediaBrowserSidebarItem>
            {albums.map((album) => (
              <MediaBrowserSidebarItem
                key={album.id}
                active={selectedAlbum === album.id}
                onClick={() => setSelectedAlbum(album.id)}
                title={album.name}
              >
                <span className="truncate">{album.name}</span>
                <MediaBrowserCount>{album.itemCount || 0}</MediaBrowserCount>
              </MediaBrowserSidebarItem>
            ))}
          </div>
        </MediaBrowserSidebar>

        {/* Main Content */}
        <MediaBrowserPanel className="flex-1 bg-[var(--app-bg)] flex flex-col overflow-hidden">
          {loading && items.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--app-bg)]/50 backdrop-blur-sm">
              <Spinner label="Loading videos" />
            </div>
          ) : null}

          {/* Sensitive Content Warning Banner */}
          {showSensitiveWarning && <SensitiveWarningBanner mediaType="video" />}

          {error ? <StatusBanner tone="danger">{error}</StatusBanner> : null}

          <div className="flex-1 min-h-[360px] overflow-hidden relative">
            {!loading && items.length === 0 ? (
              <MediaEmptyState icon="Film" message="No video recordings found" />
            ) : null}
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
                        void loadMore();
                      }
                    }}
                  >
                    {VideoCell}
                  </Grid>
                );
              }}
            </AutoSizer>

            {loading && items.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--glass-bg)] backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[var(--text-muted)] font-medium font-mono text-xs uppercase tracking-widest animate-pulse">
                    Crunching Evidence...
                  </p>
                </div>
              </div>
            )}
          </div>
        </MediaBrowserPanel>
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
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[var(--glass-bg-strong)] backdrop-blur-sm p-4 md:p-8">
            <div className="w-full max-w-6xl h-[90vh] max-h-[90vh]">
              <VideoPlayer
                src={`/api/media/video/${selectedItem.id}/stream`}
                title={selectedItem.title}
                transcript={
                  selectedItem.metadata.transcript as unknown as
                    | import('./AudioPlayer').TranscriptSegment[]
                    | undefined
                }
                chapters={
                  selectedItem.metadata.chapters as unknown as
                    | import('./AudioPlayer').Chapter[]
                    | undefined
                }
                onClose={() => setSelectedItem(null)}
                autoPlay
                isSensitive={selectedItem.isSensitive}
                warningText={selectedItem.description}
                documentId={
                  selectedItem.metadata.documentId !== undefined
                    ? Number(selectedItem.metadata.documentId)
                    : undefined
                }
              />
            </div>
          </div>,
          document.body,
        )}
    </MediaBrowserShell>
  );
};
