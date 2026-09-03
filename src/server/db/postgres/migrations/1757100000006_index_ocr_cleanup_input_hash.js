/* eslint-disable no-undef */

/**
 * Make exact-source reuse cheap for the OCR cleanup queue.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_ai_artifacts_ocr_cleanup_input_hash
    ON document_ai_artifacts ((provenance_json->>'inputHash'))
    WHERE artifact_type = 'ocr_clean_text'
      AND artifact_version = 'ocr-clean-v2'
      AND prompt_version = 'forensic-ocr-clean-v2';
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_document_ai_artifacts_ocr_cleanup_input_hash;
  `);
}
