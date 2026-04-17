import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
import { MediaService } from '../src/server/services/MediaService.js';
import { MediaExtractionService } from '../src/server/services/MediaExtractionService.js';
import { logger } from '../src/server/services/Logger.js';

dotenv.config();

async function main() {
  const pool = getApiPool();
  const mediaService = new MediaService(pool);
  const extractor = new MediaExtractionService(mediaService);

  const COLLECTION = process.env.COLLECTION;
  const BATCH_SIZE = 1000;
  let totalExtracted = 0;

  let processedDocs = 0;

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
        ${COLLECTION ? 'AND source_collection = $1' : ''}
        AND (metadata_json->>'media_extracted')::boolean IS NOT TRUE
        ORDER BY id ASC
        LIMIT ${BATCH_SIZE}
      `;

      const result = await pool.query(query, COLLECTION ? [COLLECTION] : []);
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

        try {
          const count = await extractor.extractFromPdf(
            doc.id,
            doc.file_path,
            doc.file_name || 'Untitled document',
            doc.source_collection,
          );

          // Mark as processed in the database to avoid re-scanning
          const updatedMetadata = {
            ...(doc.metadata_json || {}),
            media_extracted: true,
            media_extraction_count: count,
            media_extracted_at: new Date().toISOString(),
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
          logger.error({ err: itemErr, docId: doc.id }, 'Error processing individual document');
          console.error(`   ❌ Failed to process document ${doc.id}`);
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
    console.log('🏁 Media Extraction Complete');
    console.log(`   Documents Processed: ${processedDocs}`);
    console.log(`   Total New Assets:    ${totalExtracted}`);
    console.log('='.repeat(40));
  } catch (err) {
    console.error('❌ Extraction backfill failed:', err);
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'Media extraction script failure',
    );
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);
