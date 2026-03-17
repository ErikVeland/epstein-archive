#!/usr/bin/env tsx
/**
 * Unified Evidence Pipeline Orchestrator — PG NATIVE VERSION
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import { getIngestPool } from '../src/server/db/connection.js';

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '20', 10);
const CONCURRENCY = parseInt(process.env.PIPELINE_CONCURRENCY || '8', 10);
const CHECKPOINT_DIR = './pipeline_checkpoints';
const LIVE_STATUS_FILE = './pipeline_checkpoints/live_status.json';

function writeLiveStatus(fields: Record<string, unknown>) {
  try {
    if (!existsSync(CHECKPOINT_DIR)) mkdirSync(CHECKPOINT_DIR, { recursive: true });
    let current: Record<string, unknown> = {};
    try {
      current = JSON.parse(readFileSync(LIVE_STATUS_FILE, 'utf8'));
    } catch {}
    writeFileSync(
      LIVE_STATUS_FILE,
      JSON.stringify({ ...current, pid: process.pid, ...fields }, null, 2),
    );
  } catch {}
}

// Ensure AI is enabled with Exo by default
process.env.ENABLE_AI_ENRICHMENT = 'true';
if (!process.env.AI_PROVIDER) {
  process.env.AI_PROVIDER = 'exo_cluster';
}

interface PipelineStats {
  mode: string;
  startTime: string;
  ingestStats?: { filesProcessed: number; errors: number };
  intelStats?: { entitiesExtracted: number; relationsFound: number };
  enrichStats?: { documentsEnriched: number; summariesGenerated: number };
}

/**
 * Run a subprocess and stream its output
 */
