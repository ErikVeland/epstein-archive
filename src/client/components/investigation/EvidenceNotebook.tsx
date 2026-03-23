import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bold,
  Film,
  FileText,
  GripVertical,
  Italic,
  Link2,
  List,
  ListChecks,
  Mic,
  Quote,
  Scissors,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface EvidenceRecord {
  id: number;
  evidenceType: string;
  title?: string;
  description?: string;
  redFlagRating?: number;
  createdAt?: string;
  notes?: string;
  relevance?: string;
  metadataJson?: string;
}

interface NotebookProps {
  investigationId: number;
}

interface NotebookAnnotation {
  id: string;
  source: 'notebook' | 'evidence';
  type: string;
  content?: string;
  format?: 'plain' | 'markdown';
  evidenceId?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

interface IncomingEvidenceAnnotation {
  id?: string;
  type?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const applyInlineMarkdown = (value: string): string => {
  let output = value;
  output = output.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 rounded bg-[var(--glass-bg)] text-cyan-200">$1</code>',
  );
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline">$1</a>',
  );
  return output;
};

const renderMarkdown = (markdown: string): string => {
  const source = escapeHtml(markdown || '');
  const codeBlocks: string[] = [];

  let content = source.replace(/```([\s\S]*?)```/g, (_match, code) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(
      `<pre class="bg-slate-950 border border-[var(--glass-border)] rounded-md p-3 overflow-x-auto"><code>${code}</code></pre>`,
    );
    return token;
  });

  const lines = content.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeLists();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeLists();
      const level = heading[1].length;
      out.push(
        `<h${level} class="font-semibold text-[var(--text-primary)] mt-3 mb-2">${applyInlineMarkdown(heading[2])}</h${level}>`,
      );
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      closeLists();
      out.push('<hr class="border-[var(--glass-border)] my-3" />');
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      closeLists();
      out.push(
        `<blockquote class="border-l-4 border-[var(--glass-border)] pl-3 italic text-[var(--text-secondary)] my-2">${applyInlineMarkdown(quote[1])}</blockquote>`,
      );
      continue;
    }

    const checklist = line.match(/^[-*]\s+\[( |x|X)\]\s+(.+)$/);
    if (checklist) {
      if (!inUl) {
        closeLists();
        out.push('<ul class="list-none pl-1 space-y-1">');
        inUl = true;
      }
      const checked = checklist[1].toLowerCase() === 'x';
      out.push(
        `<li class="text-[var(--text-primary)]"><input type="checkbox" disabled ${checked ? 'checked' : ''} class="mr-2" />${applyInlineMarkdown(checklist[2])}</li>`,
      );
      continue;
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      if (!inUl) {
        closeLists();
        out.push('<ul class="list-disc pl-6 space-y-1">');
        inUl = true;
      }
      out.push(`<li class="text-[var(--text-primary)]">${applyInlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^(\d+)\.\s+(.+)$/);
    if (ordered) {
      if (!inOl) {
        closeLists();
        out.push('<ol class="list-decimal pl-6 space-y-1">');
        inOl = true;
      }
      out.push(`<li class="text-[var(--text-primary)]">${applyInlineMarkdown(ordered[2])}</li>`);
      continue;
    }

    closeLists();
    out.push(`<p class="text-[var(--text-primary)] leading-6">${applyInlineMarkdown(line)}</p>`);
  }

  closeLists();
  content = out.join('\n');

  codeBlocks.forEach((block, idx) => {
    content = content.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  return content;
};

const mapEvidenceAnnotations = (
  evidenceId: number,
  annotations: IncomingEvidenceAnnotation[],
): NotebookAnnotation[] =>
  annotations.map((annotation, idx) => ({
    id: `evidence-${evidenceId}-${annotation.id || idx}`,
    source: 'evidence',
    type: annotation.type || 'note',
    evidenceId,
    content: annotation.content || '',
    format: 'plain',
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt,
    metadata: annotation.metadata,
  }));

export const EvidenceNotebook: React.FC<NotebookProps> = ({ investigationId }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<{ evidence?: EvidenceRecord[] } | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [annotations, setAnnotations] = useState<NotebookAnnotation[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [mediaCache, setMediaCache] = useState<
    Record<
      number,
      { metadata?: { transcript?: Array<{ text?: string; speaker?: string; start?: number }> } }
    >
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'offline'>(
    'idle',
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const saveSequenceRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const notesEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const renderCountRef = useRef(0);
  const localDraftKey = `notebook_draft_${investigationId}`;

  const loadEvidenceAnnotationsFromApi = useCallback(
    async (evidenceItems: EvidenceRecord[]): Promise<NotebookAnnotation[]> => {
      if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) return [];

      const batches = await Promise.all(
        evidenceItems.map(async (item) => {
          const evidenceId = Number(item.id);
          if (!Number.isFinite(evidenceId)) return [] as NotebookAnnotation[];

          try {
            const response = await fetch(
              `/api/investigations/${investigationId}/evidence/${evidenceId}/annotations`,
            );
            if (!response.ok) return [] as NotebookAnnotation[];
            const payload = await response.json();
            const incoming = Array.isArray(payload?.annotations)
              ? (payload.annotations as IncomingEvidenceAnnotation[])
              : [];
            return mapEvidenceAnnotations(evidenceId, incoming);
          } catch (_error) {
            return [] as NotebookAnnotation[];
          }
        }),
      );

      return batches.flat();
    },
    [investigationId],
  );

  const parseMeta = (s?: string) => {
    try {
      return s ? JSON.parse(s) : {};
    } catch (_e) {
      return {};
    }
  };

  const queuePersist = useCallback(
    async (nextOrder: number[], nextNotes: string, nextAnnotations: NotebookAnnotation[]) => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(async () => {
        const seq = ++saveSequenceRef.current;
        setIsSaving(true);
        setSaveState('saving');
        setSaveErrorMessage(null);
        localStorage.setItem(
          localDraftKey,
          JSON.stringify({
            notes: nextNotes,
            order: nextOrder,
            annotations: nextAnnotations,
            state: 'pending',
            updatedAt: new Date().toISOString(),
          }),
        );
        if (typeof window !== 'undefined') {
          import('../../utils/performanceMonitor')
            .then(({ PerformanceMonitor }) => {
              PerformanceMonitor.mark('notebook-save-start');
            })
            .catch(() => {});
        }

        const withoutCaseNotes = nextAnnotations.filter((a) => a.id !== 'case-notes');
        const persisted = [
          ...withoutCaseNotes,
          {
            id: 'case-notes',
            source: 'notebook' as const,
            type: 'note',
            format: 'markdown' as const,
            content: nextNotes,
            updatedAt: new Date().toISOString(),
          },
        ];

        try {
          await apiClient.updateInvestigationNotebook(String(investigationId), {
            order: nextOrder,
            annotations: persisted,
          });

          if (seq === saveSequenceRef.current) {
            setAnnotations(persisted);
            const now = new Date().toISOString();
            setLastSavedAt(now);
            setSaveState('saved');
            localStorage.setItem(
              localDraftKey,
              JSON.stringify({
                notes: nextNotes,
                order: nextOrder,
                annotations: persisted,
                state: 'saved',
                savedAt: now,
              }),
            );
            if (typeof window !== 'undefined') {
              import('../../utils/performanceMonitor')
                .then(({ PerformanceMonitor }) => {
                  PerformanceMonitor.mark('notebook-save-end');
                  PerformanceMonitor.measure(
                    'notebook-save-duration',
                    'notebook-save-start',
                    'notebook-save-end',
                  );
                })
                .catch(() => {});
            }
          }
        } catch (_error) {
          const offline = typeof navigator !== 'undefined' && !navigator.onLine;
          setSaveState(offline ? 'offline' : 'error');
          setSaveErrorMessage(
            offline ? 'Offline. Draft kept locally.' : 'Save failed. Draft kept locally.',
          );
          // Keep optimistic UI. Next successful save will converge.
        } finally {
          if (seq === saveSequenceRef.current) {
            setIsSaving(false);
          }
        }
      }, 350);
    },
    [investigationId, localDraftKey],
  );

  useEffect(() => {
    renderCountRef.current += 1;
    if (typeof window !== 'undefined' && renderCountRef.current <= 2) {
      import('../../utils/performanceMonitor')
        .then(({ PerformanceMonitor }) => {
          PerformanceMonitor.mark(`notebook-render-${renderCountRef.current}`);
        })
        .catch(() => {});
    }
  });

  const [notebookSeeded, setNotebookSeeded] = useState(false);

  const { data: notebookFetchResult, isLoading: notebookQueryLoading } = useQuery({
    queryKey: ['evidence-notebook', investigationId],
    queryFn: async () => {
      const [evidenceSummary, notebook] = await Promise.all([
        apiClient.getInvestigationEvidenceSummary(String(investigationId)) as Promise<{
          evidence?: EvidenceRecord[];
        }>,
        apiClient.getInvestigationNotebook(String(investigationId)) as Promise<
          Record<string, unknown>
        >,
      ]);
      const evidenceItems = Array.isArray(evidenceSummary?.evidence)
        ? evidenceSummary.evidence
        : [];
      const persistedEvidenceAnnotations = await loadEvidenceAnnotationsFromApi(evidenceItems);
      return { evidenceSummary, notebook, persistedEvidenceAnnotations };
    },
  });

  // Seed local mutable state once from query result
  useEffect(() => {
    if (notebookSeeded || !notebookFetchResult) return;

    const { evidenceSummary, notebook, persistedEvidenceAnnotations } = notebookFetchResult;

    setSummary(evidenceSummary);

    const loadedOrder = Array.isArray(notebook?.order)
      ? (notebook.order as unknown[]).filter((v) => Number.isFinite(Number(v))).map(Number)
      : [];
    const fallbackOrder = evidenceSummary?.evidence
      ? evidenceSummary.evidence.map((e) => Number(e.id)).filter((v) => Number.isFinite(v))
      : [];

    setOrder(loadedOrder.length > 0 ? loadedOrder : fallbackOrder);

    const loadedAnnotations = Array.isArray(notebook?.annotations)
      ? (notebook.annotations as NotebookAnnotation[])
      : [];
    const nonEvidence = loadedAnnotations.filter((a) => a.source !== 'evidence');
    const mergedAnnotations = [...nonEvidence, ...persistedEvidenceAnnotations];
    setAnnotations(mergedAnnotations);

    const caseNotes = mergedAnnotations.find((a) => a.id === 'case-notes')?.content || '';
    const localDraftRaw = localStorage.getItem(localDraftKey);
    if (localDraftRaw) {
      try {
        const localDraft = JSON.parse(localDraftRaw) as Record<string, unknown>;
        const localNotes = typeof localDraft?.notes === 'string' ? localDraft.notes : '';
        const localOrder = Array.isArray(localDraft?.order) ? (localDraft.order as number[]) : [];
        setNotesDraft(localNotes.trim().length > 0 ? localNotes : caseNotes);
        if (localOrder.length > 0) setOrder(localOrder);
        if (localDraft?.savedAt) {
          setLastSavedAt(String(localDraft.savedAt));
          setSaveState('saved');
        }
      } catch (_error) {
        setNotesDraft(caseNotes);
      }
    } else {
      setNotesDraft(caseNotes);
    }

    setNotebookSeeded(true);
  }, [notebookFetchResult, notebookSeeded, localDraftKey]);

  // Derive loading from query until seeded
  useEffect(() => {
    if (!notebookQueryLoading && notebookSeeded) {
      setLoading(false);
    }
  }, [notebookQueryLoading, notebookSeeded]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const onEvidenceAnnotationUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail || {};
      if (String(detail.investigationId) !== String(investigationId)) return;

      const evidenceId = Number(detail.evidenceId);
      if (!Number.isFinite(evidenceId)) return;

      const incoming = Array.isArray(detail.annotations)
        ? (detail.annotations as IncomingEvidenceAnnotation[])
        : [];
      const mapped = mapEvidenceAnnotations(evidenceId, incoming);

      setAnnotations((prev) => {
        const kept = prev.filter((a) => !(a.source === 'evidence' && a.evidenceId === evidenceId));
        const next = [...kept, ...mapped];
        queuePersist(order, notesDraft, next);
        return next;
      });
    };

    window.addEventListener(
      'investigation-evidence-annotations-updated',
      onEvidenceAnnotationUpdated as EventListener,
    );

    return () => {
      window.removeEventListener(
        'investigation-evidence-annotations-updated',
        onEvidenceAnnotationUpdated as EventListener,
      );
    };
  }, [investigationId, notesDraft, order, queuePersist]);

  const grouped = useMemo(() => {
    const result: Record<string, EvidenceRecord[]> = { snippet: [], audio: [], video: [], doc: [] };
    const list: EvidenceRecord[] = summary?.evidence || [];

    const orderedLookup = new Map(order.map((id, index) => [id, index]));
    const orderedList = [...list].sort((a, b) => {
      const ai = orderedLookup.get(a.id);
      const bi = orderedLookup.get(b.id);
      if (typeof ai === 'number' && typeof bi === 'number') return ai - bi;
      if (typeof ai === 'number') return -1;
      if (typeof bi === 'number') return 1;
      return 0;
    });

    for (const e of orderedList) {
      const type = e.evidenceType || '';
      if (type === 'audio') result.audio.push(e);
      else if (type === 'video') result.video.push(e);
      else if (
        type === 'investigative_report' ||
        type === 'correspondence' ||
        type === 'court_filing' ||
        type === 'court_deposition' ||
        type === 'media_scan'
      ) {
        result.doc.push(e);
      } else {
        result.snippet.push(e);
      }
    }
    return result;
  }, [summary, order]);

  const evidenceAnnotations = useMemo(
    () =>
      annotations
        .filter((a) => a.source === 'evidence')
        .sort((a, b) => {
          const left = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const right = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return right - left;
        }),
    [annotations],
  );

  useEffect(() => {
    const audioIds: number[] = [];
    const videoIds: number[] = [];

    for (const e of grouped.audio) {
      const meta = parseMeta(e.metadataJson);
      if (meta.media_item_id) audioIds.push(meta.media_item_id);
    }
    for (const e of grouped.video) {
      const meta = parseMeta(e.metadataJson);
      if (meta.media_item_id) videoIds.push(meta.media_item_id);
    }

    audioIds.forEach((id) => fetchMediaDetails(id, 'audio'));
    videoIds.forEach((id) => fetchMediaDetails(id, 'video'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped]);

  const saveOrder = (next: number[]) => {
    setOrder(next);
    queuePersist(next, notesDraft, annotations);
  };

  const move = (id: number, dir: -1 | 1) => {
    const idx = order.indexOf(id);
    if (idx === -1) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= order.length) return;

    const next = [...order];
    const [row] = next.splice(idx, 1);
    next.splice(ni, 0, row);
    saveOrder(next);
  };

  const fetchMediaDetails = async (mediaItemId: number, kind: 'audio' | 'video') => {
    if (mediaCache[mediaItemId]) return;
    try {
      const res = await fetch(`/api/media/${kind}/${mediaItemId}`);
      if (res.ok) {
        const json = await res.json();
        setMediaCache((c) => ({ ...c, [mediaItemId]: json }));
      }
    } catch (_e) {
      return;
    }
  };

  const openAudio = (mediaItemId: number, albumId?: number) => {
    const url = albumId
      ? `/media/audio?id=${mediaItemId}&albumId=${albumId}`
      : `/media/audio?id=${mediaItemId}`;
    navigate(url);
  };

  const openVideo = (mediaItemId: number, albumId?: number) => {
    const url = albumId
      ? `/media/video?id=${mediaItemId}&albumId=${albumId}`
      : `/media/video?id=${mediaItemId}`;
    navigate(url);
  };

  const insertMarkdownToken = (prefix: string, suffix = '', placeholder = '') => {
    const textarea = notesEditorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = notesDraft;
    const selected = value.slice(start, end);
    const hasSelection = selected.length > 0;
    const insertValue = `${prefix}${hasSelection ? selected : placeholder}${suffix}`;
    const nextValue = `${value.slice(0, start)}${insertValue}${value.slice(end)}`;

    setNotesDraft(nextValue);
    queuePersist(order, nextValue, annotations);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = hasSelection ? start + insertValue.length : start + prefix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const markdownPreviewHtml = useMemo(() => renderMarkdown(notesDraft), [notesDraft]);

  const retryPersist = () => {
    queuePersist(order, notesDraft, annotations);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 w-48 bg-[var(--glass-bg-highlight)] rounded mb-3"></div>
        <div className="animate-pulse h-3 w-96 bg-[var(--glass-bg)] rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Evidence Notebook</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Write with Markdown and keep narrative in sync with evidence annotations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/investigations/${investigationId}/briefing`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-blue-700 text-[var(--text-primary)] transition-colors"
          >
            Publish Briefing
          </a>
        </div>
      </div>

      <section className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">Case Notes</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(false)}
              className={`text-xs px-2 py-1 rounded ${!previewMode ? 'bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
            >
              Edit
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`text-xs px-2 py-1 rounded ${previewMode ? 'bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
            >
              Preview
            </button>
            <span
              className="text-xs text-[var(--text-muted)]"
              aria-live="polite"
              data-testid="notebook-save-status"
            >
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' &&
                `Saved at ${new Date(lastSavedAt || Date.now()).toLocaleTimeString()}`}
              {saveState === 'offline' && 'Offline - local draft retained'}
              {saveState === 'error' && 'Failed to save - local draft retained'}
              {saveState === 'idle' && (isSaving ? 'Saving...' : 'Ready')}
            </span>
            {(saveState === 'offline' || saveState === 'error') && (
              <button
                onClick={retryPersist}
                data-testid="notebook-retry-save"
                className="text-xs px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-[var(--text-primary)]"
              >
                Retry save
              </button>
            )}
          </div>
        </div>
        {saveErrorMessage && (
          <div className="mb-2 text-xs text-amber-300 bg-amber-900/30 border border-amber-700 rounded px-2 py-1">
            {saveErrorMessage}
          </div>
        )}

        {!previewMode && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button
              onClick={() => insertMarkdownToken('**', '**', 'bold text')}
              className="p-1.5 rounded bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('*', '*', 'italic text')}
              className="p-1.5 rounded bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('# ', '', 'Heading')}
              className="p-1.5 rounded bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
              title="Heading"
            >
              H1
            </button>
            <button
              onClick={() => insertMarkdownToken('> ', '', 'Quote')}
              className="p-1.5 rounded bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
              title="Quote"
            >
              <Quote size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('- ', '', 'List item')}
              className="p-1.5 rounded bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
              title="List"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('- [ ] ', '', 'Task')}
              className="p-1.5 rounded bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
              title="Checklist"
            >
              <ListChecks size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('[', '](https://)', 'link text')}
              className="p-1.5 rounded bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
              title="Link"
            >
              <Link2 size={14} />
            </button>
          </div>
        )}

        {!previewMode ? (
          <textarea
            data-testid="notebook-textarea"
            ref={notesEditorRef}
            value={notesDraft}
            onChange={(e) => {
              const next = e.target.value;
              if (typeof window !== 'undefined') {
                import('../../utils/performanceMonitor')
                  .then(({ PerformanceMonitor }) => {
                    PerformanceMonitor.mark('notebook-input-change');
                  })
                  .catch(() => {});
              }
              setNotesDraft(next);
              queuePersist(order, next, annotations);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                insertMarkdownToken('**', '**', 'bold text');
              }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                insertMarkdownToken('*', '*', 'italic text');
              }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                insertMarkdownToken('[', '](https://)', 'link text');
              }
            }}
            placeholder="Write your narrative, key claims, or open questions for this case."
            className="w-full min-h-[220px] bg-slate-950 border border-[var(--glass-border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/60"
          />
        ) : (
          <div
            className="min-h-[220px] bg-slate-950 border border-[var(--glass-border)] rounded-md px-4 py-3 prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html:
                markdownPreviewHtml ||
                '<p class="text-[var(--text-muted)]">Nothing to preview yet.</p>',
            }}
          />
        )}
      </section>

      <section className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
          Evidence annotations (auto-synced)
        </h3>
        {evidenceAnnotations.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No evidence annotations yet. Add notes/highlights/tags in Evidence and they appear here
            automatically.
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {evidenceAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="bg-slate-950 border border-[var(--glass-border)] rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                    Evidence #{annotation.evidenceId}
                  </span>
                  <span className="uppercase">{annotation.type}</span>
                  <span>
                    {new Date(
                      annotation.updatedAt || annotation.createdAt || Date.now(),
                    ).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                  {annotation.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-[var(--text-muted)]">Use arrows to reorder your outline.</p>

      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-3">
            <Scissors size={16} />
            <span>Snippets</span>
          </div>
          <div className="space-y-3">
            {grouped.snippet.map((e) => {
              const meta = parseMeta(e.metadataJson);
              const docId = meta.document_id;
              const highlight = e.description || '';
              const viewUrl = docId
                ? `/documents?docId=${docId}&docTab=content&highlight=${encodeURIComponent(highlight.slice(0, 120))}`
                : undefined;
              return (
                <div
                  key={e.id}
                  className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                      <GripVertical size={14} />
                      <span>{e.title || 'Snippet'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => move(e.id, -1)}
                        className="text-xs px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(e.id, 1)}
                        className="text-xs px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] rounded"
                      >
                        ↓
                      </button>
                      {viewUrl && (
                        <Link
                          to={viewUrl}
                          className="text-xs px-2 py-1 bg-blue-700 text-[var(--text-primary)] rounded"
                        >
                          View Source
                        </Link>
                      )}
                    </div>
                  </div>
                  {e.description && (
                    <div className="text-sm text-[var(--text-secondary)] mt-2 whitespace-pre-wrap">
                      {e.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-3">
            <Mic size={16} />
            <span>Audio</span>
          </div>
          <div className="space-y-3">
            {grouped.audio.map((e) => {
              const meta = parseMeta(e.metadataJson);
              const mediaId = meta.media_item_id;
              const albumId = meta.album_id;
              const details = mediaId ? mediaCache[mediaId] : null;
              const segments = details?.metadata?.transcript || [];
              return (
                <div
                  key={e.id}
                  className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                      <GripVertical size={14} />
                      <span>{e.title || 'Audio'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => move(e.id, -1)}
                        className="text-xs px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(e.id, 1)}
                        className="text-xs px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] rounded"
                      >
                        ↓
                      </button>
                      {mediaId && (
                        <button
                          onClick={() => openAudio(mediaId, albumId)}
                          className="text-xs px-2 py-1 bg-blue-700 text-[var(--text-primary)] rounded"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                  {segments && segments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {segments.slice(0, 6).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => openAudio(mediaId, albumId)}
                          className="block text-left w-full text-xs text-[var(--text-secondary)] bg-[var(--glass-bg)]/60 hover:bg-[var(--glass-bg-highlight)] px-2 py-1 rounded"
                          title={`${s.speaker || ''} ${s.start || 0}s`}
                        >
                          {s.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-3">
            <Film size={16} />
            <span>Video</span>
          </div>
          <div className="space-y-3">
            {grouped.video.map((e) => {
              const meta = parseMeta(e.metadataJson);
              const mediaId = meta.media_item_id;
              const albumId = meta.album_id;
              const details = mediaId ? mediaCache[mediaId] : null;
              const segments = details?.metadata?.transcript || [];
              return (
                <div
                  key={e.id}
                  className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                      <GripVertical size={14} />
                      <span>{e.title || 'Video'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => move(e.id, -1)}
                        className="text-xs px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(e.id, 1)}
                        className="text-xs px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] rounded"
                      >
                        ↓
                      </button>
                      {mediaId && (
                        <button
                          onClick={() => openVideo(mediaId, albumId)}
                          className="text-xs px-2 py-1 bg-blue-700 text-[var(--text-primary)] rounded"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                  {segments && segments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {segments.slice(0, 6).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => openVideo(mediaId, albumId)}
                          className="block text-left w-full text-xs text-[var(--text-secondary)] bg-[var(--glass-bg)]/60 hover:bg-[var(--glass-bg-highlight)] px-2 py-1 rounded"
                          title={`${s.speaker || ''} ${s.start || 0}s`}
                        >
                          {s.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-3">
            <FileText size={16} />
            <span>Documents</span>
          </div>
          <div className="space-y-3">
            {grouped.doc.map((e) => (
              <div
                key={e.id}
                className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--text-primary)]">
                    <GripVertical size={14} />
                    <span>{e.title || 'Document'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => move(e.id, -1)}
                      className="text-xs px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] rounded"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(e.id, 1)}
                      className="text-xs px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] rounded"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                {e.description && (
                  <div className="text-sm text-[var(--text-secondary)] mt-2 whitespace-pre-wrap">
                    {e.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
