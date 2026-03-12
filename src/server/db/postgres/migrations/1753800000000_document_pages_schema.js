/* eslint-disable no-undef */

/**
 * Migration: Fix document_pages schema to match discoveryRepository expectations
 *
 * The document_pages table was created with a "content" column but
 * discoveryRepository.ts inserts into "extracted_text". Also adds the
 * missing ocr_confidence_avg and phash columns.
 */
export const shorthands = undefined;

export async function up(pgm) {
  // Rename content → extracted_text to match discoveryRepository.ts
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_pages' AND column_name = 'content'
      ) THEN
        ALTER TABLE document_pages RENAME COLUMN content TO extracted_text;
      END IF;
    END $$;
  `);

  pgm.sql(`ALTER TABLE document_pages ADD COLUMN IF NOT EXISTS ocr_confidence_avg real;`);
  pgm.sql(`ALTER TABLE document_pages ADD COLUMN IF NOT EXISTS phash text;`);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE document_pages DROP COLUMN IF EXISTS phash;`);
  pgm.sql(`ALTER TABLE document_pages DROP COLUMN IF EXISTS ocr_confidence_avg;`);
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_pages' AND column_name = 'extracted_text'
      ) THEN
        ALTER TABLE document_pages RENAME COLUMN extracted_text TO content;
      END IF;
    END $$;
  `);
}
