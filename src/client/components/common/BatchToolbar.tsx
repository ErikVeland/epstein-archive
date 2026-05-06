import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, TextInput, Textarea } from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import Icon from './Icon';
import s from './BatchToolbar.module.css';

interface BatchToolbarProps {
  selectedCount: number;
  loadedCount?: number;
  isBusy?: boolean;
  onRotate: (direction: 'left' | 'right') => void;
  onAssignTags: (tags: number[], action: 'add' | 'remove') => void;
  onAssignPeople: (people: number[], action: 'add' | 'remove') => void;
  onAssignRating: (rating: number) => void;
  onEditMetadata: (field: string, value: string) => void;
  onSave?: () => void;
  onCancel: () => void;
  onDeselect?: () => void;
  onSelectLoaded?: () => void;
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
  loadedCount = 0,
  isBusy = false,
  onRotate,
  onAssignTags,
  onAssignPeople,
  onAssignRating,
  onEditMetadata,
  onSave,
  onCancel,
  onDeselect,
  onSelectLoaded,
  onUndo,
  canUndo = false,
  hasChanges = false,
}) => {
  const fallbackTagColor = 'var(--accent-info)';
  const [showRotateMenu, setShowRotateMenu] = useState(false);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [showPeopleMenu, setShowPeopleMenu] = useState(false);
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [showMetadataMenu, setShowMetadataMenu] = useState(false);

  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [tagAction, setTagAction] = useState<'add' | 'remove'>('add');
  const [peopleAction, setPeopleAction] = useState<'add' | 'remove'>('add');
  const [peopleFilter, setPeopleFilter] = useState('');

  const metadataTitleRef = useRef<HTMLInputElement>(null);
  const metadataDescRef = useRef<HTMLTextAreaElement>(null);

  const { data: tags = [], isLoading: loadingTags } = useQuery<Tag[]>({
    queryKey: ['batch-toolbar-tags'],
    queryFn: async () => {
      const data = await apiClient.getMediaTags();
      return Array.isArray(data)
        ? data.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: (tag as Partial<Tag>).color || fallbackTagColor,
          }))
        : [];
    },
    enabled: showTagsMenu,
  });

  const { data: people = [], isLoading: loadingPeople } = useQuery<Person[]>({
    queryKey: ['batch-toolbar-people', peopleFilter],
    queryFn: async () => {
      const trimmed = peopleFilter.trim();
      const endpoint =
        trimmed.length > 0
          ? `/entities?search=${encodeURIComponent(trimmed)}&limit=25`
          : '/entities?limit=25';
      const data = await apiClient.get<
        { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
      >(endpoint);
      const entities = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      return (entities as Record<string, unknown>[]).map((e) => ({
        id: Number(e.id),
        name: String(e.fullName ?? e.name ?? `Entity ${e.id}`),
        role: String(e.primaryRole ?? e.role ?? 'Unknown'),
        redFlagRating: Number(e.redFlagRating ?? 0),
      }));
    },
    enabled: showPeopleMenu,
    staleTime: 20_000,
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
    onAssignTags(selectedTags, tagAction);
    setShowTagsMenu(false);
    setSelectedTags([]);
  };

  const handleApplyPeople = () => {
    onAssignPeople(selectedPeople, peopleAction);
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
            <Button
              type="button"
              onClick={onDeselect}
              variant="ghost"
              size="sm"
              className={s.deselectBtn}
              title="Clear selection"
            >
              <Icon name="X" size="sm" />
            </Button>
          )}
        </div>

        {onSelectLoaded && (
          <Button
            type="button"
            onClick={onSelectLoaded}
            variant="ghost"
            size="sm"
            className={s.menuTrigger}
            disabled={isBusy || loadedCount === 0}
            title={`Select ${loadedCount} loaded images`}
          >
            <Icon name="CheckSquare" size="sm" />
            <span className={s.triggerLabel}>Select loaded</span>
          </Button>
        )}

        {/* Divider */}
        <div className={s.divider} />

        {/* Rotate actions */}
        <div className={s.menuWrap}>
          <Button
            type="button"
            onClick={() => setShowRotateMenu(!showRotateMenu)}
            variant="ghost"
            size="sm"
            className={s.menuTrigger}
            disabled={isBusy || selectedCount === 0}
          >
            <Icon name="RotateCw" size="sm" />
            <span className={s.triggerLabel}>Rotate</span>
          </Button>

          {showRotateMenu && (
            <div className={`${s.dropdown} dropdown-surface`}>
              <Button
                type="button"
                onClick={() => {
                  onRotate('left');
                  setShowRotateMenu(false);
                }}
                variant="ghost"
                size="sm"
                className={s.menuTrigger}
                disabled={isBusy}
              >
                <Icon name="RotateCcw" size="sm" />
                Rotate Left
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onRotate('right');
                  setShowRotateMenu(false);
                }}
                variant="ghost"
                size="sm"
                className={s.menuTrigger}
                disabled={isBusy}
              >
                <Icon name="RotateCw" size="sm" />
                Rotate Right
              </Button>
            </div>
          )}
        </div>

        {/* Tags action */}
        <div className={s.menuWrap}>
          <Button
            type="button"
            onClick={() => setShowTagsMenu(!showTagsMenu)}
            variant="ghost"
            size="sm"
            className={s.menuTrigger}
            disabled={isBusy || selectedCount === 0}
          >
            <Icon name="Tag" size="sm" />
            <span className={s.triggerLabel}>Tags</span>
          </Button>

          {showTagsMenu && (
            <div className={`${s.dropdown} ${s.dropdownWide} dropdown-surface`}>
              <div className={s.dropdownHeader}>
                <h3 className={s.dropdownTitle}>Assign Tags</h3>
                <p className={s.dropdownSubtitle}>Select tags to apply to {selectedCount} images</p>
                <div className={s.segmented}>
                  <Button
                    type="button"
                    onClick={() => setTagAction('add')}
                    variant={tagAction === 'add' ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setTagAction('remove')}
                    variant={tagAction === 'remove' ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
                {selectedTags.length > 0 && (
                  <div className={s.selectedTagsBar}>
                    {selectedTags.map((id) => {
                      const tag = tags.find((t) => t.id === id);
                      const tagColor = tag?.color || fallbackTagColor;
                      return tag ? (
                        <span
                          key={id}
                          className={s.tagPill}
                          style={{ '--tag-color': tagColor } as React.CSSProperties}
                        >
                          {tag.name}
                          <Button
                            type="button"
                            onClick={() => toggleTagSelection(id)}
                            variant="ghost"
                            size="sm"
                            className={s.tagPillRemove}
                          >
                            ×
                          </Button>
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
                    {tags.map((tag) =>
                      (() => {
                        const tagColor = tag.color || fallbackTagColor;
                        const selected = selectedTags.includes(tag.id);
                        return (
                          <Button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTagSelection(tag.id)}
                            variant="ghost"
                            size="sm"
                            className={`${s.tagOption} ${selected ? s.tagOptionSelected : ''}`}
                            style={{ '--tag-color': tagColor } as React.CSSProperties}
                          >
                            <div
                              className={s.tagDot}
                              style={{ '--tag-color': tagColor } as React.CSSProperties}
                            >
                              {selected && <Icon name="Check" size="xs" />}
                            </div>
                            <span
                              className={`${s.tagName} ${selected ? s.tagNameSelected : s.tagNameUnselected}`}
                            >
                              {tag.name}
                            </span>
                          </Button>
                        );
                      })(),
                    )}
                  </div>
                )}
              </div>
              <div className={s.dropdownFooter}>
                <Button
                  type="button"
                  onClick={() => {
                    setShowTagsMenu(false);
                    setSelectedTags([]);
                  }}
                  variant="secondary"
                  size="sm"
                  className={s.cancelBtn}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleApplyTags}
                  disabled={isBusy || selectedTags.length === 0}
                  variant={selectedTags.length === 0 ? 'secondary' : 'primary'}
                  size="sm"
                  className={selectedTags.length === 0 ? s.applyBtnInactive : s.applyBtnActive}
                >
                  <Icon name="Save" size="sm" />
                  {tagAction === 'add' ? 'Add' : 'Remove'} Tags ({selectedTags.length})
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* People action */}
        <div className={s.menuWrap}>
          <Button
            type="button"
            onClick={() => setShowPeopleMenu(!showPeopleMenu)}
            variant="ghost"
            size="sm"
            className={s.menuTrigger}
            disabled={isBusy || selectedCount === 0}
          >
            <Icon name="User" size="sm" />
            <span className={s.triggerLabel}>People</span>
          </Button>

          {showPeopleMenu && (
            <div className={`${s.dropdown} ${s.dropdownWide} dropdown-surface`}>
              <div className={s.dropdownHeader}>
                <h3 className={s.dropdownTitle}>Assign People</h3>
                <p className={s.dropdownSubtitle}>Select people to tag in {selectedCount} images</p>
                <div className={s.segmented}>
                  <Button
                    type="button"
                    onClick={() => setPeopleAction('add')}
                    variant={peopleAction === 'add' ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setPeopleAction('remove')}
                    variant={peopleAction === 'remove' ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
                <TextInput
                  type="text"
                  placeholder="Search people..."
                  value={peopleFilter}
                  onChange={(e) => setPeopleFilter(e.target.value)}
                  density="compact"
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
                        <Button
                          key={person.id}
                          type="button"
                          onClick={() => togglePersonSelection(person.id)}
                          variant="ghost"
                          size="sm"
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
                            {person.redFlagRating > 0 && (
                              <span className={s.personFlagPill}>
                                <Icon name="Flag" size="xs" />
                                <span className={s.personFlagCount}>{person.redFlagRating}</span>
                              </span>
                            )}
                          </div>
                        </Button>
                      ))}
                  </div>
                )}
              </div>
              <div className={s.dropdownFooterEnd}>
                <Button
                  type="button"
                  onClick={() => {
                    setShowPeopleMenu(false);
                    setSelectedPeople([]);
                  }}
                  variant="secondary"
                  size="sm"
                  className={s.cancelBtnSm}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleApplyPeople}
                  disabled={isBusy || selectedPeople.length === 0}
                  variant={selectedPeople.length === 0 ? 'secondary' : 'primary'}
                  size="sm"
                  className={
                    selectedPeople.length === 0 ? s.applyBtnSmInactive : s.applyBtnSmActive
                  }
                >
                  <Icon name="Save" size="sm" />
                  {peopleAction === 'add' ? 'Add' : 'Remove'} People ({selectedPeople.length})
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Rating action */}
        <div className={s.menuWrap}>
          <Button
            type="button"
            onClick={() => setShowRatingMenu(!showRatingMenu)}
            variant="ghost"
            size="sm"
            className={s.menuTrigger}
            disabled={isBusy || selectedCount === 0}
          >
            <Icon name="Star" size="sm" />
            <span className={s.triggerLabel}>Rating</span>
          </Button>

          {showRatingMenu && (
            <div className={`${s.dropdown} ${s.dropdownNarrow} dropdown-surface`}>
              <div className={s.dropdownPad}>
                <h3 className={s.dropdownTitle}>Assign Risk Rating</h3>
                <p className={s.dropdownSubtitle}>1 is low concern; 5 is highest concern.</p>
                <div className={s.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      type="button"
                      onClick={() => {
                        onAssignRating(star);
                        setShowRatingMenu(false);
                      }}
                      variant="ghost"
                      size="sm"
                      className={s.starBtn}
                      title={`Set risk rating ${star}`}
                    >
                      <Icon name="Star" size="sm" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Metadata action */}
        <div className={s.menuWrap}>
          <Button
            type="button"
            onClick={() => setShowMetadataMenu(!showMetadataMenu)}
            variant="ghost"
            size="sm"
            className={s.menuTrigger}
            disabled={isBusy || selectedCount === 0}
          >
            <Icon name="Edit3" size="sm" />
            <span className={s.triggerLabel}>Edit</span>
          </Button>

          {showMetadataMenu && (
            <div className={`${s.dropdown} ${s.dropdownWide} dropdown-surface`}>
              <div className={s.dropdownHeader}>
                <h3 className={s.dropdownTitle}>Edit Metadata</h3>
                <p className={s.dropdownSubtitle}>Apply changes to {selectedCount} images</p>
              </div>
              <div className={s.metaBody}>
                <div>
                  <label className={s.fieldLabel}>Title</label>
                  <TextInput
                    ref={metadataTitleRef}
                    type="text"
                    placeholder="Enter new title"
                    density="compact"
                    className={s.textInput}
                  />
                </div>
                <div>
                  <label className={s.fieldLabel}>Description</label>
                  <Textarea
                    ref={metadataDescRef}
                    placeholder="Enter new description"
                    rows={3}
                    density="compact"
                    className={s.textareaInput}
                  />
                </div>
              </div>
              <div className={s.dropdownFooterEnd}>
                <Button
                  type="button"
                  onClick={() => setShowMetadataMenu(false)}
                  variant="secondary"
                  size="sm"
                  className={s.cancelBtnSm}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const titleVal = metadataTitleRef.current?.value;
                    const descVal = metadataDescRef.current?.value;
                    if (titleVal) onEditMetadata('title', titleVal);
                    if (descVal) onEditMetadata('description', descVal);
                    setShowMetadataMenu(false);
                  }}
                  variant="primary"
                  size="sm"
                  className={s.applyBtnSmActive}
                  disabled={isBusy}
                >
                  Apply to All
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={s.divider} />

        {/* Undo button */}
        {onUndo && (
          <Button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            variant={canUndo ? 'secondary' : 'ghost'}
            size="sm"
            className={canUndo ? s.undoBtnActive : s.undoBtnDisabled}
            title={canUndo ? 'Undo last action' : 'Nothing to undo'}
          >
            <Icon name="Undo2" size="sm" />
            <span className={s.triggerLabel}>Undo</span>
          </Button>
        )}

        {/* Save button */}
        {onSave && (
          <Button
            type="button"
            onClick={onSave}
            disabled={!hasChanges}
            variant={hasChanges ? 'primary' : 'secondary'}
            size="sm"
            className={hasChanges ? s.saveBtnActive : s.saveBtnDisabled}
            title={hasChanges ? 'Save all changes' : 'No changes to save'}
          >
            <Icon name="Save" size="sm" />
            <span className={s.triggerLabel}>Save</span>
          </Button>
        )}

        {/* Cancel button */}
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          size="sm"
          className={s.cancelActionBtn}
        >
          <Icon name="X" size="sm" />
          <span className={s.triggerLabel}>Cancel</span>
        </Button>
      </div>
    </div>
  );
};

export default BatchToolbar;
