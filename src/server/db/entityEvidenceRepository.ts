import { entityEvidenceQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

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

    // Normalize evidence shape to match EntityEvidencePanel expectations
    const evidence = evidenceRows.map((row: any) => ({
      id: row.evidence_id,
      document_id: row.document_id,
      evidence_type: row.evidence_type || 'document_context',
      title: row.title || `Document ${row.document_id}`,
      description: '',
      source_path: row.file_path || '',
      cleaned_path: null,
      red_flag_rating: row.red_flag_rating ?? 0,
      created_at: row.date_created || null,
      role: 'mentioned',
      confidence: typeof row.score === 'number' ? row.score : 0.0,
      context_snippet: row.mention_context || '',
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

    // Type breakdown by evidence_type
    const typeMap = new Map<string, number>();
    for (const e of evidence) {
      const key = e.evidence_type || 'unknown';
      typeMap.set(key, (typeMap.get(key) || 0) + 1);
    }
    const typeBreakdown = Array.from(typeMap.entries()).map(([evidence_type, count]) => ({
      evidence_type,
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
    const relatedEntities = relatedEntitiesRaw.map((r: any) => ({
      ...r,
      shared_evidence_count: Number(r.shared_evidence_count),
    }));

    const highRiskCount = evidence.filter((e: any) => (e.red_flag_rating || 0) >= 4).length;
    const averageConfidence =
      evidence.reduce((sum: number, e: any) => sum + (e.confidence || 0), 0) /
      (evidence.length || 1);

    return {
      entity: {
        ...entity,
        id: String(entity.id),
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

    const byRelation = new Map<string, any>();

    for (const row of rows) {
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
          evidence: [] as any[],
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
