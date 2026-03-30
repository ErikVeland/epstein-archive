import React, { useState, useEffect } from 'react';
import { useMemory } from '../../contexts/MemoryContext';
import type { MemoryEntry, MemorySearchFilters } from '../../types/memory';
import s from './MemoryDashboard.module.css';

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
    <div className={s.root}>
      <h1 className={s.heading}>Memory Dashboard</h1>

      {/* Search and Filter Section */}
      <div className={s.section}>
        <div className={s.filterGrid}>
          <div>
            <label className={s.label}>Memory Type</label>
            <select
              value={searchFilters.memoryType || ''}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  memoryType: (e.target.value as MemorySearchFilters['memoryType']) || undefined,
                })
              }
              className={s.input}
            >
              <option value="">All Types</option>
              <option value="declarative">Declarative</option>
              <option value="episodic">Episodic</option>
              <option value="working">Working</option>
              <option value="procedural">Procedural</option>
            </select>
          </div>

          <div>
            <label className={s.label}>Status</label>
            <select
              value={searchFilters.status || ''}
              onChange={(e) =>
                setSearchFilters({
                  ...searchFilters,
                  status: (e.target.value as MemorySearchFilters['status']) || undefined,
                })
              }
              className={s.input}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>

          <div>
            <label className={s.label}>Search</label>
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
              className={s.input}
            />
          </div>

          <div className={s.filterEnd}>
            <button onClick={handleSearch} className={s.btn}>
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Create New Memory Section */}
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>Create New Memory</h2>
          <button onClick={() => setIsCreating(!isCreating)} className={s.toggleBtn}>
            {isCreating ? 'Cancel' : 'Create New'}
          </button>
        </div>

        {isCreating && (
          <div className={s.createForm}>
            <div>
              <label className={s.label}>Memory Type</label>
              <select
                value={newMemoryType}
                onChange={(e) =>
                  setNewMemoryType(
                    e.target.value as 'declarative' | 'episodic' | 'working' | 'procedural',
                  )
                }
                className={s.input}
              >
                <option value="declarative">Declarative</option>
                <option value="episodic">Episodic</option>
                <option value="working">Working</option>
                <option value="procedural">Procedural</option>
              </select>
            </div>

            <div>
              <label className={s.label}>Content</label>
              <textarea
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                rows={4}
                className={s.input}
                placeholder="Enter memory content..."
              />
            </div>

            <div>
              <label className={s.label}>Context Tags (comma-separated)</label>
              <input
                type="text"
                value={newMemoryTags}
                onChange={(e) => setNewMemoryTags(e.target.value)}
                className={s.input}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <button
              onClick={handleCreateMemory}
              disabled={!newMemoryContent.trim()}
              className={s.createBtn}
            >
              Create Memory
            </button>
          </div>
        )}
      </div>

      {/* Memory List */}
      <div className={s.listCard}>
        <div className={s.listHeader}>
          <h2 className={s.listTitle}>Memory Entries ({state.totalEntries})</h2>
        </div>

        {state.loading ? (
          <div className={s.loadingBox}>
            <div className={s.spinner}></div>
          </div>
        ) : state.error ? (
          <div className={s.errorBox}>Error: {state.error}</div>
        ) : state.memoryEntries.length === 0 ? (
          <div className={s.emptyBox}>No memory entries found</div>
        ) : (
          <div className={s.rowContainer}>
            {state.memoryEntries.map((memory) => (
              <div
                key={memory.id}
                className={`${s.memoryRow}${selectedMemory?.id === memory.id ? ` ${s.memoryRowSelected}` : ''}`}
                onClick={() => {
                  setSelectedMemory(memory);
                  selectMemoryEntry(memory);
                }}
              >
                <div className={s.memoryRowInner}>
                  <div className={s.memoryBody}>
                    <div className={s.badgeRow}>
                      <span className={s.badge} data-type={memory.memoryType}>
                        {memory.memoryType}
                      </span>
                      <span className={s.badge} data-status={memory.status}>
                        {memory.status}
                      </span>
                    </div>

                    <h3 className={s.memoryPreview}>
                      {memory.content.substring(0, 100)}
                      {memory.content.length > 100 ? '...' : ''}
                    </h3>

                    <div className={s.tagList}>
                      {memory.contextTags?.slice(0, 5).map((tag, index) => (
                        <span key={index} className={s.tag}>
                          {tag}
                        </span>
                      ))}
                      {memory.contextTags && memory.contextTags.length > 5 && (
                        <span className={s.tag}>+{memory.contextTags.length - 5} more</span>
                      )}
                    </div>

                    <div className={s.memoryMeta}>
                      Quality: {(memory.qualityScore * 100).toFixed(0)}% | Importance:{' '}
                      {(memory.importanceScore * 100).toFixed(0)}% | Created:{' '}
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className={s.memoryActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(memory.id);
                      }}
                      className={s.deleteBtn}
                    >
                      <svg
                        className={s.deleteIcon}
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
          <div className={s.pagination}>
            <div className={s.paginationText}>
              Showing{' '}
              <span className={s.paginationEmphasis}>{(state.currentPage - 1) * 20 + 1}</span> to{' '}
              <span className={s.paginationEmphasis}>
                {Math.min(state.currentPage * 20, state.totalEntries)}
              </span>{' '}
              of <span className={s.paginationEmphasis}>{state.totalEntries}</span> results
            </div>
            <div className={s.paginationButtons}>
              <button
                onClick={() =>
                  loadMemoryEntries(searchFilters, Math.max(1, state.currentPage - 1), 20)
                }
                disabled={state.currentPage === 1}
                className={s.pageBtn}
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
                className={s.pageBtn}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Memory Details */}
      {selectedMemory && (
        <div className={s.detailCard}>
          <div className={s.detailHeader}>
            <h2 className={s.sectionTitle}>Memory Details</h2>
            <div className={s.detailHeaderActions}>
              {!isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditContent(selectedMemory.content);
                    setEditStatus(selectedMemory.status);
                    setEditTags((selectedMemory.contextTags || []).join(', '));
                  }}
                  className={s.editLink}
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
                className={s.closeBtn}
              >
                <svg className={s.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          <div className={s.detailForm}>
            <div>
              <label className={s.detailLabel}>ID</label>
              <p className={s.detailValue}>{selectedMemory.id}</p>
            </div>

            <div>
              <label className={s.detailLabel}>UUID</label>
              <p className={`${s.detailValue} ${s.uuidText}`}>{selectedMemory.uuid}</p>
            </div>

            <div className={s.detailGrid}>
              <div>
                <label className={s.detailLabel}>Memory Type</label>
                <p className={s.detailValue}>{selectedMemory.memoryType}</p>
              </div>

              <div>
                <label className={s.detailLabel}>Status</label>
                {isEditing ? (
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as 'active' | 'archived' | 'deprecated')
                    }
                    className={s.editInput}
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                ) : (
                  <p className={s.detailValue}>{selectedMemory.status}</p>
                )}
              </div>
            </div>

            <div>
              <label className={s.detailLabel}>Tags</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className={s.editInput}
                  placeholder="tag1, tag2, tag3"
                />
              ) : (
                <div className={s.detailTagList}>
                  {selectedMemory.contextTags?.map((tag, index) => (
                    <span key={index} className={s.tag}>
                      {tag}
                    </span>
                  ))}
                  {!selectedMemory.contextTags || selectedMemory.contextTags.length === 0 ? (
                    <span className={s.noTags}>No tags</span>
                  ) : null}
                </div>
              )}
            </div>

            <div className={s.detailGrid}>
              <div>
                <label className={s.detailLabel}>Quality Score</label>
                <p className={s.detailValue}>{(selectedMemory.qualityScore * 100).toFixed(0)}%</p>
              </div>

              <div>
                <label className={s.detailLabel}>Importance Score</label>
                <p className={s.detailValue}>
                  {(selectedMemory.importanceScore * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {isEditing && selectedMemory && (
              <div className={s.editActions}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(selectedMemory.content);
                    setEditStatus(selectedMemory.status);
                    setEditTags((selectedMemory.contextTags || []).join(', '));
                  }}
                  className={s.cancelBtn}
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
                  className={s.saveBtn}
                >
                  Save Changes
                </button>
              </div>
            )}

            <div className={s.detailGrid}>
              <div>
                <label className={s.detailLabel}>Created At</label>
                <p className={s.detailValue}>
                  {new Date(selectedMemory.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <label className={s.detailLabel}>Updated At</label>
                <p className={s.detailValue}>
                  {new Date(selectedMemory.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedMemory.provenance && (
              <div>
                <label className={s.detailLabel}>Provenance</label>
                <pre className={s.provenance}>
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
