#!/usr/bin/env tsx
/**
 * Unified Evidence Pipeline Orchestrator — PG NATIVE VERSION
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn, spawnSync } from 'child_process';
import { Client } from 'pg';
import crypto from 'crypto';
import 'dotenv/config';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import { getIngestPool } from '../src/server/db/connection.js';
import { PipelineService, type PipelineRun } from '../src/server/services/pipelineService.js';

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
  pipelineRuntime.currentDocId = null;
  pipelineRuntime.currentFile = null;
  pipelineRuntime.currentDocStartedAt = 0;
  const payload = {
    running: false,
    exitReason: reason,
    lastError: reason,
    currentFile: null,
    currentDocId: null,
    currentDocStartedAt: null,
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
  stageStats?: Record<string, { exitCode: number; status: string }>;
}

interface UnifiedStage {
  name: string;
  description: string;
  script?: string;
  args?: string[];
  phase: string;
  version: string;
  modes: Array<'full' | 'ingest' | 'backfill'>;
  requiresAi?: boolean;
}

const PIPELINE_VERSION = process.env.UNIFIED_PIPELINE_VERSION || 'unified-reducto-2.0';

const UNIFIED_STAGES: UnifiedStage[] = [
  {
    name: 'ingest',
    description: 'Discover assets, extract content, OCR/VLM fallback, provenance, media sync',
    script: 'scripts/ingest_pipeline.ts',
    phase: 'Ingest',
    version: 'ingest-v3',
    modes: ['full', 'ingest'],
  },
  {
    name: 'entity-intelligence',
    description:
      'Resolve entities, mentions, contacts, credentials, and first-order evidence links',
    script: 'scripts/ingest_intelligence.ts',
    phase: 'Intelligence',
    version: 'entity-intel-v2',
    modes: ['full', 'ingest'],
  },
  {
    name: 'provenance-backfill',
    description: 'Rebuild durable source and chain-of-custody provenance for legacy documents',
    script: 'scripts/backfill_document_provenance.ts',
    phase: 'Provenance Backfill',
    version: 'provenance-v1',
    modes: ['backfill'],
  },
  {
    name: 'vlm-visuals',
    description: 'Reducto-style visual document parsing for image-heavy evidence',
    script: 'scripts/backfill_vlm_visuals.ts',
    phase: 'VLM Visual Analysis',
    version: 'reducto-vlm-1',
    modes: ['backfill'],
    requiresAi: true,
  },
  {
    name: 'image-ocr',
    description: 'Backfill OCR text for image documents before AI summarization',
    script: 'scripts/backfill_image_ocr.ts',
    phase: 'Image OCR Backfill',
    version: 'image-ocr-v1',
    modes: ['backfill'],
  },
  {
    name: 'image-media',
    description: 'Backfill image media rows and album bindings',
    script: 'scripts/backfill_image_media.ts',
    phase: 'Image Media Backfill',
    version: 'image-media-v1',
    modes: ['backfill'],
  },
  {
    name: 'email-headers',
    description: 'Backfill parsed email headers for communication analysis',
    script: 'scripts/backfill_email_headers_pg.ts',
    phase: 'Email Header Backfill',
    version: 'email-headers-v1',
    modes: ['backfill'],
  },
  {
    name: 'extracted-dates',
    description: 'Backfill extracted document dates for timeline and search filters',
    script: 'scripts/backfill_extracted_date.ts',
    phase: 'Extracted Date Backfill',
    version: 'dates-v1',
    modes: ['backfill'],
  },
  {
    name: 'media-extraction',
    description: 'Extract embedded media assets from document containers',
    script: 'scripts/extract_media_from_docs.ts',
    phase: 'Embedded Media Extraction',
    version: 'media-extract-v1',
    modes: ['backfill'],
  },
  {
    name: 'ai-enrichment',
    description: 'AI OCR repair, summaries, document-level semantic artifacts',
    phase: 'Enrichment',
    version: 'ai-enrich-v2',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'face-ingest',
    description: 'Ingest face clusters and link visual entities where available',
    script: 'scripts/ingest_faces.ts',
    phase: 'Face Intelligence',
    version: 'faces-v1',
    modes: ['backfill'],
  },
  {
    name: 'graph-relations',
    description: 'Extract directed entity relationships with evidence snippets',
    script: 'scripts/extract_directed_relations.ts',
    phase: 'Graph: Directed Relations',
    version: 'graph-relations-v1',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'graph-timeline',
    description: 'Extract dated timeline events from refined content',
    script: 'scripts/extract_timeline_events.ts',
    phase: 'Graph: Timeline Events',
    version: 'graph-timeline-v1',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'graph-financial',
    description: 'Extract financial transactions and counterparties',
    script: 'scripts/extract_financial_transactions.ts',
    phase: 'Graph: Financial Transactions',
    version: 'graph-financial-v1',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'graph-claim-triples',
    description: 'Extract claim triples for corroboration and contradiction analysis',
    script: 'scripts/extract_claim_triples.ts',
    phase: 'Graph: Claim Triples',
    version: 'graph-triples-v2',
    modes: ['full', 'ingest', 'backfill'],
    requiresAi: true,
  },
  {
    name: 'document-significance',
    description: 'Compute document significance scores from extracted evidence signals',
    script: 'scripts/compute_document_significance.ts',
    phase: 'Document Significance',
    version: 'significance-v1',
    modes: ['full', 'ingest', 'backfill'],
  },
  {
    name: 'entity-risk',
    description: 'Recalculate entity risk from mentions, relationships, claims, and reviews',
    script: 'scripts/recalculate_entity_risk.ts',
    phase: 'Entity Risk Recalculation',
    version: 'entity-risk-v1',
    modes: ['full', 'ingest', 'backfill'],
  },
  {
    name: 'semantic-embeddings',
    description: 'Backfill pgvector embeddings for documents and entities',
    script: 'scripts/backfill_semantic_embeddings.ts',
    phase: 'Semantic Embeddings',
    version: 'semantic-v1',
    modes: ['full', 'ingest', 'backfill'],
  },
  {
    name: 'media-thumbnails',
    description: 'Generate thumbnails and visual previews for evidence assets',
    script: 'scripts/backfill_thumbnails.ts',
    phase: 'Media Thumbnails',
    version: 'thumbs-v1',
    modes: ['backfill'],
  },
  {
    name: 'analytics-refresh',
    description: 'Refresh analytics materialized views and planner stats after backfills',
    script: 'scripts/refresh_analytics_views.ts',
    phase: 'Analytics Refresh',
    version: 'analytics-refresh-v1',
    modes: ['full', 'ingest', 'backfill'],
  },
];

let currentPipelineRun: PipelineRun | null = null;

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

function stageByName(name: string): UnifiedStage {
  const stage = UNIFIED_STAGES.find((candidate) => candidate.name === name);
  if (!stage) throw new Error(`Unknown unified stage: ${name}`);
  return stage;
}

function stagesForMode(mode: 'full' | 'ingest' | 'backfill'): UnifiedStage[] {
  const requestedStageIndex = process.argv.indexOf('--stage');
  const requestedStage =
    requestedStageIndex >= 0 ? process.argv[requestedStageIndex + 1]?.trim() : '';

  const stages = UNIFIED_STAGES.filter((stage) => stage.modes.includes(mode));
  if (!requestedStage) return stages;

  const matched = stages.filter((stage) => stage.name === requestedStage);
  if (matched.length === 0) {
    throw new Error(`Stage "${requestedStage}" is not registered for mode "${mode}"`);
  }
  return matched;
}

async function checkPipelineControlSignal(): Promise<void> {
  if (!currentPipelineRun) return;

  const state = await PipelineService.getRunStatus(currentPipelineRun.id);
  if (state.control_signal === 'stop') {
    shuttingDown = true;
    await PipelineService.updateRunStatus(
      currentPipelineRun.id,
      'cancelled',
      'Stopped by control signal',
    );
    await PipelineService.setControlSignal(currentPipelineRun.id, null);
    return;
  }

  if (state.control_signal === 'pause') {
    updateHeartbeat({ phase: 'Paused', pausedAt: new Date().toISOString() });
    await PipelineService.updateRunStatus(currentPipelineRun.id, 'paused');
    while (!shuttingDown) {
      await sleep(2000);
      const next = await PipelineService.getRunStatus(currentPipelineRun.id);
      if (next.control_signal === 'stop') {
        shuttingDown = true;
        await PipelineService.updateRunStatus(
          currentPipelineRun.id,
          'cancelled',
          'Stopped while paused',
        );
        await PipelineService.setControlSignal(currentPipelineRun.id, null);
        return;
      }
      if (next.control_signal === 'resume') {
        await PipelineService.updateRunStatus(currentPipelineRun.id, 'running');
        await PipelineService.setControlSignal(currentPipelineRun.id, null);
        updateHeartbeat({ phase: 'Resuming', resumedAt: new Date().toISOString() });
        return;
      }
    }
  }
}

async function runRegisteredScriptStage(stage: UnifiedStage): Promise<number> {
  if (!stage.script) throw new Error(`Stage ${stage.name} has no script`);
  await checkPipelineControlSignal();
  if (shuttingDown) return 0;

  if (!existsSync(stage.script)) {
    throw new Error(`Unified stage script is missing: ${stage.script}`);
  }

  const stageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
    modelId: stage.requiresAi ? process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto' : null,
    metrics: { script: stage.script, args: stage.args || [] },
  });

  updateHeartbeat({
    phase: stage.phase,
    activeStage: stage.name,
    activeStageVersion: stage.version,
    activeStageDescription: stage.description,
  });

  const startedAt = Date.now();
  const exitCode = await runScript(stage.script, stage.args || []);
  await PipelineService.finishStageRun(stageRun?.id, {
    status: exitCode === 0 ? 'succeeded' : 'failed',
    errorMessage: exitCode === 0 ? null : `${stage.script} exited with ${exitCode}`,
    metrics: { durationMs: Date.now() - startedAt, exitCode },
  });

  updateHeartbeat({
    phase: stage.phase,
    activeStage: stage.name,
    activeStageExitCode: exitCode,
  });

  return exitCode;
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

  const stage = stageByName('ingest');
  const stageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
    metrics: { sourceDir },
  });
  const startedAt = Date.now();
  const exitCode = await runScript('scripts/ingest_pipeline.ts');
  await PipelineService.finishStageRun(stageRun?.id, {
    status: exitCode === 0 ? 'succeeded' : 'failed',
    errorMessage: exitCode === 0 ? null : `ingest_pipeline exited with ${exitCode}`,
    metrics: { durationMs: Date.now() - startedAt, sourceDir },
  });

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

  const stage = stageByName('entity-intelligence');
  const stageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
  });
  const startedAt = Date.now();
  const exitCode = await runScript('scripts/ingest_intelligence.ts');
  await PipelineService.finishStageRun(stageRun?.id, {
    status: exitCode === 0 ? 'succeeded' : 'failed',
    errorMessage: exitCode === 0 ? null : `ingest_intelligence exited with ${exitCode}`,
    metrics: { durationMs: Date.now() - startedAt },
  });

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

  if ((process.env.AI_PROVIDER || 'local_ollama') === 'exo_cluster') {
    await ensureServiceHealthyOrRecover(
      'exo',
      'Exo health check failed before enrichment',
      'Exo stayed unhealthy after automatic recovery. Backfill cycle aborted.',
    );
  }

  const pool = getIngestPool();
  const stage = stageByName('ai-enrichment');
  const aggregateStageRun = await PipelineService.startStageRun({
    runId: currentPipelineRun?.id,
    stageName: stage.name,
    stageVersion: stage.version,
    modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
    metrics: { mode },
  });

  let whereClause =
    "content IS NOT NULL AND length(content) > 50 AND (metadata_json IS NULL OR NOT metadata_json ? 'ai_enrichment_failed')";
  if (mode === 'backfill') {
    // Backfill documents lacking a summary. Garbled/low-confidence rows are retried only until
    // content_refined exists; the original raw content remains unchanged, so checking it forever
    // would keep selecting already-enriched documents.
    whereClause +=
      " AND (metadata_json IS NULL OR NOT metadata_json ? 'ai_summary' OR (content_refined IS NULL AND content LIKE '%=%' AND NOT metadata_json ? 'ocr_corrected') OR (content_refined IS NULL AND coalesce((metadata_json->>'ocr_confidence')::float, 1.0) < 0.6 AND NOT metadata_json ? 'ocr_corrected'))";
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
    enrichTotal,
    currentFile: null,
    currentDocId: null,
    currentDocStartedAt: null,
    lastError: null,
    exitReason: null,
    exitCode: null,
  });

  const failedDocIds = new Set<number>();

  while (!shuttingDown) {
    // Always query at offset 0: enriched docs drop out of the WHERE clause
    // so the result set naturally shrinks each iteration.
    const docs = (
      await pool.query(
        `
      SELECT id, LEFT(content, 4000) AS content, metadata_json, file_name
      FROM documents
      WHERE ${whereClause} ${failedDocIds.size > 0 ? `AND id NOT IN (${Array.from(failedDocIds).join(',')})` : ''}
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
      let documentStageRun: { id: number } | null = null;
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

        let refinedText = AIEnrichmentService.decodeHtmlAndUnicode(doc.content || '');
        const inputHash = crypto
          .createHash('sha256')
          .update(refinedText)
          .digest('hex')
          .slice(0, 40);
        documentStageRun = await PipelineService.startStageRun({
          runId: currentPipelineRun?.id,
          documentId: Number(doc.id),
          stageName: stage.name,
          stageVersion: stage.version,
          inputHash,
          modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
          metrics: { mode, fileName: doc.file_name },
        });

        // LLM OCR Re-Correction Pipeline Phase:
        // Reconstruct highly garbled text (ocr_confidence < 0.6 or containing equals signs) into readable sentences using Ollama or Exo.
        const ocrConf = meta.ocr_confidence;
        const isLowLegibility =
          (typeof ocrConf === 'number' && ocrConf < 0.6) || (doc.content || '').includes('=');
        if (isLowLegibility && process.env.ENABLE_AI_ENRICHMENT === 'true') {
          const cleanedText = await AIEnrichmentService.cleanOCRText(refinedText, subject);
          if (cleanedText && cleanedText.length > 50) {
            refinedText = cleanedText;
          }
          meta.ocr_corrected = true;
        }

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

        const outputHash = crypto
          .createHash('sha256')
          .update(refinedText + summary)
          .digest('hex');
        await PipelineService.upsertAiArtifact({
          runId: currentPipelineRun?.id,
          stageRunId: documentStageRun?.id,
          documentId: Number(doc.id),
          artifactType: 'summary',
          artifactVersion: 'summary-v2',
          modelId: process.env.EXO_MODEL || process.env.AI_PROVIDER || 'auto',
          promptVersion: 'forensic-summary-v1',
          sourceExcerpt: refinedText.slice(0, 2000),
          outputText: summary,
          confidence: summary.startsWith('Document "') ? 0.35 : 0.75,
          provenance: {
            provider: process.env.AI_PROVIDER,
            mode,
            inputHash,
            outputHash,
            contentRefined: true,
          },
        });
        await PipelineService.finishStageRun(documentStageRun?.id, {
          status: 'succeeded',
          outputHash,
          metrics: { summaryChars: summary.length, refinedChars: refinedText.length },
        });
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
        failedDocIds.add(Number(doc.id));
        await PipelineService.finishStageRun(documentStageRun?.id, {
          status: 'failed',
          errorMessage: String((error as Error)?.message || error),
        });

        try {
          const meta =
            typeof doc.metadata_json === 'object' && doc.metadata_json !== null
              ? (doc.metadata_json as Record<string, unknown>)
              : {};
          meta.ai_enrichment_failed = true;
          meta.ai_enrichment_error = String((error as Error)?.message || error);
          meta.ai_enriched_at = new Date().toISOString();
          await pool.query('UPDATE documents SET metadata_json = $1 WHERE id = $2', [
            JSON.stringify(meta),
            doc.id,
          ]);
        } catch {
          // non-fatal
        }

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
  await PipelineService.finishStageRun(aggregateStageRun?.id, {
    status: 'succeeded',
    metrics: { documentsEnriched, summariesGenerated, mode },
  });
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
    stageStats: {},
  };

  updateHeartbeat({
    running: true,
    phase: 'Ingest',
    crashed: false,
    lastError: null,
    exitReason: null,
    exitCode: null,
    currentFile: null,
    currentDocId: null,
    currentDocStartedAt: null,
  });
  const typedMode = mode as 'full' | 'ingest' | 'backfill';
  for (const stage of stagesForMode(typedMode)) {
    if (shuttingDown) break;
    await checkPipelineControlSignal();
    if (shuttingDown) break;

    updateHeartbeat({
      phase: stage.phase,
      activeStage: stage.name,
      activeStageDescription: stage.description,
    });

    if (stage.name === 'ai-enrichment') {
      const enrichMode =
        typedMode === 'backfill' ? 'backfill' : typedMode === 'ingest' ? 'new' : 'all';
      stats.enrichStats = await runEnrichPhase(enrichMode);
      stats.stageStats![stage.name] = { exitCode: 0, status: 'succeeded' };
      continue;
    }

    if (stage.name === 'ingest') {
      stats.ingestStats = await runIngestPhase(sourceDir);
      stats.stageStats![stage.name] = {
        exitCode: stats.ingestStats.errors === 0 ? 0 : 1,
        status: stats.ingestStats.errors === 0 ? 'succeeded' : 'failed',
      };
      continue;
    }

    if (stage.name === 'entity-intelligence') {
      stats.intelStats = await runIntelPhase();
      stats.stageStats![stage.name] = { exitCode: 0, status: 'succeeded' };
      continue;
    }

    const exitCode = await runRegisteredScriptStage(stage);
    stats.stageStats![stage.name] = {
      exitCode,
      status: exitCode === 0 ? 'succeeded' : 'failed',
    };
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
  const args = process.argv.slice(2);
  if (args.includes('--list-stages')) {
    process.stdout.write(JSON.stringify(UNIFIED_STAGES, null, 2) + '\n');
    return;
  }

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
    writeLiveStatus({
      running: false,
      phase: 'Stopped',
      exitReason: pipelineRuntime.exitReason,
      currentFile: null,
      currentDocId: null,
      currentDocStartedAt: null,
    });
  });
  process.on('SIGINT', () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n🛑 Stopped.');
    pipelineRuntime.exitReason = 'Stopped by SIGINT';
    writeLiveStatus({
      running: false,
      phase: 'Stopped',
      exitReason: pipelineRuntime.exitReason,
      currentFile: null,
      currentDocId: null,
      currentDocStartedAt: null,
    });
  });

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
  currentPipelineRun = await PipelineService.startRun(PIPELINE_VERSION, {
    mode,
    sourceDir,
    stages: stagesForMode(mode).map((stage) => ({
      name: stage.name,
      version: stage.version,
      script: stage.script || null,
    })),
  });
  for (const stage of UNIFIED_STAGES) {
    await PipelineService.registerStep(stage.name, stage.description);
  }
  updateHeartbeat({
    currentRunId: currentPipelineRun.id,
    currentRunUuid: currentPipelineRun.run_uuid,
    pipelineVersion: PIPELINE_VERSION,
    unifiedStages: stagesForMode(mode).map((stage) => stage.name),
  });
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
      pipelineRuntime.currentDocId = null;
      pipelineRuntime.currentFile = null;
      pipelineRuntime.currentDocStartedAt = 0;
      updateHeartbeat({
        phase: 'Error',
        lastError: msg,
        blockedReason: msg,
        currentFile: null,
        currentDocId: null,
        currentDocStartedAt: null,
      });
      if (currentPipelineRun) {
        await PipelineService.updateRunStatus(currentPipelineRun.id, 'running', msg);
      }
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
  if (currentPipelineRun && !shuttingDown) {
    await PipelineService.updateRunStatus(currentPipelineRun.id, 'succeeded');
  }
  updateHeartbeat({
    running: false,
    phase: 'Stopped',
    exitReason: pipelineRuntime.exitReason,
    currentFile: null,
    currentDocId: null,
    currentDocStartedAt: null,
  });
  console.log('✅ Pipeline stopped cleanly.');
  process.exit(0);
}

import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error);
}
