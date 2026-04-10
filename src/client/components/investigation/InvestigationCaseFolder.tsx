import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Folder,
  User,
  FileText,
  Navigation,
  Building,
  Mail,
  MessageSquare,
  DollarSign,
  Scale,
  Image,
  File,
  Search,
  ExternalLink,
  Eye,
  AlertCircle,
  FolderOpen,
  Loader2,
  Clock,
  LucideIcon,
} from 'lucide-react';
import type {
  InvestigationCaseEvidenceItemDto as EvidenceItem,
  InvestigationEvidenceByTypeResponseDto as EvidenceByType,
} from '@shared/dto/investigations';
import { useCaseFolder } from '../../domains/investigations';

// UI Library
import styles from './InvestigationCaseFolder.module.css';
import {
  Surface,
  Button,
  Flex,
  Box,
  Stack,
  LqText,
  Grid,
  Badge,
  cn,
} from '../../design-system/lib';

interface InvestigationCaseFolderProps {
  investigationId: number | string;
  onEvidenceClick?: (evidence: EvidenceItem, triggerEl?: HTMLElement | null) => void;
  deepLinkedEvidenceId?: string | null;
  caseFolderData?: EvidenceByType | null;
  caseFolderLoading?: boolean;
  caseFolderError?: string | null;
  onReloadCaseFolder?: () => Promise<EvidenceByType | null> | void;
}

const typeConfig: Record<
  string,
  {
    icon: LucideIcon;
    label: string;
    tone:
      | 'cyan'
      | 'blue'
      | 'purple'
      | 'emerald'
      | 'amber'
      | 'pink'
      | 'green'
      | 'red'
      | 'indigo'
      | 'slate';
  }
> = {
  entity: { icon: User, label: 'Entities', tone: 'cyan' },
  document: { icon: FileText, label: 'Documents', tone: 'blue' },
  flight_log: { icon: Navigation, label: 'Flights', tone: 'purple' },
  property_record: { icon: Building, label: 'Properties', tone: 'emerald' },
  email: { icon: Mail, label: 'Emails', tone: 'amber' },
  testimony: { icon: MessageSquare, label: 'Testimonies', tone: 'pink' },
  financial: { icon: DollarSign, label: 'Financial', tone: 'green' },
  legal: { icon: Scale, label: 'Legal', tone: 'red' },
  photo: { icon: Image, label: 'Photos', tone: 'indigo' },
  other: { icon: File, label: 'Other', tone: 'slate' },
};

const relevanceVariants: Record<string, 'primary' | 'secondary' | 'danger' | 'ghost'> = {
  high: 'danger',
  medium: 'secondary',
  low: 'ghost',
};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const readDisplayValue = (value: unknown): string | number | null =>
  typeof value === 'string' || typeof value === 'number' ? value : null;

const readConfidence = (value: unknown): string | number | null =>
  typeof value === 'string' || typeof value === 'number' ? value : null;

