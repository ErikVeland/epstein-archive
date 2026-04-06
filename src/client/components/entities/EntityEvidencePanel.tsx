import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Calendar,
  Tag,
  ExternalLink,
  User,
  BarChart3,
  Network,
  Mail,
  MessageCircle,
  Clock3,
  Fingerprint,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { EvidenceLadder } from '../evidence/EvidenceLadder';

import { NetworkVisualization } from '../visualizations/NetworkVisualization';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import styles from './EntityEvidencePanel.module.css';

interface Evidence {
  id: string | number;
  documentId?: string | number | null;
  evidenceType: string;
  title: string;
  description: string;
  sourcePath: string;
  cleanedPath: string;
  redFlagRating: number;
  createdAt: string;
  role: string;
  confidence: number;
  contextSnippet: string;
  ingestRunId?: string;
  wasAgentic?: boolean;
}

interface RelatedEntity {
  id: number;
  fullName: string;
  entityCategory: string;
  sharedEvidenceCount: number;
}

interface EntityEvidencePanelProps {
  entityId: string;
  entityName: string;
}

interface EvidenceTypeBreakdownItem {
  evidenceType: string;
  count: number;
}

interface RoleBreakdownItem {
  role: string;
  count: number;
}

interface EntityEvidenceStats {
  totalEvidence: number;
  highRiskCount: number;
  averageConfidence: number;
  typeBreakdown: EvidenceTypeBreakdownItem[];
  roleBreakdown: RoleBreakdownItem[];
  relatedEntities: RelatedEntity[];
}

interface RelationEvidenceEdge {
  id: string;
  subject_entity_id: number;
  object_entity_id: number;
  predicate: string;
  weight: number;
  evidence: {
    id: string;
    documentId: number | null;
    documentTitle?: string | null;
    quoteText?: string | null;
    confidence?: number | null;
  }[];
}

