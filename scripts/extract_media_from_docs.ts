import * as dotenv from 'dotenv';
import { getIngestPool } from '../src/server/db/connection.js';
import { MediaService } from '../src/server/services/MediaService.js';
import { MediaExtractionService } from '../src/server/services/MediaExtractionService.js';
import { logger } from '../src/server/services/Logger.js';

dotenv.config();

async function main() {
  const pool = getIngestPool();
  const mediaService = new MediaService(pool);
  const extractor = new MediaExtractionService(mediaService);

  const COLLECTION = process.env.COLLECTION;
  const BATCH_SIZE = Math.max(
    1,
    Number.parseInt(process.env.MEDIA_EXTRACTION_BATCH_SIZE || '250', 10) || 250,
  );
  let totalExtracted = 0;

  let processedDocs = 0;
  let lastDocumentId = 0;
  let failedDocs = 0;
  let fatalError = false;
  const targetDocumentId = Number(process.env.MEDIA_EXTRACTION_DOCUMENT_ID || '0') || null;
  const retryFailed = process.env.MEDIA_EXTRACTION_RETRY_FAILED === 'true';

  console.log('🔍 Scanning archival documents for media assets...');
  if (COLLECTION) console.log(`📁 Target Collection: ${COLLECTION}`);

  try {
    let hasMore = true;
    while (hasMore) {
      // Find PDFs in chunks. To avoid re-processing, we query for docs that
      // DON'T have the 'media_extracted' flag in their metadata_json
      const query = `
        SELECT id, file_path, file_name, source_collection, metadata_json
        FROM documents
        WHERE (file_type = 'pdf' OR file_path ILIKE '%.pdf')
        AND id > $1
        AND NOT (COALESCE(processing_status, '') = 'failed' AND COALESCE(processing_error, '') = 'File not found')
        AND ($2::text IS NULL OR source_collection = $2)
        AND ($4::bigint IS NULL OR id = $4)
        AND ($5::boolean OR metadata_json->>'media_extraction_status' IS DISTINCT FROM 'failed')
        AND (
          (metadata_json->>'media_extracted')::boolean IS NOT TRUE
          OR (($5::boolean OR metadata_json->>'media_provenance_repair_status' IS DISTINCT FROM 'blocked') AND id IN (
            SELECT DISTINCT m.document_id
            FROM media_items m
            WHERE (
                m.metadata_json->>'is_document_extract' = 'true'
                OR m.file_path ILIKE '%/media/extracted/%'
              )
              AND m.metadata_json->>'source_page' IS NULL
          )
          )
        )
        ORDER BY id ASC
        LIMIT $3
      `;

      const result = await pool.query(query, [
        lastDocumentId,
        COLLECTION || null,
        BATCH_SIZE,
        targetDocumentId,
        retryFailed,
      ]);
      const docs = result.rows;

      if (docs.length === 0) {
        hasMore = false;
        continue;
      }

      console.log(
        `\n📦 Processing batch of ${docs.length} documents (Total Processed: ${processedDocs})...`,
      );

      for (const doc of docs) {
        processedDocs++;
        lastDocumentId = Number(doc.id);

        try {
          const count = await extractor.extractFromPdf(
            doc.id,
            doc.file_path,
            doc.file_name || 'Untitled document',
            doc.source_collection,
            { throwOnError: true },
          );

          const unresolved = await pool.query<{ total: string }>(
            `SELECT COUNT(*)::text AS total FROM media_items
             WHERE document_id = $1
               AND (metadata_json->>'is_document_extract' = 'true' OR file_path ILIKE '%/media/extracted/%')
               AND metadata_json->>'source_page' IS NULL`,
            [doc.id],
          );
          const unresolvedCount = Number(unresolved.rows[0]?.total || 0);
          if (unresolvedCount > 0) failedDocs++;

          // Mark as processed in the database to avoid re-scanning
          const updatedMetadata = {
            ...(doc.metadata_json || {}),
            media_extracted: true,
            media_extraction_count: count,
            media_extracted_at: new Date().toISOString(),
            media_extraction_version: 'pdf-object-v2',
            media_extraction_status: 'succeeded',
            media_extraction_error: null,
            media_provenance_repair_status: unresolvedCount > 0 ? 'blocked' : 'succeeded',
            media_provenance_repair_remaining: unresolvedCount,
          };

          await pool.query('UPDATE documents SET metadata_json = $1 WHERE id = $2', [
            JSON.stringify(updatedMetadata),
            doc.id,
          ]);

          if (count > 0) {
            console.log(`   ✅ [ID: ${doc.id}] Extracted ${count} images from ${doc.file_name}.`);
            totalExtracted += count;
          }
        } catch (itemErr) {
          failedDocs++;
          const message = itemErr instanceof Error ? itemErr.message : String(itemErr);
          await pool.query(
            `UPDATE documents SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
            [
              JSON.stringify({
                media_extraction_status: 'failed',
                media_extraction_error: message,
                media_extraction_failed_at: new Date().toISOString(),
              }),
              doc.id,
            ],
          );
          logger.error({ err: itemErr, docId: doc.id }, 'Error processing individual document');
          console.error(`   ❌ Failed to process document ${doc.id}`);
          if (/reserved free-space floor|volume is unavailable/i.test(message)) throw itemErr;
        }
      }

      // Progress reporting
      if (processedDocs % BATCH_SIZE === 0) {
        console.log(
          `📊 Current Progress: ${processedDocs} docs scanned, ${totalExtracted} assets found.`,
        );
      }
    }

    console.log('\n' + '='.repeat(40));
    console.log('Media extraction pass finished.');
    console.log(`   Documents Processed: ${processedDocs}`);
    console.log(`   Assets handled:      ${totalExtracted}`);
    console.log(`   Failed or blocked documents: ${failedDocs}`);
    console.log('='.repeat(40));
  } catch (err) {
    fatalError = true;
    console.error('❌ Extraction backfill failed:', err);
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'Media extraction script failure',
    );
  } finally {
    await pool.end();
    process.exitCode = failedDocs > 0 || fatalError ? 1 : 0;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
