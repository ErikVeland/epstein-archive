/* eslint-disable no-undef */
/**
 * Rebuild mv_top_connected with the full canonical deduplication query.
 *
 * Background: the original mat view used a simple JOIN that exposed raw
 * entity rows without deduplication or name-quality filtering. The API
 * fell back to a live CTE query (_runTopConnectedQuery) which applied all
 * the filtering but hit the 60-second statement_timeout on every boot.
 *
 * This migration replaces the view definition so the mat view itself
 * stores canonical, de-duped, filtered people — making the live fallback
 * unnecessary. The existing unique index on `id` is retained so
 * REFRESH MATERIALIZED VIEW CONCURRENTLY continues to work.
 *
 * The `name` column now stores the canonical (deduplicated) name.
 * Column aliases match the existing analytics.sql pgtyped query exactly
 * so no consumer code needs to change.
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  // Drop the existing view and its index, then recreate with the full query.
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_top_connected`);

  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_top_connected AS
    WITH rel_counts AS (
      SELECT entity_id, SUM(cnt)::bigint AS cnt
      FROM (
        SELECT source_entity_id AS entity_id, COUNT(*)::bigint AS cnt
          FROM entity_relationships GROUP BY source_entity_id
        UNION ALL
        SELECT target_entity_id AS entity_id, COUNT(*)::bigint AS cnt
          FROM entity_relationships GROUP BY target_entity_id
      ) t
      GROUP BY entity_id
    ),
    filtered AS (
      SELECT
        e.id,
        e.full_name,
        e.primary_role,
        COALESCE(e.mentions, 0)::bigint            AS mentions,
        COALESCE(e.red_flag_rating, 0)::int        AS red_flag_rating,
        COALESCE(rc.cnt, 0)::bigint                AS connection_count
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
          WHEN full_name IN ('Donald Trump','President Trump','Mr Trump','Trump','Donald J Trump','Donald J. Trump')
            THEN 'Donald Trump'
          WHEN full_name IN ('Jeffrey Epstein','Epstein','Jeffrey','Jeff Epstein','Mr Epstein')
            THEN 'Jeffrey Epstein'
          WHEN full_name IN ('Ghislaine Maxwell','Maxwell','Ghislaine','Ms Maxwell','Miss Maxwell')
            THEN 'Ghislaine Maxwell'
          WHEN full_name IN ('Bill Clinton','President Clinton','Mr Clinton','Clinton','William Clinton')
            AND lower(full_name) NOT LIKE '%hillary%'
            AND lower(full_name) NOT LIKE '%chelsea%'
            THEN 'Bill Clinton'
          WHEN full_name IN ('Prince Andrew','Duke of York','Andrew')
            OR lower(full_name) LIKE '%prince andrew%'
            THEN 'Prince Andrew'
          WHEN full_name IN ('Alan Dershowitz','Dershowitz','Mr Dershowitz')
            THEN 'Alan Dershowitz'
          ELSE regexp_replace(trim(full_name), '\\s+', ' ', 'g')
        END AS canonical_name,
        SUM(mentions)::bigint        AS mentions,
        MAX(red_flag_rating)::int    AS red_flag_rating,
        MAX(primary_role)            AS primary_role,
        SUM(connection_count)::bigint AS connection_count
      FROM filtered
      GROUP BY 2
    )
    SELECT
      id,
      canonical_name                AS name,
      primary_role                  AS role,
      'Person'::text                AS type,
      red_flag_rating               AS risk_level,
      connection_count,
      mentions
    FROM canonical_people
    WHERE mentions > 0
    ORDER BY connection_count DESC, mentions DESC, canonical_name ASC
    LIMIT 100
  `);

  // Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
  pgm.sql(`CREATE UNIQUE INDEX mv_top_connected_id ON mv_top_connected(id)`);

  // Seed the analytics_refresh_log row so the scheduler tracks this view
  pgm.sql(`
    INSERT INTO analytics_refresh_log (view_name, refreshed_at, duration_ms, status)
    VALUES ('mv_top_connected', NOW(), 0, 'migration')
    ON CONFLICT (view_name) DO UPDATE
      SET refreshed_at = excluded.refreshed_at,
          status       = excluded.status
  `);
}

export async function down(pgm) {
  pgm.noTransaction();

  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_top_connected`);

  // Restore the original simple view from the 1740014100000 migration
  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_top_connected AS
    WITH rel_counts AS (
      SELECT entity_id, SUM(cnt) AS cnt FROM (
        SELECT source_entity_id AS entity_id, COUNT(*)::bigint AS cnt
          FROM entity_relationships GROUP BY source_entity_id
        UNION ALL
        SELECT target_entity_id AS entity_id, COUNT(*)::bigint AS cnt
          FROM entity_relationships GROUP BY target_entity_id
      ) t GROUP BY entity_id
    )
    SELECT
      e.id,
      e.full_name AS name,
      e.primary_role AS role,
      e.entity_type AS type,
      e.red_flag_rating AS risk_level,
      COALESCE(rc.cnt, 0) AS connection_count,
      COALESCE(e.mentions, 0) AS mentions
    FROM rel_counts rc
    JOIN entities e ON e.id = rc.entity_id
    WHERE e.entity_type = 'Person'
      AND COALESCE(e.junk_tier, 'clean') = 'clean'
    ORDER BY rc.cnt DESC
    LIMIT 100
  `);

  pgm.sql(`CREATE UNIQUE INDEX mv_top_connected_id ON mv_top_connected(id)`);
}
