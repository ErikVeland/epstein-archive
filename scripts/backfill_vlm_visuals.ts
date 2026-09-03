import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { getIngestPool } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import { resolveMediaPath } from '../src/server/utils/pathResolver.js';
import { verifiedPhotographForVlmWhereSql } from './pipeline/vlmEligibility.js';
import { writeLiveStatus as writePipelineLiveStatus } from './pipeline/status.js';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

process.env.ENABLE_AI_ENRICHMENT = 'true';
if (!process.env.AI_PROVIDER) process.env.AI_PROVIDER = 'exo_cluster';

const PIPELINE_VERSION = 'media-vlm-2.0';
const RUN_ID = `media-vlm-backfill-${Date.now()}`;
const VLM_BATCH_SIZE = Math.max(1, parseInt(process.env.VLM_BACKFILL_BATCH_SIZE || '50', 10) || 50);
const configuredLimit =
  process.env.VLM_BACKFILL_MAX_MEDIA || process.env.VLM_BACKFILL_MAX_DOCS || '0';
const VLM_MAX_MEDIA = Math.max(0, parseInt(configuredLimit, 10) || 0);
const VLM_MAX_EDGE = Math.max(768, parseInt(process.env.VLM_MAX_IMAGE_EDGE || '1600', 10) || 1600);
const ELIGIBILITY_SQL = verifiedPhotographForVlmWhereSql('media');

interface MediaRow {
  id: string;
  file_path: string;
}

function writeLiveStatus(
  processed: number,
  total: number,
  file: string | null,
  blockedReason?: string,
): void {
  writePipelineLiveStatus({
    running: true,
    phase: 'VLM Backfill',
    heartbeatAt: new Date().toISOString(),
    vlmProcessed: processed,
    vlmTotal: total,
    vlmLiveProcessed: processed,
    vlmLiveTotal: total,
    currentFile: file,
    blocked: Boolean(blockedReason),
    blockedReason,
    activeStage: blockedReason ? 'Vision Model Readiness' : 'VLM Visual Analysis',
    activeStageDescription:
      blockedReason || (file ? `Analyzing ${file}` : 'Preparing verified photograph batch'),
  });
}

