import React, { useState, useEffect } from 'react';
import Icon, { IconName } from '@client/components/common/Icon';

// Design System
import { LqText } from '@client/design-system/components/typography/Text';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';
import { CloseButton } from '../common/CloseButton';
import { Tabs } from '../common/Tabs';
import styles from './EvidenceAnnotation.module.css';

import { Button, Input, TextArea } from '@client/design-system/lib';

export interface EvidenceAnnotation {
  id: string;
  evidenceId: number;
  type: 'highlight' | 'note' | 'tag' | 'classification';
  content: string;
  color?: string;
  startOffset?: number;
  endOffset?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

interface EvidenceAnnotationPanelProps {
  evidenceId: number;
  evidenceTitle: string;
  evidenceDescription?: string;
  investigationId: string;
  onClose: () => void;
  onAnnotationsChange?: (annotations: EvidenceAnnotation[]) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'var(--highlight-yellow)' },
  { name: 'Green', value: 'var(--highlight-green)' },
  { name: 'Blue', value: 'var(--highlight-blue)' },
  { name: 'Pink', value: 'var(--highlight-pink)' },
  { name: 'Orange', value: 'var(--highlight-orange)' },
];

const CLASSIFICATION_OPTIONS: Array<{
  label: string;
  value: string;
  icon: IconName;
  color: 'emerald' | 'amber' | 'cyan' | 'rose' | 'purple';
}> = [
  { label: 'Direct Evidence', value: 'direct', icon: 'CheckCircle', color: 'emerald' },
  {
    label: 'Circumstantial',
    value: 'circumstantial',
    icon: 'AlertTriangle',
    color: 'amber',
  },
  { label: 'Corroborating', value: 'corroborating', icon: 'Flag', color: 'cyan' },
  { label: 'Contradicting', value: 'contradicting', icon: 'X', color: 'rose' },
  { label: 'Needs Review', value: 'needs_review', icon: 'Clock', color: 'purple' },
];

const COMMON_TAGS = [
  'financial',
  'communication',
  'travel',
  'relationship',
  'timeline',
  'witness',
  'physical',
  'digital',
  'key-evidence',
  'follow-up',
];

const swatchStyle = (color?: string) => ({ backgroundColor: color || 'var(--accent)' });
const highlightTextStyle = (color?: string) => ({
  backgroundColor: `color-mix(in srgb, ${color || 'var(--accent)'} 18%, transparent)`,
});

