import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@client/services/apiClient';
import { useToasts } from '../common/useToasts';
import { useModalFocusTrap } from '@client/hooks/useModalFocusTrap';
import Icon from '@client/components/common/Icon';

// UI Library
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  LqText,
  SearchField,
  Skeleton,
  Stack,
  Surface,
  cn,
} from '@client/design-system/lib';
import styles from './SubjectDossierPanel.module.css';

const css = <T,>(style: T) => style;

interface EntitySummary {
  id: string | number;
  fullName: string;
  entityType: string;
  primaryRole?: string;
  redFlagRating?: number;
  mentions?: number;
  aliases?: string[];
  documentCount?: number;
}

interface SubjectDossierPanelProps {
  investigationId: string;
  initialEntityId?: string | null;
  onClose: () => void;
  onOpenDocument?: (documentId: string) => void;
}

export const SubjectDossierPanel: React.FC<SubjectDossierPanelProps> = ({
  investigationId,
  initialEntityId,
  onClose,
  onOpenDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EntitySummary[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntitySummary | null>(null);
  const [recentDocs, setRecentDocs] = useState<
    Array<{ id: string; title: string; file_path: string }>
  >([]);
  const [loadingEntity, setLoadingEntity] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [searching, setSearching] = useState(false);
  const { addToast } = useToasts();
  const { modalRef } = useModalFocusTrap({ isActive: true, onEscape: onClose });

  const loadEntity = useCallback(
    async (entityId: string) => {
      setLoadingEntity(true);
      try {
        const entity = await apiClient.get<EntitySummary>(`/entities/${entityId}`);
        setSelectedEntity(entity);

        setLoadingDocs(true);
        try {
          const docs = await apiClient.get<{
            data: Array<{ id: string; title: string; file_path: string }>;
          }>(`/documents?entityId=${entityId}&limit=8&sortBy=date&sortOrder=desc`);
          setRecentDocs(docs.data ?? []);
        } catch {
          setRecentDocs([]);
        } finally {
          setLoadingDocs(false);
        }
      } catch {
        addToast({ text: 'Failed to load entity signal', type: 'error' });
      } finally {
        setLoadingEntity(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (initialEntityId) void loadEntity(initialEntityId);
  }, [initialEntityId, loadEntity]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await apiClient.get<{ results: EntitySummary[] }>(
        `/entities/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
      );
      setSearchResults(res.results ?? []);
    } catch {
      addToast({ text: 'Subject search failed', type: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const handlePin = async () => {
    if (!selectedEntity) return;
    try {
      await apiClient.post(`/investigations/${investigationId}/evidence`, {
        title: selectedEntity.fullName,
        type: 'entity',
        source_path: `entity:${selectedEntity.id}`,
        relevance: 'high',
        notes: 'Pinned as primary subject via dossier',
      });
      addToast({ text: `${selectedEntity.fullName} linked as primary subject`, type: 'success' });
      window.dispatchEvent(new CustomEvent('investigation-item-added'));
    } catch {
      addToast({ text: 'Failed to pin subject', type: 'error' });
    }
  };

  const rfi = selectedEntity?.redFlagRating ?? 0;
  const getRfiVariant = (val: number): 'danger' | 'warning' | 'accent' => {
    if (val >= 4.0) return 'danger';
    if (val >= 2.5) return 'warning';
    return 'accent';
  };

  return (
    <Box className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Surface
        ref={modalRef}
        tabIndex={-1}
        variant="glass"
        style={css({ height: '100%', width: 500 })}
        className={styles.panel}
      >
        <Stack gap="xl" style={css({ height: '100%' })}>
          {/* Header */}
          <Surface variant="glass" p="lg" className={styles.header}>
            <Flex justify="between" align="center">
              <Stack gap="none">
                <Flex align="center" gap="sm">
                  <Icon name="Fingerprint" size="md" className="text-[var(--lq-accent)]" />
                  <LqText variant="h3" weight="bold">
                    Subject Dossier
                  </LqText>
                </Flex>
                <LqText
                  variant="xs"
                  color="muted"
                  style={css({ textTransform: 'uppercase' })}
                  weight="bold"
                >
                  Intel Extraction • Profile Metadata
                </LqText>
              </Stack>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <Icon name="XCircle" size="md" />
              </Button>
            </Flex>
          </Surface>

          {/* Search Interface */}
          <Box px="lg">
            <form onSubmit={handleSearch}>
              <Box className={styles.searchWrapper}>
                <SearchField
                  type="text"
                  placeholder="Search subjects by name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  rootClassName={styles.searchFieldRoot}
                  className={styles.searchFieldInput}
                />
                {searching && (
                  <Icon name="Loader2" className={cn(styles.searchLoader, styles.spin)} size="sm" />
                )}
              </Box>
            </form>
          </Box>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !selectedEntity && (
            <Box px="lg" style={css({ zIndex: 10 })}>
              <Surface variant="glass-highlight" p="sm" className={styles.searchResults}>
                <Stack gap="xs">
                  {searchResults.map((entity) => (
                    <Button
                      key={entity.id}
                      variant="ghost"
                      style={css({ justifyContent: 'start' })}
                      onClick={() => {
                        setSearchResults([]);
                        setSearchQuery('');
                        loadEntity(String(entity.id));
                      }}
                    >
                      <Stack gap="none" align="start">
                        <LqText variant="xs" weight="bold">
                          {entity.fullName}
                        </LqText>
                        <LqText variant="xs" color="muted">
                          {entity.primaryRole || 'No role defined'}
                        </LqText>
                      </Stack>
                    </Button>
                  ))}
                </Stack>
              </Surface>
            </Box>
          )}

          {/* Body Content */}
          <Box grow p="lg" className={styles.dossierContent}>
            {loadingEntity ? (
              <Stack gap="xl">
                <Skeleton height={80} />
                <Grid cols={2} gap="md">
                  <Skeleton height={60} />
                  <Skeleton height={60} />
                </Grid>
                <Skeleton height={150} />
              </Stack>
            ) : !selectedEntity ? (
              <Stack align="center" justify="center" gap="lg" py="xxxl" textAlign="center">
                <Icon name="User" size="xl" className="text-[var(--lq-text-dim)]" />
                <Stack gap="xs">
                  <LqText variant="small" weight="bold">
                    Intelligence Buffer Empty
                  </LqText>
                  <LqText variant="xs" color="muted">
                    Perform a subject search or select a node to populate the profile data.
                  </LqText>
                </Stack>
              </Stack>
            ) : (
              <Stack gap="xl">
                {/* Profile Header */}
                <Flex justify="between" align="start">
                  <Flex align="center" gap="lg">
                    <Box className={styles.portraitShell}>
                      <img
                        src={`/api/entities/${selectedEntity.id}/portrait`}
                        alt={selectedEntity.fullName}
                        className={styles.portraitImg}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className={styles.portraitFallback} aria-hidden="true">
                        <Icon name="User" className={styles.portraitFallbackIcon} />
                      </div>
                    </Box>
                    <Stack gap="none">
                      <LqText variant="h2" weight="bold">
                        {selectedEntity.fullName}
                      </LqText>
                      <Flex gap="sm" align="center" mt="xs">
                        <Badge
                          tone="accent"
                          label={selectedEntity.entityType.toUpperCase()}
                          size="sm"
                        />
                        <LqText variant="xs" color="muted">
                          SID-{selectedEntity.id}
                        </LqText>
                      </Flex>
                    </Stack>
                  </Flex>
                  <Button
                    variant="ghost"
                    onClick={() => window.open(`/subjects/${selectedEntity.id}`, '_blank')}
                  >
                    <Icon name="ExternalLink" size="sm" />
                  </Button>
                </Flex>

                {/* Critical Metrics */}
                <Grid cols={2} gap="md">
                  <Surface
                    variant="glass-highlight"
                    p="md"
                    className={cn('border-l-4', `border-l-[var(--lq-${getRfiVariant(rfi)})]`)}
                  >
                    <Stack gap="xs">
                      <Flex align="center" gap="xs">
                        <Icon
                          name="ShieldAlert"
                          size="xs"
                          className={cn(`text-[var(--lq-${getRfiVariant(rfi)})]`)}
                        />
                        <LqText
                          variant="xs"
                          weight="bold"
                          color="muted"
                          style={css({ textTransform: 'uppercase' })}
                        >
                          Red Flag Index
                        </LqText>
                      </Flex>
                      <LqText variant="h2" weight="bold" color={getRfiVariant(rfi)}>
                        {rfi.toFixed(1)}{' '}
                        <LqText variant="xs" color="muted" weight="normal" className="inline">
                          / 5.0
                        </LqText>
                      </LqText>
                    </Stack>
                  </Surface>
                  <Surface variant="glass-highlight" p="md">
                    <Stack gap="xs">
                      <Flex align="center" gap="xs">
                        <Icon name="TrendingUp" size="xs" className="text-[var(--lq-accent)]" />
                        <LqText
                          variant="xs"
                          weight="bold"
                          color="muted"
                          style={css({ textTransform: 'uppercase' })}
                        >
                          Mention Count
                        </LqText>
                      </Flex>
                      <LqText variant="h2" weight="bold">
                        {(selectedEntity.mentions ?? 0).toLocaleString()}
                      </LqText>
                    </Stack>
                  </Surface>
                </Grid>

                {/* Known Identities */}
                {selectedEntity.aliases && selectedEntity.aliases.length > 0 && (
                  <Stack gap="sm">
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="muted"
                      style={css({ textTransform: 'uppercase' })}
                    >
                      Known Identities & Aliases
                    </LqText>
                    <Flex wrap="wrap" gap="xs">
                      {selectedEntity.aliases.map((a) => (
                        <Badge key={a} variant="glass" label={a} size="sm" />
                      ))}
                    </Flex>
                  </Stack>
                )}

                {/* Actions */}
                <Button variant="primary" onClick={handlePin}>
                  <Icon name="Plus" size="sm" /> Link as Case Primary Subject
                </Button>

                {/* Sub-Signals */}
                <Stack gap="md">
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={css({ textTransform: 'uppercase' })}
                  >
                    Recent Linked Evidence
                  </LqText>
                  {loadingDocs ? (
                    <Stack gap="xs">
                      <Skeleton height={40} />
                      <Skeleton height={40} />
                    </Stack>
                  ) : recentDocs.length === 0 ? (
                    <Surface variant="glass" p="md">
                      <LqText variant="xs" color="muted">
                        No recent documents indexed.
                      </LqText>
                    </Surface>
                  ) : (
                    <Stack gap="xs">
                      {recentDocs.map((doc) => (
                        <Surface
                          key={doc.id}
                          variant="glass-highlight"
                          p="sm"
                          className={styles.docItem}
                          onClick={() => onOpenDocument?.(doc.id)}
                        >
                          <Flex gap="sm" align="center">
                            <Icon name="FileText" size="sm" className="text-[var(--lq-accent)]" />
                            <LqText variant="xs" weight="bold">
                              {doc.title || doc.file_path?.split('/').pop()}
                            </LqText>
                          </Flex>
                        </Surface>
                      ))}
                    </Stack>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() =>
                      window.open(`/documents?entityId=${selectedEntity.id}`, '_blank')
                    }
                    style={css({ marginTop: 'var(--space-sm)' })}
                  >
                    View All Mentions{' '}
                    <Icon name="ExternalLink" size="xs" style={css({ marginLeft: '0.25rem' })} />
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        </Stack>
      </Surface>
    </Box>
  );
};
