import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon, { IconName } from '@client/components/common/Icon';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@client/services/apiClient';
import styles from './DocumentAnnotationSystem.module.css';

// Design System
import { LqText } from '@client/design-system/components/typography/Text';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';

import { Button, Input, TextArea } from '@client/design-system/lib';

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
  icon: IconName;
  styleKey: keyof typeof styles;
  accent?: 'amber' | 'cyan' | 'purple' | 'rose' | 'emerald';
}> = [
  {
    type: 'highlight',
    label: 'Highlight',
    icon: 'Highlighter',
    styleKey: 'type_highlight',
    accent: 'amber',
  },
  {
    type: 'note',
    label: 'Note',
    icon: 'MessageSquare',
    styleKey: 'type_note',
    accent: 'cyan',
  },
  {
    type: 'evidence',
    label: 'Evidence',
    icon: 'CheckCircle',
    styleKey: 'type_evidence',
    accent: 'emerald',
  },
  {
    type: 'question',
    label: 'Question',
    icon: 'Flag',
    styleKey: 'type_question',
    accent: 'purple',
  },
  {
    type: 'contradiction',
    label: 'Contradiction',
    icon: 'XCircle',
    styleKey: 'type_contradiction',
    accent: 'rose',
  },
  {
    type: 'tag',
    label: 'Tag',
    icon: 'Tag',
    styleKey: 'type_tag',
    accent: 'cyan',
  },
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
          <mark key={`${keyPrefix}-mark-${idx}`} className={styles.searchMark}>
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
        <Button
          unstyled
          key={`ann-${annotation.id}`}
          type="button"
          className={`${styles.annotationTrigger} ${styles[typeMeta.styleKey]} ${
            isActive ? styles.annotationTriggerActive : styles.annotationTriggerHover
          }`}
          title={`${typeMeta.label}: ${annotation.note || annotation.selectedText}`}
          onClick={() => setActiveAnnotationId(annotation.id)}
        >
          {renderSearchHighlighted(highlighted, `ann-${annotation.id}`)}
        </Button>,
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
    <Box className={`${styles.root} ${mode === 'full' ? styles.rootFull : ''}`}>
      <Box className={`${mode === 'full' ? styles.mainPanelFull : styles.mainPanel}`}>
        <Flex align="center" justify="between" className={styles.headerRow}>
          <LqText variant="xs" color="muted">
            {annotations.length} annotation{annotations.length === 1 ? '' : 's'}
          </LqText>
          {isLoading && (
            <LqText variant="xs" color="muted">
              Loading…
            </LqText>
          )}
        </Flex>

        <Box ref={contentRef} className={styles.contentBody} onMouseUp={handleSelection}>
          {renderedContent}
        </Box>

        {displayError && (
          <Surface variant="glass-highlight" className={styles.errorSurface}>
            <LqText variant="xs" color="danger">
              {displayError}
            </LqText>
          </Surface>
        )}

        {mode === 'inline' && (
          <LqText variant="xs" color="muted" className={styles.instruction}>
            Select text to add a public annotation with highlight and optional note.
          </LqText>
        )}

        {pendingSelection && (
          <Surface
            variant="glass-strong"
            className={styles.floatingMenu}
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <LqText variant="xs" color="muted" className={styles.selectionPreview}>
              "{pendingSelection.selectedText}"
            </LqText>
            <Box className={styles.typeGrid}>
              {annotationTypes.map((option) => {
                const active = draftType === option.type;
                return (
                  <Button
                    unstyled
                    key={option.type}
                    type="button"
                    className={`${styles.typeOption} ${active ? styles.typeOptionActive : ''}`}
                    onClick={() => setDraftType(option.type)}
                  >
                    <Icon name={option.icon} className={styles.iconMicro} />
                    {option.label}
                  </Button>
                );
              })}
            </Box>
            <Input
              value={draftAuthor}
              onChange={(event) => setDraftAuthor(event.target.value)}
              placeholder="Display name (optional)"
              className={styles.inputField}
              maxLength={32}
            />
            <TextArea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Add note (optional)"
              className={styles.inputField}
              rows={3}
              maxLength={4000}
            />
            <Box className={styles.formFooter}>
              <Button
                unstyled
                type="button"
                onClick={clearSelectionDraft}
                className={styles.secondaryButton}
              >
                Cancel
              </Button>
              <Button
                unstyled
                type="button"
                onClick={createAnnotation}
                disabled={isSaving}
                className={styles.primaryButton}
              >
                {isSaving ? 'Saving…' : 'Save Annotation'}
              </Button>
            </Box>
          </Surface>
        )}
      </Box>

      {mode === 'full' && (
        <aside className={styles.sidebar}>
          <Flex align="center" justify="between" className={styles.sidebarHeader}>
            <LqText variant="h4" weight="medium">
              Annotations
            </LqText>
            <LqText variant="xs" color="muted">
              {annotations.length} total
            </LqText>
          </Flex>

          <Box className={styles.annotationList}>
            {annotations.map((annotation) => {
              const typeMeta = getTypeMeta(annotation.type);
              const active = annotation.id === activeAnnotationId;
              return (
                <Surface
                  as="button"
                  key={annotation.id}
                  variant={active ? 'glass-strong' : 'glass-highlight'}
                  accent={active ? typeMeta.accent : undefined}
                  className={`${styles.annotationCard} ${
                    active ? styles.annotationCardActive : styles.annotationCardInactive
                  }`}
                  onClick={() => setActiveAnnotationId(annotation.id)}
                >
                  <Flex align="center" gap="sm" className={styles.cardHeader}>
                    <Icon name={typeMeta.icon} className={styles.cardHeaderIcon} />
                    <LqText variant="small" weight="medium">
                      {typeMeta.label}
                    </LqText>
                  </Flex>
                  <LqText variant="xs" color="secondary" className={styles.cardSelectedText}>
                    "{annotation.selectedText}"
                  </LqText>
                  {annotation.note ? (
                    <LqText variant="xs" className={styles.cardNote}>
                      {annotation.note}
                    </LqText>
                  ) : null}
                  <Box className={styles.cardFooter}>
                    <LqText variant="xs" color="muted">
                      {annotation.author || 'anonymous'}
                    </LqText>
                    <LqText variant="xs" color="muted">
                      {parseDateLabel(annotation.createdAt)}
                    </LqText>
                  </Box>
                </Surface>
              );
            })}

            {annotations.length === 0 && !isLoading && (
              <Box className={styles.emptyState}>
                <Icon name="MessageSquare" className={styles.emptyIcon} />
                <LqText variant="small" weight="medium" color="muted">
                  No annotations yet
                </LqText>
                <LqText variant="xs" color="muted" className={styles.instruction}>
                  Select text in the document to annotate it.
                </LqText>
              </Box>
            )}
          </Box>

          {activeAnnotation && (
            <Surface variant="glass-strong" className={styles.activeDetail}>
              <LqText
                variant="xs"
                weight="bold"
                color="accent"
                className={styles.activeDetailLabel}
              >
                Active annotation
              </LqText>
              <LqText variant="small" className={styles.activeDetailText}>
                "{activeAnnotation.selectedText}"
              </LqText>
              <LqText variant="xs" color="secondary" className={styles.activeDetailNote}>
                {activeAnnotation.note || 'No note text.'}
              </LqText>
            </Surface>
          )}
        </aside>
      )}
    </Box>
  );
};
