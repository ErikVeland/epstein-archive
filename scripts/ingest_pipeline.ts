#!/usr/bin/env tsx
/**
 * Unified Data Ingestion and Processing Pipeline — thin CLI entry point.
 *
 * All logic lives in scripts/ingest/. This file:
 *  - Parses CLI args (--mode, --rehash / -r)
 *  - Initialises the shared IngestContext
 *  - Delegates to the appropriate module function
 *  - Prints a final summary
 */

import { pathToFileURL } from 'url';

// Default AI integration to Exo cluster unless explicitly disabled
if (!process.env.ENABLE_AI_ENRICHMENT) {
  process.env.ENABLE_AI_ENRICHMENT = 'true';
}
if (!process.env.AI_PROVIDER) {
  process.env.AI_PROVIDER = 'exo_cluster';
}

import { buildContext, startPipelineRun, verifyDatabase } from './ingest/context.js';
import { COLLECTIONS } from './ingest/config.js';
import { processCollection } from './ingest/discovery.js';
import { processQueue, enrichCompleted, ocrCleanCompleted } from './ingest/queue_worker.js';
import { PipelineService } from '../src/server/services/pipelineService.js';
import { markViewsDirty } from '../src/server/services/matViewRefresh.js';

async function main() {
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'full';

  const shouldRehash = args.includes('--rehash') || args.includes('-r');

  console.log('='.repeat(80));
  console.log('🚀 UNIFIED DATA INGESTION PIPELINE');
  console.log('='.repeat(80));
  console.log();
  console.log(`🧭 Mode: ${mode}`);
  console.log(`🔄 Rehash: ${shouldRehash}`);
  console.log();

  // Enforce Exo Cluster for Max Performance
  process.env.AI_PROVIDER = 'exo_cluster';
  process.env.ENABLE_AI_ENRICHMENT = 'true';
  console.log('🚀 Configuring AI Provider: Exo Cluster (Concurrency Enabled)');
  if (process.env.EXO_MODEL) {
    console.log(`   🎯 Targeting Exo Model: ${process.env.EXO_MODEL}`);
  } else {
    console.log('   💡 Hint: Set EXO_MODEL to target a specific model (e.g. EXO_MODEL=14BE042F)');
  }

  // Build context (initialises DB pool)
  const ctx = await buildContext(shouldRehash);

  // Verify database
  if (!(await verifyDatabase(ctx.db))) {
    console.error('❌ Database verification failed. Exiting.');
    process.exit(1);
  }

  if (mode === 'queue-only') {
    console.log('⏭️  Skipping file ingestion. Running queue processor only.\n');
    await processQueue(ctx);
    return;
  }

  if (mode === 'enrich-only') {
    console.log('🧠 AI enrichment backfill: summaries for completed docs.\n');
    await enrichCompleted(ctx);
    return;
  }

  if (mode === 'ocr-clean') {
    console.log('🔧 OCR cleaning backfill: cleaning text for completed docs.\n');
    await ocrCleanCompleted(ctx);
    return;
  }

  // Start Pipeline Run
  ctx.currentRun = await startPipelineRun(ctx.db);

  console.log();

  // Process each collection
  const stats = {
    totalProcessed: 0,
    totalSkipped: 0,
    totalErrors: 0,
  };

  const collectionsToProcess = COLLECTIONS.filter((c) => c.enabled);

  for (const collection of collectionsToProcess) {
    const result = await processCollection(collection, ctx);
    stats.totalProcessed += result.processed;
    stats.totalSkipped += result.skipped;
    stats.totalErrors += result.errors;
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 PIPELINE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total documents processed:  ${stats.totalProcessed}`);
  console.log(`Total documents skipped:    ${stats.totalSkipped}`);
  console.log(`Total errors:               ${stats.totalErrors}`);

  // Current database stats
  const finalCount = ((await ctx.db.query('SELECT COUNT(*) as count FROM documents')).rows[0] ??
    null) as {
    count: number;
  };
  console.log(`\nFinal database count:       ${finalCount.count} documents`);

  // End Pipeline Run
  await PipelineService.updateRunStatus(ctx.currentRun.id, 'succeeded');

  if (stats.totalProcessed > 0) {
    await ctx.db.query('ANALYZE documents');
    await ctx.db.query('ANALYZE entities');
    markViewsDirty();
  }

  // Collection breakdown
  console.log('\nBy Collection:');
  interface CollectionCount {
    source_collection: string;
    count: string;
  }
  const collections = (
    await ctx.db.query<CollectionCount>(
      'SELECT source_collection, COUNT(*) as count FROM documents GROUP BY source_collection ORDER BY count DESC',
    )
  ).rows;
  for (const coll of collections) {
    console.log(`  • ${coll.source_collection}: ${coll.count}`);
  }

  console.log('='.repeat(80));
  console.log('✅ Ingestion complete! Now starting Intelligence Pipeline...');

  // Phase 2: Process from Queue (Reprocessing Lane)
  await processQueue(ctx);
}

// Run the pipeline
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}
