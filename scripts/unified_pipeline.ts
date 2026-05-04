#!/usr/bin/env tsx
/**
 * Unified Evidence Pipeline Orchestrator — PG NATIVE VERSION
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn, spawnSync } from 'child_process';
import { Client } from 'pg';
import 'dotenv/config';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import { getIngestPool } from '../src/server/db/connection.js';

/**
 * Ensure the database is reachable, starting the Docker container if necessary.
 * Blocks until Postgres accepts connections (up to ~90s) or throws.
 */
async function ensureDatabaseRunning(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || '';

  const canConnect = async (): Promise<boolean> => {
    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return true;
    } catch {
      return false;
    } finally {
      await client.end().catch(() => {});
    }
  };

  if (await canConnect()) return;

  console.log('\n⚠️  Database unreachable — attempting to start Homebrew Postgres...');

  // Try Homebrew postgresql@16 first (native, no Docker overhead)
  const brewResult = spawnSync('brew', ['services', 'start', 'postgresql@16'], {
    stdio: 'inherit',
  });

  if (brewResult.status !== 0) {
    throw new Error(
      'brew services start postgresql@16 failed. Run it manually or check Homebrew is installed.',
    );
  }

  console.log('   Waiting for Postgres to accept connections...');
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await canConnect()) {
      console.log('   ✅ Database is up.\n');
      return;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }

  throw new Error('Postgres service started but did not accept connections within 30s.');
}

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '20', 10);
const CHECKPOINT_DIR = './pipeline_checkpoints';
const LIVE_STATUS_FILE = './pipeline_checkpoints/live_status.json';
const EXO_HEALTHCHECK_TIMEOUT_MS = Math.max(
  1000,
  parseInt(process.env.PIPELINE_EXO_HEALTH_TIMEOUT_MS || '8000', 10) || 8000,
);
const DOC_PROCESSING_TIMEOUT_MS = Math.max(
  30_000,
  parseInt(process.env.PIPELINE_DOC_TIMEOUT_MS || '180000', 10) || 180000,
);
const PIPELINE_STALL_TIMEOUT_MS = Math.max(
  30_000,
  parseInt(process.env.PIPELINE_STALL_TIMEOUT_MS || '240000', 10) || 240000,
);
const WATCHDOG_INTERVAL_MS = Math.max(
  5000,
  parseInt(process.env.PIPELINE_WATCHDOG_INTERVAL_MS || '15000', 10) || 15000,
);
const RECOVERY_COMMAND_TIMEOUT_MS = Math.max(
  5000,
  parseInt(process.env.PIPELINE_RECOVERY_COMMAND_TIMEOUT_MS || '45000', 10) || 45000,
);
const RECOVERY_HEALTH_GRACE_MS = Math.max(
  2000,
  parseInt(process.env.PIPELINE_RECOVERY_HEALTH_GRACE_MS || '12000', 10) || 12000,
);
const RECOVERY_COOLDOWN_MS = Math.max(
  5000,
  parseInt(process.env.PIPELINE_RECOVERY_COOLDOWN_MS || '120000', 10) || 120000,
);

type RecoveryService = 'exo' | 'postgres';

const pipelineRuntime = {
  phase: 'Starting',
  lastHeartbeatAt: Date.now(),
  lastProgressAt: Date.now(),
  currentDocId: null as number | null,
  currentFile: null as string | null,
  currentDocStartedAt: 0,
  stallReason: null as string | null,
  recoveryInFlight: false,
  lastRecoveryAt: 0,
  watchdog: null as NodeJS.Timeout | null,
  exitReason: null as string | null,
};

class PipelineBlockedError extends Error {
  constructor(
    message: string,
    readonly service: RecoveryService,
  ) {
    super(message);
    this.name = 'PipelineBlockedError';
  }
}

function writeLiveStatus(fields: Record<string, unknown>) {
  try {
    if (!existsSync(CHECKPOINT_DIR)) mkdirSync(CHECKPOINT_DIR, { recursive: true });
    let current: Record<string, unknown> = {};
    try {
      current = JSON.parse(readFileSync(LIVE_STATUS_FILE, 'utf8'));
    } catch (_e) {
      // Non-fatal if file missing or corrupt
    }
    try {
      writeFileSync(
        LIVE_STATUS_FILE,
        JSON.stringify({ ...current, pid: process.pid, ...fields }, null, 2),
      );
    } catch (_e) {
      // Non-fatal log failure
    }
  } catch (e) {
    console.error('Failed to write live status', e);
  }
}

