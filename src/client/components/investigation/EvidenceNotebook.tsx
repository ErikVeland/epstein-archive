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
import styles from './EvidenceNotebook.module.css';

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
  output = output.replace(/`([^`]+)`/g, `<code class="${styles.code}">$1</code>`);
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener noreferrer" class="${styles.link}">$1</a>`,
  );
  return output;
};

const renderMarkdown = (markdown: string): string => {
  const source = escapeHtml(markdown || '');
  const codeBlocks: string[] = [];

  let content = source.replace(/```([\s\S]*?)```/g, (_match, code) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="${styles.pre}"><code>${code}</code></pre>`);
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
      out.push(`<h${level}>${applyInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      closeLists();
      out.push('<hr />');
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      closeLists();
      out.push(`<blockquote>${applyInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const checklist = line.match(/^[-*]\s+\[( |x|X)\]\s+(.+)$/);
    if (checklist) {
      if (!inUl) {
        closeLists();
        out.push('<ul>');
        inUl = true;
      }
      const checked = checklist[1].toLowerCase() === 'x';
      out.push(
        `<li><input type="checkbox" disabled ${checked ? 'checked' : ''} /> ${applyInlineMarkdown(checklist[2])}</li>`,
      );
      continue;
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      if (!inUl) {
        closeLists();
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${applyInlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^(\d+)\.\s+(.+)$/);
    if (ordered) {
      if (!inOl) {
        closeLists();
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${applyInlineMarkdown(ordered[2])}</li>`);
      continue;
    }

    closeLists();
    out.push(`<p>${applyInlineMarkdown(line)}</p>`);
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
      <div className={styles.loadingPlaceholder}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonText}></div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Evidence Notebook</h2>
          <p className={styles.subtitle}>
            Write with Markdown and keep narrative in sync with evidence annotations.
          </p>
        </div>
        <div className={styles.toolbar}>
          <a
            href={`/api/investigations/${investigationId}/briefing`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.publishButton}
          >
            Publish Briefing
          </a>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Case Notes</h3>
          <div className={styles.toolbar}>
            <button
              onClick={() => setPreviewMode(false)}
              className={`${styles.toolButton} ${!previewMode ? styles.toolButtonActive : ''}`}
            >
              Edit
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`${styles.toolButton} ${previewMode ? styles.toolButtonActive : ''}`}
            >
              Preview
            </button>
            <span
              className={styles.saveStatus}
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
                className={styles.retryButton}
              >
                Retry save
              </button>
            )}
          </div>
        </div>
        {saveErrorMessage && <div className={styles.errorMessage}>{saveErrorMessage}</div>}

        {!previewMode && (
          <div className={styles.markdownControls}>
            <button
              onClick={() => insertMarkdownToken('**', '**', 'bold text')}
              className={styles.markdownButton}
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('*', '*', 'italic text')}
              className={styles.markdownButton}
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('# ', '', 'Heading')}
              className={styles.markdownButton}
              title="Heading"
            >
              H1
            </button>
            <button
              onClick={() => insertMarkdownToken('> ', '', 'Quote')}
              className={styles.markdownButton}
              title="Quote"
            >
              <Quote size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('- ', '', 'List item')}
              className={styles.markdownButton}
              title="List"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('- [ ] ', '', 'Task')}
              className={styles.markdownButton}
              title="Checklist"
            >
              <ListChecks size={14} />
            </button>
            <button
              onClick={() => insertMarkdownToken('[', '](https://)', 'link text')}
              className={styles.markdownButton}
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
            className={styles.editor}
          />
        ) : (
          <div
            className={styles.preview}
            dangerouslySetInnerHTML={{
              __html:
                markdownPreviewHtml ||
                '<p class="text-[var(--text-muted)]">Nothing to preview yet.</p>',
            }}
          />
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Evidence annotations (auto-synced)</h3>
        {evidenceAnnotations.length === 0 ? (
          <p className={styles.hint}>
            No evidence annotations yet. Add notes/highlights/tags in Evidence and they appear here
            automatically.
          </p>
        ) : (
          <div className={styles.annotationList}>
            {evidenceAnnotations.map((annotation) => (
              <div key={annotation.id} className={styles.annotationCard}>
                <div className={styles.annotationHeader}>
                  <span className={styles.annotationBadge}>Evidence #{annotation.evidenceId}</span>
                  <span className="uppercase">{annotation.type}</span>
                  <span>
                    {new Date(
                      annotation.updatedAt || annotation.createdAt || Date.now(),
                    ).toLocaleString()}
                  </span>
                </div>
                <p className={styles.annotationContent}>{annotation.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className={styles.hint}>Use arrows to reorder your outline.</p>

      <div className={styles.evidenceGroups}>
        <section>
          <div className={styles.evidenceGroupTitle}>
            <Scissors size={16} />
            <span>Snippets</span>
          </div>
          <div className={styles.evidenceList}>
            {grouped.snippet.map((e) => {
              const meta = parseMeta(e.metadataJson);
              const docId = meta.document_id;
              const highlight = e.description || '';
              const viewUrl = docId
                ? `/documents?docId=${docId}&docTab=content&highlight=${encodeURIComponent(highlight.slice(0, 120))}`
                : undefined;
              return (
                <div key={e.id} className={styles.evidenceCard}>
                  <div className={styles.evidenceCardHeader}>
                    <div className={styles.evidenceCardTitle}>
                      <GripVertical size={14} />
                      <span>{e.title || 'Snippet'}</span>
                    </div>
                    <div className={styles.evidenceActions}>
                      <button onClick={() => move(e.id, -1)} className={styles.evidenceButton}>
                        ↑
                      </button>
                      <button onClick={() => move(e.id, 1)} className={styles.evidenceButton}>
                        ↓
                      </button>
                      {viewUrl && (
                        <Link
                          to={viewUrl}
                          className={`${styles.evidenceButton} ${styles.evidenceButtonPrimary}`}
                        >
                          View Source
                        </Link>
                      )}
                    </div>
                  </div>
                  {e.description && <div className={styles.evidenceDesc}>{e.description}</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className={styles.evidenceGroupTitle}>
            <Mic size={16} />
            <span>Audio</span>
          </div>
          <div className={styles.evidenceList}>
            {grouped.audio.map((e) => {
              const meta = parseMeta(e.metadataJson);
              const mediaId = meta.media_item_id;
              const albumId = meta.album_id;
              const details = (mediaId ? mediaCache[mediaId] : null) as {
                metadata?: {
                  transcript?: Array<{ text?: string; speaker?: string; start?: number }>;
                };
              } | null;
              const segments = details?.metadata?.transcript || [];
              return (
                <div key={e.id} className={styles.evidenceCard}>
                  <div className={styles.evidenceCardHeader}>
                    <div className={styles.evidenceCardTitle}>
                      <GripVertical size={14} />
                      <span>{e.title || 'Audio'}</span>
                    </div>
                    <div className={styles.evidenceActions}>
                      <button onClick={() => move(e.id, -1)} className={styles.evidenceButton}>
                        ↑
                      </button>
                      <button onClick={() => move(e.id, 1)} className={styles.evidenceButton}>
                        ↓
                      </button>
                      {mediaId && (
                        <button
                          onClick={() => openAudio(mediaId, albumId)}
                          className={`${styles.evidenceButton} ${styles.evidenceButtonPrimary}`}
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                  {segments && segments.length > 0 && (
                    <div className={styles.transcriptList}>
                      {segments.slice(0, 6).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => openAudio(mediaId, albumId)}
                          className={styles.transcriptItem}
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
          <div className={styles.evidenceGroupTitle}>
            <Film size={16} />
            <span>Video</span>
          </div>
          <div className={styles.evidenceList}>
            {grouped.video.map((e) => {
              const meta = parseMeta(e.metadataJson);
              const mediaId = meta.media_item_id;
              const albumId = meta.album_id;
              const details = (mediaId ? mediaCache[mediaId] : null) as {
                metadata?: {
                  transcript?: Array<{ text?: string; speaker?: string; start?: number }>;
                };
              } | null;
              const segments = details?.metadata?.transcript || [];
              return (
                <div key={e.id} className={styles.evidenceCard}>
                  <div className={styles.evidenceCardHeader}>
                    <div className={styles.evidenceCardTitle}>
                      <GripVertical size={14} />
                      <span>{e.title || 'Video'}</span>
                    </div>
                    <div className={styles.evidenceActions}>
                      <button onClick={() => move(e.id, -1)} className={styles.evidenceButton}>
                        ↑
                      </button>
                      <button onClick={() => move(e.id, 1)} className={styles.evidenceButton}>
                        ↓
                      </button>
                      {mediaId && (
                        <button
                          onClick={() => openVideo(mediaId, albumId)}
                          className={`${styles.evidenceButton} ${styles.evidenceButtonPrimary}`}
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                  {segments && segments.length > 0 && (
                    <div className={styles.transcriptList}>
                      {segments.slice(0, 6).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => openVideo(mediaId, albumId)}
                          className={styles.transcriptItem}
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
          <div className={styles.evidenceGroupTitle}>
            <FileText size={16} />
            <span>Documents</span>
          </div>
          <div className={styles.evidenceList}>
            {grouped.doc.map((e) => (
              <div key={e.id} className={styles.evidenceCard}>
                <div className={styles.evidenceCardHeader}>
                  <div className={styles.evidenceCardTitle}>
                    <GripVertical size={14} />
                    <span>{e.title || 'Document'}</span>
                  </div>
                  <div className={styles.evidenceActions}>
                    <button onClick={() => move(e.id, -1)} className={styles.evidenceButton}>
                      ↑
                    </button>
                    <button onClick={() => move(e.id, 1)} className={styles.evidenceButton}>
                      ↓
                    </button>
                  </div>
                </div>
                {e.description && <div className={styles.evidenceDesc}>{e.description}</div>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
