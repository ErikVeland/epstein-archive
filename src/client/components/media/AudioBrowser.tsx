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
    const gap = 24; // gap-6
    const padding = 48; // px-6 * 2
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

      // Manual padding offset: Shift top down by 24px (py-6 top)
      const adjustedStyle = {
        ...style,
        top: (typeof style.top === 'number' ? style.top : parseFloat(style.top as string)) + 24,
        height:
          typeof style.height === 'number' ? style.height : parseFloat(style.height as string),
      };

      return (
        <div style={adjustedStyle} className="px-6">
          <div
            className="grid gap-6 pb-6"
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
                  className={`surface-glass-card overflow-hidden transition-all group cursor-pointer flex flex-col min-h-[260px] ${isSelected ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'hover:border-[var(--accent)]/30'}`}
                  onClick={(_e) => {
                    if (isBatchMode) {
                      toggleSelection(item.id);
                    } else {
                      setSelectedItem(item);
                    }
                  }}
                >
                  <SensitiveContent isSensitive={false} className="relative shrink-0">
                    <div className="absolute top-2 right-2 z-30 flex items-center gap-2">
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
                        className="w-6 h-6 flex items-center justify-center rounded bg-amber-700 text-[var(--text-primary)] text-[11px] font-bold border border-amber-500"
                      >
                        +
                      </button>
                      {pickerOpenId === item.id && (
                        <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded p-2 shadow-[var(--glass-shadow)]">
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
                            className="text-xs bg-[var(--glass-bg)] text-[var(--text-primary)] border border-[var(--glass-border)] rounded px-2 py-1"
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
                      {addingId === item.id && (
                        <div className="text-[10px] text-[var(--text-primary)] bg-[var(--glass-bg-strong)] px-2 py-0.5 rounded">
                          …
                        </div>
                      )}
                    </div>
                    {isBatchMode && (
                      <div className="absolute top-2 left-2 z-20">
                        {isSelected ? (
                          <CheckSquare className="text-[var(--accent)] fill-cyan-950" />
                        ) : (
                          <Square className="text-[var(--text-primary)]/70" />
                        )}
                      </div>
                    )}
                    <div className="aspect-video bg-[var(--glass-bg-strong)] relative flex items-center justify-center group-hover:bg-[var(--glass-bg)] transition-colors overflow-hidden">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt="Album Art"
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
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
                        <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] flex items-center justify-center border border-[var(--glass-border)] group-hover:scale-110 transition-transform shadow-[var(--glass-shadow)]">
                          <Music size={32} className="text-[var(--accent)]" />
                        </div>
                      )}

                      {(item.metadata?.duration || 0) > 0 && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-[var(--glass-bg-strong)] text-[var(--text-primary)] text-xs rounded-full font-mono flex items-center gap-1">
                          <Clock size={10} />
                          {Math.floor((item.metadata?.duration || 0) / 60)}:
                          {((item.metadata?.duration || 0) % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                    </div>
                  </SensitiveContent>

                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3
                        className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags &&
                        item.tags.map((t) => (
                          <span
                            key={t.id}
                            className="text-[10px] bg-[var(--glass-bg)] text-[var(--accent)] px-1.5 py-0.5 rounded-full"
                          >
                            {t.name}
                          </span>
                        ))}
                      {item.people &&
                        item.people.map((p) => (
                          <span
                            key={p.id}
                            className="text-[10px] bg-[var(--glass-bg)] text-amber-400 px-1.5 py-0.5 rounded-full"
                          >
                            {p.name}
                          </span>
                        ))}
                    </div>

                    <div className="mt-auto space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <Calendar size={12} />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-6">
                          {item.description}
                        </p>
                      )}

                      {/* When transcriptSearch is active, surface matching transcript
                          segments here so users see what text is being matched and
                          can jump straight to the relevant timecodes. */}
                      {transcriptSearch.trim() &&
                        Array.isArray(item.metadata?.transcript) &&
                        item.metadata.transcript.length > 0 && (
                          <div className="mt-3 border-t border-[var(--glass-border)] pt-2 space-y-1 min-h-[60px]">
                            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                              Transcript matches
                            </p>
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
                                      <mark className="bg-amber-500/40 text-inherit px-0.5 rounded-sm">
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
                                    className="w-full text-left text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--glass-bg)]/60 rounded px-2 py-1 flex items-start gap-2"
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
                                    <span className="font-mono text-[10px] text-[var(--text-muted)] min-w-[40px]">
                                      {Math.floor((seg.start || 0) / 60)}:
                                      {Math.floor((seg.start || 0) % 60)
                                        .toString()
                                        .padStart(2, '0')}
                                    </span>
                                    <span className="flex-1 line-clamp-2">{preview}</span>
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
      <div className="surface-glass flex flex-col h-full min-h-[500px] overflow-hidden">
        {/* Header */}
        <div className="app-header-glass px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0 z-10">
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)]">
                <Music size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Audio Recordings
                </h2>
                <p className="text-[var(--text-muted)] text-xs font-medium">
                  Forensic audio evidence and transcripts
                </p>
              </div>
            </div>

            {investigationSummary && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-900/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold uppercase tracking-wider">
                  <Icon name="Database" size="xs" />
                  <span>Evidence {investigationSummary.totalEvidence}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-green-900/30 text-green-300 border border-green-500/30 text-[11px] font-bold uppercase tracking-wider">
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
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-900/30 text-[var(--accent)] border border-[var(--accent)]/30 text-[11px] font-bold uppercase tracking-wider">
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
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--glass-bg)]/60 text-[var(--text-muted)] border border-[var(--glass-border)] text-[11px] font-bold uppercase tracking-wider">
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

          <div className="flex items-center gap-3">
            {/* Transcript search */}
            <div className="relative w-64">
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
                className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 placeholder-[var(--text-muted)] transition-all border-hover-[var(--glass-border-highlight)]"
              />
            </div>

            <div className="h-8 w-[1px] bg-[var(--glass-border)] mx-1 hidden md:block"></div>

            <button
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={`px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold uppercase tracking-wider transition-all shadow-[var(--glass-shadow)] ${
                isBatchMode
                  ? 'bg-[var(--accent)] text-[var(--text-primary)] ring-2 ring-[var(--accent)]/30'
                  : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)]'
              }`}
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
              className="px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-[var(--text-primary)] border border-amber-500/50 shadow-[var(--glass-shadow)] shadow-amber-900/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Icon name="ExternalLink" size="xs" />
              <span>Open Investigation</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          <AlbumSidebar
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            totalItemCount={libraryTotalCount}
            allLabel="All Audio"
          />

          {/* Main Content */}
          <div className="flex-1 bg-transparent flex flex-col overflow-hidden">
            {loading && items.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--app-bg)]/50 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]"></div>
              </div>
            ) : null}

            {/* Sensitive Content Warning Banner */}
            {showSensitiveWarning && <SensitiveWarningBanner mediaType="audio" />}

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 mx-6 mt-6 rounded-[var(--radius-lg)]">
                {error}
              </div>
            )}

            <div ref={containerRef} className="flex-1 overflow-hidden">
              {items.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                  <Icon name="Music" size="lg" className="mb-2 opacity-50" />
                  <p>No audio recordings found</p>
                </div>
              ) : containerWidth > 0 ? (
                <div className="h-full flex flex-col">
                  <List
                    height={containerRef.current?.clientHeight || 600}
                    itemCount={rowCount}
                    itemSize={440}
                    width="100%"
                    overscanCount={2}
                    className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
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
                    <div className="py-4 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[var(--accent)]"></div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="h-6 bg-[var(--glass-bg-strong)] border-t border-[var(--glass-border)] flex items-center justify-between px-3 text-[10px] text-[var(--text-muted)] select-none shrink-0">
          <div>{items.length} items</div>
          <div>{selectedAlbum ? currentAlbum?.name : 'All Audio'}</div>
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

        {/* Audio Player Modal */}
        {selectedItem &&
          createPortal(
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[var(--app-backdrop)] p-4 md:p-8 animate-in fade-in duration-200">
              <div className="w-full max-w-5xl h-[90vh] max-h-[90vh] shadow-[var(--glass-shadow)] ring-1 ring-[var(--glass-border-highlight)] rounded-[var(--radius-lg)] overflow-hidden">
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
