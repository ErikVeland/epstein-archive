import { readFileSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { createWorker } from 'tesseract.js';
import { getIngestPool } from '../src/server/db/connection.js';
import { TextCleaner } from './utils/text_cleaner.js';

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const PIPELINE_VERSION = 'remediation-ocr-1.0';
const RUN_ID = `remed-${Date.now()}`;

async function backfillOcr() {
  const pool = getIngestPool();

  // Target images with empty content or [OCR NOT YET PROCESSED]
  // Excluding those already processed by this remediation version
  const query = `
    SELECT id, file_name, file_path, source_collection 
    FROM documents 
    WHERE file_type ILIKE 'image/%' 
    AND (content IS NULL OR content = '' OR content LIKE '[%FILE - OCR NOT YET PROCESSED]')
    AND (pipeline_version IS NULL OR pipeline_version != $1)
    ORDER BY source_collection ASC, id ASC
    LIMIT 200
  `;

  console.log('🔍 Finding images for OCR backfill...');
  const res = await pool.query(query, [PIPELINE_VERSION]);
  const docs = res.rows;

  console.log(`🚀 Found ${docs.length} images to process.`);

  let successCount = 0;
  let failCount = 0;

  for (const doc of docs) {
    const filePath = doc.file_path;
    const fullPath = filePath.startsWith('/') ? filePath : join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      console.warn(`  ⚠️  File not found: ${fullPath} (id: ${doc.id})`);
      await pool.query(
        "UPDATE documents SET pipeline_version = $1, processing_status = 'failed', processing_error = 'File not found' WHERE id = $2",
        [PIPELINE_VERSION, doc.id],
      );
      failCount++;
      continue;
    }

    console.log(`  ⚙️  Processing [${doc.id}] ${doc.file_name} (${doc.source_collection})...`);

    try {
      const worker = await createWorker('eng');
      const {
        data: { text },
      } = await worker.recognize(fullPath);
      await worker.terminate();

      const cleanedText = text ? await TextCleaner.cleanOcrTextAsync(text, doc.file_name) : '';
      const preview = cleanedText.substring(0, 500);

      await pool.query(
        `UPDATE documents SET 
          content = $1, 
          content_preview = $2,
          processing_status = 'completed',
          pipeline_version = $3,
          ingestion_run_id = $4,
          analyzed_at = NOW() 
         WHERE id = $5`,
        [cleanedText, preview, PIPELINE_VERSION, RUN_ID, doc.id],
      );

      if (cleanedText) {
        // Also add to document_pages if it doesn't exist
        const pageCheck = await pool.query(
          'SELECT id FROM document_pages WHERE document_id = $1 AND page_number = 1',
          [doc.id],
        );
        if (pageCheck.rowCount === 0) {
          await pool.query(
            'INSERT INTO document_pages (document_id, page_number, content, text_source, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [doc.id, 1, cleanedText, 'ocr'],
          );
        } else {
          await pool.query(
            "UPDATE document_pages SET content = $1, text_source = 'ocr' WHERE id = $2",
            [cleanedText, pageCheck.rows[0].id],
          );
        }
        console.log(`    ✅ Success: extracted ${cleanedText.length} characters.`);
      } else {
        console.log(`    ℹ️  No text found.`);
      }

      successCount++;
    } catch (e) {
      console.error(`    ❌ Failed to process ${doc.file_name}:`, (e as Error).message);
      await pool.query(
        "UPDATE documents SET pipeline_version = $1, processing_status = 'failed', processing_error = $2 WHERE id = $3",
        [PIPELINE_VERSION, (e as Error).message, doc.id],
      );
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(30));
  console.log('🏁 Backfill Complete');
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed:  ${failCount}`);
  console.log('='.repeat(30));

  await pool.end();
}

backfillOcr().catch((err) => {
  console.error(err);
  process.exit(1);
});
