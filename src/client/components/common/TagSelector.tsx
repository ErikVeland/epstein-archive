import React, { useState, useEffect, useRef } from 'react';
import { Tag, Plus, X, Check, Search } from 'lucide-react';

interface TagData {
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
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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

  // Fetch all available tags
  useEffect(() => {
    fetch('/api/media/tags')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllTags(data);
        } else {
          console.error('Invalid response from /api/media/tags - expected array:', data);
          setAllTags([]);
        }
      })
      .catch(console.error);
  }, []);

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
        const newTag = await res.json();
        setAllTags([...allTags, newTag]);
        handleToggleTag(newTag);
        setNewTagName('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${onTagClick ? 'cursor-pointer hover:opacity-90' : ''}`}
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
                className="ml-1 p-0.5 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Add Tag Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
      >
        <Tag className="w-3.5 h-3.5" />
        Add Tag
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-56 dropdown-surface overflow-hidden">
          {isAdmin && (
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Tags List */}
          <div className="max-h-40 overflow-y-auto p-1">
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag)}
                className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-700 rounded text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm text-white">{tag.name}</span>
                </span>
                {isTagSelected(tag.id) && <Check className="w-4 h-4 text-green-400" />}
              </button>
            ))}
            {filteredTags.length === 0 && (
              <p className="text-sm text-slate-400 px-2 py-1.5">No tags found</p>
            )}
          </div>

          {/* Create New Tag - Admin Only */}
          {isAdmin && (
            <div className="border-t border-slate-700 p-2">
              {isCreating ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-5 h-5 rounded-full ${newTagColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTag}
                      className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white text-sm"
                >
                  <Plus className="w-4 h-4" />
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
