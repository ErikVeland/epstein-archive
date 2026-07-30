// ============================================================================
// RECOVERY — service health checks and automatic recovery logic
// ============================================================================

import { spawnSync } from 'child_process';
import { Client } from 'pg';
import {
  PIPELINE_STALL_TIMEOUT_MS,
  DOC_PROCESSING_TIMEOUT_MS,
  RECOVERY_COMMAND_TIMEOUT_MS,
  RECOVERY_HEALTH_GRACE_MS,
  RECOVERY_COOLDOWN_MS,
  WATCHDOG_INTERVAL_MS,
} from './config.js';
import {
  type RecoveryService,
  pipelineRuntime,
  isShuttingDown,
  PipelineBlockedError,
  writeLiveStatus,
  updateHeartbeat,
  recordExit,
  sleep,
} from './status.js';
import { sendMacNotification } from './notifications.js';
import { AIEnrichmentService } from '../../src/server/services/AIEnrichmentService.js';

export function defaultRecoveryCommands(service: RecoveryService): string[] {
  if (service === 'postgres') {
    return ['brew services restart postgresql@16'];
  }

  // A missing/mismatched model is not evidence that EXO itself is unhealthy.
  // Killing the desktop app can destroy a perfectly healthy, user-launched
  // instance, so EXO restarts must be an explicit operator choice.
  if (process.env.PIPELINE_ALLOW_EXO_RESTART !== 'true') return [];

  return [
    'osascript -e \'tell application "EXO" to quit\' || true',
    'pkill -f "/Applications/EXO.app" || true',
    'open -a EXO',
  ];
}

export function getRecoveryCommands(service: RecoveryService): string[] {
  const envKey =
    service === 'exo' ? 'PIPELINE_RECOVERY_COMMANDS_EXO' : 'PIPELINE_RECOVERY_COMMANDS_POSTGRES';
  const configured = String(process.env[envKey] || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : defaultRecoveryCommands(service);
}

export function runRecoveryCommands(service: RecoveryService) {
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

export async function isPostgresHealthy(): Promise<boolean> {
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

export async function isExoHealthy(): Promise<boolean> {
  try {
    const preferredModels = [
      process.env.EXO_MODEL,
      ...String(process.env.EXO_MODEL_POOL || '').split(','),
    ]
      .map((model) => model?.trim())
      .filter((model): model is string => Boolean(model));
    const callableModels = await AIEnrichmentService.discoverCallableExoModels(preferredModels);
    if (callableModels.length === 0) return false;
    writeLiveStatus({
      exoModel: callableModels[0],
      exoCallableModels: callableModels,
      exoCompletionStatus: 200,
    });
    return true;
  } catch {
    return false;
  }
}

export async function isServiceHealthy(service: RecoveryService): Promise<boolean> {
  return service === 'exo' ? isExoHealthy() : isPostgresHealthy();
}

export async function attemptRecovery(service: RecoveryService, reason: string): Promise<void> {
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

export async function ensureServiceHealthyOrRecover(
  service: RecoveryService,
  reason: string,
  fatalMessage: string,
): Promise<void> {
  if (await isServiceHealthy(service)) return;

  if (service === 'exo' && process.env.PIPELINE_ALLOW_EXO_RESTART !== 'true') {
    writeLiveStatus({
      blocked: true,
      blockedReason: fatalMessage,
      recoveryInFlight: false,
      recoveryService: service,
    });
    sendMacNotification(
      'Epstein Pipeline Needs Attention',
      fatalMessage,
      'EXO was left running; check the configured model',
    );
    throw new PipelineBlockedError(fatalMessage, service);
  }

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

/**
 * Ensure the database is reachable, starting Homebrew Postgres if necessary.
 * Blocks until Postgres accepts connections (up to ~30s) or throws.
 */
export async function ensureDatabaseRunning(): Promise<void> {
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
    await new Promise<void>((r) => setTimeout(r, 1_000));
  }

  throw new Error('Postgres service started but did not accept connections within 30s.');
}

export function startWatchdog() {
  if (pipelineRuntime.watchdog) clearInterval(pipelineRuntime.watchdog);
  pipelineRuntime.watchdog = setInterval(() => {
    if (isShuttingDown() || pipelineRuntime.recoveryInFlight) return;

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
