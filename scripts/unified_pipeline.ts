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
  PipelineBlockedError,
  updateHeartbeat,
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
): Promise<PipelineStats> {
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

    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.stageStats![stage.name] = { exitCode: 1, status: 'failed' };
      await PipelineService.failActiveStageRuns(currentPipelineRun?.id, stage.name, message);
      console.error(`Stage ${stage.name} failed. Continuing the finite corpus pass: ${message}`);
      updateHeartbeat({ lastError: message, activeStageExitCode: 1 });
    }
  }

  updateHeartbeat({ phase: 'Idle' });

  console.log('\n' + '='.repeat(70));
  console.log('Pipeline pass finished. No automatic cycle restart.');
  console.log('='.repeat(70));

  if (!existsSync(CHECKPOINT_DIR)) {
    mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }
  writeFileSync(join(CHECKPOINT_DIR, `run_${Date.now()}.json`), JSON.stringify(stats, null, 2));
  return stats;
}

/**
 * Run one finite pass. Failed work requires an explicit maintenance action.
 */
export async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--list-stages')) {
    process.stdout.write(JSON.stringify(UNIFIED_STAGES, null, 2) + '\n');
    return;
  }

  if (existsSync(join(CHECKPOINT_DIR, 'STOPPED')) && !args.includes('--maintenance-pass')) {
    console.log(
      'Corpus pipeline is intentionally stopped. Explicit maintenance is required to resume.',
    );
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
  console.log('   Mode: ' + mode + '  (one finite pass)');

  updateHeartbeat({ running: true, crashed: false, phase: 'Starting' });

  if (args.includes('--maintenance-pass')) process.env.PIPELINE_RECOVERY_DISABLED = 'true';
  else await ensureDatabaseRunning();
  await ensureServiceHealthyOrRecover(
    'postgres',
    'Postgres health check failed during pipeline startup',
    'Postgres stayed unhealthy after automatic recovery. Pipeline cannot continue.',
  );
  const currentPipelineRun: PipelineRun | null = await PipelineService.startRun(PIPELINE_VERSION, {
    mode,
    sourceDir,
    maintenancePass: args.includes('--maintenance-pass'),
    corpusPass: args.includes('--corpus-pass'),
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
  process.env.PIPELINE_RUN_ID = String(currentPipelineRun.id);
  process.env.PIPELINE_ROOT_PID = String(process.pid);
  if (!args.includes('--maintenance-pass')) startWatchdog();

  let exitCode = 0;
  let outcome: 'succeeded' | 'failed' | 'cancelled' = 'succeeded';
  try {
    const stats = await runCycle(mode, sourceDir, currentPipelineRun);
    const failedStages = Object.entries(stats.stageStats || {})
      .filter(([, result]) => result.status === 'failed')
      .map(([name]) => name);
    if (isShuttingDown()) {
      outcome = 'cancelled';
    } else if (failedStages.length > 0) {
      outcome = 'failed';
      exitCode = 1;
      pipelineRuntime.exitReason = `Failed stages require review: ${failedStages.join(', ')}`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outcome = isShuttingDown() ? 'cancelled' : 'failed';
    exitCode = outcome === 'failed' ? 1 : 0;
    pipelineRuntime.exitReason = message;
    console.error('Pipeline pass stopped. No automatic retry:', error);
    updateHeartbeat({
      lastError: message,
      blocked: error instanceof PipelineBlockedError,
      blockedReason: message,
    });
  } finally {
    if (pipelineRuntime.watchdog) clearInterval(pipelineRuntime.watchdog);
  }
  pipelineRuntime.exitReason ||=
    outcome === 'succeeded'
      ? 'Pipeline pass finished. Corpus completion requires workload verification.'
      : 'Pipeline stopped by request';
  await PipelineService.updateRunStatus(
    currentPipelineRun.id,
    outcome,
    outcome === 'succeeded' ? undefined : pipelineRuntime.exitReason,
  );
  updateHeartbeat({
    running: false,
    phase: outcome === 'failed' ? 'Failed' : 'Stopped',
    exitReason: pipelineRuntime.exitReason,
    currentFile: null,
    currentDocId: null,
    currentDocStartedAt: null,
  });
  console.log(`Pipeline stopped with run status: ${outcome}`);
  process.exit(exitCode);
}

import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
