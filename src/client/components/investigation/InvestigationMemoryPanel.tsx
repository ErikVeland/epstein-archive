import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { BookOpen, Loader2, Search, Star, Trash2 } from 'lucide-react';
import type { MemoryEntry } from '../../types/memory';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import styles from './InvestigationMemoryPanel.module.css';

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

  const controlFieldClassName = styles.field;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              <BookOpen className={styles.titleIcon} />
              Investigation Memory
            </h2>
            <p className={styles.subtitle}>
              Persistent notes and AI-ready context for this investigation
            </p>
          </div>
          <CloseButton onClick={onClose} size="sm" label="Close memory panel" />
        </div>

        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <div className={styles.searchFieldWrap}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search notes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
        </form>

        <div className={styles.entryList}>
          {isLoading && (
            <div className={styles.loadingState}>
              <Loader2 className={styles.loadingIcon} />
              Loading notes
            </div>
          )}

          {!isLoading && sortedEntries.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No notes in memory for this investigation yet.</p>
              <p className={styles.emptySubtext}>
                Use the form below to capture key insights and context.
              </p>
            </div>
          )}

          {sortedEntries.map((entry) => (
            <div key={entry.id} className={styles.entryCard}>
              <div className={styles.entryRow}>
                <div>
                  <div className={styles.entryMeta}>
                    <span>
                      {new Date(entry.createdAt).toLocaleDateString()}{' '}
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={styles.entryContent}>{entry.content}</p>
                </div>
                <div className={styles.entryActions}>
                  <div className={styles.importanceBadge}>
                    <Star className={styles.badgeIcon} />
                    <span>{Math.round((entry.importanceScore ?? 0) * 100)}%</span>
                  </div>
                  <button onClick={() => handleDeleteEntry(entry)} className={styles.deleteButton}>
                    <Trash2 className={styles.deleteIcon} />
                  </button>
                </div>
              </div>
              {entry.contextTags && entry.contextTags.length > 0 && (
                <div className={styles.tagList}>
                  {entry.contextTags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateEntry} className={styles.footerForm}>
          <div className={styles.footerHeader}>
            <h3 className={styles.footerTitle}>
              <BookOpen className={styles.footerTitleIcon} />
              New investigation note
            </h3>
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Capture an insight, lead, or decision to persist in memory"
            rows={3}
            className={controlFieldClassName}
          />
          <div className={styles.sliderRow}>
            <div className={styles.sliderMeta}>
              <Star className={styles.badgeIcon} />
              <span>Importance</span>
              <span className={styles.sliderValue}>{Math.round(importance * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(importance * 100)}
              onChange={(e) => setImportance(parseInt(e.target.value, 10) / 100)}
              className={styles.slider}
            />
          </div>
          <div className={styles.footerActions}>
            <button
              type="submit"
              disabled={!newContent.trim() || isSaving}
              className={styles.saveButton}
            >
              {isSaving && <Loader2 className={styles.savingIcon} />}
              Save note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
