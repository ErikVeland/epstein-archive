import type { RelationshipDto, RelationshipListResponseDto } from '@shared/dto/relationships';

interface RelationshipRowInput {
  sourceId?: unknown;
  source_id?: unknown;
  targetId?: unknown;
  target_id?: unknown;
  relationshipType?: unknown;
  relationship_type?: unknown;
  proximityScore?: unknown;
  proximity_score?: unknown;
  confidence?: unknown;
  riskScore?: unknown;
  risk_score?: unknown;
  metadataJson?: unknown;
  metadata_json?: unknown;
}

interface RelationshipsListInput {
  canonicalId?: unknown;
  canonical_id?: unknown;
  relationships?: RelationshipRowInput[];
}

export const mapRelationshipDto = (
  row: RelationshipRowInput,
  currentEntityId: string,
): RelationshipDto => {
  const sourceId = String(row.sourceId ?? row.source_id ?? '');
  const targetId = String(row.targetId ?? row.target_id ?? '');
  const neighborId = sourceId === currentEntityId ? targetId : sourceId;

  return {
    entityId: currentEntityId,
    relatedEntityId: neighborId,
    relationshipType: String(row.relationshipType ?? row.relationship_type ?? ''),
    strength: Number(row.proximityScore ?? row.proximity_score ?? 0),
    confidence: Number(row.confidence ?? 0),
    weight: Number(row.proximityScore ?? row.proximity_score ?? 0),
    riskScore: Number(row.riskScore ?? row.risk_score ?? 0),
    metadata: (() => {
      const raw = row.metadataJson ?? row.metadata_json;
      if (raw == null) return {};
      if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return typeof parsed === 'object' && parsed !== null
            ? (parsed as Record<string, unknown>)
            : {};
        } catch {
          return {};
        }
      }
      return {};
    })(),
  };
};

export const mapRelationshipListResponseDto = (
  data: RelationshipsListInput,
): RelationshipListResponseDto => {
  const currentId = String(data.canonicalId ?? data.canonical_id ?? '');
  return {
    relationships: Array.isArray(data.relationships)
      ? data.relationships.map((r) => mapRelationshipDto(r, currentId))
      : [],
  };
};