export const InvestigationCaseFolder: React.FC<InvestigationCaseFolderProps> = ({
  investigationId,
  onEvidenceClick,
  deepLinkedEvidenceId = null,
  caseFolderData = null,
  caseFolderLoading,
  caseFolderError,
  onReloadCaseFolder,
}) => {
  const domainCaseFolder = useCaseFolder(String(investigationId), {
    enabled: !caseFolderData,
  });
  const evidence = caseFolderData || domainCaseFolder.caseFolder;
  const loading = caseFolderLoading ?? domainCaseFolder.loading;
  const error = caseFolderError ?? domainCaseFolder.error;

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [relevanceFilter, setRelevanceFilter] = useState<string | null>(null);
  const [listScrollTop, setListScrollTop] = useState(0);
  const evidenceButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const handleItemAdded = () => {
      setTimeout(() => {
        if (onReloadCaseFolder) void onReloadCaseFolder();
        else void domainCaseFolder.reload();
      }, 500);
    };
    window.addEventListener('investigation-item-added', handleItemAdded);
    return () => window.removeEventListener('investigation-item-added', handleItemAdded);
  }, [domainCaseFolder, onReloadCaseFolder]);

  const filteredEvidence = useMemo(() => {
    if (!evidence) return [];
    let items = selectedType ? evidence.byType[selectedType] || [] : evidence.all;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          e.description?.toLowerCase().includes(term) ||
          e.notes?.toLowerCase().includes(term),
      );
    }
    if (relevanceFilter) {
      items = items.filter((e) => e.relevance === relevanceFilter);
    }
    return items;
  }, [evidence, selectedType, searchTerm, relevanceFilter]);

  // Virtualization constants
  const rowHeight = 160;
  const viewportHeight = 800;
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + 5;
  const shouldVirtualize = filteredEvidence.length > 50;
  const startIndex = shouldVirtualize ? Math.max(0, Math.floor(listScrollTop / rowHeight) - 2) : 0;
  const endIndex = shouldVirtualize
    ? Math.min(filteredEvidence.length, startIndex + visibleCount)
    : filteredEvidence.length;
  const visibleRows = filteredEvidence.slice(startIndex, endIndex);

  const getSourceLink = (item: EvidenceItem): string | null => {
    const [type, id] = (item.sourcePath || '').split(':');
    if (type === 'entity' && id) return `/entity/${id}`;
    if (type === 'document' && id) return `/documents/${id}`;
    if (type === 'flight' && id) return `/flights?id=${id}`;
    if (type === 'property' && id) return `/properties?id=${id}`;
    if (type === 'email' && id) return `/emails?id=${id}`;
    return null;
  };

  const getProvenance = (item: EvidenceItem) => {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = item.metadataJson ? JSON.parse(item.metadataJson) : {};
    } catch {
      metadata = {};
    }
    const ingestRunId =
      readString(item.ingestRunId) ||
      readString(metadata.ingestRunId) ||
      readString(metadata.ingest_run_id) ||
      null;
    const ladder =
      readDisplayValue(item.evidenceLadder) ||
      readDisplayValue(metadata.evidenceLadder) ||
      readDisplayValue(metadata.evidence_ladder) ||
      'N/A';
    const pipelineVersion =
      readString(item.pipelineVersion) ||
      readString(metadata.pipelineVersion) ||
      readString(metadata.pipeline_version) ||
      null;
    const confidence = readConfidence(metadata.confidence_score ?? metadata.confidence ?? null);
    const wasAgentic = Boolean(
      item.wasAgentic ?? metadata.wasAgentic ?? metadata.was_agentic ?? false,
    );
    return { ingestRunId, ladder, pipelineVersion, confidence, wasAgentic };
  };

  const resolveEvidenceKey = (item: EvidenceItem): string =>
    String(item.investigationEvidenceId || item.id);

  const isDeepLinkedItem = (item: EvidenceItem): boolean => {
    if (!deepLinkedEvidenceId) return false;
    const linked = String(deepLinkedEvidenceId);
    return String(item.id) === linked || resolveEvidenceKey(item) === linked;
  };

  useEffect(() => {
    if (!deepLinkedEvidenceId || !evidence?.all?.length) return;
    const linked = String(deepLinkedEvidenceId);
    const match = evidence.all.find(
      (i) => String(i.id) === linked || resolveEvidenceKey(i) === linked,
    );
    if (!match) return;

    window.requestAnimationFrame(() => {
      const key = resolveEvidenceKey(match);
      const rowButton = evidenceButtonRefs.current.get(key);
      if (rowButton) {
        rowButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
        rowButton.focus();
      }
    });
  }, [deepLinkedEvidenceId, evidence]);

  if (loading) {
    return (
      <Flex justify="center" align="center" fullHeight p="xxxl">
        <Loader2 className={styles.autoGen181} size={32} />
      </Flex>
    );
  }

  if (error) {
    return (
      <Surface variant="glass" p="xl">
        <Flex align="center" gap="md" className={styles.autoGen182}>
          <AlertCircle size={24} />
          <LqText variant="small" weight="bold">
            {error}
          </LqText>
        </Flex>
      </Surface>
    );
  }

  if (!evidence || evidence.total === 0) {
    return (
      <Surface variant="glass" p="xxl">
        <Stack align="center" gap="lg" textAlign="center">
          <FolderOpen size={48} className={styles.autoGen183} />
          <Stack gap="xs">
            <LqText variant="body" weight="bold">
              Case Folder is Empty
            </LqText>
            <LqText variant="xs" color="muted">
              Add evidence from Subjects, Documents, or Metadata archives.
            </LqText>
          </Stack>
        </Stack>
      </Surface>
    );
  }

  const types = Object.keys(evidence.byType);

  return (
    <Stack gap="xl" style={{ width: '100%' }}>
      {/* Category Summary Grid */}
      <Grid cols={{ sm: 2, md: 3, lg: 5 }} gap="md">
        <Surface
          variant={selectedType === null ? 'glass-highlight' : 'glass'}
          p="md"
          onClick={() => setSelectedType(null)}
          className={styles.autoGen184}
        >
          <Stack gap="xs" align="center">
            <Folder size={18} />
            <LqText variant="body" weight="bold">
              {evidence.total}
            </LqText>
            <LqText variant="xs" style={{ textTransform: 'uppercase' }} weight="bold">
              All Items
            </LqText>
          </Stack>
        </Surface>

        {types.map((type) => {
          const config = typeConfig[type] || typeConfig.other;
          const count = evidence.counts[type] || 0;
          const isActive = selectedType === type;
          return (
            <Surface
              key={type}
              variant={isActive ? 'glass-highlight' : 'glass'}
              p="md"
              onClick={() => setSelectedType(isActive ? null : type)}
              className={cn(
                'cursor-pointer transition-all active:scale-95 border-b-2',
                isActive ? 'border-[var(--lq-accent)]' : 'border-transparent',
              )}
            >
              <Stack gap="xs" align="center">
                <config.icon
                  size={18}
                  className={cn(isActive ? 'text-[var(--lq-accent)]' : 'text-[var(--lq-text-dim)]')}
                />
                <LqText variant="body" weight="bold">
                  {count}
                </LqText>
                <LqText variant="xs" style={{ textTransform: 'uppercase' }} weight="bold">
                  {config.label}
                </LqText>
              </Stack>
            </Surface>
          );
        })}
      </Grid>

      {/* Modern Filter Strip */}
      <Surface variant="glass" p="md">
        <Flex gap="xl" wrap="wrap" align="center">
          <Flex grow align="center" gap="sm" className={styles.autoGen185}>
            <Search className={styles.autoGen186} size={16} />
            <input
              type="text"
              placeholder="Search investigative records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            />
          </Flex>

          <Flex align="center" gap="sm">
            <LqText variant="xs" weight="bold" color="muted" style={{ textTransform: 'uppercase' }}>
              Relevance:
            </LqText>
            {['high', 'medium', 'low'].map((rel) => (
              <Button
                key={rel}
                variant={relevanceFilter === rel ? relevanceVariants[rel] : 'glass'}
                onClick={() => setRelevanceFilter(relevanceFilter === rel ? null : rel)}
              >
                {rel.toUpperCase()}
              </Button>
            ))}
          </Flex>

          {(searchTerm || relevanceFilter || selectedType) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                setRelevanceFilter(null);
                setSelectedType(null);
              }}
            >
              Clear Signals
            </Button>
          )}
        </Flex>
      </Surface>

      {/* Evidence Stream */}
      <Stack gap="md">
        <Flex justify="between" align="center">
          <LqText
            variant="small"
            weight="bold"
            style={{ textTransform: 'uppercase' }}
            color="muted"
          >
            {selectedType ? typeConfig[selectedType]?.label : 'Active Evidence Stream'}
          </LqText>
          <Badge variant="glass" label={`${filteredEvidence.length} SIGNALS`} />
        </Flex>

        {filteredEvidence.length === 0 ? (
          <Surface variant="glass" p="xl">
            <LqText variant="xs" color="muted">
              No evidence matches current intelligence filters.
            </LqText>
          </Surface>
        ) : (
          <Box
            fullWidth
            className={styles.autoGen187}
            style={{ maxHeight: '800px' }}
            onScroll={(e) => setListScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
          >
            {shouldVirtualize && startIndex > 0 && (
              <div style={{ height: startIndex * rowHeight }} />
            )}
            <Stack gap="sm">
              {visibleRows.map((item) => {
                const config = typeConfig[item.type] || typeConfig.other;
                const link = getSourceLink(item);
                const provenance = getProvenance(item);
                const isLinked = isDeepLinkedItem(item);

                return (
                  <Surface
                    key={item.id}
                    variant={isLinked ? 'glass-highlight' : 'glass'}
                    className={cn(
                      'transition-all',
                      isLinked && 'border-l-4 border-l-[var(--lq-accent)]',
                    )}
                  >
                    <Flex p="lg" gap="lg" align="start">
                      <Box p="sm" className={styles.autoGen188}>
                        <config.icon size={20} className={styles.autoGen189} />
                      </Box>

                      <Stack grow gap="xs">
                        <Flex justify="between" align="start">
                          <Stack gap="none">
                            <LqText variant="body" weight="bold">
                              {item.title}
                            </LqText>
                            <Flex gap="sm" align="center">
                              <Badge
                                variant={relevanceVariants[item.relevance]}
                                label={item.relevance.toUpperCase()}
                                size="sm"
                              />
                              {item.redFlagRating > 0 && (
                                <Badge tone="danger" label={`RFI ${item.redFlagRating}`} />
                              )}
                            </Flex>
                          </Stack>
                          {onEvidenceClick && (
                            <Button
                              variant="glass"
                              onClick={(e) => onEvidenceClick(item, e.currentTarget)}
                              className="focus:ring-2 focus:ring-[var(--lq-accent)]"
                              ref={(el) => {
                                const key = resolveEvidenceKey(item);
                                if (el) evidenceButtonRefs.current.set(key, el);
                                else evidenceButtonRefs.current.delete(key);
                              }}
                            >
                              <Eye size={14} /> Analyze
                            </Button>
                          )}
                        </Flex>

                        {item.description && (
                          <LqText variant="xs" color="muted">
                            {item.description}
                          </LqText>
                        )}
                        {item.notes && (
                          <Box p="xs" mt="xs" className={styles.autoGen190}>
                            <LqText
                              variant="xs"
                              color="accent"
                              weight="bold"
                              style={{ textTransform: 'uppercase' }}
                            >
                              Forensic Note:
                            </LqText>
                            <LqText variant="xs">{item.notes}</LqText>
                          </Box>
                        )}

                        <Flex wrap="wrap" gap="sm" mt="sm" align="center">
                          <Flex align="center" gap="xs">
                            <Clock size={12} className={styles.autoGen191} />
                            <LqText variant="xs" color="muted">
                              {new Date(item.addedAt).toLocaleDateString()}
                            </LqText>
                          </Flex>
                          <Flex align="center" gap="xs">
                            <User size={12} className={styles.autoGen192} />
                            <LqText variant="xs" color="muted">
                              Added by {item.addedBy}
                            </LqText>
                          </Flex>
                          {provenance.ingestRunId && (
                            <Badge
                              variant="glass"
                              label={`RUN ${provenance.ingestRunId}`}
                              size="sm"
                            />
                          )}
                          <Badge variant="glass" label={`LADDER ${provenance.ladder}`} size="sm" />
                          {provenance.wasAgentic && (
                            <Badge variant="accent" label="AGENTIC DERIVED" size="sm" />
                          )}

                          {link && (
                            <Link to={link} className="ml-auto">
                              <Button variant="ghost" size="sm">
                                <ExternalLink size={12} /> View Source
                              </Button>
                            </Link>
                          )}
                        </Flex>
                      </Stack>
                    </Flex>
                  </Surface>
                );
              })}
            </Stack>
            {shouldVirtualize && endIndex < filteredEvidence.length && (
              <div style={{ height: (filteredEvidence.length - endIndex) * rowHeight }} />
            )}
          </Box>
        )}
      </Stack>
    </Stack>
  );
};

export default InvestigationCaseFolder;
