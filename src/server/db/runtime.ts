import pg from 'pg';
import { requestContext } from '../middleware/requestId.js';
import { logger } from '../services/Logger.js';
import { queryCounter } from '../queryCounter.js';

// ─── Pool singletons ─────────────────────────────────────────────────────────

let apiPool: pg.Pool | null = null;
export let maintenancePool: pg.Pool | null = null;
let ingressPool: pg.Pool | null = null;

const SLOW_QUERY_LOG_THRESHOLD_MS = Math.max(
  1,
  parseInt(process.env.PG_SLOW_QUERY_LOG_MS ?? '300', 10) || 300,
);

function wrapPool(pool: pg.Pool, label: string): pg.Pool {
  const originalQuery = pool.query.bind(pool);
  pool.query = (async (sqlOrConfig: string | pg.QueryConfig, values?: unknown[]) => {
    const startedAt = Date.now();
    const waitingBefore = pool.waitingCount;
    let queryName = label;
    if (typeof sqlOrConfig === 'object' && 'name' in sqlOrConfig) {
      queryName = (sqlOrConfig as pg.QueryConfig).name || label;
    }
    try {
      const res = await originalQuery(
        sqlOrConfig as Parameters<typeof originalQuery>[0],
        values as Parameters<typeof originalQuery>[1],
      );
      const durationMs = Date.now() - startedAt;
      const store = requestContext.getStore();
      if (store?.requestId) {
        queryCounter.increment(store.requestId);
      }
      const debugPg =
        process.env.DEBUG_PG && process.env.DEBUG_PG !== '0' && process.env.DEBUG_PG !== 'false';
      const shouldLog = debugPg || durationMs > SLOW_QUERY_LOG_THRESHOLD_MS;
      if (shouldLog) {
        const requestId = store?.requestId || 'no-req-id';
        const pgRes = res as { rowCount?: number | null; rows?: unknown[] };
        const rowCount = pgRes.rowCount ?? pgRes.rows?.length ?? 0;
        logger.warn(
          {
            requestId,
            queryName,
            durationMs,
            rowCount,
            pool: {
              total: pool.totalCount,
              idle: pool.idleCount,
              waitingBefore,
              waitingAfter: pool.waitingCount,
            },
          },
          '[PG_QUERY]',
        );
      }
      return res;
    } catch (err: unknown) {
      (err as Record<string, unknown>)._pgQueryName = queryName;
      throw err;
    }
  }) as typeof pool.query;
  return pool;
}

// Pool sizing — matches connection budget in runbook §3:
// apiPool=25 (×2 PM2 workers = 50), ingestPool=8, maintenancePool=2
// + PG internals (~5) + headroom (~15) = ~80 / max_connections=100+
//
// Previously 18 per worker (36 total). Raised to 25 (50 total) to absorb
// parallel page-load bursts without triggering pgSaturationShed 503s.
// Verify max_connections on your Postgres instance before increasing further.
// Override at runtime via API_POOL_MAX env var.
const POOL_SIZES = {
  api: parseInt(process.env.API_POOL_MAX ?? '25'),
  maintenance: 2,
  ingress: parseInt(process.env.INGEST_POOL_MAX ?? '8'),
} as const;

const API_POOL_OPTIONS =
  process.env.PG_API_POOL_OPTIONS ??
  '-c statement_timeout=60000 -c lock_timeout=500 -c idle_in_transaction_session_timeout=3000';

const MAINTENANCE_POOL_OPTIONS =
  process.env.PG_MAINTENANCE_POOL_OPTIONS ??
  '-c statement_timeout=300000 -c lock_timeout=500 -c idle_in_transaction_session_timeout=3000 -c work_mem=256MB';

const INGRESS_POOL_OPTIONS =
  process.env.PG_INGRESS_POOL_OPTIONS ??
  '-c statement_timeout=0 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=0';

/**
 * Initializes all database pools.
 * This replaces the legacy getDb() auto-initialization.
 */
export function initPools(): void {
  if (apiPool) return;

  assertProductionPg();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required; configure Postgres before starting the server.');
  }

  // ── API pool
  apiPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: POOL_SIZES.api,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    application_name: 'epstein-api',
    options: API_POOL_OPTIONS,
    maxUses: 7500,
  });
  apiPool = wrapPool(apiPool, 'apiPool');
  apiPool.on('error', (err) => {
    logger.error({ err: err.message }, '[PG API POOL] Unexpected error');
  });

  // ── Maintenance pool
  maintenancePool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: POOL_SIZES.maintenance,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'epstein-maintenance',
    options: MAINTENANCE_POOL_OPTIONS,
  });
  maintenancePool = wrapPool(maintenancePool, 'maintenancePool');
  maintenancePool.on('error', (err) => {
    logger.error({ err: err.message }, '[PG MAINTENANCE POOL] Unexpected error');
  });

  // ── Ingest pool
  ingressPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: POOL_SIZES.ingress,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'epstein-ingest',
    options: INGRESS_POOL_OPTIONS,
  });
  ingressPool = wrapPool(ingressPool, 'ingressPool');
}

export function getApiPool(): pg.Pool {
  if (!apiPool) {
    initPools();
  }
  return apiPool!;
}

export function getMaintenancePool(): pg.Pool {
  if (!maintenancePool) {
    initPools();
  }
  return maintenancePool!;
}

export function getIngressPool(): pg.Pool {
  if (!ingressPool) {
    initPools();
  }
  return ingressPool!;
}

export const getIngestPool = getIngressPool;

export async function drainPools(): Promise<void> {
  await Promise.allSettled([apiPool?.end(), maintenancePool?.end(), ingressPool?.end()]);
}

export function getSlowQueryLogThresholdMs(): number {
  return SLOW_QUERY_LOG_THRESHOLD_MS;
}

// ─── Boot-time Postgres Guard ────────────────────────────────────────────────

export function assertProductionPg(): void {
  if (process.env.NODE_ENV !== 'production') return;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      '[FATAL] DATABASE_URL is missing in production. Refusing to boot without primary database engine.',
    );
  }

  if (!process.env.DATABASE_URL.startsWith('postgres')) {
    throw new Error(
      '[FATAL] DATABASE_URL must be a postgres:// or postgresql:// URI in production. Refusing to start.',
    );
  }
}

// ─── Metrics / observability ──────────────────────────────────────────────────

export async function getMigrationMetrics() {
  return {
    dialect: 'postgres',
    pools: {
      api: apiPool
        ? {
            total: apiPool.totalCount,
            idle: apiPool.idleCount,
            waiting: apiPool.waitingCount,
            max: POOL_SIZES.api,
          }
        : null,
      maintenance: maintenancePool
        ? {
            total: maintenancePool.totalCount,
            idle: maintenancePool.idleCount,
            waiting: maintenancePool.waitingCount,
            max: POOL_SIZES.maintenance,
          }
        : null,
      ingress: ingressPool
        ? {
            total: ingressPool.totalCount,
            idle: ingressPool.idleCount,
            waiting: ingressPool.waitingCount,
            max: POOL_SIZES.ingress,
          }
        : null,
    },
  };
}