export const EntityEvidencePanel: React.FC<EntityEvidencePanelProps> = ({
  entityId,
  entityName,
}) => {
  const accessToNavigate = useNavigate();
  /* State for filtering and pagination */
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [stats, setStats] = useState<EntityEvidenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [relationEdges, setRelationEdges] = useState<RelationEvidenceEdge[]>([]);
  const [communications, setCommunications] = useState<
    {
      documentId: string;
      threadId: string;
      subject: string;
      date: string | null;
      from: string;
      to: string[];
      cc: string[];
      topic: string;
      snippet: string;
    }[]
  >([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [itemsToShow, setItemsToShow] = useState(10);
  const ITEMS_INCREMENT = 10;

  useEffect(() => {
    loadEntityEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const loadEntityEvidence = async () => {
    setLoading(true);
    try {
      const [evidenceRes, relationsRes, commsRes] = await Promise.all([
        fetch(`/api/entities/${entityId}/evidence`),
        fetch(`/api/entities/${entityId}/relations`),
        apiClient.getEntityCommunications(entityId, { limit: 50 }),
      ]);
      const evidenceData = await evidenceRes.json();
      const relationsData = await relationsRes.json();
      setEvidence(evidenceData.evidence || []);
      setStats(evidenceData.stats || null);
      setRelationEdges(Array.isArray(relationsData.relations) ? relationsData.relations : []);
      setCommunications(
        (commsRes.data || []) as {
          documentId: string;
          threadId: string;
          subject: string;
          date: string | null;
          from: string;
          to: string[];
          cc: string[];
          topic: string;
          snippet: string;
        }[],
      );
    } catch (error) {
      console.error('Error loading entity evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEvidenceTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      sender: styles.roleChipSender,
      recipient: styles.roleChipRecipient,
      mentioned: styles.roleChipMentioned,
      passenger: styles.roleChipPassenger,
      deponent: styles.roleChipDeponent,
      subject: styles.roleChipSubject,
    };
    return colors[role.toLowerCase()] || styles.roleChipDefault;
  };

  const filteredEvidence = evidence.filter((e) => {
    const matchesType = filterType === 'all' || e.evidenceType === filterType;
    const matchesRole = filterRole === 'all' || e.role === filterRole;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (e.title && e.title.toLowerCase().includes(searchLower)) ||
      (e.description && e.description.toLowerCase().includes(searchLower)) ||
      (e.contextSnippet && e.contextSnippet.toLowerCase().includes(searchLower));
    return matchesType && matchesRole && matchesSearch;
  });

  // Reset pagination when filters change
  useEffect(() => {
    setItemsToShow(ITEMS_INCREMENT);
  }, [filterType, filterRole, searchTerm]);

  const visibleEvidence = filteredEvidence.slice(0, itemsToShow);
  const hasMore = itemsToShow < filteredEvidence.length;

  const resolveDocumentId = (item: Evidence): string | null => {
    const raw = item.documentId ?? item.id;
    if (raw === null || raw === undefined) return null;
    const asString = String(raw).trim();
    return /^\d+$/.test(asString) ? asString : null;
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingText}>Loading evidence...</div>
      </div>
    );
  }

  if (!stats || evidence.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FileText className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>No Evidence Found</h3>
        <p className={styles.emptySubtext}>No evidence has been linked to {entityName} yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCardInfo}>
          <div className={`${styles.statLabel} ${styles.statLabelInfo}`}>Total Evidence</div>
          <div className={`${styles.statValue} ${styles.statValueInfo}`}>{stats.totalEvidence}</div>
        </div>
        <div className={styles.statCardDanger}>
          <div className={`${styles.statLabel} ${styles.statLabelDanger}`}>High Risk Items</div>
          <div className={`${styles.statValue} ${styles.statValueDanger}`}>
            {stats.highRiskCount}
          </div>
        </div>
        <div className={styles.statCardAccent}>
          <div className={`${styles.statLabel} ${styles.statLabelInfo}`}>Avg Confidence</div>
          <div className={`${styles.statValue} ${styles.statValueInfo}`}>
            {Math.round(stats.averageConfidence * 100)}%
          </div>
        </div>
        <div className={styles.statCardSuccess}>
          <div className={`${styles.statLabel} ${styles.statLabelSuccess}`}>Evidence Types</div>
          <div className={`${styles.statValue} ${styles.statValueSuccess}`}>
            {stats.typeBreakdown.length}
          </div>
        </div>
      </div>

      {/* Type Breakdown */}
      <div className="surface-glass-card">
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <BarChart3 className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Evidence Type Distribution</h3>
          </div>
          <div className={styles.innerList}>
            {stats.typeBreakdown.map((item) => (
              <div key={item.evidenceType} className={styles.typeRow}>
                <span className={styles.typeLabel}>{getEvidenceTypeLabel(item.evidenceType)}</span>
                <div className={styles.typeBarGroup}>
                  <div className={styles.typeBarTrack}>
                    <div
                      className={styles.typeBarFill}
                      style={{ width: `${(item.count / stats.totalEvidence) * 100}%` }}
                    />
                  </div>
                  <span className={styles.typeCount}>{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Breakdown */}
      {stats.roleBreakdown.length > 0 && (
        <div className="surface-glass-card">
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <User className={styles.sectionIcon} />
              <h3 className={styles.sectionTitle}>Role Distribution</h3>
            </div>
            <div className={styles.roleList}>
              {stats.roleBreakdown.map((item) => (
                <span
                  key={item.role}
                  className={`${styles.roleChipBase} ${getRoleColor(item.role)}`}
                >
                  {item.role}: {item.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Related Entities */}
      {stats.relatedEntities.length > 0 && (
        <div className="surface-glass-card">
          <div className={styles.section}>
            <div className={styles.relatedHeader}>
              <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
                <Network className={styles.sectionIcon} />
                <h3 className={styles.sectionTitle}>Frequently Co-appears With</h3>
              </div>
              <div className={styles.viewToggle}>
                <button
                  onClick={() => setViewMode('list')}
                  className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : styles.viewToggleBtnInactive}`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  className={`${styles.viewToggleBtn} ${viewMode === 'graph' ? styles.viewToggleBtnActive : styles.viewToggleBtnInactive}`}
                >
                  Graph
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className={styles.relatedGrid}>
                {stats.relatedEntities.slice(0, 10).map((entity: RelatedEntity) => (
                  <Link key={entity.id} to={`/entity/${entity.id}`} className={styles.relatedLink}>
                    <span className={styles.relatedName}>{entity.fullName}</span>
                    <span className={styles.relatedShared}>
                      {entity.sharedEvidenceCount} shared
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.graphContainer}>
                <NetworkVisualization
                  nodes={[
                    {
                      id: entityId,
                      label: entityName,
                      type: 'person',
                      importance: 5,
                      metadata: { category: 'target' },
                    },
                    ...stats.relatedEntities.slice(0, 15).map((e: RelatedEntity) => ({
                      id: String(e.id),
                      label: e.fullName,
                      type: 'person' as const,
                      importance: Math.min(
                        5,
                        Math.max(1, Math.ceil(Math.log(e.sharedEvidenceCount) * 1.5)),
                      ),
                      metadata: {
                        connections: [entityId],
                        category: e.entityCategory,
                      },
                    })),
                  ]}
                  edges={stats.relatedEntities.slice(0, 15).map((e: RelatedEntity) => ({
                    id: `${entityId}-${e.id}`,
                    source: entityId,
                    target: String(e.id),
                    type: 'connection',
                    strength: Math.min(
                      10,
                      Math.max(1, Math.ceil(Math.log(e.sharedEvidenceCount) * 2)),
                    ),
                    metadata: {
                      frequency: e.sharedEvidenceCount,
                    },
                  }))}
                  height={400}
                  interactive={true}
                  onNodeClick={(node) => {
                    if (node.id !== entityId && accessToNavigate) {
                      accessToNavigate(`/entity/${node.id}`);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email / Communications Activity */}
      {communications.length > 0 && (
        <div className="surface-glass-card">
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Mail className={styles.sectionIcon} />
              <h3 className={styles.sectionTitle}>Email Communications</h3>
            </div>
            <p className={styles.commsIntro}>
              Recent email threads where <span className={styles.commsHighlight}>{entityName}</span>{' '}
              appears. Topics are heuristic but stable labels to help you scan conspiracies at a
              glance.
            </p>
            <div className={styles.commsScroll}>
              {communications.slice(0, 25).map((c) => (
                <div key={`${c.threadId}-${c.documentId}`} className={styles.commCard}>
                  <div className={styles.commTopRow}>
                    <div>
                      <div className={styles.commSubjectRow}>
                        <MessageCircle className={styles.commIcon} />
                        <span className={styles.commSubject}>{c.subject || 'No subject'}</span>
                      </div>
                      <div className={styles.commMeta}>
                        <span className={styles.commFrom}>{c.from}</span>
                        <span>→</span>
                        <span className={styles.commTo}>
                          {c.to && c.to.length > 0 ? c.to.join(', ') : 'Unknown recipients'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.commRight}>
                      {c.date && (
                        <div className={styles.commDate}>
                          <Clock3 className={styles.commDateIcon} />
                          <span>{c.date}</span>
                        </div>
                      )}
                      <span className={styles.commTopicBadge}>
                        <Tag className={styles.commTopicIcon} />
                        {c.topic.replace('_', ' ')}
                      </span>
                      <div className={styles.commActions}>
                        <Link
                          to={`/emails?search=${encodeURIComponent(c.subject)}`}
                          className={styles.commActionLink}
                          title="View Thread"
                        >
                          <ExternalLink className={styles.commActionIcon} />
                        </Link>
                        <AddToInvestigationButton
                          item={{
                            id: `email-${c.documentId}`,
                            title: `Email: ${c.subject}`,
                            description: `Communication from ${c.from}`,
                            type: 'evidence',
                            sourceId: c.documentId,
                            metadata: {
                              threadId: c.threadId,
                              from: c.from,
                              to: c.to,
                            },
                          }}
                          variant="icon"
                          className={styles.commActionLink}
                        />
                      </div>
                    </div>
                  </div>
                  {c.snippet && <p className={styles.commSnippet}>{c.snippet}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Relation Evidence (graph edges with quotes) */}
      {relationEdges.length > 0 && (
        <div className="surface-glass-card p-5">
          <div className="flex items-center space-x-2 mb-4">
            <Network className="w-5 h-5 text-[var(--text-muted)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Relation Evidence</h3>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--glass-border-highlight)]">
            {relationEdges.slice(0, 25).map((rel) => (
              <div
                key={rel.id}
                className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {rel.predicate || 'related_to'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">weight {rel.weight ?? 1}</span>
                </div>
                {rel.evidence && rel.evidence.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {rel.evidence.slice(0, 3).map((ev) => (
                      <li key={ev.id} className="text-xs text-[var(--text-muted)]">
                        {ev.documentTitle && (
                          <span className="font-medium text-[var(--text-secondary)]">
                            {ev.documentTitle}
                          </span>
                        )}
                        {ev.quoteText && (
                          <span className="block text-[var(--text-muted)] italic truncate">
                            “{ev.quoteText}”
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="surface-glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Evidence Items</h3>
            <span className="text-sm text-[var(--text-muted)]">({filteredEvidence.length})</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Filter evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-[var(--glass-border)] bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] px-3 py-2 text-sm focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-muted)]"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-[var(--glass-border)] bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] px-3 py-2 text-sm focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            >
              <option value="all">All Types</option>
              {stats.typeBreakdown.map((item) => (
                <option key={item.evidenceType} value={item.evidenceType}>
                  {getEvidenceTypeLabel(item.evidenceType)}
                </option>
              ))}
            </select>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-[var(--glass-border)] bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] px-3 py-2 text-sm focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            >
              <option value="all">All Roles</option>
              {stats.roleBreakdown.map((item) => (
                <option key={item.role} value={item.role}>
                  {item.role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Evidence List */}
        <div className="space-y-3">
          {visibleEvidence.map((item) => {
            const documentId = resolveDocumentId(item);
            return (
              <div
                key={item.id}
                className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 hover:bg-[var(--glass-bg-highlight)]/50 transition bg-[var(--glass-bg)]/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                      <h4 className="font-semibold text-[var(--text-primary)]">
                        {item.title || 'Untitled'}
                      </h4>
                    </div>
                    {item.description && (
                      <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">
                        {item.description}
                      </p>
                    )}
                    {item.contextSnippet && (
                      <p className="text-xs text-[var(--text-muted)] italic bg-yellow-900/20 p-2 rounded border-l-2 border-yellow-600/50 text-yellow-200/90 break-words">
                        "{item.contextSnippet}"
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-1 ml-4">
                    {item.role && (
                      <span className={`text-xs px-2 py-1 rounded ${getRoleColor(item.role)}`}>
                        {item.role}
                      </span>
                    )}
                    {item.redFlagRating > 0 && (
                      <div className="flex items-center space-x-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-semibold text-[var(--accent-danger)]">
                          {item.redFlagRating}
                        </span>
                      </div>
                    )}
                    {item.wasAgentic && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 border border-purple-500/20 text-[var(--accent)] text-[10px] uppercase font-bold">
                        <Fingerprint size={10} />
                        Agentic
                      </div>
                    )}
                    {item.confidence && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {Math.round(item.confidence * 100)}% conf
                      </span>
                    )}
                  </div>
                </div>

                {/* Forensic Details (Hidden by default, toggle or tooltip could be here) */}
                <div className="mt-3 overflow-hidden">
                  <EvidenceLadder
                    level={
                      item.evidenceType === 'entity_creation' ? 3 : item.confidence > 0.8 ? 1 : 2
                    }
                    confidence={item.confidence}
                    ingestRunId={item.ingestRunId}
                    wasAgentic={item.wasAgentic}
                    className="bg-[var(--glass-bg)] p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)]"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--glass-border)] mt-3">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Tag className="w-3 h-3" />
                      <span>{getEvidenceTypeLabel(item.evidenceType)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                  {documentId ? (
                    <Link
                      to={`/documents?id=${documentId}`}
                      className="flex items-center space-x-1 text-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-[var(--text-primary)]">No document link</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Check */}
        {hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setItemsToShow((prev) => prev + ITEMS_INCREMENT)}
              className="px-4 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] text-sm font-medium transition-colors"
            >
              Show More ({filteredEvidence.length - itemsToShow} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