async function preparePhotographForVlm(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize({
      width: VLM_MAX_EDGE,
      height: VLM_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

function sleep(ms: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureVisionModelReady(processed: number, total: number): Promise<void> {
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
    } catch (error) {
      const reason = `Waiting for EXO state API: ${(error as Error).message}`;
      console.warn(`  ⏳ ${reason}`);
      writeLiveStatus(processed, total, null, reason);
    }

    await sleep(30_000);
  }
}

async function recordFailure(mediaId: string, message: string, permanent: boolean): Promise<void> {
  const pool = getIngestPool();
  await pool.query(
    `UPDATE media_items
     SET metadata_json = jsonb_set(
       COALESCE(metadata_json, '{}'::jsonb),
       '{ai_visual}',
       COALESCE(metadata_json->'ai_visual', '{}'::jsonb) || jsonb_build_object(
         'indexed', false,
         'error', $1::text,
         'attempts', COALESCE((metadata_json->'ai_visual'->>'attempts')::integer, 0) + 1,
         'failedPermanently', $2::boolean,
         'runId', $3::text,
         'pipelineVersion', $4::text
       ),
       true
     )
     WHERE id = $5::text`,
    [message, permanent, RUN_ID, PIPELINE_VERSION, mediaId],
  );
}

async function backfillVlm(): Promise<void> {
  const pool = getIngestPool();
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  let processedThisRun = 0;

  const targetQuery = `
    FROM media_items media
    WHERE ${ELIGIBILITY_SQL}
      AND COALESCE(media.metadata_json->'ai_visual'->>'indexed', 'false') <> 'true'
      AND COALESCE(media.metadata_json->'ai_visual'->>'failedPermanently', 'false') <> 'true'
  `;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total ${targetQuery}`,
  );
  const totalMedia = parseInt(countResult.rows[0].total, 10);
  console.log(`🚀 Found ${totalMedia} verified photographs requiring VLM visual analysis.`);
  console.log('   Eligibility: probable photograph with verified source status.');

  if (totalMedia === 0) {
    console.log('🎉 No verified photographs require VLM analysis.');
    await pool.end();
    return;
  }
  if (VLM_MAX_MEDIA > 0) {
    console.log(`   ⏱️  This run is capped at ${VLM_MAX_MEDIA} media items.`);
  }

  let hasMore = true;
  while (hasMore) {
    if (VLM_MAX_MEDIA > 0 && processedThisRun >= VLM_MAX_MEDIA) {
      console.log(`\n⏸️  VLM run cap reached (${processedThisRun}/${VLM_MAX_MEDIA}).`);
      break;
    }

    await ensureVisionModelReady(successCount + failCount + skippedCount, totalMedia);
    const remainingCap =
      VLM_MAX_MEDIA > 0 ? Math.max(0, VLM_MAX_MEDIA - processedThisRun) : VLM_BATCH_SIZE;
    const result = await pool.query<MediaRow>(
      `SELECT media.id, media.file_path
       ${targetQuery}
       ORDER BY COALESCE(media.red_flag_rating, 0) DESC, media.created_at ASC, media.id ASC
       LIMIT $1::integer`,
      [Math.min(VLM_BATCH_SIZE, remainingCap)],
    );
    if (result.rows.length === 0) {
      hasMore = false;
      break;
    }

    for (const media of result.rows) {
      writeLiveStatus(successCount + failCount + skippedCount, totalMedia, media.file_path);
      const fullPath = resolveMediaPath(media.file_path);
      if (!fullPath || !existsSync(fullPath)) {
        console.warn(`  ⚠️  File not found: ${media.file_path} (media id: ${media.id})`);
        await pool.query(
          `UPDATE media_items
           SET metadata_json = jsonb_set(
             COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('source_file_status', 'missing'),
             '{ai_visual}',
             jsonb_build_object(
               'indexed', false,
               'error', 'File not found',
               'failedPermanently', true,
               'runId', $1::text,
               'pipelineVersion', $2::text
             ),
             true
           )
           WHERE id = $3::text`,
          [RUN_ID, PIPELINE_VERSION, media.id],
        );
        skippedCount += 1;
        processedThisRun += 1;
        continue;
      }

      console.log(`  ⚙️  [${media.id}] Analyzing verified photograph: ${media.file_path}`);
      try {
        const sourceImageBuffer = readFileSync(fullPath);
        const analysisImageBuffer = await preparePhotographForVlm(sourceImageBuffer);
        const keepalive = setInterval(
          () =>
            writeLiveStatus(successCount + failCount + skippedCount, totalMedia, media.file_path),
          30_000,
        );
        let visualDescription = '';
        try {
          visualDescription = (
            await AIEnrichmentService.analyzeVerifiedPhotograph(analysisImageBuffer)
          ).trim();
        } finally {
          clearInterval(keepalive);
        }
        if (visualDescription.length < 5) {
          throw new Error('VLM produced empty or invalid output');
        }

        await pool.query(
          `UPDATE media_items
           SET description = COALESCE(NULLIF(description, ''), $1::text),
               metadata_json = jsonb_set(
                 COALESCE(metadata_json, '{}'::jsonb),
                 '{ai_visual}',
                 COALESCE(metadata_json->'ai_visual', '{}'::jsonb) || jsonb_build_object(
                   'indexed', true,
                   'source', 'verified_media_vlm',
                   'description', $1::text,
                   'pipelineVersion', $2::text,
                   'runId', $3::text,
                   'analyzedAt', NOW()::text,
                   'reviewState', 'unreviewed'
                 ),
                 true
               )
           WHERE id = $4::text
             AND ${verifiedPhotographForVlmWhereSql('media_items')}`,
          [visualDescription.slice(0, 4000), PIPELINE_VERSION, RUN_ID, media.id],
        );
        console.log(`    ✅ Stored ${visualDescription.length} characters of visual analysis.`);
        successCount += 1;
      } catch (error) {
        const message = (error as Error).message;
        console.error(`    ❌ Failed to process ${media.file_path}: ${message}`);
        const attemptsResult = await pool.query<{ attempts: number }>(
          `SELECT COALESCE((metadata_json->'ai_visual'->>'attempts')::integer, 0) AS attempts
           FROM media_items
           WHERE id = $1::text`,
          [media.id],
        );
        const nextAttempts = Number(attemptsResult.rows[0]?.attempts || 0) + 1;
        await recordFailure(media.id, message, nextAttempts >= 3);
        failCount += 1;
      }
      processedThisRun += 1;
    }
  }

  console.log('\n' + '='.repeat(30));
  console.log('🏁 Verified Photograph VLM Backfill Complete');
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed:  ${failCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log('='.repeat(30));

  writePipelineLiveStatus({
    running: false,
    phase: 'Idle',
    exitReason: 'Verified photograph VLM backfill complete',
    currentFile: null,
  });

  await pool.end();
}

backfillVlm().catch((error) => {
  console.error(error);
  process.exit(1);
});
