import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { NetworkGraph } from '@client/components/visualizations/NetworkGraph';
import Icon from '@client/components/common/Icon';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import { Button, Flex, Input, LqText, Surface } from '@client/design-system/lib';
import { SignificanceBadge } from '@client/components/entities/SignificanceBadge';
import { apiClient } from '@client/services/apiClient';
import { EntityConnectionsResponse, GlobalGraphResponse } from '@client/types/api';
import styles from './NetworkPage.module.css';

type SignalFilter = 'all' | 'financial' | 'flights' | 'communications' | 'relationships';

interface SelectedNode {
  id: string | number;
  name: string;
  type?: string;
  riskLevel: number;
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

  const [pathSource, setPathSource] = useState('');
  const [pathTarget, setPathTarget] = useState('');
  const [foundPath, setFoundPath] = useState<Array<{
    id: string;
    label: string;
    type: string;
  }> | null>(null);
  const [findingPath, setFindingPath] = useState(false);

  const handleFindPath = async () => {
    if (!pathSource || !pathTarget) return;
    setFindingPath(true);
    setFoundPath(null);
    try {
      const res = await fetch(
        `/api/relationships/path?source=${encodeURIComponent(pathSource)}&target=${encodeURIComponent(pathTarget)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setFoundPath(data.path);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFindingPath(false);
    }
  };

  const { data: graphData, isLoading } = useQuery<GlobalGraphResponse>({
    queryKey: ['globalNetwork'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '500' });
      return await apiClient.get<GlobalGraphResponse>(`/graph/global?${params.toString()}`);
    },
    staleTime: 120_000,
  });

  const { data: connectionsData } = useQuery<EntityConnectionsResponse>({
    queryKey: ['entityConnections', selectedNode?.id],
    queryFn: () => {
      if (!selectedNode) throw new Error('selectedNode is required');
      return apiClient.getEntityConnections(String(selectedNode.id), { limit: 3 });
    },
    enabled: !!selectedNode,
    staleTime: 60_000,
  });

  const rawNodes = graphData?.nodes ?? [];
  const rawEdges = graphData?.edges ?? [];

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

  const signalTypes = SIGNAL_TYPE_MAP[signalFilter];
  const visibleEdges = rawEdges.filter((e) => {
    if (signalTypes.length > 0 && !signalTypes.includes(e.signalType ?? '')) return false;
    if (filteredNodeIds && (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)))
      return false;
    return true;
  });

  const entities = visibleNodes.map((n) => ({
    id: n.id,
    name: n.label,
    type: n.type,
    riskLevel: n.risk ?? 0,
    connectionCount: n.connectionCount ?? 0,
  }));

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
    (entity: { id: string | number; name: string; type?: string; riskLevel?: number }) => {
      setSelectedNode({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        riskLevel: entity.riskLevel ?? 0,
      });
    },
    [],
  );

  const handleOpenProfile = useCallback(() => {
    if (selectedNode) {
      navigate(`/entity/${selectedNode.id}`);
    }
  }, [selectedNode, navigate]);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const topConnections = connectionsData?.connections ?? [];

  return (
    <ScopedErrorBoundary>
      <div className={styles.root}>
        {/* Filter bar */}
        <Flex align="center" gap="sm" className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <Icon name="Search" size="sm" className={styles.searchIcon} />
            <Input
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
              <Button
                key={filter.key}
                unstyled
                className={`${styles.filterBtn} ${signalFilter === filter.key ? styles.filterBtnActive : ''}`}
                onClick={() => setSignalFilter(filter.key)}
                aria-pressed={signalFilter === filter.key}
              >
                <Icon name={filter.icon as Parameters<typeof Icon>[0]['name']} size="sm" />
                <span className={styles.signalLabel}>{filter.label}</span>
              </Button>
            ))}
          </div>

          <div className={styles.entityCount}>
            <LqText variant="xs" color="muted">
              {isLoading ? 'Loading...' : `${entities.length.toLocaleString()} entities`}
            </LqText>
          </div>
        </Flex>

        {/* Graph canvas */}
        <div className={styles.graphArea}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p className={styles.loadingMessage}>Building global network...</p>
            </div>
          ) : (
            <NetworkGraph
              entities={entities}
              relationships={relationships}
              onEntityClick={handleEntityClick}
              maxNodes={500}
            />
          )}

          {/* Selected entity panel */}
          {selectedNode && (
            <Surface variant="glass" className={styles.entityPanel}>
              <div className={styles.entityPanelHeader}>
                <div className={styles.entityPanelMeta}>
                  <LqText variant="small" weight="bold">
                    {selectedNode.name}
                  </LqText>
                  {selectedNode.type && (
                    <LqText variant="xs" color="muted" className={styles.entityPanelType}>
                      {selectedNode.type}
                    </LqText>
                  )}
                  {selectedNode.riskLevel >= 3 && (
                    <SignificanceBadge score={selectedNode.riskLevel * 20} showLabel={false} />
                  )}
                </div>
                <Button
                  unstyled
                  className={styles.closeButton}
                  onClick={handleClosePanel}
                  aria-label="Close entity panel"
                >
                  <Icon name="X" size="sm" />
                </Button>
              </div>

              {topConnections.length > 0 && (
                <div className={styles.connectionsList}>
                  <p className={styles.connectionsTitle}>Top connections</p>
                  {topConnections.map((conn) => (
                    <Flex
                      key={conn.entityId}
                      align="center"
                      justify="between"
                      className={styles.connectionItem}
                    >
                      <span className={styles.connectionName}>{conn.entityName}</span>
                      <span className={styles.connectionType}>{conn.entityType}</span>
                    </Flex>
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
            </Surface>
          )}
          {/* Pathfinder overlay */}
          <Surface
            variant="glass"
            style={{
              position: 'absolute',
              top: 'var(--space-4)',
              left: 'var(--space-4)',
              width: '320px',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <LqText variant="small" weight="bold" style={{ color: 'var(--accent)', margin: 0 }}>
              Shortest Connection Path
            </LqText>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Input
                type="text"
                placeholder="Source Entity (e.g. Prince Andrew)"
                value={pathSource}
                onChange={(e) => setPathSource(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
              <Input
                type="text"
                placeholder="Target Entity (e.g. Ghislaine Maxwell)"
                value={pathTarget}
                onChange={(e) => setPathTarget(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
              <Button
                unstyled
                onClick={handleFindPath}
                disabled={findingPath}
                style={{
                  width: '100%',
                  background: 'var(--accent)',
                  color: '#000',
                  fontWeight: 'bold',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                {findingPath ? 'Finding connection path...' : 'Calculate Path'}
              </Button>
            </div>

            {foundPath && foundPath.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <LqText variant="xs" color="muted">
                  Path found:
                </LqText>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  {foundPath.map((node, idx) => (
                    <div
                      key={node.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                      <span
                        style={{
                          fontSize: '0.8rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: 'var(--space-1) var(--space-2)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          flex: 1,
                        }}
                      >
                        {node.label}
                      </span>
                      {idx < foundPath.length - 1 && (
                        <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>➔</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Surface>
        </div>
      </div>
    </ScopedErrorBoundary>
  );
};

export default NetworkPage;
