// ============================================================================
// QUEUE WORKER — processQueue and enrichCompleted
// ============================================================================

import * as path from 'path';
import * as crypto from 'crypto';
import { getIngestPool } from '../../src/server/db/connection.js';
import { PipelineService } from '../../src/server/services/pipelineService.js';
import { AIEnrichmentService } from '../../src/server/services/AIEnrichmentService.js';
import { markViewsDirty } from '../../src/server/services/matViewRefresh.js';
import {
  JobManager,
  getWorkerConfig,
  intFromEnv,
  WorkerPool,
} from '../../src/server/queue/index.js';
import { PIPELINE_VERSION } from './config.js';
import type { IngestContext } from './context.js';

/**
 * AI enrichment backfill: generates summaries for completed documents that are missing
 * durable summary artifacts. Model output is not written into canonical document metadata.
 */
export async function enrichCompleted(ctx: IngestContext): Promise<void> {
  const db = getIngestPool();
  // Exo serves ~1 request at a time; 3-4 concurrent keeps the pipeline fed
  // without building a queue (30 concurrent = 30x latency penalty).
  const CONCURRENCY = intFromEnv('AI_SUMMARY_CONCURRENCY', 4, 1, 16);
  const BATCH = intFromEnv('AI_SUMMARY_BATCH_SIZE', 300, 1, 1000);

  // Count total work
  const { rows: countRows } = await db.query(`
    SELECT COUNT(*) AS n FROM documents
    WHERE processing_status = 'completed'
      AND content IS NOT NULL
      AND length(content) >= 100
      AND NOT EXISTS (
        SELECT 1 FROM document_ai_artifacts daa
        WHERE daa.document_id = documents.id
          AND daa.artifact_type = 'summary'
          AND daa.artifact_version = 'summary-v2'
          AND daa.prompt_version = 'forensic-summary-v1'
      )
  `);
  const total = parseInt(countRows[0].n, 10);
  console.log(`   📊 ${total.toLocaleString()} docs need enrichment (no summary artifact yet)`);
  if (total === 0) {
    console.log('   ✅ Already fully enriched.');
    return;
  }

  let processed = 0;
  let lastId = 0;

  // OCR cleanup runs only in the versioned ai-ocr-cleanup stage.
  const processRow = async (row: { id: number; file_path: string | null; content: string }) => {
    try {
      const text = row.content;
      const summary = await AIEnrichmentService.summarizeDocument(text, {
        fileName: row.file_path ? path.basename(row.file_path) : undefined,
      });
      if (summary && summary.length > 0) {
        const inputHash = crypto.createHash('sha256').update(text).digest('hex');
        const outputHash = crypto
          .createHash('sha256')
          .update(text + summary)
          .digest('hex');
        await PipelineService.upsertAiArtifact({
          runId: ctx.currentRun?.id,
          documentId: Number(row.id),
          artifactType: 'summary',
          artifactVersion: 'summary-v2',
          modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
          promptVersion: 'forensic-summary-v1',
          sourceExcerpt: text.slice(0, 2000),
          outputText: summary,
          confidence: 0.75,
          provenance: {
            provider: process.env.AI_PROVIDER,
            pipelineVersion: PIPELINE_VERSION,
            inputHash,
            outputHash,
            canonicalTextUpdated: false,
          },
        });
      }
    } catch (_e) {
      ctx.audit.recordError('ocr_enrichment_retry', (_e as Error).message);
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await db.query(
      `
      SELECT id, file_path, content FROM documents
      WHERE processing_status = 'completed'
        AND content IS NOT NULL
        AND length(content) >= 100
        AND NOT EXISTS (
          SELECT 1 FROM document_ai_artifacts daa
          WHERE daa.document_id = documents.id
            AND daa.artifact_type = 'summary'
            AND daa.artifact_version = 'summary-v2'
            AND daa.prompt_version = 'forensic-summary-v1'
        )
        AND id > $1
      ORDER BY id
      LIMIT $2
    `,
      [lastId, BATCH],
    );
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);
      await Promise.allSettled(chunk.map((row) => processRow(row)));
      processed += chunk.length;
      if (processed % 100 === 0 || processed === total) {
        const pct = ((processed / total) * 100).toFixed(1);
        process.stdout.write(
          `\r   🧠 Enriched ${processed.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`,
        );
      }
    }

    lastId = rows[rows.length - 1].id as number;
  }

  process.stdout.write(
    `\n   ✅ Enrichment complete — ${processed.toLocaleString()} docs processed.\n`,
  );
}

