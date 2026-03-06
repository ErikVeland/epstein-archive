/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS document_annotations (
      id BIGSERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      annotation_type TEXT NOT NULL,
      selected_text TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      start_offset INTEGER NOT NULL CHECK (start_offset >= 0),
      end_offset INTEGER NOT NULL CHECK (end_offset > start_offset),
      context_before TEXT,
      context_after TEXT,
      author_label TEXT NOT NULL DEFAULT 'anonymous',
      author_fingerprint_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT document_annotations_type_check
        CHECK (annotation_type IN ('highlight', 'note', 'evidence', 'question', 'contradiction', 'tag'))
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_annotations_document_created
      ON document_annotations (document_id, created_at DESC);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP INDEX IF EXISTS idx_document_annotations_document_created;`);
  pgm.sql(`DROP TABLE IF EXISTS document_annotations;`);
}
