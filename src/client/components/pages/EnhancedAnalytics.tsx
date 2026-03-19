import React, { useState, useEffect, useMemo } from 'react';
import {
  Info,
  Users,
  Shield,
  Database,
  Activity,
  FileText,
  TrendingUp,
  Share2,
  RotateCcw,
} from 'lucide-react';
import { SunburstChart } from '../visualizations/SunburstChart';
import { DocumentBarChart } from '../visualizations/DocumentBarChart';
import { NetworkGraph } from '../visualizations/NetworkGraph';
import { EvidenceDrawer } from '../visualizations/EvidenceDrawer';
import { filterPeopleOnly } from '../../utils/entityFilters';
import { InteractiveEntityMap } from '../visualizations/InteractiveEntityMap';
import { useFilters } from '../../contexts/useFilters';
import { apiClient } from '../../services/apiClient';

interface EnhancedAnalyticsProps {
  onEntitySelect?: (entityId: number) => void;
  onTypeFilter?: (type: string) => void;
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

function normalizeAnalyticsPayload(raw: any): AnalyticsData {
  const totalCounts = raw?.totalCounts ?? {};
  const reconciliation = raw?.reconciliation ?? {};
  const redactionStats = raw?.redactionStats ?? {};

  return {
    documentsByType: Array.isArray(raw?.documentsByType) ? raw.documentsByType : [],
    timelineData: Array.isArray(raw?.timelineData) ? raw.timelineData : [],
    topConnectedEntities: Array.isArray(raw?.topConnectedEntities) ? raw.topConnectedEntities : [],
    entityTypeDistribution: Array.isArray(raw?.entityTypeDistribution)
      ? raw.entityTypeDistribution
      : [],
    redactionStats: {
      totalDocuments: Number(redactionStats.totalDocuments || 0),
      redactedDocuments: Number(redactionStats.redactedDocuments || 0),
      redactionPercentage: Number(redactionStats.redactionPercentage || 0),
      totalRedactions: Number(redactionStats.totalRedactions || 0),
    },
    topRelationships: Array.isArray(raw?.topRelationships) ? raw.topRelationships : [],
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
  color: string;
  sublabel?: string;
}> = ({ icon, value, label, color, sublabel }) => (
  <div
    className={`glass-panel p-4 rounded-[var(--radius-xl)] hover:bg-[var(--glass-bg)]/60 transition-all duration-300 group relative overflow-hidden`}
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br from-${color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
    />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div
        className={`data-emphasis text-[var(--text-primary)] group-hover:text-${color}-400 transition-colors`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sublabel && <div className="text-xs text-[var(--text-muted)] mt-1">{sublabel}</div>}
    </div>
  </div>
);

export const EnhancedAnalytics: React.FC<EnhancedAnalyticsProps> = ({
  onEntitySelect,
  onTypeFilter,
}) => {
  const { filters, setFilters } = useFilters();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LOD Graph State
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [graphMode, setGraphMode] = useState<'default' | 'cluster'>('default');
  const [isGraphLoading, setIsGraphLoading] = useState(false);

  // Evidence Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [edgeEvidence, setEdgeEvidence] = useState<any[]>([]);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
  const [edgeDetails, setEdgeDetails] = useState<any>(null); // For relationship metadata

  // Path Finding State
  const [pathMode, setPathMode] = useState(false);
  const [pathSource, setPathSource] = useState<any>(null);
  const [pathTarget, setPathTarget] = useState<any>(null);

  const handlePathNodeClick = (entity: any) => {
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

      const pathData = await apiClient.get<any>(endpoint, { useCache: false });
      if (!pathData || !Array.isArray(pathData.nodes) || !Array.isArray(pathData.edges)) {
        throw new Error('Path fetch failed');
      }

      if (pathData.nodes.length === 0) {
        alert('No path found between these entities (within 6 hops).');
        setPathSource(null);
        setPathTarget(null);
        return;
      }

      const mappedNodes = pathData.nodes.map((n: any) => ({
        ...n,
        name: n.label,
        riskLevel: n.risk,
        val: 20, // Highlight size
      }));
      const mappedEdges = pathData.edges.map((e: any) => ({
        source: e.source,
        target: e.target,
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
        nodes: data.topConnectedEntities,
        edges: data.topRelationships,
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

          const newData = await apiClient.get<any>(endpoint, { useCache: false });
          if (!newData || !Array.isArray(newData.nodes) || !Array.isArray(newData.edges)) {
            throw new Error('Invalid graph payload');
          }

          // Map to Legacy Interface expectations
          const mappedNodes = newData.nodes.map((n: any) => ({
            ...n,
            name: n.label,
            riskLevel: n.risk,
            photoUrl: n.image,
          }));

          const mappedEdges = newData.edges.map((e: any) => ({
            source: e.source,
            target: e.target,
            type: e.type,
            strength: e.weight,
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

  const evidenceCache = React.useRef<Map<string, any[]>>(new Map());

  const handleEdgeClick = async (edge: any) => {
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
      const data = await apiClient.get<any>(endpoint, { useCache: true });
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
    fetchAnalytics();
  }, []);

  // Update Graph when Time Range changes
  useEffect(() => {
    if (data) {
      handleZoomLevelChange(1.0); // Trigger a refresh at current zoom
    }
  }, [filters.timeRange, data, handleZoomLevelChange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const result = await apiClient.get<any>('/analytics/enhanced', { useCache: false });
      const normalized = normalizeAnalyticsPayload(result);

      // Filter out junk entities from Network Graph
      if (normalized.topConnectedEntities) {
        normalized.topConnectedEntities = filterPeopleOnly(
          normalized.topConnectedEntities as any,
        ) as any;
      }

      // Filter relationships to only include valid entities
      if (normalized.topRelationships && normalized.topConnectedEntities) {
        const validIds = new Set(normalized.topConnectedEntities.map((e: any) => e.id));
        normalized.topRelationships = normalized.topRelationships.filter(
          (r: any) => validIds.has(r.sourceId) && validIds.has(r.targetId),
        );
      }

      setData(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcileJunk = async () => {
    try {
      await apiClient.post('/analytics/reconcile/junk');
      alert('Junk entities re-classified.');
      fetchAnalytics();
    } catch (error) {
      console.error('Error reconciling junk:', error);
    }
  };

  const handleResetJunk = async () => {
    if (!confirm('Are you sure you want to reset all junk flags?')) return;
    try {
      await apiClient.post('/analytics/reconcile/reset');
      alert('Junk classification reset.');
      fetchAnalytics();
    } catch (error) {
      console.error('Error resetting junk:', error);
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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--accent)] mx-auto mb-4"
            style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.5)' }}
          />
          <p className="text-[var(--text-muted)] animate-pulse">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'No data available'}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { redactionStats, topConnectedEntities, topRelationships } = data;
  const totalDocumentsCount = Number(data.totalCounts?.documents || 0);
  const evidenceFilesCount = Number(data.totalCounts?.evidenceFiles || 0);
  const unclassifiedCount = Number(data.reconciliation?.unclassifiedCount || 0);
  const archiveIntegrityPct =
    totalDocumentsCount > 0 ? Math.round((evidenceFilesCount / totalDocumentsCount) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Entity Network - Full Width - MOVED TO TOP */}
      <div className="glass-card p-6 rounded-[var(--radius-xl)] relative overflow-hidden max-h-[85vh] flex flex-col">
        {/* Archive Reconciliation Header Indicator */}
        {data && (
          <div className="absolute top-0 right-1/2 translate-x-1/2 z-20">
            <div
              className={`px-4 py-1.5 rounded-b-xl text-[10px] font-bold tracking-widest uppercase border-x border-b flex items-center gap-2 backdrop-blur-md transition-all ${
                unclassifiedCount > 0
                  ? 'bg-[color-mix(in_srgb,var(--accent-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--accent-warning)_30%,transparent)] text-[var(--accent-warning)]'
                  : 'bg-[color-mix(in_srgb,var(--accent-success)_12%,transparent)] border-[color-mix(in_srgb,var(--accent-success)_30%,transparent)] text-[var(--accent-success)]'
              }`}
            >
              <Database className="h-3 w-3 shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
              <span>Archive Integrity: {archiveIntegrityPct}% Classified</span>
              {unclassifiedCount > 0 && (
                <div className="group relative">
                  <Info className="h-3 w-3 cursor-help text-amber-500/60 hover:text-amber-500 transition-colors" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-4 w-64 p-3 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 normal-case tracking-normal font-normal text-[var(--text-secondary)]">
                    <p className="mb-2 font-bold text-[var(--text-primary)]">
                      Reconciliation Report
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li className="flex justify-between">
                        <span>Total Records:</span>
                        <span className="text-[var(--text-primary)] font-mono">
                          {totalDocumentsCount.toLocaleString()}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Investigative Files:</span>
                        <span className="text-[var(--accent-success)] font-mono">
                          {evidenceFilesCount.toLocaleString()}
                        </span>
                      </li>
                      <li className="flex justify-between border-t border-[var(--glass-border)] pt-1 mt-1 text-[var(--accent-warning)]">
                        <span>Unclassified:</span>
                        <span className="font-mono">{unclassifiedCount.toLocaleString()}</span>
                      </li>
                    </ul>
                    <p className="mt-2 text-[9px] leading-tight text-[var(--text-muted)]">
                      Unclassified records are being processed for OCR and entity extraction.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
          <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--accent-success)]" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Entity Connection Network
            </span>
          </h3>

          {/* Entity Count Slider */}
          <div className="flex items-center gap-4 bg-[var(--glass-bg)]/50 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
            <label className="text-xs text-[var(--text-muted)] whitespace-nowrap">Entities:</label>
            <input
              type="range"
              min="100"
              max="500"
              step="50"
              value={filters.limit}
              onChange={(e) => setFilters({ limit: Number(e.target.value) })}
              className="w-32 h-2 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-sm font-medium text-[var(--accent-success)] min-w-[3rem] text-right">
              {filters.limit}
            </span>
          </div>

          {/* Timeline Slider */}
          <div className="flex items-center gap-4 bg-[var(--glass-bg)]/50 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
            <TrendingUp className="h-4 w-4 text-[var(--accent-docs)]" />
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                <span>{filters.timeRange[0]?.split('-')[0] || '1990'}</span>
                <span className="text-purple-400 font-bold">
                  {filters.timeRange[1]?.split('-')[0] || '2025'}
                </span>
              </div>
              <input
                type="range"
                min="1990"
                max="2025"
                step="1"
                value={parseInt(filters.timeRange[1]?.split('-')[0] || '2025')}
                onChange={(e) => {
                  const year = e.target.value;
                  setFilters({ timeRange: ['1990-01-01', `${year}-12-31`] });
                }}
                className="w-48 h-1.5 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>

          {/* Path Mode Toggle */}
          <button
            onClick={() => {
              setPathMode(!pathMode);
              setPathSource(null);
              setPathTarget(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-lg)] border transition-all ${
              pathMode
                ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50 text-[var(--accent)]'
                : 'bg-[var(--glass-bg)]/50 border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Find Shortest Path"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs font-medium">
              {pathMode ? 'Select Nodes...' : 'Find Path'}
            </span>
          </button>
        </div>

        <div className="text-xs text-[var(--text-muted)] mb-4 flex items-start gap-2 bg-[var(--glass-bg-strong)]/50 p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] shrink-0">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            Interactive network showing entity relationships. Node size = connections. Colors
            indicate risk level. Click to view entity details. Grouped by entity type.
          </span>
        </div>

        {/* Desktop: Full Network Graph */}
        <div className="hidden md:block flex-1 min-h-0 relative">
          <NetworkGraph
            entities={graphData?.nodes || topConnectedEntities}
            relationships={graphData?.edges || topRelationships}
            onEntityClick={(entity) => {
              if (pathMode) {
                handlePathNodeClick(entity);
              } else {
                onEntitySelect?.(Number(entity.id));
              }
            }}
            maxNodes={Number(filters.limit)}
            onZoomLevelChange={handleZoomLevelChange}
            onEdgeClick={handleEdgeClick}
            nodeRiskActions={
              <>
                <button
                  onClick={handleReconcileJunk}
                  className="p-1.5 hover:bg-[var(--glass-bg-highlight)]/50 rounded-[var(--radius-lg)] text-[var(--text-muted)] hover:text-amber-400 transition-all group relative"
                  title="Reconcile Junk Entities"
                >
                  <Database className="h-4 w-4" />
                  <span className="absolute bottom-full right-0 mb-2 p-2 bg-[var(--glass-bg-strong)] text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    Reconcile Junk Entities
                  </span>
                </button>
                <button
                  onClick={handleResetJunk}
                  className="p-1.5 hover:bg-[var(--glass-bg-highlight)]/50 rounded-[var(--radius-lg)] text-[var(--text-muted)] hover:text-red-400 transition-all group relative"
                  title="Reset Junk Flags"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="absolute bottom-full right-0 mb-2 p-2 bg-[var(--glass-bg-strong)] text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    Reset Junk Flags
                  </span>
                </button>
              </>
            }
          />
          {isGraphLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[var(--glass-bg-strong)]/80 px-4 py-2 rounded-full text-xs text-[var(--accent)] border border-[var(--accent)]/30 backdrop-blur-md animate-pulse">
              Fetching more details...
            </div>
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
              // Navigate to document view? Or just log for now
              console.log('Open document', docId);
              // Ideally this would open the Evidence Modal
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
                <div className="absolute bottom-4 right-4 z-10 bg-amber-900/90 text-amber-100 px-3 py-1.5 rounded-full text-[10px] font-medium border border-amber-700/50 flex items-center gap-2 backdrop-blur-sm shadow-[var(--glass-shadow)] animate-in fade-in slide-in-from-bottom-2">
                  <Shield className="h-3 w-3 text-amber-400" />
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
        <div className="md:hidden space-y-2 overflow-y-auto flex-1">
          <p className="text-xs text-[var(--text-muted)] mb-3">
            View on larger screen for interactive network visualization.
          </p>
          <div className="space-y-2">
            {topConnectedEntities?.slice(0, 20).map((entity, i) => (
              <button
                key={entity.id}
                onClick={() => onEntitySelect?.(entity.id)}
                className="w-full flex items-center gap-3 p-3 bg-[var(--glass-bg)]/50 hover:bg-[var(--glass-bg-highlight)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] transition-colors text-left"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    entity.riskLevel >= 4
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : entity.riskLevel >= 2
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">
                    {entity.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {entity.connectionCount} connections • {entity.mentions} mentions
                  </div>
                </div>
                <div className="text-lg shrink-0">{'🚩'.repeat(Math.min(entity.riskLevel, 5))}</div>
              </button>
            ))}
          </div>
          {topConnectedEntities?.length > 20 && (
            <p className="text-xs text-[var(--text-muted)] text-center pt-2">
              +{topConnectedEntities.length - 20} more entities
            </p>
          )}
        </div>
      </div>

      {/* Interactive Entity Map - NEW PHASE 12 */}
      <div className="hidden md:block h-[500px]">
        <InteractiveEntityMap
          className="h-full w-full"
          onEntitySelect={onEntitySelect}
          minRiskLevel={0}
        />
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="h-5 w-5 text-[var(--accent)]" />}
          value={data.totalCounts?.documents || redactionStats?.totalDocuments || 0}
          label="Total Documents"
          color="cyan"
        />
        <StatCard
          icon={<Shield className="h-5 w-5 text-orange-400" />}
          value={`${(redactionStats?.redactionPercentage || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
          label="Redacted"
          color="orange"
          sublabel={`${(redactionStats?.redactedDocuments || 0).toLocaleString()} docs`}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-[var(--accent-docs)]" />}
          value={topConnectedEntities?.length || 0}
          label="Connected Entities"
          color="purple"
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-[var(--accent-success)]" />}
          value={topRelationships?.length || 0}
          label="Relationships"
          color="emerald"
        />
      </div>

      {/* Secondary Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Document Types Sunburst */}
        <div className="glass-card p-6 rounded-[var(--radius-xl)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database className="h-24 w-24 text-[var(--accent)]" />
          </div>

          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2 relative z-10">
            <FileText className="h-5 w-5 text-[var(--accent)]" />
            <span className="neon-text-cyan">Document Types</span>
          </h3>

          <div className="text-xs text-[var(--text-muted)] mb-4 flex items-start gap-2 bg-[var(--glass-bg-strong)]/50 p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] relative z-10">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--accent)]" />
            <span>
              Breakdown of evidence by category. Click segments to filter. Hover for redaction
              stats.
            </span>
          </div>

          <div className="relative z-10">
            <SunburstChart
              data={documentsByCategory}
              onSegmentClick={(type) => onTypeFilter?.(type)}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="glass-card p-6 rounded-[var(--radius-xl)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-24 w-24 text-purple-500" />
          </div>

          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2 relative z-10">
            <TrendingUp className="h-5 w-5 text-[var(--accent-docs)]" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Document Distribution & Gap Analysis
            </span>
          </h3>

          <div className="text-xs text-[var(--text-muted)] mb-4 flex items-start gap-2 bg-[var(--glass-bg-strong)]/50 p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] relative z-10">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--accent-docs)]" />
            <span>
              Historical document distribution plotted by original creation date. The red zone
              highlights the 2001 period where significant data gaps have been identified.
            </span>
          </div>

          <div className="relative z-10">
            <DocumentBarChart data={data.timelineData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAnalytics;
