import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import EntityRelationshipMapper, { Entity, Relationship } from './EntityRelationshipMapper';
import { type GraphNode, type GraphEdge } from '../../services/GraphService';
import { apiClient } from '../../services/apiClient';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';

import styles from './EntityGraphPanel.module.css';

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
      <Flex align="center" justify="center" className={styles.loading}>
        <LqText color="muted" variant="small">
          Loading entity graph...
        </LqText>
      </Flex>
    );
  }

  if (error) {
    return (
      <Surface variant="glass" className={styles.error}>
        <LqText color="danger" variant="small">
          Failed to load graph: {error}
        </LqText>
      </Surface>
    );
  }

  if (!mapperEntities.length || !mapperRelationships.length) {
    return (
      <Surface variant="glass" className={styles.container}>
        <LqText color="secondary" variant="small">
          No graph data available yet for this entity.
        </LqText>
      </Surface>
    );
  }

  return (
    <Surface variant="glass" className={styles.container}>
      <ScopedErrorBoundary
        fallback={
          <Box className={styles.renderError}>
            <LqText color="danger" variant="small">
              A rendering error occurred in the entity graph. The data might be malformed.
            </LqText>
          </Box>
        }
      >
        <EntityRelationshipMapper entities={mapperEntities} relationships={mapperRelationships} />
      </ScopedErrorBoundary>
    </Surface>
  );
};

export default EntityGraphPanel;
