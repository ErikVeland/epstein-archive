import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from './Logger.js';

const execFileAsync = promisify(execFile);
const DEFAULT_IDLE_THRESHOLD_MS = 120_000;
const DEFAULT_ACTIVE_DELAY_MS = 30_000;
const DEFAULT_SAMPLE_CACHE_MS = 5_000;

let cachedIdleMs: number | null = null;
let cachedAt = 0;
let lastThrottleLogAt = 0;

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function parseHidIdleTimeMs(output: string): number | null {
  const match = output.match(/"HIDIdleTime"\s*=\s*(\d+)/);
  if (!match) return null;
  const nanoseconds = Number(match[1]);
  return Number.isFinite(nanoseconds) ? nanoseconds / 1_000_000 : null;
}

async function readMacIdleTimeMs(): Promise<number | null> {
  if (process.platform !== 'darwin') return null;
  const cacheMs = envNumber('EXO_ACTIVITY_SAMPLE_CACHE_MS', DEFAULT_SAMPLE_CACHE_MS);
  const now = Date.now();
  if (now - cachedAt < cacheMs) return cachedIdleMs;

  try {
    const { stdout } = await execFileAsync(
      '/usr/sbin/ioreg',
      ['-r', '-c', 'IOHIDSystem', '-d', '1'],
      {
        timeout: 2_000,
        maxBuffer: 256 * 1024,
      },
    );
    cachedIdleMs = parseHidIdleTimeMs(stdout);
  } catch (error) {
    cachedIdleMs = null;
    logger.debug({ err: error }, '[ExoGovernor] Could not read macOS user idle time');
  }
  cachedAt = now;
  return cachedIdleMs;
}

/**
 * Yield pipeline-owned Exo capacity while a person is actively using this Mac.
 * This is enabled only for processes that explicitly set the environment flag,
 * so interactive API requests are never delayed by default.
 */
export async function throttleExoForUserActivity(): Promise<void> {
  if (process.env.EXO_THROTTLE_ON_USER_ACTIVITY !== 'true') return;

  const idleMs = await readMacIdleTimeMs();
  const idleThresholdMs = envNumber('EXO_USER_IDLE_THRESHOLD_MS', DEFAULT_IDLE_THRESHOLD_MS);
  if (idleMs === null || idleMs >= idleThresholdMs) return;

  const delayMs = envNumber('EXO_ACTIVE_REQUEST_DELAY_MS', DEFAULT_ACTIVE_DELAY_MS);
  if (delayMs === 0) return;

  const now = Date.now();
  if (now - lastThrottleLogAt >= 60_000) {
    logger.info(
      { idleMs: Math.round(idleMs), delayMs, idleThresholdMs },
      '[ExoGovernor] Recent keyboard or pointer activity; yielding Exo capacity',
    );
    lastThrottleLogAt = now;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}
