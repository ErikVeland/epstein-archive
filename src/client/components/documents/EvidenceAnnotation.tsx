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
  metadata?: Record<string, any>;
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
  { label: 'Direct Evidence', value: 'direct', icon: CheckCircle, color: 'text-green-400' },
  {
    label: 'Circumstantial',
    value: 'circumstantial',
    icon: AlertTriangle,
    color: 'text-yellow-400',
  },
  { label: 'Corroborating', value: 'corroborating', icon: Flag, color: 'text-[var(--accent)]' },
  { label: 'Contradicting', value: 'contradicting', icon: X, color: 'text-red-400' },
  { label: 'Needs Review', value: 'needs_review', icon: Clock, color: 'text-orange-400' },
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
          setClassificationNotes(existingClassification.metadata?.notes || '');
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
      <div className="fixed inset-0 bg-[var(--glass-bg-strong)] flex items-center justify-center z-50">
        <div className="bg-[var(--glass-bg)] rounded-[var(--radius-xl)] p-8 max-w-md">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-48 bg-[var(--glass-bg-highlight)] rounded mb-4"></div>
            <div className="h-4 w-32 bg-[var(--glass-bg-highlight)] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--glass-bg-strong)] flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--glass-bg)] rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] w-full max-w-3xl max-h-[90vh] flex flex-col border border-[var(--glass-border)]">
        {/* Header */}
        <div className="border-b border-[var(--glass-border)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] truncate">
                {evidenceTitle}
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Annotate and classify this evidence
              </p>
              {evidenceDescription && (
                <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">
                  {evidenceDescription}
                </p>
              )}
            </div>
            <CloseButton
              onClick={onClose}
              size="md"
              label="Close evidence annotation"
              className="bg-transparent hover:bg-[var(--glass-bg-highlight)] border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
            />
          </div>

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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Form */}
              <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Add a Note
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your observations, analysis, or comments..."
                  className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-slate-500 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Note
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {noteAnnotations.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-center py-8">
                    No notes yet. Add your first note above.
                  </p>
                ) : (
                  noteAnnotations.map((note) => (
                    <div
                      key={note.id}
                      className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]"
                    >
                      {editingNote === note.id ? (
                        <div>
                          <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setEditingNote(null)}
                              className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateNoteEdit}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--accent)] text-[var(--text-primary)] rounded hover:bg-blue-700 transition-colors"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[var(--text-primary)] whitespace-pre-wrap">
                            {note.content}
                          </p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--glass-border)]">
                            <span className="text-xs text-[var(--text-muted)]">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                            <div className="flex gap-2">
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
                                className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--glass-bg-highlight)] rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Highlights Tab */}
          {activeTab === 'highlights' && (
            <div className="space-y-4">
              {/* Add Highlight Form */}
              <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Add a Highlight
                </label>
                <textarea
                  value={newHighlight.text}
                  onChange={(e) => setNewHighlight({ ...newHighlight, text: e.target.value })}
                  placeholder="Paste or type the text you want to highlight..."
                  className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-slate-500 focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  rows={2}
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-muted)]">Color:</span>
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewHighlight({ ...newHighlight, color: color.value })}
                        className={`w-6 h-6 rounded ${color.class} ${
                          newHighlight.color === color.value
                            ? 'ring-2 ring-[var(--glass-border)] ring-offset-2 ring-offset-slate-900'
                            : ''
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleAddHighlight}
                    disabled={!newHighlight.text.trim() || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Highlighter className="w-4 h-4" />
                    Add Highlight
                  </button>
                </div>
              </div>

              {/* Highlights List */}
              <div className="space-y-3">
                {highlightAnnotations.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-center py-8">
                    No highlights yet. Add key passages above.
                  </p>
                ) : (
                  highlightAnnotations.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-4 h-4 rounded shrink-0 mt-0.5"
                          style={{ backgroundColor: highlight.color }}
                        />
                        <div className="flex-1">
                          <p
                            className="text-[var(--text-primary)] px-2 py-1 rounded"
                            style={{ backgroundColor: highlight.color + '40' }}
                          >
                            {highlight.content}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-[var(--text-muted)]">
                              {new Date(highlight.createdAt).toLocaleString()}
                            </span>
                            <button
                              onClick={() => deleteAnnotation(highlight.id)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--glass-bg-highlight)] rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              {/* Common Tags */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                  Common Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-[var(--accent)] text-[var(--text-primary)]'
                          : 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'
                      }`}
                    >
                      {selectedTags.includes(tag) && <span className="mr-1">✓</span>}
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Tag */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Add Custom Tag
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                    placeholder="Enter custom tag..."
                    className="flex-1 px-3 py-2 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-slate-500 focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  <button
                    onClick={handleAddCustomTag}
                    disabled={!customTag.trim() || saving}
                    className="px-4 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                    Applied Tags ({selectedTags.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/50 text-[var(--accent)] rounded-full text-sm border border-blue-700"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => handleToggleTag(tag)}
                          className="ml-1 hover:text-[var(--text-primary)]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Classification Tab */}
          {activeTab === 'classification' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                  Evidence Classification
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLASSIFICATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSetClassification(option.value)}
                      className={`flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border transition-colors ${
                        classification === option.value
                          ? 'bg-[var(--glass-bg-highlight)] border-[var(--accent)]'
                          : 'bg-[var(--glass-bg-strong)] border-[var(--glass-border)] hover:bg-[var(--glass-bg)]'
                      }`}
                    >
                      <option.icon className={`w-5 h-5 ${option.color}`} />
                      <span className="text-[var(--text-primary)] font-medium">{option.label}</span>
                      {classification === option.value && (
                        <CheckCircle className="w-5 h-5 text-[var(--accent)] ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Classification Notes */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Classification Notes
                </label>
                <textarea
                  value={classificationNotes}
                  onChange={(e) => setClassificationNotes(e.target.value)}
                  placeholder="Explain why you classified this evidence this way..."
                  className="w-full px-3 py-2 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-slate-500 focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  rows={4}
                />
                {classification && (
                  <div className="flex justify-end mt-3">
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
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Notes
                    </button>
                  </div>
                )}
              </div>

              {/* Current Classification Display */}
              {classificationAnnotation && (
                <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      Current Classification
                    </span>
                  </div>
                  <p className="text-[var(--text-primary)] font-medium">
                    {
                      CLASSIFICATION_OPTIONS.find(
                        (o) => o.value === classificationAnnotation.content,
                      )?.label
                    }
                  </p>
                  {classificationAnnotation.metadata?.notes && (
                    <p className="text-[var(--text-muted)] text-sm mt-2">
                      {classificationAnnotation.metadata.notes}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Last updated: {new Date(classificationAnnotation.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--glass-border)] p-4 flex items-center justify-between">
          <div className="text-sm text-[var(--text-muted)]">
            {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} on this evidence
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
