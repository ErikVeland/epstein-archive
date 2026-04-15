import React, { useState, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps, areEqual } from 'react-window';
import { createPortal } from 'react-dom';
import {
  Film,
  Play,
  Calendar,
  CheckSquare,
  Clock,
  RefreshCw,
  Users,
  AlertTriangle,
  User,
} from 'lucide-react';
import { TranscriptSegment, Chapter } from './AudioPlayer';
import {
  Surface,
  Flex,
  Box,
  Stack,
  LqText,
  Button,
  cn,
  SearchField,
} from '../../design-system/lib';
import AutoSizer from '../common/AutoSizer';
import { VideoPlayer } from './VideoPlayer';
import { SensitiveContent } from '../common/SensitiveContent';
import BatchToolbar from '../common/BatchToolbar';
import { SensitiveWarningBanner } from '../shared/SensitiveWarningBanner';
import { AlbumSidebar } from '../shared/AlbumSidebar';
import { MobileAlbumDropdown } from '../shared/MobileAlbumDropdown';
import { SEO } from '../common/SEO';
import { usePaginatedMediaCollection } from '../../hooks/usePaginatedMediaCollection';
import { EmptyCorpus } from '../common/EmptyCorpus';
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

function getVideoThumbPlaceholder(): string {
  if (typeof window === 'undefined') return '';
  const root = getComputedStyle(document.documentElement);
  const bgDark = root.getPropertyValue('--bg-dark').trim() || 'black';
  const surface2 = root.getPropertyValue('--lq-surface-2').trim() || 'black';
  const surface1 = root.getPropertyValue('--lq-surface-1').trim() || 'black';
  const border = root.getPropertyValue('--glass-border-strong').trim() || 'gray';
  const accent =
    root.getPropertyValue('--nav-flights').trim() ||
    root.getPropertyValue('--accent').trim() ||
    'white';
  const textMuted = root.getPropertyValue('--text-muted').trim() || 'gray';

  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${bgDark}"/>
            <stop offset="100%" stop-color="${surface2}"/>
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#bg)"/>
        <rect x="420" y="210" width="440" height="300" rx="20" fill="${surface1}" stroke="${border}" stroke-width="4"/>
        <polygon points="595,285 595,435 720,360" fill="${accent}" opacity="0.9"/>
        <text x="640" y="565" text-anchor="middle" fill="${textMuted}" font-family="Arial, sans-serif" font-size="28">
          Video thumbnail unavailable
        </text>
      </svg>
    `)
  );
}

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
    <div style={style} className={styles.videoCell}>
      <Surface
        variant={isSelected ? 'glass-highlight' : 'glass-strong'}
        onClick={() => onVideoClick(video, index)}
        className={cn(styles.videoCard, isSelected && styles.videoCardSelected)}
        tabIndex={isBatchMode ? 0 : -1}
      >
        <Box className={styles.thumbnail}>
          <SensitiveContent
            isSensitive={video.isSensitive}
            ignoreGlobalSetting
            className={styles.thumbnailMedia}
            label="Sensitive content"
            hint="Click to unblur"
            resetKey={video.id}
          >
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
                img.src = getVideoThumbPlaceholder();
              }}
            />
            <Box className={styles.playOverlay}>
              <Box className={styles.playButton}>
                <Play className={styles.playIcon} size={24} fill="currentColor" />
              </Box>
            </Box>
          </SensitiveContent>

          {isBatchMode && (
            <Surface variant="glass" className={styles.selectionBox}>
              {isSelected ? (
                <CheckSquare size={14} />
              ) : (
                <LqText variant="xs" weight="bold">
                  {index + 1}
                </LqText>
              )}
            </Surface>
          )}

          {video.metadata?.duration && (
            <Surface variant="glass-strong" className={styles.durationBadge}>
              <Flex gap="xs" align="center">
                <Clock size={10} />
                <LqText variant="xs" weight="bold">
                  {Math.floor(video.metadata.duration / 60)}:
                  {
                    Math.floor(video.metadata.duration % 60)
                      .toString()
                      .padStart(2, '0')
                      .split('.')[0]
                  }
                </LqText>
              </Flex>
            </Surface>
          )}
        </Box>

        <Stack gap="xs" className={styles.cardBody}>
          <LqText variant="xs" weight="bold">
            {video.title}
          </LqText>
          <Flex align="center" justify="between">
            <Flex align="center" gap="xs">
              <Calendar size={12} className={styles.metaIcon} />
              <LqText variant="xs" color="muted">
                {video.dateTaken ? formatDate(video.dateTaken) : formatDate(video.createdAt)}
              </LqText>
            </Flex>
            {video.people && video.people.length > 0 && (
              <Flex align="center" gap="xs">
                <User size={10} className={styles.metaIcon} />
                <LqText variant="xs" color="muted" weight="bold">
                  {video.people.length === 1 ? video.people[0].name : `${video.people.length} Ppl`}
                </LqText>
              </Flex>
            )}
          </Flex>
        </Stack>
      </Surface>
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
      month: 'short',
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
      <Surface variant="glass-container" className={styles.browser}>
        <Surface variant="glass" className={styles.header}>
          <Flex justify="between" align="center" gap="md" fullWidth>
            {/* Identity */}
            <Flex align="center" gap="md">
              <Box className={styles.iconBox}>
                <Film size={24} />
              </Box>
              <Stack gap="none">
                <LqText variant="h2" weight="bold">
                  Video Archive
                </LqText>
                <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }}>
                  Forensic Archive • {libraryTotalCount || 0} Streams
                </LqText>
              </Stack>
            </Flex>

            {/* Controls */}
            <Flex align="center" gap="sm" className={styles.headerControls}>
              <SearchField
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder={
                  selectedAlbum ? 'Search transcripts in album...' : 'Search transcripts...'
                }
                rootClassName={styles.searchField}
                density="compact"
              />

              <Flex gap="sm" align="center" className={styles.controls}>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => void refresh()}
                  title="Reload archive"
                >
                  <RefreshCw size={14} />
                </Button>
                <Button
                  variant={hasPeopleOnly ? 'accent-solid' : 'glass'}
                  size="sm"
                  onClick={() => setHasPeopleOnly((v) => !v)}
                  title="Filter by people"
                >
                  <Users size={14} />
                  <span>People</span>
                </Button>
                <Button
                  variant={isBatchMode ? 'accent-solid' : 'glass-highlight'}
                  size="sm"
                  onClick={() => setIsBatchMode(!isBatchMode)}
                >
                  <CheckSquare size={14} />
                  <span>{isBatchMode ? 'Finish' : 'Batch'}</span>
                </Button>
              </Flex>
            </Flex>
          </Flex>

          {/* Mobile album dropdown */}
          <Box className={styles.mobileNav}>
            <MobileAlbumDropdown
              albums={albums}
              selectedAlbum={selectedAlbum}
              onSelectAlbum={setSelectedAlbum}
              isOpen={showAlbumDropdown}
              onToggle={() => setShowAlbumDropdown((v) => !v)}
              totalItemCount={libraryTotalCount}
              allLabel="All Videos"
              currentAlbumName={currentAlbum?.name}
            />
          </Box>
        </Surface>

        <Flex className={styles.contentLayout}>
          <AlbumSidebar
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            totalItemCount={libraryTotalCount}
            allLabel="All Videos"
          />

          <Stack grow className={styles.mainContent}>
            {loading && items.length === 0 && (
              <Flex align="center" justify="center" className={styles.loadingOverlay}>
                <Box className={styles.loadingSpinner} />
              </Flex>
            )}

            {showSensitiveWarning && <SensitiveWarningBanner mediaType="video" />}

            {error && (
              <Surface variant="glass-strong" className={styles.errorBanner}>
                <Flex align="center" gap="sm">
                  <AlertTriangle size={18} />
                  <LqText variant="xs" weight="bold">
                    {error}
                  </LqText>
                </Flex>
              </Surface>
            )}

            {!loading && !error && items.length === 0 && (
              <EmptyCorpus
                icon="Film"
                title="No Video Files"
                body="Video footage is extracted and indexed during media ingestion. No videos have been loaded into the corpus yet — run the media ingestion pipeline to populate this section."
              />
            )}

            <Box className={styles.gridViewport}>
              <AutoSizer>
                {({ width, height }) => {
                  if (width < 50) return null;
                  const minColumnWidth = 240;
                  const gap = 16;
                  const availableWidth = width - 32;
                  const columnCount = Math.max(
                    1,
                    Math.floor((availableWidth + gap) / (minColumnWidth + gap)),
                  );
                  const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
                  const rowCount = Math.ceil(items.length / columnCount);
                  const rowHeight = (columnWidth * 9) / 16 + 84;

                  return (
                    <Grid
                      columnCount={columnCount}
                      columnWidth={columnWidth + gap}
                      height={height}
                      rowCount={rowCount}
                      rowHeight={rowHeight + gap}
                      width={width}
                      itemData={{ ...gridData, columnCount }}
                      className={styles.virtualScroller}
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

              {loading && items.length > 0 && (
                <Flex align="center" justify="center" className={styles.busyOverlay}>
                  <Surface variant="glass-strong" className={styles.busyContent}>
                    <Flex align="center" gap="md">
                      <Box className={styles.busySpinner} />
                      <LqText variant="xs" weight="bold">
                        Indexing Forensic Streams...
                      </LqText>
                    </Flex>
                  </Surface>
                </Flex>
              )}
            </Box>
          </Stack>
        </Flex>

        <Flex justify="between" align="center" px="md" py="xs" className={styles.footer}>
          <LqText variant="xs" color="muted" weight="bold" style={{ textTransform: 'uppercase' }}>
            {items.length} EVIDENCE STREAMS
          </LqText>
          <LqText variant="xs" color="muted" weight="bold" style={{ textTransform: 'uppercase' }}>
            {selectedAlbum ? currentAlbum?.name : 'MASTER VIDEO ARCHIVE'}
          </LqText>
        </Flex>

        {isBatchMode && selectedItems.size > 0 && (
          <Box className={styles.batchToolbarWrap}>
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
          </Box>
        )}

        {selectedItem &&
          createPortal(
            <Box className={styles.playerModalOverlay}>
              <Box className={styles.playerModalFrame}>
                <VideoPlayer
                  key={selectedItem.id}
                  src={`/api/media/video/${selectedItem.id}/stream`}
                  title={selectedItem.title}
                  transcript={selectedItem.metadata.transcript as unknown as TranscriptSegment[]}
                  chapters={selectedItem.metadata.chapters as unknown as Chapter[]}
                  onClose={() => setSelectedItem(null)}
                  autoPlay
                  isSensitive={selectedItem.isSensitive}
                  warningText={selectedItem.description}
                  documentId={
                    selectedItem.metadata.documentId
                      ? Number(selectedItem.metadata.documentId)
                      : undefined
                  }
                />
              </Box>
            </Box>,
            document.body,
          )}
      </Surface>
    </>
  );
};

export default VideoBrowser;
