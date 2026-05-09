import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import s from './EnhancedAnalytics.module.css';
import { SunburstChart } from '../visualizations/SunburstChart';
import { DocumentBarChart } from '../visualizations/DocumentBarChart';
import { NetworkGraph } from '../visualizations/NetworkGraph';
import { EvidenceDrawer } from '../visualizations/EvidenceDrawer';
import { filterPeopleOnly } from '@client/utils/entityFilters';
import { InteractiveEntityMap } from '../visualizations/InteractiveEntityMap';
import { useFilters } from '@client/contexts/useFilters';
import { useAnalytics } from '@client/contexts/AnalyticsContextState';
import { apiClient } from '@client/services/apiClient';
import type { Evidence } from '../visualizations/EvidenceDrawer';
import type { Person } from '@client/types';
import { Button, Input, Surface } from '@client/design-system/lib';
import { useToasts } from '@client/components/common/useToasts';
/** Raw node shape returned by /graph/global and /graph/global?mode=path */
interface GraphApiNode {
  id: string | number;
  label: string;
  risk?: number;
  image?: string;
  type?: string;
  [key: string]: unknown;
}

/** Raw edge shape returned by /graph/global */
interface GraphApiEdge {
  source: string | number;
  target: string | number;
  type?: string;
  weight?: number;
}

/** Mapped node passed to NetworkGraph — must satisfy EntityNode */
interface MappedGraphNode {
  id: string | number;
  name: string;
  label?: string;
  riskLevel?: number;
  risk?: number;
  photoUrl?: string;
  image?: string;
  type?: string;
  connectionCount: number;
  mentions?: number;
  val?: number;
}

/** Mapped edge passed to NetworkGraph — must satisfy Relationship */
interface MappedGraphEdge {
  source: string;
  target: string;
  sourceId: string | number;
  targetId: string | number;
  type?: string;
  strength?: number;
  weight?: number;
}

/** Relationship metadata returned by /graph/edge-evidence */
interface EdgeRelationshipDetails {
  relationship_type?: string;
  [key: string]: unknown;
}

/** Raw payload returned by /graph/edge-evidence */
interface EdgeEvidenceApiResponse {
  documents: Evidence[];
  relationship: EdgeRelationshipDetails;
}

/** Raw payload returned by /graph/global */
interface GlobalGraphApiResponse {
  nodes: GraphApiNode[];
  edges: GraphApiEdge[];
}

interface AnalyticsData {
  documentsByType: Array<{ type: string; count: number; redacted: number; avgRisk: number }>;
  timelineData: Array<{
    period: string;
    total: number;
    emails: number;
    photos: number;
    documents: number;
    financial: number;
  }>;
  topConnectedEntities: Array<{
    id: number;
    name: string;
    role: string;
    type: string;
    riskLevel: number;
    connectionCount: number;
    mentions: number;
  }>;
  entityTypeDistribution: Array<{ type: string; count: number; avgRisk: number }>;
  redactionStats: {
    totalDocuments: number;
    redactedDocuments: number;
    redactionPercentage: number;
    totalRedactions: number;
  };
  topRelationships: Array<{
    sourceId: number;
    targetId: number;
    source: string;
    target: string;
    type: string;
    weight: number;
  }>;
  totalCounts: {
    entities: number;
    documents: number;
    evidenceFiles: number;
    relationships: number;
  };
  reconciliation: {
    unclassifiedCount: number;
    unknownDateCount: number;
  };
}

