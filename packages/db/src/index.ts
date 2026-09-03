import pg from 'pg';
import { readEnvStrict } from './env.js';

const { Pool } = pg;

export interface DbPools {
  apiPool: pg.Pool;
  ingestPool: pg.Pool;
  maintenancePool: pg.Pool;
}

export function createPools(): DbPools {
  const env = readEnvStrict();

  const apiPool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.API_POOL_MAX,
    connectionTimeoutMillis: env.CONNECT_TIMEOUT,
    application_name: 'epstein-api',
    maxUses: 7500,
  });

  apiPool.on('connect', (client) => {
    client
      .query(
        `
      SET statement_timeout = '8000ms';
      SET lock_timeout = '500ms';
      SET idle_in_transaction_session_timeout = '3000ms';
      SET jit = off;
    `,
      )
      .catch((err) => console.error('[DB] Failed to set API session settings:', err));
  });

  const ingestPool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.INGEST_POOL_MAX,
    connectionTimeoutMillis: env.CONNECT_TIMEOUT,
    application_name: 'epstein-ingest',
  });

  ingestPool.on('connect', (client) => {
    client
      .query(
        `
      SET statement_timeout = '60000ms';
      SET lock_timeout = '500ms';
      SET idle_in_transaction_session_timeout = '3000ms';
    `,
      )
      .catch((err) => console.error('[DB] Failed to set Ingest session settings:', err));
  });

  const maintenancePool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.MAINTENANCE_POOL_MAX,
    connectionTimeoutMillis: env.CONNECT_TIMEOUT,
    application_name: 'epstein-maintenance',
  });

  maintenancePool.on('connect', (client) => {
    client
      .query(
        `
      SET statement_timeout = '300000ms';
      SET lock_timeout = '500ms';
      SET idle_in_transaction_session_timeout = '3000ms';
      SET work_mem = '256MB';
      SET jit = off;
    `,
      )
      .catch((err) => console.error('[DB] Failed to set Maintenance session settings:', err));
  });

  [apiPool, ingestPool, maintenancePool].forEach((pool) => {
    pool.on('error', (err) => {
      console.error(
        `[DB] Unexpected error on idle client for ${pool.options.application_name}:`,
        err,
      );
    });
  });

  return { apiPool, ingestPool, maintenancePool };
}

export class DbError extends Error {
  constructor(
    public originalError: any,
    message?: string,
  ) {
    super(message || originalError.message);
    this.name = 'DbError';
  }
}

export const db = {
  async query<T extends pg.QueryResultRow = any>(
    pool: pg.Pool,
    text: string,
    values?: any[],
  ): Promise<pg.QueryResult<T>> {
    try {
      return await pool.query<T>(text, values);
    } catch (err) {
      throw new DbError(err);
    }
  },

  async tx<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw new DbError(err);
    } finally {
      client.release();
    }
  },

  async withClient<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      return await fn(client);
    } catch (err) {
      throw new DbError(err);
    } finally {
      client.release();
    }
  },
};

export const health = {
  async ping(pool: pg.Pool, timeoutMs: number = 2000): Promise<boolean> {
    const client = await pool.connect();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs),
    );

    try {
      await Promise.race([client.query('SELECT 1'), timeout]);
      return true;
    } catch {
      return false;
    } finally {
      client.release();
    }
  },

  poolStats(pool: pg.Pool) {
    return {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      max: pool.options.max,
      name: pool.options.application_name,
    };
  },
};

// --- Re-export generated queries ---
export * as investigationsQueries from './queries/__generated__/investigations.js';
export * as entitiesQueries from './queries/__generated__/entities.js';
export * as documentsQueries from './queries/__generated__/documents.js';
export * as searchQueries from './queries/__generated__/search.js';
export * as statsQueries from './queries/__generated__/stats.js';
export * as mediaQueries from './queries/__generated__/media.js';
export * from './queries/__generated__/media.js';
export * as blackBookQueries from './queries/__generated__/black_book.js';
export * as flightsQueries from './queries/__generated__/flights.js';
export * as financialQueries from './queries/__generated__/financial.js';
export * as forensicQueries from './queries/__generated__/forensic.js';
export * as relationshipsQueries from './queries/__generated__/relationships.js';
export * as analyticsQueries from './queries/__generated__/analytics.js';
export * as analyticsPeopleQueries from './queries/__generated__/analytics_people.js';
export * as articlesQueries from './queries/__generated__/articles.js';
export * as entityEvidenceQueries from './queries/__generated__/entity_evidence.js';
export * as evidenceQueries from './queries/__generated__/evidence.js';
export * as adminQueries from './queries/__generated__/admin.js';
export * as communicationsQueries from './queries/__generated__/communications.js';
export * as jobsQueries from './queries/__generated__/jobs.js';
export * as reviewQueries from './queries/__generated__/review.js';
export * as graphQueries from './queries/__generated__/graph.js';