function recordExit(reason: string, details: Record<string, unknown> = {}) {
  pipelineRuntime.exitReason = reason;
  const payload = {
    running: false,
    exitReason: reason,
    lastError: reason,
    ...details,
  };
  console.error(`\n🛑 Pipeline exiting: ${reason}`);
  writeLiveStatus(payload);
}

function updateHeartbeat(fields: Record<string, unknown> = {}) {
  pipelineRuntime.lastHeartbeatAt = Date.now();

  const maybePhase = typeof fields.phase === 'string' ? fields.phase : null;
  if (maybePhase) pipelineRuntime.phase = maybePhase;

  const maybeCurrentFile = Object.prototype.hasOwnProperty.call(fields, 'currentFile')
    ? fields.currentFile
    : undefined;
  if (typeof maybeCurrentFile === 'string' || maybeCurrentFile === null) {
    pipelineRuntime.currentFile = maybeCurrentFile as string | null;
  }

  writeLiveStatus({
    heartbeatAt: new Date(pipelineRuntime.lastHeartbeatAt).toISOString(),
    blocked: false,
    blockedReason: null,
    recoveryInFlight: pipelineRuntime.recoveryInFlight,
    recoveryLastAttemptAt: pipelineRuntime.lastRecoveryAt
      ? new Date(pipelineRuntime.lastRecoveryAt).toISOString()
      : null,
    ...fields,
  });
}

function markProgress(fields: Record<string, unknown> = {}) {
  pipelineRuntime.lastProgressAt = Date.now();
  updateHeartbeat({
    lastProgressAt: new Date(pipelineRuntime.lastProgressAt).toISOString(),
    ...fields,
  });
}

