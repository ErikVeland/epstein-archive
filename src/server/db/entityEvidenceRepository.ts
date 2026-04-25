import { entityEvidenceQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

interface MentionEvidenceRow {
  evidence_id?: string | number | null;
  document_id?: string | number | null;
  evidence_type?: string | null;
  title?: string | null;
  file_path?: string | null;
  red_flag_rating?: number | null;
  date_created?: string | null;
  score?: number | null;
  mention_context?: string | null;
  flag_type?: string | null;
  severity?: string | null;
}

interface RelatedEntityRow {
  shared_evidence_count?: string | number | null;
  [key: string]: unknown;
}

interface RelationEvidenceRow {
  relation_id: string;
  subject_entity_id: string | number;
  object_entity_id: string | number;
  predicate: string;
  direction: string;
  weight: number;
  first_seen_at: string;
  last_seen_at: string;
  relation_evidence_id?: string | number | null;
  document_id?: string | number | null;
  span_id?: string | number | null;
  quote_text?: string | null;
  confidence?: number | null;
  mention_ids?: unknown;
  document_title?: string | null;
  document_path?: string | null;
}

export const entityEvidenceRepository = {
  async getEntityMentionEvidence(entityId: string) {
    const eid = BigInt(entityId);

    // Basic entity lookup
    const entityRows = await entityEvidenceQueries.getEntityMentionDetails.run(
      { entityId: eid },
      getApiPool(),
    );
    const entity = entityRows[0];

    if (!entity) {
      return null;
    }

    // Core mention-derived evidence items
    const evidenceRows = await entityEvidenceQueries.getMentionDerivedEvidence.run(
      { entityId: eid, limit: BigInt(200) },
      getApiPool(),
    );

    // Normalize evidence shape to match EntityEvidencePanel expectations (camelCase)
    const evidence = (evidenceRows as MentionEvidenceRow[]).map((row) => ({
      id: row.evidence_id,
      documentId: row.document_id,
      document_id: row.document_id, // Add snake_case for FE compatibility
      evidenceType: row.evidence_type || 'document_context',
      evidence_type: row.evidence_type || 'document_context',
      title: row.title || `Document ${row.document_id}`,
      description: '',
      sourcePath: row.file_path || '',
      source_path: row.file_path || '',
      contentPreview: row.mention_context || '', // Canonical FE name
      context_snippet: row.mention_context || '', // Used in some FE parts
      cleanedPath: null,
      redFlagRating: row.red_flag_rating ?? 0,
      createdAt: row.date_created || null,
      role: 'mentioned',
      confidence: typeof row.score === 'number' ? row.score : 0.0,
      contextSnippet: row.mention_context || '',
      flags: row.flag_type
        ? [
            {
              type: row.flag_type,
              severity: row.severity,
            },
          ]
        : [],
    }));

    // Stats
    const totalEvidence = evidence.length;

    // Type breakdown by evidenceType
    const typeMap = new Map<string, number>();
    for (const e of evidence) {
      const key = e.evidenceType || 'unknown';
      typeMap.set(key, (typeMap.get(key) || 0) + 1);
    }
    const typeBreakdown = Array.from(typeMap.entries()).map(([evidenceType, count]) => ({
      evidenceType,
      count,
    }));

    // Role breakdown
    const roleMap = new Map<string, number>();
    for (const e of evidence) {
      const key = e.role || 'mentioned';
      roleMap.set(key, (roleMap.get(key) || 0) + 1);
    }
    const roleBreakdown = Array.from(roleMap.entries()).map(([role, count]) => ({
      role,
      count,
    }));

    // Related entities via relations graph
    const relatedEntitiesRaw = await entityEvidenceQueries.getRelatedEntitiesByRelations.run(
      { entityId: eid, limit: BigInt(20) },
      getApiPool(),
    );
    const relatedEntities = (relatedEntitiesRaw as RelatedEntityRow[]).map((r) => ({
      id: Number((r as Record<string, unknown>).id),
      fullName: String((r as Record<string, unknown>).full_name || ''),
      entityCategory: String((r as Record<string, unknown>).entity_category || ''),
      sharedEvidenceCount: Number(r.shared_evidence_count),
    }));

    const highRiskCount = evidence.filter((e) => (e.redFlagRating || 0) >= 4).length;
    const averageConfidence =
      evidence.reduce((sum: number, e) => sum + (e.confidence || 0), 0) / (evidence.length || 1);

    return {
      entity: {
        id: String(entity.id),
        fullName: entity.full_name || '',
        primaryRole: entity.primary_role || '',
        entityCategory: entity.entity_category || '',
        riskLevel: entity.risk_level || 'LOW',
        redFlagRating: Number(entity.red_flag_rating || 0),
        birthDate: (entity as any).birth_date || null,
        deathDate: (entity as any).death_date || null,
      },
      evidence,
      stats: {
        totalEvidence,
        typeBreakdown,
        roleBreakdown,
        relatedEntities,
        highRiskCount,
        averageConfidence,
      },
    };
  },

  async getRelationEvidenceForEntity(entityId: string | number) {
    const eid = BigInt(entityId);
    const rows = await entityEvidenceQueries.getRelationEvidenceForEntity.run(
      { entityId: eid },
      getApiPool(),
    );

    interface RelationGroup {
      id: string;
      subject_entity_id: string;
      object_entity_id: string;
      predicate: string;
      direction: string;
      weight: number;
      first_seen_at: string;
      last_seen_at: string;
      evidence: Array<{
        id: unknown;
        document_id: string;
        span_id: unknown;
        quote_text: unknown;
        confidence: unknown;
        mention_ids: unknown;
        document_title: unknown;
        document_path: unknown;
      }>;
    }
    const byRelation = new Map<string, RelationGroup>();

    for (const row of rows as RelationEvidenceRow[]) {
      let rel = byRelation.get(row.relation_id);
      if (!rel) {
        rel = {
          id: row.relation_id,
          subject_entity_id: String(row.subject_entity_id),
          object_entity_id: String(row.object_entity_id),
          predicate: row.predicate,
          direction: row.direction,
          weight: row.weight,
          first_seen_at: row.first_seen_at,
          last_seen_at: row.last_seen_at,
          evidence: [],
        };
        byRelation.set(row.relation_id, rel);
      }
      rel.evidence.push({
        id: row.relation_evidence_id,
        document_id: String(row.document_id),
        span_id: row.span_id,
        quote_text: row.quote_text,
        confidence: row.confidence,
        mention_ids: row.mention_ids,
        document_title: row.document_title,
        document_path: row.document_path,
      });
    }

    return {
      relations: Array.from(byRelation.values()),
      evidence: rows,
    };
  },
};
