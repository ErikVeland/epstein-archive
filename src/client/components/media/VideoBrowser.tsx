import React, { useState, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps, areEqual } from 'react-window';
import { createPortal } from 'react-dom';
import AutoSizer from '../common/AutoSizer';
import { VideoPlayer } from './VideoPlayer';
import { Play, Calendar, CheckSquare, Clock } from 'lucide-react';
import { SensitiveContent } from '../common/SensitiveContent';
import BatchToolbar from '../common/BatchToolbar';
import { SensitiveWarningBanner } from '../shared/SensitiveWarningBanner';
import { AlbumSidebar } from '../shared/AlbumSidebar';
import { MobileAlbumDropdown } from '../shared/MobileAlbumDropdown';
import { SEO } from '../common/SEO';
import Icon from '../common/Icon';
import { usePaginatedMediaCollection } from '../../hooks/usePaginatedMediaCollection';
import { cn } from '@client/utils/cn';
import styles from './VideoBrowser.module.css';

interface VideoItem {
  id: number;
  title: string;
  description?: string;
  filePath: string;
  fileType: string;
  isSensitive: boolean;
  albumId?: number;
  albumName?: string;
  dateTaken?: string | null;
  metadata: {
    duration?: number;
    thumbnailPath?: string;
    transcript?: Record<string, unknown>[];
    chapters?: Record<string, unknown>[];
    documentId?: string | number;
    recordingTime?: string;
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
  columnCount: number;
  formatDate: (dateStr: string) => string;
}

const VideoCell = React.memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
  const { items, selectedItems, isBatchMode, onVideoClick, columnCount, formatDate } =
    data as VideoCellData;
  const index = rowIndex * columnCount + columnIndex;
  if (index >= items.length) return null;

  const video = items[index];
  const isSelected = selectedItems.has(video.id);

