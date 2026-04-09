import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { BookOpen, Loader2, Search, Star, Trash2, Clock, Sparkles, Send } from 'lucide-react';
import type { MemoryEntry } from '../../types/memory';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';

// UI Library
import {
  Surface,
  Button,
  Flex,
  Box,
  Stack,
  LqText,
  Grid,
  Badge,
  Skeleton,
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
    <Box className={styles.autoGen240} onClick={onClose}>
      <Surface
        variant="panel"
        style={{ width: 600, height: '100%' }}
        className="border-l border-l-[var(--lq-surface-3)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Stack style={{ height: '100%' }} gap="0">
          {/* Header HUD */}
          <Surface variant="glass" p="xl" className={styles.autoGen242}>
            <Flex justify="between" align="start">
              <Stack gap="none">
                <Flex align="center" gap="md">
                  <BookOpen size={24} className={styles.autoGen243} />
                  <LqText variant="h1" weight="bold">
                    Neural Repository
                  </LqText>
                </Flex>
                <LqText
                  variant="xs"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                  weight="bold"
                  mt="xs"
                >
                  Persistent Investigative Context • AI Awareness Buffer
                </LqText>
              </Stack>
              <CloseButton onClick={onClose} size="md" />
            </Flex>

            {/* In-Panel Search */}
            <Box mt="xl" className={styles.autoGen244}>
              <Search size={14} className={styles.autoGen245} />
              <input
                style={{
                  width: '100%',
                  background: 'var(--lq-surface-3)',
                  border: '1px solid var(--lq-surface-4)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                  fontSize: '0.875rem',
                  color: 'var(--lq-text-primary)',
                  outline: 'none',
                }}
                placeholder="Search memory stream..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
              />
            </Box>
          </Surface>

          {/* Memory Stream */}
          <Box grow className={styles.autoGen246}>
            {isLoading ? (
              <Stack gap="md">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} height={120} />
                ))}
              </Stack>
            ) : sortedEntries.length === 0 ? (
              <Stack align="center" justify="center" style={{ height: '100%' }} p="xxxl" gap="md">
                <Sparkles size={48} className={styles.autoGen247} />
                <LqText variant="small" weight="bold" color="muted">
                  Neural Buffer Clear
                </LqText>
                <LqText variant="xs" color="muted" style={{ textAlign: 'center' }}>
                  No persistent context blocks found. Initialize an entry to prime the investigation
                  memory.
                </LqText>
              </Stack>
            ) : (
              <Stack gap="lg">
                {sortedEntries.map((entry) => (
                  <Surface
                    key={entry.id}
                    variant="glass-highlight"
                    p="lg"
                    className={styles.autoGen248}
                  >
                    <Stack gap="md">
                      <Flex justify="between" align="start">
                        <Flex align="center" gap="sm">
                          <Clock size={12} className={styles.autoGen249} />
                          <LqText variant="xs" color="muted" weight="bold">
                            {new Date(entry.createdAt).toLocaleDateString()}{' '}
                            {new Date(entry.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </LqText>
                        </Flex>
                        <Flex gap="md" align="center">
                          <Badge variant="glass" size="sm">
                            <Star size={10} className={styles.autoGen250} />{' '}
                            {Math.round((entry.importanceScore ?? 0) * 100)}% PRIORITY
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={styles.autoGen251}
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </Flex>
                      </Flex>

                      <LqText variant="xs" lineHeight="relaxed" className="whitespace-pre-wrap">
                        {entry.content}
                      </LqText>

                      {entry.contextTags && entry.contextTags.length > 0 && (
                        <Flex gap="xs" wrap="wrap">
                          {entry.contextTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="glass-highlight"
                              label={tag.toUpperCase()}
                              size="sm"
                            />
                          ))}
                        </Flex>
                      )}
                    </Stack>
                  </Surface>
                ))}
              </Stack>
            )}
          </Box>

          {/* New Entry Formulation */}
          <Surface variant="glass" p="xl" className={styles.autoGen252}>
            <form onSubmit={handleCreateEntry}>
              <Stack gap="lg">
                <Flex align="center" gap="md">
                  <Sparkles size={16} className={styles.autoGen253} />
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Formulate Neural Context
                  </LqText>
                </Flex>

                <textarea
                  style={{
                    width: '100%',
                    background: 'var(--lq-surface-3)',
                    border: '1px solid var(--lq-surface-4)',
                    borderRadius: '0.375rem',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--lq-text-primary)',
                    outline: 'none',
                    resize: 'none',
                  }}
                  placeholder="Capture critical insights, lead extractions, or strategic decisions for AI persistence..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                />

                <Grid cols={2} gap="xl" align="center">
                  <Stack gap="xs">
                    <Flex justify="between">
                      <LqText variant="xs" weight="bold" color="muted">
                        IMPORTANCE SCALE
                      </LqText>
                      <LqText variant="xs" weight="bold" color="accent">
                        {Math.round(importance * 100)}%
                      </LqText>
                    </Flex>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      style={{ width: '100%', accentColor: 'var(--lq-accent)' }}
                      value={Math.round(importance * 100)}
                      onChange={(e) => setImportance(parseInt(e.target.value, 10) / 100)}
                    />
                  </Stack>
                  <Button
                    variant="secondary"
                    type="submit"
                    disabled={!newContent.trim() || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <Send size={14} className="mr-2" />
                    )}
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
