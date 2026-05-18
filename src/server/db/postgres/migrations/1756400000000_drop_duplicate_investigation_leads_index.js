/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  pgm.sql(`
    DROP INDEX CONCURRENTLY IF EXISTS idx_investigation_leads_investigation_id;
  `);
}

export async function down(pgm) {
  pgm.noTransaction();

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigation_leads_investigation_id
      ON investigation_leads (investigation_id);
  `);
}