function runScript(scriptPath: string, args: string[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log(`\n📜 Running: npx tsx ${scriptPath} ${args.join(' ')}`);
    const child = spawn('npx', ['tsx', scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Phase 1: INGEST - Process raw files from source directory
 */
async function runIngestPhase(
  sourceDir: string,
): Promise<{ filesProcessed: number; errors: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('📥 PHASE 1: INGEST (OCR, Extraction, Parsing)');
  console.log('='.repeat(70));
  console.log(`   Source: ${sourceDir}`);

  if (!existsSync(sourceDir)) {
    console.log(`   ⚠️  Source directory not found: ${sourceDir}`);
    return { filesProcessed: 0, errors: 0 };
  }

  const exitCode = await runScript('scripts/ingest_pipeline.ts');

  return {
    filesProcessed: exitCode === 0 ? 1 : 0,
    errors: exitCode !== 0 ? 1 : 0,
  };
}

/**
 * Phase 2: INTEL - Entity extraction and relationship mapping
 */
async function runIntelPhase(): Promise<{ entitiesExtracted: number; relationsFound: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 PHASE 2: INTELLIGENCE (Entity Extraction, Relations)');
  console.log('='.repeat(70));

  const exitCode = await runScript('scripts/ingest_intelligence.ts');

  return {
    entitiesExtracted: exitCode === 0 ? 1 : 0,
    relationsFound: 0,
  };
}

/**
 * Phase 3: ENRICH - AI-powered enrichment for all documents
 */
async function runEnrichPhase(
  mode: 'new' | 'backfill' | 'all',
): Promise<{ documentsEnriched: number; summariesGenerated: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 PHASE 3: AI ENRICHMENT (Summaries, Classification)');
  console.log('='.repeat(70));
  console.log(`   Provider: ${process.env.AI_PROVIDER}`);
  console.log(`   Mode: ${mode}`);

  // Verify Exo cluster is reachable and has the target model loaded before burning retries on every doc
  const exoHost = process.env.EXO_HOST || 'http://127.0.0.1:52415';
  const exoModel =
    process.env.EXO_MODEL || process.env.AI_MODEL || 'mlx-community/Qwen3-30B-A3B-4bit';
  try {
    const testRes = await fetch(`${exoHost}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: exoModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (testRes.status === 404) {
      const body = (await testRes.json().catch(() => ({}))) as any;
      console.log(
        `   ⚠️  Exo model not loaded (${body?.error?.message ?? '404'}). Skipping enrichment phase.`,
      );
      return { documentsEnriched: 0, summariesGenerated: 0 };
    }
  } catch (err: any) {
    console.log(`   ⚠️  Exo cluster unreachable (${err.message}). Skipping enrichment phase.`);
    return { documentsEnriched: 0, summariesGenerated: 0 };
  }

  const pool = getIngestPool();

  let whereClause = 'content IS NOT NULL AND length(content) > 50';
  if (mode === 'backfill') {
    whereClause += " AND (metadata_json IS NULL OR NOT metadata_json ? 'ai_summary')";
  } else if (mode === 'new') {
    whereClause += " AND created_at > now() - interval '1 day'";
  }

  // Get enrichable total once at start for progress tracking
  const enrichTotalRow = (
    await pool.query(`SELECT COUNT(*) AS total FROM documents WHERE ${whereClause}`)
  ).rows[0];
  const enrichTotal = Number(enrichTotalRow?.total || 0);

  let documentsEnriched = 0;
  let summariesGenerated = 0;
  const startTime = Date.now();

  // Record when this enrichment run began so the widget can compute throughput/ETA
  writeLiveStatus({ enrichStartedAt: new Date().toISOString() });

  while (!shuttingDown) {
    // Always query at offset 0: enriched docs drop out of the WHERE clause
    // so the result set naturally shrinks each iteration.
    const docs = (
      await pool.query(
        `
      SELECT id, LEFT(content, 4000) AS content, metadata_json, file_name
      FROM documents
      WHERE ${whereClause}
      ORDER BY id ASC
      LIMIT $1
    `,
        [BATCH_SIZE],
      )
    ).rows as any[];

    if (docs.length === 0) break;

    // Write progress to live_status.json once per batch so the widget stays current
    writeLiveStatus({
      phase: 'Enrichment',
      enrichProcessed: documentsEnriched,
      enrichTotal,
      currentFile: docs[0]?.file_name ?? null,
    });

    // Process sequentially: EXO is local so parallel requests queue up on its side
    // anyway, while concurrent fetches multiply Node.js heap usage for no throughput gain.
    for (const doc of docs) {
      if (shuttingDown) break;
      try {
        // node-postgres auto-parses jsonb into objects; handle both cases
        let meta: Record<string, any> = {};
        if (doc.metadata_json) {
          if (typeof doc.metadata_json === 'object') {
            meta = doc.metadata_json;
          } else {
            try {
              meta = JSON.parse(doc.metadata_json);
            } catch {
              meta = {};
            }
          }
        }
        // Release metadata_json from the row object immediately after parsing
        doc.metadata_json = null;

        const subject = meta.subject || meta.title || doc.file_name || 'Unknown Document';

        // Skip expensive MIME repair during backfill — it generates hundreds
        // of LLM calls per large doc and overwhelms the inference backend.
        // Use deterministic decode only; summarizer truncates to 2000 chars anyway.
        const refinedText = AIEnrichmentService.decodeHtmlAndUnicode(doc.content);
        // Release raw content from row object — refinedText is the only copy we need
        doc.content = null;

        let summary = await AIEnrichmentService.summarizeDocument(refinedText, {
          fileName: doc.file_name,
          subject,
        });

        if (!summary || summary.length < 10) {
          const preview = refinedText
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200);
          summary = `Document "${doc.file_name}" summary preview: ${preview}...`;
        }

        meta.ai_summary = summary;
        meta.ai_enriched_at = new Date().toISOString();
        meta.ai_provider = process.env.AI_PROVIDER;

        await pool.query(
          'UPDATE documents SET metadata_json = $1, content_refined = $2 WHERE id = $3',
          [JSON.stringify(meta), refinedText, doc.id],
        );
        summariesGenerated++;
        documentsEnriched++;
      } catch (error) {
        console.error(`   ❌ Failed to enrich document ${doc.id}:`, error);
      }

      if (documentsEnriched % 10 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = elapsed > 0 ? documentsEnriched / elapsed : 0;
        process.stdout.write(`\r   ⏳ ${documentsEnriched} enriched | ${rate.toFixed(1)} docs/s`);
      }
    }

    // Brief pause between batches — allows V8 GC to reclaim the just-processed docs
    // before loading the next batch.
    await sleep(200);
  }
  console.log('\n');
  return { documentsEnriched, summariesGenerated };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Graceful shutdown flag — set by SIGTERM/SIGINT so loops can exit cleanly.
let shuttingDown = false;

/**
 * Run one full pipeline cycle.
 */
async function runCycle(mode: string, sourceDir: string): Promise<void> {
  const stats: PipelineStats = {
    mode,
    startTime: new Date().toISOString(),
  };

  writeLiveStatus({ running: true, phase: 'Ingest', crashed: false });
  if (mode === 'ingest' || mode === 'full') {
    stats.ingestStats = await runIngestPhase(sourceDir);
    writeLiveStatus({ phase: 'Intelligence' });
    stats.intelStats = await runIntelPhase();
  }
  if (mode === 'backfill') {
    writeLiveStatus({ phase: 'Enrichment' });
    stats.enrichStats = await runEnrichPhase('backfill');
  } else if (mode === 'ingest') {
    writeLiveStatus({ phase: 'Enrichment' });
    stats.enrichStats = await runEnrichPhase('new');
  } else if (mode === 'full') {
    writeLiveStatus({ phase: 'Enrichment' });
    stats.enrichStats = await runEnrichPhase('all');
  }
  writeLiveStatus({ phase: 'Idle' });

  console.log('\n' + '='.repeat(70));
  console.log('✅ CYCLE COMPLETE — restarting in 30s');
  console.log('='.repeat(70));

  if (!existsSync(CHECKPOINT_DIR)) {
    mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }
  writeFileSync(join(CHECKPOINT_DIR, `run_${Date.now()}.json`), JSON.stringify(stats, null, 2));
}

/**
 * Main orchestrator — runs continuously until killed.
 */
async function main() {
  // Catch silent crashes
  process.on('uncaughtException', (err: Error) => {
    console.error('\n💀 UNCAUGHT EXCEPTION:', err);
    writeLiveStatus({ crashed: true, lastError: err.message, phase: 'Crashed' });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('\n💀 UNHANDLED REJECTION:', reason);
    writeLiveStatus({ crashed: true, lastError: String(reason), phase: 'Crashed' });
    process.exit(1);
  });
  // SIGTERM = macOS memory pressure. Spawn a fresh instance (clean heap) and exit
  // immediately — do not wait for the current doc; macOS won't give us enough time.
  process.on('SIGTERM', () => {
    if (shuttingDown) return;
    shuttingDown = true;
    writeLiveStatus({ running: false, phase: 'Respawning' });
    console.log('\n↩ SIGTERM — respawning with fresh heap...');
    try {
      const child = spawn(process.argv[0], [...process.execArgv, ...process.argv.slice(1)], {
        detached: true,
        stdio: 'inherit',
        env: process.env,
        cwd: process.cwd(),
      });
      child.unref();
      console.log(`↩ Continuing as PID ${child.pid}`);
    } catch (err) {
      console.error('Failed to respawn:', err);
    }
    process.exit(0);
  });
  // SIGINT (Ctrl+C) = intentional stop, no respawn.
  process.on('SIGINT', () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n🛑 Stopped.');
    writeLiveStatus({ running: false, phase: 'Stopped' });
    process.exit(0);
  });

  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const sourceIndex = args.indexOf('--source');

  const rawMode = modeIndex >= 0 ? args[modeIndex + 1] : 'full';
  const VALID_MODES = ['full', 'ingest', 'backfill'] as const;
  if (!VALID_MODES.includes(rawMode as (typeof VALID_MODES)[number])) {
    console.error(`❌ Invalid --mode "${rawMode}". Must be one of: ${VALID_MODES.join(', ')}`);
    process.exit(1);
  }
  const mode = rawMode as (typeof VALID_MODES)[number];
  const sourceDir = sourceIndex >= 0 ? args[sourceIndex + 1] : 'data/ingest';

  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(20) + 'UNIFIED EVIDENCE PIPELINE' + ' '.repeat(23) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('   Mode: ' + mode + '  (runs continuously until killed)');

  writeLiveStatus({ running: true, crashed: false, phase: 'Starting' });

  let cycleCount = 0;
  while (!shuttingDown) {
    cycleCount++;
    console.log(`\n[Cycle ${cycleCount} — ${new Date().toLocaleTimeString()}]`);
    try {
      await runCycle(mode, sourceDir);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('\n❌ Cycle error (will retry in 60s):', error);
      writeLiveStatus({ phase: 'Error', lastError: msg });
      await sleep(60_000);
      continue;
    }
    if (!shuttingDown) await sleep(30_000);
  }
  writeLiveStatus({ running: false, phase: 'Stopped' });
  console.log('✅ Pipeline stopped cleanly.');
  process.exit(0);
}

import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error);
}
