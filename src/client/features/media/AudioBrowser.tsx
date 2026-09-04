import { getDojNativeSourceUrl } from '@shared/utils/dojNativeSource';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { FixedSizeList as List, ListChildComponentProps, areEqual } from 'react-window';
import { createPortal } from 'react-dom';
import Icon from '@client/components/common/Icon';
import { AudioPlayer, TranscriptSegment, Chapter } from './AudioPlayer';
import { SensitiveContent } from '@client/components/common/SensitiveContent';
import { useSensitiveSettings } from '@client/contexts/SensitiveSettingsContext';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';

import { usePaginatedMediaCollection } from '@client/hooks/usePaginatedMediaCollection';
import { MobileAlbumDropdown } from '@client/components/shared/MobileAlbumDropdown';
import { AlbumSidebar } from '@client/components/shared/AlbumSidebar';
import { SensitiveWarningBanner } from '@client/components/shared/SensitiveWarningBanner';
import { SEO } from '@client/components/common/SEO';
import { EmptyCorpus } from '@client/components/common/EmptyCorpus';
import { AutoSizer } from '@client/components/common/AutoSizer';
import { useListScrollRestoration } from '@client/hooks/useListScrollRestoration';
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
} from '@client/design-system/lib';
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
    thumbnail?: string;
    thumbnailPath?: string;
    coverImagePath?: string;
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

type TranscriptSearchScope = 'album' | 'library';

interface ExtendedTranscriptSearch {
  query: string;
  scope: TranscriptSearchScope;
  originTitle: string;
  albumName?: string;
}

const resolveAudioImageSrc = (item: AudioItem): string | null => {
  const raw =
    item.metadata?.thumbnailPath ||
    item.metadata?.thumbnail ||
    item.metadata?.coverImagePath ||
    null;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw;
  return `/${raw}`;
};

