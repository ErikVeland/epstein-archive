import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

type HistoricalPlaceholderRule = {
  name: string;
  satisfiedByAny: string[];
};

const HISTORICAL_PLACEHOLDER_RULES: HistoricalPlaceholderRule[] = [
  {
    name: '1740214400000_align_schema',
    satisfiedByAny: ['1740214500000_align_schema_v2', '1741540000000_align_schema_v2'],
  },
  {
    name: '1740214500000_align_schema_v2',
    satisfiedByAny: ['1741540000000_align_schema_v2'],
  },
];

function resolveMigrationDir(): string {
  const cwdSourceDir = path.resolve(process.cwd(), 'src', 'server', 'db', 'postgres', 'migrations');
  if (fs.existsSync(cwdSourceDir)) return cwdSourceDir;

  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'postgres', 'migrations');
}

function getExpectedMigrationNames(): string[] {
  const migrationDir = resolveMigrationDir();
  if (!fs.existsSync(migrationDir)) {
    throw new Error(
      `[Migrator] Migration directory not found at ${migrationDir}. Refusing to boot without migration parity verification.`,
    );
  }

  return fs
    .readdirSync(migrationDir)
    .filter((name) => name.endsWith('.js'))
    .sort();
}

function canonicalMigrationName(name: string): string {
  return name.replace(/\.(cjs|mjs|js|ts)$/i, '');
}

export async function reconcileHistoricalMigrationLedger(): Promise<number> {
  const pool = getApiPool();

  try {
    const tableCheck = await pool.query<{ exists: string | null }>(
      "SELECT to_regclass('public.pgmigrations')::text AS exists",
    );
    if (!tableCheck.rows[0]?.exists) {
      return 0;
    }

    const { rows } = await pool.query<{ name: string; run_on: Date }>(
      'SELECT name, run_on FROM pgmigrations ORDER BY run_on ASC, id ASC',
    );
    const names = new Set(rows.map((row) => row.name));
    let inserted = 0;

    for (const rule of HISTORICAL_PLACEHOLDER_RULES) {
      if (names.has(rule.name)) continue;
      const anchor = rows.find((row) => rule.satisfiedByAny.includes(row.name));
      if (!anchor) continue;

      const runOn = new Date(new Date(anchor.run_on).getTime() - 1000);
      await pool.query('INSERT INTO pgmigrations (name, run_on) VALUES ($1, $2)', [
        rule.name,
        runOn,
      ]);
      names.add(rule.name);
      rows.push({ name: rule.name, run_on: runOn });
      inserted += 1;
      logger.warn(`[Migrator] Reconciled historical placeholder ledger entry: ${rule.name}`);
    }

    return inserted;
  } catch (error: unknown) {
    const message = String((error as Error)?.message || error || '');
    if (/relation .*pgmigrations.* does not exist/i.test(message)) {
      return 0;
    }
    throw error;
  }
}

async function getAppliedMigrationNames(): Promise<Set<string>> {
  try {
    await reconcileHistoricalMigrationLedger();
    const { rows } = await getApiPool().query<{ name: string }>(
      'SELECT name FROM pgmigrations ORDER BY run_on ASC',
    );
    return new Set(rows.map((row) => row.name));
  } catch (error: unknown) {
    throw new Error(
      `[Migrator] Failed to read pgmigrations. Run Postgres migrations before boot. ${(error as Error)?.message || error}`,
    );
  }
}

// Historical call-site name retained. We fail closed on parity instead of silently no-oping.
export async function runMigrations() {
  const expectedFiles = getExpectedMigrationNames();
  const expected = expectedFiles.map(canonicalMigrationName);
  const applied = new Set(Array.from(await getAppliedMigrationNames()).map(canonicalMigrationName));
  const pending = expected.filter((name) => !applied.has(name));

  if (pending.length > 0) {
    throw new Error(
      `[Migrator] Pending Postgres migrations detected (${pending.length}): ${pending.join(', ')}. Run "pnpm db:migrate:pg" before starting the server.`,
    );
  }

  logger.info(`[Migrator] Postgres migration parity OK (${expected.length} applied).`);
}