export async function processQueue(ctx: IngestContext): Promise<void> {
  const db = getIngestPool();
  const jobManager = new JobManager();
  console.log('\nProcessing Queue with Robust Leasing (Phase 9)...');

  // Enforce Exo cluster usage
  process.env.AI_PROVIDER = 'exo_cluster';
  process.env.ENABLE_AI_ENRICHMENT = 'true';
  console.log('   🚀 Enforcing AI_PROVIDER=exo_cluster for maximum throughput');

  const workerConfig = getWorkerConfig();
  const CONCURRENCY = intFromEnv('INGEST_CONCURRENCY', 30, 1, 64);
  const pool = new WorkerPool();
  let processedCount = 0;
  let hasMore = true;

  // These are the large in-progress sets we want to save for last.
  const GIANT_COLLECTIONS = ['DOJ Data Set 9', 'DOJ Data Set 10', 'DOJ Data Set 11'];

  // Non-giant collections: re-queue ALL retryable failures regardless of
  // attempt count — transient errors must not leave a tranche permanently stuck.
  const requeuedMopUp = await jobManager.requeueFailed({
    excludeCollections: GIANT_COLLECTIONS,
    retryableOnly: true,
  });

  // Giant collections: only re-queue docs that haven't exhausted retries.
  const requeuedGiants = await jobManager.requeueFailed({
    onlyCollections: GIANT_COLLECTIONS,
    maxAttempts: workerConfig.maxAttempts,
    retryableOnly: true,
  });

  console.log(
    `   ♻️  Re-queued ${requeuedMopUp} mop-up docs (non-giant) + ${requeuedGiants} giant-collection docs.`,
  );

  // Pre-compute collection priority: collections closest to 100% go first so
  // tranches complete fully rather than all advancing in parallel.
  const priorityRows = await jobManager.getCollectionPriority();

  // These large datasets are deprioritized — all other collections drain to
  // 100% first. DS 9 joins DS 10/11 so near-complete tranches finish before
  // the big multi-day sets get any slots.
  const DEPRIORITIZED = new Set(['DOJ Data Set 9', 'DOJ Data Set 10', 'DOJ Data Set 11']);

  const normal = priorityRows.filter((r) => !DEPRIORITIZED.has(r.source_collection));
  const deprio = priorityRows.filter((r) => DEPRIORITIZED.has(r.source_collection));
  // Within deprioritized, still process the further-along one first
  deprio.sort((a, b) => parseFloat(b.pct_done) - parseFloat(a.pct_done));

  const collectionPriority = [...normal, ...deprio].map((r) => r.source_collection);
  console.log('   📊 Collection priority (closest to done first; large sets deprioritized):');
  [...normal, ...deprio].forEach((r) =>
    console.log(
      `      ${DEPRIORITIZED.has(r.source_collection) ? '[deprio] ' : '         '}${r.source_collection}: ${r.pct_done}% done, ${r.remaining} remaining`,
    ),
  );

  console.log(`   ⚡️  Concurrency Level: ${CONCURRENCY} workers`);

  // Track per-collection remaining counts so we can celebrate completions.
  const collectionRemaining = new Map<string, number>();
  for (const row of [...normal, ...deprio]) {
    collectionRemaining.set(row.source_collection, parseInt(row.remaining, 10));
  }

  const launchDoc = (doc: {
    id: number;
    file_path: string;
    source_collection: string | null;
    processing_attempts: number;
  }) => {
    pool.run(async () => {
      const docId = Math.floor(doc.id);
      try {
        await jobManager.renewLease(docId, workerConfig.leaseSeconds);

        const fullDoc =
          (await db.query('SELECT content, content_preview FROM documents WHERE id = $1', [docId]))
            .rows[0] ?? null;

        if (fullDoc && fullDoc.content) {
          const context = fullDoc.content.slice(0, 2000);
          const repaired = await AIEnrichmentService.repairMimeWildcards(fullDoc.content, context);

          const summary = await AIEnrichmentService.summarizeDocument(repaired, {
            fileName: doc.file_path ? path.basename(doc.file_path) : undefined,
          });
          const contentChanged = repaired !== fullDoc.content;
          const hasSummary = summary && summary.length > 0;

          if (hasSummary) {
            const sourceText = repaired as string;
            await PipelineService.upsertAiArtifact({
              runId: ctx.currentRun?.id,
              documentId: docId,
              artifactType: 'summary',
              artifactVersion: 'summary-v2',
              modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
              promptVersion: 'forensic-summary-v1',
              sourceExcerpt: sourceText.slice(0, 2000),
              outputText: summary,
              confidence: 0.75,
              provenance: {
                provider: process.env.AI_PROVIDER,
                pipelineVersion: PIPELINE_VERSION,
                inputHash: crypto.createHash('sha256').update(sourceText).digest('hex'),
                outputHash: crypto
                  .createHash('sha256')
                  .update(sourceText + summary)
                  .digest('hex'),
                canonicalTextUpdated: false,
              },
            });
          }

          if (contentChanged || hasSummary) {
            await db.query('UPDATE documents SET last_processed_at = NOW() WHERE id = $1', [docId]);
          }
        }

        await jobManager.completeJob(docId);
        processedCount++;

        // Celebrate when a collection drains to zero.
        if (doc.source_collection) {
          const prev = collectionRemaining.get(doc.source_collection) ?? 1;
          const next = Math.max(0, prev - 1);
          collectionRemaining.set(doc.source_collection, next);
          if (next === 0) {
            process.stdout.write(`\n   🎉 ${doc.source_collection} — 100% COMPLETE\n`);
          }
        }

        if (processedCount % 10 === 0) {
          process.stdout.write(
            `\r   ✅ Processed ${processedCount} documents (Active: ${pool.size})`,
          );
        }
      } catch (e) {
        console.error(`\n      ❌ Job Failed (Doc ${docId}): ${(e as Error).message}`);
        await jobManager.failJob(docId, (e as Error).message);
      }
    });
  };

  while (hasMore || pool.size > 0) {
    // Batch-fill all open slots in one DB round-trip so every AI call fires
    // simultaneously instead of serialising behind individual acquires.
    const slots = CONCURRENCY - pool.size;
    if (slots > 0 && hasMore) {
      const batch = await jobManager.acquireJobBatch(slots, 600, collectionPriority);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        for (const doc of batch) {
          launchDoc(doc);
        }
      }
    }

    if (pool.size > 0) {
      await pool.waitForNext();
    } else if (!hasMore) {
      break;
    }
  }

  if (processedCount === 0) {
    console.log('\n   (No queued jobs found)');
  } else {
    await db.query('ANALYZE documents');
    markViewsDirty();
    console.log(`\n\n   ✅ Processed ${processedCount} queued jobs reliably.`);
  }

  ctx.audit.printErrorSummary();
}
