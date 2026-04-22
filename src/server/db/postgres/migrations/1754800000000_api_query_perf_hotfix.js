/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();
  pgm.sql('SET statement_timeout = 0;');

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_redflag_coalesced_date
      ON documents (red_flag_rating DESC NULLS LAST, COALESCE(extracted_date, date_created) DESC NULLS LAST);
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_default_list_nonmedia
      ON documents (red_flag_rating DESC NULLS LAST, COALESCE(extracted_date, date_created) DESC NULLS LAST)
      WHERE COALESCE(evidence_type, '') != 'media'
        AND file_type NOT LIKE 'image/%'
        AND file_type NOT LIKE 'video/%'
        AND file_type NOT LIKE 'audio/%';
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entity_mentions_entity_document
      ON entity_mentions (entity_id, document_id);
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_item_people_entity_media
      ON media_item_people (entity_id, media_item_id);
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_items_entity_redflag
      ON media_items (entity_id, red_flag_rating DESC NULLS LAST, id DESC);
  `);

  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_full_name_trgm
      ON entities USING gin (full_name gin_trgm_ops);
  `);
}

export async function down(pgm) {
  pgm.noTransaction();
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entities_full_name_trgm;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_media_items_entity_redflag;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_media_item_people_entity_media;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entity_mentions_entity_document;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_documents_default_list_nonmedia;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_documents_redflag_coalesced_date;`);
}
