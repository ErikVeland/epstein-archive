import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Icon from '@client/components/common/Icon';
import type { IconName } from '@client/components/common/Icon';
import { useToasts } from '../common/useToasts';

// UI Library
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  LqText,
  SearchField,
  Select,
  Skeleton,
  Stack,
  Surface,
} from '@client/design-system/lib';
import { getEntityCategoryIcon } from '@client/utils/entityTypeIcons';
import { EvidenceAnnotationPanel, EvidenceAnnotation } from '../documents/EvidenceAnnotation';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import { apiClient } from '@client/services/apiClient';
import styles from './InvestigationEvidencePanel.module.css';

const css = <T,>(style: T) => style;

type EntityRef = { entityId: string; fullName: string; entityCategory: string };

interface Evidence {
  id: number;
  evidenceType: string;
  title: string;
  description: string;
  sourcePath: string;
  redFlagRating: number;
  createdAt: string;
  notes?: string;
  relevance?: 'high' | 'medium' | 'low';
  addedAt?: string;
  annotationCount?: number;
}

interface Entity {
  id: number;
  fullName: string;
  entityCategory: string;
  evidenceCount: number;
}

interface InvestigationEvidencePanelProps {
  investigationId: string;
  onClose?: () => void;
  onChainOfCustody?: (evidenceId: string) => void;
}

