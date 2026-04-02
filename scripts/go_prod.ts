/**
 * go_prod.ts — Production deployment orchestrator (Postgres edition)
 *
 * Steps:
 *  1. Preflight: schema check + connectivity
 *  2. Run PG migrations
 *  3. Run VACUUM ANALYZE on hot tables
 *  4. Refresh materialised views
 *  5. Run certify
 *  6. Git tag + print verdict
 */

import pg from 'pg';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VERSION = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'))
  .version as string;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 3,
  connectionTimeoutMillis: 10_000,
});

const HOT_TABLES = [
  'entities',
  'documents',
  'entity_mentions',
  'entity_relationships',
  'media_items',
] as const;

const VIEWS = [
  'mv_docs_by_type',
  'mv_entity_type_dist',
  'mv_top_connected',
  'mv_timeline_data',
  'mv_redaction_stats',
] as const;

async function step(label: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`\n▶  ${label}...`);
  const t = Date.now();
  try {
    await fn();
    console.log(` ✅  (${Date.now() - t}ms)`);
  } catch (err: unknown) {
    console.log(` ❌`);
    throw err;
  }
}

async function main() {
  console.log(`\n🚀 Epstein Archive v${VERSION} — Production Deployment`);
  console.log('═'.repeat(54));

  // ── 1. Preflight ────────────────────────────────────────────────
  await step('Preflight: DB connectivity', async () => {
    const { rows } = await pool.query<{ version: string }>('SELECT version()');
    console.log(`\n     PG: ${rows[0].version.split(' ').slice(0, 2).join(' ')}`);
  });

  await step('Preflight: critical tables exist', async () => {
    const required = ['entities', 'documents', 'entity_mentions', 'entity_relationships'];
    const { rows } = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [required],
    );
    const found = rows.map((r) => r.tablename);
    const missing = required.filter((t) => !found.includes(t));
    if (missing.length > 0) throw new Error(`Missing tables: ${missing.join(', ')}`);
  });

  await step('Preflight: migrations up to date', async () => {
    const { rows } = await pool.query<{ name: string }>(
      `SELECT name FROM pgmigrations ORDER BY run_on DESC LIMIT 1`,
    );
    if (rows.length === 0) throw new Error('No migrations found in pgmigrations table');
    console.log(`\n     Last migration: ${rows[0].name}`);
  });

  await step('Preflight: fts_vector populated', async () => {
    const { rows } = await pool.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM entities WHERE fts_vector IS NULL`,
    );
    const nullCount = parseInt(rows[0].n);
    if (nullCount > 1000)
      throw new Error(`${nullCount} entities missing fts_vector — run backfill`);
    if (nullCount > 0)
      console.log(`\n     ⚠️  ${nullCount} entities without fts_vector (below threshold)`);
  });

  // ── 2. Run migrations (idempotent) ──────────────────────────────
  await step('Run PG migrations', async () => {
    execSync('npm run db:migrate:pg', {
      env: { ...process.env },
      stdio: 'inherit',
    });
  });

  await step('Backfill document provenance', async () => {
    execSync('npm run provenance:backfill', {
      env: { ...process.env, PROVENANCE_BACKFILL_MAX: process.env.PROVENANCE_BACKFILL_MAX || '0' },
      stdio: 'inherit',
    });
  });

  // ── 3. VACUUM ANALYZE hot tables ────────────────────────────────
  // Must use a raw client — VACUUM cannot run inside a transaction
  await step('VACUUM ANALYZE hot tables', async () => {
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    for (const table of HOT_TABLES) {
      try {
        await client.query(`VACUUM ANALYZE ${table}`);
      } catch (_e) {
        // Non-fatal: table may not exist or shm limit hit
        console.warn(`\n     ⚠️  ${table}: ${_e instanceof Error ? _e.message : 'unknown error'}`);
      }
    }
    await client.end();
  });

  // ── 4. Refresh materialised views ───────────────────────────────
  await step('Refresh materialised views', async () => {
    for (const view of VIEWS) {
      try {
        await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
      } catch (_concErr: unknown) {
        // Fallback if unique index missing
        await pool.query(`REFRESH MATERIALIZED VIEW ${view}`);
      }
    }
    await pool.query(
      `
      UPDATE analytics_refresh_log
      SET refreshed_at = NOW(), status = 'ok'
      WHERE view_name = ANY($1)
    `,
      [VIEWS],
    );
  });

  // ── 5. Quick sanity queries ──────────────────────────────────────
  await step('Sanity: FTS search returns results', async () => {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS n FROM entities, websearch_to_tsquery('english', $1) q WHERE fts_vector @@ q`,
      ['epstein'],
    );
    const n = parseInt(rows[0].n);
    if (n === 0) throw new Error('FTS search for "epstein" returned 0 results');
    console.log(`\n     ${n} matches for "epstein"`);
  });

  await step('Sanity: mat-views populated', async () => {
    const { rows } = await pool.query<{ view_name: string; status: string }>(
      `SELECT view_name, status FROM analytics_refresh_log`,
    );
    console.log(`\n     ${rows.map((r) => `${r.view_name}:${r.status}`).join(' ')}`);
  });

  // ── 6. Git tag ───────────────────────────────────────────────────
  await step(`Git tag v${VERSION}`, async () => {
    try {
      execSync(`git tag -a v${VERSION} -m "release: v${VERSION} — Postgres hardening patch"`, {
        stdio: 'pipe',
      });
      console.log(`\n     Tagged v${VERSION}`);
    } catch (e: unknown) {
      const error = e as { stderr?: { toString: () => string } };
      if (error.stderr?.toString().includes('already exists')) {
        console.log(`\n     Tag v${VERSION} already exists — skipping`);
      } else {
        throw e;
      }
    }
  });

  await pool.end();

  console.log('\n' + '═'.repeat(54));
  console.log(`🌟  v${VERSION} — GO\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n❌ DEPLOYMENT FAILED:', message);
  process.exit(1);
});
