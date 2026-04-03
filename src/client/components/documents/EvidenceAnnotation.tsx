import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Tag,
  Highlighter,
  FolderOpen,
  Plus,
  Save,
  Trash2,
  Edit3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flag,
} from 'lucide-react';

// Design System
import { Surface, Box, Flex, LqText } from '../../design-system/lib';
import { CloseButton } from '../common/CloseButton';
import { Tabs } from '../common/Tabs';

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
  { name: 'Yellow', value: '#fef08a', class: 'bg-yellow-200' },
  { name: 'Green', value: '#bbf7d0', class: 'bg-green-200' },
  { name: 'Blue', value: '#bfdbfe', class: 'bg-blue-200' },
  { name: 'Pink', value: '#fbcfe8', class: 'bg-pink-200' },
  { name: 'Orange', value: '#fed7aa', class: 'bg-orange-200' },
];

const CLASSIFICATION_OPTIONS = [
  { label: 'Direct Evidence', value: 'direct', icon: CheckCircle, color: 'emerald' as const },
  {
    label: 'Circumstantial',
    value: 'circumstantial',
    icon: AlertTriangle,
    color: 'amber' as const,
  },
  { label: 'Corroborating', value: 'corroborating', icon: Flag, color: 'cyan' as const },
  { label: 'Contradicting', value: 'contradicting', icon: X, color: 'rose' as const },
  { label: 'Needs Review', value: 'needs_review', icon: Clock, color: 'purple' as const },
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
        `/api/investigations/${investigationId}/evidence/${evidenceId}/annotations`,
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
        `/api/investigations/${investigationId}/evidence/${evidenceId}/annotations`,
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
        `/api/investigations/${investigationId}/evidence/${evidenceId}/annotations/${id}`,
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
        `/api/investigations/${investigationId}/evidence/${evidenceId}/annotations/${id}`,
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
      <Box className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center bg-black/40">
        <Surface variant="glass-strong" className="p-8 flex flex-col items-center gap-4">
          <LqText variant="h4" weight="bold">
            Loading annotations
          </LqText>
          <Box className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </Surface>
      </Box>
    );
  }

  return (
    <Box
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 bg-black/40"
      onClick={onClose}
    >
      <Surface
        variant="glass-strong"
        className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box className="border-b border-[var(--glass-border)] p-6">
          <Flex align="start" justify="between" gap="md" className="mb-4">
            <Box className="flex-1 min-w-0">
              <LqText variant="h3" weight="semibold" className="truncate">
                {evidenceTitle}
              </LqText>
              <LqText variant="small" color="muted" className="mt-1">
                Annotate and classify this evidence
              </LqText>
              {evidenceDescription && (
                <LqText variant="xs" color="muted" className="mt-2 line-clamp-2">
                  {evidenceDescription}
                </LqText>
              )}
            </Box>
            <CloseButton
              onClick={onClose}
              size="md"
              label="Close evidence annotation"
              className="bg-transparent hover:bg-[var(--glass-bg-highlight)] border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
            />
          </Flex>

          {/* Tabs */}
          <Tabs
            tabs={[
              {
                key: 'notes',
                label: 'Notes',
                icon: <MessageSquare className="w-4 h-4" />,
                count: noteAnnotations.length,
              },
              {
                key: 'highlights',
                label: 'Highlights',
                icon: <Highlighter className="w-4 h-4" />,
                count: highlightAnnotations.length,
              },
              {
                key: 'tags',
                label: 'Tags',
                icon: <Tag className="w-4 h-4" />,
                count: selectedTags.length,
              },
              {
                key: 'classification',
                label: 'Classification',
                icon: <FolderOpen className="w-4 h-4" />,
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
            className="!bg-transparent !border-none !px-0"
          />
        </Box>

        {/* Content */}
        <Box className="flex-1 overflow-y-auto p-6 scrollbar-premium">
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <Box className="space-y-4">
              {/* Add Note Form */}
              <Surface
                variant="glass-highlight"
                className="p-4 border border-[var(--glass-border)]"
              >
                <LqText
                  variant="xs"
                  weight="medium"
                  color="secondary"
                  className="mb-2 block uppercase tracking-wider"
                >
                  Add a Note
                </LqText>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your observations, analysis, or comments..."
                  className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  rows={3}
                />
                <Flex justify="end" className="mt-3">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-[10px] rounded-[var(--radius-lg)] hover:bg-[var(--accent)]/90 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Note
                  </button>
                </Flex>
              </Surface>

              {/* Notes List */}
              <Box className="space-y-3">
                {noteAnnotations.length === 0 ? (
                  <LqText color="muted" align="center" className="py-8 block">
                    No notes yet. Add your first note above.
                  </LqText>
                ) : (
                  noteAnnotations.map((note) => (
                    <Surface
                      key={note.id}
                      variant="glass-highlight"
                      className="p-4 border border-[var(--glass-border)]"
                    >
                      {editingNote === note.id ? (
                        <Box>
                          <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                            rows={3}
                          />
                          <Flex justify="end" gap="sm" className="mt-2">
                            <button
                              onClick={() => setEditingNote(null)}
                              className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateNoteEdit}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--accent)] text-black font-bold rounded transition-colors"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                          </Flex>
                        </Box>
                      ) : (
                        <>
                          <LqText variant="body" color="primary" className="whitespace-pre-wrap">
                            {note.content}
                          </LqText>
                          <Flex
                            align="center"
                            justify="between"
                            className="mt-3 pt-3 border-t border-[var(--glass-border)]"
                          >
                            <LqText variant="xs" color="muted">
                              <Clock className="w-3 h-3 inline mr-1 opacity-60" />
                              {new Date(note.createdAt).toLocaleString()}
                            </LqText>
                            <Flex gap="xs">
                              <button
                                onClick={() => {
                                  setEditingNote(note.id);
                                  setEditNoteContent(note.content);
                                }}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteAnnotation(note.id)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--glass-bg-highlight)] rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Flex>
                          </Flex>
                        </>
                      )}
                    </Surface>
                  ))
                )}
              </Box>
            </Box>
          )}

          {/* Highlights Tab */}
          {activeTab === 'highlights' && (
            <Box className="space-y-4">
              {/* Add Highlight Form */}
              <Surface
                variant="glass-highlight"
                className="p-4 border border-[var(--glass-border)]"
              >
                <LqText
                  variant="xs"
                  weight="medium"
                  color="secondary"
                  className="mb-2 block uppercase tracking-wider"
                >
                  Add a Highlight
                </LqText>
                <textarea
                  value={newHighlight.text}
                  onChange={(e) => setNewHighlight({ ...newHighlight, text: e.target.value })}
                  placeholder="Paste or type the text you want to highlight..."
                  className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  rows={2}
                />
                <Flex align="center" justify="between" className="mt-4">
                  <Flex align="center" gap="sm">
                    <LqText variant="xs" color="muted">
                      Color:
                    </LqText>
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewHighlight({ ...newHighlight, color: color.value })}
                        className={`w-6 h-6 rounded border border-white/10 transition-transform hover:scale-110 ${color.class} ${
                          newHighlight.color === color.value
                            ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-black/50'
                            : ''
                        }`}
                        title={color.name}
                      />
                    ))}
                  </Flex>
                  <button
                    onClick={handleAddHighlight}
                    disabled={!newHighlight.text.trim() || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-[10px] rounded-[var(--radius-lg)] hover:bg-[var(--accent)]/90 disabled:opacity-50 transition-colors"
                  >
                    <Highlighter className="w-3 h-3" />
                    Add Highlight
                  </button>
                </Flex>
              </Surface>

              {/* Highlights List */}
              <Box className="space-y-3">
                {highlightAnnotations.length === 0 ? (
                  <LqText color="muted" align="center" className="py-8 block">
                    No highlights yet. Add key passages above.
                  </LqText>
                ) : (
                  highlightAnnotations.map((highlight) => (
                    <Surface
                      key={highlight.id}
                      variant="glass-highlight"
                      className="p-4 border border-[var(--glass-border)]"
                    >
                      <Flex align="start" gap="md">
                        <Box
                          className="w-4 h-4 rounded shrink-0 mt-1 border border-white/10"
                          style={{ backgroundColor: highlight.color }}
                        />
                        <Box className="flex-1">
                          <LqText
                            variant="body"
                            className="px-2 py-1 rounded inline-block"
                            style={{ backgroundColor: highlight.color + '30' }}
                          >
                            {highlight.content}
                          </LqText>
                          <Flex align="center" justify="between" className="mt-3">
                            <LqText variant="xs" color="muted">
                              {new Date(highlight.createdAt).toLocaleString()}
                            </LqText>
                            <button
                              onClick={() => deleteAnnotation(highlight.id)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--glass-bg-highlight)] rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Flex>
                        </Box>
                      </Flex>
                    </Surface>
                  ))
                )}
              </Box>
            </Box>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <Box className="space-y-8">
              {/* Common Tags */}
              <Box>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className="mb-4 block uppercase tracking-widest"
                >
                  Common Tags
                </LqText>
                <Flex wrap="wrap" gap="sm">
                  {COMMON_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border ${
                        selectedTags.includes(tag)
                          ? 'bg-[var(--accent)]/20 border-[var(--accent)]/60 text-[var(--accent)]'
                          : 'bg-[var(--glass-bg-highlight)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
                      }`}
                    >
                      {selectedTags.includes(tag) && <span className="mr-1.5 opacity-80">✓</span>}
                      {tag}
                    </button>
                  ))}
                </Flex>
              </Box>

              {/* Custom Tag */}
              <Box>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className="mb-3 block uppercase tracking-widest"
                >
                  Add Custom Tag
                </LqText>
                <Flex gap="sm">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                    placeholder="Enter custom tag..."
                    className="flex-1 px-4 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-sm text-[var(--text-primary)] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                  <button
                    onClick={handleAddCustomTag}
                    disabled={!customTag.trim() || saving}
                    className="px-6 py-2 bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-[10px] rounded-[var(--radius-lg)] hover:bg-[var(--accent)]/90 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </Flex>
              </Box>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <Box>
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="secondary"
                    className="mb-4 block uppercase tracking-widest"
                  >
                    Applied Tags ({selectedTags.length})
                  </LqText>
                  <Flex wrap="wrap" gap="sm">
                    {selectedTags.map((tag) => (
                      <Surface
                        key={tag}
                        variant="glass-highlight"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30"
                      >
                        <Tag className="w-3 h-3 text-[var(--accent)] opacity-80" />
                        <LqText
                          variant="xs"
                          weight="medium"
                          color="accent"
                          className="tracking-wide"
                        >
                          {tag}
                        </LqText>
                        <button
                          onClick={() => handleToggleTag(tag)}
                          className="ml-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Surface>
                    ))}
                  </Flex>
                </Box>
              )}
            </Box>
          )}

          {/* Classification Tab */}
          {activeTab === 'classification' && (
            <Box className="space-y-8">
              <Box>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className="mb-4 block uppercase tracking-widest"
                >
                  Evidence Classification
                </LqText>
                <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLASSIFICATION_OPTIONS.map((option) => (
                    <Surface
                      as="button"
                      key={option.value}
                      variant={classification === option.value ? 'glass-strong' : 'glass-highlight'}
                      accent={classification === option.value ? option.color : undefined}
                      onClick={() => handleSetClassification(option.value)}
                      className={`flex items-center gap-4 p-4 border text-left transition-all ${
                        classification === option.value
                          ? 'border-[var(--accent)]/60'
                          : 'opacity-80 hover:opacity-100 hover:border-[var(--glass-border)]'
                      }`}
                    >
                      <option.icon className="w-5 h-5 text-[var(--accent)]" />
                      <LqText variant="small" weight="medium" className="flex-1">
                        {option.label}
                      </LqText>
                      {classification === option.value && (
                        <CheckCircle className="w-5 h-5 text-[var(--accent)]" />
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
                  className="mb-3 block uppercase tracking-widest"
                >
                  Classification Rationale
                </LqText>
                <textarea
                  value={classificationNotes}
                  onChange={(e) => setClassificationNotes(e.target.value)}
                  placeholder="Explain why you classified this evidence this way..."
                  className="w-full px-4 py-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-sm text-[var(--text-primary)] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  rows={4}
                />
                {classification && (
                  <Flex justify="end" className="mt-3">
                    <button
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
                      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-[10px] rounded-[var(--radius-lg)] hover:bg-[var(--accent)]/90 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Rationale
                    </button>
                  </Flex>
                )}
              </Box>

              {/* Current Classification Display */}
              {classificationAnnotation && (
                <Surface
                  variant="glass-strong"
                  className="p-5 border border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/40"
                >
                  <Flex align="center" gap="sm" className="mb-3 opacity-60">
                    <FolderOpen className="w-4 h-4 text-[var(--accent)]" />
                    <LqText variant="xs" weight="bold" className="uppercase tracking-widest">
                      Active State
                    </LqText>
                  </Flex>
                  <LqText variant="h4" weight="semibold" color="accent" className="mb-2">
                    {
                      CLASSIFICATION_OPTIONS.find(
                        (o) => o.value === classificationAnnotation.content,
                      )?.label
                    }
                  </LqText>
                  {!!classificationAnnotation.metadata?.notes && (
                    <LqText variant="small" color="secondary" className="mb-4 block italic">
                      {classificationAnnotation.metadata.notes as string}
                    </LqText>
                  )}
                  <LqText
                    variant="xs"
                    color="muted"
                    align="right"
                    className="block pt-3 border-t border-[var(--glass-border)]"
                  >
                    Managed by Intelligence Engine •{' '}
                    {new Date(classificationAnnotation.updatedAt).toLocaleString()}
                  </LqText>
                </Surface>
              )}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box className="border-t border-[var(--glass-border)] p-4">
          <Flex align="center" justify="between">
            <LqText variant="xs" color="muted">
              {annotations.length} observation{annotations.length !== 1 ? 's' : ''} recorded
            </LqText>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] font-semibold text-xs rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]/15 transition-colors"
            >
              Close Panel
            </button>
          </Flex>
        </Box>
      </Surface>
    </Box>
  );
};
