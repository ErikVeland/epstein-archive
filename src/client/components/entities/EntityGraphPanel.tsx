import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import EntityRelationshipMapper, { Entity, Relationship } from './EntityRelationshipMapper';
import { type GraphNode, type GraphEdge } from '../../services/GraphService';
import { apiClient } from '../../services/apiClient';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';

interface EntityGraphPanelProps {
  entityId: string | number;
}

const EMPTY_GRAPH_NODES: GraphNode[] = [];
const EMPTY_GRAPH_EDGES: GraphEdge[] = [];

export const EntityGraphPanel: React.FC<EntityGraphPanelProps> = ({ entityId }) => {
  const {
    data: graphData,
    isLoading: loading,
    error: fetchError,
  } = useQuery<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    queryKey: ['entityGraph', entityId],
    queryFn: async () => {
      const data = (await apiClient.getEntityGraph(String(entityId), 2)) as {
        nodes?: GraphNode[];
        edges?: GraphEdge[];
      };
      return { nodes: data.nodes ?? [], edges: data.edges ?? [] };
    },
    staleTime: 30_000,
  });
  const nodes = graphData?.nodes ?? EMPTY_GRAPH_NODES;
  const edges = graphData?.edges ?? EMPTY_GRAPH_EDGES;
  const error = fetchError instanceof Error ? fetchError.message : null;

  const mapperEntities: Entity[] = useMemo(() => {
    return nodes.map((n) => ({
      id: String(n.id),
      label: n.label,
      type: n.type,
      properties: { riskScore: n.risk },
      confidence: 1.0,
      sources: [],
      isEgo: String(n.id) === String(entityId) || !!n.isEgo,
    }));
  }, [nodes, entityId]);

  const mapperRelationships: Relationship[] = useMemo(() => {
    return edges.map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      type: e.type,
      strength: e.weight,
      confidence: e.confidence,
      evidence: [],
      properties: { docCount: e.docCount },
    }));
  }, [edges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-[var(--space-8)]">
        <div className="text-sm text-[var(--text-muted)]">Loading entity graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-sm rounded-[var(--radius-lg)] p-[var(--space-4)]">
        Failed to load graph: {error}
      </div>
    );
  }

  if (!mapperEntities.length || !mapperRelationships.length) {
    return (
      <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-[var(--space-4)] text-sm text-[var(--text-secondary)]">
        No graph data available yet for this entity.
      </div>
    );
  }

  return (
    <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-[var(--space-4)]">
      <ScopedErrorBoundary
        fallback={
          <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-sm rounded-[var(--radius-lg)] p-[var(--space-4)]">
            A rendering error occurred in the entity graph. The data might be malformed.
          </div>
        }
      >
        <EntityRelationshipMapper entities={mapperEntities} relationships={mapperRelationships} />
      </ScopedErrorBoundary>
    </div>
  );
};

export default EntityGraphPanel;
