import 'dotenv/config';
import { getMaintenancePool } from '../src/server/db/connection.js';

const apply = process.argv.includes('--apply');

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = getMaintenancePool();
  try {
    const preview = await pool.query<{
      legacy_documents: string;
      unsafe_artifacts: string;
      shortened_refined_documents: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM documents WHERE metadata_json ? 'ocr_corrected')::text AS legacy_documents,
        (SELECT COUNT(*) FROM document_ai_artifacts
          WHERE artifact_type = 'ocr_clean_text'
            AND NOT (
              artifact_version = 'ocr-clean-v2'
              AND prompt_version = 'forensic-ocr-clean-v2'
            ))::text AS unsafe_artifacts,
        (SELECT COUNT(*) FROM documents
          WHERE metadata_json ? 'ocr_corrected'
            AND content IS NOT NULL
            AND content_refined IS NOT NULL
            AND length(content_refined) < length(content) * 0.8)::text AS shortened_refined_documents
    `);
    console.log('[ocr-cleanup-reset] preview', preview.rows[0]);
    if (!apply) {
      console.log('[ocr-cleanup-reset] dry run only; pass --apply to reset legacy cleanup data');
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const artifacts = await client.query(
        `DELETE FROM document_ai_artifacts
         WHERE artifact_type = 'ocr_clean_text'
           AND NOT (
             artifact_version = 'ocr-clean-v2'
             AND prompt_version = 'forensic-ocr-clean-v2'
           )`,
      );
      const documents = await client.query(`
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
          AND content IS NOT NULL
      `);
      await client.query('COMMIT');
      console.log('[ocr-cleanup-reset] applied', {
        deletedArtifacts: artifacts.rowCount || 0,
        resetDocuments: documents.rowCount || 0,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    '[ocr-cleanup-reset] fatal',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