function normalizeAnalyticsPayload(raw: unknown): AnalyticsData {
  const r = raw as Record<string, unknown>;
  const totalCounts = (r?.totalCounts ?? {}) as Record<string, unknown>;
  const reconciliation = (r?.reconciliation ?? {}) as Record<string, unknown>;
  const redactionStats = (r?.redactionStats ?? {}) as Record<string, unknown>;

  return {
    documentsByType: Array.isArray(r?.documentsByType)
      ? (r.documentsByType as AnalyticsData['documentsByType'])
      : [],
    timelineData: Array.isArray(r?.timelineData)
      ? (r.timelineData as AnalyticsData['timelineData'])
      : [],
    topConnectedEntities: Array.isArray(r?.topConnectedEntities)
      ? (r.topConnectedEntities as AnalyticsData['topConnectedEntities'])
      : [],
    entityTypeDistribution: Array.isArray(r?.entityTypeDistribution)
      ? (r.entityTypeDistribution as AnalyticsData['entityTypeDistribution'])
      : [],
    redactionStats: {
      totalDocuments: Number(redactionStats.totalDocuments || 0),
      redactedDocuments: Number(redactionStats.redactedDocuments || 0),
      redactionPercentage: Number(redactionStats.redactionPercentage || 0),
      totalRedactions: Number(redactionStats.totalRedactions || 0),
    },
    topRelationships: Array.isArray(r?.topRelationships)
      ? (r.topRelationships as AnalyticsData['topRelationships'])
      : [],
    totalCounts: {
      entities: Number(totalCounts.entities || 0),
      documents: Number(totalCounts.documents || 0),
      evidenceFiles: Number(totalCounts.evidenceFiles || 0),
      relationships: Number(totalCounts.relationships || 0),
    },
    reconciliation: {
      unclassifiedCount: Number(reconciliation.unclassifiedCount || 0),
      unknownDateCount: Number(reconciliation.unknownDateCount || 0),
    },
  };
}

// Helper component for stat cards
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sublabel?: string;
}> = ({ icon, value, label, sublabel }) => (
  <Surface className={s.statCard}>
    <div className={s.statCardContent}>
      <div className={s.statCardHeader}>
        {icon}
        <span className={s.statCardLabel}>{label}</span>
      </div>
      <div className={s.statCardValue}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sublabel && <div className={s.statCardSublabel}>{sublabel}</div>}
    </div>
  </Surface>
);

