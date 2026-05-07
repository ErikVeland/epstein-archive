/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  // 1. Add significance_score to documents
  pgm.sql(`
    ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS significance_score FLOAT NOT NULL DEFAULT 0;
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_significance
      ON documents (significance_score DESC);
  `);

  // 2. entity_connection_signals materialised view
  // Built with NO DATA — the compute script populates on first run.
  pgm.sql(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS entity_connection_signals AS

    -- document co-mentions (weak signal: inferential)
    SELECT
      em1.entity_id          AS entity_id,
      em2.entity_id          AS other_id,
      'document'::text       AS signal_type,
      COUNT(DISTINCT em1.document_id)::float AS count,
      1.0::float             AS confidence
    FROM entity_mentions em1
    JOIN entity_mentions em2
      ON em1.document_id = em2.document_id
     AND em1.entity_id  != em2.entity_id
    GROUP BY em1.entity_id, em2.entity_id

    UNION ALL

    -- financial co-parties (name-based join — matches entity full_name text)
    SELECT
      e1.id   AS entity_id,
      e2.id   AS other_id,
      'financial'::text AS signal_type,
      COUNT(*)::float   AS count,
      1.0::float        AS confidence
    FROM financial_transactions ft
    JOIN entities e1 ON ft.from_entity = e1.full_name
    JOIN entities e2 ON ft.to_entity   = e2.full_name
    WHERE e1.id != e2.id
    GROUP BY e1.id, e2.id

    UNION ALL

    -- shared flights (entity_id FK — strong physical co-presence signal)
    SELECT
      fp1.entity_id  AS entity_id,
      fp2.entity_id  AS other_id,
      'flight'::text AS signal_type,
      COUNT(DISTINCT fp1.flight_id)::float AS count,
      1.0::float     AS confidence
    FROM flight_passengers fp1
    JOIN flight_passengers fp2
      ON fp1.flight_id  = fp2.flight_id
     AND fp1.entity_id != fp2.entity_id
    WHERE fp1.entity_id IS NOT NULL AND fp2.entity_id IS NOT NULL
    GROUP BY fp1.entity_id, fp2.entity_id

    UNION ALL

    -- direct relationship records (highest trust — curated extracted facts)
    SELECT
      er.source_entity_id  AS entity_id,
      er.target_entity_id  AS other_id,
      'relationship'::text AS signal_type,
      COUNT(*)::float      AS count,
      MAX(COALESCE(er.confidence, 0.5))::float AS confidence
    FROM entity_relationships er
    GROUP BY er.source_entity_id, er.target_entity_id

    WITH NO DATA;
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_ecs_entity_other_type
      ON entity_connection_signals (entity_id, other_id, signal_type);
  `);
}

export async function down(pgm) {
  pgm.noTransaction();
  pgm.sql(`DROP MATERIALIZED VIEW IF EXISTS entity_connection_signals;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_documents_significance;`);
  pgm.sql(`ALTER TABLE documents DROP COLUMN IF EXISTS significance_score;`);
}
