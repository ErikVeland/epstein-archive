/* eslint-disable no-undef */

/**
 * Retire legacy OCR cleanup outputs and requeue their immutable source text for
 * the validated, reviewable v2 artifact pipeline.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    DELETE FROM document_ai_artifacts
    WHERE artifact_type = 'ocr_clean_text'
      AND NOT (
        artifact_version = 'ocr-clean-v2'
        AND prompt_version = 'forensic-ocr-clean-v2'
      );

    UPDATE documents
    SET content_refined = content,
        normalized_text_sha256 = NULL,
        metadata_json = (
          COALESCE(metadata_json, '{}'::jsonb)
          - 'ocr_corrected'
          - 'ocr_corrected_at'
          - 'ocr_correction_model'
        ) || jsonb_build_object(
          'ocr_cleanup_v2_eligible', true,
          'ocr_cleanup_v2_required', true,
          'ocr_cleanup_v2_reset_at', NOW()::text,
          'ocr_cleanup_v2_reset_reason', 'legacy-unverifiable-output'
        )
    WHERE metadata_json ? 'ocr_corrected'
      AND content IS NOT NULL;
  `);
}

export async function down() {
  // The unverifiable generated text is intentionally not recoverable.
}
