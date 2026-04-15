import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { BookOpen, Loader2, Search, Star, Trash2, Clock, Sparkles, Send } from 'lucide-react';
import type { MemoryEntry } from '../../types/memory';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';

// UI Library
import {
  Box,
  Button,
  Grid,
  Input,
  Stack,
  Surface,
  TextInput,
  Textarea,
} from '../../design-system/lib';
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
  const [pageSize] = useState(25);
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
      console.error(error);
      addToast({ text: 'Neural buffer extraction failed.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, investigationId, page, pageSize, searchQuery]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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
      addToast({ text: 'Note persisted to investigation memory.', type: 'success' });
    } catch (error) {
      console.error(error);
      addToast({ text: 'Neural storage failed.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      await apiClient.deleteMemoryEntry(id);
      await loadEntries();
    } catch (error) {
      console.error(error);
      addToast({ text: 'De-indexing failed.', type: 'error' });
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
    <Box className={styles.overlay} onClick={onClose}>
      <Surface variant="panel" className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <Stack className={styles.panelStack} gap="0">
          <div className={styles.header}>
            <div>
              <div className={styles.title}>
                <BookOpen className={styles.titleIcon} />
                Neural Repository
              </div>
              <div className={styles.subtitle}>
                Persistent Investigative Context • AI Awareness Buffer
              </div>
            </div>
            <CloseButton onClick={onClose} size="md" />
          </div>

          <form
            className={styles.searchForm}
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              void loadEntries();
            }}
          >
            <div className={styles.searchFieldWrap}>
              <Search className={styles.searchIcon} />
              <TextInput
                className={styles.searchInput}
                placeholder="Search memory stream…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className={styles.searchButton}>
              Search
            </Button>
          </form>

          <Box grow className={styles.entryList}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <Loader2 className={styles.loadingIcon} />
                Loading memory stream
              </div>
            ) : sortedEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <Sparkles size={48} className={styles.emptyIcon} />
                <div className={styles.emptyText}>Neural Buffer Clear</div>
                <div className={styles.emptySubtext}>
                  No persistent context blocks found. Initialize an entry to prime the investigation
                  memory.
                </div>
              </div>
            ) : (
              <Stack gap="lg">
                {sortedEntries.map((entry) => (
                  <Surface key={entry.id} variant="glass-highlight" className={styles.entryCard}>
                    <Stack gap="md">
                      <div className={styles.entryRow}>
                        <div>
                          <div className={styles.entryMeta}>
                            <Clock size={12} />
                            {new Date(entry.createdAt).toLocaleDateString()}{' '}
                            {new Date(entry.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className={styles.entryContent}>{entry.content}</div>
                        </div>
                        <div className={styles.entryActions}>
                          <div className={styles.importanceBadge}>
                            <Star size={10} className={styles.badgeIcon} />
                            {Math.round((entry.importanceScore ?? 0) * 100)}% PRIORITY
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={styles.deleteButton}
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 size={12} className={styles.deleteIcon} />
                          </Button>
                        </div>
                      </div>

                      {entry.contextTags && entry.contextTags.length > 0 && (
                        <div className={styles.tagList}>
                          {entry.contextTags.map((tag) => (
                            <span key={tag} className={styles.tag}>
                              {tag.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </Stack>
                  </Surface>
                ))}
              </Stack>
            )}
          </Box>

          <Surface variant="glass" className={styles.footerForm}>
            <form onSubmit={handleCreateEntry}>
              <Stack gap="lg">
                <div className={styles.footerHeader}>
                  <div className={styles.footerTitle}>
                    <Sparkles size={16} className={styles.footerTitleIcon} />
                    Formulate Neural Context
                  </div>
                </div>

                <Textarea
                  className={styles.field}
                  placeholder="Capture critical insights, lead extractions, or strategic decisions for AI persistence..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                />

                <Grid cols={2} gap="xl" align="center">
                  <Stack gap="xs">
                    <div className={styles.sliderRow}>
                      <div className={styles.sliderMeta}>IMPORTANCE SCALE</div>
                      <div className={styles.sliderMeta}>{Math.round(importance * 100)}%</div>
                    </div>
                    <Input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      className={styles.slider}
                      value={Math.round(importance * 100)}
                      onChange={(e) => setImportance(parseInt(e.target.value, 10) / 100)}
                    />
                  </Stack>
                  <Button
                    variant="secondary"
                    type="submit"
                    disabled={!newContent.trim() || isSaving}
                  >
                    {isSaving ? <Loader2 className={styles.savingIcon} /> : <Send size={14} />}
                    Commit to Memory
                  </Button>
                </Grid>
              </Stack>
            </form>
          </Surface>
        </Stack>
      </Surface>
    </Box>
  );
};
