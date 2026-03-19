import React, { useState, useEffect } from 'react';
import { useMemory } from '../../contexts/MemoryContext';
import type { MemoryEntry, MemorySearchFilters } from '../../types/memory';

const MemoryDashboard: React.FC = () => {
  const {
    state,
    loadMemoryEntries,
    createMemoryEntry,
    updateMemoryEntry,
    deleteMemoryEntry,
    selectMemoryEntry,
    searchMemoryEntries,
  } = useMemory();

  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'archived' | 'deprecated'>('active');
  const [editTags, setEditTags] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchFilters, setSearchFilters] = useState<MemorySearchFilters>({});
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<
    'declarative' | 'episodic' | 'working' | 'procedural'
  >('declarative');
  const [newMemoryTags, setNewMemoryTags] = useState('');

  useEffect(() => {
    loadMemoryEntries();
  }, [loadMemoryEntries]);

  const handleCreateMemory = async () => {
    if (!newMemoryContent.trim()) return;

    const tags = newMemoryTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag);

    await createMemoryEntry({
      memoryType: newMemoryType,
      content: newMemoryContent,
      contextTags: tags,
      importanceScore: 0.5,
    });

    setNewMemoryContent('');
    setNewMemoryTags('');
    setIsCreating(false);
  };

  const handleSearch = async () => {
    if (searchFilters.searchQuery) {
      await searchMemoryEntries(searchFilters.searchQuery);
    } else {
      await loadMemoryEntries(searchFilters);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this memory entry?')) {
      await deleteMemoryEntry(id);
      if (selectedMemory?.id === id) {
        setSelectedMemory(null);
        selectMemoryEntry(null);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Memory Dashboard</h1>

      {/* Search and Filter Section */}
      <div className="surface-glass-card p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Memory Type
            </label>
            <select
              value={searchFilters.memoryType || ''}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  memoryType: (e.target.value as any) || undefined,
                })
              }
              className="w-full rounded-md bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="declarative">Declarative</option>
              <option value="episodic">Episodic</option>
              <option value="working">Working</option>
              <option value="procedural">Procedural</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Status
            </label>
            <select
              value={searchFilters.status || ''}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  status: (e.target.value as any) || undefined,
                })
              }
              className="w-full rounded-md bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchFilters.searchQuery || ''}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  searchQuery: e.target.value || undefined,
                })
              }
              placeholder="Search memory content..."
              className="w-full rounded-md bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full bg-[var(--accent)] text-[var(--text-primary)] py-2 px-4 rounded-md hover:bg-[var(--glass-bg-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Create New Memory Section */}
      <div className="surface-glass-card p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create New Memory</h2>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-[var(--accent)] text-[var(--text-primary)] py-2 px-4 rounded-md hover:bg-[var(--glass-bg-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
          >
            {isCreating ? 'Cancel' : 'Create New'}
          </button>
        </div>

        {isCreating && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Memory Type
              </label>
              <select
                value={newMemoryType}
                onChange={(e) => setNewMemoryType(e.target.value as any)}
                className="w-full rounded-md bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm"
              >
                <option value="declarative">Declarative</option>
                <option value="episodic">Episodic</option>
                <option value="working">Working</option>
                <option value="procedural">Procedural</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Content
              </label>
              <textarea
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                rows={4}
                className="w-full rounded-md bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm"
                placeholder="Enter memory content..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Context Tags (comma-separated)
              </label>
              <input
                type="text"
                value={newMemoryTags}
                onChange={(e) => setNewMemoryTags(e.target.value)}
                className="w-full rounded-md bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm"
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <button
              onClick={handleCreateMemory}
              disabled={!newMemoryContent.trim()}
              className="bg-[var(--accent-success)] text-[var(--text-primary)] py-2 px-4 rounded-md hover:bg-[var(--accent-success)] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Memory
            </button>
          </div>
        )}
      </div>

      {/* Memory List */}
      <div className="surface-glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--glass-border)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Memory Entries ({state.totalEntries})
          </h2>
        </div>

        {state.loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto"></div>
          </div>
        ) : state.error ? (
          <div className="p-6 text-center text-[var(--accent-danger)]">Error: {state.error}</div>
        ) : state.memoryEntries.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-muted)]">No memory entries found</div>
        ) : (
          <div className="divide-y divide-[var(--glass-border)]">
            {state.memoryEntries.map((memory) => (
              <div
                key={memory.id}
                className={`p-6 hover:bg-[var(--app-bg)] cursor-pointer ${
                  selectedMemory?.id === memory.id ? 'bg-[var(--glass-bg-highlight)]' : ''
                }`}
                onClick={() => {
                  setSelectedMemory(memory);
                  selectMemoryEntry(memory);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          memory.memoryType === 'declarative'
                            ? 'bg-[var(--accent-info)]/20 text-[var(--accent-info)]'
                            : memory.memoryType === 'episodic'
                              ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]'
                              : memory.memoryType === 'working'
                                ? 'bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]'
                                : 'bg-[var(--accent)]/20 text-[var(--accent)]'
                        }`}
                      >
                        {memory.memoryType}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          memory.status === 'active'
                            ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]'
                            : memory.status === 'archived'
                              ? 'bg-[var(--app-bg)] text-[var(--text-primary)]'
                              : 'bg-[var(--accent-danger)]/20 text-[var(--accent-danger)]'
                        }`}
                      >
                        {memory.status}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)] truncate">
                      {memory.content.substring(0, 100)}
                      {memory.content.length > 100 ? '...' : ''}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {memory.contextTags?.slice(0, 5).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--app-bg)] text-[var(--text-primary)]"
                        >
                          {tag}
                        </span>
                      ))}
                      {memory.contextTags && memory.contextTags.length > 5 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--app-bg)] text-[var(--text-primary)]">
                          +{memory.contextTags.length - 5} more
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      Quality: {(memory.qualityScore * 100).toFixed(0)}% | Importance:{' '}
                      {(memory.importanceScore * 100).toFixed(0)}% | Created:{' '}
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(memory.id);
                      }}
                      className="text-[var(--accent-danger)] hover:text-[var(--accent-danger)]"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {state.totalPages > 1 && (
          <div className="bg-transparent px-6 py-3 border-t border-[var(--glass-border)] flex items-center justify-between">
            <div className="text-sm text-[var(--text-primary)]">
              Showing <span className="font-medium">{(state.currentPage - 1) * 20 + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(state.currentPage * 20, state.totalEntries)}
              </span>{' '}
              of <span className="font-medium">{state.totalEntries}</span> results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  loadMemoryEntries(searchFilters, Math.max(1, state.currentPage - 1), 20)
                }
                disabled={state.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] control rounded-md hover:bg-[var(--glass-bg-highlight)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  loadMemoryEntries(
                    searchFilters,
                    Math.min(state.totalPages, state.currentPage + 1),
                    20,
                  )
                }
                disabled={state.currentPage === state.totalPages}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] control rounded-md hover:bg-[var(--glass-bg-highlight)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Memory Details */}
      {selectedMemory && (
        <div className="mt-8 surface-glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Memory Details</h2>
            <div className="flex items-center gap-3">
              {!isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditContent(selectedMemory.content);
                    setEditStatus(selectedMemory.status);
                    setEditTags((selectedMemory.contextTags || []).join(', '));
                  }}
                  className="text-[var(--accent)] hover:text-[var(--accent)] text-sm font-medium"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedMemory(null);
                  selectMemoryEntry(null);
                  setIsEditing(false);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)]">ID</label>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{selectedMemory.id}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)]">UUID</label>
              <p className="mt-1 text-sm text-[var(--text-primary)] break-all">
                {selectedMemory.uuid}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Memory Type
                </label>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {selectedMemory.memoryType}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Status
                </label>
                {isEditing ? (
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as 'active' | 'archived' | 'deprecated')
                    }
                    className="mt-1 w-full rounded-md bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{selectedMemory.status}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)]">Tags</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="mt-1 w-full rounded-md bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)] sm:text-sm"
                  placeholder="tag1, tag2, tag3"
                />
              ) : (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedMemory.contextTags?.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--app-bg)] text-[var(--text-primary)]"
                    >
                      {tag}
                    </span>
                  ))}
                  {!selectedMemory.contextTags || selectedMemory.contextTags.length === 0 ? (
                    <span className="text-sm text-[var(--text-muted)]">No tags</span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Quality Score
                </label>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {(selectedMemory.qualityScore * 100).toFixed(0)}%
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Importance Score
                </label>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {(selectedMemory.importanceScore * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {isEditing && selectedMemory && (
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(selectedMemory.content);
                    setEditStatus(selectedMemory.status);
                    setEditTags((selectedMemory.contextTags || []).join(', '));
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--app-bg)] rounded-md hover:bg-[var(--app-bg)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const tags = editTags
                      .split(',')
                      .map((t) => t.trim())
                      .filter((t) => t);
                    await updateMemoryEntry(selectedMemory.id, {
                      content: editContent,
                      status: editStatus,
                      contextTags: tags,
                    });
                    await loadMemoryEntries(searchFilters);
                    setIsEditing(false);
                  }}
                  disabled={!editContent.trim()}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--accent)] rounded-md hover:bg-[var(--glass-bg-strong)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Created At
                </label>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {new Date(selectedMemory.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Updated At
                </label>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {new Date(selectedMemory.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedMemory.provenance && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Provenance
                </label>
                <pre className="mt-1 text-xs bg-[var(--app-bg)] p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(selectedMemory.provenance, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryDashboard;
