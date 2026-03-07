/* eslint-disable no-undef */

/**
 * Migration: Fix Materialized View Column References
 *
 * mv_docs_by_type was created referencing `mime_type`, which was renamed to
 * `file_type` in migration 1741540000000_align_schema_v2. Every refresh since
 * then has silently failed, leaving the view frozen with stale data where all
 * documents had NULL mime_type → 'unknown' → everything shown as "Other" in
 * the Document Types chart.
 *
 * This migration rebuilds the view using the correct `file_type` column.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  // Rebuild mv_docs_by_type using file_type (was mime_type before 1741540000000)
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_docs_by_type`);
  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_docs_by_type AS
    SELECT
      COALESCE(file_type, 'unknown') AS type,
      COUNT(*)::bigint AS count,
      SUM(CASE WHEN is_sensitive THEN 1 ELSE 0 END)::bigint AS sensitive,
      ROUND(AVG(signal_score)::numeric, 2) AS avg_signal
    FROM documents
    GROUP BY COALESCE(file_type, 'unknown');
  `);
  pgm.sql(`CREATE UNIQUE INDEX mv_docs_by_type_type ON mv_docs_by_type(type)`);
}

export async function down(pgm) {
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS mv_docs_by_type`);
  pgm.sql(`
    CREATE MATERIALIZED VIEW mv_docs_by_type AS
    SELECT
      COALESCE(file_type, 'unknown') AS type,
      COUNT(*)::bigint AS count,
      SUM(CASE WHEN is_sensitive THEN 1 ELSE 0 END)::bigint AS sensitive,
      ROUND(AVG(signal_score)::numeric, 2) AS avg_signal
    FROM documents
    GROUP BY COALESCE(file_type, 'unknown');
  `);
  pgm.sql(`CREATE UNIQUE INDEX mv_docs_by_type_type ON mv_docs_by_type(type)`);
}
