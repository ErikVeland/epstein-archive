import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { BookOpen, Loader2, Search, Star, Trash2 } from 'lucide-react';
import type { MemoryEntry } from '../../types/memory';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';

interface InvestigationMemoryPanelProps {
  investigationId: string;
  onClose: () => void;
}

export const InvestigationMemoryPanel: React.FC<InvestigationMemoryPanelProps> = ({
  investigationId,
  onClose,
}) => {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [newContent, setNewContent] = useState('');
  const [importance, setImportance] = useState(0.7);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToasts();
  useScrollLock(true);

  const loadEntries = useCallback(async () => {
    if (!investigationId) return;
    setIsLoading(true);
    try {
      const result = await apiClient.getInvestigationMemoryEntries({
        investigationId: parseInt(investigationId, 10),
        page,
        limit: pageSize,
        searchQuery: searchQuery.trim() || undefined,
      });
      setEntries(result.data as MemoryEntry[]);
    } catch (error) {
      console.error('Error loading investigation memory entries', error);
      addToast({ text: 'Failed to load investigation notes', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, investigationId, page, pageSize, searchQuery]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setIsSaving(true);
    try {
      await apiClient.createInvestigationMemoryEntry({
        investigationId: parseInt(investigationId, 10),
        content: newContent.trim(),
        importanceScore: importance,
        contextTags: ['investigation-notes'],
      });
      setNewContent('');
      setImportance(0.7);
      setPage(1);
      await loadEntries();
      addToast({ text: 'Note saved to investigation memory', type: 'success' });
    } catch (error) {
      console.error('Error creating investigation memory entry', error);
      addToast({ text: 'Failed to save note', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entry: MemoryEntry) => {
    try {
      await apiClient.deleteMemoryEntry(entry.id);
      await loadEntries();
    } catch (error) {
      console.error('Error deleting investigation memory entry', error);
      addToast({ text: 'Failed to delete note', type: 'error' });
    }
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const ai = a.importanceScore ?? 0;
      const bi = b.importanceScore ?? 0;
      if (bi !== ai) return bi - ai;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [entries]);

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-[var(--glass-bg)] backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--glass-bg-strong)] border-l border-[var(--glass-border)] shadow-[var(--glass-shadow)] flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              Investigation Memory
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              Persistent notes and AI-ready context for this investigation
            </p>
          </div>
          <CloseButton onClick={onClose} size="sm" label="Close memory panel" />
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="px-4 sm:px-6 py-3 border-b border-[var(--glass-border)] flex items-center gap-2"
        >
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <button
            type="submit"
            className="px-2 sm:px-3 py-1.5 rounded-[var(--radius-lg)] bg-[var(--glass-bg)] text-xs sm:text-sm text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)]"
          >
            Search
          </button>
        </form>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading notes
            </div>
          )}

          {!isLoading && sortedEntries.length === 0 && (
            <div className="border border-dashed border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No notes in memory for this investigation yet.
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Use the form below to capture key insights and context.
              </p>
            </div>
          )}

          {sortedEntries.map((entry) => (
            <div
              key={entry.id}
              className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)]/60 p-3 sm:p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[var(--text-muted)] mb-1">
                    <span>
                      {new Date(entry.createdAt).toLocaleDateString()}{' '}
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                    {entry.content}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--glass-bg)] text-[10px] sm:text-xs text-[var(--text-secondary)]">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span>{Math.round((entry.importanceScore ?? 0) * 100)}%</span>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry)}
                    className="p-1 rounded-full text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--glass-bg)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {entry.contextTags && entry.contextTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.contextTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded-full bg-[var(--glass-bg)] text-[10px] sm:text-xs text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={handleCreateEntry}
          className="border-t border-[var(--glass-border)] px-4 sm:px-6 py-4 space-y-3 bg-[var(--glass-bg-strong)]"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-3 h-3 text-[var(--accent)]" />
              New investigation note
            </h3>
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Capture an insight, lead, or decision to persist in memory"
            rows={3}
            className="w-full px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[var(--text-secondary)]">
              <Star className="w-3 h-3 text-amber-400" />
              <span>Importance</span>
              <span className="text-amber-300 font-medium">{Math.round(importance * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(importance * 100)}
              onChange={(e) => setImportance(parseInt(e.target.value, 10) / 100)}
              className="flex-1 accent-amber-400"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newContent.trim() || isSaving}
              className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-[var(--radius-lg)] text-xs sm:text-sm font-medium bg-[var(--accent)] text-[var(--text-primary)] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Save note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
