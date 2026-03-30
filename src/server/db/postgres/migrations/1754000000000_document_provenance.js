/* eslint-disable no-undef */

/**
 * Migration: Add durable document provenance tracking
 *
 * Introduces:
 * - stronger provenance fields on documents
 * - document_provenance_events event ledger
 *
 * The migration is intentionally defensive because older environments in this
 * repo have drifted schema history.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_sha256 TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS normalized_text_sha256 TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_original_url TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_path TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_system TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_release TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_acquisition_method TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_acquired_at TIMESTAMPTZ;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS provenance_status TEXT DEFAULT 'missing';
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS provenance_score REAL DEFAULT 0;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id BIGINT;
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS document_provenance_events (
      id                BIGSERIAL PRIMARY KEY,
      event_uuid        UUID        NOT NULL DEFAULT gen_random_uuid(),
      event_key         TEXT        NOT NULL UNIQUE,
      document_id       BIGINT      NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      run_id            BIGINT      REFERENCES pipeline_runs(id) ON DELETE SET NULL,
      event_type        TEXT        NOT NULL,
      event_order       INTEGER     NOT NULL DEFAULT 0,
      actor_type        TEXT        NOT NULL DEFAULT 'system',
      actor_id          TEXT,
      tool_name         TEXT,
      tool_version      TEXT,
      input_asset_id    BIGINT      REFERENCES file_assets(id) ON DELETE SET NULL,
      output_asset_id   BIGINT      REFERENCES file_assets(id) ON DELETE SET NULL,
      input_document_id BIGINT      REFERENCES documents(id) ON DELETE SET NULL,
      parent_document_id BIGINT     REFERENCES documents(id) ON DELETE SET NULL,
      source_collection TEXT,
      source_path       TEXT,
      source_url        TEXT,
      file_sha256       TEXT,
      text_sha256       TEXT,
      metadata_json     JSONB       NOT NULL DEFAULT '{}'::jsonb,
      occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_provenance_events_document_id
      ON document_provenance_events (document_id, occurred_at, id);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_provenance_events_run_id
      ON document_provenance_events (run_id);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_provenance_events_event_type
      ON document_provenance_events (event_type);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_documents_provenance_status
      ON documents (provenance_status);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_documents_provenance_score
      ON documents (provenance_score);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS document_provenance_events;`);
  pgm.sql(`
    ALTER TABLE documents
      DROP COLUMN IF EXISTS provenance_score,
      DROP COLUMN IF EXISTS provenance_status,
      DROP COLUMN IF EXISTS source_acquired_at,
      DROP COLUMN IF EXISTS source_acquisition_method,
      DROP COLUMN IF EXISTS source_release,
      DROP COLUMN IF EXISTS source_system,
      DROP COLUMN IF EXISTS source_url,
      DROP COLUMN IF EXISTS source_path,
      DROP COLUMN IF EXISTS source_original_url,
      DROP COLUMN IF EXISTS normalized_text_sha256,
      DROP COLUMN IF EXISTS content_sha256,
      DROP COLUMN IF EXISTS parent_document_id;
  `);
}
