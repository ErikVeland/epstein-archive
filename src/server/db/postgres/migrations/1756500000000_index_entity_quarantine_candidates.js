/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_clean_quarantine_candidates
    ON entities (id)
    WHERE COALESCE(junk_tier, 'clean') = 'clean'
      AND COALESCE(quarantine_status, 0) = 0
  `);
}

export async function down(pgm) {
  pgm.noTransaction();

  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entities_clean_quarantine_candidates`);
}
