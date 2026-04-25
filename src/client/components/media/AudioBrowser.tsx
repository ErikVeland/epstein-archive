import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FixedSizeList as List, ListChildComponentProps, areEqual } from 'react-window';
import {
  Music,
  Play,
  Calendar,
  ExternalLink,
  Filter,
  ChevronRight,
  Square,
  CheckSquare,
} from 'lucide-react';
import { AudioPlayer, TranscriptSegment, Chapter } from './AudioPlayer';
import { SensitiveContent } from '../common/SensitiveContent';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';

import { usePaginatedMediaCollection } from '../../hooks/usePaginatedMediaCollection';
import { MobileAlbumDropdown } from '../shared/MobileAlbumDropdown';
import { AlbumSidebar } from '../shared/AlbumSidebar';
import { SEO } from '../common/SEO';
import { EmptyCorpus } from '../common/EmptyCorpus';
import { AutoSizer } from '../common/AutoSizer';
import { useListScrollRestoration } from '../../hooks/useListScrollRestoration';
import {
  Surface,
  Button,
  Flex,
  Box,
  Stack,
  LqText,
  cn,
  Badge,
  SearchField,
} from '../../design-system/lib';
import styles from './AudioBrowser.module.css';

interface AudioItem {
  id: number;
  title: string;
  description?: string;
  filePath: string;
  fileType: string;
  isSensitive: boolean;
  documentId?: number;
  albumId?: number;
  albumName?: string;
  metadata: {
    duration?: number;
    transcript?: TranscriptSegment[];
    chapters?: Chapter[];
    thumbnailPath?: string;
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

interface AudioRowData {
  items: AudioItem[];
  columns: number;
  selectedItems: Set<number>;
  isBatchMode: boolean;
  transcriptSearch: string;
  toggleSelection: (id: number) => void;
  setSelectedItem: (item: AudioItem) => void;
}

const AudioRow = React.memo(({ index, style, data }: ListChildComponentProps<AudioRowData>) => {
  const {
    items,
    columns,
    selectedItems,
    isBatchMode,
    transcriptSearch,
    toggleSelection,
    setSelectedItem,
  } = data;
  const startIdx = index * columns;
  const rowItems = items.slice(startIdx, startIdx + columns);

  return (
    <div style={{ ...style, top: (style.top as number) + 24 }}>
      <div
        className={styles.rowGrid}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: '24px',
          padding: '0 24px',
        }}
      >
        {rowItems.map((item) => {
          const isSelected = selectedItems.has(item.id);
          const displayImage = item.metadata?.thumbnailPath
            ? `/api/media/audio/${item.id}/thumbnail`
            : null;

          return (
            <Surface
              key={item.id}
              variant={isSelected ? 'glass-highlight' : 'glass'}
              className={cn(styles.card, isSelected && styles.cardSelected)}
              onClick={() => (isBatchMode ? toggleSelection(item.id) : setSelectedItem(item))}
            >
              <Stack gap="none">
                <Box className={styles.cardHeader}>
                  <SensitiveContent isSensitive={item.isSensitive} className={styles.mediaArea}>
                    {displayImage ? (
                      <img src={displayImage} alt="" className={styles.cardImage} />
                    ) : (
                      <Flex align="center" justify="center" className={styles.fallbackIcon}>
                        <Music size={40} className={styles.iconMuted} />
                      </Flex>
                    )}
                    <Box className={styles.overlay}>
                      <Flex align="center" justify="center" fullHeight>
                        <Button variant="glass" size="lg" className={styles.playBtn}>
                          <Play size={24} fill="currentColor" />
                        </Button>
                      </Flex>
                    </Box>
                    {item.metadata?.duration && (
                      <Box className={styles.duration}>
                        <LqText variant="xs" weight="bold">
                          {Math.floor(item.metadata.duration / 60)}:
                          {(item.metadata.duration % 60).toString().padStart(2, '0')}
                        </LqText>
                      </Box>
                    )}
                  </SensitiveContent>

                  <Box className={styles.batchTrigger}>
                    {isBatchMode && (
                      <Button variant="glass" size="sm">
                        {isSelected ? (
                          <CheckSquare size={16} color="var(--lq-accent)" />
                        ) : (
                          <Square size={16} />
                        )}
                      </Button>
                    )}
                  </Box>
                </Box>

                <Stack p="md" gap="sm">
                  <Stack gap="xs">
                    <LqText variant="small" weight="bold">
                      {item.title}
                    </LqText>
                    <Flex align="center" gap="xs">
                      <Calendar size={12} className={styles.iconMuted} />
                      <LqText variant="xs" color="muted">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </LqText>
                    </Flex>
                  </Stack>

                  {item.description && (
                    <LqText variant="xs" color="muted">
                      {item.description}
                    </LqText>
                  )}

                  <Flex gap="xs" wrap="wrap">
                    {item.tags?.slice(0, 3).map((t) => (
                      <Badge key={t.id} variant="muted" label={t.name} />
                    ))}
                  </Flex>

                  {transcriptSearch.trim() && item.metadata?.transcript && (
                    <Stack gap="xs" className={styles.matches}>
                      <LqText
                        variant="xs"
                        weight="bold"
                        color="accent"
                        style={{ textTransform: 'uppercase' }}
                      >
                        Transcript Matches
                      </LqText>
                      {item.metadata.transcript
                        .filter((s) =>
                          s.text.toLowerCase().includes(transcriptSearch.toLowerCase()),
                        )
                        .slice(0, 2)
                        .map((s, i) => (
                          <Flex key={i} align="center" gap="xs" className={styles.matchItem}>
                            <LqText variant="xs" color="accent" weight="bold">
                              {Math.floor(s.start / 60)}:
                              {(s.start % 60).toString().padStart(2, '0')}
                            </LqText>
                            <LqText variant="xs" color="muted">
                              {s.text}
                            </LqText>
                          </Flex>
                        ))}
                    </Stack>
                  )}

                  <Flex justify="between" align="center" mt="xs">
                    <AddToInvestigationButton
                      item={{
                        id: item.id.toString(),
                        title: item.title,
                        description: item.description || '',
                        type: 'media',
                        sourceId: item.id.toString(),
                      }}
                      variant="quick"
                    />
                    <Button variant="ghost" size="sm" className={styles.moreBtn}>
                      <ChevronRight size={14} />
                    </Button>
                  </Flex>
                </Stack>
              </Stack>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}, areEqual);

interface AudioBrowserProps {
  initialAlbumId?: number;
  initialAudioId?: number;
  initialTimestamp?: number;
  quickStart?: boolean;
}

export const AudioBrowser: React.FC<AudioBrowserProps> = ({
  initialAlbumId,
  initialAudioId,
  initialTimestamp,
}) => {
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);

  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URL(window.location.href).searchParams;
  }, []);

  const targetAudioId = useMemo(() => {
    const urlId = urlParams.get('id');
    return initialAudioId || (urlId ? parseInt(urlId, 10) : undefined);
  }, [initialAudioId, urlParams]);

  const buildAudioQuery = useCallback(
    (params: URLSearchParams, { searchQuery }: { searchQuery: string }) => {
      if (searchQuery.trim()) {
        params.append('transcriptQuery', searchQuery.trim());
      }
      params.append('sortBy', 'title');
    },
    [],
  );

  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const { initialScrollOffset: restoredScrollOffset, onScroll: handleListScroll } =
    useListScrollRestoration('/media/audio');

  const {
    items,
    albums,
    selectedAlbum,
    searchQuery: transcriptSearch,
    loading,
    hasMore,
    libraryTotalCount,
    setSelectedAlbum,
    setSearchQuery: setTranscriptSearch,
    loadMore,
  } = usePaginatedMediaCollection<AudioItem, Album>({
    mediaEndpoint: '/media/audio',
    albumsEndpoint: '/media/audio/albums',
    initialAlbumId:
      initialAlbumId ?? (urlParams.get('albumId') ? Number(urlParams.get('albumId')) : null),
    errorMessage: 'Failed to load audio content',
    buildQuery: buildAudioQuery,
    syncAlbumToUrl: true,
  });

  const currentAlbum = useMemo(
    () => albums.find((a) => a.id === selectedAlbum),
    [albums, selectedAlbum],
  );

  const { data: directLinkItem } = useQuery<AudioItem | null>({
    queryKey: ['audioItem', targetAudioId],
    queryFn: async () => {
      const res = await fetch(`/api/media/audio/${targetAudioId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        ...data,
        metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
      } as AudioItem;
    },
    enabled: Boolean(targetAudioId) && !selectedItem,
  });

  const [prevTargetId, setPrevTargetId] = useState<number | undefined>(undefined);

  // Sync direct link item to selection during render to avoid cascading effects
  if (targetAudioId !== prevTargetId) {
    setPrevTargetId(targetAudioId);
    if (directLinkItem && !selectedItem) {
      setSelectedItem(directLinkItem);
    }
  }

  const toggleSelection = useCallback(
    (id: number) => {
      const newSet = new Set(selectedItems);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedItems(newSet);
    },
    [selectedItems],
  );

  const rowData = useMemo(
    () => ({
      items,
      selectedItems,
      isBatchMode,
      transcriptSearch,
      toggleSelection,
      setSelectedItem,
    }),
    [items, selectedItems, isBatchMode, transcriptSearch, toggleSelection, setSelectedItem],
  );

  return (
    <>
      <SEO
        title={currentAlbum ? `${currentAlbum.name} — Audio` : 'Audio Recordings'}
        description="Forensic audio evidence and transcripts from the Epstein files."
      />
      <Box className={styles.wrapper}>
        <Surface variant="glass" className={styles.header}>
          <Flex justify="between" align="center" gap="md" fullWidth>
            <Flex align="center" gap="md">
              <Box className={styles.iconBox}>
                <Music size={24} />
              </Box>
              <Stack gap="none">
                <LqText variant="h2" weight="bold">
                  Audio Recordings
                </LqText>
                <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }}>
                  Forensic Archive • {libraryTotalCount} Signals
                </LqText>
              </Stack>
            </Flex>

            <Flex align="center" gap="md">
              <SearchField
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder="Query transcripts..."
                rootClassName={styles.searchField}
                density="compact"
              />

              <Button
                variant={isBatchMode ? 'accent-solid' : 'glass'}
                size="sm"
                onClick={() => setIsBatchMode(!isBatchMode)}
              >
                {isBatchMode ? <CheckSquare size={16} /> : <Filter size={16} />}
                {isBatchMode ? `Apply (${selectedItems.size})` : 'Batch'}
              </Button>

              <Button variant="primary" size="sm">
                <ExternalLink size={16} />
                Open Leads
              </Button>
            </Flex>
          </Flex>

          <Box className={styles.mobileNav}>
            <MobileAlbumDropdown
              albums={albums}
              selectedAlbum={selectedAlbum}
              onSelectAlbum={setSelectedAlbum}
              isOpen={showAlbumDropdown}
              onToggle={() => setShowAlbumDropdown(!showAlbumDropdown)}
              totalItemCount={libraryTotalCount}
              allLabel="All Recordings"
              currentAlbumName={currentAlbum?.name}
            />
          </Box>
        </Surface>

        <Flex className={styles.body} grow>
          <AlbumSidebar
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            totalItemCount={libraryTotalCount}
            allLabel="All Recordings"
          />

          <Box className={styles.virtualScrollArea} grow>
            <AutoSizer>
              {({ width, height }: { width: number; height: number }) => {
                if (width === 0 || height === 0) return null;
                const gap = 24;
                const padding = 48;
                const minCardWidth = 280;
                const columns = Math.max(
                  1,
                  Math.floor((width - padding + gap) / (minCardWidth + gap)),
                );
                const rowCount = Math.ceil(items.length / columns);
                if (items.length > 0) {
                  return (
                    <List
                      height={height}
                      initialScrollOffset={restoredScrollOffset}
                      itemCount={rowCount}
                      itemSize={460}
                      width={width}
                      itemData={{ ...rowData, columns }}
                      onScroll={({ scrollOffset }) => {
                        handleListScroll({ scrollOffset });
                        const threshold = rowCount * 460 - 1000;
                        if (scrollOffset > threshold && hasMore && !loading) {
                          void loadMore();
                        }
                      }}
                    >
                      {AudioRow}
                    </List>
                  );
                }
                return !loading ? (
                  <EmptyCorpus
                    icon="Music"
                    title="No Audio Recordings"
                    body="Audio files are extracted and indexed during media ingestion. No recordings have been loaded into the corpus yet — run the media ingestion pipeline to populate this section."
                  />
                ) : null;
              }}
            </AutoSizer>
          </Box>
        </Flex>

        {selectedItem && (
          <AudioPlayer
            src={`/api/media/audio/${selectedItem.id}/stream`}
            title={selectedItem.title}
            transcript={selectedItem.metadata?.transcript}
            chapters={selectedItem.metadata?.chapters}
            onClose={() => setSelectedItem(null)}
            autoPlay={true}
            isSensitive={selectedItem.isSensitive}
            documentId={selectedItem.documentId}
            initialTime={initialTimestamp}
          />
        )}
      </Box>
    </>
  );
};
