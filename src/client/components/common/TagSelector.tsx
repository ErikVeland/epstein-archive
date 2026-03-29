import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, X, Check, Search } from 'lucide-react';
import s from './TagSelector.module.css';

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
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Preset colors
  const presetColors = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#10b981',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#64748b',
  ];

  const { data: allTags = [] } = useQuery<TagData[]>({
    queryKey: ['media-tags'],
    queryFn: async () => {
      const res = await fetch('/api/media/tags');
      const data = await res.json();
      if (Array.isArray(data)) {
        return data as TagData[];
      }
      console.error('Invalid response from /api/media/tags - expected array:', data);
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
    const isSelected = isTagSelected(tag.id);

    try {
      if (isSelected) {
        // Remove tag
        await fetch(`/api/media/images/${mediaId}/tags/${tag.id}`, { method: 'DELETE' });
        onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
      } else {
        // Add tag
        await fetch(`/api/media/images/${mediaId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId: tag.id }),
        });
        onTagsChange([...selectedTags, tag]);
      }
    } catch (error) {
      console.error('Failed to toggle tag:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const res = await fetch('/api/media/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (res.ok) {
        const newTag = (await res.json()) as TagData;
        await queryClient.invalidateQueries({ queryKey: ['media-tags'] });
        handleToggleTag(newTag);
        setNewTagName('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
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
            style={{ backgroundColor: tag.color }}
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTag(tag);
                }}
                className={s.tagRemove}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Add Tag Button */}
      <button onClick={() => setIsOpen(!isOpen)} className={s.addBtn}>
        <Tag size={14} />
        Add Tag
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`${s.dropdown} dropdown-surface`}>
          {isAdmin && (
            <div className={s.searchWrap}>
              <div className={s.searchInner}>
                <Search className={s.searchIcon} />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={s.searchInput}
                />
              </div>
            </div>
          )}

          {/* Tags List */}
          <div className={s.tagListScroll}>
            {filteredTags.map((tag) => (
              <button key={tag.id} onClick={() => handleToggleTag(tag)} className={s.tagOption}>
                <span className={s.tagOptionInner}>
                  <span className={s.tagDot} style={{ backgroundColor: tag.color }} />
                  <span className={s.tagName}>{tag.name}</span>
                </span>
                {isTagSelected(tag.id) && <Check className={s.tagCheck} />}
              </button>
            ))}
            {filteredTags.length === 0 && <p className={s.emptyMsg}>No tags found</p>}
          </div>

          {/* Create New Tag - Admin Only */}
          {isAdmin && (
            <div className={s.createWrap}>
              {isCreating ? (
                <div className={s.createFields}>
                  <input
                    type="text"
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className={s.createInput}
                    autoFocus
                  />
                  <div className={s.colorSwatches}>
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`${s.colorSwatch} ${newTagColor === color ? s.selected : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className={s.createActions}>
                    <button onClick={handleCreateTag} className={s.createBtn}>
                      Create
                    </button>
                    <button onClick={() => setIsCreating(false)} className={s.cancelBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsCreating(true)} className={s.createTrigger}>
                  <Plus size={16} />
                  Create new tag
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
