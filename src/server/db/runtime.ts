import pg from 'pg';
import { requestContext } from '../middleware/requestId.js';

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
  pool.query = (async (sqlOrConfig: string | pg.QueryConfig, values?: any[]) => {
    const startedAt = Date.now();
    const waitingBefore = pool.waitingCount;
    let queryName = label;
    if (typeof sqlOrConfig === 'object' && 'name' in sqlOrConfig) {
      queryName = (sqlOrConfig as any).name || label;
    }
    try {
      const res = await originalQuery(sqlOrConfig as any, values as any);
      const durationMs = Date.now() - startedAt;
      const debugPg =
        process.env.DEBUG_PG && process.env.DEBUG_PG !== '0' && process.env.DEBUG_PG !== 'false';
      const shouldLog = debugPg || durationMs > SLOW_QUERY_LOG_THRESHOLD_MS;
      if (shouldLog) {
        const store = requestContext.getStore();
        const requestId = store?.requestId || 'no-req-id';
        const rowCount = (res as any).rowCount ?? (res as any).rows?.length ?? 0;
        console.warn('[PG_QUERY]', {
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
        });
      }
      return res;
    } catch (err: any) {
      (err as any)._pgQueryName = queryName;
      throw err;
    }
  }) as any;
  return pool;
}

// Pool sizing — matches connection budget in runbook §3:
// apiPool=18, ingestPool=8, maintenancePool=2
// + PG internals (~5) + headroom (~10) = ~45 / max_connections=80
const POOL_SIZES = {
  api: parseInt(process.env.API_POOL_MAX ?? '18'),
  maintenance: 2,
  ingress: parseInt(process.env.INGEST_POOL_MAX ?? '8'),
} as const;

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
    maxUses: 7500,
  });
  apiPool = wrapPool(apiPool, 'apiPool');
  apiPool.on('connect', (client) => applyApiSessionSettings(client));
  apiPool.on('error', (err) => {
    console.error('[PG API POOL] Unexpected error:', err.message);
  });

  // ── Maintenance pool
  maintenancePool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: POOL_SIZES.maintenance,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'epstein-maintenance',
  });
  maintenancePool = wrapPool(maintenancePool, 'maintenancePool');
  maintenancePool.on('connect', (client) => applyMaintenanceSessionSettings(client));
  maintenancePool.on('error', (err) => {
    console.error('[PG MAINTENANCE POOL] Unexpected error:', err.message);
  });

  // ── Ingest pool
  ingressPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: POOL_SIZES.ingress,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'epstein-ingest',
  });
  ingressPool = wrapPool(ingressPool, 'ingressPool');
  ingressPool.on('connect', (client) => {
    // Apply each setting individually — multi-statement joins are silently dropped by pg
    const settings = [
      'SET statement_timeout = 0',
      "SET lock_timeout = '5000ms'",
      'SET idle_in_transaction_session_timeout = 0',
    ];
    settings
      .reduce((p, sql) => p.then(() => client.query(sql)), Promise.resolve() as Promise<unknown>)
      .catch((err: { message: string }) => {
        console.error('[PG INGEST POOL] Failed to apply session settings:', err.message);
      });
  });
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

// ─── Session settings ────────────────────────────────────────────────────────

function applyApiSessionSettings(client: pg.PoolClient): void {
  // Apply each setting individually — multi-statement joins are silently dropped by pg
  const settings = [
    "SET statement_timeout = '8000ms'",
    "SET lock_timeout = '500ms'",
    "SET idle_in_transaction_session_timeout = '3000ms'",
  ];
  settings
    .reduce((p, sql) => p.then(() => client.query(sql)), Promise.resolve() as Promise<unknown>)
    .catch((err) => {
      console.error('[PG API POOL] Failed to apply session settings:', err.message);
    });
}

function applyMaintenanceSessionSettings(client: pg.PoolClient): void {
  // Apply each setting individually — multi-statement joins are silently dropped by pg
  const settings = [
    "SET statement_timeout = '300000ms'",
    "SET lock_timeout = '500ms'",
    "SET idle_in_transaction_session_timeout = '3000ms'",
    "SET work_mem = '256MB'",
  ];
  settings
    .reduce((p, sql) => p.then(() => client.query(sql)), Promise.resolve() as Promise<unknown>)
    .catch((err) => {
      console.error('[PG MAINTENANCE POOL] Failed to apply session settings:', err.message);
    });
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
