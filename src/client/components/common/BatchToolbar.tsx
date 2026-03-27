import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Toolbar } from '@design-system';
import Icon from './Icon';

interface BatchToolbarProps {
  selectedCount: number;
  onRotate: (direction: 'left' | 'right') => void;
  onAssignTags: (tags: number[]) => void;
  onAssignPeople: (people: number[]) => void;
  onAssignRating: (rating: number) => void;
  onEditMetadata: (field: string, value: string) => void;
  onSave?: () => void;
  onCancel: () => void;
  onDeselect?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  hasChanges?: boolean;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Person {
  id: number;
  name: string;
  role: string;
  redFlagRating: number;
}

type ToolbarMenu = 'rotate' | 'tags' | 'people' | 'rating' | 'metadata' | null;

const toolbarActionClass =
  'control h-8 min-h-8 px-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]';
const toolbarActionDangerClass = `${toolbarActionClass} tone-danger`;
const menuActionClass =
  'flex w-full items-center gap-2 rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]';
const menuFooterButtonClass =
  'control h-8 min-h-8 px-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]';
const menuFooterPrimaryClass =
  'control h-8 min-h-8 px-4 text-sm font-semibold bg-[var(--accent)] text-[var(--text-primary)] enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[var(--glass-bg-strong)] disabled:text-[var(--text-muted)]';
const menuSectionClass = 'space-y-3 p-3';

export const BatchToolbar: React.FC<BatchToolbarProps> = ({
  selectedCount,
  onRotate,
  onAssignTags,
  onAssignPeople,
  onAssignRating,
  onEditMetadata,
  onSave,
  onCancel,
  onDeselect,
  onUndo,
  canUndo = false,
  hasChanges = false,
}) => {
  const [activeMenu, setActiveMenu] = useState<ToolbarMenu>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [peopleFilter, setPeopleFilter] = useState('');
  const [metadataDraft, setMetadataDraft] = useState({ title: '', description: '' });

  const isMenuOpen = (menu: Exclude<ToolbarMenu, null>) => activeMenu === menu;
  const toggleMenu = (menu: Exclude<ToolbarMenu, null>) => {
    setActiveMenu((current) => (current === menu ? null : menu));
  };
  const closeMenus = () => setActiveMenu(null);

  const { data: tags = [], isLoading: loadingTags } = useQuery<Tag[]>({
    queryKey: ['batch-toolbar-tags'],
    queryFn: async () => {
      const response = await fetch('/api/media/tags');
      const data = await response.json();
      return Array.isArray(data) ? (data as Tag[]) : [];
    },
    enabled: isMenuOpen('tags'),
  });

  const { data: people = [], isLoading: loadingPeople } = useQuery<Person[]>({
    queryKey: ['batch-toolbar-people'],
    queryFn: async () => {
      const response = await fetch('/api/entities?limit=100');
      const data = await response.json();
      const entities = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      return (entities as Record<string, unknown>[]).map((e) => ({
        id: e.id as number,
        name: (e.fullName ?? e.name) as string,
        role: (e.primaryRole ?? e.role ?? 'Unknown') as string,
        redFlagRating: (e.redFlagRating as number) ?? 0,
      }));
    },
    enabled: isMenuOpen('people'),
  });

  const filteredPeople = useMemo(
    () =>
      people.filter(
        (person) =>
          peopleFilter === '' ||
          person.name.toLowerCase().includes(peopleFilter.toLowerCase()) ||
          person.role.toLowerCase().includes(peopleFilter.toLowerCase()),
      ),
    [people, peopleFilter],
  );

  const toggleTagSelection = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const togglePersonSelection = (personId: number) => {
    setSelectedPeople((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId],
    );
  };

  const handleApplyTags = () => {
    onAssignTags(selectedTags);
    closeMenus();
    setSelectedTags([]);
  };

  const handleApplyPeople = () => {
    onAssignPeople(selectedPeople);
    closeMenus();
    setSelectedPeople([]);
  };

  const handleApplyMetadata = () => {
    const normalizedTitle = metadataDraft.title.trim();
    const normalizedDescription = metadataDraft.description.trim();

    if (normalizedTitle) {
      onEditMetadata('title', normalizedTitle);
    }

    if (normalizedDescription) {
      onEditMetadata('description', normalizedDescription);
    }

    closeMenus();
    setMetadataDraft({ title: '', description: '' });
  };

  return (
    <Toolbar>
      {/* Selected count with deselect button */}
      <div className="soft-glass-panel flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-lg)] px-1 py-1">
        <span className="px-2 text-sm font-medium text-[var(--accent)]">
          {selectedCount} selected
        </span>
        {onDeselect && (
          <button
            onClick={onDeselect}
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)]"
            title="Clear selection"
          >
            <Icon name="X" size="sm" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[var(--glass-border)] shrink-0"></div>

      {/* Rotate actions */}
      <div className="relative shrink-0">
        <button onClick={() => toggleMenu('rotate')} className={toolbarActionClass}>
          <Icon name="RotateCw" size="sm" />
          <span className="hidden sm:inline">Rotate</span>
          <Icon name={isMenuOpen('rotate') ? 'ChevronUp' : 'ChevronDown'} size="xs" />
        </button>

        {isMenuOpen('rotate') && (
          <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50">
            <button
              onClick={() => {
                onRotate('left');
                closeMenus();
              }}
              className={menuActionClass}
            >
              <Icon name="RotateCcw" size="sm" />
              Rotate Left
            </button>
            <button
              onClick={() => {
                onRotate('right');
                closeMenus();
              }}
              className={menuActionClass}
            >
              <Icon name="RotateCw" size="sm" />
              Rotate Right
            </button>
          </div>
        )}
      </div>

      {/* Tags action */}
      <div className="relative shrink-0">
        <button onClick={() => toggleMenu('tags')} className={toolbarActionClass}>
          <Icon name="Tag" size="sm" />
          <span className="hidden sm:inline">Tags</span>
          <Icon name={isMenuOpen('tags') ? 'ChevronUp' : 'ChevronDown'} size="xs" />
        </button>

        {isMenuOpen('tags') && (
          <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50 w-80">
            <div className="p-3 border-b border-[var(--glass-border)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Assign Tags</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Select tags to apply to {selectedCount} images
              </p>
              {selectedTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedTags.map((id) => {
                    const tag = tags.find((t) => t.id === id);
                    return tag ? (
                      <span
                        key={id}
                        className="status-chip tone-accent text-[var(--text-primary)]"
                        style={{ backgroundColor: tag.color || 'var(--accent)' }}
                      >
                        {tag.name}
                        <button
                          onClick={() => toggleTagSelection(id)}
                          className="hover:text-[var(--text-primary)]"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <div className="p-2 max-h-60 overflow-y-auto">
              {loadingTags ? (
                <div className="text-center py-4 text-sm text-[var(--text-muted)]">
                  Loading tags...
                </div>
              ) : tags.length === 0 ? (
                <div className="text-center py-4 text-sm text-[var(--text-muted)]">
                  No tags available
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagSelection(tag.id)}
                      className={`flex items-center gap-2 rounded-[var(--radius-lg)] border-2 p-2 text-left text-sm transition-all ${
                        selectedTags.includes(tag.id)
                          ? 'border-[var(--text-primary)] shadow-[var(--glass-shadow)] scale-105'
                          : 'border-transparent hover:border-[var(--glass-border-highlight)]'
                      }`}
                      style={{
                        backgroundColor: selectedTags.includes(tag.id)
                          ? tag.color || 'var(--accent)'
                          : undefined,
                      }}
                    >
                      <div
                        className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--text-primary)]/50"
                        style={{ backgroundColor: tag.color || 'var(--accent)' }}
                      >
                        {selectedTags.includes(tag.id) && (
                          <span className="text-[var(--text-primary)] text-xs">✓</span>
                        )}
                      </div>
                      <span
                        className={`truncate font-medium ${selectedTags.includes(tag.id) ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                      >
                        {tag.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[var(--glass-border)] flex justify-between items-center gap-2">
              <button
                onClick={() => {
                  closeMenus();
                  setSelectedTags([]);
                }}
                className={menuFooterButtonClass}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyTags}
                disabled={selectedTags.length === 0}
                className={menuFooterPrimaryClass}
              >
                <Icon name="Save" size="sm" />
                Save Tags ({selectedTags.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* People action */}
      <div className="relative shrink-0">
        <button onClick={() => toggleMenu('people')} className={toolbarActionClass}>
          <Icon name="User" size="sm" />
          <span className="hidden sm:inline">People</span>
          <Icon name={isMenuOpen('people') ? 'ChevronUp' : 'ChevronDown'} size="xs" />
        </button>

        {isMenuOpen('people') && (
          <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50 w-80">
            <div className="p-3 border-b border-[var(--glass-border)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Assign People</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                Select people to tag in {selectedCount} images
              </p>
              <input
                type="text"
                placeholder="Filter people..."
                value={peopleFilter}
                onChange={(e) => setPeopleFilter(e.target.value)}
                className="control h-9 min-h-9 w-full justify-start px-3 text-sm"
              />
            </div>
            <div className="p-2 max-h-60 overflow-y-auto">
              {loadingPeople ? (
                <div className="text-center py-4 text-sm text-[var(--text-muted)]">
                  Loading people...
                </div>
              ) : people.length === 0 ? (
                <div className="text-center py-4 text-sm text-[var(--text-muted)]">
                  No people available
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPeople.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => togglePersonSelection(person.id)}
                      className={`flex w-full items-center gap-2 rounded-[var(--radius-lg)] p-2 text-left text-sm transition-colors ${
                        selectedPeople.includes(person.id)
                          ? 'soft-glass-accent text-[var(--text-primary)]'
                          : 'soft-glass-panel text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'
                      }`}
                    >
                      <div className="soft-glass-panel flex h-6 w-6 items-center justify-center rounded-full text-xs">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{person.name}</div>
                        <div className="text-xs opacity-75 truncate">{person.role}</div>
                      </div>
                      {person.redFlagRating > 0 && (
                        <span className="status-chip tone-danger">
                          {person.redFlagRating} flagged
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-[var(--glass-border)] flex justify-end gap-2">
              <button
                onClick={() => {
                  closeMenus();
                  setSelectedPeople([]);
                }}
                className={menuFooterButtonClass}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPeople}
                disabled={selectedPeople.length === 0}
                className={menuFooterPrimaryClass}
              >
                <Icon name="Save" size="sm" />
                Save People ({selectedPeople.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rating action */}
      <div className="relative shrink-0">
        <button onClick={() => toggleMenu('rating')} className={toolbarActionClass}>
          <Icon name="Star" size="sm" />
          <span className="hidden sm:inline">Rating</span>
          <Icon name={isMenuOpen('rating') ? 'ChevronUp' : 'ChevronDown'} size="xs" />
        </button>

        {isMenuOpen('rating') && (
          <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50 w-48">
            <div className={menuSectionClass}>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Assign Rating</h3>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      onAssignRating(star);
                      closeMenus();
                    }}
                    className="control h-9 min-h-9 w-9 px-0 tone-warning"
                  >
                    <Icon name="Star" size="sm" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metadata action */}
      <div className="relative shrink-0">
        <button onClick={() => toggleMenu('metadata')} className={toolbarActionClass}>
          <Icon name="Edit3" size="sm" />
          <span className="hidden sm:inline">Edit</span>
          <Icon name={isMenuOpen('metadata') ? 'ChevronUp' : 'ChevronDown'} size="xs" />
        </button>

        {isMenuOpen('metadata') && (
          <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50 w-80">
            <div className="p-3 border-b border-[var(--glass-border)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Edit Metadata</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Apply changes to {selectedCount} images
              </p>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Title</label>
                <input
                  type="text"
                  placeholder="Enter new title"
                  value={metadataDraft.title}
                  onChange={(e) =>
                    setMetadataDraft((current) => ({ ...current, title: e.target.value }))
                  }
                  className="control h-9 min-h-9 w-full justify-start px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Enter new description"
                  rows={3}
                  value={metadataDraft.description}
                  onChange={(e) =>
                    setMetadataDraft((current) => ({
                      ...current,
                      description: e.target.value,
                    }))
                  }
                  className="glass-panel w-full rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            </div>
            <div className="p-2 border-t border-[var(--glass-border)] flex justify-end gap-2">
              <button
                onClick={() => {
                  closeMenus();
                  setMetadataDraft({ title: '', description: '' });
                }}
                className={menuFooterButtonClass}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyMetadata}
                disabled={
                  metadataDraft.title.trim().length === 0 &&
                  metadataDraft.description.trim().length === 0
                }
                className={menuFooterPrimaryClass}
              >
                <Icon name="Save" size="sm" />
                Apply to All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[var(--glass-border)] shrink-0"></div>

      {/* Undo button */}
      {onUndo && (
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`${toolbarActionClass} ${
            canUndo ? 'tone-warning' : 'text-[var(--text-muted)] cursor-not-allowed'
          }`}
          title={canUndo ? 'Undo last action' : 'Nothing to undo'}
        >
          <Icon name="Undo2" size="sm" />
          <span className="hidden sm:inline">Undo</span>
        </button>
      )}

      {/* Save button */}
      {onSave && (
        <button
          onClick={onSave}
          disabled={!hasChanges}
          className={`${menuFooterPrimaryClass} ${!hasChanges ? 'shadow-none' : ''}`}
          title={hasChanges ? 'Save all changes' : 'No changes to save'}
        >
          <Icon name="Save" size="sm" />
          <span className="hidden sm:inline">Save</span>
        </button>
      )}

      {/* Cancel button */}
      <button onClick={onCancel} className={toolbarActionDangerClass}>
        <Icon name="X" size="sm" />
        <span className="hidden sm:inline">Cancel</span>
      </button>
    </Toolbar>
  );
};

export default BatchToolbar;
