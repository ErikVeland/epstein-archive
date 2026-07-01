// ============================================================================
// PIPELINE STATUS — shared mutable runtime state and live-status helpers
// ============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { CHECKPOINT_DIR, LIVE_STATUS_FILE } from './config.js';

export type RecoveryService = 'exo' | 'postgres';

export const pipelineRuntime = {
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

// Primitive shutdown flag. Use getter/setter so cross-module reads are always
// in sync — primitive exports are not live references in ESM.
let shuttingDown = false;
export const isShuttingDown = () => shuttingDown;
export const setShuttingDown = (v: boolean) => {
  shuttingDown = v;
};

export class PipelineBlockedError extends Error {
  constructor(
    message: string,
    readonly service: RecoveryService,
  ) {
    super(message);
    this.name = 'PipelineBlockedError';
  }
}

export function writeLiveStatus(fields: Record<string, unknown>) {
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

export function recordExit(reason: string, details: Record<string, unknown> = {}) {
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

export function updateHeartbeat(fields: Record<string, unknown> = {}) {
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
    running: !shuttingDown,
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

export function markProgress(fields: Record<string, unknown> = {}) {
  pipelineRuntime.lastProgressAt = Date.now();
  updateHeartbeat({
    lastProgressAt: new Date(pipelineRuntime.lastProgressAt).toISOString(),
    ...fields,
  });
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Wire process-level signal and crash handlers so the main entry point stays
 * slim. Call this once at startup before the main loop.
 */
export function installSignalHandlers() {
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

  const handleStop = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n🛑 Stopped via ${signal}.`);
    pipelineRuntime.exitReason = `Stopped by ${signal}`;
    writeLiveStatus({
      running: false,
      phase: 'Stopped',
      exitReason: pipelineRuntime.exitReason,
      currentFile: null,
      currentDocId: null,
      currentDocStartedAt: null,
    });
  };

  process.on('SIGTERM', () => handleStop('SIGTERM'));
  process.on('SIGINT', () => handleStop('SIGINT'));
}