function escapeAppleScript(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function sendMacNotification(title: string, message: string, subtitle?: string) {
  const parts = [
    `display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}"`,
  ];
  if (subtitle) {
    parts[0] += ` subtitle "${escapeAppleScript(subtitle)}"`;
  }
  spawnSync('/usr/bin/osascript', ['-e', parts[0]], { stdio: 'ignore' });
}

function defaultRecoveryCommands(service: RecoveryService): string[] {
  if (service === 'postgres') {
    return ['brew services restart postgresql@16'];
  }

  return [
    'osascript -e \'tell application "EXO" to quit\' || true',
    'pkill -f "/Applications/EXO.app" || true',
    'open -a EXO',
  ];
}

function getRecoveryCommands(service: RecoveryService): string[] {
  const envKey =
    service === 'exo' ? 'PIPELINE_RECOVERY_COMMANDS_EXO' : 'PIPELINE_RECOVERY_COMMANDS_POSTGRES';
  const configured = String(process.env[envKey] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : defaultRecoveryCommands(service);
}

function runRecoveryCommands(service: RecoveryService) {
  for (const command of getRecoveryCommands(service)) {
    console.log(`   🩺 recovery(${service}): ${command}`);
    const res = spawnSync('/bin/bash', ['-lc', command], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      timeout: RECOVERY_COMMAND_TIMEOUT_MS,
    });
    if ((res.status ?? 1) === 0) return;
  }
}

async function isPostgresHealthy(): Promise<boolean> {
  const client = new Client({ connectionString: process.env.DATABASE_URL || '' });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function isExoHealthy(): Promise<boolean> {
  const exoHost = process.env.EXO_HOST || 'http://127.0.0.1:52415';
  try {
    const res = await fetch(`${exoHost}/v1/models`, {
      signal: AbortSignal.timeout(EXO_HEALTHCHECK_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function isServiceHealthy(service: RecoveryService): Promise<boolean> {
  return service === 'exo' ? isExoHealthy() : isPostgresHealthy();
}

async function attemptRecovery(service: RecoveryService, reason: string): Promise<void> {
  const now = Date.now();
  if (pipelineRuntime.recoveryInFlight) return;
  if (now - pipelineRuntime.lastRecoveryAt < RECOVERY_COOLDOWN_MS) return;

  pipelineRuntime.recoveryInFlight = true;
  pipelineRuntime.lastRecoveryAt = now;
  pipelineRuntime.stallReason = reason;
  writeLiveStatus({
    blocked: true,
    blockedReason: reason,
    recoveryInFlight: true,
    recoveryService: service,
    recoveryLastAttemptAt: new Date(now).toISOString(),
  });

  console.error(`\n🚨 Pipeline blocked: ${reason}`);
  sendMacNotification('Epstein Pipeline Blocked', reason, `Recovering ${service}`);

  try {
    runRecoveryCommands(service);
    await sleep(RECOVERY_HEALTH_GRACE_MS);
  } finally {
    pipelineRuntime.recoveryInFlight = false;
    updateHeartbeat({
      recoveryInFlight: false,
      recoveryService: service,
      blockedReason: reason,
    });
  }
}

async function ensureServiceHealthyOrRecover(
  service: RecoveryService,
  reason: string,
  fatalMessage: string,
) {
  if (await isServiceHealthy(service)) return;

  await attemptRecovery(service, reason);
  if (await isServiceHealthy(service)) return;

  writeLiveStatus({
    blocked: true,
    blockedReason: fatalMessage,
    recoveryInFlight: false,
    recoveryService: service,
  });
  sendMacNotification(
    'Epstein Pipeline Needs Attention',
    fatalMessage,
    `Recovery failed: ${service}`,
  );
  throw new PipelineBlockedError(fatalMessage, service);
}

async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Promise<void>,
  timeoutMessage: string,
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(async () => {
          try {
            await onTimeout();
          } finally {
            reject(new Error(timeoutMessage));
          }
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function startWatchdog() {
  if (pipelineRuntime.watchdog) clearInterval(pipelineRuntime.watchdog);
  pipelineRuntime.watchdog = setInterval(() => {
    if (shuttingDown || pipelineRuntime.recoveryInFlight) return;

    const now = Date.now();
    const heartbeatAge = now - pipelineRuntime.lastHeartbeatAt;
    const docAge =
      pipelineRuntime.currentDocStartedAt > 0 ? now - pipelineRuntime.currentDocStartedAt : 0;

    if (heartbeatAge > PIPELINE_STALL_TIMEOUT_MS || docAge > DOC_PROCESSING_TIMEOUT_MS) {
      const file = pipelineRuntime.currentFile || 'unknown document';
      const reason =
        heartbeatAge > PIPELINE_STALL_TIMEOUT_MS
          ? `No pipeline heartbeat for ${Math.round(heartbeatAge / 1000)}s during ${pipelineRuntime.phase}`
          : `Document processing stalled for ${Math.round(docAge / 1000)}s on ${file}`;
      void attemptRecovery('exo', reason).then(() => {
        recordExit(`Watchdog forced process restart after EXO recovery attempt: ${reason}`, {
          phase: 'Restarting',
          blocked: true,
          blockedReason: reason,
          recoveryService: 'exo',
        });
        process.exitCode = 1;
        setTimeout(() => process.exit(1), 250);
      });
    }
  }, WATCHDOG_INTERVAL_MS);
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
  graphStats?: { subPhasesRun: number };
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

    child.on('close', (code: number | null) => {
      resolve(code || 0);
    });

    child.on('error', (err: Error) => {
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
 * Phase 4: GRAPH EXTRACTION — relations, timeline events, financial transactions, claim triples
 */
async function runGraphPhase(): Promise<{ subPhasesRun: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🕸️  PHASE 4: GRAPH EXTRACTION (Relations, Timeline, Financial, Triples)');
  console.log('='.repeat(70));

  const subPhases = [
    { script: 'scripts/extract_directed_relations.ts', label: '4a: Directed Relations' },
    { script: 'scripts/extract_timeline_events.ts', label: '4b: Timeline Events' },
    { script: 'scripts/extract_financial_transactions.ts', label: '4c: Financial Transactions' },
    { script: 'scripts/extract_claim_triples.ts', label: '4d: Claim Triples' },
  ];

  let ran = 0;
  for (const { script, label } of subPhases) {
    if (shuttingDown) break;
    console.log(`\n   ▶ ${label}`);
    updateHeartbeat({ phase: `Graph: ${label}` });
    const code = await runScript(script);
    if (code !== 0) {
      console.warn(`   ⚠️  ${label} exited with code ${code} — continuing`);
    }
    ran++;
  }

  return { subPhasesRun: ran };
}

/**
 * Phase 2.5: PROVENANCE BACKFILL - rebuild durable provenance for legacy rows
 */
async function runProvenanceBackfillPhase(): Promise<{ documentsTouched: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🧾 PHASE 2.5: PROVENANCE BACKFILL');
  console.log('='.repeat(70));

  const exitCode = await runScript('scripts/backfill_document_provenance.ts');

  return {
    documentsTouched: exitCode === 0 ? 1 : 0,
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

  if ((process.env.AI_PROVIDER || 'local_ollama') === 'exo_cluster') {
    await ensureServiceHealthyOrRecover(
      'exo',
      'Exo health check failed before enrichment',
      'Exo stayed unhealthy after automatic recovery. Backfill cycle aborted.',
    );
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
  markProgress({
    phase: 'Enrichment',
    enrichStartedAt: new Date().toISOString(),
    enrichProcessed: 0,
    currentFile: null,
    currentDocId: null,
  });

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
    ).rows as {
      id: number;
      content: string | null;
      metadata_json: Record<string, unknown> | null;
      file_name: string | null;
    }[];

    if (docs.length === 0) break;

    // Write progress to live_status.json once per batch so the widget stays current
    updateHeartbeat({
      phase: 'Enrichment',
      enrichProcessed: documentsEnriched,
      enrichTotal,
      currentFile: docs[0]?.file_name ?? null,
      currentDocId: docs[0]?.id ?? null,
    });

    // Process sequentially: EXO is local so parallel requests queue up on its side
    // anyway, while concurrent fetches multiply Node.js heap usage for no throughput gain.
    for (const doc of docs) {
      if (shuttingDown) break;
      try {
        pipelineRuntime.currentDocId = Number(doc.id);
        pipelineRuntime.currentFile = doc.file_name || null;
        pipelineRuntime.currentDocStartedAt = Date.now();
        updateHeartbeat({
          phase: 'Enrichment',
          currentDocId: doc.id,
          currentFile: doc.file_name,
          currentDocStartedAt: new Date(pipelineRuntime.currentDocStartedAt).toISOString(),
        });

        // node-postgres auto-parses jsonb into objects; handle both cases
        let meta: Record<string, unknown> = {};
        if (doc.metadata_json) {
          if (typeof doc.metadata_json === 'object' && doc.metadata_json !== null) {
            meta = doc.metadata_json as Record<string, unknown>;
          } else if (typeof doc.metadata_json === 'string') {
            try {
              meta = JSON.parse(doc.metadata_json);
            } catch {
              meta = {};
            }
          }
        }
        // Release metadata_json from the row object immediately after parsing
        doc.metadata_json = null;

        const subject =
          (meta.subject as string) || (meta.title as string) || doc.file_name || 'Unknown Document';

        // Skip expensive MIME repair during backfill — it generates hundreds
        // of LLM calls per large doc and overwhelms the inference backend.
        // Use deterministic decode only; summarizer truncates to 2000 chars anyway.
        const refinedText = AIEnrichmentService.decodeHtmlAndUnicode(doc.content || '');
        // Release raw content from row object — refinedText is the only copy we need
        doc.content = null;

        let summary = await withTimeout(
          AIEnrichmentService.summarizeDocument(refinedText, {
            fileName: doc.file_name || undefined,
            subject,
          }),
          DOC_PROCESSING_TIMEOUT_MS,
          async () => {
            await attemptRecovery(
              'exo',
              `AI enrichment timed out after ${Math.round(DOC_PROCESSING_TIMEOUT_MS / 1000)}s on ${doc.file_name || 'unknown'}`,
            );
          },
          `AI enrichment timed out for document ${doc.id} (${doc.file_name})`,
        );

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
        markProgress({
          phase: 'Enrichment',
          enrichProcessed: documentsEnriched,
          enrichTotal,
          currentFile: doc.file_name,
          currentDocId: doc.id,
        });
      } catch (error) {
        console.error(`   ❌ Failed to enrich document ${doc.id}:`, error);
        if (
          error instanceof PipelineBlockedError ||
          String((error as Error)?.message || '').includes('timed out')
        ) {
          throw error;
        }
      } finally {
        pipelineRuntime.currentDocId = null;
        pipelineRuntime.currentFile = null;
        pipelineRuntime.currentDocStartedAt = 0;
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
  pipelineRuntime.currentDocId = null;
  pipelineRuntime.currentFile = null;
  pipelineRuntime.currentDocStartedAt = 0;
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

  updateHeartbeat({ running: true, phase: 'Ingest', crashed: false });
  if (mode === 'ingest' || mode === 'full') {
    stats.ingestStats = await runIngestPhase(sourceDir);
    updateHeartbeat({ phase: 'Intelligence' });
    stats.intelStats = await runIntelPhase();
  }
  if (mode === 'backfill') {
    updateHeartbeat({ phase: 'Provenance Backfill' });
    await runProvenanceBackfillPhase();
    updateHeartbeat({ phase: 'Enrichment' });
    stats.enrichStats = await runEnrichPhase('backfill');
  } else if (mode === 'ingest') {
    updateHeartbeat({ phase: 'Enrichment' });
    stats.enrichStats = await runEnrichPhase('new');
  } else if (mode === 'full') {
    updateHeartbeat({ phase: 'Enrichment' });
    stats.enrichStats = await runEnrichPhase('all');
  }

  // Phase 4: Graph extraction runs after enrichment in all non-intel modes
  if (mode !== 'intel' && !shuttingDown) {
    await runGraphPhase();
  }

  updateHeartbeat({ phase: 'Idle' });

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
    recordExit(`Uncaught exception: ${err.message}`, { crashed: true, phase: 'Crashed' });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('\n💀 UNHANDLED REJECTION:', reason);
    recordExit(`Unhandled rejection: ${String(reason)}`, { crashed: true, phase: 'Crashed' });
    process.exit(1);
  });
  process.on('exit', (code) => {
    const reason =
      pipelineRuntime.exitReason ||
      `Process exited with code ${code}${shuttingDown ? ' after shutdown request' : ''}`;
    console.log(`\nℹ️ Final exit status: ${reason}`);
    writeLiveStatus({
      running: false,
      exitReason: reason,
      exitCode: code,
      phase: shuttingDown ? 'Stopped' : 'Exited',
    });
  });

  process.on('SIGTERM', () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n🛑 Stopped via SIGTERM.');
    pipelineRuntime.exitReason = 'Stopped by SIGTERM';
    writeLiveStatus({ running: false, phase: 'Stopped', exitReason: pipelineRuntime.exitReason });
  });
  process.on('SIGINT', () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n🛑 Stopped.');
    pipelineRuntime.exitReason = 'Stopped by SIGINT';
    writeLiveStatus({ running: false, phase: 'Stopped', exitReason: pipelineRuntime.exitReason });
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

  updateHeartbeat({ running: true, crashed: false, phase: 'Starting' });

  await ensureDatabaseRunning();
  await ensureServiceHealthyOrRecover(
    'postgres',
    'Postgres health check failed during pipeline startup',
    'Postgres stayed unhealthy after automatic recovery. Pipeline cannot continue.',
  );
  startWatchdog();

  let cycleCount = 0;
  while (!shuttingDown) {
    cycleCount++;
    console.log(`\n[Cycle ${cycleCount} — ${new Date().toLocaleTimeString()}]`);
    try {
      await runCycle(mode, sourceDir);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('\n❌ Cycle error (will retry in 60s):', error);
      updateHeartbeat({ phase: 'Error', lastError: msg, blockedReason: msg });
      if (!shuttingDown) {
        for (let i = 0; i < 60; i++) {
          if (shuttingDown) break;
          await sleep(1000);
        }
      }
      continue;
    }
    if (!shuttingDown) {
      for (let i = 0; i < 30; i++) {
        if (shuttingDown) break;
        await sleep(1000);
        updateHeartbeat({ phase: 'Idle' });
      }
    }
  }
  if (pipelineRuntime.watchdog) clearInterval(pipelineRuntime.watchdog);
  pipelineRuntime.exitReason = pipelineRuntime.exitReason || 'Pipeline stopped cleanly';
  updateHeartbeat({ running: false, phase: 'Stopped', exitReason: pipelineRuntime.exitReason });
  console.log('✅ Pipeline stopped cleanly.');
  process.exit(0);
}

import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error);
}
