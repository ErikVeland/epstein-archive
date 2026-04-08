import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import { AudioPlayer, TranscriptSegment, Chapter } from './AudioPlayer';
import { Music, CheckSquare, Square, Clock, Calendar } from 'lucide-react';
import { SensitiveContent } from '../common/SensitiveContent';
import BatchToolbar from '../common/BatchToolbar';
import { SensitiveWarningBanner } from '../shared/SensitiveWarningBanner';
import Icon from '../common/Icon';
import { apiClient } from '../../services/apiClient';
import { usePaginatedMediaCollection } from '../../hooks/usePaginatedMediaCollection';
import { AlbumSidebar } from '../shared/AlbumSidebar';
import { MobileAlbumDropdown } from '../shared/MobileAlbumDropdown';
import { SEO } from '../common/SEO';
import { cn } from '@client/utils/cn';
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

interface InvestigationEvidenceItem {
  relevance?: string;
  [key: string]: unknown;
}

interface InvestigationSummary {
  totalEvidence: number;
  evidence?: InvestigationEvidenceItem[];
  [key: string]: unknown;
}

interface InvestigationListItem {
  id: number;
  title: string;
  [key: string]: unknown;
}

interface AudioBrowserProps {
  initialAlbumId?: number;
  initialAudioId?: number;
  initialTimestamp?: number;
  quickStart?: boolean;
}

function getInitialAlbumIdFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('albumId');
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export const AudioBrowser: React.FC<AudioBrowserProps> = ({
  initialAlbumId,
  initialAudioId,
  initialTimestamp,
  quickStart = false,
}) => {
  const initialAlbumSelection = useMemo(
    () => initialAlbumId ?? getInitialAlbumIdFromUrl(),
    [initialAlbumId],
  );
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [pickerOpenId, setPickerOpenId] = useState<number | null>(null);
  const [investigationsList, setInvestigationsList] = useState<InvestigationListItem[]>([]);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Transcript search (within album or across all audio)
  // Optional timecode from URL (e.g. shared links)
  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URL(window.location.href).searchParams;
  }, []);

  const targetAudioId = useMemo(() => {
    const urlId = urlParams.get('id');
    return initialAudioId || (urlId ? parseInt(urlId, 10) : undefined);
  }, [initialAudioId, urlParams]);
  const buildAudioQuery = useCallback(
    (
      params: URLSearchParams,
      { searchQuery }: { selectedAlbum: number | null; searchQuery: string },
    ) => {
      if (searchQuery.trim()) {
        params.append('transcriptQuery', searchQuery.trim());
      }
      params.append('sortBy', 'title');
    },
    [],
  );

  const initialUrlTimestamp = useMemo(() => {
    if (initialTimestamp !== undefined) return initialTimestamp;
    const urlT = urlParams.get('t');
    if (urlT && !Number.isNaN(parseInt(urlT, 10))) return parseInt(urlT, 10);
    return undefined;
  }, [initialTimestamp, urlParams]);

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
  } = usePaginatedMediaCollection<AudioItem, Album>({
    mediaEndpoint: '/media/audio',
    albumsEndpoint: '/media/audio/albums',
    initialAlbumId: initialAlbumSelection,
    errorMessage: 'Failed to load audio content',
    buildQuery: buildAudioQuery,
    syncAlbumToUrl: true,
  });

  const currentAlbum = useMemo(
    () => albums.find((a) => a.id === selectedAlbum),
    [albums, selectedAlbum],
  );

  // Load specific item if requested via URL or props
  const { data: directLinkItem } = useQuery<AudioItem | null>({
    queryKey: ['audioItem', targetAudioId],
    queryFn: async () => {
      const res = await fetch(`/api/media/audio/${targetAudioId}`);
      const data = (await res.json()) as Record<string, unknown>;
      if (!data || !data.id) return null;
      return {
        ...data,
        metadata:
          typeof data.metadata === 'string'
            ? (JSON.parse(data.metadata as string) as AudioItem['metadata'])
            : (data.metadata as AudioItem['metadata']),
      } as AudioItem;
    },
    enabled: Boolean(targetAudioId) && !selectedItem,
    staleTime: 30_000,
  });

  // Sync direct-link item into selection state (only if not already selected)
  useEffect(() => {
    if (directLinkItem && !selectedItem) {
      setSelectedItem(directLinkItem);
    }
  }, [directLinkItem, selectedItem]);

  const isSascha =
    (currentAlbum && currentAlbum.name.includes('Sascha')) ||
    items.some((it) => it.title.includes('Sascha'));

  const { data: saschaInvestigation } = useQuery<{ id: number } | null>({
    queryKey: ['investigationByTitle', 'Sascha Barros Testimony'],
    queryFn: async () => {
      const resp = await fetch(
        `/api/investigations/by-title?title=${encodeURIComponent('Sascha Barros Testimony')}`,
      );
      if (!resp.ok) return null;
      return resp.json() as Promise<{ id: number }>;
    },
    enabled: Boolean(isSascha),
    staleTime: 30_000,
  });

  const investigationId = saschaInvestigation?.id ?? null;

  const { data: investigationSummary = null } = useQuery<InvestigationSummary | null>({
    queryKey: ['investigationEvidenceSummary', investigationId],
    queryFn: () =>
      apiClient.getInvestigationEvidenceSummary(
        String(investigationId),
      ) as Promise<InvestigationSummary>,
    enabled: Boolean(investigationId),
    staleTime: 30_000,
  });

  // Batch Handlers
  const toggleSelection = useCallback(
    (id: number) => {
      const newSet = new Set(selectedItems);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedItems(newSet);
    },
    [selectedItems],
  );

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

  // Virtualization setup
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for responsive grid calculation
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate columns dynamically based on available width
  const columns = useMemo(() => {
    if (containerWidth === 0) return 1;
    // Aim for a 3-column layout by default on typical desktop widths,
    // similar to the video browser grid. Use a smaller min card width
    // to keep cards reasonably compact while still accommodating
    // multi-line transcript previews.
    const gap = 24; // 1.5rem between columns
    const padding = 48; // 1.5rem × 2 for horizontal container padding
    const minCardWidth = 260;
    const available = containerWidth - padding;
    const rawCols = Math.floor((available + gap) / (minCardWidth + gap));
    const cols = Math.max(1, rawCols);
    return cols;
  }, [containerWidth]);

  const rowCount = Math.ceil(items.length / columns);

  const showSensitiveWarning =
    currentAlbum &&
    (currentAlbum.name.match(/Sensitive|Disturbing|Testimony|Victim|Survivor/i) ||
      (currentAlbum.sensitiveCount && currentAlbum.sensitiveCount > 0));

  // Row renderer for virtualized list
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const startIdx = index * columns;
      const rowItems = items.slice(startIdx, startIdx + columns);

      // Manual padding offset: Shift top down by 24px to account for container top padding
      const adjustedStyle = {
        ...style,
        top: (typeof style.top === 'number' ? style.top : parseFloat(style.top as string)) + 24,
        height:
          typeof style.height === 'number' ? style.height : parseFloat(style.height as string),
      };

      return (
        <div style={adjustedStyle} className={styles.rowPadded}>
          <div
            className={styles.rowGrid}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {rowItems.map((item) => {
              const isSelected = selectedItems.has(item.id);
              const isSascha =
                item.title.includes('Sascha') ||
                (item.albumName && item.albumName.includes('Sascha'));
              const thumb =
                typeof item.metadata?.thumbnailPath === 'string'
                  ? item.metadata.thumbnailPath
                  : null;
              const displayImage = thumb
                ? `/api/static?path=${encodeURIComponent(thumb)}`
                : isSascha
                  ? `/data/media/audio/lvoocaudiop1/lvoocaudiop1.webp`
                  : null;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'surface-glass-card',
                    styles.card,
                    isSelected ? styles.cardSelected : styles.cardHover,
                  )}
                  onClick={(_e) => {
                    if (isBatchMode) {
                      toggleSelection(item.id);
                    } else {
                      setSelectedItem(item);
                    }
                  }}
                >
                  <SensitiveContent isSensitive={false} className={styles.cardMedia}>
                    <div className={styles.cardTopRight}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickerOpenId(pickerOpenId === item.id ? null : item.id);
                          if (investigationsList.length === 0) {
                            fetch('/api/investigations?page=1&limit=50')
                              .then((r) => r.json())
                              .then((data) => {
                                const list = Array.isArray(data?.data)
                                  ? data.data
                                  : Array.isArray(data)
                                    ? data
                                    : [];
                                setInvestigationsList(list);
                              })
                              .catch(() => {});
                          }
                        }}
                        className={styles.addButton}
                      >
                        +
                      </button>
                      {pickerOpenId === item.id && (
                        <div className={styles.pickerDropdown}>
                          <select
                            onChange={async (e) => {
                              const invId = parseInt(e.target.value);
                              if (!invId) return;
                              setAddingId(item.id);
                              try {
                                const res = await fetch('/api/investigation/add-media', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    investigationId: invId,
                                    mediaItemId: item.id,
                                    notes: '',
                                    relevance: 'high',
                                  }),
                                });
                                if (res.ok) {
                                  setPickerOpenId(null);
                                }
                              } finally {
                                setAddingId(null);
                              }
                            }}
                            className={styles.pickerSelect}
                          >
                            <option value="">Select investigation</option>
                            <option value={investigationId || ''}>
                              {investigationId ? 'Sascha Barros Testimony' : 'Default'}
                            </option>
                            {investigationsList.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {addingId === item.id && <div className={styles.addingIndicator}>…</div>}
                    </div>
                    {isBatchMode && (
                      <div className={styles.batchCheckbox}>
                        {isSelected ? (
                          <CheckSquare className={styles.batchCheckboxSelected} />
                        ) : (
                          <Square className={styles.batchCheckboxIdle} />
                        )}
                      </div>
                    )}
                    <div className={styles.cardImageArea}>
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt="Album Art"
                          className={styles.cardImage}
                          onError={(e) => {
                            const t = e.currentTarget;
                            const tried = t.getAttribute('data-fb') === '1';
                            if (!tried) {
                              t.setAttribute('data-fb', '1');
                              const u = new URL(t.src, window.location.origin);
                              const p = u.searchParams.get('path') || '';
                              const next = p.endsWith('.jpg')
                                ? p.replace('.jpg', '.webp')
                                : p.replace('.webp', '.jpg');
                              t.src = `/api/static?path=${encodeURIComponent(next)}`;
                            } else {
                              t.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                            }
                          }}
                        />
                      ) : (
                        <div className={styles.musicIcon}>
                          <Music size={32} className={styles.musicGlyph} />
                        </div>
                      )}

                      {(item.metadata?.duration || 0) > 0 && (
                        <div className={styles.durationBadge}>
                          <Clock size={10} />
                          {Math.floor((item.metadata?.duration || 0) / 60)}:
                          {((item.metadata?.duration || 0) % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                    </div>
                  </SensitiveContent>

                  <div className={styles.cardBody}>
                    <div className={styles.cardTitleRow}>
                      <h3 className={styles.cardTitle} title={item.title}>
                        {item.title}
                      </h3>
                    </div>

                    <div className={styles.tagList}>
                      {item.tags &&
                        item.tags.map((t) => (
                          <span key={t.id} className={styles.tagChip}>
                            {t.name}
                          </span>
                        ))}
                      {item.people &&
                        item.people.map((p) => (
                          <span key={p.id} className={styles.personChip}>
                            {p.name}
                          </span>
                        ))}
                    </div>

                    <div className={styles.cardMeta}>
                      <div className={styles.cardDate}>
                        <Calendar size={12} />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      {item.description && (
                        <p className={styles.cardDescription}>{item.description}</p>
                      )}

                      {/* When transcriptSearch is active, surface matching transcript
                          segments here so users see what text is being matched and
                          can jump straight to the relevant timecodes. */}
                      {transcriptSearch.trim() &&
                        Array.isArray(item.metadata?.transcript) &&
                        item.metadata.transcript.length > 0 && (
                          <div className={styles.transcriptMatches}>
                            <p className={styles.transcriptMatchLabel}>Transcript matches</p>
                            {item.metadata.transcript
                              .map((seg: TranscriptSegment, idx: number) => ({ seg, idx }))
                              .filter(({ seg }) =>
                                (seg.text || '')
                                  .toLowerCase()
                                  .includes(transcriptSearch.trim().toLowerCase()),
                              )
                              .slice(0, 3)
                              .map(({ seg }, matchIdx) => {
                                const query = transcriptSearch.trim();
                                const lower = (seg.text || '').toLowerCase();
                                const q = query.toLowerCase();
                                let preview: React.ReactNode = seg.text;
                                if (q && lower.includes(q)) {
                                  const startIdx = lower.indexOf(q);
                                  const endIdx = startIdx + q.length;
                                  const before = seg.text.slice(0, startIdx);
                                  const matchText = seg.text.slice(startIdx, endIdx);
                                  const after = seg.text.slice(endIdx);
                                  preview = (
                                    <>
                                      {before}
                                      <mark className={styles.transcriptMatchHighlight}>
                                        {matchText}
                                      </mark>
                                      {after}
                                    </>
                                  );
                                }
                                return (
                                  <button
                                    key={matchIdx}
                                    type="button"
                                    className={styles.transcriptMatchButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open this item at the segment start time.
                                      setSelectedItem(item);
                                      const url = new URL(window.location.href);
                                      url.searchParams.set('id', item.id.toString());
                                      url.searchParams.set(
                                        't',
                                        Math.floor(seg.start || 0).toString(),
                                      );
                                      window.history.pushState({}, '', url.toString());
                                    }}
                                  >
                                    <span className={styles.transcriptMatchTime}>
                                      {Math.floor((seg.start || 0) / 60)}:
                                      {Math.floor((seg.start || 0) % 60)
                                        .toString()
                                        .padStart(2, '0')}
                                    </span>
                                    <span className={styles.transcriptMatchText}>{preview}</span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [
      items,
      columns,
      selectedItems,
      isBatchMode,
      formatDate,
      toggleSelection,
      pickerOpenId,
      investigationsList,
      addingId,
      investigationId,
      transcriptSearch,
    ],
  );

  useEffect(() => {
    if (!quickStart || selectedItem || items.length === 0) return;
    setSelectedItem(items[0]);
  }, [items, quickStart, selectedItem]);

  // Update URL when item or album is selected
  useEffect(() => {
    const url = new URL(window.location.href);

    if (selectedItem) {
      url.searchParams.set('id', selectedItem.id.toString());
    } else {
      url.searchParams.delete('id');
    }

    if (selectedAlbum) {
      url.searchParams.set('albumId', selectedAlbum.toString());
    } else {
      url.searchParams.delete('albumId');
    }

    window.history.pushState({}, '', url.toString());
  }, [selectedItem, selectedAlbum]);

  return (
    <>
      <SEO
        title={currentAlbum ? `${currentAlbum.name} — Audio` : 'Audio Recordings'}
        description="Forensic audio evidence and transcripts from the Epstein files."
      />
      <div className={cn('surface-glass', styles.wrapper)}>
        {/* Header */}
        <div className={cn('app-header-glass', styles.header)}>
          <MobileAlbumDropdown
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            isOpen={showAlbumDropdown}
            onToggle={() => setShowAlbumDropdown((v) => !v)}
            totalItemCount={libraryTotalCount}
            allLabel="All Audio"
            currentAlbumName={currentAlbum?.name}
          />
          <div className={styles.titleGroup}>
            <div className={styles.titleRow}>
              <div className={styles.iconBox}>
                <Music size={20} />
              </div>
              <div>
                <h2 className={styles.title}>Audio Recordings</h2>
                <p className={styles.subtitle}>Forensic audio evidence and transcripts</p>
              </div>
            </div>

            {investigationSummary && (
              <div className={styles.evidenceBadges}>
                <div className={cn(styles.evidenceBadge, styles.evidenceBadgeAmber)}>
                  <Icon name="Database" size="xs" />
                  <span>Evidence {investigationSummary.totalEvidence}</span>
                </div>
                <div className={cn(styles.evidenceBadge, styles.evidenceBadgeGreen)}>
                  <Icon name="Shield" size="xs" />
                  <span>
                    High{' '}
                    {
                      (investigationSummary.evidence || []).filter(
                        (e: InvestigationEvidenceItem) => e.relevance === 'high',
                      ).length
                    }
                  </span>
                </div>
                <div className={cn(styles.evidenceBadge, styles.evidenceBadgeBlue)}>
                  <Icon name="Check" size="xs" />
                  <span>
                    Medium{' '}
                    {
                      (investigationSummary.evidence || []).filter(
                        (e: InvestigationEvidenceItem) => e.relevance === 'medium',
                      ).length
                    }
                  </span>
                </div>
                <div className={cn(styles.evidenceBadge, styles.evidenceBadgeMuted)}>
                  <Icon name="Info" size="xs" />
                  <span>
                    Low{' '}
                    {
                      (investigationSummary.evidence || []).filter(
                        (e: InvestigationEvidenceItem) => e.relevance === 'low',
                      ).length
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.controls}>
            {/* Transcript search */}
            <div className={styles.searchWrapper}>
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

            <div className={styles.divider}></div>

            <button
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={cn(
                styles.batchButton,
                isBatchMode ? styles.batchButtonActive : styles.batchButtonInactive,
              )}
            >
              {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
            </button>

            <button
              onClick={async () => {
                try {
                  const resp = await fetch(
                    `/api/investigations/by-title?title=${encodeURIComponent('Sascha Barros Testimony')}`,
                  );
                  if (resp.ok) {
                    const inv = await resp.json();
                    window.location.href = `/investigations/${inv.id}`;
                  }
                } catch {
                  void 0;
                }
              }}
              className={styles.investigationButton}
            >
              <Icon name="ExternalLink" size="xs" />
              <span>Open Investigation</span>
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <AlbumSidebar
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            totalItemCount={libraryTotalCount}
            allLabel="All Audio"
          />

          {/* Main Content */}
          <div className={styles.mainContent}>
            {loading && items.length === 0 ? (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner}></div>
              </div>
            ) : null}

            {/* Sensitive Content Warning Banner */}
            {showSensitiveWarning && <SensitiveWarningBanner mediaType="audio" />}

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div ref={containerRef} className={styles.virtualContainer}>
              {items.length === 0 && !loading ? (
                <div className={styles.emptyState}>
                  <Icon name="Music" size="lg" className={styles.emptyIcon} />
                  <p className={styles.emptyText}>No audio recordings found</p>
                </div>
              ) : containerWidth > 0 ? (
                <div className={styles.virtualListWrapper}>
                  <List
                    height={containerRef.current?.clientHeight || 600}
                    itemCount={rowCount}
                    itemSize={440}
                    width="100%"
                    overscanCount={2}
                    innerElementType={React.forwardRef<
                      HTMLDivElement,
                      React.HTMLAttributes<HTMLDivElement>
                    >(({ style, ...rest }, ref) => (
                      <div
                        ref={ref}
                        style={{
                          ...style,
                          height: `${parseFloat(String(style?.height ?? '0')) + 48}px`, // +24px top, +24px bottom
                        }}
                        {...rest}
                      />
                    ))}
                    onScroll={({ scrollOffset, scrollUpdateWasRequested }) => {
                      if (scrollUpdateWasRequested) return;
                      const containerHeight = containerRef.current?.clientHeight || 600;
                      const totalHeight = rowCount * 520;
                      if (
                        scrollOffset + containerHeight >= totalHeight - 200 &&
                        !loading &&
                        hasMore
                      ) {
                        void loadMore();
                      }
                    }}
                  >
                    {Row}
                  </List>
                  {loading && (
                    <div className={styles.loadingMore}>
                      <div className={styles.spinnerSm}></div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className={styles.footer}>
          <div>{items.length} items</div>
          <div>{selectedAlbum ? currentAlbum?.name : 'All Audio'}</div>
        </div>

        {/* Batch Toolbar */}
        {isBatchMode && selectedItems.size > 0 && (
          <div className={styles.batchToolbarWrapper}>
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

        {/* Audio Player Modal */}
        {selectedItem &&
          createPortal(
            <div className={styles.playerModal}>
              <div className={styles.playerModalBackdrop}></div>
              <div className={styles.playerModalInner}>
                <AudioPlayer
                  key={selectedItem.id}
                  src={`/api/media/audio/${selectedItem.id}/stream`}
                  title={selectedItem.title}
                  transcript={selectedItem.metadata.transcript}
                  chapters={selectedItem.metadata.chapters}
                  autoPlay
                  isSensitive={selectedItem.isSensitive}
                  warningText={selectedItem.description}
                  documentId={selectedItem.id}
                  initialTime={
                    initialUrlTimestamp !== undefined &&
                    selectedItem.id === (initialAudioId || selectedItem.id)
                      ? initialUrlTimestamp
                      : 0
                  }
                  albumImages={
                    selectedItem.title.includes('Sascha') ||
                    (selectedItem.albumName && selectedItem.albumName.includes('Sascha')) ||
                    (currentAlbum && currentAlbum.name.includes('Sascha'))
                      ? [
                          '/data/media/audio/lvoocaudiop1/lvoocaudiop1.webp',
                          '/data/media/audio/lvoocaudiop1/lvoocaudiop1.jpg',
                        ]
                      : []
                  }
                  onClose={() => {
                    setSelectedItem(null);
                    // Clear URL params but keep album if selected
                    const url = new URL(window.location.href);
                    url.searchParams.delete('id');
                    url.searchParams.delete('t');
                    window.history.pushState({}, '', url.toString());
                  }}
                />
              </div>
            </div>,
            document.body,
          )}
      </div>
    </>
  );
};
