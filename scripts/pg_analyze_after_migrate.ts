#!/usr/bin/env tsx
/**
 * pg_analyze_after_migrate.ts — Runs VACUUM ANALYZE on all hot tables after migrations.
 * Called automatically by the db:migrate:pg NPM script.
 *
 * Usage: DATABASE_URL=postgres://... tsx scripts/pg_analyze_after_migrate.ts
 */

import pg from 'pg';
import 'dotenv/config';

const HOT_TABLES = [
  'entities',
  'documents',
  'entity_mentions',
  'entity_relationships',
  'media_items',
  'document_sentences',
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  // Use a dedicated client (not pool) — VACUUM cannot run in a transaction
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('[analyze] Running VACUUM ANALYZE on hot tables...');

  for (const table of HOT_TABLES) {
    const start = Date.now();
    try {
      // VACUUM must run outside a transaction; pg.Client does not auto-wrap
      await client.query(`VACUUM ANALYZE ${table}`);
      console.log(`[analyze] ${table} — ${Date.now() - start}ms`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Table may not exist yet (e.g. document_sentences)
      if ((err as pg.DatabaseError)?.code === '42P01') {
        console.warn(`[analyze] ${table} does not exist yet — skipping`);
      } else {
        console.error(`[analyze] ${table} failed:`, message);
      }
    }
  }

  await client.end();
  console.log('[analyze] Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
