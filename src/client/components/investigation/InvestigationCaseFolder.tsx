import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon, { type IconName } from '../common/Icon';
import { Link } from 'react-router-dom';
import type {
  InvestigationCaseEvidenceItemDto as EvidenceItem,
  InvestigationEvidenceByTypeResponseDto as EvidenceByType,
} from '@shared/dto/investigations';
import { useCaseFolder } from '../../domains/investigations';

interface InvestigationCaseFolderProps {
  investigationId: number | string;
  onEvidenceClick?: (evidence: EvidenceItem, triggerEl?: HTMLElement | null) => void;
  deepLinkedEvidenceId?: string | null;
  caseFolderData?: EvidenceByType | null;
  caseFolderLoading?: boolean;
  caseFolderError?: string | null;
  onReloadCaseFolder?: () => Promise<EvidenceByType | null> | void;
}

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  entity: { icon: 'User', label: 'Entities', color: 'cyan' },
  document: { icon: 'FileText', label: 'Documents', color: 'blue' },
  flight_log: { icon: 'Navigation', label: 'Flights', color: 'purple' },
  property_record: { icon: 'Building', label: 'Properties', color: 'emerald' },
  email: { icon: 'Mail', label: 'Emails', color: 'amber' },
  testimony: { icon: 'MessageSquare', label: 'Testimonies', color: 'pink' },
  financial: { icon: 'DollarSign', label: 'Financial', color: 'green' },
  legal: { icon: 'Scale', label: 'Legal', color: 'red' },
  photo: { icon: 'Image', label: 'Photos', color: 'indigo' },
  other: { icon: 'File', label: 'Other', color: 'slate' },
};

const relevanceColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-300 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-300 border-green-500/30',
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
    if (searchTerm) setSearchTerm('');
    if (relevanceFilter) setRelevanceFilter(null);
    if (selectedType !== match.type) setSelectedType(match.type || null);

    window.requestAnimationFrame(() => {
      const key = String(match.investigationEvidenceId || match.id);
      const rowButton = evidenceButtonRefs.current.get(key);
      if (rowButton) {
        rowButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
        rowButton.focus();
      }
    });
  }, [deepLinkedEvidenceId, evidence, relevanceFilter, searchTerm, selectedType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <Icon name="AlertCircle" size="lg" className="mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (!evidence || evidence.total === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        <Icon name="FolderOpen" size="xl" className="mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
          Case Folder is Empty
        </h3>
        <p className="text-sm">
          Add evidence from Subjects, Documents, Flights, Properties, or Emails
          <br />
          using the "Add to Investigation" button.
        </p>
      </div>
    );
  }

  const types = Object.keys(evidence.byType);

  return (
    <div className="case-folder space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* All Evidence */}
        <button
          onClick={() => setSelectedType(null)}
          className={`p-4 rounded-[var(--radius-lg)] border transition-all ${
            selectedType === null
              ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50 ring-2 ring-[var(--accent)]/30'
              : 'surface-glass hover:bg-[var(--glass-bg-highlight)]'
          }`}
        >
          <Icon name="Folder" size="md" className="mx-auto mb-2 text-[var(--accent)]" />
          <div className="text-2xl font-bold text-[var(--text-primary)]">{evidence.total}</div>
          <div className="text-xs text-[var(--text-muted)]">All Evidence</div>
        </button>

        {/* Type Cards */}
        {types.map((type) => {
          const config = typeConfig[type] || typeConfig.other;
          const count = evidence.counts[type] || 0;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type === selectedType ? null : type)}
              className={`p-4 rounded-[var(--radius-lg)] border transition-all ${
                selectedType === type
                  ? `bg-${config.color}-600/20 border-${config.color}-500/50 ring-2 ring-${config.color}-500/30`
                  : 'surface-glass hover:bg-[var(--glass-bg-highlight)]'
              }`}
            >
              <Icon
                name={config.icon as IconName}
                size="md"
                className={`mx-auto mb-2 text-${config.color}-400`}
              />
              <div className="text-2xl font-bold text-[var(--text-primary)]">{count}</div>
              <div className="text-xs text-[var(--text-muted)]">{config.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 surface-glass">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Icon
            name="Search"
            size="sm"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder="Search evidence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 surface-glass text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          />
        </div>

        {/* Relevance Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">Relevance:</span>
          {['high', 'medium', 'low'].map((rel) => (
            <button
              key={rel}
              onClick={() => setRelevanceFilter(rel === relevanceFilter ? null : rel)}
              className={`px-3 py-1.5 rounded-[var(--radius-lg)] text-xs font-medium border transition-colors ${
                relevanceFilter === rel
                  ? relevanceColors[rel]
                  : 'surface-glass text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
            className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Evidence List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {selectedType ? typeConfig[selectedType]?.label || selectedType : 'All Evidence'}
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              ({filteredEvidence.length} items)
            </span>
          </h3>
        </div>

        {filteredEvidence.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <p>No evidence matches your filters</p>
          </div>
        ) : (
          <div
            className="grid gap-3 max-h-[45rem] overflow-y-auto pr-1"
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
                  className={`p-4 surface-glass transition-colors ${
                    isDeepLinkedItem(item)
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40'
                      : 'hover:bg-[var(--glass-bg-highlight)]'
                  }`}
                  data-evidence-row-id={resolveEvidenceKey(item)}
                >
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-${config.color}-900/30 flex items-center justify-center`}
                    >
                      <Icon
                        name={config.icon as IconName}
                        size="md"
                        className={`text-${config.color}-400`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-[var(--text-primary)] truncate">
                          {item.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-xs rounded border ${relevanceColors[item.relevance] || 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]'}`}
                        >
                          {item.relevance}
                        </span>
                        {item.redFlagRating > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <Icon name="Flag" size="xs" />
                            {item.redFlagRating}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-xs text-[var(--text-muted)] italic mb-2">
                          Note: {item.notes}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                        <span>by {item.addedBy}</span>
                        {provenance.ingestRunId && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]">
                            run {provenance.ingestRunId}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]">
                          ladder {provenance.ladder}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]">
                          confidence{' '}
                          {provenance.confidence === null ? 'N/A' : provenance.confidence}
                        </span>
                        {provenance.wasAgentic && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-200">
                            agentic-derived
                          </span>
                        )}
                        {link && (
                          <Link
                            to={link}
                            className="text-[var(--accent)] hover:text-[var(--accent)] flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icon name="ExternalLink" size="xs" />
                            View Source
                          </Link>
                        )}
                      </div>
                      <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                        Why in case: linked by investigator relevance "{item.relevance}" from{' '}
                        {item.sourcePath || 'unknown source'}
                        {provenance.pipelineVersion
                          ? ` • pipeline ${provenance.pipelineVersion}`
                          : ''}
                        {provenance.evidencePack ? ' • evidence pack available' : ''}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {onEvidenceClick && (
                        <button
                          onClick={(e) => onEvidenceClick(item, e.currentTarget)}
                          ref={(el) => {
                            const key = String(item.investigationEvidenceId || item.id);
                            if (el) evidenceButtonRefs.current.set(key, el);
                            else evidenceButtonRefs.current.delete(key);
                          }}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] transition-colors"
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
                      className="mt-3 text-xs text-[var(--accent)] hover:text-cyan-200"
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
