import fs from 'fs';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getIngestPool } from '../src/server/db/connection.js';
import { TextCleaner } from './utils/text_cleaner.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Enable enrichment so service activates
process.env.ENABLE_AI_ENRICHMENT = 'true';
if (!process.env.AI_PROVIDER) process.env.AI_PROVIDER = 'exo_cluster';

const PIPELINE_VERSION = 'reducto-vlm-1.0';
const RUN_ID = `vlm-backfill-${Date.now()}`;

function writeLiveStatus(
  processed: number,
  total: number,
  file: string | null,
  blockedReason?: string,
) {
  try {
    if (!fs.existsSync('./pipeline_checkpoints')) fs.mkdirSync('./pipeline_checkpoints');
    fs.writeFileSync(
      './pipeline_checkpoints/live_status.json',
      JSON.stringify(
        {
          running: true,
          phase: 'VLM Backfill',
          heartbeatAt: new Date().toISOString(),
          vlmProcessed: processed,
          vlmTotal: total,
          currentFile: file,
          blocked: Boolean(blockedReason),
          blockedReason,
          activeStage: blockedReason ? 'Vision Model Readiness' : 'VLM Visual Analysis',
          activeStageDescription:
            blockedReason || (file ? `Analyzing ${file}` : 'Preparing visual backfill batch'),
        },
        null,
        2,
      ),
    );
  } catch (_e) {
    // non-fatal
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureVisionModelReady(processed: number, total: number) {
  const modelId = process.env.VISION_MODEL;
  if (!modelId) return;

  const exoHost = process.env.EXO_HOST || 'http://127.0.0.1:52415';
  let lastPlaceAttempt = 0;
  let ready = false;

  while (!ready) {
    try {
      const response = await fetch(`${exoHost}/state`, { signal: AbortSignal.timeout(5000) });
      const state = (await response.json()) as {
        instances?: Record<
          string,
          { MlxRingInstance?: { shardAssignments?: { modelId?: string } } }
        >;
      };
      const active = Object.values(state.instances || {}).some(
        (instance) => instance.MlxRingInstance?.shardAssignments?.modelId === modelId,
      );
      if (active) {
        ready = true;
        continue;
      }

      const now = Date.now();
      if (now - lastPlaceAttempt > 5 * 60_000) {
        lastPlaceAttempt = now;
        await fetch(`${exoHost}/place_instance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: modelId,
            sharding: 'Pipeline',
            instance_meta: 'MlxRing',
            min_nodes: 1,
          }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => undefined);
      }

      const reason = `Waiting for EXO vision model ${modelId} to become active`;
      console.warn(`  ⏳ ${reason}`);
      writeLiveStatus(processed, total, null, reason);
    } catch (err) {
      const reason = `Waiting for EXO state API: ${(err as Error).message}`;
      console.warn(`  ⏳ ${reason}`);
      writeLiveStatus(processed, total, null, reason);
    }

    await sleep(30_000);
  }
}

async function backfillVlm() {
  const pool = getIngestPool();
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  // Target images that have not yet been parsed by VLM
  const targetQuery = `
    FROM documents 
    WHERE file_type ILIKE 'image/%' 
    AND (metadata_json IS NULL OR NOT metadata_json ? 'vlm_parsed')
  `;

  const countRes = await pool.query(`SELECT COUNT(*) as total ${targetQuery}`);
  const totalDocs = parseInt(countRes.rows[0].total, 10);
  console.log(`🚀 Found ${totalDocs} images requiring VLM visual extraction backfill.`);

  if (totalDocs === 0) {
    console.log('🎉 No documents require backfilling!');
    await pool.end();
    return;
  }

  let hasMore = true;
  while (hasMore) {
    await ensureVisionModelReady(successCount + failCount + skippedCount, totalDocs);

    const query = `
      SELECT id, file_name, file_path, source_collection, metadata_json 
      ${targetQuery}
      ORDER BY id ASC
      LIMIT 20
    `;

    const res = await pool.query(query);
    const docs = res.rows;
    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    for (const doc of docs) {
      writeLiveStatus(successCount + failCount + skippedCount, totalDocs, doc.file_name);
      const filePath = doc.file_path;
      // Try relative or absolute paths
      let fullPath = filePath;
      if (!existsSync(fullPath)) {
        fullPath = join(process.cwd(), filePath);
      }
      // Sometimes documents reference paths in root data dir
      if (!existsSync(fullPath) && process.env.RAW_CORPUS_BASE_PATH) {
        fullPath = join(process.env.RAW_CORPUS_BASE_PATH, filePath);
      }

      if (!existsSync(fullPath)) {
        console.warn(`  ⚠️  File not found: ${filePath} (id: ${doc.id})`);
        skippedCount++;
        continue;
      }

      console.log(`  ⚙️  [${doc.id}] Analyzing via VLM: ${doc.file_name}...`);

      try {
        const imageBuffer = readFileSync(fullPath);
        const enrichedText = await AIEnrichmentService.parseDocumentPageVisual(imageBuffer);

        if (!enrichedText || enrichedText.trim().length < 5) {
          throw new Error('VLM produced empty or invalid output');
        }

        // Forensic repair integration
        const cleanedText = await TextCleaner.cleanOcrTextAsync(enrichedText, doc.file_name);
        const preview = cleanedText.substring(0, 500);

        // Merge metadata
        const meta = doc.metadata_json || {};
        meta.vlm_parsed = true;
        meta.vlm_enriched_at = new Date().toISOString();
        meta.vlm_run_id = RUN_ID;
        meta.vlm_version = PIPELINE_VERSION;

        await pool.query(
          `UPDATE documents SET 
            content = $1, 
            content_refined = $2,
            content_preview = $3,
            metadata_json = $4,
            pipeline_version = $5,
            analyzed_at = NOW() 
           WHERE id = $6`,
          [enrichedText, cleanedText, preview, JSON.stringify(meta), PIPELINE_VERSION, doc.id],
        );

        // Ensure page 1 maps correctly
        const pageCheck = await pool.query(
          'SELECT id FROM document_pages WHERE document_id = $1 AND page_number = 1',
          [doc.id],
        );
        if (pageCheck.rowCount === 0) {
          await pool.query(
            'INSERT INTO document_pages (document_id, page_number, extracted_text, text_source, created_at) VALUES ($1, 1, $2, $3, NOW())',
            [doc.id, cleanedText, 'vlm_vision'],
          );
        } else {
          await pool.query(
            "UPDATE document_pages SET extracted_text = $1, text_source = 'vlm_vision' WHERE id = $2",
            [cleanedText, pageCheck.rows[0].id],
          );
        }

        console.log(`    ✅ Extracted ${enrichedText.length} chars via VLM.`);
        successCount++;
      } catch (e) {
        console.error(`    ❌ Failed to process ${doc.file_name}:`, (e as Error).message);
        // Mark as failed but mark vlm_parsed=true to avoid loop, or log error
        const meta = doc.metadata_json || {};
        meta.vlm_error = (e as Error).message;
        meta.vlm_parsed = false;
        meta.vlm_attempts = (meta.vlm_attempts || 0) + 1;
        // If failed more than 3 times, flag it so we skip it to make progress
        if (meta.vlm_attempts >= 3) {
          meta.vlm_parsed = true;
          meta.vlm_failed_permanently = true;
        }
        await pool.query('UPDATE documents SET metadata_json = $1 WHERE id = $2', [
          JSON.stringify(meta),
          doc.id,
        ]);
        failCount++;
      }

      // Short sleep to yield to the Exo API cluster
      await sleep(500);
    }
  }

  console.log('\n' + '='.repeat(30));
  console.log('🏁 VLM Backfill Complete');
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed:  ${failCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log('='.repeat(30));

  try {
    fs.writeFileSync(
      './pipeline_checkpoints/live_status.json',
      JSON.stringify(
        { running: false, phase: 'Idle', exitReason: 'VLM Backfill Complete' },
        null,
        2,
      ),
    );
  } catch (_e) {
    // non-fatal
  }

  await pool.end();
}

backfillVlm().catch((err) => {
  console.error(err);
  process.exit(1);
});
