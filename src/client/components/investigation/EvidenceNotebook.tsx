import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { format } from 'date-fns';
import { apiClient } from '@client/services/apiClient';
import DOMPurify from 'isomorphic-dompurify';

// UI Library
import {
  Surface,
  Button,
  Flex,
  Box,
  Stack,
  LqText,
  Grid,
  Badge,
  Textarea,
} from '@client/design-system/lib';
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
  evidenceId?: number;
  content: string;
  format: 'plain' | 'markdown';
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

interface IncomingEvidenceAnnotation {
  id?: number;
  type?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

const renderMarkdown = (text: string): string => {
  if (!text) return '';
  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const codeBlockRegex = /```([\s\S]*?)```/g;
  const codeBlocks: string[] = [];
  let content = text.replace(codeBlockRegex, (_, code) => {
    codeBlocks.push(escapeHtml(code));
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  const applyInlineMarkdown = (t: string) => {
    const escaped = escapeHtml(t);
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      );
  };
  const lines = content.split('\n');
  let inUl = false,
    inOl = false;
  const out: string[] = [];
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
  for (const line of lines) {
    if (line.startsWith('# ')) {
      closeLists();
      out.push(`<h1>${applyInlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeLists();
      out.push(`<h2>${applyInlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }
    const hr = line.match(/^[-*_]{3,}$/);
    if (hr) {
      closeLists();
      out.push('<hr />');
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
  codeBlocks.forEach((b, i) => {
    content = content.replace(`__CODE_BLOCK_${i}__`, `<pre><code>${b}</code></pre>`);
  });
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['a', 'code', 'em', 'h1', 'h2', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'ul'],
    ALLOWED_ATTR: ['href', 'rel', 'target'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['script', 'style'],
  });
};

const mapEvidenceAnnotations = (
  evId: number,
  anns: IncomingEvidenceAnnotation[],
): NotebookAnnotation[] =>
  anns.map((a, i) => ({
    id: `evidence-${evId}-${a.id || i}`,
    source: 'evidence' as const,
    type: a.type || 'note',
    evidenceId: evId,
    content: a.content || '',
    format: 'plain' as const,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    metadata: a.metadata,
  }));

export const EvidenceNotebook: React.FC<NotebookProps> = ({ investigationId }) => {
  const [summary, setSummary] = useState<{ evidence?: EvidenceRecord[] } | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [annotations, setAnnotations] = useState<NotebookAnnotation[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'offline'>(
    'idle',
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const saveSeqRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const localDraftKey = `notebook_draft_${investigationId}`;

  const loadEvidenceAnnotations = useCallback(
    async (itemsList: EvidenceRecord[]) => {
      if (!itemsList.length) return [];
      const batches = await Promise.all(
        itemsList.map(async (item) => {
          try {
            const res = await fetch(
              `/api/investigations/${investigationId}/evidence/${item.id}/annotations`,
            );
            if (!res.ok) return [];
            const payload = await res.json();
            return mapEvidenceAnnotations(Number(item.id), payload?.annotations || []);
          } catch {
            return [];
          }
        }),
      );
      return batches.flat();
    },
    [investigationId],
  );

  const queuePersist = useCallback(
    async (nextOrder: number[], nextNotes: string, nextAnns: NotebookAnnotation[]) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        const seq = ++saveSeqRef.current;
        setSaveState('saving');
        localStorage.setItem(
          localDraftKey,
          JSON.stringify({
            notes: nextNotes,
            order: nextOrder,
            annotations: nextAnns,
            state: 'pending',
            updatedAt: new Date().toISOString(),
          }),
        );

        const persisted = [
          ...nextAnns.filter((a) => a.id !== 'case-notes'),
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
          if (seq === saveSeqRef.current) {
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
          }
        } catch {
          const offline = !navigator.onLine;
          setSaveState(offline ? 'offline' : 'error');
        }
      }, 500);
    },
    [investigationId, localDraftKey],
  );

  const { data: fetchResult } = useQuery({
    queryKey: ['evidence-notebook', investigationId],
    queryFn: async () => {
      const [sum, nb] = await Promise.all([
        apiClient.getInvestigationEvidenceSummary(String(investigationId)),
        apiClient.getInvestigationNotebook(String(investigationId)),
      ]);
      const items = (sum as { evidence?: EvidenceRecord[] })?.evidence || [];
      const evAnns = await loadEvidenceAnnotations(items);
      return { sum, nb, evAnns };
    },
  });

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!fetchResult || initializedRef.current) return;
    initializedRef.current = true;
    const { sum, nb, evAnns } = fetchResult as {
      sum: { evidence?: EvidenceRecord[] };
      nb: { order?: number[]; annotations?: NotebookAnnotation[] };
      evAnns: NotebookAnnotation[];
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(sum);
    const loadedOrder = (nb?.order || []).map(Number).filter(Number.isFinite);
    setOrder(loadedOrder.length ? loadedOrder : (sum?.evidence || []).map((e) => e.id));
    const merged = [...(nb?.annotations || []).filter((a) => a.source !== 'evidence'), ...evAnns];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnnotations(merged);
    const caseNotes = merged.find((a) => a.id === 'case-notes')?.content || '';
    const local = localStorage.getItem(localDraftKey);
    if (local) {
      try {
        const d = JSON.parse(local);
        setNotesDraft(d.notes || caseNotes);
        if (d.order) setOrder(d.order);
        if (d.savedAt) {
          setLastSavedAt(d.savedAt);
          setSaveState('saved');
        }
      } catch {
        setNotesDraft(caseNotes);
      }
    } else {
      setNotesDraft(caseNotes);
    }
    setLoading(false);
  }, [fetchResult, localDraftKey]);

  const insertToken = (prefix: string, suffix = '', placeholder = '') => {
    const area = editorRef.current;
    if (!area) return;
    const start = area.selectionStart,
      end = area.selectionEnd;
    const val = notesDraft;
    const sel = val.slice(start, end);
    const ins = `${prefix}${sel || placeholder}${suffix}`;
    const next = `${val.slice(0, start)}${ins}${val.slice(end)}`;
    setNotesDraft(next);
    queuePersist(order, next, annotations);
    requestAnimationFrame(() => {
      area.focus();
      const pos = sel ? start + ins.length : start + prefix.length;
      area.setSelectionRange(pos, pos);
    });
  };

  const mdHtml = useMemo(() => renderMarkdown(notesDraft), [notesDraft]);

  if (loading)
    return (
      <Box p="xl">
        <Stack gap="lg">
          <Surface variant="glass" p="lg" style={{ height: 40, width: '60%' }} />
          <Surface variant="glass" p="lg" style={{ height: 400 }} />
        </Stack>
      </Box>
    );

  return (
    <Box style={{ backgroundColor: 'var(--lq-surface-1)' }}>
      {/* Header HUD */}
      <Surface variant="glass" p="xl" className={styles.autoGen44}>
        <Flex justify="between" align="center">
          <Stack gap="none">
            <Flex align="center" gap="md">
              <BookOpen size={24} className={styles.autoGen45} />
              <LqText variant="h1" weight="bold">
                Evidence Narrative Workspace
              </LqText>
            </Flex>
            <LqText
              variant="small"
              color="muted"
              weight="bold"
              style={{ textTransform: 'uppercase', marginTop: 'var(--spacing-xs)' }}
            >
              Strategic Logic Orchestration • High-Fidelity Briefing Construction
            </LqText>
          </Stack>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`/api/investigations/${investigationId}/briefing`, '_blank')}
          >
            <Icon name="Download" size="sm" className={styles.mr2} /> Publish Intelligence Briefing
          </Button>
        </Flex>
      </Surface>

      <Box p="xl" className="max-w-6xl mx-auto">
        <Stack gap="xl">
          {/* Editor/Preview Suite */}
          <Surface variant="glass-highlight" className={styles.autoGen46}>
            <Flex className={styles.autoGen47}>
              <Flex justify="between" align="center" p="lg" className={styles.autoGen48}>
                <Flex gap="xs" className={styles.autoGen49}>
                  <Button
                    variant={!previewMode ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewMode(false)}
                  >
                    <Icon name="Edit3" size="xs" className={styles.mr1} /> EDITOR
                  </Button>
                  <Button
                    variant={previewMode ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewMode(true)}
                  >
                    <Icon name="Eye" size="xs" className={styles.mr1} /> PREVIEW
                  </Button>
                </Flex>

                <Flex align="center" gap="md">
                  <Flex align="center" gap="xs">
                    {saveState === 'saving' ? (
                      <Icon name="Loader2" size="xs" className={styles.autoGen50} />
                    ) : (
                      <Icon name="Save" size="xs" className={styles.autoGen51} />
                    )}
                    <LqText variant="xs" color="muted" weight="bold">
                      {saveState === 'saving'
                        ? 'PERSISTING...'
                        : saveState === 'saved'
                          ? `SYNCHRONIZED ${lastSavedAt ? format(new Date(lastSavedAt), 'HH:mm:ss') : ''}`
                          : 'READY'}
                    </LqText>
                  </Flex>
                  {(saveState === 'offline' || saveState === 'error') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={styles.autoGen52}
                      onClick={() => queuePersist(order, notesDraft, annotations)}
                    >
                      RETRY SYNC
                    </Button>
                  )}
                </Flex>
              </Flex>