  return (
    <div style={{ ...style, padding: '4px' }}>
      <button
        className={cn(
          styles.videoCard,
          isSelected ? styles.videoCardSelected : styles.videoCardIdle,
        )}
        onClick={() => onVideoClick(video, index)}
        tabIndex={isBatchMode ? 0 : -1}
      >
        <div className={styles.thumbnail}>
          <SensitiveContent isSensitive={video.isSensitive} className={styles.thumbnailMedia}>
            <img
              key={video.id}
              src={`/api/media/video/${video.id}/thumbnail?v=${new Date(video.createdAt).getTime()}`}
              alt={video.title}
              className={styles.thumbnailImage}
              loading="lazy"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.dataset.fallbackApplied === '1') return;
                img.dataset.fallbackApplied = '1';
                img.src = VIDEO_THUMB_PLACEHOLDER;
              }}
            />
            <div className={styles.playOverlay}>
              <div className={styles.playButton}>
                <Play className={styles.playIcon} />
              </div>
            </div>
          </SensitiveContent>

          {isBatchMode && (
            <div
              className={cn(
                styles.selectionBox,
                isSelected ? styles.selectionBoxActive : styles.selectionBoxIdle,
              )}
            >
              {isSelected && <CheckSquare className={styles.selectionIcon} />}
            </div>
          )}

          {video.metadata?.duration && (
            <div className={styles.durationBadge}>
              <Clock className={styles.durationIcon} />
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

        <div className={styles.cardBody}>
          <h3 className={styles.cardTitle}>{video.title}</h3>
          <div className={styles.cardMeta}>
            <div className={styles.dateMeta}>
              <Calendar className={styles.metaIcon} />
              {video.dateTaken ? formatDate(video.dateTaken) : formatDate(video.createdAt)}
            </div>
            {video.people && video.people.length > 0 && (
              <div className={styles.peopleMeta}>
                <span>👤</span>
                {video.people.length === 1 ? video.people[0].name : `${video.people.length} people`}
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}, areEqual);

export const VideoBrowser: React.FC = () => {
  const initialAlbumId = useMemo(() => getInitialAlbumIdFromUrl(), []);
  const [hasPeopleOnly, setHasPeopleOnly] = useState(false);

  const buildVideoQuery = useCallback(
    (
      params: URLSearchParams,
      { searchQuery }: { selectedAlbum: number | null; searchQuery: string },
    ) => {
      if (searchQuery.trim()) params.append('transcriptQuery', searchQuery.trim());
      if (hasPeopleOnly) params.append('hasPeople', 'true');
      params.append('sortBy', 'date_taken');
    },
    [hasPeopleOnly],
  );

  const [selectedItem, setSelectedItem] = useState<VideoItem | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [_pickerOpenId, _setPickerOpenId] = useState<number | null>(null);
  const [_investigationsList, _setInvestigationsList] = useState<string[]>([]);
  const [_addingId, _setAddingId] = useState<number | null>(null);
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
    buildQuery: buildVideoQuery,
    transformItems: sortVideosInDisplayOrder,
    syncAlbumToUrl: true,
  });

  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void refresh();
  }, [hasPeopleOnly, refresh]);

  const currentAlbum = useMemo(
    () => albums.find((a) => a.id === selectedAlbum),
    [albums, selectedAlbum],
  );

  const toggleSelection = useCallback((id: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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

  const handleVideoClick = useCallback(
    (video: VideoItem, _index: number) => {
      if (isBatchMode) toggleSelection(video.id);
      else setSelectedItem(video);
    },
    [isBatchMode, toggleSelection],
  );

  const gridData = useMemo(
    () => ({
      items,
      selectedItems,
      isBatchMode,
      onVideoClick: handleVideoClick,
      formatDate,
    }),
    [items, selectedItems, isBatchMode, handleVideoClick, formatDate],
  );

  return (
    <>
      <SEO
        title={currentAlbum ? `${currentAlbum.name} — Video` : 'Video Recordings'}
        description="Forensic video evidence from the Epstein files."
      />
      <div className={cn('surface-glass', styles.browser)}>
        <div className={cn('app-header-glass', styles.header)}>
          <MobileAlbumDropdown
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            isOpen={showAlbumDropdown}
            onToggle={() => setShowAlbumDropdown((value) => !value)}
            totalItemCount={libraryTotalCount}
            allLabel="All Videos"
            currentAlbumName={currentAlbum?.name}
          />

          <div className={styles.headerContent}>
            <div>
              <h2 className={styles.heading}>Video Recordings</h2>
              <p className={styles.headingSubtext}>Forensic video evidence</p>
            </div>
            <div className={styles.controls}>
              <div className={styles.searchField}>
                <Icon name="Search" size="sm" className={styles.searchIcon} />
                <input
                  type="text"
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  placeholder={
                    selectedAlbum ? 'Search transcripts in this album…' : 'Search transcripts…'
                  }
                  className={styles.searchInput}
                />
              </div>
              <span className={styles.countLabel}>
                {items.length} loaded{libraryTotalCount ? ` / ${libraryTotalCount}` : ''}
              </span>
              <button onClick={() => void refresh()} className={styles.reloadButton} title="Reload">
                Reload
              </button>
              <button
                onClick={() => setHasPeopleOnly((v) => !v)}
                className={cn(
                  styles.peopleFilterButton,
                  hasPeopleOnly ? styles.peopleFilterButtonActive : styles.peopleFilterButtonIdle,
                )}
                title="Show only videos with identified people"
              >
                👤 People in Frame
              </button>
            </div>
            <button
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={cn(
                styles.batchButton,
                isBatchMode ? styles.batchButtonActive : styles.batchButtonIdle,
              )}
            >
              {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
            </button>
          </div>
        </div>

        <div className={styles.contentLayout}>
          <AlbumSidebar
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            totalItemCount={libraryTotalCount}
            allLabel="All Videos"
          />

          <div className={styles.mainContent}>
            {loading && items.length === 0 ? (
              <div className={styles.loadingOverlay}>
                <div className={styles.loadingSpinner} />
              </div>
            ) : null}

            {showSensitiveWarning && <SensitiveWarningBanner mediaType="video" />}

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.gridViewport}>
              <AutoSizer>
                {({ width, height }) => {
                  if (width < 50) return null;
                  const minColumnWidth = 220;
                  const gap = 16;
                  const availableWidth = width - 48;
                  const columnCount = Math.max(
                    1,
                    Math.floor((availableWidth + gap) / (minColumnWidth + gap)),
                  );
                  const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
                  const rowCount = Math.ceil(items.length / columnCount);
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
                      className={cn(styles.virtualScroller, styles.gridScroller)}
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
                <div className={styles.busyOverlay}>
                  <div className={styles.busyContent}>
                    <div className={styles.busySpinner} />
                    <p className={styles.busyLabel}>Crunching Evidence...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div>{items.length} items</div>
          <div>{selectedAlbum ? currentAlbum?.name : 'All Videos'}</div>
        </div>

        {isBatchMode && selectedItems.size > 0 && (
          <div className={styles.batchToolbarWrap}>
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

        {selectedItem &&
          createPortal(
            <div className={styles.playerModalOverlay}>
              <div className={styles.playerModalFrame}>
                <VideoPlayer
                  key={selectedItem.id}
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
      </div>
    </>
  );
};

export default VideoBrowser;
