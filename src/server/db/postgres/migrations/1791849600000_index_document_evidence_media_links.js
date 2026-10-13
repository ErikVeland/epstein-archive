/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();

  // Document evidence checks match media by document ID or legacy file path.
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_items_document_id
    ON media_items (document_id)
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_items_file_path
    ON media_items (file_path)
  `);
}

export async function down(pgm) {
  pgm.noTransaction();

  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_media_items_file_path`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_media_items_document_id`);
}
