import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Flag, Highlighter, MessageSquare, Tag, XCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

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
}> = [
  { type: 'highlight', label: 'Highlight', icon: Highlighter, className: 'bg-yellow-300/25' },
  { type: 'note', label: 'Note', icon: MessageSquare, className: 'bg-blue-300/25' },
  { type: 'evidence', label: 'Evidence', icon: CheckCircle, className: 'bg-emerald-300/25' },
  { type: 'question', label: 'Question', icon: Flag, className: 'bg-fuchsia-300/25' },
  { type: 'contradiction', label: 'Contradiction', icon: XCircle, className: 'bg-rose-300/25' },
  { type: 'tag', label: 'Tag', icon: Tag, className: 'bg-cyan-300/25' },
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
  const [annotations, setAnnotations] = useState<PublicDocumentAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [draftType, setDraftType] = useState<AnnotationType>('highlight');
  const [draftNote, setDraftNote] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activeAnnotation = useMemo(() => {
    if (!activeAnnotationId) return null;
    return annotations.find((annotation) => annotation.id === activeAnnotationId) || null;
  }, [annotations, activeAnnotationId]);

  useEffect(() => {
    const savedAuthor = localStorage.getItem('public_annotation_author') || '';
    setDraftAuthor(savedAuthor);
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);

    apiClient
      .getPublicDocumentAnnotations(documentId)
      .then((rows) => {
        if (!mounted) return;
        setAnnotations(rows);
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load annotations');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [documentId]);

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

      setAnnotations((prev) => [...prev, saved]);
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
          } ${isActive ? 'ring-1 ring-cyan-300/80' : 'hover:ring-1 hover:ring-white/30'}`}
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
    <div className={`relative ${mode === 'full' ? 'h-full flex' : ''}`}>
      <div className={`${mode === 'full' ? 'flex-1 pr-4' : 'w-full'}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {annotations.length} annotation{annotations.length === 1 ? '' : 's'}
          </div>
          {isLoading && <div className="text-xs text-slate-400">Loading…</div>}
        </div>

        <div
          ref={contentRef}
          className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap select-text min-h-[300px]"
          onMouseUp={handleSelection}
        >
          {renderedContent}
        </div>

        {loadError && (
          <div className="mt-3 text-xs text-rose-300 bg-rose-900/30 border border-rose-400/30 rounded-md px-3 py-2">
            {loadError}
          </div>
        )}

        {mode === 'inline' && (
          <div className="mt-3 text-xs text-slate-400">
            Select text to add a public annotation with highlight and optional note.
          </div>
        )}

        {pendingSelection && (
          <div
            className="absolute z-50 w-[340px] bg-slate-900 border border-slate-600 rounded-lg shadow-xl p-3"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="text-xs text-slate-400 mb-2 truncate">
              "{pendingSelection.selectedText}"
            </div>
            <div className="grid grid-cols-3 gap-1 mb-2">
              {annotationTypes.map((option) => {
                const Icon = option.icon;
                const active = draftType === option.type;
                return (
                  <button
                    key={option.type}
                    type="button"
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 justify-center border ${
                      active
                        ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-700/70'
                    }`}
                    onClick={() => setDraftType(option.type)}
                  >
                    <Icon className="w-3 h-3" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <input
              value={draftAuthor}
              onChange={(event) => setDraftAuthor(event.target.value)}
              placeholder="Display name (optional)"
              className="w-full mb-2 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              maxLength={32}
            />
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Add note (optional)"
              className="w-full mb-2 px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              rows={3}
              maxLength={4000}
            />
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={clearSelectionDraft}
                className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createAnnotation}
                disabled={isSaving}
                className="px-2 py-1 text-xs rounded border border-cyan-500/60 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save Annotation'}
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === 'full' && (
        <aside className="w-80 bg-slate-800/70 border-l border-slate-600 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Annotations</h3>
            <span className="text-sm text-slate-400">{annotations.length} total</span>
          </div>

          <div className="space-y-3">
            {annotations.map((annotation) => {
              const typeMeta = getTypeMeta(annotation.type);
              const Icon = typeMeta.icon;
              const active = annotation.id === activeAnnotationId;
              return (
                <button
                  key={annotation.id}
                  type="button"
                  className={`w-full text-left rounded-lg p-3 border transition-colors ${
                    active
                      ? 'bg-slate-700 border-cyan-400/60'
                      : 'bg-slate-700/60 border-slate-600 hover:bg-slate-700'
                  }`}
                  onClick={() => setActiveAnnotationId(annotation.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-cyan-300" />
                    <span className="text-sm font-medium text-white">{typeMeta.label}</span>
                  </div>
                  <div className="text-xs text-slate-300 mb-2">"{annotation.selectedText}"</div>
                  {annotation.note ? (
                    <div className="text-xs text-slate-200 mb-2">{annotation.note}</div>
                  ) : null}
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{annotation.author || 'anonymous'}</span>
                    <span>{parseDateLabel(annotation.createdAt)}</span>
                  </div>
                </button>
              );
            })}

            {annotations.length === 0 && !isLoading && (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No annotations yet</p>
                <p className="text-xs mt-1">Select text in the document to annotate it.</p>
              </div>
            )}
          </div>

          {activeAnnotation && (
            <div className="mt-4 p-3 rounded-lg border border-slate-600 bg-slate-900/60">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                Active annotation
              </div>
              <div className="text-sm text-slate-100 mb-2">"{activeAnnotation.selectedText}"</div>
              {activeAnnotation.note ? (
                <div className="text-xs text-slate-300 whitespace-pre-wrap">
                  {activeAnnotation.note}
                </div>
              ) : (
                <div className="text-xs text-slate-500">No note text.</div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
