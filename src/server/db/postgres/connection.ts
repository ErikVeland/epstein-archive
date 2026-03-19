import pg from 'pg';
import { logger } from '../../services/Logger.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPgPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for Postgres connection.');
  }

  pool = new Pool({
    connectionString,
    max: 20, // Initial max pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle Postgres client', err);
    process.exit(-1);
  });

  return pool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await getPgPool().query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development' || duration > 100) {
    logger.info(`[PG QUERY] ${duration}ms | SQL: ${text.substring(0, 100)}`);
  }

  return res;
}