const isString = (value: string | null): value is string => Boolean(value);

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
          const displayImage = resolveAudioImageSrc(item);

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
                      <img
                        src={displayImage}
                        alt=""
                        className={styles.cardImage}
                        onError={(e) => {
                          // Hide broken image element — the Music icon fallback below takes over
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Flex align="center" justify="center" className={styles.fallbackIcon}>
                        <Icon name="Music" size="xl" className={styles.iconMuted} />
                      </Flex>
                    )}
                    <Box className={styles.overlay}>
                      <Flex align="center" justify="center" fullHeight>
                        <Button variant="glass" size="lg" className={styles.playBtn}>
                          <Icon name="Play" size="lg" fill="currentColor" />
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
                          <Icon name="CheckSquare" size="sm" color="accent" />
                        ) : (
                          <Icon name="Square" size="sm" />
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
                      <Icon name="Calendar" size="xs" className={styles.iconMuted} />
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
                      <Icon name="ChevronRight" size="sm" />
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
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [extendedTranscriptSearch, setExtendedTranscriptSearch] =
    useState<ExtendedTranscriptSearch | null>(null);
  const { showAllSensitive } = useSensitiveSettings();

  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(location.search);
  }, [location.search]);

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

  const handleTranscriptSearchChange = useCallback(
    (value: string) => {
      setExtendedTranscriptSearch(null);
      setTranscriptSearch(value);
    },
    [setTranscriptSearch],
  );

  const handleAlbumSelect = useCallback(
    (albumId: number | null) => {
      setExtendedTranscriptSearch(null);
      setSelectedAlbum(albumId);
    },
    [setSelectedAlbum],
  );

  const searchFullLibrary = useCallback(
    (query: string, originTitle: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setSelectedAlbum(null);
      setTranscriptSearch(trimmed);
      setExtendedTranscriptSearch({ query: trimmed, scope: 'library', originTitle });
    },
    [setSelectedAlbum, setTranscriptSearch],
  );

  const handleExtendTranscriptSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || !selectedItem) return;

      const alreadySearchedAlbum =
        extendedTranscriptSearch?.scope === 'album' &&
        extendedTranscriptSearch.query.toLowerCase() === trimmed.toLowerCase();

      if (selectedItem.albumId && !alreadySearchedAlbum) {
        setSelectedAlbum(selectedItem.albumId);
        setTranscriptSearch(trimmed);
        setExtendedTranscriptSearch({
          query: trimmed,
          scope: 'album',
          originTitle: selectedItem.title,
          albumName: selectedItem.albumName,
        });
        return;
      }

      searchFullLibrary(trimmed, selectedItem.title);
    },
    [
      extendedTranscriptSearch,
      searchFullLibrary,
      selectedItem,
      setSelectedAlbum,
      setTranscriptSearch,
    ],
  );

  const transcriptSearchExtensionLabel = useMemo(() => {
    if (!selectedItem?.albumId) return 'Search full library';
    const query = transcriptSearch.trim().toLowerCase();
    const alreadySearchedAlbum =
      extendedTranscriptSearch?.scope === 'album' &&
      extendedTranscriptSearch.query.toLowerCase() === query;
    return alreadySearchedAlbum ? 'Search full library' : 'Search rest of album';
  }, [extendedTranscriptSearch, selectedItem, transcriptSearch]);

  const selectedItemCoverImages = useMemo(
    () => (selectedItem ? [resolveAudioImageSrc(selectedItem)].filter(isString) : []),
    [selectedItem],
  );

  const showSensitiveWarning =
    !showAllSensitive &&
    currentAlbum &&
    (/Sensitive|Disturbing|Testimony|Victim|Survivor/i.test(currentAlbum.name) ||
      (currentAlbum.sensitiveCount ?? 0) > 0);

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

  // Sync direct-link item to selection when the target audio ID changes.
  // Using useEffect avoids calling setState synchronously during render.
  useEffect(() => {
    if (targetAudioId === prevTargetId) return;
    setPrevTargetId(targetAudioId);
    if (directLinkItem && !selectedItem) {
      setSelectedItem(directLinkItem);
    }
  }, [targetAudioId, prevTargetId, directLinkItem, selectedItem]);

  const handleClosePlayer = useCallback(() => {
    setSelectedItem(null);
    const params = new URLSearchParams(location.search);
    if (!params.has('id')) return;

    params.delete('id');
    const query = params.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

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
                <Icon name="Music" size="lg" />
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
                onChange={(e) => handleTranscriptSearchChange(e.target.value)}
                placeholder="Query transcripts..."
                rootClassName={styles.searchField}
                density="compact"
              />

              <Button
                variant={isBatchMode ? 'accent-solid' : 'glass'}
                size="sm"
                onClick={() => setIsBatchMode(!isBatchMode)}
              >
                {isBatchMode ? (
                  <Icon name="CheckSquare" size="sm" />
                ) : (
                  <Icon name="Filter" size="sm" />
                )}
                {isBatchMode ? `Apply (${selectedItems.size})` : 'Batch'}
              </Button>

              <Button variant="primary" size="sm">
                <Icon name="ExternalLink" size="sm" />
                Open Leads
              </Button>
            </Flex>
          </Flex>

          <Box className={styles.mobileNav}>
            <MobileAlbumDropdown
              albums={albums}
              selectedAlbum={selectedAlbum}
              onSelectAlbum={handleAlbumSelect}
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
            onSelectAlbum={handleAlbumSelect}
            totalItemCount={libraryTotalCount}
            allLabel="All Recordings"
          />

          <Box className={styles.virtualScrollArea} grow>
            {showSensitiveWarning && <SensitiveWarningBanner mediaType="audio" />}
            {extendedTranscriptSearch && transcriptSearch.trim() && (
              <Surface variant="glass-strong" className={styles.extensionBanner}>
                <Flex align="center" justify="between" gap="md" fullWidth>
                  <Flex align="center" gap="sm" className={styles.extensionMeta}>
                    <Icon name="Search" size="sm" />
                    <LqText variant="xs" weight="bold">
                      {extendedTranscriptSearch.scope === 'album'
                        ? `No hit in the open transcript. Searching the rest of ${extendedTranscriptSearch.albumName || 'this album'} for "${extendedTranscriptSearch.query}".`
                        : `No hit in the open transcript or album. Searching the full audio library for "${extendedTranscriptSearch.query}".`}
                    </LqText>
                  </Flex>
                  <Flex align="center" gap="xs" className={styles.extensionActions}>
                    {extendedTranscriptSearch.scope === 'album' && (
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() =>
                          searchFullLibrary(
                            extendedTranscriptSearch.query,
                            extendedTranscriptSearch.originTitle,
                          )
                        }
                      >
                        Search full library
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setExtendedTranscriptSearch(null);
                        setTranscriptSearch('');
                      }}
                    >
                      Clear
                    </Button>
                  </Flex>
                </Flex>
              </Surface>
            )}
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

        {selectedItem &&
          createPortal(
            <Box className={styles.playerModalOverlay}>
              <Box className={styles.playerModalFrame}>
                <AudioPlayer
                  key={selectedItem.id}
                  sourceUrl={getDojNativeSourceUrl(selectedItem.metadata)}
                  remoteSourceOnly={selectedItem.metadata?.storage_policy === 'doj_remote'}
                  src={`/api/media/audio/${selectedItem.id}/stream`}
                  title={selectedItem.title}
                  transcript={selectedItem.metadata?.transcript}
                  chapters={selectedItem.metadata?.chapters}
                  onClose={handleClosePlayer}
                  autoPlay={true}
                  isSensitive={selectedItem.isSensitive}
                  documentId={selectedItem.documentId}
                  initialTime={initialTimestamp}
                  albumImages={selectedItemCoverImages}
                  transcriptSearchExtensionLabel={transcriptSearchExtensionLabel}
                  onExtendTranscriptSearch={handleExtendTranscriptSearch}
                />
              </Box>
            </Box>,
            document.body,
          )}
      </Box>
    </>
  );
};
