#!/usr/bin/env tsx
import 'dotenv/config';
import { JobManager } from '../src/server/services/JobManager.js';
import { getIngestPool } from '../src/server/db/connection.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';

process.env.AI_PROVIDER = 'exo_cluster';
process.env.ENABLE_AI_ENRICHMENT = 'true';

const CONCURRENCY = parseInt(process.env.INGEST_CONCURRENCY || '2', 10);
const LEASE_SECONDS = parseInt(process.env.QUEUE_LEASE_SECONDS || '600', 10);
const HEALTH_URL = process.env.QUEUE_HEALTH_URL || 'http://127.0.0.1:3012/api/health';

async function waitForHealthyApi(): Promise<void> {
  try {
    const res = await fetch(HEALTH_URL, { method: 'GET' });
    if (res.ok) return;
  } catch {
    // intentional: handled below
  }
  process.stdout.write(`\n⚠️ API unhealthy at ${HEALTH_URL}. Pausing queue worker for 30s...\n`);
  await new Promise((resolve) => setTimeout(resolve, 30000));
}

async function runQueue() {
  const pool = getIngestPool();
  const jobManager = new JobManager();

  let shuttingDown = false;
  let processed = 0;
  let failed = 0;
  let hasMore = true;
  const active: Set<Promise<void>> = new Set();
  const startedAt = Date.now();

  const initialQueued = (
    await pool.query("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'")
  ).rows[0].c as number;

  const initialProcessing = (
    await pool.query("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'processing'")
  ).rows[0].c as number;

  console.log('='.repeat(80));
  console.log('🚀 SINGLE-NODE QUEUE RUNNER');
  console.log('='.repeat(80));
  console.log(`🤖 EXO_MODEL=${process.env.EXO_MODEL || '(auto-discover)'}`);
  console.log(`⚡ Concurrency=${CONCURRENCY}`);
  console.log(`📬 Initial queued=${Number(initialQueued).toLocaleString()}`);
  console.log(`⏳ Initial processing=${Number(initialProcessing).toLocaleString()}`);
  console.log();

  const signalHandler = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n🛑 Shutdown requested. Finishing active jobs...');
  };
  process.on('SIGINT', signalHandler);
  process.on('SIGTERM', signalHandler);

  while (!shuttingDown && (hasMore || active.size > 0)) {
    await waitForHealthyApi();

    while (!shuttingDown && hasMore && active.size < CONCURRENCY) {
      const job = await jobManager.acquireJob(LEASE_SECONDS);
      if (!job) {
        hasMore = false;
        break;
      }

      const p = (async () => {
        const docId = Number(job.id);
        try {
          await jobManager.renewLease(docId, LEASE_SECONDS);

          const row = (await pool.query('SELECT content FROM documents WHERE id = $1', [docId]))
            .rows[0] as { content?: string } | undefined;
          const content = row?.content ?? '';

          if (content.length > 0) {
            const context = content.slice(0, 2000);
            const refined = await AIEnrichmentService.repairMimeWildcards(content, context);
            if (refined && refined !== content) {
              await pool.query(
                'UPDATE documents SET content = $1, content_refined = $2, last_processed_at = NOW() WHERE id = $3',
                [refined, refined, docId],
              );
            }
          }

          await jobManager.completeJob(docId);
          processed++;

          if (processed % 25 === 0) {
            const elapsedSec = (Date.now() - startedAt) / 1000;
            const rate = processed / Math.max(elapsedSec, 1);
            const remaining = (
              await pool.query(
                "SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'",
              )
            ).rows[0].c as number;
            const etaMin = Number(remaining) / Math.max(rate, 0.0001) / 60;
            process.stdout.write(
              `\r✅ Processed=${processed.toLocaleString()} Failed=${failed.toLocaleString()} Active=${active.size} Rate=${rate.toFixed(2)} docs/s Remaining=${Number(remaining).toLocaleString()} ETA=${etaMin.toFixed(1)}m`,
            );
          }
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          failed++;
          await jobManager.failJob(docId, message || 'unknown error');
          process.stdout.write(`\n❌ Doc ${docId} failed: ${message || 'unknown error'}\n`);
        }
      })();

      p.finally(() => active.delete(p));
      active.add(p);
    }

    if (active.size > 0) {
      await Promise.race(active);
    } else if (!hasMore) {
      break;
    }
  }

  while (active.size > 0) {
    await Promise.race(active);
  }

  const queuedLeft = (
    await pool.query("SELECT COUNT(*) AS c FROM documents WHERE processing_status = 'queued'")
  ).rows[0].c as number;

  console.log('\n');
  console.log('='.repeat(80));
  console.log('🏁 QUEUE RUN COMPLETE');
  console.log('='.repeat(80));
  console.log(`Processed: ${processed.toLocaleString()}`);
  console.log(`Failed: ${failed.toLocaleString()}`);
  console.log(`Queued remaining: ${Number(queuedLeft).toLocaleString()}`);
}

runQueue().catch((err) => {
  console.error('\n❌ Fatal queue runner error:', err);
  process.exit(1);
});