              {!previewMode && (
                <Flex gap="xs" p="sm" className={styles.autoGen53}>
                  {[
                    { iconName: 'Bold', t: 'Bold', p: '**', s: '**', ph: 'text' },
                    { iconName: 'Italic', t: 'Italic', p: '*', s: '*', ph: 'text' },
                    { iconName: 'Quote', t: 'Quote', p: '> ', s: '', ph: 'quote' },
                    { iconName: 'List', t: 'List', p: '- ', s: '', ph: 'item' },
                    { iconName: 'ListChecks', t: 'Checklist', p: '- [ ] ', s: '', ph: 'task' },
                    { iconName: 'Link2', t: 'Link', p: '[', s: '](https://)', ph: 'url' },
                  ].map((b) => (
                    <Button
                      key={b.t}
                      variant="ghost"
                      size="sm"
                      onClick={() => insertToken(b.p, b.s, b.ph)}
                      title={b.t}
                    >
                      <Icon name={b.iconName} size="xs" />
                    </Button>
                  ))}
                  <Box className={styles.autoGen54} />
                  <LqText variant="xs" color="muted" weight="bold" className="pr-sm">
                    MARKDOWN SUPPORTED
                  </LqText>
                </Flex>
              )}

              <Box className={styles.autoGen55}>
                {!previewMode ? (
                  <Textarea
                    ref={editorRef}
                    value={notesDraft}
                    placeholder="Formulate the mission narrative, correlate strategic claims, and document analytical extraction paths..."
                    onChange={(e) => {
                      setNotesDraft(e.target.value);
                      queuePersist(order, e.target.value, annotations);
                    }}
                  />
                ) : (
                  <Box
                    p="xxl"
                    dangerouslySetInnerHTML={{
                      __html:
                        mdHtml ||
                        '<p style="color: var(--lq-text-dim);">No narrative extracted yet. Initialize the draft in editor mode.</p>',
                    }}
                  />
                )}
              </Box>
            </Flex>
          </Surface>

