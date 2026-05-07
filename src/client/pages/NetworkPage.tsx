import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { NetworkGraph } from '@client/components/visualizations/NetworkGraph';
import Icon from '@client/components/common/Icon';
import { Button } from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import { EntityConnectionsResponse } from '@client/types/api';
import styles from './NetworkPage.module.css';

type SignalFilter = 'all' | 'financial' | 'flights' | 'communications' | 'relationships';

interface SelectedNode {
  id: string | number;
  name: string;
  type?: string;
}

interface GraphNode {
  id: string;
  label: string;
  type?: string;
  risk?: number;
  connectionCount?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type?: string;
  weight?: number;
  confidence?: number;
  classification?: string;
  signalType?: string;
}

interface GlobalGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const SIGNAL_FILTERS: { key: SignalFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All signals', icon: 'Network' },
  { key: 'financial', label: 'Financial', icon: 'DollarSign' },
  { key: 'flights', label: 'Flights', icon: 'Plane' },
  { key: 'communications', label: 'Communications', icon: 'Mail' },
  { key: 'relationships', label: 'Direct links', icon: 'Link' },
];

const SIGNAL_TYPE_MAP: Record<SignalFilter, string[]> = {
  all: [],
  financial: ['financial'],
  flights: ['flight'],
  communications: ['communication'],
  relationships: ['relationship'],
};

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const { data: graphData, isLoading } = useQuery<GlobalGraphResponse>({
    queryKey: ['globalGraph', signalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '300' });
      return await apiClient.get<GlobalGraphResponse>(`/graph/global?${params.toString()}`);
    },
    staleTime: 120_000,
  });

  const { data: connectionsData } = useQuery<EntityConnectionsResponse>({
    queryKey: ['entityConnections', selectedNode?.id],
    queryFn: () => apiClient.getEntityConnections(String(selectedNode!.id), { limit: 3 }),
    enabled: !!selectedNode,
    staleTime: 60_000,
  });

  const rawNodes = graphData?.nodes ?? [];
  const rawEdges = graphData?.edges ?? [];

  // Client-side search filter on nodes
  const filteredNodeIds = searchTerm
    ? new Set(
        rawNodes
          .filter((n) => n.label.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((n) => n.id),
      )
    : null;

  const visibleNodes = filteredNodeIds
    ? rawNodes.filter((n) => filteredNodeIds.has(n.id))
    : rawNodes;

  // Signal filter on edges (client-side)
  const signalTypes = SIGNAL_TYPE_MAP[signalFilter];
  const visibleEdges =
    signalTypes.length === 0
      ? rawEdges
      : rawEdges.filter((e) => signalTypes.includes(e.signalType ?? ''));

  // Map to NetworkGraph's EntityNode shape
  const entities = visibleNodes.map((n) => ({
    id: n.id,
    name: n.label,
    type: n.type,
    riskLevel: n.risk ?? 0,
    connectionCount: n.connectionCount ?? 0,
  }));

  // Map to NetworkGraph's Relationship shape
  const relationships = visibleEdges.map((e) => ({
    sourceId: e.source,
    targetId: e.target,
    source: e.source,
    target: e.target,
    type: e.type,
    weight: e.weight,
    confidence: e.confidence,
    classification: e.classification as 'EVIDENCE_BACKED' | 'INFERRED' | undefined,
    signalType: e.signalType,
  }));

  const handleEntityClick = useCallback(
    (entity: { id: string | number; name: string; type?: string }) => {
      setSelectedNode({ id: entity.id, name: entity.name, type: entity.type });
    },
    [],
  );

  const handleOpenProfile = useCallback(() => {
    if (selectedNode) {
      navigate(`/people/${selectedNode.id}`);
    }
  }, [selectedNode, navigate]);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const topConnections = connectionsData?.connections ?? [];

  return (
    <div className={styles.root}>
      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Icon name="Search" size="sm" className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search entities in network"
          />
        </div>

        <div className={styles.signalFilters}>
          {SIGNAL_FILTERS.map((filter) => (
            <button
              key={filter.key}
              className={`${styles.signalButton} ${signalFilter === filter.key ? styles.signalButtonActive : ''}`}
              onClick={() => setSignalFilter(filter.key)}
              aria-pressed={signalFilter === filter.key}
            >
              <Icon name={filter.icon as Parameters<typeof Icon>[0]['name']} size="sm" />
              <span className={styles.signalLabel}>{filter.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.entityCount}>
          {isLoading ? (
            <span className={styles.loadingText}>Loading...</span>
          ) : (
            <span className={styles.countText}>{entities.length.toLocaleString()} entities</span>
          )}
        </div>
      </div>

      {/* Graph canvas */}
      <div className={styles.graphArea}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Icon name="Network" size="xl" color="muted" />
            <p className={styles.loadingMessage}>Building global network...</p>
          </div>
        ) : (
          <NetworkGraph
            entities={entities}
            relationships={relationships}
            onEntityClick={handleEntityClick}
            maxNodes={300}
          />
        )}

        {/* Selected entity panel */}
        {selectedNode && (
          <div className={styles.entityPanel}>
            <div className={styles.entityPanelHeader}>
              <div className={styles.entityPanelMeta}>
                <span className={styles.entityPanelName}>{selectedNode.name}</span>
                {selectedNode.type && (
                  <span className={styles.entityPanelType}>{selectedNode.type}</span>
                )}
              </div>
              <button
                className={styles.closeButton}
                onClick={handleClosePanel}
                aria-label="Close entity panel"
              >
                <Icon name="X" size="sm" />
              </button>
            </div>

            {topConnections.length > 0 && (
              <div className={styles.connectionsList}>
                <p className={styles.connectionsTitle}>Top connections</p>
                {topConnections.map((conn) => (
                  <div key={conn.entityId} className={styles.connectionItem}>
                    <span className={styles.connectionName}>{conn.entityName}</span>
                    <span className={styles.connectionType}>{conn.entityType}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenProfile}
              className={styles.profileButton}
            >
              Open full profile
              <Icon name="ArrowRight" size="sm" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkPage;
