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
      <div className="surface-panel">
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
        <div className="surface-panel">
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
        <div className="surface-panel">
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
        <div className="surface-panel">
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
        <div className={`surface-panel ${styles.sectionCard}`}>
          <div className={styles.sectionHeader}>
            <Network className={styles.sectionIcon} />
            <h3 className={styles.sectionTitle}>Relation Evidence</h3>
          </div>
          <div className={styles.relationList}>
            {relationEdges.slice(0, 25).map((rel) => (
              <div key={rel.id} className={styles.relationCard}>
                <div className={styles.relationHeader}>
                  <span className={styles.relationPredicate}>{rel.predicate || 'related_to'}</span>
                  <span className={styles.relationWeight}>weight {rel.weight ?? 1}</span>
                </div>
                {rel.evidence && rel.evidence.length > 0 && (
                  <ul className={styles.relationEvidenceList}>
                    {rel.evidence.slice(0, 3).map((ev) => (
                      <li key={ev.id} className={styles.relationEvidenceItem}>
                        {ev.documentTitle && (
                          <span className={styles.relationEvidenceTitle}>{ev.documentTitle}</span>
                        )}
                        {ev.quoteText && (
                          <span className={styles.relationEvidenceQuote}>“{ev.quoteText}”</span>
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
      <div className={`surface-panel ${styles.sectionCard}`}>
        <div className={styles.evidenceHeader}>
          <div className={styles.evidenceHeaderTitleGroup}>
            <h3 className={styles.sectionTitle}>Evidence Items</h3>
            <span className={styles.evidenceCount}>({filteredEvidence.length})</span>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterSearchWrap}>
            <input
              type="text"
              placeholder="Filter evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.filterInput}
            />
          </div>
          <div className={styles.filterSelectGroup}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={styles.filterSelect}
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
              className={styles.filterSelect}
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
        <div className={styles.evidenceList}>
          {visibleEvidence.map((item) => {
            const documentId = resolveDocumentId(item);
            return (
              <div key={item.id} className={styles.evidenceCard}>
                <div className={styles.evidenceCardHeader}>
                  <div className={styles.evidenceCardMain}>
                    <div className={styles.evidenceTitleRow}>
                      <FileText className={styles.evidenceTitleIcon} />
                      <h4 className={styles.evidenceTitle}>{item.title || 'Untitled'}</h4>
                    </div>
                    {item.description && (
                      <p className={styles.evidenceDescription}>{item.description}</p>
                    )}
                    {item.contextSnippet && (
                      <p className={styles.contextSnippet}>"{item.contextSnippet}"</p>
                    )}
                  </div>
                  <div className={styles.evidenceBadgeColumn}>
                    {item.role && (
                      <span
                        className={`${styles.roleChipBase} ${styles.itemRoleChip} ${getRoleColor(item.role)}`}
                      >
                        {item.role}
                      </span>
                    )}
                    {item.redFlagRating > 0 && (
                      <div className={styles.redFlagBadge}>
                        <AlertTriangle className={styles.redFlagIcon} />
                        <span className={styles.redFlagValue}>{item.redFlagRating}</span>
                      </div>
                    )}
                    {item.wasAgentic && (
                      <div className={styles.agenticBadge}>
                        <Fingerprint size={10} />
                        Agentic
                      </div>
                    )}
                    {item.confidence && (
                      <span className={styles.confidenceText}>
                        {Math.round(item.confidence * 100)}% conf
                      </span>
                    )}
                  </div>
                </div>

                {/* Forensic Details (Hidden by default, toggle or tooltip could be here) */}
                <div className={styles.evidenceLadderWrap}>
                  <EvidenceLadder
                    level={
                      item.evidenceType === 'entity_creation' ? 3 : item.confidence > 0.8 ? 1 : 2
                    }
                    confidence={item.confidence}
                    ingestRunId={item.ingestRunId}
                    wasAgentic={item.wasAgentic}
                    className={styles.evidenceLadder}
                  />
                </div>

                <div className={styles.evidenceFooter}>
                  <div className={styles.evidenceFooterMeta}>
                    <span className={styles.evidenceFooterItem}>
                      <Tag className={styles.evidenceFooterIcon} />
                      <span>{getEvidenceTypeLabel(item.evidenceType)}</span>
                    </span>
                    <span className={styles.evidenceFooterItem}>
                      <Calendar className={styles.evidenceFooterIcon} />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                  {documentId ? (
                    <Link to={`/documents?id=${documentId}`} className={styles.viewLink}>
                      <span>View</span>
                      <ExternalLink className={styles.viewLinkIcon} />
                    </Link>
                  ) : (
                    <span className={styles.noDocumentLink}>No document link</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Check */}
        {hasMore && (
          <div className={styles.loadMoreWrap}>
            <button
              onClick={() => setItemsToShow((prev) => prev + ITEMS_INCREMENT)}
              className={styles.loadMoreButton}
            >
              Show More ({filteredEvidence.length - itemsToShow} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