          {/* Sync Stats */}
          <Grid cols={2} gap="lg">
            <Surface variant="glass" p="lg" className={styles.autoGen56}>
              <Stack gap="md">
                <Flex align="center" gap="md">
                  <Icon name="Database" size="sm" className={styles.autoGen57} />
                  <LqText
                    variant="small"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Evidence Integrity Sync
                  </LqText>
                </Flex>
                <LqText variant="xs" color="muted">
                  Auto-synchronized annotations from the forensic suite appear here in real-time as
                  narrative blocks.
                </LqText>
                <Grid cols={3} gap="sm" style={{ marginTop: 'var(--spacing-sm)' }}>
                  <Stack gap="none">
                    <LqText variant="xs" color="muted">
                      SIGNALS
                    </LqText>
                    <LqText variant="small" weight="bold">
                      {summary?.evidence?.length || 0}
                    </LqText>
                  </Stack>
                  <Stack gap="none">
                    <LqText variant="xs" color="muted">
                      ANNOTATIONS
                    </LqText>
                    <LqText variant="small" weight="bold">
                      {annotations.filter((a) => a.source === 'evidence').length}
                    </LqText>
                  </Stack>
                  <Stack gap="none">
                    <LqText variant="xs" color="muted">
                      MODALITY
                    </LqText>
                    <LqText variant="small" weight="bold">
                      HYBRID
                    </LqText>
                  </Stack>
                </Grid>
              </Stack>
            </Surface>
            <Surface variant="glass" p="lg" className={styles.autoGen58}>
              <Stack gap="md">
                <Flex align="center" gap="md">
                  <Icon name="Activity" size="sm" className={styles.autoGen59} />
                  <LqText
                    variant="small"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Neural State Persistence
                  </LqText>
                </Flex>
                <LqText variant="xs" color="muted">
                  Draft state is locally buffered to prevent data loss during network jitter or
                  offline session shifts.
                </LqText>
                <Box style={{ marginTop: 'var(--spacing-sm)' }}>
                  <Badge variant="success">LOCAL BUFFER ACTIVE</Badge>
                </Box>
              </Stack>
            </Surface>
          </Grid>

