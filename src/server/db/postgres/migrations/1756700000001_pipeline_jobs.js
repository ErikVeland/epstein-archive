/* eslint-disable no-undef */

/**
 * Migration: Dedicated pipeline_jobs queue table
 *
 * Previously the AI enrichment queue was embedded in documents
 * (processing_status, worker_id, lease_expires_at, processing_attempts,
 *  processing_error). This scatters job-coordination state across a
 * millions-of-rows domain table, making every SKIP LOCKED scan expensive.
 *
 * This migration extracts that state into pipeline_jobs — a small, indexed
 * "work to be done" table. JobManager now reads/writes pipeline_jobs.
 * documents.processing_status is still updated on completion/failure for
 * backward-compat with enrichment backfill queries.
 *
 * Backfill: existing queued/failed/processing docs become pipeline_jobs rows
 * so the queue drains without an operator needing to re-populate.
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS pipeline_jobs (
      id                BIGSERIAL PRIMARY KEY,
      document_id       BIGINT NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
      status            TEXT NOT NULL DEFAULT 'queued',
      worker_id         TEXT,
      lease_expires_at  TIMESTAMPTZ,
      attempts          INTEGER NOT NULL DEFAULT 0,
      error             TEXT,
      source_collection TEXT,
      file_path         TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status_lease
      ON pipeline_jobs (status, lease_expires_at)
      WHERE status IN ('queued', 'processing');
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_collection
      ON pipeline_jobs (source_collection, status);
  `);

  /* Backfill: insert current active queue from documents table.
   * - failed/queued → 'queued' (re-queue for the new system)
   * - processing with live lease → keep as 'processing'
   * - processing with expired lease → reset to 'queued'
   * Completed/succeeded docs are not inserted — pipeline_jobs only holds
   * work that still needs doing. */
  pgm.sql(`
    INSERT INTO pipeline_jobs
      (document_id, status, worker_id, lease_expires_at, attempts,
       error, source_collection, file_path, created_at, updated_at)
    SELECT
      id,
      CASE
        WHEN processing_status = 'processing' AND lease_expires_at >= NOW() THEN 'processing'
        ELSE 'queued'
      END AS status,
      CASE
        WHEN processing_status = 'processing' AND lease_expires_at >= NOW() THEN worker_id
        ELSE NULL
      END AS worker_id,
      CASE
        WHEN processing_status = 'processing' AND lease_expires_at >= NOW() THEN lease_expires_at
        ELSE NULL
      END AS lease_expires_at,
      COALESCE(processing_attempts, 0) AS attempts,
      CASE WHEN processing_status = 'failed' THEN processing_error ELSE NULL END AS error,
      source_collection,
      file_path,
      COALESCE(created_at, NOW()),
      NOW()
    FROM documents
    WHERE processing_status IN ('queued', 'failed', 'processing')
    ON CONFLICT (document_id) DO NOTHING;
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS pipeline_jobs;`);
}
