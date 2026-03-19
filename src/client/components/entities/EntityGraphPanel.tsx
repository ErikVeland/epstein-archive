import React, { useEffect, useState, useMemo } from 'react';
import EntityRelationshipMapper, { Entity, Relationship } from './EntityRelationshipMapper';
import { GraphService, type GraphNode, type GraphEdge } from '../../services/GraphService';
import { apiClient } from '../../services/apiClient';

interface EntityGraphPanelProps {
  entityId: string | number;
}

export const EntityGraphPanel: React.FC<EntityGraphPanelProps> = ({ entityId }) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getEntityGraph(String(entityId), 2);
        setNodes(
          Array.isArray(data.nodes)
            ? data.nodes.map((n: any) => GraphService.normalizeNode(n))
            : [],
        );
        setEdges(
          Array.isArray(data.edges)
            ? data.edges.map((e: any) => ({
                id: String(
                  e.id || `${String(e.source || e.source_id)}-${String(e.target || e.target_id)}`,
                ),
                source: String(e.source || e.source_id),
                target: String(e.target || e.target_id),
                type: String(e.type || e.relationship_type || 'related_to'),
                weight: Number(e.weight || e.proximity_score || 1),
                confidence: Number(e.confidence || 1),
                docCount: Number(e.docCount || 0),
              }))
            : [],
        );
      } catch (e) {
        console.error('Failed to load entity graph:', e);
        setError(e instanceof Error ? e.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [entityId]);

  const mapperEntities: Entity[] = useMemo(() => {
    // 1. Dedup (Merge by Label)
    const uniqueNodes = GraphService.deduplicateNodes(nodes, String(entityId));

    // 3. Map to Mapper Entity Interface
    return uniqueNodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      properties: { riskScore: n.risk },
      confidence: 1.0,
      sources: [],
      isEgo: n.id === String(entityId),
      // Pass style hints if needed
    }));
  }, [nodes, entityId]);

  const mapperRelationships: Relationship[] = useMemo(() => {
    // 1. Remap Edges to Deduped IDs
    // We need to pass the *processed* nodes to ensuring mapping alignment
    // But GraphService.remapEdges expects the generic GraphNode
    // Let's reconstruct the GraphNode context or pass mapperEntities if compatible.
    // Actually, GraphService.remapEdges takes `GraphNode[]`.
    // mapperEntities is `Entity[]` which is compatiable-ish but let's be safe.

    const contextNodes: GraphNode[] = mapperEntities.map((e) => ({
      id: e.id,
      label: e.label,
      type: e.type,
      risk: e.properties.riskScore,
    }));

    const remapped = GraphService.remapEdges(edges, contextNodes);

    // 2. Map to Mapper Relationship Interface
    return remapped.map((e, _idx) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      type: e.type,
      strength: GraphService.calculateEdgeWeight(e.weight, e.confidence, e.docCount),
      confidence: e.confidence,
      evidence: [],
      properties: { docCount: e.docCount },
    }));
  }, [edges, mapperEntities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-[var(--text-muted)]">Loading entity graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-sm rounded-[var(--radius-lg)] p-4">
        Failed to load graph: {error}
      </div>
    );
  }

  if (!mapperEntities.length || !mapperRelationships.length) {
    return (
      <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 text-sm text-[var(--text-secondary)]">
        No graph data available yet for this entity.
      </div>
    );
  }

  return (
    <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4">
      <EntityRelationshipMapper entities={mapperEntities} relationships={mapperRelationships} />
    </div>
  );
};

export default EntityGraphPanel;
