import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Flag, Highlighter, MessageSquare, Tag, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

// Design System
import { LqText } from '../../design-system/components/typography/Text';
import { Flex } from '../../design-system/components/layout/Flex';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';

type AnnotationType = 'highlight' | 'note' | 'evidence' | 'question' | 'contradiction' | 'tag';

type PublicDocumentAnnotation = {
  id: string;
  documentId: string;
  type: AnnotationType;
  selectedText: string;
  note: string;
  position: { start: number; end: number };
  contextBefore?: string | null;
  contextAfter?: string | null;
  author?: string;
  createdAt: string;
  updatedAt: string;
};

interface DocumentAnnotationSystemProps {
  documentId: string;
  content: string;
  searchTerm?: string;
  renderHighlightedText?: (text: string, term?: string) => React.ReactNode;
  mode?: 'inline' | 'full';
  onAnnotationCreate?: (annotation: PublicDocumentAnnotation) => void;
}

type PendingSelection = {
  selectedText: string;
  start: number;
  end: number;
  contextBefore: string;
  contextAfter: string;
};

const annotationTypes: Array<{
  type: AnnotationType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  accent?: 'amber' | 'cyan' | 'purple' | 'rose' | 'emerald';
}> = [
  {
    type: 'highlight',
    label: 'Highlight',
    icon: Highlighter,
    className: 'bg-yellow-300/25',
    accent: 'amber',
  },
  { type: 'note', label: 'Note', icon: MessageSquare, className: 'bg-blue-300/25', accent: 'cyan' },
  {
    type: 'evidence',
    label: 'Evidence',
    icon: CheckCircle,
    className: 'bg-emerald-300/25',
    accent: 'emerald',
  },
  {
    type: 'question',
    label: 'Question',
    icon: Flag,
    className: 'bg-fuchsia-300/25',
    accent: 'purple',
  },
  {
    type: 'contradiction',
    label: 'Contradiction',
    icon: XCircle,
    className: 'bg-rose-300/25',
    accent: 'rose',
  },
  { type: 'tag', label: 'Tag', icon: Tag, className: 'bg-cyan-300/25', accent: 'cyan' },
];

const getTypeMeta = (type: AnnotationType) => {
  return annotationTypes.find((entry) => entry.type === type) || annotationTypes[0];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseDateLabel = (iso: string) => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
};

