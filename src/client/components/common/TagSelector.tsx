import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { Button, SearchField, TextInput } from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import { useToasts } from './useToasts';
import s from './TagSelector.module.css';

const TAG_PRESET_COLORS = [
  'var(--accent-danger)',
  'var(--nav-properties)',
  'var(--accent-warning)',
  'var(--status-success)',
  'var(--accent-success)',
  'var(--nav-people)',
  'var(--accent-agentic)',
  'var(--nav-media)',
  'var(--nav-investigations)',
  'var(--text-dim)',
];

const TAG_DEFAULT_COLOR = 'var(--accent-agentic)';

export interface TagData {
  id: number;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTags: TagData[];
  onTagsChange: (tags: TagData[]) => void;
  onTagClick?: (tag: TagData) => void;
  mediaId: number;
  className?: string;
  isAdmin?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  onTagClick,
  mediaId,
  className = '',
  isAdmin = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_DEFAULT_COLOR);
  const [savingTagId, setSavingTagId] = useState<number | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToasts();

  const { data: allTags = [] } = useQuery<TagData[]>({
    queryKey: ['media-tags'],
    queryFn: async () => {
      const data = await apiClient.getMediaTags();
      if (Array.isArray(data)) {
        return data.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: (tag as Partial<TagData>).color || TAG_DEFAULT_COLOR,
        }));
      }
      return [];
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTags = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const isTagSelected = (tagId: number) => selectedTags.some((t) => t.id === tagId);

  const handleToggleTag = async (tag: TagData) => {
    if (!isAdmin) {
      onTagClick?.(tag);
      return;
    }
    const isSelected = isTagSelected(tag.id);

    try {
      setSavingTagId(tag.id);
      if (isSelected) {
        await apiClient.removeTagFromMediaImage(mediaId, tag.id);
        onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
        addToast({ text: `Removed tag "${tag.name}"`, type: 'success' });
      } else {
        await apiClient.addTagToMediaImage(mediaId, tag.id);
        onTagsChange([...selectedTags, tag]);
        addToast({ text: `Added tag "${tag.name}"`, type: 'success' });
      }
    } catch (error) {
      console.error('Failed to toggle tag:', error);
      addToast({
        text: error instanceof Error ? error.message : 'Failed to update tag',
        type: 'error',
      });
    } finally {
      setSavingTagId(null);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      setCreateSaving(true);
      const created = await apiClient.createMediaTag({
        name: newTagName.trim(),
        color: newTagColor,
      });
      const newTag: TagData = {
        id: created.id,
        name: created.name,
        color: (created as Partial<TagData>).color || newTagColor,
      };
      await queryClient.invalidateQueries({ queryKey: ['media-tags'] });
      await handleToggleTag(newTag);
      setNewTagName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
      addToast({
        text: error instanceof Error ? error.message : 'Failed to create tag',
        type: 'error',
      });
    } finally {
      setCreateSaving(false);
    }
  };

  return (
    <div className={`${s.root} ${className}`} ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div className={s.tagList}>
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className={`${s.tagPill} ${onTagClick ? s.clickable : ''}`}
            style={{ '--tag-color': tag.color } as React.CSSProperties}
            onClick={(e) => {
              if (onTagClick) {
                e.preventDefault();
                e.stopPropagation();
                onTagClick(tag);
              }
            }}
          >
            {tag.name}
            {isAdmin && (
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTag(tag);
                }}
                variant="ghost"
                size="sm"
                className={s.tagRemove}
              >
                <Icon name="X" size="xs" />
              </Button>
            )}
          </span>
        ))}
      </div>

      {isAdmin ? (
        <Button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          variant="secondary"
          size="sm"
          className={s.addBtn}
        >
          <Icon name="Tag" size="sm" />
          Add Tag
        </Button>
      ) : onTagClick && selectedTags.length > 0 ? (
        <Button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          variant="secondary"
          size="sm"
          className={s.addBtn}
        >
          <Icon name="Tag" size="sm" />
          Filter by tag
        </Button>
      ) : null}

      {/* Dropdown */}
      {isOpen && (
        <div className={`${s.dropdown} dropdown-surface`}>
          {isAdmin && (
            <div className={s.searchWrap}>
              <SearchField
                type="text"
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                density="compact"
                rootClassName={s.searchInputRoot}
                className={s.searchInput}
              />
            </div>
          )}

          {/* Tags List */}
          <div className={s.tagListScroll}>
            {filteredTags.map((tag) => (
              <Button
                key={tag.id}
                type="button"
                onClick={() => handleToggleTag(tag)}
                disabled={savingTagId === tag.id}
                variant="ghost"
                size="sm"
                className={s.tagOption}
              >
                <span className={s.tagOptionInner}>
                  <span
                    className={s.tagDot}
                    style={{ '--tag-color': tag.color } as React.CSSProperties}
                  />
                  <span className={s.tagName}>{tag.name}</span>
                </span>
                {savingTagId === tag.id ? (
                  <Icon name="Loader2" className={s.tagCheck} />
                ) : isTagSelected(tag.id) ? (
                  <Icon name="Check" className={s.tagCheck} />
                ) : null}
              </Button>
            ))}
            {filteredTags.length === 0 && <p className={s.emptyMsg}>No tags found</p>}
          </div>

          {/* Create New Tag - Admin Only */}
          {isAdmin && (
            <div className={s.createWrap}>
              {isCreating ? (
                <div className={s.createFields}>
                  <TextInput
                    type="text"
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    density="compact"
                    className={s.createInput}
                    autoFocus
                  />
                  <div className={s.colorSwatches}>
                    {TAG_PRESET_COLORS.map((color) => (
                      <Button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        variant="ghost"
                        size="sm"
                        className={`${s.colorSwatch} ${newTagColor === color ? s.selected : ''}`}
                        style={{ '--swatch-color': color } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  <div className={s.createActions}>
                    <Button
                      type="button"
                      onClick={handleCreateTag}
                      variant="primary"
                      size="sm"
                      className={s.createBtn}
                      disabled={createSaving}
                    >
                      {createSaving ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      variant="secondary"
                      size="sm"
                      className={s.cancelBtn}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  variant="ghost"
                  size="sm"
                  className={s.createTrigger}
                >
                  <Icon name="Plus" size="sm" />
                  Create new tag
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
