import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import { AudioPlayer, TranscriptSegment, Chapter } from './AudioPlayer';
import { Music, CheckSquare, Square, Clock, Calendar } from 'lucide-react';
import { SensitiveContent } from '../common/SensitiveContent';
import BatchToolbar from '../common/BatchToolbar';
import { SensitiveWarningBanner } from '../shared/SensitiveWarningBanner';
import Icon from '../common/Icon';
import { apiClient } from '../../services/apiClient';

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
  quickStart = false,
}) => {
  const [items, setItems] = useState<AudioItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [libraryTotalCount, setLibraryTotalCount] = useState(0);
  // const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [investigationId, setInvestigationId] = useState<number | null>(null);
  const [investigationSummary, setInvestigationSummary] = useState<any | null>(null);
  const [pickerOpenId, setPickerOpenId] = useState<number | null>(null);
  const [investigationsList, setInvestigationsList] = useState<any[]>([]);
  const [addingId, setAddingId] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Transcript search (within album or across all audio)
  const [transcriptSearch, setTranscriptSearch] = useState('');
  // Optional timecode from URL (e.g. shared links)
  const [initialUrlTimestamp, setInitialUrlTimestamp] = useState<number | undefined>(
    initialTimestamp,
  );

  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const currentAlbum = useMemo(
    () => albums.find((a) => a.id === selectedAlbum),
    [albums, selectedAlbum],
  );

  // Effect to select album when loaded if initialAlbumId is provided
  useEffect(() => {
    if (initialAlbumId && albums.length > 0 && selectedAlbum === null) {
      const match = albums.find((a) => a.id === initialAlbumId);
      if (match) {
        console.log(`Selecting requested album: ${match.name} (${match.id})`);
        setSelectedAlbum(match.id);
      }
    }
  }, [initialAlbumId, albums, selectedAlbum]);

  // Effect to load specific item if requested via URL or props
  useEffect(() => {
    const url = new URL(window.location.href);
    const urlId = url.searchParams.get('id');
    const urlT = url.searchParams.get('t');

    const targetId = initialAudioId || (urlId ? parseInt(urlId, 10) : undefined);
    const targetT =
      initialTimestamp !== undefined
        ? initialTimestamp
        : urlT && !Number.isNaN(parseInt(urlT, 10))
          ? parseInt(urlT, 10)
          : undefined;

    if (targetT !== undefined && initialUrlTimestamp === undefined) {
      setInitialUrlTimestamp(targetT);
    }

    if (targetId && !selectedItem) {
      // Fetch the specific item
      fetch(`/api/media/audio/${targetId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.id) {
            console.log('Loaded direct link item:', data.title);
            const item = {
              ...data,
              metadata:
                typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
            };
            setSelectedItem(item);
          }
        })
        .catch(console.error);
    }
  }, [initialAudioId, initialTimestamp, selectedItem, initialUrlTimestamp]);

  // Load albums on mount
  useEffect(() => {
    loadAlbums();
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const loadTotals = async () => {
      try {
        const res = await fetch('/api/media/audio?page=1&limit=1');
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
    fetchAudio(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAudio already captures latest selectedAlbum/transcriptSearch
  }, [selectedAlbum, transcriptSearch]);

  useEffect(() => {
    const isSascha =
      (currentAlbum && currentAlbum.name.includes('Sascha')) ||
      items.some((it) => it.title.includes('Sascha'));
    if (!isSascha) {
      setInvestigationId(null);
      setInvestigationSummary(null);
      return;
    }
    (async () => {
      try {
        const resp = await fetch(
          `/api/investigations/by-title?title=${encodeURIComponent('Sascha Barros Testimony')}`,
        );
        if (resp.ok) {
          const inv = await resp.json();
          setInvestigationId(inv.id);
          const summary = await apiClient.getInvestigationEvidenceSummary(String(inv.id));
          setInvestigationSummary(summary);
        }
      } catch {
        void 0;
      }
    })();
  }, [currentAlbum, items]);

  const loadAlbums = async () => {
    try {
      const res = await fetch('/api/media/audio/albums');
      if (!res.ok) throw new Error('Failed to load albums');
      const data = await res.json();
      setAlbums(data);
    } catch (err) {
      console.error('Failed to load albums:', err);
    }
  };

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
      // Refresh data to show new tags
      fetchAudio(1);
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
      fetchAudio(1);
      setSelectedItems(new Set());
      setIsBatchMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAudio = useCallback(
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
        if (selectedAlbum) {
          params.append('albumId', selectedAlbum.toString());
        }
        if (transcriptSearch.trim()) {
          params.append('transcriptQuery', transcriptSearch.trim());
        }
        // Always sort by title as requested ("sorted by name by tranche")
        params.append('sortBy', 'title');

        const res = await fetch(`/api/media/audio?${params}`, {
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) throw new Error('Failed to load audio files');

        const data = await res.json();
        const newItems = data.mediaItems || [];

        if (pageNum === 1) {
          setItems(newItems);
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }

        if (pageNum === 1 && quickStart && !selectedItem && newItems.length > 0) {
          setSelectedItem(newItems[0]);
        }

        setHasMore(newItems.length === 24);
        setPage(pageNum);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error(err);
        setError('Failed to load audio content');
      } finally {
        setLoading(false);
      }
    },
    [selectedAlbum, transcriptSearch, quickStart, selectedItem],
  );

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    fetchAudio(nextPage);
  }, [page, fetchAudio]);

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
  const loadMoreItems = useCallback(
    (_startIndex: number, _stopIndex: number) => {
      if (!loading && hasMore) {
        return handleLoadMore();
      }
      return Promise.resolve();
    },
    [loading, hasMore, handleLoadMore],
  );

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
              const thumb = item.metadata?.thumbnailPath || null;
              const displayImage = thumb
                ? `/api/static?path=${encodeURIComponent(thumb)}`
                : isSascha
                  ? `/data/media/audio/lvoocaudiop1/lvoocaudiop1.webp`
                  : null;

              return (
                <div
                  key={item.id}
                  className={`bg-slate-900/50 border rounded-lg overflow-hidden transition-all group cursor-pointer flex flex-col min-h-[260px] ${isSelected ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-800 hover:border-cyan-500/30'}`}
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
                        className="w-6 h-6 flex items-center justify-center rounded bg-amber-700 text-white text-[11px] font-bold border border-amber-500"
                      >
                        +
                      </button>
                      {pickerOpenId === item.id && (
                        <div className="bg-slate-900 border border-slate-700 rounded p-2 shadow-xl">
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
                            className="text-xs bg-slate-800 text-white border border-slate-700 rounded px-2 py-1"
                          >
                            <option value="">Select investigation</option>
                            <option value={investigationId || ''}>
                              {investigationId ? 'Sascha Barros Testimony' : 'Default'}
                            </option>
                            {investigationsList.map((inv: any) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {addingId === item.id && (
                        <div className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded">
                          …
                        </div>
                      )}
                    </div>
                    {isBatchMode && (
                      <div className="absolute top-2 left-2 z-20">
                        {isSelected ? (
                          <CheckSquare className="text-cyan-500 fill-cyan-950" />
                        ) : (
                          <Square className="text-white/70" />
                        )}
                      </div>
                    )}
                    <div className="aspect-video bg-slate-900 relative flex items-center justify-center group-hover:bg-slate-800 transition-colors overflow-hidden">
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
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:scale-110 transition-transform shadow-lg">
                          <Music size={32} className="text-cyan-500" />
                        </div>
                      )}

                      {(item.metadata?.duration || 0) > 0 && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded-full font-mono flex items-center gap-1">
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
                        className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors line-clamp-2"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags &&
                        item.tags.map((t: any) => (
                          <span
                            key={t.id}
                            className="text-[10px] bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded-full"
                          >
                            {t.name}
                          </span>
                        ))}
                      {item.people &&
                        item.people.map((p: any) => (
                          <span
                            key={p.id}
                            className="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded-full"
                          >
                            {p.name}
                          </span>
                        ))}
                    </div>

                    <div className="mt-auto space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-6">{item.description}</p>
                      )}

                      {/* When transcriptSearch is active, surface matching transcript
                          segments here so users see what text is being matched and
                          can jump straight to the relevant timecodes. */}
                      {transcriptSearch.trim() &&
                        Array.isArray(item.metadata?.transcript) &&
                        item.metadata.transcript.length > 0 && (
                          <div className="mt-3 border-t border-slate-800 pt-2 space-y-1 min-h-[60px]">
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">
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
                                    className="w-full text-left text-[11px] text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 rounded px-2 py-1 flex items-start gap-2"
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
                                    <span className="font-mono text-[10px] text-slate-500 min-w-[40px]">
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
    <div className="flex flex-col h-full min-h-[500px] bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden rounded-lg">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0 z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Music size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Audio Recordings</h2>
              <p className="text-slate-400 text-xs font-medium">
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
                    (investigationSummary.evidence || []).filter((e: any) => e.relevance === 'high')
                      .length
                  }
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-900/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold uppercase tracking-wider">
                <Icon name="Check" size="xs" />
                <span>
                  Medium{' '}
                  {
                    (investigationSummary.evidence || []).filter(
                      (e: any) => e.relevance === 'medium',
                    ).length
                  }
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/50 text-[11px] font-bold uppercase tracking-wider">
                <Icon name="Info" size="xs" />
                <span>
                  Low{' '}
                  {
                    (investigationSummary.evidence || []).filter((e: any) => e.relevance === 'low')
                      .length
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={transcriptSearch}
              onChange={(e) => setTranscriptSearch(e.target.value)}
              placeholder={
                selectedAlbum ? 'Search transcripts in this album…' : 'Search transcripts…'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-slate-600 transition-all border-hover:slate-700"
            />
          </div>

          <div className="h-8 w-[1px] bg-slate-800 mx-1 hidden md:block"></div>

          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${
              isBatchMode
                ? 'bg-cyan-600 text-white ring-2 ring-cyan-400/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
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
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border border-amber-500/50 shadow-lg shadow-amber-900/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Icon name="ExternalLink" size="xs" />
            <span>Open Investigation</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Albums sidebar - Hidden on mobile */}
        <aside className="hidden md:flex w-60 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
            Albums
          </h3>
          <div className="flex-1 overflow-y-auto">
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === null ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
              onClick={() => setSelectedAlbum(null)}
            >
              <span className="truncate">All Audio</span>
              <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                {libraryTotalCount}
              </span>
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
                onClick={() => setSelectedAlbum(album.id)}
                title={album.name}
              >
                <span className="truncate">{album.name}</span>
                <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                  {album.itemCount || 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
          {loading && page === 1 ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          ) : null}

          {/* Sensitive Content Warning Banner */}
          {showSensitiveWarning && <SensitiveWarningBanner mediaType="audio" />}

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 mx-6 mt-6 rounded-lg">
              {error}
            </div>
          )}

          <div ref={containerRef} className="flex-1 overflow-hidden">
            {items.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
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
                  innerElementType={React.forwardRef<HTMLDivElement, any>(
                    ({ style, ...rest }, ref) => (
                      <div
                        ref={ref}
                        style={{
                          ...style,
                          height: `${parseFloat(style.height) + 48}px`, // +24px top, +24px bottom
                        }}
                        {...rest}
                      />
                    ),
                  )}
                  onScroll={({ scrollOffset, scrollUpdateWasRequested }) => {
                    if (scrollUpdateWasRequested) return;
                    const containerHeight = containerRef.current?.clientHeight || 600;
                    const totalHeight = rowCount * 520;
                    if (
                      scrollOffset + containerHeight >= totalHeight - 200 &&
                      !loading &&
                      hasMore
                    ) {
                      loadMoreItems(0, 0);
                    }
                  }}
                >
                  {Row}
                </List>
                {loading && (
                  <div className="py-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-500"></div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none shrink-0">
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
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl h-[90vh] max-h-[90vh] shadow-2xl ring-1 ring-white/10 rounded-lg overflow-hidden">
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
  );
};
