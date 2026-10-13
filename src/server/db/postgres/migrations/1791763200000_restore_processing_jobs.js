/* eslint-disable no-undef */
export const shorthands = undefined;
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id BIGSERIAL PRIMARY KEY,
      run_id BIGINT REFERENCES pipeline_runs(id) ON DELETE SET NULL,
      step_name TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      locked_by TEXT,
      locked_at TIMESTAMPTZ,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (target_type, target_id, step_name)
    );
    CREATE INDEX IF NOT EXISTS processing_jobs_status_lock_idx
      ON processing_jobs (status, locked_at);
  `);
}
export async function down(pgm) {
  pgm.sql('DROP TABLE IF EXISTS processing_jobs');
}
