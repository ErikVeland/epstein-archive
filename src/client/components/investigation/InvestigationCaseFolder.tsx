import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon, { type IconName } from '../common/Icon';
import { Link } from 'react-router-dom';
import type {
  InvestigationCaseEvidenceItemDto as EvidenceItem,
  InvestigationEvidenceByTypeResponseDto as EvidenceByType,
} from '@shared/dto/investigations';
import { useCaseFolder } from '../../domains/investigations';
import styles from './InvestigationCaseFolder.module.css';

interface InvestigationCaseFolderProps {
  investigationId: number | string;
  onEvidenceClick?: (evidence: EvidenceItem, triggerEl?: HTMLElement | null) => void;
  deepLinkedEvidenceId?: string | null;
  caseFolderData?: EvidenceByType | null;
  caseFolderLoading?: boolean;
  caseFolderError?: string | null;
  onReloadCaseFolder?: () => Promise<EvidenceByType | null> | void;
}

const typeConfig: Record<string, { icon: string; label: string; toneClass: string }> = {
  entity: { icon: 'User', label: 'Entities', toneClass: styles.toneCyan },
  document: { icon: 'FileText', label: 'Documents', toneClass: styles.toneBlue },
  flight_log: { icon: 'Navigation', label: 'Flights', toneClass: styles.tonePurple },
  property_record: { icon: 'Building', label: 'Properties', toneClass: styles.toneEmerald },
  email: { icon: 'Mail', label: 'Emails', toneClass: styles.toneAmber },
  testimony: { icon: 'MessageSquare', label: 'Testimonies', toneClass: styles.tonePink },
  financial: { icon: 'DollarSign', label: 'Financial', toneClass: styles.toneGreen },
  legal: { icon: 'Scale', label: 'Legal', toneClass: styles.toneRed },
  photo: { icon: 'Image', label: 'Photos', toneClass: styles.toneIndigo },
  other: { icon: 'File', label: 'Other', toneClass: styles.toneSlate },
};

