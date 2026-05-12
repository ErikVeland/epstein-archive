import { getApiPool, getMaintenancePool } from '../db/connection.js';
import { logger } from './Logger.js';

// ─── Dirty-flag based materialised view refresh ───────────────────────────────

const VIEWS = [
  'mv_docs_by_type',
  'mv_entity_type_dist',
  'mv_top_connected',
  'mv_timeline_data',
  'mv_redaction_stats',
] as const;

const MIN_REFRESH_INTERVAL_MS = 60 * 1000; // 60s minimum between refreshes

let isDirty = false;
let lastRefreshedAt = 0;
let isRefreshing = false;

/** Call from ingest/write routes to trigger a refresh on the next cycle. */
export function markViewsDirty(): void {
  isDirty = true;
}

/**
 * Refresh all materialised views if dirty and interval has passed.
 * Uses the dedicated maintenancePool — never touches the API pool.
 * Skips if API pool has waiting connections (system is under pressure).
 */
export async function refreshIfDue(): Promise<void> {
  if (
    process.env.DISABLE_MATVIEW_REFRESH === '1' ||
    process.env.DISABLE_MATVIEW_REFRESH === 'true'
  ) {
    return;
  }

  const now = Date.now();

  if (!isDirty) return;
  if (isRefreshing) return;
  if (now - lastRefreshedAt < MIN_REFRESH_INTERVAL_MS) return;

  // Back off if the API pool is under pressure — don't compound load
  try {
    const apiPool = getApiPool();
    if (apiPool.waitingCount > 0) {
      logger.warn(
        { waitingCount: apiPool.waitingCount },
        '[MatViewRefresh] Deferred — API pool has waiting connections',
      );
      return;
    }
  } catch {
    /* pool not initialised yet */
  }

  isRefreshing = true;
  const pool = getMaintenancePool();

  for (const view of VIEWS) {
    const start = Date.now();
    let status = 'ok';

    try {
      await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
    } catch (_concErr: unknown) {
      // CONCURRENTLY requires a unique index — fall back to blocking refresh
      status = 'ok-nonconc';
      try {
        await pool.query(`REFRESH MATERIALIZED VIEW ${view}`);
      } catch (fallbackErr: unknown) {
        status = 'error';
        logger.error({ err: fallbackErr }, `[MatViewRefresh] Failed to refresh ${view}`);
      }
    }

    const durationMs = Date.now() - start;

    try {
      await pool.query(
        `
        INSERT INTO analytics_refresh_log (view_name, refreshed_at, duration_ms, status)
        VALUES ($1, NOW(), $2, $3)
        ON CONFLICT (view_name) DO UPDATE
          SET refreshed_at = excluded.refreshed_at,
              duration_ms  = excluded.duration_ms,
              status       = excluded.status
      `,
        [view, durationMs, status],
      );
    } catch {
      /* non-fatal — log table may not exist yet */
    }

    if (status !== 'error') {
      logger.info(`[MatViewRefresh] ${view} refreshed in ${durationMs}ms (${status})`);
    }
  }

  isDirty = false;
  lastRefreshedAt = Date.now();
  isRefreshing = false;
}

/** Force a full refresh regardless of dirty flag or interval. */
export async function forceRefresh(): Promise<void> {
  isDirty = true;
  lastRefreshedAt = 0;
  await refreshIfDue();
}

/**
 * Initializes the background scheduler for materialised view maintenance.
 * Called once at app startup.
 */
export function initMatViewScheduler(): void {
  if (
    process.env.DISABLE_MATVIEW_REFRESH === '1' ||
    process.env.DISABLE_MATVIEW_REFRESH === 'true'
  ) {
    return;
  }

  // 1. High-frequency cycle to catch reactive "dirty" marks from API writes.
  // Checks every 30s, will actually refresh only if markViewsDirty() was called.
  setInterval(() => {
    refreshIfDue().catch((err) => logger.error({ err }, '[MatViewRefresh] Auto-cycle failed'));
  }, 30_000).unref();

  // 2. Low-frequency safety valve to catch background backfill writes that bypass the web API.
  // Forces an unconditional refresh every 10 minutes regardless of the dirty flag.
  setInterval(() => {
    logger.info('[MatViewRefresh] Executing scheduled periodic safety-valve refresh...');
    forceRefresh().catch((err) => logger.error({ err }, '[MatViewRefresh] Periodic cycle failed'));
  }, 10 * 60_000).unref();

  logger.info('[MatViewRefresh] Scheduler initialized (30s reactive, 10m periodic)');
}
