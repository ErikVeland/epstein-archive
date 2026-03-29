import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from './Icon';
import s from './BatchToolbar.module.css';

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
  const [showRotateMenu, setShowRotateMenu] = useState(false);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [showPeopleMenu, setShowPeopleMenu] = useState(false);
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [showMetadataMenu, setShowMetadataMenu] = useState(false);

  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [peopleFilter, setPeopleFilter] = useState('');

  const metadataTitleRef = useRef<HTMLInputElement>(null);
  const metadataDescRef = useRef<HTMLTextAreaElement>(null);

  const { data: tags = [], isLoading: loadingTags } = useQuery<Tag[]>({
    queryKey: ['batch-toolbar-tags'],
    queryFn: async () => {
      const response = await fetch('/api/media/tags');
      const data = await response.json();
      return Array.isArray(data) ? (data as Tag[]) : [];
    },
    enabled: showTagsMenu,
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
    enabled: showPeopleMenu,
  });

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
    setShowTagsMenu(false);
    setSelectedTags([]);
  };

  const handleApplyPeople = () => {
    onAssignPeople(selectedPeople);
    setShowPeopleMenu(false);
    setSelectedPeople([]);
  };

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        {/* Selected count with deselect button */}
        <div className={s.badge}>
          <span className={s.badgeCount}>{selectedCount} selected</span>
          {onDeselect && (
            <button onClick={onDeselect} className={s.deselectBtn} title="Clear selection">
              <Icon name="X" size="sm" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className={s.divider} />

        {/* Rotate actions */}
        <div className={s.menuWrap}>
          <button onClick={() => setShowRotateMenu(!showRotateMenu)} className={s.menuTrigger}>
            <Icon name="RotateCw" size="sm" />
            <span className={s.triggerLabel}>Rotate</span>
          </button>

          {showRotateMenu && (
            <div className={`${s.dropdown} dropdown-surface`}>
              <button
                onClick={() => {
                  onRotate('left');
                  setShowRotateMenu(false);
                }}
                className={s.menuTrigger}
              >
                <Icon name="RotateCcw" size="sm" />
                Rotate Left
              </button>
              <button
                onClick={() => {
                  onRotate('right');
                  setShowRotateMenu(false);
                }}
                className={s.menuTrigger}
              >
                <Icon name="RotateCw" size="sm" />
                Rotate Right
              </button>
            </div>
          )}
        </div>

        {/* Tags action */}
        <div className={s.menuWrap}>
          <button onClick={() => setShowTagsMenu(!showTagsMenu)} className={s.menuTrigger}>
            <Icon name="Tag" size="sm" />
            <span className={s.triggerLabel}>Tags</span>
          </button>

          {showTagsMenu && (
            <div className={`${s.dropdown} ${s.dropdownWide} dropdown-surface`}>
              <div className={s.dropdownHeader}>
                <h3 className={s.dropdownTitle}>Assign Tags</h3>
                <p className={s.dropdownSubtitle}>Select tags to apply to {selectedCount} images</p>
                {selectedTags.length > 0 && (
                  <div className={s.selectedTagsBar}>
                    {selectedTags.map((id) => {
                      const tag = tags.find((t) => t.id === id);
                      return tag ? (
                        <span
                          key={id}
                          className={s.tagPill}
                          style={{ backgroundColor: tag.color || '#06b6d4' }}
                        >
                          {tag.name}
                          <button
                            onClick={() => toggleTagSelection(id)}
                            className={s.tagPillRemove}
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div className={s.dropdownBody}>
                {loadingTags ? (
                  <div className={s.emptyMsg}>Loading tags...</div>
                ) : tags.length === 0 ? (
                  <div className={s.emptyMsg}>No tags available</div>
                ) : (
                  <div className={s.tagsGrid}>
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTagSelection(tag.id)}
                        className={`${s.tagOption} ${selectedTags.includes(tag.id) ? s.tagOptionSelected : ''}`}
                        style={{
                          backgroundColor: selectedTags.includes(tag.id)
                            ? tag.color || '#06b6d4'
                            : `${tag.color}40` || '#06b6d440',
                        }}
                      >
                        <div className={s.tagDot} style={{ backgroundColor: tag.color }}>
                          {selectedTags.includes(tag.id) && (
                            <span className={s.tagDotCheck}>✓</span>
                          )}
                        </div>
                        <span
                          className={`${s.tagName} ${selectedTags.includes(tag.id) ? s.tagNameSelected : s.tagNameUnselected}`}
                        >
                          {tag.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={s.dropdownFooter}>
                <button
                  onClick={() => {
                    setShowTagsMenu(false);
                    setSelectedTags([]);
                  }}
                  className={s.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyTags}
                  disabled={selectedTags.length === 0}
                  className={selectedTags.length === 0 ? s.applyBtnInactive : s.applyBtnActive}
                >
                  💾 Save Tags ({selectedTags.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* People action */}
        <div className={s.menuWrap}>
          <button onClick={() => setShowPeopleMenu(!showPeopleMenu)} className={s.menuTrigger}>
            <Icon name="User" size="sm" />
            <span className={s.triggerLabel}>People</span>
          </button>

          {showPeopleMenu && (
            <div className={`${s.dropdown} ${s.dropdownWide} dropdown-surface`}>
              <div className={s.dropdownHeader}>
                <h3 className={s.dropdownTitle}>Assign People</h3>
                <p className={s.dropdownSubtitle}>Select people to tag in {selectedCount} images</p>
                <input
                  type="text"
                  placeholder="Filter people..."
                  value={peopleFilter}
                  onChange={(e) => setPeopleFilter(e.target.value)}
                  className={s.filterInput}
                />
              </div>
              <div className={s.dropdownBody}>
                {loadingPeople ? (
                  <div className={s.emptyMsg}>Loading people...</div>
                ) : people.length === 0 ? (
                  <div className={s.emptyMsg}>No people available</div>
                ) : (
                  <div className={s.peopleList}>
                    {people
                      .filter(
                        (person) =>
                          peopleFilter === '' ||
                          person.name.toLowerCase().includes(peopleFilter.toLowerCase()) ||
                          person.role.toLowerCase().includes(peopleFilter.toLowerCase()),
                      )
                      .map((person) => (
                        <button
                          key={person.id}
                          onClick={() => togglePersonSelection(person.id)}
                          className={`${s.personRow} ${selectedPeople.includes(person.id) ? s.personRowSelected : s.personRowUnselected}`}
                        >
                          <div className={s.personAvatar}>
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div className={s.personInfo}>
                            <div className={s.personName}>{person.name}</div>
                            <div className={s.personRole}>{person.role}</div>
                          </div>
                          <div className={s.personFlags}>
                            {person.redFlagRating > 0 && '🚩'.repeat(person.redFlagRating)}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className={s.dropdownFooterEnd}>
                <button
                  onClick={() => {
                    setShowPeopleMenu(false);
                    setSelectedPeople([]);
                  }}
                  className={s.cancelBtnSm}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyPeople}
                  disabled={selectedPeople.length === 0}
                  className={
                    selectedPeople.length === 0 ? s.applyBtnSmInactive : s.applyBtnSmActive
                  }
                >
                  💾 Save People ({selectedPeople.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rating action */}
        <div className={s.menuWrap}>
          <button onClick={() => setShowRatingMenu(!showRatingMenu)} className={s.menuTrigger}>
            <Icon name="Star" size="sm" />
            <span className={s.triggerLabel}>Rating</span>
          </button>

          {showRatingMenu && (
            <div className={`${s.dropdown} ${s.dropdownNarrow} dropdown-surface`}>
              <div className={s.dropdownPad}>
                <h3 className={s.dropdownTitle}>Assign Rating</h3>
                <div className={s.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        onAssignRating(star);
                        setShowRatingMenu(false);
                      }}
                      className={s.starBtn}
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
        <div className={s.menuWrap}>
          <button onClick={() => setShowMetadataMenu(!showMetadataMenu)} className={s.menuTrigger}>
            <Icon name="Edit3" size="sm" />
            <span className={s.triggerLabel}>Edit</span>
          </button>

          {showMetadataMenu && (
            <div className={`${s.dropdown} ${s.dropdownWide} dropdown-surface`}>
              <div className={s.dropdownHeader}>
                <h3 className={s.dropdownTitle}>Edit Metadata</h3>
                <p className={s.dropdownSubtitle}>Apply changes to {selectedCount} images</p>
              </div>
              <div className={s.metaBody}>
                <div>
                  <label className={s.fieldLabel}>Title</label>
                  <input
                    ref={metadataTitleRef}
                    type="text"
                    placeholder="Enter new title"
                    className={s.textInput}
                  />
                </div>
                <div>
                  <label className={s.fieldLabel}>Description</label>
                  <textarea
                    ref={metadataDescRef}
                    placeholder="Enter new description"
                    rows={3}
                    className={s.textareaInput}
                  />
                </div>
              </div>
              <div className={s.dropdownFooterEnd}>
                <button onClick={() => setShowMetadataMenu(false)} className={s.cancelBtnSm}>
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const titleVal = metadataTitleRef.current?.value;
                    const descVal = metadataDescRef.current?.value;
                    if (titleVal) onEditMetadata('title', titleVal);
                    if (descVal) onEditMetadata('description', descVal);
                    setShowMetadataMenu(false);
                  }}
                  className={s.applyBtnSmActive}
                >
                  Apply to All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={s.divider} />

        {/* Undo button */}
        {onUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={canUndo ? s.undoBtnActive : s.undoBtnDisabled}
            title={canUndo ? 'Undo last action' : 'Nothing to undo'}
          >
            <Icon name="Undo2" size="sm" />
            <span className={s.triggerLabel}>Undo</span>
          </button>
        )}

        {/* Save button */}
        {onSave && (
          <button
            onClick={onSave}
            disabled={!hasChanges}
            className={hasChanges ? s.saveBtnActive : s.saveBtnDisabled}
            title={hasChanges ? 'Save all changes' : 'No changes to save'}
          >
            <Icon name="Save" size="sm" />
            <span className={s.triggerLabel}>Save</span>
          </button>
        )}

        {/* Cancel button */}
        <button onClick={onCancel} className={s.cancelActionBtn}>
          <Icon name="X" size="sm" />
          <span className={s.triggerLabel}>Cancel</span>
        </button>
      </div>
    </div>
  );
};

export default BatchToolbar;
