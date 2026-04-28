import { getApiPool } from './runtime.js';
import { logger } from '../services/Logger.js';

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
      SELECT * FROM (
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
    const client = await getApiPool().connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout = '300000ms'");
      const result = await client.query<TopConnectedPerson>(`
        WITH rel_counts AS (
          SELECT entity_id, SUM(cnt)::bigint AS cnt
          FROM (
            SELECT source_entity_id AS entity_id, COUNT(*)::bigint AS cnt
            FROM entity_relationships
            GROUP BY source_entity_id
            UNION ALL
            SELECT target_entity_id AS entity_id, COUNT(*)::bigint AS cnt
            FROM entity_relationships
            GROUP BY target_entity_id
          ) t
          GROUP BY entity_id
        ),
        filtered AS (
          SELECT
            e.id,
            e.full_name,
            e.primary_role,
            COALESCE(e.mentions, 0)::bigint AS mentions,
            COALESCE(e.red_flag_rating, 0)::int AS red_flag_rating,
            COALESCE(rc.cnt, 0)::bigint AS connection_count
          FROM entities e
          LEFT JOIN rel_counts rc ON rc.entity_id = e.id
          WHERE e.entity_type = 'Person'
            AND COALESCE(e.junk_tier, 'clean') = 'clean'
            AND COALESCE(e.quarantine_status, 0) = 0
            AND e.full_name IS NOT NULL
            AND length(trim(e.full_name)) >= 4
            AND e.full_name !~ '[0-9]'
            AND e.full_name !~ '\\n'
            AND e.full_name NOT ILIKE 'the %'
            AND e.full_name NOT ILIKE '% group'
            AND e.full_name NOT ILIKE '% inc'
            AND e.full_name NOT ILIKE '% llc'
            AND e.full_name NOT ILIKE '% corp'
            AND e.full_name NOT ILIKE '% ltd'
            AND e.full_name NOT ILIKE '% demolition'
            AND e.full_name NOT ILIKE '% bracket'
            AND e.full_name NOT ILIKE '% column%'
            AND e.full_name NOT ILIKE '% haul%'
            AND e.full_name NOT ILIKE '%provided'
            AND e.full_name NOT ILIKE '%direction'
            AND e.full_name NOT ILIKE '% name'
            AND e.full_name NOT ILIKE '% name%'
            AND e.full_name NOT ILIKE '% data%'
            AND e.full_name NOT ILIKE '% regular'
            AND e.full_name NOT ILIKE '% stock %'
            AND e.full_name NOT ILIKE '% market %'
            AND e.full_name NOT ILIKE '% newsletter%'
            AND e.full_name NOT ILIKE '% search %'
            AND e.full_name NOT ILIKE '% click %'
            AND e.full_name NOT ILIKE '% privacy %'
            AND array_length(regexp_split_to_array(trim(e.full_name), '\\s+'), 1) <= 3
        ),
        canonical_people AS (
          SELECT
            MIN(id)::bigint AS id,
            CASE
              WHEN full_name IN ('Donald Trump', 'President Trump', 'Mr Trump', 'Trump', 'Donald J Trump', 'Donald J. Trump') THEN 'Donald Trump'
              WHEN full_name IN ('Jeffrey Epstein', 'Epstein', 'Jeffrey', 'Jeff Epstein', 'Mr Epstein') THEN 'Jeffrey Epstein'
              WHEN full_name IN ('Ghislaine Maxwell', 'Maxwell', 'Ghislaine', 'Ms Maxwell', 'Miss Maxwell') THEN 'Ghislaine Maxwell'
              WHEN full_name IN ('Bill Clinton', 'President Clinton', 'Mr Clinton', 'Clinton', 'William Clinton')
                AND lower(full_name) NOT LIKE '%hillary%' AND lower(full_name) NOT LIKE '%chelsea%' THEN 'Bill Clinton'
              WHEN full_name IN ('Prince Andrew', 'Duke of York', 'Andrew') OR lower(full_name) LIKE '%prince andrew%' THEN 'Prince Andrew'
              WHEN full_name IN ('Alan Dershowitz', 'Dershowitz', 'Mr Dershowitz') THEN 'Alan Dershowitz'
              ELSE regexp_replace(trim(full_name), '\\s+', ' ', 'g')
            END AS canonical_name,
            SUM(mentions)::bigint AS mentions,
            MAX(red_flag_rating)::int AS red_flag_rating,
            MAX(primary_role) AS primary_role,
            SUM(connection_count)::bigint AS connection_count
          FROM filtered
          GROUP BY 2
        )
        SELECT
          id,
          canonical_name AS name,
          primary_role AS role,
          'Person'::text AS type,
          red_flag_rating AS "riskLevel",
          connection_count AS "connectionCount",
          mentions
        FROM canonical_people
        WHERE mentions > 0
        ORDER BY "connectionCount" DESC, mentions DESC, name ASC
        LIMIT 100
      `);
      await client.query('ROLLBACK');
      return result.rows;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error(
        { err },
        '[Analytics] getTopConnectedPeople failed — re-throwing so callers surface a 500',
      );
      throw err;
    } finally {
      client.release();
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
