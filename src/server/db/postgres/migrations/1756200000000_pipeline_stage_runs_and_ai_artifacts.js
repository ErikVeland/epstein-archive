/* eslint-disable no-undef */

/**
 * Migration: Durable pipeline stage runs and AI artifacts
 *
 * The unified pipeline used to track many stage completions inside
 * documents.metadata_json. Keep those markers for compatibility, but add
 * first-class tables so backfills can be resumable by stage version, input
 * hash, model, status, and review state.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS document_stage_runs (
      id                 BIGSERIAL PRIMARY KEY,
      run_id             BIGINT REFERENCES pipeline_runs(id) ON DELETE SET NULL,
      document_id         BIGINT REFERENCES documents(id) ON DELETE CASCADE,
      stage_name          TEXT NOT NULL,
      stage_version       TEXT NOT NULL DEFAULT '1',
      input_hash          TEXT,
      model_id            TEXT,
      status              TEXT NOT NULL DEFAULT 'running',
      attempts            INTEGER NOT NULL DEFAULT 1,
      output_hash         TEXT,
      error_message       TEXT,
      metrics_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
      started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at         TIMESTAMPTZ,
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS document_stage_runs_unique_key
      ON document_stage_runs (
        COALESCE(document_id, 0),
        stage_name,
        stage_version,
        COALESCE(input_hash, ''),
        COALESCE(model_id, '')
      );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_stage_runs_stage_status
      ON document_stage_runs (stage_name, status, updated_at DESC);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_stage_runs_document
      ON document_stage_runs (document_id, stage_name, updated_at DESC);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS document_ai_artifacts (
      id                 BIGSERIAL PRIMARY KEY,
      artifact_uuid      UUID NOT NULL DEFAULT gen_random_uuid(),
      run_id             BIGINT REFERENCES pipeline_runs(id) ON DELETE SET NULL,
      stage_run_id        BIGINT REFERENCES document_stage_runs(id) ON DELETE SET NULL,
      document_id         BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      artifact_type       TEXT NOT NULL,
      artifact_version    TEXT NOT NULL DEFAULT '1',
      model_id            TEXT,
      prompt_version      TEXT,
      source_excerpt      TEXT,
      output_text         TEXT,
      output_json         JSONB,
      confidence          REAL,
      review_state        TEXT NOT NULL DEFAULT 'unreviewed',
      provenance_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS document_ai_artifacts_unique_key
      ON document_ai_artifacts (
        document_id,
        artifact_type,
        artifact_version,
        COALESCE(model_id, ''),
        COALESCE(prompt_version, '')
      );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_ai_artifacts_document_type
      ON document_ai_artifacts (document_id, artifact_type, created_at DESC);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_ai_artifacts_review
      ON document_ai_artifacts (artifact_type, review_state, confidence);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS document_ai_artifacts;`);
  pgm.sql(`DROP TABLE IF EXISTS document_stage_runs;`);
}
