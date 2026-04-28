import type {
  EntityMentionEvidenceDto,
  EntityEvidenceResponseDto,
  EntityRelationEvidenceDto,
} from '@shared/dto/evidence';

const asId = (value: unknown): string | number | null => {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'bigint') return value.toString();
  return null;
};

const asNullableString = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  return null;
};

const asFlagArray = (value: unknown): Array<{ type: string; severity: string | null }> => {
  if (!Array.isArray(value)) return [];
  return value.map((v) => {
    const rec = (
      typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
    ) as Record<string, unknown>;
    return {
      type: String(rec.type ?? rec.flag ?? ''),
      severity: asNullableString(rec.severity),
    };
  });
};

interface EvidenceRowInput {
  id?: unknown;
  documentId?: unknown;
  document_id?: unknown;
  evidenceType?: unknown;
  evidence_type?: unknown;
  title?: unknown;
  sourcePath?: unknown;
  source_path?: unknown;
  contentPreview?: unknown;
  content_preview?: unknown;
  redFlagRating?: unknown;
  red_flag_rating?: unknown;
  confidence?: unknown;
  role?: unknown;
  flags?: unknown[];
}

interface EntityEvidenceResponseInput {
  entity?: {
    id?: unknown;
    fullName?: unknown;
    full_name?: unknown;
    primaryRole?: unknown;
    primary_role?: unknown;
    entityCategory?: unknown;
    entity_category?: unknown;
    riskLevel?: unknown;
    risk_level?: unknown;
    redFlagRating?: unknown;
    red_flag_rating?: unknown;
    birthDate?: unknown;
    birth_date?: unknown;
    deathDate?: unknown;
    death_date?: unknown;
  };
  evidence?: EvidenceRowInput[];
  stats?: {
    totalEvidence?: unknown;
    total_evidence?: unknown;
    typeBreakdown?: unknown[];
    type_breakdown?: unknown[];
    roleBreakdown?: unknown[];
    role_breakdown?: unknown[];
    relatedEntities?: unknown[];
    related_entities?: unknown[];
    highRiskCount?: unknown;
    high_risk_count?: unknown;
    averageConfidence?: unknown;
    average_confidence?: unknown;
  };
}

interface RelationRowInput {
  id?: unknown;
  sourceId?: unknown;
  source_id?: unknown;
  targetId?: unknown;
  target_id?: unknown;
  relationshipType?: unknown;
  relationship_type?: unknown;
  confidence?: unknown;
  riskScore?: unknown;
  risk_score?: unknown;
  firstSeen?: unknown;
  first_seen?: unknown;
  lastSeen?: unknown;
  last_seen?: unknown;
  sourceName?: unknown;
  source_name?: unknown;
  targetName?: unknown;
  target_name?: unknown;
}

export const mapEntityMentionEvidenceDto = (row: EvidenceRowInput): EntityMentionEvidenceDto => ({
  id: asId(row.id),
  documentId: asId(row.documentId ?? row.document_id),
  evidenceType: String(row.evidenceType ?? row.evidence_type ?? 'document'),
  title: String(row.title ?? ''),
  sourcePath: String(row.sourcePath ?? row.source_path ?? ''),
  contentPreview: String(row.contentPreview ?? row.content_preview ?? ''),
  redFlagRating: Number(row.redFlagRating ?? row.red_flag_rating ?? 0),
  confidence: Number(row.confidence ?? 0),
  role: String(row.role ?? 'subject'),
  flags: asFlagArray(row.flags),
});

export const mapEntityEvidenceResponseDto = (
  data: EntityEvidenceResponseInput,
): EntityEvidenceResponseDto => ({
  entity: {
    id: String(data.entity?.id ?? ''),
    fullName: String(data.entity?.fullName ?? data.entity?.full_name ?? ''),
    primaryRole: String(data.entity?.primaryRole ?? data.entity?.primary_role ?? ''),
    entityCategory: String(data.entity?.entityCategory ?? data.entity?.entity_category ?? ''),
    riskLevel: String(data.entity?.riskLevel ?? data.entity?.risk_level ?? 'LOW'),
    redFlagRating: Number(data.entity?.redFlagRating ?? data.entity?.red_flag_rating ?? 0),
    birthDate: asNullableString(data.entity?.birthDate ?? data.entity?.birth_date),
    deathDate: asNullableString(data.entity?.deathDate ?? data.entity?.death_date),
  },
  evidence: Array.isArray(data.evidence) ? data.evidence.map(mapEntityMentionEvidenceDto) : [],
  stats: {
    totalEvidence: Number(data.stats?.totalEvidence ?? data.stats?.total_evidence ?? 0),
    typeBreakdown: (() => {
      const raw = data.stats?.typeBreakdown ?? data.stats?.type_breakdown;
      return Array.isArray(raw)
        ? (raw as unknown[]).map((v: unknown) => {
            const rec = v as Record<string, unknown>;
            return {
              evidenceType: String(rec.evidenceType ?? rec.evidence_type ?? rec.type ?? ''),
              count: Number(rec.count ?? 0),
            };
          })
        : [];
    })(),
    roleBreakdown: (() => {
      const raw = data.stats?.roleBreakdown ?? data.stats?.role_breakdown;
      return Array.isArray(raw)
        ? (raw as unknown[]).map((v: unknown) => {
            const rec = v as Record<string, unknown>;
            return {
              role: String(rec.role ?? ''),
              count: Number(rec.count ?? 0),
            };
          })
        : [];
    })(),
    relatedEntities: (() => {
      const raw = data.stats?.relatedEntities ?? data.stats?.related_entities;
      return Array.isArray(raw)
        ? (raw as unknown[]).map((v: unknown) => {
            const rec = v as Record<string, unknown>;
            return {
              id: Number(rec.id ?? 0),
              fullName: String(rec.fullName ?? rec.full_name ?? ''),
              entityCategory: String(rec.entityCategory ?? rec.entity_category ?? ''),
              sharedEvidenceCount: Number(
                rec.sharedEvidenceCount ?? rec.shared_evidence_count ?? 0,
              ),
            };
          })
        : [];
    })(),
    highRiskCount: Number(data.stats?.highRiskCount ?? data.stats?.high_risk_count ?? 0),
    averageConfidence: Number(data.stats?.averageConfidence ?? data.stats?.average_confidence ?? 0),
  },
});

export const mapEntityRelationEvidenceDto = (row: RelationRowInput): EntityRelationEvidenceDto => ({
  id: asId(row.id) ?? '',
  sourceId: asId(row.sourceId ?? row.source_id) ?? '',
  targetId: asId(row.targetId ?? row.target_id) ?? '',
  relationshipType: String(row.relationshipType ?? row.relationship_type ?? ''),
  confidence: Number(row.confidence ?? 0),
  riskScore: Number(row.riskScore ?? row.risk_score ?? 0),
  firstSeen: asNullableString(row.firstSeen ?? row.first_seen),
  lastSeen: asNullableString(row.lastSeen ?? row.last_seen),
  sourceName: asNullableString(row.sourceName ?? row.source_name) ?? undefined,
  targetName: asNullableString(row.targetName ?? row.target_name) ?? undefined,
});
