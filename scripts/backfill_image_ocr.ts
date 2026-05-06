import fs from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { createWorker } from 'tesseract.js';
import { getIngestPool } from '../src/server/db/connection.js';
import { TextCleaner } from './utils/text_cleaner.js';

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const PIPELINE_VERSION = 'remediation-ocr-1.1';
const RUN_ID = `remed-${Date.now()}`;

function writeLiveStatus(processed: number, total: number, file: string) {
  try {
    if (!fs.existsSync('./pipeline_checkpoints')) fs.mkdirSync('./pipeline_checkpoints');
    fs.writeFileSync(
      './pipeline_checkpoints/live_status.json',
      JSON.stringify(
        {
          running: true,
          phase: 'Image OCR Backfill',
          heartbeatAt: new Date().toISOString(),
          ocrProcessed: processed,
          ocrTotal: total,
          currentFile: file,
        },
        null,
        2,
      ),
    );
  } catch (_e) {
    // non-fatal: status file is best-effort
  }
}

async function backfillOcr() {
  const pool = getIngestPool();
  let successCount = 0;
  let failCount = 0;

  // Get total count first
  const countRes = await pool.query(
    `
    SELECT COUNT(*) as total
    FROM documents 
    WHERE file_type ILIKE 'image/%' 
    AND (content IS NULL OR content = '' OR content LIKE '[%FILE - OCR NOT YET PROCESSED]')
    AND (pipeline_version IS NULL OR pipeline_version != $1)
  `,
    [PIPELINE_VERSION],
  );
  const totalDocs = parseInt(countRes.rows[0].total, 10);
  console.log(`🚀 Found ${totalDocs} images to process.`);

  let hasMore = true;
  while (hasMore) {
    const query = `
      SELECT id, file_name, file_path, source_collection 
      FROM documents 
      WHERE file_type ILIKE 'image/%' 
      AND (content IS NULL OR content = '' OR content LIKE '[%FILE - OCR NOT YET PROCESSED]')
      AND (pipeline_version IS NULL OR pipeline_version != $1)
      ORDER BY source_collection ASC, id ASC
      LIMIT 100
    `;

    const res = await pool.query(query, [PIPELINE_VERSION]);
    const docs = res.rows;
    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    for (const doc of docs) {
      writeLiveStatus(successCount + failCount, totalDocs, doc.file_name);
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
            content_refined = $1,
            content_preview = $2,
            processing_status = 'completed',
            pipeline_version = $3,
            ingestion_run_id = $4,
            analyzed_at = NOW() 
           WHERE id = $5`,
          [cleanedText, preview, PIPELINE_VERSION, RUN_ID, doc.id],
        );

        if (cleanedText) {
          const pageCheck = await pool.query(
            'SELECT id FROM document_pages WHERE document_id = $1 AND page_number = 1',
            [doc.id],
          );
          if (pageCheck.rowCount === 0) {
            await pool.query(
              'INSERT INTO document_pages (document_id, page_number, extracted_text, text_source, created_at) VALUES ($1, $2, $3, $4, NOW())',
              [doc.id, 1, cleanedText, 'ocr'],
            );
          } else {
            await pool.query(
              "UPDATE document_pages SET extracted_text = $1, text_source = 'ocr' WHERE id = $2",
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
  }

  console.log('\n' + '='.repeat(30));
  console.log('🏁 Backfill Complete');
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed:  ${failCount}`);
  console.log('='.repeat(30));

  try {
    fs.writeFileSync(
      './pipeline_checkpoints/live_status.json',
      JSON.stringify({ running: false, phase: 'Idle', exitReason: 'Backfill Complete' }, null, 2),
    );
  } catch (_e) {
    // non-fatal
  }

  await pool.end();
}

backfillOcr().catch((err) => {
  console.error(err);
  process.exit(1);
});
