#!/usr/bin/env tsx
/**
 * Unified Evidence Pipeline Orchestrator — thin CLI entry point.
 *
 * All logic lives in scripts/pipeline/. This file:
 *  - Sets AI env defaults
 *  - Wires signal handlers
 *  - Parses CLI args
 *  - Ensures DB/service health at startup
 *  - Drives the main cycle loop
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { PipelineService, type PipelineRun } from '../src/server/services/pipelineService.js';
import { CHECKPOINT_DIR, PIPELINE_VERSION } from './pipeline/config.js';
import {
  pipelineRuntime,
  isShuttingDown,
  updateHeartbeat,
  sleep,
  installSignalHandlers,
} from './pipeline/status.js';
import {
  ensureDatabaseRunning,
  ensureServiceHealthyOrRecover,
  startWatchdog,
} from './pipeline/recovery.js';
import { UNIFIED_STAGES, stagesForMode, type PipelineStats } from './pipeline/stages.js';
import {
  checkPipelineControlSignal,
  runRegisteredScriptStage,
  runIngestPhase,
  runIntelPhase,
  runEnrichPhase,
} from './pipeline/runner.js';

// Ensure AI is enabled with Exo by default
process.env.ENABLE_AI_ENRICHMENT = 'true';
if (!process.env.AI_PROVIDER) {
  process.env.AI_PROVIDER = 'exo_cluster';
}

/**
 * Run one full pipeline cycle.
 */
async function runCycle(
  mode: string,
  sourceDir: string,
  currentPipelineRun: PipelineRun | null,
): Promise<void> {
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
    if (isShuttingDown()) break;
    await checkPipelineControlSignal(currentPipelineRun);
    if (isShuttingDown()) break;

    updateHeartbeat({
      phase: stage.phase,
      activeStage: stage.name,
      activeStageDescription: stage.description,
    });

    if (stage.name === 'ai-enrichment') {
      const enrichMode =
        typedMode === 'backfill' ? 'backfill' : typedMode === 'ingest' ? 'new' : 'all';
      stats.enrichStats = await runEnrichPhase(enrichMode, currentPipelineRun);
      stats.stageStats![stage.name] = { exitCode: 0, status: 'succeeded' };
      continue;
    }

    if (stage.name === 'ingest') {
      stats.ingestStats = await runIngestPhase(sourceDir, currentPipelineRun);
      stats.stageStats![stage.name] = {
        exitCode: stats.ingestStats.errors === 0 ? 0 : 1,
        status: stats.ingestStats.errors === 0 ? 'succeeded' : 'failed',
      };
      continue;
    }

    if (stage.name === 'entity-intelligence') {
      stats.intelStats = await runIntelPhase(currentPipelineRun);
      stats.stageStats![stage.name] = { exitCode: 0, status: 'succeeded' };
      continue;
    }

    const exitCode = await runRegisteredScriptStage(stage, currentPipelineRun);
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

  installSignalHandlers();

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
  const currentPipelineRun: PipelineRun | null = await PipelineService.startRun(PIPELINE_VERSION, {
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
  while (!isShuttingDown()) {
    cycleCount++;
    console.log(`\n[Cycle ${cycleCount} — ${new Date().toLocaleTimeString()}]`);
    try {
      await runCycle(mode, sourceDir, currentPipelineRun);
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
      if (!isShuttingDown()) {
        for (let i = 0; i < 60; i++) {
          if (isShuttingDown()) break;
          await sleep(1000);
        }
      }
      continue;
    }
    if (!isShuttingDown()) {
      for (let i = 0; i < 30; i++) {
        if (isShuttingDown()) break;
        await sleep(1000);
        updateHeartbeat({ phase: 'Idle' });
      }
    }
  }
  if (pipelineRuntime.watchdog) clearInterval(pipelineRuntime.watchdog);
  pipelineRuntime.exitReason = pipelineRuntime.exitReason || 'Pipeline stopped cleanly';
  if (currentPipelineRun && !isShuttingDown()) {
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