export const EnhancedAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const backLinkState = useBackLinkState();
  const { filters, setFilters } = useFilters();
  const { onPersonSelect, filteredPeople } = useAnalytics();
  const { addToast } = useToasts();

  const onEntitySelect = (entityId: number) => {
    const person = filteredPeople.find((p) => Number(p.id) === entityId);
    if (person && onPersonSelect) {
      onPersonSelect(person);
    }
  };

  const onTypeFilter = (type: string) => {
    navigate(`/documents?evidenceType=${encodeURIComponent(type)}`, { state: backLinkState });
  };
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch: refetchAnalytics,
  } = useQuery<AnalyticsData>({
    queryKey: ['enhanced-analytics', filters.timeRange],
    queryFn: async () => {
      const result = await apiClient.get<unknown>('/analytics/enhanced', { useCache: false });
      const normalized = normalizeAnalyticsPayload(result);
      if (normalized.topConnectedEntities) {
        normalized.topConnectedEntities = filterPeopleOnly(
          normalized.topConnectedEntities as unknown as Person[],
        ) as unknown as AnalyticsData['topConnectedEntities'];
      }
      if (normalized.topRelationships && normalized.topConnectedEntities) {
        const validIds = new Set(normalized.topConnectedEntities.map((e) => e.id));
        normalized.topRelationships = normalized.topRelationships.filter(
          (r) => validIds.has(r.sourceId) && validIds.has(r.targetId),
        );
      }
      return normalized;
    },
    staleTime: 5 * 60 * 1000, // 5 min — analytics data doesn't change per-request
    retry: 1,
  });
  const error =
    queryError instanceof Error ? queryError.message : queryError ? 'Unknown error' : null;

  // LOD Graph State
  const [graphData, setGraphData] = useState<{
    nodes: MappedGraphNode[];
    edges: MappedGraphEdge[];
  } | null>(null);
  const [graphMode, setGraphMode] = useState<'default' | 'cluster'>('default');
  const [isGraphLoading, setIsGraphLoading] = useState(false);

  // Evidence Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<MappedGraphEdge | null>(null);
  const [edgeEvidence, setEdgeEvidence] = useState<Evidence[]>([]);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
  const [edgeDetails, setEdgeDetails] = useState<EdgeRelationshipDetails | null>(null);

  // Path Finding State
  const [pathMode, setPathMode] = useState(false);
  const [pathSource, setPathSource] = useState<MappedGraphNode | null>(null);
  const [pathTarget, setPathTarget] = useState<MappedGraphNode | null>(null);

  // Junk Reset Confirmation State
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handlePathNodeClick = (entity: MappedGraphNode) => {
    if (!pathSource) {
      setPathSource(entity);
    } else if (!pathTarget && String(entity.id) !== String(pathSource.id)) {
      setPathTarget(entity);
      fetchPath(String(pathSource.id), String(entity.id));
    } else {
      // Reset start if clicking again
      setPathSource(entity);
      setPathTarget(null);
    }
  };

  const fetchPath = async (sourceId: string, targetId: string) => {
    setIsGraphLoading(true);
    try {
      const [startDate, endDate] = filters.timeRange;
      const endpoint = `/graph/global?mode=path&sourceId=${sourceId}&targetId=${targetId}&startDate=${startDate || ''}&endDate=${endDate || ''}`;

      const pathData = await apiClient.get<GlobalGraphApiResponse>(endpoint, { useCache: false });
      if (!pathData || !Array.isArray(pathData.nodes) || !Array.isArray(pathData.edges)) {
        throw new Error('Path fetch failed');
      }

      if (pathData.nodes.length === 0) {
        addToast({ text: 'No path found between these entities (within 6 hops)', type: 'warning' });
        setPathSource(null);
        setPathTarget(null);
        return;
      }

      const mappedNodes: MappedGraphNode[] = pathData.nodes.map((n) => ({
        ...n,
        name: n.label,
        riskLevel: n.risk,
        connectionCount: 0,
        val: 20, // Highlight size
      }));
      const mappedEdges: MappedGraphEdge[] = pathData.edges.map((e) => ({
        source: String(e.source),
        target: String(e.target),
        sourceId: e.source,
        targetId: e.target,
        type: 'path',
        strength: e.weight,
      }));

      // Replace graph with path view
      setGraphData({ nodes: mappedNodes, edges: mappedEdges });
      setPathMode(false); // Exit selection mode
      setPathSource(null);
      setPathTarget(null);
    } catch (e) {
      console.error('Path Fetch Error:', e);
    } finally {
      setIsGraphLoading(false);
    }
  };

  // Sync initial graph data
  useEffect(() => {
    if (data?.topConnectedEntities) {
      setGraphData({
        nodes: data.topConnectedEntities.map((e) => ({ ...e, connectionCount: e.connectionCount })),
        edges: data.topRelationships.map((r) => ({
          ...r,
          strength: r.weight,
        })),
      });
      setFilters({ limit: data.topConnectedEntities.length });
    }
  }, [data, setFilters]);

  // Handle Zoom LOD
  const handleZoomLevelChange = React.useCallback(
    async (zoom: number) => {
      // Thresholds:
      // < 0.5: Super Cluster (Aggregated)
      // 0.5 - 1.0: 100 nodes (Overview)
      // 1.0 - 2.5: 500 nodes
      // > 2.5: 1500 nodes (Max Detail)

      let targetLimit = 100;
      let targetMode: 'default' | 'cluster' = 'default';

      if (zoom < 0.5) {
        targetMode = 'cluster';
        targetLimit = 50;
      } else if (zoom > 2.5) {
        targetLimit = 1500;
      } else if (zoom > 1.0) {
        targetLimit = 500;
      }

      // Fetch if:
      // 1. Mode changed (Cluster <-> Default)
      // 2. Limit increased in Default mode
      const needsFetch =
        targetMode !== graphMode || (targetMode === 'default' && targetLimit > filters.limit);

      if (needsFetch && !isGraphLoading) {
        console.log(`Zoom ${zoom.toFixed(2)} -> Fetching ${targetMode} / ${targetLimit}...`);

        // Optimistic updates
        setFilters({ limit: targetLimit });
        setGraphMode(targetMode);
        setIsGraphLoading(true);

        try {
          const [startDate, endDate] = filters.timeRange;
          const endpoint =
            targetMode === 'cluster'
              ? `/graph/global?mode=cluster&startDate=${startDate || ''}&endDate=${endDate || ''}`
              : `/graph/global?limit=${targetLimit}&startDate=${startDate || ''}&endDate=${endDate || ''}`;

          const newData = await apiClient.get<GlobalGraphApiResponse>(endpoint, {
            useCache: false,
          });
          if (!newData || !Array.isArray(newData.nodes) || !Array.isArray(newData.edges)) {
            throw new Error('Invalid graph payload');
          }

          // Map to Legacy Interface expectations
          const mappedNodes: MappedGraphNode[] = newData.nodes.map((n) => ({
            ...n,
            name: n.label,
            riskLevel: n.risk,
            photoUrl: n.image,
            connectionCount: 0,
          }));

          const mappedEdges: MappedGraphEdge[] = newData.edges.map((e) => ({
            source: String(e.source),
            target: String(e.target),
            sourceId: e.source,
            targetId: e.target,
            type: e.type || 'association',
            strength: e.weight ?? 0.5,
          }));

          setGraphData({ nodes: mappedNodes, edges: mappedEdges });
        } catch (e) {
          console.error('LOD Fetch Error:', e);
        } finally {
          setIsGraphLoading(false);
        }
      }
    },
    [graphMode, filters.limit, isGraphLoading, filters.timeRange, setFilters],
  );

  const evidenceCache = React.useRef<Map<string, Evidence[]>>(new Map());

  const handleEdgeClick = async (edge: MappedGraphEdge) => {
    setSelectedEdge(edge);
    setIsDrawerOpen(true);

    // Generate cache key
    const cacheKey = `${edge.sourceId}-${edge.targetId}`;

    // Check cache
    if (evidenceCache.current.has(cacheKey)) {
      setEdgeEvidence(evidenceCache.current.get(cacheKey)!);
      setEdgeDetails(null); // Metadata might be cached too if we expanded the cache structure, but for now just docs
      setIsEvidenceLoading(false);
      return;
    }

    setIsEvidenceLoading(true);
    setEdgeEvidence([]);

    try {
      const endpoint = `/graph/edge-evidence?sourceId=${edge.sourceId}&targetId=${edge.targetId}`;
      const data = await apiClient.get<EdgeEvidenceApiResponse>(endpoint, { useCache: true });
      if (!data || !Array.isArray(data.documents)) throw new Error('Failed to fetch evidence');

      // Cache the documents result
      evidenceCache.current.set(cacheKey, data.documents);

      setEdgeEvidence(data.documents);
      setEdgeDetails(data.relationship);
    } catch (e) {
      console.error('Edge Evidence Error:', e);
    } finally {
      setIsEvidenceLoading(false);
    }
  };

  useEffect(() => {
    if (data) {
      handleZoomLevelChange(1.0); // Trigger a refresh at current zoom
    }
  }, [filters.timeRange, data, handleZoomLevelChange]);

  const handleReconcileJunk = async () => {
    try {
      await apiClient.post('/analytics/reconcile/junk');
      addToast({ text: 'Junk entities re-classified', type: 'success' });
      void refetchAnalytics();
    } catch (error) {
      addToast({ text: 'Failed to reconcile junk entities', type: 'error' });
      console.error('Error reconciling junk:', error);
    }
  };

  const handleResetJunk = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    setShowResetConfirm(false);
    try {
      await apiClient.post('/analytics/reconcile/reset');
      addToast({ text: 'Junk classification reset', type: 'success' });
      void refetchAnalytics();
    } catch (error) {
      addToast({ text: 'Failed to reset junk classification', type: 'error' });
      console.error(error);
    }
  };

  const documentsByCategory = useMemo(() => {
    const buckets = new Map<
      string,
      { type: string; count: number; redacted: number; avgRisk: number }
    >();
    const classifyType = (rawType: string) => {
      const t = String(rawType || '').toLowerCase();
      if (t.includes('pdf')) return 'PDF';
      if (t.includes('message/rfc822') || t.includes('email')) return 'Email';
      if (t.includes('image')) return 'Image';
      if (t.includes('video')) return 'Video';
      if (t.includes('audio')) return 'Audio';
      if (t.includes('html') || t.includes('plain') || t.includes('text')) return 'Text';
      return 'Other';
    };

    for (const row of data?.documentsByType || []) {
      const key = classifyType(row.type);
      const existing = buckets.get(key) || { type: key, count: 0, redacted: 0, avgRisk: 0 };
      const nextCount = existing.count + Number(row.count || 0);
      const weightedRisk =
        existing.avgRisk * existing.count + Number(row.avgRisk || 0) * Number(row.count || 0);
      buckets.set(key, {
        type: key,
        count: nextCount,
        redacted: existing.redacted + Number(row.redacted || 0),
        avgRisk: nextCount > 0 ? weightedRisk / nextCount : 0,
      });
    }

    return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  }, [data?.documentsByType]);

  if (loading) {
    return (
      <div className={s.loadingWrapper}>
        <div className={s.loadingInner}>
          <div className={`${s.spin} ${s.loadingSpinner}`} />
          <p className={`${s.pulse} ${s.loadingText}`}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={s.errorWrapper}>
        <p className={s.errorText}>{error || 'No data available'}</p>
        <Button unstyled onClick={() => void refetchAnalytics()} className={s.retryButton}>
          Retry
        </Button>
      </div>
    );
  }

  const { redactionStats, topConnectedEntities, topRelationships } = data;
  const networkEntities: MappedGraphNode[] =
    graphData?.nodes ||
    topConnectedEntities.map((entity) => ({
      ...entity,
      connectionCount: Number(entity.connectionCount || 0),
    }));
  const networkRelationships: MappedGraphEdge[] =
    graphData?.edges ||
    topRelationships.map((relationship) => ({
      ...relationship,
      sourceId: relationship.sourceId,
      targetId: relationship.targetId,
      source: relationship.source,
      target: relationship.target,
      strength: relationship.weight,
    }));
  const totalDocumentsCount = Number(data.totalCounts?.documents || 0);
  const evidenceFilesCount = Number(data.totalCounts?.evidenceFiles || 0);
  const unclassifiedCount = Number(data.reconciliation?.unclassifiedCount || 0);
  const archiveIntegrityPct =
    totalDocumentsCount > 0 ? Math.round((evidenceFilesCount / totalDocumentsCount) * 100) : 0;

  return (
    <div className={`${s.page} ${s.fadeIn}`}>
      {/* Entity Network - Full Width - MOVED TO TOP */}
      <Surface variant="panel" className={s.networkSection}>
        {/* Archive Reconciliation Header Indicator */}
        {data && (
          <div className={s.archiveBadgeWrap}>
            <div className={s.archiveBadge} data-status={unclassifiedCount > 0 ? 'warn' : 'ok'}>
              <Icon name="Database" size="xs" className={s.archiveBadgeDatabaseIcon} />
              <span>Archive Integrity: {archiveIntegrityPct}% Classified</span>
              {unclassifiedCount > 0 && (
                <div className={s.tooltipGroup}>
                  <Icon name="Info" size="xs" className={s.archiveBadgeIcon} />
                  <div className={s.tooltip}>
                    <p className={s.tooltipTitle}>Reconciliation Report</p>
                    <ul className={s.tooltipList}>
                      <li className={s.tooltipRow}>
                        <span>Total Records:</span>
                        <span className={s.tooltipMono}>
                          {totalDocumentsCount.toLocaleString()}
                        </span>
                      </li>
                      <li className={s.tooltipRow}>
                        <span>Investigative Files:</span>
                        <span className={s.tooltipMonoSuccess}>
                          {evidenceFilesCount.toLocaleString()}
                        </span>
                      </li>
                      <li className={s.tooltipRowDivider}>
                        <span>Unclassified:</span>
                        <span className={s.tooltipMono}>{unclassifiedCount.toLocaleString()}</span>
                      </li>
                    </ul>
                    <p className={s.tooltipNote}>
                      Unclassified records are being processed for OCR and entity extraction.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={s.networkToolbar}>
          <h3 className={s.networkTitle}>
            <Icon name="Users" size="md" className={s.iconSuccess} />
            <span className={s.networkTitleText}>Entity Connection Network</span>
          </h3>

          {/* Entity Count Slider */}
          <div className={s.sliderControl}>
            <label className={s.sliderLabel}>Entities:</label>
            <Input
              type="range"
              min="100"
              max="500"
              step="50"
              value={filters.limit}
              onChange={(e) => setFilters({ limit: Number(e.target.value) })}
              className={`${s.sliderInput} ${s.sliderInputSuccess}`}
            />
            <span className={s.sliderValue}>{filters.limit}</span>
          </div>

          {/* Timeline Slider */}
          <div className={s.timelineControl}>
            <Icon name="TrendingUp" size="sm" className={s.iconDocs} />
            <div className={s.timelineYears}>
              <div className={s.timelineYearRow}>
                <span>{filters.timeRange[0]?.split('-')[0] || '1990'}</span>
                <span className={s.timelineEndYear}>
                  {filters.timeRange[1]?.split('-')[0] || '2025'}
                </span>
              </div>
              <Input
                type="range"
                min="1990"
                max="2025"
                step="1"
                value={parseInt(filters.timeRange[1]?.split('-')[0] || '2025')}
                onChange={(e) => {
                  const year = e.target.value;
                  setFilters({ timeRange: ['1990-01-01', `${year}-12-31`] });
                }}
                className={`${s.sliderInputThin} ${s.sliderInputDocs}`}
              />
            </div>
          </div>

          {/* Path Mode Toggle */}
          <Button
            unstyled
            onClick={() => {
              setPathMode(!pathMode);
              setPathSource(null);
              setPathTarget(null);
            }}
            className={s.pathModeButton}
            data-active={String(pathMode)}
            title="Find Shortest Path"
          >
            <Icon name="Share2" size="sm" />
            <span className={s.pathModeLabel}>{pathMode ? 'Select Nodes...' : 'Find Path'}</span>
          </Button>
        </div>

        <div className={s.infoHint}>
          <Icon name="Info" size="sm" className={s.infoHintIconEmerald} />
          <span>
            Interactive network showing entity relationships. Node size = connections. Colors
            indicate risk level. Click to view entity details. Grouped by entity type.
          </span>
        </div>

        {/* Desktop: Full Network Graph */}
        <div className={s.desktopGraph}>
          <NetworkGraph
            entities={networkEntities}
            relationships={networkRelationships}
            onEntityClick={(entity) => {
              if (pathMode) {
                handlePathNodeClick(entity as unknown as MappedGraphNode);
              } else {
                onEntitySelect?.(Number(entity.id));
              }
            }}
            maxNodes={Number(filters.limit)}
            onZoomLevelChange={handleZoomLevelChange}
            onEdgeClick={handleEdgeClick}
            nodeRiskActions={
              <>
                <Button
                  unstyled
                  onClick={handleReconcileJunk}
                  className={`${s.nodeActionButton} ${s.nodeActionButtonAmber}`}
                  title="Reconcile Junk Entities"
                >
                  <Icon name="Database" size="sm" />
                  <span className={s.nodeActionTooltip}>Reconcile Junk Entities</span>
                </Button>
                <Button
                  unstyled
                  onClick={handleResetJunk}
                  className={`${s.nodeActionButton} ${s.nodeActionButtonRed}`}
                  title="Reset Junk Flags"
                >
                  <Icon name="RotateCcw" size="sm" />
                  <span className={s.nodeActionTooltip}>
                    {showResetConfirm ? 'Click again to confirm reset' : 'Reset Junk Flags'}
                  </span>
                </Button>
              </>
            }
          />
          {isGraphLoading && (
            <div className={`${s.pulse} ${s.graphLoadingOverlay}`}>Fetching more details...</div>
          )}

          <EvidenceDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            sourceLabel={
              graphData?.nodes.find((n) => String(n.id) === String(selectedEdge?.sourceId))?.name ||
              'Entity A'
            }
            targetLabel={
              graphData?.nodes.find((n) => String(n.id) === String(selectedEdge?.targetId))?.name ||
              'Entity B'
            }
            relationshipType={edgeDetails?.relationship_type || selectedEdge?.type}
            loading={isEvidenceLoading}
            documents={edgeEvidence}
            onDocumentClick={(docId) => {
              navigate(`/documents?doc=${encodeURIComponent(docId)}`, { state: backLinkState });
            }}
          />
        </div>

        {/* Bias Indicator Safeguard */}
        {data?.entityTypeDistribution &&
          (() => {
            const totalEntities = data.entityTypeDistribution.reduce(
              (acc, curr) => acc + Number(curr.count),
              0,
            );
            const shownEntities = graphData?.nodes.length || 0;

            if (shownEntities < totalEntities && shownEntities > 0) {
              return (
                <div className={`${s.biasIndicator} ${s.fadeIn} ${s.slideInUp}`}>
                  <Icon name="Shield" size="xs" className={s.biasIndicatorIcon} />
                  <span>
                    Showing {shownEntities.toLocaleString()} of {totalEntities.toLocaleString()}{' '}
                    entities
                  </span>
                </div>
              );
            }
            return null;
          })()}

        {/* Mobile: Simplified Entity List */}
        <div className={s.mobileList}>
          <p className={s.mobileListNote}>
            View on larger screen for interactive network visualization.
          </p>
          <div className={s.mobileListStack}>
            {topConnectedEntities?.slice(0, 20).map((entity, i) => (
              <Button
                unstyled
                key={entity.id}
                onClick={() => onEntitySelect?.(entity.id)}
                className={s.mobileEntityButton}
              >
                <div
                  className={s.entityRankBadge}
                  data-risk={
                    entity.riskLevel >= 4 ? 'high' : entity.riskLevel >= 2 ? 'medium' : 'low'
                  }
                >
                  {i + 1}
                </div>
                <div className={s.entityInfo}>
                  <div className={s.entityName}>{entity.name}</div>
                  <div className={s.entityMeta}>
                    {entity.connectionCount} connections • {entity.mentions} mentions
                  </div>
                </div>
                <div className={s.entityFlags}>
                  {Array.from({ length: Math.min(entity.riskLevel, 5) }).map((_, index) => (
                    <Icon key={index} name="Flag" className={s.entityFlagIcon} />
                  ))}
                </div>
              </Button>
            ))}
          </div>
          {topConnectedEntities?.length > 20 && (
            <p className={s.mobileListMore}>+{topConnectedEntities.length - 20} more entities</p>
          )}
        </div>
      </Surface>

      {/* Interactive Entity Map - NEW PHASE 12 */}
      <div className={s.entityMapSection}>
        <InteractiveEntityMap
          className={s.entityMapFull}
          onEntitySelect={onEntitySelect}
          minRiskLevel={0}
        />
      </div>

      {/* Hero Stats Row */}
      <div className={s.heroStatsGrid}>
        <StatCard
          icon={<Icon name="FileText" size="md" className={s.iconAccent} />}
          value={data.totalCounts?.documents || redactionStats?.totalDocuments || 0}
          label="Total Documents"
        />
        <StatCard
          icon={<Icon name="Shield" size="md" className={s.iconWarning} />}
          value={`${(redactionStats?.redactionPercentage || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
          label="Redacted"
          sublabel={`${(redactionStats?.redactedDocuments || 0).toLocaleString()} docs`}
        />
        <StatCard
          icon={<Icon name="Users" size="md" className={s.iconDocs} />}
          value={topConnectedEntities?.length || 0}
          label="Connected Entities"
        />
        <StatCard
          icon={<Icon name="Activity" size="md" className={s.iconSuccess} />}
          value={topRelationships?.length || 0}
          label="Relationships"
        />
      </div>

      {/* Secondary Visualizations Grid */}
      <div className={s.vizGrid}>
        {/* Document Types Sunburst */}
        <Surface variant="panel" className={s.vizPanel}>
          <div className={s.vizPanelIconDecor}>
            <Icon name="Database" size="xl" className={s.iconAccent} />
          </div>

          <h3 className={s.vizPanelTitle}>
            <Icon name="FileText" size="md" className={s.iconAccent} />
            <span className={s.neonTextCyan}>Document Types</span>
          </h3>

          <div className={s.vizPanelInfoHint}>
            <Icon name="Info" size="sm" className={s.vizPanelInfoIcon} />
            <span>
              Breakdown of evidence by category. Click segments to filter. Hover for redaction
              stats.
            </span>
          </div>

          <div className={s.vizPanelBody}>
            <SunburstChart
              data={documentsByCategory}
              onSegmentClick={(type) => onTypeFilter?.(type)}
            />
          </div>
        </Surface>

        {/* Timeline */}
        <Surface variant="panel" className={s.vizPanel}>
          <div className={s.vizPanelIconDecor}>
            <Icon name="TrendingUp" size="xl" className={s.vizPanelIconPurple} />
          </div>

          <h3 className={s.vizPanelTitle}>
            <Icon name="TrendingUp" size="md" className={s.iconDocs} />
            <span className={s.vizPanelTitlePurplePink}>
              Document Distribution &amp; Gap Analysis
            </span>
          </h3>

          <div className={s.vizPanelInfoHint}>
            <Icon name="Info" size="sm" className={s.vizPanelInfoIconDocs} />
            <span>
              Historical document distribution plotted by original creation date. The red zone
              highlights the 2001 period where significant data gaps have been identified.
            </span>
          </div>

          <div className={s.vizPanelBody}>
            <DocumentBarChart data={data.timelineData} />
          </div>
        </Surface>
      </div>
    </div>
  );
};

export default EnhancedAnalytics;