export const DocumentAnnotationSystem: React.FC<DocumentAnnotationSystemProps> = ({
  documentId,
  content,
  searchTerm,
  renderHighlightedText,
  mode = 'inline',
  onAnnotationCreate,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [localAnnotations, setLocalAnnotations] = useState<PublicDocumentAnnotation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [draftType, setDraftType] = useState<AnnotationType>('highlight');
  const [draftNote, setDraftNote] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: fetchedAnnotations = [],
    isLoading,
    error: fetchError,
  } = useQuery<PublicDocumentAnnotation[]>({
    queryKey: ['documentAnnotations', documentId],
    queryFn: () => apiClient.getPublicDocumentAnnotations(documentId),
    staleTime: 30_000,
  });

  const annotations = useMemo(
    () => [...fetchedAnnotations, ...localAnnotations],
    [fetchedAnnotations, localAnnotations],
  );

  const displayError = fetchError instanceof Error ? fetchError.message : loadError;

  const activeAnnotation = useMemo(() => {
    if (!activeAnnotationId) return null;
    return annotations.find((annotation) => annotation.id === activeAnnotationId) || null;
  }, [annotations, activeAnnotationId]);

  useEffect(() => {
    const savedAuthor = localStorage.getItem('public_annotation_author') || '';
    setDraftAuthor(savedAuthor);
  }, []);

  const clearSelectionDraft = () => {
    setPendingSelection(null);
    setDraftNote('');
    window.getSelection()?.removeAllRanges();
  };

  const handleSelection = () => {
    if (!contentRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!contentRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const rawSelection = selection.toString();
    const selectedText = rawSelection.trim();
    if (!selectedText) {
      clearSelectionDraft();
      return;
    }

    const leadingWhitespaceCount = rawSelection.indexOf(selectedText);

    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(contentRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    const start = preSelectionRange.toString().length + Math.max(0, leadingWhitespaceCount);
    const end = start + selectedText.length;
    const safeStart = clamp(start, 0, Math.max(content.length - 1, 0));
    const safeEnd = clamp(end, safeStart + 1, Math.max(content.length, safeStart + 1));

    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current.getBoundingClientRect();
    setMenuPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 16,
    });

    setPendingSelection({
      selectedText,
      start: safeStart,
      end: safeEnd,
      contextBefore: content.slice(Math.max(0, safeStart - 120), safeStart),
      contextAfter: content.slice(safeEnd, Math.min(content.length, safeEnd + 120)),
    });
  };

  const createAnnotation = async () => {
    if (!pendingSelection || isSaving) return;
    setIsSaving(true);
    setLoadError(null);

    try {
      const saved = await apiClient.createPublicDocumentAnnotation(documentId, {
        type: draftType,
        selectedText: pendingSelection.selectedText,
        note: draftNote.trim(),
        start: pendingSelection.start,
        end: pendingSelection.end,
        contextBefore: pendingSelection.contextBefore,
        contextAfter: pendingSelection.contextAfter,
        author: draftAuthor.trim() || undefined,
      });

      if (draftAuthor.trim()) {
        localStorage.setItem('public_annotation_author', draftAuthor.trim());
      }

      setLocalAnnotations((prev) => [...prev, saved]);
      setActiveAnnotationId(saved.id);
      onAnnotationCreate?.(saved);
      clearSelectionDraft();
      setDraftNote('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to save annotation');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSearchHighlighted = useCallback(
    (text: string, keyPrefix: string): React.ReactNode => {
      const term = searchTerm?.trim();
      if (!term) {
        if (renderHighlightedText) return renderHighlightedText(text, searchTerm);
        return text;
      }

      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, idx) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark
            key={`${keyPrefix}-mark-${idx}`}
            className="bg-cyan-300/30 text-cyan-100 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={`${keyPrefix}-text-${idx}`}>{part}</React.Fragment>
        ),
      );
    },
    [renderHighlightedText, searchTerm],
  );

  const renderedContent = useMemo(() => {
    if (!content) return null;

    const normalized = annotations
      .map((annotation) => ({
        ...annotation,
        start: clamp(annotation.position.start, 0, content.length),
        end: clamp(annotation.position.end, 0, content.length),
      }))
      .filter((annotation) => annotation.end > annotation.start)
      .sort((a, b) => a.start - b.start || a.end - b.end);

    const fragments: React.ReactNode[] = [];
    let cursor = 0;

    for (let i = 0; i < normalized.length; i += 1) {
      const annotation = normalized[i];
      if (annotation.start < cursor) continue;

      if (annotation.start > cursor) {
        const plain = content.slice(cursor, annotation.start);
        fragments.push(
          <React.Fragment key={`plain-${cursor}`}>
            {renderSearchHighlighted(plain, `plain-${cursor}`)}
          </React.Fragment>,
        );
      }

      const highlighted = content.slice(annotation.start, annotation.end);
      const isActive = annotation.id === activeAnnotationId;
      const typeMeta = getTypeMeta(annotation.type);

      fragments.push(
        <button
          key={`ann-${annotation.id}`}
          type="button"
          className={`rounded-sm px-0.5 text-left align-baseline transition-colors ${
            typeMeta.className
          } ${isActive ? 'ring-1 ring-cyan-300/80' : 'hover:ring-1 hover:ring-[var(--glass-border)]'}`}
          title={`${typeMeta.label}: ${annotation.note || annotation.selectedText}`}
          onClick={() => setActiveAnnotationId(annotation.id)}
        >
          {renderSearchHighlighted(highlighted, `ann-${annotation.id}`)}
        </button>,
      );

      cursor = annotation.end;
    }

    if (cursor < content.length) {
      const tail = content.slice(cursor);
      fragments.push(
        <React.Fragment key={`plain-tail-${cursor}`}>
          {renderSearchHighlighted(tail, `plain-tail-${cursor}`)}
        </React.Fragment>,
      );
    }

    return fragments;
  }, [annotations, content, activeAnnotationId, renderSearchHighlighted]);

  return (
    <Box className={`relative ${mode === 'full' ? 'h-full flex' : ''}`}>
      <Box className={`${mode === 'full' ? 'flex-1 pr-4' : 'w-full'}`}>
        <Flex align="center" justify="between" className="mb-3">
          <LqText variant="xs" color="muted">
            {annotations.length} annotation{annotations.length === 1 ? '' : 's'}
          </LqText>
          {isLoading && (
            <LqText variant="xs" color="muted">
              Loading…
            </LqText>
          )}
        </Flex>

        <Box
          ref={contentRef}
          className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap select-text min-h-[300px]"
          onMouseUp={handleSelection}
        >
          {renderedContent}
        </Box>

        {displayError && (
          <Surface variant="glass-highlight" className="mt-3 border-rose-400/30 px-3 py-2">
            <LqText variant="xs" color="danger">
              {displayError}
            </LqText>
          </Surface>
        )}

        {mode === 'inline' && (
          <LqText variant="xs" color="muted" className="mt-3">
            Select text to add a public annotation with highlight and optional note.
          </LqText>
        )}

        {pendingSelection && (
          <Surface
            variant="glass-strong"
            className="absolute z-50 w-[340px] p-3 shadow-xl"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <LqText variant="xs" color="muted" className="mb-2 truncate block">
              "{pendingSelection.selectedText}"
            </LqText>
            <Box className="grid grid-cols-3 gap-1 mb-2">
              {annotationTypes.map((option) => {
                const Icon = option.icon;
                const active = draftType === option.type;
                return (
                  <button
                    key={option.type}
                    type="button"
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 justify-center border transition-colors ${
                      active
                        ? 'border-[var(--accent)]/60 bg-[var(--accent)]/10 text-cyan-100'
                        : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]/70'
                    }`}
                    onClick={() => setDraftType(option.type)}
                  >
                    <Icon className="w-3 h-3" />
                    {option.label}
                  </button>
                );
              })}
            </Box>
            <input
              value={draftAuthor}
              onChange={(event) => setDraftAuthor(event.target.value)}
              placeholder="Display name (optional)"
              className="w-full mb-2 px-2 py-1.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              maxLength={32}
            />
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Add note (optional)"
              className="w-full mb-2 px-2 py-1.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              rows={3}
              maxLength={4000}
            />
            <Flex justify="between" gap="sm">
              <button
                type="button"
                onClick={clearSelectionDraft}
                className="px-3 py-1 text-xs rounded border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createAnnotation}
                disabled={isSaving}
                className="px-3 py-1 text-xs rounded border border-[var(--accent)]/60 bg-[var(--accent)]/10 text-cyan-100 hover:bg-[var(--accent)]/20 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving…' : 'Save Annotation'}
              </button>
            </Flex>
          </Surface>
        )}
      </Box>

      {mode === 'full' && (
        <aside className="w-80 bg-[var(--glass-bg)]/70 border-l border-[var(--glass-border)] p-4 overflow-y-auto">
          <Flex align="center" justify="between" className="mb-4">
            <LqText variant="h4" weight="medium">
              Annotations
            </LqText>
            <LqText variant="xs" color="muted">
              {annotations.length} total
            </LqText>
          </Flex>

          <Box className="space-y-3">
            {annotations.map((annotation) => {
              const typeMeta = getTypeMeta(annotation.type);
              const Icon = typeMeta.icon;
              const active = annotation.id === activeAnnotationId;
              return (
                <Surface
                  as="button"
                  key={annotation.id}
                  variant={active ? 'glass-strong' : 'glass-highlight'}
                  accent={active ? typeMeta.accent : undefined}
                  className={`w-full text-left p-3 border transition-all ${
                    active ? 'border-[var(--accent)]/60' : 'opacity-80 hover:opacity-100'
                  }`}
                  onClick={() => setActiveAnnotationId(annotation.id)}
                >
                  <Flex align="center" gap="sm" className="mb-1">
                    <Icon className="w-4 h-4 text-[var(--accent)]" />
                    <LqText variant="small" weight="medium">
                      {typeMeta.label}
                    </LqText>
                  </Flex>
                  <LqText variant="xs" color="secondary" className="mb-2 italic">
                    "{annotation.selectedText}"
                  </LqText>
                  {annotation.note ? (
                    <LqText variant="xs" className="mb-2">
                      {annotation.note}
                    </LqText>
                  ) : null}
                  <Flex justify="between" className="mt-2">
                    <LqText variant="xs" color="muted">
                      {annotation.author || 'anonymous'}
                    </LqText>
                    <LqText variant="xs" color="muted">
                      {parseDateLabel(annotation.createdAt)}
                    </LqText>
                  </Flex>
                </Surface>
              );
            })}

            {annotations.length === 0 && !isLoading && (
              <Box className="text-center py-12">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <LqText variant="small" weight="medium" color="muted">
                  No annotations yet
                </LqText>
                <LqText variant="xs" color="muted" className="mt-1">
                  Select text in the document to annotate it.
                </LqText>
              </Box>
            )}
          </Box>

          {activeAnnotation && (
            <Surface variant="glass-strong" className="mt-6 p-3 bg-[var(--glass-bg-strong)]/40">
              <LqText
                variant="xs"
                weight="bold"
                color="accent"
                className="uppercase tracking-widest mb-2 block"
              >
                Active annotation
              </LqText>
              <LqText variant="small" className="mb-2 font-medium">
                "{activeAnnotation.selectedText}"
              </LqText>
              <LqText variant="xs" color="secondary" className="whitespace-pre-wrap">
                {activeAnnotation.note || 'No note text.'}
              </LqText>
            </Surface>
          )}
        </aside>
      )}
    </Box>
  );
};
