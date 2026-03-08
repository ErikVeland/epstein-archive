/* eslint-disable no-undef */

/**
 * Migration: Add pipeline tracking tables
 *
 * Creates pipeline_runs and pipeline_steps tables used by PipelineService
 * in ingest_pipeline.ts. These tables were referenced in code but never
 * formally migrated to production.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id               BIGSERIAL PRIMARY KEY,
      run_uuid         UUID NOT NULL DEFAULT gen_random_uuid(),
      pipeline_version TEXT NOT NULL,
      git_commit       TEXT,
      config_json      TEXT,
      environment_json TEXT,
      status           TEXT NOT NULL DEFAULT 'running',
      error_message    TEXT,
      started_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at      TIMESTAMPTZ
    );
  `);

  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS pipeline_runs_uuid ON pipeline_runs(run_uuid);`);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS pipeline_steps (
      step_name   TEXT PRIMARY KEY,
      description TEXT
    );
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS pipeline_steps;`);
  pgm.sql(`DROP TABLE IF EXISTS pipeline_runs;`);
}
