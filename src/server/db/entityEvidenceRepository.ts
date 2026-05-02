import { entityEvidenceQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import {
  mapEntityMentionEvidenceDto,
  mapEntityEvidenceResponseDto,
  mapEntityRelationEvidenceDto,
} from '../mappers/entityEvidenceDtoMapper.js';

interface RelationEvidenceRow {
  relation_id: string;
  subject_entity_id: string | number;
  object_entity_id: string | number;
  predicate: string;
  direction: string;
  weight: number;
  first_seen_at: string | Date;
  last_seen_at: string | Date;
  relation_evidence_id?: string | number | null;
  document_id?: string | number | null;
  span_id?: string | number | null;
  quote_text?: string | null;
  confidence?: number | null;
  mention_ids?: unknown;
  document_title?: string | null;
  document_path?: string | null;
}

interface EntityTransactionResult {
  entityName: string;
  transactions: Array<Record<string, unknown>>;
}

export const entityEvidenceRepository = {
  async getEntityMentionEvidence(entityId: string) {
    const eid = entityId;

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
      { entityId: eid, limit: 200 },
      getApiPool(),
    );

    type MentionEvidenceRowInput = Parameters<typeof mapEntityMentionEvidenceDto>[0];
    const evidence = (evidenceRows as unknown as MentionEvidenceRowInput[]).map(
      mapEntityMentionEvidenceDto,
    );

    // Stats
    const totalEvidence = evidence.length;
    const typeMap = new Map<string, number>();
    for (const e of evidence) {
      const key = e.evidenceType || 'unknown';
      typeMap.set(key, (typeMap.get(key) || 0) + 1);
    }
    const typeBreakdown = Array.from(typeMap.entries()).map(([evidenceType, count]) => ({
      evidenceType,
      count,
    }));

    const roleMap = new Map<string, number>();
    for (const e of evidence) {
      const key = e.role || 'mentioned';
      roleMap.set(key, (roleMap.get(key) || 0) + 1);
    }
    const roleBreakdown = Array.from(roleMap.entries()).map(([role, count]) => ({
      role,
      count,
    }));

    const relatedEntitiesRaw = await entityEvidenceQueries.getRelatedEntitiesByRelations.run(
      { entityId: eid, limit: 20 },
      getApiPool(),
    );

    const highRiskCount = evidence.filter((e) => (e.redFlagRating || 0) >= 4).length;
    const averageConfidence =
      evidence.reduce((sum: number, e) => sum + (e.confidence || 0), 0) / (evidence.length || 1);

    // Use the standardized mapper
    const entityRec = entity as unknown as Record<string, unknown>;
    return mapEntityEvidenceResponseDto({
      entity: {
        id: String(entity.id),
        fullName: entity.full_name,
        primaryRole: entity.primary_role,
        entityCategory: entity.entity_category,
        riskLevel: entity.risk_level,
        redFlagRating: Number(entity.red_flag_rating),
        birthDate: entityRec['birth_date'],
        deathDate: entityRec['death_date'],
      },
      evidence: evidenceRows as unknown as MentionEvidenceRowInput[],
      stats: {
        totalEvidence,
        typeBreakdown,
        roleBreakdown,
        relatedEntities: relatedEntitiesRaw as unknown[],
        highRiskCount,
        averageConfidence,
      },
    });
  },

  async getRelationEvidenceForEntity(entityId: string | number) {
    const eid = entityId;
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
          first_seen_at:
            row.first_seen_at instanceof Date
              ? row.first_seen_at.toISOString()
              : String(row.first_seen_at),
          last_seen_at:
            row.last_seen_at instanceof Date
              ? row.last_seen_at.toISOString()
              : String(row.last_seen_at),
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
      relations: Array.from(byRelation.values()).map((rel) => ({
        ...rel,
        evidence: rel.evidence.map((e) =>
          mapEntityRelationEvidenceDto(e as Parameters<typeof mapEntityRelationEvidenceDto>[0]),
        ),
      })),
      evidence: rows as unknown[],
    };
  },

  async getFlightsForEntity(entityId: string | number) {
    const pool = getApiPool();
    const entityRow = await pool.query(`SELECT full_name FROM entities WHERE id = $1 LIMIT 1`, [
      Number(entityId),
    ]);
    if (entityRow.rows.length === 0) return [];
    const entityName = entityRow.rows[0].full_name;

    const result = await pool.query(
      `SELECT
         f.id,
         f.date,
         f.departure_airport,
         f.departure_city,
         f.departure_country,
         f.arrival_airport,
         f.arrival_city,
         f.arrival_country,
         f.aircraft_tail,
         f.aircraft_type,
         fp_self.role AS passenger_role,
         COALESCE(
           json_agg(
             json_build_object(
               'passenger_name', fp_other.passenger_name,
               'role', fp_other.role,
               'entity_id', fp_other.entity_id
             ) ORDER BY fp_other.passenger_name
           ) FILTER (WHERE fp_other.id IS NOT NULL),
           '[]'::json
         ) AS co_passengers
       FROM flight_passengers fp_self
       JOIN flights f ON f.id = fp_self.flight_id
       LEFT JOIN flight_passengers fp_other
         ON fp_other.flight_id = f.id
         AND fp_other.passenger_name IS DISTINCT FROM fp_self.passenger_name
       WHERE fp_self.entity_id = $1
          OR fp_self.passenger_name = $2
          OR fp_self.passenger_name ~* ('\\y' || $2 || '\\y')
       GROUP BY f.id, f.date, f.departure_airport, f.departure_city,
                f.departure_country, f.arrival_airport, f.arrival_city,
                f.arrival_country, f.aircraft_tail, f.aircraft_type,
                fp_self.role
       ORDER BY f.date DESC`,
      [Number(entityId), entityName],
    );
    return result.rows.map((row) => ({
      ...row,
      id: Number(row.id),
    }));
  },

  async getTransactionsForEntity(
    entityId: string | number,
  ): Promise<EntityTransactionResult | null> {
    const pool = getApiPool();
    const entityRow = await pool.query(`SELECT full_name FROM entities WHERE id = $1 LIMIT 1`, [
      Number(entityId),
    ]);
    if (entityRow.rows.length === 0) return null;

    const entityName: string = entityRow.rows[0].full_name;
    const result = await pool.query(
      `SELECT
         id,
         from_entity,
         to_entity,
         amount,
         currency,
         transaction_date,
         transaction_type,
         method,
         risk_level,
         description,
         source_document_id
       FROM financial_transactions
       WHERE from_entity ILIKE $1 OR to_entity ILIKE $1
       ORDER BY transaction_date DESC`,
      [entityName],
    );
    return { transactions: result.rows, entityName };
  },

  async getPropertiesForEntity(entityId: string | number) {
    const pool = getApiPool();
    const entityRow = await pool.query(`SELECT full_name FROM entities WHERE id = $1 LIMIT 1`, [
      Number(entityId),
    ]);
    if (entityRow.rows.length === 0) return [];
    const entityName = entityRow.rows[0].full_name;

    const result = await pool.query(
      `SELECT
         id,
         pcn,
         owner_name_1,
         owner_name_2,
         site_address,
         street_name,
         total_tax_value,
         acres,
         property_use,
         year_built,
         bedrooms,
         full_bathrooms,
         half_bathrooms,
         building_area,
         living_area,
         is_epstein_property,
         is_known_associate
       FROM palm_beach_properties
       WHERE linked_entity_id = $1
          OR owner_name_1 = $2
          OR owner_name_2 = $2
          OR owner_name_1 ~* ('\\y' || $2 || '\\y')
          OR owner_name_2 ~* ('\\y' || $2 || '\\y')
       ORDER BY total_tax_value DESC NULLS LAST`,
      [Number(entityId), entityName],
    );
    return result.rows.map((row) => ({
      ...row,
      total_tax_value: Number(row.total_tax_value || 0),
      acres: Number(row.acres || 0),
      year_built: row.year_built ? Number(row.year_built) : null,
      building_area: row.building_area ? Number(row.building_area) : 0,
      living_area: row.living_area ? Number(row.living_area) : 0,
    }));
  },
};
