import { getApiPool } from './runtime.js';
import { logger } from '../services/Logger.js';

/**
 * getTopConnectedPeople reads directly from the mv_top_connected materialized
 * view, which is maintained by matViewRefresh.ts on a 10-minute cycle.
 *
 * The previous implementation ran a complex live CTE query that consistently
 * hit the 60-second statement_timeout on large datasets. The mat view
 * (rebuilt in migration 1756900000000) contains the same canonical
 * deduplication and name-quality filters, so the live query is no longer
 * needed. This makes the call sub-millisecond.
 *
 * Column aliases match the pgtyped analytics.sql query exactly:
 *   id, name, role, type, risk_level, connection_count, mentions
 */
async function _queryTopConnectedFromMatView(): Promise<TopConnectedPerson[]> {
  const result = await getApiPool().query<{
    id: number;
    name: string;
    role: string | null;
    type: string;
    risk_level: number;
    connection_count: number;
    mentions: number;
  }>(`
    SELECT id, name, role, type, risk_level, connection_count, mentions
    FROM mv_top_connected
    ORDER BY connection_count DESC, mentions DESC, name ASC
    LIMIT 100
  `);
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    type: row.type,
    riskLevel: row.risk_level,
    connectionCount: Number(row.connection_count),
    mentions: Number(row.mentions),
  }));
}

/** Kept for backwards compatibility — no-op now that the mat view is canonical. */
export function warmTopConnectedCache(): void {
  // The mat view is populated on first REFRESH MATERIALIZED VIEW by the scheduler.
  // No background warm needed.
}

export interface TopConnectedPerson {
  id: number;
  name: string;
  role: string | null;
  type: string;
  riskLevel: number;
  connectionCount: number;
  mentions: number;
}

export interface TimelineAnalyticsRow {
  period: string;
  total: string | number;
  emails: string | number;
  photos: string | number;
  documents: string | number;
  financial: string | number;
}

export interface RiskDistributionRow {
  riskLevel: number;
  count: number;
}

export interface TopEntitySummaryRow {
  id: number | string;
  canonicalId?: number | string | null;
  fullName?: string | null;
  name?: string | null;
}

export interface AnalyticsTotalsRow {
  totalDocuments: string | number;
  totalEntities: string | number;
}

export interface EntityRelationshipCorrelationRow {
  target_id: number | string;
  relationship_type: string | null;
  proximity_score: number | string | null;
  confidence: number | string | null;
}

export interface FinancialTransactionRow {
  from_entity: string | number | null;
  to_entity: string | number | null;
  risk_level: string | null;
}

export interface CommunicationCorrelationRow {
  from: string | number | null;
  to: Array<string | number> | null;
}

/** Wrapper returned by optional sub-queries that can fail gracefully. */
export interface DegradedResult<T> {
  data: T[];
  degraded: true;
}

/**
 * Compute the top-connected people by relationship count.
 *
 * The rel_counts CTE scans entity_relationships twice and can run for many
 * minutes on large datasets, so we wrap it in a transaction with SET LOCAL to
 * guarantee a 60-second hard cap regardless of any session-settings races in
 * the connection pool.  Returns an empty array on timeout or error.
 */
