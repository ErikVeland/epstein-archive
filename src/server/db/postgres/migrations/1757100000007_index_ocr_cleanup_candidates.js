/* eslint-disable no-undef */

/**
 * Make the provenance-based OCR cleanup queue cheap to enumerate without
 * decompressing the full document corpus.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction();
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_ocr_cleanup_eligible
    ON documents (id)
    WHERE metadata_json->>'ocr_cleanup_v2_eligible' = 'true'
       OR metadata_json->>'ocr_cleanup_v2_required' = 'true';
  `);
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_pages_ocr_document
    ON document_pages (document_id)
    WHERE text_source = 'ocr';
  `);
}

export async function down(pgm) {
  pgm.noTransaction();
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_document_pages_ocr_document;`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_documents_ocr_cleanup_eligible;`);
}
