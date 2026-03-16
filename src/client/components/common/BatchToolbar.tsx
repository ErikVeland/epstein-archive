import React, { useState, useEffect } from 'react';
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

  // Tag and people state
  const [tags, setTags] = useState<Tag[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [peopleFilter, setPeopleFilter] = useState('');

  // Fetch tags and people when menus are opened
  useEffect(() => {
    if (showTagsMenu && tags.length === 0) {
      fetchTags();
    }
  }, [showTagsMenu, tags.length]);

  useEffect(() => {
    if (showPeopleMenu && people.length === 0) {
      fetchPeople();
    }
  }, [showPeopleMenu, people.length]);

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const response = await fetch('/api/media/tags');
      const data = await response.json();
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      setTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const fetchPeople = async () => {
    setLoadingPeople(true);
    try {
      const response = await fetch('/api/entities?limit=100');
      const data = await response.json();
      const entities = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      const formattedPeople: Person[] = entities.map((e: any) => ({
        id: e.id,
        name: e.fullName || e.name,
        role: e.primaryRole || e.role || 'Unknown',
        redFlagRating: e.redFlagRating ?? 0,
      }));
      setPeople(formattedPeople);
    } catch (error) {
      console.error('Failed to fetch people:', error);
      setPeople([]);
    } finally {
      setLoadingPeople(false);
    }
  };

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
    <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl max-w-full">
      <div className="flex items-center gap-1 p-2">
        {/* Selected count with deselect button */}
        <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-1 py-1 h-8 shrink-0">
          <span className="px-2 text-sm font-medium text-cyan-400 whitespace-nowrap">
            {selectedCount} selected
          </span>
          {onDeselect && (
            <button
              onClick={onDeselect}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
              title="Clear selection"
            >
              <Icon name="X" size="sm" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700 shrink-0"></div>

        {/* Rotate actions */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowRotateMenu(!showRotateMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors h-8"
          >
            <Icon name="RotateCw" size="sm" />
            <span className="hidden sm:inline">Rotate</span>
          </button>

          {showRotateMenu && (
            <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50">
              <button
                onClick={() => {
                  onRotate('left');
                  setShowRotateMenu(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 hover:bg-slate-700 rounded-lg text-sm text-left"
              >
                <Icon name="RotateCcw" size="sm" />
                Rotate Left
              </button>
              <button
                onClick={() => {
                  onRotate('right');
                  setShowRotateMenu(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 hover:bg-slate-700 rounded-lg text-sm text-left"
              >
                <Icon name="RotateCw" size="sm" />
                Rotate Right
              </button>
            </div>
          )}
        </div>

        {/* Tags action */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowTagsMenu(!showTagsMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors h-8"
          >
            <Icon name="Tag" size="sm" />
            <span className="hidden sm:inline">Tags</span>
          </button>

          {showTagsMenu && (
            <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50 w-80">
              <div className="p-3 border-b border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">Assign Tags</h3>
                <p className="text-xs text-slate-400">
                  Select tags to apply to {selectedCount} images
                </p>
                {selectedTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedTags.map((id) => {
                      const tag = tags.find((t) => t.id === id);
                      return tag ? (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                          style={{ backgroundColor: tag.color || '#06b6d4' }}
                        >
                          {tag.name}
                          <button
                            onClick={() => toggleTagSelection(id)}
                            className="hover:text-slate-200"
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
                  <div className="text-center py-4 text-sm text-slate-500">Loading tags...</div>
                ) : tags.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-500">No tags available</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTagSelection(tag.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-all border-2 ${
                          selectedTags.includes(tag.id)
                            ? 'border-white shadow-lg scale-105'
                            : 'border-transparent hover:border-slate-500'
                        }`}
                        style={{
                          backgroundColor: selectedTags.includes(tag.id)
                            ? tag.color || '#06b6d4'
                            : `${tag.color}40` || '#06b6d440',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white/50 flex items-center justify-center"
                          style={{ backgroundColor: tag.color }}
                        >
                          {selectedTags.includes(tag.id) && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                        <span
                          className={`truncate font-medium ${selectedTags.includes(tag.id) ? 'text-white' : 'text-slate-200'}`}
                        >
                          {tag.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-slate-700 flex justify-between items-center gap-2">
                <button
                  onClick={() => {
                    setShowTagsMenu(false);
                    setSelectedTags([]);
                  }}
                  className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyTags}
                  disabled={selectedTags.length === 0}
                  className={`px-6 py-2 text-sm rounded-lg font-semibold transition-all ${
                    selectedTags.length === 0
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
                  }`}
                >
                  💾 Save Tags ({selectedTags.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* People action */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowPeopleMenu(!showPeopleMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors h-8"
          >
            <Icon name="User" size="sm" />
            <span className="hidden sm:inline">People</span>
          </button>

          {showPeopleMenu && (
            <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50 w-80">
              <div className="p-3 border-b border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">Assign People</h3>
                <p className="text-xs text-slate-400 mb-2">
                  Select people to tag in {selectedCount} images
                </p>
                <input
                  type="text"
                  placeholder="Filter people..."
                  value={peopleFilter}
                  onChange={(e) => setPeopleFilter(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div className="p-2 max-h-60 overflow-y-auto">
                {loadingPeople ? (
                  <div className="text-center py-4 text-sm text-slate-500">Loading people...</div>
                ) : people.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-500">No people available</div>
                ) : (
                  <div className="space-y-1">
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
                          className={`flex items-center gap-2 w-full p-2 rounded text-sm text-left transition-colors ${
                            selectedPeople.includes(person.id)
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{person.name}</div>
                            <div className="text-xs opacity-75 truncate">{person.role}</div>
                          </div>
                          <div className="text-xs">
                            {person.redFlagRating > 0 && '🚩'.repeat(person.redFlagRating)}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-slate-700 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowPeopleMenu(false);
                    setSelectedPeople([]);
                  }}
                  className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg h-8"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyPeople}
                  disabled={selectedPeople.length === 0}
                  className={`px-4 py-1.5 text-sm rounded-lg font-semibold transition-all ${
                    selectedPeople.length === 0
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
                  } h-8`}
                >
                  💾 Save People ({selectedPeople.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rating action */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowRatingMenu(!showRatingMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors h-8"
          >
            <Icon name="Star" size="sm" />
            <span className="hidden sm:inline">Rating</span>
          </button>

          {showRatingMenu && (
            <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50 w-48">
              <div className="p-3">
                <h3 className="text-sm font-medium text-white mb-2">Assign Rating</h3>
                <div className="flex justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        onAssignRating(star);
                        setShowRatingMenu(false);
                      }}
                      className="text-amber-400 hover:text-amber-300"
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
          <button
            onClick={() => setShowMetadataMenu(!showMetadataMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors h-8"
          >
            <Icon name="Edit3" size="sm" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {showMetadataMenu && (
            <div className="absolute bottom-full left-0 mb-2 dropdown-surface z-50 w-80">
              <div className="p-3 border-b border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">Edit Metadata</h3>
                <p className="text-xs text-slate-400">Apply changes to {selectedCount} images</p>
              </div>
              <div className="p-3 space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="Enter new title"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 h-8"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <textarea
                    placeholder="Enter new description"
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  ></textarea>
                </div>
              </div>
              <div className="p-2 border-t border-slate-700 flex justify-end gap-2">
                <button
                  onClick={() => setShowMetadataMenu(false)}
                  className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg h-8"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const titleInput = document.querySelector<HTMLInputElement>(
                      '.absolute.bottom-full.left-0.mb-2.bg-slate-800.border.border-slate-700.rounded-lg.shadow-xl.z-50.w-80 input',
                    );
                    const descInput = document.querySelector<HTMLTextAreaElement>(
                      '.absolute.bottom-full.left-0.mb-2.bg-slate-800.border.border-slate-700.rounded-lg.shadow-xl.z-50.w-80 textarea',
                    );

                    if (titleInput?.value) {
                      onEditMetadata('title', titleInput.value);
                    }
                    if (descInput?.value) {
                      onEditMetadata('description', descInput.value);
                    }
                    setShowMetadataMenu(false);
                  }}
                  className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-lg h-8"
                >
                  Apply to All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700 shrink-0"></div>

        {/* Undo button */}
        {onUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors h-8 shrink-0 ${
              canUndo ? 'hover:bg-slate-700 text-amber-400' : 'text-slate-600 cursor-not-allowed'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all h-8 shrink-0 ${
              hasChanges
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
            title={hasChanges ? 'Save all changes' : 'No changes to save'}
          >
            <Icon name="Save" size="sm" />
            <span className="hidden sm:inline">Save</span>
          </button>
        )}

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors text-rose-400 h-8 shrink-0"
        >
          <Icon name="X" size="sm" />
          <span className="hidden sm:inline">Cancel</span>
        </button>
      </div>
    </div>
  );
};

export default BatchToolbar;