export const analyticsRepository = {
  getTimelineAnalytics: async (): Promise<TimelineAnalyticsRow[]> => {
    const result = await getApiPool().query<TimelineAnalyticsRow>(`
      SELECT
        period,
        total,
        emails,
        photos,
        documents,
        financial
      FROM (
        SELECT
          CASE
            WHEN COALESCE(extracted_date, date_created) IS NULL THEN 'Unknown'
            WHEN COALESCE(extracted_date, date_created) > '2026-12-31'::date THEN 'Unknown'
            ELSE to_char(COALESCE(extracted_date, date_created), 'YYYY-MM')
          END AS period,
          COUNT(*)::bigint AS total,
          SUM(CASE WHEN file_type LIKE '%email%' OR file_type = 'message/rfc822' THEN 1 ELSE 0 END)::bigint AS emails,
          SUM(CASE WHEN file_type LIKE '%image%' THEN 1 ELSE 0 END)::bigint AS photos,
          SUM(CASE WHEN file_type LIKE '%pdf%' OR file_type = 'application/pdf' THEN 1 ELSE 0 END)::bigint AS documents,
          0::bigint AS financial
        FROM documents
        GROUP BY 1
      ) t
      ORDER BY (CASE WHEN period = 'Unknown' THEN '9999-99' ELSE period END) ASC
    `);
    return result.rows;
  },

  getRiskDistribution: async (): Promise<RiskDistributionRow[]> => {
    const result = await getApiPool().query<RiskDistributionRow>(`
      SELECT red_flag_rating AS "riskLevel", COUNT(*)::integer AS count
      FROM entities
      WHERE red_flag_rating IS NOT NULL
        AND COALESCE(junk_tier, 'clean') = 'clean'
      GROUP BY red_flag_rating
      ORDER BY red_flag_rating
    `);
    return result.rows;
  },

  getTopConnectedPeople: async (): Promise<TopConnectedPerson[]> => {
    // Reads directly from mv_top_connected which is maintained by the 10-minute
    // periodic mat-view refresh scheduler (matViewRefresh.ts). This replaces the
    // previous approach of running a live 60-second+ CTE query in the background
    // with a cache layer — the mat view itself IS the cache, kept fresh server-side.
    try {
      return await _queryTopConnectedFromMatView();
    } catch (err) {
      logger.error({ err }, '[Analytics] getTopConnectedPeople mat view query failed');
      return [];
    }
  },

  getTopEntityByMentions: async (): Promise<TopEntitySummaryRow | null> => {
    const result = await getApiPool().query<TopEntitySummaryRow>(`
      SELECT e.id, e.canonical_id AS "canonicalId", e.full_name AS "fullName", e.name
      FROM entities e
      JOIN entity_mentions em ON e.id = em.entity_id
      GROUP BY e.id, e.canonical_id, e.full_name, e.name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `);
    return result.rows[0] ?? null;
  },

  getAnalyticsTotals: async (): Promise<AnalyticsTotalsRow | null> => {
    const result = await getApiPool().query<AnalyticsTotalsRow>(`
      SELECT
        (SELECT COUNT(*) FROM documents) AS "totalDocuments",
        (SELECT COUNT(*) FROM entities) AS "totalEntities"
    `);
    return result.rows[0] ?? null;
  },

  getEntityRelationshipCorrelations: async (
    entityId: string | number,
  ): Promise<EntityRelationshipCorrelationRow[]> => {
    const result = await getApiPool().query<EntityRelationshipCorrelationRow>(
      `
        SELECT
          target_entity_id AS "target_id",
          relationship_type,
          proximity_score,
          1 AS "confidence"
        FROM entity_relationships
        WHERE source_entity_id = $1 OR target_entity_id = $1
        ORDER BY proximity_score DESC
        LIMIT 20
      `,
      [entityId],
    );
    return result.rows;
  },

  getHighRiskFinancialTransactions: async (): Promise<
    FinancialTransactionRow[] | DegradedResult<FinancialTransactionRow>
  > => {
    try {
      const result = await getApiPool().query<FinancialTransactionRow>(`
        SELECT from_entity, to_entity, risk_level
        FROM financial_transactions
        WHERE risk_level IN ('high', 'critical')
        LIMIT 500
      `);
      return result.rows;
    } catch (err) {
      logger.error(
        { err },
        '[Analytics] getHighRiskFinancialTransactions failed — returning degraded empty result',
      );
      return { data: [], degraded: true };
    }
  },

  getFlightCommunications: async (
    entityId: string | number,
  ): Promise<CommunicationCorrelationRow[] | DegradedResult<CommunicationCorrelationRow>> => {
    try {
      const result = await getApiPool().query<CommunicationCorrelationRow>(
        `
          SELECT "from", "to"
          FROM communications
          WHERE (sender_id = $1 OR receiver_ids @> ARRAY[$1]::integer[])
            AND content ILIKE '%flight%'
          LIMIT 200
        `,
        [entityId],
      );
      return result.rows;
    } catch (err) {
      logger.error(
        { err },
        '[Analytics] getFlightCommunications failed — returning degraded empty result',
      );
      return { data: [], degraded: true };
    }
  },
};