export const InvestigationEvidencePanel: React.FC<InvestigationEvidencePanelProps> = ({
  investigationId,
  onClose,
  onChainOfCustody,
}) => {
  const { addToast } = useToasts();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [entityCoverage, setEntityCoverage] = useState<Entity[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRelevance, setFilterRelevance] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  interface SearchResult {
    id: number;
    source: 'evidence' | 'document' | 'entity';
    title?: string;
    fullName?: string;
    description?: string;
    evidenceType?: string;
    entityCategory?: string;
  }

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [annotatingEvidence, setAnnotatingEvidence] = useState<Evidence | null>(null);
  const [evidenceAnnotations, setEvidenceAnnotations] = useState<
    Record<number, EvidenceAnnotation[]>
  >({});

  const [entityByEvidence, setEntityByEvidence] = useState<Record<string, EntityRef[]>>({});
  const [evidenceByEntity, setEvidenceByEntity] = useState<Record<string, string[]>>({});
  const [pivotEntityId, setPivotEntityId] = useState<string | null>(null);
  const [pivotEntityName, setPivotEntityName] = useState('');
  const [clusterMode, setClusterMode] = useState<'none' | 'entity' | 'date'>('none');

  useScrollLock(showAddModal);

  const loadEvidenceSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiClient.getInvestigationEvidenceSummary(String(investigationId))) as {
        evidence?: Evidence[];
        entityCoverage?: Entity[];
        typeBreakdown?: Record<string, number>;
        entityByEvidence?: Record<string, EntityRef[]>;
        evidenceByEntity?: Record<string, string[]>;
      };
      setEvidence(data.evidence || []);
      setEntityCoverage(data.entityCoverage || []);
      setTypeBreakdown(data.typeBreakdown || {});
      setEntityByEvidence(data.entityByEvidence || {});
      setEvidenceByEntity(data.evidenceByEntity || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    loadEvidenceSummary();
  }, [loadEvidenceSummary]);

  const handleDeleteEvidence = async (id: number) => {
    try {
      await apiClient.removeEvidenceFromInvestigation(String(id));
      setEvidence((prev) => prev.filter((e) => e.id !== id));
      addToast({ text: 'Evidence item removed', type: 'info' });
    } catch (error) {
      console.error(error);
      addToast({ text: 'Failed to remove evidence item', type: 'error' });
    }
  };

  const searchEvidence = async () => {
    if (!searchQuery.trim()) return;
    try {
      const [evRes, docRes, entRes] = await Promise.all([
        fetch(`/api/evidence/search?q=${encodeURIComponent(searchQuery)}&limit=10`),
        fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}&limit=10`),
        fetch(`/api/entities/search?q=${encodeURIComponent(searchQuery)}&limit=10`),
      ]);
      const [evData, docData, entData] = await Promise.all([
        evRes.json(),
        docRes.json(),
        entRes.json(),
      ]);
      const combined: SearchResult[] = [
        ...((evData.results as SearchResult[]) || []).map((i) => ({
          ...i,
          source: 'evidence' as const,
        })),
        ...((docData.results as SearchResult[]) || []).map((i) => ({
          ...i,
          source: 'document' as const,
        })),
        ...((entData.results as SearchResult[]) || []).map((i) => ({
          ...i,
          source: 'entity' as const,
        })),
      ];
      setSearchResults(combined);
    } catch (error) {
      console.error(error);
    }
  };

  const addEvidenceItem = async (evidenceId: number, relevance: 'high' | 'medium' | 'low') => {
    try {
      await fetch('/api/investigation/add-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigationId, evidenceId, relevance }),
      });
      loadEvidenceSummary();
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredEvidence = evidence.filter((e) => {
    const matchesSearch =
      !searchTerm ||
      e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || e.evidenceType === filterType;
    const matchesRelevance = filterRelevance === 'all' || e.relevance === filterRelevance;
    if (pivotEntityId) {
      const linked = evidenceByEntity[pivotEntityId] || [];
      if (!linked.includes(String(e.id))) return false;
    }
    return matchesSearch && matchesType && matchesRelevance;
  });

  const clusteredEvidence = useMemo((): Array<[string, Evidence[]]> | null => {
    if (clusterMode === 'none') return null;
    const groups: Record<string, Evidence[]> = {};
    filteredEvidence.forEach((e) => {
      let key: string;
      if (clusterMode === 'date') {
        key = new Date(e.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' });
      } else {
        const topEntity = (entityByEvidence[String(e.id)] || [])[0];
        key = topEntity?.fullName || 'Unlinked Evidence';
      }
      (groups[key] ??= []).push(e);
    });
    return Object.entries(groups).sort(([, a], [, b]) => b.length - a.length);
  }, [clusterMode, filteredEvidence, entityByEvidence]);

  const getEvidenceTypeLabel = (type: string) =>
    type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const renderEvidenceRow = (item: Evidence) => (
    <Surface key={item.id} variant="glass" p="lg" className={styles.autoGen193}>
      <Stack gap="md">
        <Flex justify="between" align="start">
          <Stack gap="sm" style={css({ flex: 1 })}>
            <Flex align="center" gap="md">
              <Icon name="FileSearch" size="sm" className={styles.autoGen194} />
              <LqText variant="small" weight="bold">
                {item.title || 'Signal Object'}
              </LqText>
              <Badge
                variant={
                  item.relevance === 'high'
                    ? 'error'
                    : item.relevance === 'medium'
                      ? 'warning'
                      : 'glass'
                }
                label={item.relevance?.toUpperCase()}
                size="sm"
              />
            </Flex>
            <LqText variant="xs" color="muted">
              {item.description}
            </LqText>

            {(entityByEvidence[String(item.id)] || []).length > 0 && (
              <Flex gap="xs" wrap="wrap" mt="xs">
                {(entityByEvidence[String(item.id)] || []).slice(0, 4).map((ref) => {
                  const entityIconName = getEntityCategoryIcon(ref.entityCategory).icon;
                  return (
                    <Badge
                      key={ref.entityId}
                      variant="glass-highlight"
                      size="sm"
                      cursor="pointer"
                      onClick={() => {
                        setPivotEntityId(ref.entityId);
                        setPivotEntityName(ref.fullName);
                      }}
                    >
                      <Icon name={entityIconName} size="xs" className={styles.mr1} /> {ref.fullName}
                    </Badge>
                  );
                })}
              </Flex>
            )}
          </Stack>

          <Stack align="end" gap="xs">
            {item.redFlagRating > 0 && (
              <Badge
                variant={item.redFlagRating >= 7 ? 'error' : 'warning'}
                label={`RFI ${item.redFlagRating}`}
                size="sm"
              />
            )}
            <LqText variant="xs" color="muted">
              {new Date(item.createdAt).toLocaleDateString()}
            </LqText>
          </Stack>
        </Flex>

        <Flex justify="between" align="center" pt="md" className={styles.autoGen195}>
          <Flex gap="md">
            <Badge
              variant="glass"
              label={getEvidenceTypeLabel(item.evidenceType).toUpperCase()}
              size="sm"
            />
            {(evidenceAnnotations[item.id]?.length || 0) > 0 && (
              <Flex align="center" gap="xs">
                <Icon name="MessageSquare" size="xs" className={styles.autoGen196} />
                <LqText variant="xs" weight="bold">
                  {evidenceAnnotations[item.id].length}
                </LqText>
              </Flex>
            )}
          </Flex>

          <Flex gap="xs">
            <Button variant="ghost" size="sm" onClick={() => setAnnotatingEvidence(item)}>
              <Icon name="MessageSquare" size="sm" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/evidence/${encodeURIComponent(item.id)}`, '_blank')}
            >
              <Icon name="ExternalLink" size="sm" />
            </Button>
            {onChainOfCustody && (
              <Button variant="ghost" size="sm" onClick={() => onChainOfCustody(String(item.id))}>
                <Icon name="Shield" size="sm" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={styles.autoGen197}
              onClick={() => handleDeleteEvidence(item.id)}
            >
              <Icon name="Trash2" size="sm" />
            </Button>
          </Flex>
        </Flex>
      </Stack>
    </Surface>
  );

  return (
    <Box fullHeight flex direction="column" bgcolor="var(--lq-surface-1)">
      {/* Header HUD */}
      <Surface variant="glass" p="xl" className={styles.autoGen198}>
        <Flex justify="between" align="start">
          <Stack gap="none">
            <Flex align="center" gap="md">
              <Icon name="Database" size="lg" className={styles.autoGen199} />
              <LqText variant="h1" weight="bold">
                Evidence Inventory
              </LqText>
            </Flex>
            <LqText
              variant="xs"
              color="muted"
              style={css({ textTransform: 'uppercase' })}
              weight="bold"
              mt="xs"
            >
              Case Stream • High-Density Material Extraction
            </LqText>
          </Stack>
          {onClose && <CloseButton onClick={onClose} size="md" />}
        </Flex>

        <Grid cols={3} gap="lg" mt="xl">
          {[
            { label: 'Total Volume', val: evidence.length, color: 'accent', icon: 'Layers' },
            {
              label: 'Entity Intersection',
              val: entityCoverage.length,
              color: 'success',
              icon: 'User',
            },
            {
              label: 'Signal Modalities',
              val: Object.keys(typeBreakdown).length,
              color: 'warning',
              icon: 'Activity',
            },
          ].map((s) => (
            <Surface key={s.label} variant="glass-highlight" p="lg" className={styles.autoGen200}>
              <Flex justify="between" align="center">
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    {s.label.toUpperCase()}
                  </LqText>
                  <LqText
                    variant="h2"
                    weight="bold"
                    color={
                      s.color as
                        | 'primary'
                        | 'secondary'
                        | 'muted'
                        | 'accent'
                        | 'danger'
                        | 'success'
                        | 'warning'
                    }
                  >
                    {loading ? <Skeleton width={40} height={32} /> : s.val}
                  </LqText>
                </Stack>
                <Icon name={s.icon as IconName} size="lg" className="opacity-20" />
              </Flex>
            </Surface>
          ))}
        </Grid>
      </Surface>

      <Flex grow className={styles.autoGen201}>
        {/* Analytical Sidebar */}
        <Surface variant="glass-highlight" width={320} className={styles.autoGen202}>
          <Stack gap="xl" p="lg">
            {/* Modal Distribution */}
            <Stack gap="md">
              <Flex align="center" gap="sm">
                <Icon name="BarChart3" size="sm" className={styles.autoGen203} />
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={css({ textTransform: 'uppercase' })}
                >
                  Modal Distribution
                </LqText>
              </Flex>
              {loading ? (
                <Stack gap="sm">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Stack>
              ) : (
                <Stack gap="sm">
                  {Object.entries(typeBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <Stack key={type} gap="xs">
                        <Flex justify="between">
                          <LqText variant="xs" weight="bold">
                            {getEvidenceTypeLabel(type)}
                          </LqText>
                          <LqText variant="xs" color="muted">
                            {count}
                          </LqText>
                        </Flex>
                        <Box className={styles.autoGen204}>
                          <Box
                            className={styles.autoGen205}
                            style={css({
                              width: `${(count / Math.max(1, evidence.length)) * 100}%`,
                            })}
                          />
                        </Box>
                      </Stack>
                    ))}
                </Stack>
              )}
            </Stack>

            {/* Top Entities */}
            <Stack gap="md" py="xl" className={styles.autoGen206}>
              <Flex align="center" gap="sm">
                <Icon name="User" size="sm" className={styles.autoGen207} />
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={css({ textTransform: 'uppercase' })}
                >
                  Primary Entities
                </LqText>
              </Flex>
              <Flex gap="xs" wrap="wrap">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} width={60} height={20} />
                    ))
                  : entityCoverage.slice(0, 15).map((e) => (
                      <Badge
                        key={e.id}
                        variant="glass"
                        size="sm"
                        cursor="pointer"
                        onClick={() => {
                          setPivotEntityId(String(e.id));
                          setPivotEntityName(e.fullName);
                        }}
                      >
                        {e.fullName}{' '}
                        <span className={`${styles.ml1} opacity-50`}>{e.evidenceCount}</span>
                      </Badge>
                    ))}
              </Flex>
            </Stack>
          </Stack>
        </Surface>

        {/* Main Stream */}
        <Box grow className={styles.autoGen208}>
          {/* Controls */}
          <Surface variant="glass" p="lg" className={styles.autoGen209}>
            <Stack gap="md">
              <Flex gap="md" align="center">
                <Box grow>
                  <SearchField
                    placeholder="Search extraction stream..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    rootClassName={styles.searchFieldRoot}
                    className={styles.searchFieldInput}
                  />
                </Box>
                <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
                  <Icon name="Plus" size="sm" className={styles.mr2} /> Link Signal
                </Button>
              </Flex>

              <Flex justify="between" align="center">
                <Flex gap="sm">
                  <Select
                    size="sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Modalities' },
                      ...Object.keys(typeBreakdown).map((t) => ({
                        value: t,
                        label: getEvidenceTypeLabel(t),
                      })),
                    ]}
                  />
                  <Select
                    size="sm"
                    value={filterRelevance}
                    onChange={(e) => setFilterRelevance(e.target.value)}
                    options={[
                      { value: 'all', label: 'Global Relevance' },
                      { value: 'high', label: 'Priority Extraction' },
                      { value: 'medium', label: 'Standard Evidence' },
                      { value: 'low', label: 'Ancillary Data' },
                    ]}
                  />
                </Flex>

                <Flex gap="xs" className={styles.autoGen212}>
                  <Button
                    variant={clusterMode === 'none' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setClusterMode('none')}
                  >
                    <Icon name="LayoutList" size="xs" />
                  </Button>
                  <Button
                    variant={clusterMode === 'entity' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setClusterMode('entity')}
                  >
                    <Icon name="User" size="xs" />
                  </Button>
                  <Button
                    variant={clusterMode === 'date' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setClusterMode('date')}
                  >
                    <Icon name="Calendar" size="xs" />
                  </Button>
                </Flex>
              </Flex>
            </Stack>

            {pivotEntityId && (
              <Surface variant="glass-highlight" p="sm" mt="md" className={styles.autoGen213}>
                <Flex justify="between" align="center">
                  <LqText variant="xs">
                    Filtered by intersection with <strong>{pivotEntityName}</strong>
                  </LqText>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPivotEntityId(null);
                      setPivotEntityName('');
                    }}
                  >
                    Clear Intersection
                  </Button>
                </Flex>
              </Surface>
            )}
          </Surface>

          {/* Results Area */}
          <Box p="xl">
            {loading ? (
              <Stack gap="md">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={100} />
                ))}
              </Stack>
            ) : clusteredEvidence ? (
              <Stack gap="xl">
                {clusteredEvidence.map(([group, items]) => (
                  <Stack key={group} gap="md">
                    <Flex align="center" gap="md">
                      <LqText
                        variant="xs"
                        weight="bold"
                        color="muted"
                        style={css({ textTransform: 'uppercase' })}
                      >
                        {group}
                      </LqText>
                      <Box grow className={styles.autoGen214} />
                      <Badge variant="glass" label={String(items.length)} size="sm" />
                    </Flex>
                    <Stack gap="sm">{items.map(renderEvidenceRow)}</Stack>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Stack gap="sm">{filteredEvidence.map(renderEvidenceRow)}</Stack>
            )}

            {!loading && filteredEvidence.length === 0 && (
              <Stack align="center" justify="center" p="xxxl" gap="md">
                <Icon name="Search" size="xl" className={styles.autoGen215} />
                <LqText variant="small" weight="bold" color="muted">
                  No Evidence Intersections Found
                </LqText>
                <LqText variant="xs" color="muted">
                  Adjust your filters or pivot to broaden the search.
                </LqText>
              </Stack>
            )}
          </Box>
        </Box>
      </Flex>

      {/* Add Evidence Modal */}
      {showAddModal && (
        <Box className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <Surface
            variant="panel"
            p="xl"
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <Stack gap="xl">
              <Flex justify="between" align="center">
                <LqText variant="h3" weight="bold">
                  Ingest Evidence Pipeline
                </LqText>
                <CloseButton onClick={() => setShowAddModal(false)} />
              </Flex>

              <Stack gap="md">
                <Flex gap="md">
                  <Box grow>
                    <SearchField
                      placeholder="Search global archive..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchEvidence()}
                      rootClassName={styles.searchFieldRoot}
                      className={styles.searchFieldInput}
                    />
                  </Box>
                  <Button variant="secondary" size="sm" onClick={searchEvidence}>
                    Initialize Search
                  </Button>
                </Flex>

                <Box className={styles.autoGen220}>
                  <Stack gap="sm">
                    {searchResults.map((res) => (
                      <Surface
                        key={res.id}
                        variant="glass-highlight"
                        p="md"
                        className={styles.autoGen221}
                      >
                        <Flex justify="between" align="center">
                          <Stack gap="xs" style={css({ flex: 1 })}>
                            <Flex align="center" gap="sm">
                              <Badge variant="glass" label={res.source.toUpperCase()} size="sm" />
                              <LqText variant="xs" weight="bold">
                                {res.title || res.fullName}
                              </LqText>
                            </Flex>
                            <LqText variant="xs" color="muted">
                              {res.description}
                            </LqText>
                          </Stack>
                          <Flex gap="xs">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addEvidenceItem(res.id, 'high')}
                            >
                              High
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addEvidenceItem(res.id, 'medium')}
                            >
                              Med
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addEvidenceItem(res.id, 'low')}
                            >
                              Low
                            </Button>
                          </Flex>
                        </Flex>
                      </Surface>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </Surface>
        </Box>
      )}

      {/* Annotations */}
      {annotatingEvidence && (
        <EvidenceAnnotationPanel
          evidenceId={annotatingEvidence.id}
          evidenceTitle={annotatingEvidence.title || 'Evidence Object'}
          evidenceDescription={annotatingEvidence.description}
          investigationId={investigationId}
          onClose={() => setAnnotatingEvidence(null)}
          onAnnotationsChange={(anns) =>
            setEvidenceAnnotations((prev) => ({ ...prev, [annotatingEvidence.id]: anns }))
          }
        />
      )}
    </Box>
  );
};