          {/* Annotation Stream */}
          <Stack gap="md">
            <Flex align="center" gap="md">
              <Icon name="MessageSquare" size="sm" className={styles.autoGen60} />
              <LqText
                variant="small"
                weight="bold"
                color="muted"
                style={{ textTransform: 'uppercase' }}
              >
                Forensic Annotation Stream
              </LqText>
              <Box className={styles.autoGen61} />
            </Flex>

            {annotations.filter((a) => a.source === 'evidence').length === 0 ? (
              <Surface variant="glass" p="xxxl" className={styles.autoGen62}>
                <Icon name="Sparkles" size="xl" className={styles.autoGen63} />
                <LqText variant="small" color="muted">
                  No evidence signals correlated. Annotate signals in the evidence suite to populate
                  this stream.
                </LqText>
              </Surface>
            ) : (
              <Stack gap="md">
                {annotations
                  .filter((a) => a.source === 'evidence')
                  .map((a) => (
                    <Surface
                      key={a.id}
                      variant="glass-highlight"
                      p="lg"
                      className={styles.autoGen64}
                    >
                      <Flex justify="between" align="start">
                        <Stack gap="sm" className={styles.autoGen65}>
                          <Flex align="center" gap="sm">
                            <Icon name="Activity" size="xs" className={styles.autoGen66} />
                            <LqText variant="small" weight="bold" color="muted">
                              EVIDENCE SIGNAL #{a.evidenceId}
                            </LqText>
                          </Flex>
                          <LqText variant="small" className="whitespace-pre-wrap">
                            {a.content}
                          </LqText>
                          <Flex gap="md" style={{ marginTop: 'var(--spacing-sm)' }}>
                            <Badge variant="glass">{a.type.toUpperCase()}</Badge>
                            <LqText variant="xs" color="muted">
                              SYNCHRONIZED{' '}
                              {a.updatedAt ? format(new Date(a.updatedAt), 'PP') : 'ACTIVE'}
                            </LqText>
                          </Flex>
                        </Stack>
                      </Flex>
                    </Surface>
                  ))}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

// BookOpen component for header
const BookOpen = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);
