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

/**
 * Compute the top-connected people by relationship count.
 *
 * The rel_counts CTE scans entity_relationships twice and can run for many
 * minutes on large datasets, so we wrap it in a transaction with SET LOCAL to
 * guarantee a 60-second hard cap regardless of any session-settings races in
 * the connection pool.  Returns an empty array on timeout or error.
 */
export const analyticsRepository = {
  getTopConnectedPeople: async (): Promise<TopConnectedPerson[]> => {
    const client = await getApiPool().connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout = '60000ms'");
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
      logger.warn('[Analytics] getTopConnectedPeople failed:', (err as Error).message);
      return [];
    } finally {
      client.release();
    }
  },
};