export const EvidenceAnnotationPanel: React.FC<EvidenceAnnotationPanelProps> = ({
  evidenceId,
  evidenceTitle,
  evidenceDescription,
  investigationId,
  onClose,
  onAnnotationsChange,
}) => {
  const [annotations, setAnnotations] = useState<EvidenceAnnotation[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'highlights' | 'tags' | 'classification'>(
    'notes',
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [newNote, setNewNote] = useState('');
  const [newHighlight, setNewHighlight] = useState({ text: '', color: HIGHLIGHT_COLORS[0].value });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [classification, setClassification] = useState<string>('');
  const [classificationNotes, setClassificationNotes] = useState('');

  // Edit states
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  const emitAnnotationUpdate = (nextAnnotations: EvidenceAnnotation[]) => {
    const event = new CustomEvent('investigation-evidence-annotations-updated', {
      detail: {
        investigationId,
        evidenceId,
        annotations: nextAnnotations,
      },
    });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    loadAnnotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceId, investigationId]);

  const loadAnnotations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(investigationId)}/evidence/${encodeURIComponent(evidenceId)}/annotations`,
      );
      if (response.ok) {
        const data = await response.json();
        const loaded = data.annotations || [];
        setAnnotations(loaded);
        onAnnotationsChange?.(loaded);
        emitAnnotationUpdate(loaded);

        // Load existing tags and classification
        const existingTags = loaded
          .filter((a: EvidenceAnnotation) => a.type === 'tag')
          .map((a: EvidenceAnnotation) => a.content);
        setSelectedTags(existingTags);

        const existingClassification = loaded.find(
          (a: EvidenceAnnotation) => a.type === 'classification',
        );
        if (existingClassification) {
          setClassification(existingClassification.content);
          setClassificationNotes((existingClassification.metadata?.notes as string) || '');
        }
      } else {
        throw new Error(`Failed to load annotations (${response.status})`);
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      setAnnotations([]);
      onAnnotationsChange?.([]);
      emitAnnotationUpdate([]);
    } finally {
      setLoading(false);
    }
  };

  const saveAnnotation = async (
    annotation: Omit<EvidenceAnnotation, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    setSaving(true);

    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(investigationId)}/evidence/${encodeURIComponent(evidenceId)}/annotations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(annotation),
        },
      );

      if (response.ok) {
        const savedAnnotation = await response.json();
        const updated = [...annotations, savedAnnotation];
        setAnnotations(updated);
        onAnnotationsChange?.(updated);
        emitAnnotationUpdate(updated);
      } else {
        throw new Error(`Failed to save annotation (${response.status})`);
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateAnnotation = async (id: string, updates: Partial<EvidenceAnnotation>) => {
    setSaving(true);
    const updatedAnnotations = annotations.map((a) =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a,
    );

    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(investigationId)}/evidence/${encodeURIComponent(evidenceId)}/annotations/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to update annotation (${response.status})`);
      }
      setAnnotations(updatedAnnotations);
      onAnnotationsChange?.(updatedAnnotations);
      emitAnnotationUpdate(updatedAnnotations);
    } catch (_error) {
      // Keep existing state when server update fails.
    }
    setSaving(false);
  };

  const deleteAnnotation = async (id: string) => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/investigations/${encodeURIComponent(investigationId)}/evidence/${encodeURIComponent(evidenceId)}/annotations/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        throw new Error(`Failed to delete annotation (${response.status})`);
      }
      const updated = annotations.filter((a) => a.id !== id);
      setAnnotations(updated);
      onAnnotationsChange?.(updated);
      emitAnnotationUpdate(updated);
    } catch (_error) {
      // Keep existing state when server delete fails.
    }
    setSaving(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    saveAnnotation({
      evidenceId,
      type: 'note',
      content: newNote.trim(),
    });
    setNewNote('');
  };

  const handleAddHighlight = () => {
    if (!newHighlight.text.trim()) return;
    saveAnnotation({
      evidenceId,
      type: 'highlight',
      content: newHighlight.text.trim(),
      color: newHighlight.color,
    });
    setNewHighlight({ text: '', color: HIGHLIGHT_COLORS[0].value });
  };

  const handleToggleTag = (tag: string) => {
    const existingTagAnnotation = annotations.find((a) => a.type === 'tag' && a.content === tag);

    if (existingTagAnnotation) {
      deleteAnnotation(existingTagAnnotation.id);
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      saveAnnotation({
        evidenceId,
        type: 'tag',
        content: tag,
      });
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (!customTag.trim()) return;
    const normalizedTag = customTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!selectedTags.includes(normalizedTag)) {
      handleToggleTag(normalizedTag);
    }
    setCustomTag('');
  };

  const handleSetClassification = (value: string) => {
    const existingClassification = annotations.find((a) => a.type === 'classification');

    if (existingClassification) {
      updateAnnotation(existingClassification.id, {
        content: value,
        metadata: { notes: classificationNotes },
      });
    } else {
      saveAnnotation({
        evidenceId,
        type: 'classification',
        content: value,
        metadata: { notes: classificationNotes },
      });
    }
    setClassification(value);
  };

  const handleUpdateNoteEdit = () => {
    if (!editingNote || !editNoteContent.trim()) return;
    updateAnnotation(editingNote, { content: editNoteContent.trim() });
    setEditingNote(null);
    setEditNoteContent('');
  };

  const noteAnnotations = annotations.filter((a) => a.type === 'note');
  const highlightAnnotations = annotations.filter((a) => a.type === 'highlight');
  const classificationAnnotation = annotations.find((a) => a.type === 'classification');

  if (loading) {
    return (
      <Box className={styles.loadingOverlay}>
        <Surface variant="glass-strong" className={styles.loadingCard}>
          <LqText variant="h4" weight="bold">
            Loading annotations
          </LqText>
          <Box className={styles.spinner} />
        </Surface>
      </Box>
    );
  }

  return (
    <Box className={styles.overlay} onClick={onClose}>
      <Surface variant="glass-strong" className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Box className={styles.header}>
          <Flex align="start" justify="between" gap="md" className={styles.headerMain}>
            <Box className={styles.headerTitleArea}>
              <LqText variant="h3" weight="semibold" className={styles.truncate}>
                {evidenceTitle}
              </LqText>
              <LqText variant="small" color="muted" className={styles.headerSubtitle}>
                Annotate and classify this evidence
              </LqText>
              {evidenceDescription && (
                <LqText variant="xs" color="muted" className={styles.headerDescription}>
                  {evidenceDescription}
                </LqText>
              )}
            </Box>
            <CloseButton
              onClick={onClose}
              size="md"
              label="Close evidence annotation"
              className={styles.closeButton}
            />
          </Flex>

          {/* Tabs */}
          <Tabs
            tabs={[
              {
                key: 'notes',
                label: 'Notes',
                icon: <Icon name="MessageSquare" className={styles.iconTiny} />,
                count: noteAnnotations.length,
              },
              {
                key: 'highlights',
                label: 'Highlights',
                icon: <Icon name="Highlighter" className={styles.iconTiny} />,
                count: highlightAnnotations.length,
              },
              {
                key: 'tags',
                label: 'Tags',
                icon: <Icon name="Tag" className={styles.iconTiny} />,
                count: selectedTags.length,
              },
              {
                key: 'classification',
                label: 'Classification',
                icon: <Icon name="FolderOpen" className={styles.iconTiny} />,
                count: classificationAnnotation ? 1 : 0,
              },
            ]}
            activeTab={activeTab}
            onChange={(key) => {
              if (
                key === 'notes' ||
                key === 'highlights' ||
                key === 'tags' ||
                key === 'classification'
              ) {
                setActiveTab(key);
              }
            }}
            className={styles.tabsOverride}
          />
        </Box>

        {/* Content */}
        <Box className={styles.content}>
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <Flex direction="column" gap="md">
              {/* Add Note Form */}
              <Surface variant="glass-highlight" className={styles.formSection}>
                <LqText variant="xs" weight="medium" color="secondary" className={styles.formLabel}>
                  Add a Note
                </LqText>
                <TextArea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your observations, analysis, or comments..."
                  className={styles.textarea}
                  rows={3}
                />
                <Flex justify="end" className={styles.formActions}>
                  <Button
                    unstyled
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || saving}
                    className={styles.addButton}
                  >
                    <Icon name="Plus" className={styles.iconMicro} />
                    Add Note
                  </Button>
                </Flex>
              </Surface>

              {/* Notes List */}
              <Flex direction="column" gap="sm">
                {noteAnnotations.length === 0 ? (
                  <LqText color="muted" align="center" className={styles.emptyState}>
                    No notes yet. Add your first note above.
                  </LqText>
                ) : (
                  noteAnnotations.map((note) => (
                    <Surface key={note.id} variant="glass-highlight" className={styles.listItem}>
                      {editingNote === note.id ? (
                        <Box>
                          <TextArea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className={styles.textarea}
                            rows={3}
                          />
                          <Box className={styles.editActions}>
                            <Button
                              unstyled
                              onClick={() => setEditingNote(null)}
                              className={styles.cancelTextButton}
                            >
                              Cancel
                            </Button>
                            <Button
                              unstyled
                              onClick={handleUpdateNoteEdit}
                              className={styles.saveButton}
                            >
                              <Icon name="Save" className={styles.iconMicro} />
                              Save
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <LqText variant="body" color="primary" className={styles.noteContent}>
                            {note.content}
                          </LqText>
                          <Flex align="center" justify="between" className={styles.listItemFooter}>
                            <LqText variant="xs" color="muted">
                              <Icon name="Clock" className={styles.timestampIcon} />
                              {new Date(note.createdAt).toLocaleString()}
                            </LqText>
                            <Flex gap="xs" className={styles.itemActions}>
                              <Button
                                unstyled
                                onClick={() => {
                                  setEditingNote(note.id);
                                  setEditNoteContent(note.content);
                                }}
                                className={styles.actionIcon}
                                title="Edit"
                              >
                                <Icon name="Edit3" className={styles.iconTiny} />
                              </Button>
                              <Button
                                unstyled
                                onClick={() => deleteAnnotation(note.id)}
                                className={`${styles.actionIcon} ${styles.deleteIcon}`}
                                title="Delete"
                              >
                                <Icon name="Trash2" className={styles.iconTiny} />
                              </Button>
                            </Flex>
                          </Flex>
                        </>
                      )}
                    </Surface>
                  ))
                )}
              </Flex>
            </Flex>
          )}

          {/* Highlights Tab */}
          {activeTab === 'highlights' && (
            <Flex direction="column" gap="md">
              {/* Add Highlight Form */}
              <Surface variant="glass-highlight" className={styles.formSection}>
                <LqText variant="xs" weight="medium" color="secondary" className={styles.formLabel}>
                  Add a Highlight
                </LqText>
                <TextArea
                  value={newHighlight.text}
                  onChange={(e) => setNewHighlight({ ...newHighlight, text: e.target.value })}
                  placeholder="Paste or type the text you want to highlight..."
                  className={styles.textarea}
                  rows={2}
                />
                <Flex align="center" justify="between" className={styles.formActions}>
                  <Flex align="center" gap="sm" className={styles.colorPicker}>
                    <LqText variant="xs" color="muted">
                      Color:
                    </LqText>
                    {HIGHLIGHT_COLORS.map((color) => (
                      <Button
                        unstyled
                        key={color.value}
                        onClick={() => setNewHighlight({ ...newHighlight, color: color.value })}
                        className={
                          newHighlight.color === color.value
                            ? styles.colorSwatchSelected
                            : styles.colorSwatch
                        }
                        style={swatchStyle(color.value)}
                        title={color.name}
                      />
                    ))}
                  </Flex>
                  <Button
                    unstyled
                    onClick={handleAddHighlight}
                    disabled={!newHighlight.text.trim() || saving}
                    className={styles.addButton}
                  >
                    <Icon name="Highlighter" className={styles.iconMicro} />
                    Add Highlight
                  </Button>
                </Flex>
              </Surface>

              {/* Highlights List */}
              <Flex direction="column" gap="sm">
                {highlightAnnotations.length === 0 ? (
                  <LqText color="muted" align="center" className={styles.emptyState}>
                    No highlights yet. Add key passages above.
                  </LqText>
                ) : (
                  highlightAnnotations.map((highlight) => (
                    <Surface
                      key={highlight.id}
                      variant="glass-highlight"
                      className={styles.listItem}
                    >
                      <Flex align="start" gap="md">
                        <Box className={styles.colorSwatch} style={swatchStyle(highlight.color)} />
                        <Box className={styles.highlightContent}>
                          <LqText
                            variant="body"
                            className={styles.highlightText}
                            style={highlightTextStyle(highlight.color)}
                          >
                            {highlight.content}
                          </LqText>
                          <Box className={styles.listItemFooter}>
                            <LqText variant="xs" color="muted">
                              {new Date(highlight.createdAt).toLocaleString()}
                            </LqText>
                            <Button
                              unstyled
                              onClick={() => deleteAnnotation(highlight.id)}
                              className={`${styles.actionIcon} ${styles.deleteIcon}`}
                              title="Delete"
                            >
                              <Icon name="Trash2" className={styles.iconTiny} />
                            </Button>
                          </Box>
                        </Box>
                      </Flex>
                    </Surface>
                  ))
                )}
              </Flex>
            </Flex>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <Flex direction="column" gap="xl">
              {/* Common Tags */}
              <Box className={styles.tagGroup}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className={styles.tagGroupHeader}
                >
                  Common Tags
                </LqText>
                <Box className={styles.tagList}>
                  {COMMON_TAGS.map((tag) => (
                    <Button
                      unstyled
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      className={
                        selectedTags.includes(tag) ? styles.tagButtonActive : styles.tagButton
                      }
                    >
                      {selectedTags.includes(tag) && (
                        <Icon name="Check" className={styles.tagCheck} />
                      )}
                      {tag}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/* Custom Tag */}
              <Box className={styles.customTagSection}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className={styles.tagGroupHeader}
                >
                  Add Custom Tag
                </LqText>
                <Flex gap="sm">
                  <Input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                    placeholder="Enter custom tag..."
                    className={styles.customTagInput}
                  />
                  <Button
                    unstyled
                    onClick={handleAddCustomTag}
                    disabled={!customTag.trim() || saving}
                    className={styles.addButton}
                  >
                    Add
                  </Button>
                </Flex>
              </Box>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <Box>
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="secondary"
                    className={styles.tagGroupHeader}
                  >
                    Applied Tags ({selectedTags.length})
                  </LqText>
                  <Box className={styles.tagList}>
                    {selectedTags.map((tag) => (
                      <Surface key={tag} variant="glass-highlight" className={styles.appliedTag}>
                        <Icon name="Tag" className={styles.appliedTagIcon} />
                        <LqText
                          variant="xs"
                          weight="medium"
                          color="accent"
                          className={styles.appliedTagText}
                        >
                          {tag}
                        </LqText>
                        <Button
                          unstyled
                          onClick={() => handleToggleTag(tag)}
                          className={styles.tagRemove}
                          aria-label={`Remove tag ${tag}`}
                        >
                          <Icon name="X" className={styles.iconMicro} />
                        </Button>
                      </Surface>
                    ))}
                  </Box>
                </Box>
              )}
            </Flex>
          )}

          {/* Classification Tab */}
          {activeTab === 'classification' && (
            <Flex direction="column" gap="xl">
              <Box>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className={styles.tagGroupHeader}
                >
                  Evidence Classification
                </LqText>
                <Box className={styles.classificationGrid}>
                  {CLASSIFICATION_OPTIONS.map((option) => (
                    <Surface
                      as="button"
                      key={option.value}
                      variant={classification === option.value ? 'glass-strong' : 'glass-highlight'}
                      accent={classification === option.value ? option.color : undefined}
                      onClick={() => handleSetClassification(option.value)}
                      className={
                        classification === option.value
                          ? styles.classificationOptionActive
                          : styles.classificationOption
                      }
                    >
                      <Icon name={option.icon} className={styles.classificationIcon} />
                      <LqText variant="small" weight="medium" className={styles.flex1}>
                        {option.label}
                      </LqText>
                      {classification === option.value && (
                        <Icon name="CheckCircle" className={styles.classificationIcon} />
                      )}
                    </Surface>
                  ))}
                </Box>
              </Box>

              {/* Classification Notes */}
              <Box>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className={styles.tagGroupHeader}
                >
                  Classification Rationale
                </LqText>
                <TextArea
                  value={classificationNotes}
                  onChange={(e) => setClassificationNotes(e.target.value)}
                  placeholder="Explain why you classified this evidence this way..."
                  className={styles.textarea}
                  rows={4}
                />
                {classification && (
                  <Flex justify="end" className={styles.formActions}>
                    <Button
                      unstyled
                      onClick={() => {
                        const existing = annotations.find((a) => a.type === 'classification');
                        if (existing) {
                          updateAnnotation(existing.id, {
                            content: classification,
                            metadata: { notes: classificationNotes },
                          });
                        }
                      }}
                      disabled={saving}
                      className={styles.addButton}
                    >
                      <Icon name="Save" className={styles.iconTiny} />
                      Save Rationale
                    </Button>
                  </Flex>
                )}
              </Box>

              {/* Current Classification Display */}
              {classificationAnnotation && (
                <Surface variant="glass-strong" className={styles.listItem}>
                  <Flex align="center" gap="sm" className={styles.headerMain}>
                    <Icon name="FolderOpen" className={styles.appliedTagIcon} />
                    <LqText variant="xs" weight="bold" className={styles.stateLabel}>
                      Active State
                    </LqText>
                  </Flex>
                  <LqText
                    variant="h4"
                    weight="semibold"
                    color="accent"
                    className={styles.activeStateTitle}
                  >
                    {
                      CLASSIFICATION_OPTIONS.find(
                        (o) => o.value === classificationAnnotation.content,
                      )?.label
                    }
                  </LqText>
                  {!!classificationAnnotation.metadata?.notes && (
                    <LqText variant="small" color="secondary" className={styles.activeStateNote}>
                      {classificationAnnotation.metadata.notes as string}
                    </LqText>
                  )}
                  <LqText
                    variant="xs"
                    color="muted"
                    align="right"
                    className={styles.listItemFooter}
                  >
                    Managed by Intelligence Engine •{' '}
                    {new Date(classificationAnnotation.updatedAt).toLocaleString()}
                  </LqText>
                </Surface>
              )}
            </Flex>
          )}
        </Box>

        {/* Footer */}
        <Box className={styles.listItemFooter}>
          <Flex align="center" justify="between">
            <LqText variant="xs" color="muted">
              {annotations.length} observation{annotations.length !== 1 ? 's' : ''} recorded
            </LqText>
            <Button unstyled onClick={onClose} className={styles.closeButton}>
              Close Panel
            </Button>
          </Flex>
        </Box>
      </Surface>
    </Box>
  );
};