const relevanceColors: Record<string, string> = {
  high: styles.relevanceHigh,
  medium: styles.relevanceMedium,
  low: styles.relevanceLow,
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
    // Listen for new items
    const handleItemAdded = () => {
      setTimeout(() => {
        if (onReloadCaseFolder) {
          void onReloadCaseFolder();
        } else {
          void domainCaseFolder.reload();
        }
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

  const shouldVirtualize = filteredEvidence.length > 100;
  const rowHeight = 148;
  const viewportHeight = 720;
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + 10;
  const startIndex = shouldVirtualize ? Math.max(0, Math.floor(listScrollTop / rowHeight) - 5) : 0;
  const endIndex = shouldVirtualize
    ? Math.min(filteredEvidence.length, startIndex + visibleCount)
    : filteredEvidence.length;
  const visibleRows = shouldVirtualize
    ? filteredEvidence.slice(startIndex, endIndex)
    : filteredEvidence;

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
      metadata = item.metadataJson
        ? (JSON.parse(item.metadataJson) as Record<string, unknown>)
        : {};
    } catch (_error) {
      metadata = {};
    }
    // Old pipeline records may have snake_case keys inside the JSON blob
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
    const evidencePack =
      (typeof item.evidencePack === 'object' && item.evidencePack !== null
        ? (item.evidencePack as Record<string, unknown>)
        : null) ||
      (typeof metadata.evidencePack === 'object' && metadata.evidencePack !== null
        ? (metadata.evidencePack as Record<string, unknown>)
        : null) ||
      (typeof metadata.evidence_pack === 'object' && metadata.evidence_pack !== null
        ? (metadata.evidence_pack as Record<string, unknown>)
        : null);
    const confidence = readConfidence(metadata.confidence_score ?? metadata.confidence ?? null);
    const wasAgentic = Boolean(
      item.wasAgentic ?? metadata.wasAgentic ?? metadata.was_agentic ?? false,
    );
    return {
      ingestRunId: ingestRunId ? String(ingestRunId) : null,
      ladder: String(ladder),
      pipelineVersion: pipelineVersion ? String(pipelineVersion) : null,
      evidencePack: evidencePack ? String(evidencePack) : null,
      confidence: confidence === null ? null : Number(confidence),
      wasAgentic,
    };
  };

  const resolveEvidenceKey = (item: EvidenceItem): string =>
    String(item.investigationEvidenceId || item.id);

  const isDeepLinkedItem = (item: EvidenceItem): boolean => {
    if (!deepLinkedEvidenceId) return false;
    const linked = String(deepLinkedEvidenceId);
    return (
      String(item.id) === linked ||
      String(item.investigationEvidenceId || '') === linked ||
      resolveEvidenceKey(item) === linked
    );
  };

  const [prevDeepLinkedId, setPrevDeepLinkedId] = useState<string | null>(null);
  if (deepLinkedEvidenceId && deepLinkedEvidenceId !== prevDeepLinkedId && evidence?.all?.length) {
    setPrevDeepLinkedId(String(deepLinkedEvidenceId));
    const linked = String(deepLinkedEvidenceId);
    const match = evidence.all.find(
      (item) =>
        String(item.id) === linked ||
        String(item.investigationEvidenceId || '') === linked ||
        resolveEvidenceKey(item) === linked,
    );
    if (match) {
      if (searchTerm) setSearchTerm('');
      if (relevanceFilter) setRelevanceFilter(null);
      if (selectedType !== match.type) setSelectedType(match.type || null);
    }
  }

  useEffect(() => {
    if (!deepLinkedEvidenceId || !evidence?.all?.length) return;
    const linked = String(deepLinkedEvidenceId);
    const match = evidence.all.find(
      (item) =>
        String(item.id) === linked ||
        String(item.investigationEvidenceId || '') === linked ||
        resolveEvidenceKey(item) === linked,
    );
    if (!match) return;

    window.requestAnimationFrame(() => {
      const key = String(match.investigationEvidenceId || match.id);
      const rowButton = evidenceButtonRefs.current.get(key);
      if (rowButton) {
        rowButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
        rowButton.focus();
      }
    });
  }, [deepLinkedEvidenceId, evidence]);

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <Icon name="AlertCircle" size="lg" className={styles.errorIcon} />
        <p>{error}</p>
      </div>
    );
  }

  if (!evidence || evidence.total === 0) {
    return (
      <div className={styles.emptyState}>
        <Icon name="FolderOpen" size="xl" className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>Case Folder is Empty</h3>
        <p className={styles.emptyBody}>
          Add evidence from Subjects, Documents, Flights, Properties, or Emails
          <br />
          using the "Add to Investigation" button.
        </p>
      </div>
    );
  }

  const types = Object.keys(evidence.byType);

  return (
    <div className={styles.root}>
      {/* Summary Stats */}
      <div className={styles.summaryGrid}>
        {/* All Evidence */}
        <button
          onClick={() => setSelectedType(null)}
          className={`${styles.summaryCard} ${
            selectedType === null
              ? `${styles.summaryCardAllActive} ${styles.summaryCardActive}`
              : styles.surfaceButton
          }`}
        >
          <Icon
            name="Folder"
            size="md"
            className={`${styles.summaryIcon} ${styles.summaryIconAll}`}
          />
          <div className={styles.summaryCount}>{evidence.total}</div>
          <div className={styles.summaryLabel}>All Evidence</div>
        </button>

        {/* Type Cards */}
        {types.map((type) => {
          const config = typeConfig[type] || typeConfig.other;
          const count = evidence.counts[type] || 0;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type === selectedType ? null : type)}
              className={`${styles.summaryCard} ${config.toneClass} ${
                selectedType === type ? styles.summaryToneActive : styles.surfaceButton
              }`}
            >
              <Icon name={config.icon as IconName} size="md" className={styles.summaryIcon} />
              <div className={styles.summaryCount}>{count}</div>
              <div className={styles.summaryLabel}>{config.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className={`${styles.filtersBar} ${styles.glassPanel}`}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <Icon name="Search" size="sm" className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search evidence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Relevance Filter */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Relevance:</span>
          {['high', 'medium', 'low'].map((rel) => (
            <button
              key={rel}
              onClick={() => setRelevanceFilter(rel === relevanceFilter ? null : rel)}
              className={`${styles.pillButton} ${
                relevanceFilter === rel ? relevanceColors[rel] : styles.surfaceButton
              }`}
            >
              {rel.charAt(0).toUpperCase() + rel.slice(1)}
            </button>
          ))}
        </div>

        {/* Clear Filters */}
        {(searchTerm || relevanceFilter || selectedType) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setRelevanceFilter(null);
              setSelectedType(null);
            }}
            className={styles.clearButton}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Evidence List */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            {selectedType ? typeConfig[selectedType]?.label || selectedType : 'All Evidence'}
            <span className={styles.sectionMeta}>({filteredEvidence.length} items)</span>
          </h3>
        </div>

        {filteredEvidence.length === 0 ? (
          <div className={styles.emptyList}>
            <p>No evidence matches your filters</p>
          </div>
        ) : (
          <div
            className={styles.list}
            onScroll={(e) => setListScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
          >
            {shouldVirtualize && startIndex > 0 && (
              <div style={{ height: startIndex * rowHeight }} />
            )}
            {visibleRows.map((item) => {
              const config = typeConfig[item.type] || typeConfig.other;
              const link = getSourceLink(item);
              const provenance = getProvenance(item);

              return (
                <div
                  key={item.id}
                  className={`${styles.rowCard} ${
                    isDeepLinkedItem(item) ? styles.rowCardLinked : ''
                  }`}
                  data-evidence-row-id={resolveEvidenceKey(item)}
                >
                  <div className={styles.rowLayout}>
                    {/* Type Icon */}
                    <div className={`${styles.typeBadge} ${config.toneClass}`}>
                      <Icon name={config.icon as IconName} size="md" className={config.toneClass} />
                    </div>

                    {/* Content */}
                    <div className={styles.rowContent}>
                      <div className={styles.rowHeader}>
                        <h4 className={styles.rowTitle}>{item.title}</h4>
                        <span
                          className={`${styles.relevancePill} ${relevanceColors[item.relevance] || styles.toneSlate}`}
                        >
                          {item.relevance}
                        </span>
                        {item.redFlagRating > 0 && (
                          <span className={styles.redFlag}>
                            <Icon name="Flag" size="xs" />
                            {item.redFlagRating}
                          </span>
                        )}
                      </div>

                      {item.description && <p className={styles.description}>{item.description}</p>}

                      {item.notes && <p className={styles.notes}>Note: {item.notes}</p>}

                      <div className={styles.metaRow}>
                        <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                        <span>by {item.addedBy}</span>
                        {provenance.ingestRunId && (
                          <span className={styles.metaBadge}>run {provenance.ingestRunId}</span>
                        )}
                        <span className={styles.metaBadge}>ladder {provenance.ladder}</span>
                        <span className={styles.metaBadge}>
                          confidence{' '}
                          {provenance.confidence === null ? 'N/A' : provenance.confidence}
                        </span>
                        {provenance.wasAgentic && (
                          <span className={styles.agenticBadge}>agentic-derived</span>
                        )}
                        {link && (
                          <Link
                            to={link}
                            className={styles.sourceLink}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icon name="ExternalLink" size="xs" />
                            View Source
                          </Link>
                        )}
                      </div>
                      <div className={styles.sourceReason}>
                        Why in case: linked by investigator relevance "{item.relevance}" from{' '}
                        {item.sourcePath || 'unknown source'}
                        {provenance.pipelineVersion
                          ? ` • pipeline ${provenance.pipelineVersion}`
                          : ''}
                        {provenance.evidencePack ? ' • evidence pack available' : ''}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={styles.rowActions}>
                      {onEvidenceClick && (
                        <button
                          onClick={(e) => onEvidenceClick(item, e.currentTarget)}
                          ref={(el) => {
                            const key = String(item.investigationEvidenceId || item.id);
                            if (el) evidenceButtonRefs.current.set(key, el);
                            else evidenceButtonRefs.current.delete(key);
                          }}
                          className={styles.iconButton}
                          title="View Details"
                        >
                          <Icon name="Eye" size="sm" />
                        </button>
                      )}
                    </div>
                  </div>
                  {onEvidenceClick && (
                    <button
                      onClick={(e) => onEvidenceClick(item, e.currentTarget)}
                      className={styles.openButton}
                    >
                      Open evidence
                    </button>
                  )}
                </div>
              );
            })}
            {shouldVirtualize && endIndex < filteredEvidence.length && (
              <div style={{ height: (filteredEvidence.length - endIndex) * rowHeight }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationCaseFolder;
