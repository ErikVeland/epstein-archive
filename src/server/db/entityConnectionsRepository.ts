import { getApiPool } from './connection.js';

export interface EntityConnectionSignal {
  relationship: { score: number; type: string | null; confidence: number | null };
  financial: { score: number; count: number };
  communications: { score: number; count: number };
  flights: { score: number; count: number };
  documents: { score: number; count: number };
}

export interface EntityConnection {
  entityId: string;
  entityName: string;
  entityType: string;
  riskRating: number;
  communityId: number | null;
  totalScore: number;
  signals: EntityConnectionSignal;
}

interface ConnectionRow {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  risk_rating: string | number;
  community_id: string | number | null;
  total_score: string | number;
  rel_score: string | number;
  fin_score: string | number;
  comm_score: string | number;
  flight_score: string | number;
  doc_score: string | number;
  rel_type: string | null;
  rel_confidence: string | number | null;
  fin_count: string | number;
  comm_count: string | number;
  flight_count: string | number;
  doc_count: string | number;
}

export const entityConnectionsRepository = {
  async getConnections(
    entityId: number,
    opts: { limit?: number; minScore?: number } = {},
  ): Promise<EntityConnection[]> {
    const limit = opts.limit ?? 50;
    const minScore = opts.minScore ?? 0;

    const { rows } = await getApiPool().query<ConnectionRow>(
      `
      WITH signals AS (
        SELECT
          ecs.other_id,
          SUM(CASE WHEN ecs.signal_type = 'relationship' THEN ecs.confidence * 100 ELSE 0 END) AS rel_score,
          SUM(CASE WHEN ecs.signal_type = 'financial'    THEN ecs.count * 15          ELSE 0 END) AS fin_score,
          SUM(CASE WHEN ecs.signal_type = 'communication'THEN ecs.count * 12          ELSE 0 END) AS comm_score,
          SUM(CASE WHEN ecs.signal_type = 'flight'       THEN ecs.count * 10          ELSE 0 END) AS flight_score,
          SUM(CASE WHEN ecs.signal_type = 'document'     THEN ecs.count * 1           ELSE 0 END) AS doc_score,
          MAX(CASE WHEN ecs.signal_type = 'financial'    THEN ecs.count ELSE 0 END)   AS fin_count,
          MAX(CASE WHEN ecs.signal_type = 'communication'THEN ecs.count ELSE 0 END)   AS comm_count,
          MAX(CASE WHEN ecs.signal_type = 'flight'       THEN ecs.count ELSE 0 END)   AS flight_count,
          MAX(CASE WHEN ecs.signal_type = 'document'     THEN ecs.count ELSE 0 END)   AS doc_count
        FROM entity_connection_signals ecs
        WHERE ecs.entity_id = $1::bigint
        GROUP BY ecs.other_id
      )
      SELECT
        e.id::text               AS entity_id,
        e.full_name              AS entity_name,
        COALESCE(e.entity_type, e.primary_role, 'unknown') AS entity_type,
        COALESCE(e.red_flag_rating, 0) AS risk_rating,
        e.community_id,
        (s.rel_score + s.fin_score + s.comm_score + s.flight_score + s.doc_score) AS total_score,
        s.rel_score, s.fin_score, s.comm_score, s.flight_score, s.doc_score,
        er.relationship_type     AS rel_type,
        er.confidence            AS rel_confidence,
        s.fin_count, s.comm_count, s.flight_count, s.doc_count
      FROM signals s
      JOIN entities e ON e.id = s.other_id
      LEFT JOIN entity_relationships er
        ON er.source_entity_id = $1::bigint AND er.target_entity_id = s.other_id
      WHERE (s.rel_score + s.fin_score + s.comm_score + s.flight_score + s.doc_score) >= $2
      ORDER BY total_score DESC
      LIMIT $3
      `,
      [entityId, minScore, limit],
    );

    return rows.map((r) => ({
      entityId: r.entity_id,
      entityName: r.entity_name,
      entityType: r.entity_type,
      riskRating: Number(r.risk_rating),
      communityId: r.community_id ? Number(r.community_id) : null,
      totalScore: Number(r.total_score),
      signals: {
        relationship: {
          score: Number(r.rel_score),
          type: r.rel_type,
          confidence: r.rel_confidence ? Number(r.rel_confidence) : null,
        },
        financial: { score: Number(r.fin_score), count: Number(r.fin_count) },
        communications: { score: Number(r.comm_score), count: Number(r.comm_count) },
        flights: { score: Number(r.flight_score), count: Number(r.flight_count) },
        documents: { score: Number(r.doc_score), count: Number(r.doc_count) },
      },
    }));
  },
};
