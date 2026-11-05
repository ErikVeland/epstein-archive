import type { GraphResponseDto } from '@shared/dto/graph';

export function getNetworkRelationships(
  entityId: string,
  relationships: Record<string, unknown>[],
  graph?: GraphResponseDto,
): Record<string, unknown>[] {
  if (relationships.length > 0) {
    return relationships.slice(0, 20).map((relationship) => ({
      ...relationship,
      name:
        relationship.related_entity_name ||
        relationship.name ||
        relationship.related_entity_id ||
        relationship.entity_id,
    }));
  }
  if (!graph) return [];
  const names = new Map(graph.nodes.map((node) => [String(node.id), node.label]));
  return graph.edges
    .filter((edge) => String(edge.source) === entityId || String(edge.target) === entityId)
    .slice(0, 20)
    .map((edge) => {
      const relatedId =
        String(edge.source) === entityId ? String(edge.target) : String(edge.source);
      return {
        related_entity_id: relatedId,
        name: names.get(relatedId) || relatedId,
        relationship_type: edge.type,
        strength: edge.weight,
        confidence: edge.confidence,
      };
    });
}
