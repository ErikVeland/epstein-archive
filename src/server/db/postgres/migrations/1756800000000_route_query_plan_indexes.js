/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_items_album_redflag_created
      ON media_items (album_id, red_flag_rating DESC NULLS LAST, created_at DESC)
      WHERE album_id IS NOT NULL;
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_evidence_type_date_created
      ON documents (evidence_type, date_created DESC NULLS LAST)
      WHERE evidence_type IS NOT NULL;
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investigation_evidence_investigation_added
      ON investigation_evidence (investigation_id, added_at DESC);
  `);
}

export async function down(pgm) {
  pgm.noTransaction();

  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_investigation_evidence_investigation_added;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_documents_evidence_type_date_created;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_media_items_album_redflag_created;`);
}
