import { getDatabaseMetadata } from '../db/healthQueries.js';
import { getMigrationMetrics } from '../db/runtime.js';

export type DbMetaPayload = {
  dialect: 'postgres';
  server_version?: string;
  statement_timeout?: string;
  lock_timeout?: string;
  pools: unknown;
};

const asOptionalString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  return String(value);
};

export async function getDbMetaPayload(): Promise<DbMetaPayload> {
  const rows = await getDatabaseMetadata();
  const row = rows[0] || {};
  const metrics = await getMigrationMetrics();
  return {
    dialect: 'postgres',
    server_version: asOptionalString(row.server_version),
    statement_timeout: asOptionalString(row.statement_timeout),
    lock_timeout: asOptionalString(row.lock_timeout),
    pools: metrics.pools,
  };
}
