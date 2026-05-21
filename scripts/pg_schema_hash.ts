#!/usr/bin/env tsx
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const SCHEMA_HASH_PATH = path.resolve(process.cwd(), 'docs', 'schema.hash');

type Mode = 'check' | 'update';

async function computeSchemaHash(client: pg.Client): Promise<string> {
  const columnsRes = await client.query<{
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema IN ('public', 'app')
        AND table_name NOT LIKE 'pg\\_%' ESCAPE '\\'
        AND table_name NOT LIKE 'staging\\_%' ESCAPE '\\'
      ORDER BY table_name, column_name
    `,
  );

  const indexesRes = await client.query<{
    schemaname: string;
    tablename: string;
    indexname: string;
    indexdef: string;
  }>(
    `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname IN ('public', 'app')
        AND tablename NOT LIKE 'pg\\_%' ESCAPE '\\'
        AND tablename NOT LIKE 'staging\\_%' ESCAPE '\\'
      ORDER BY schemaname, tablename, indexname
    `,
  );

  const matViewsRes = await client.query<{
    schemaname: string;
    matviewname: string;
    definition: string;
  }>(
    `
      SELECT
        schemaname,
        matviewname,
        definition
      FROM pg_matviews
      WHERE schemaname IN ('public', 'app')
        AND matviewname NOT LIKE 'pg\\_%' ESCAPE '\\'
        AND matviewname NOT LIKE 'staging\\_%' ESCAPE '\\'
      ORDER BY schemaname, matviewname
    `,
  );

  const payload = {
    columns: columnsRes.rows,
    indexes: indexesRes.rows,
    matViews: matViewsRes.rows,
  };

  const stableJson = JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(stableJson).digest('hex');
  return hash;
}

function readExpectedHash(): string | null {
  try {
    const data = fs.readFileSync(SCHEMA_HASH_PATH, 'utf8').trim();
    if (!data) return null;
    return data.split(/\s+/)[0] || null;
  } catch {
    return null;
  }
}

function writeExpectedHash(hash: string) {
  const dir = path.dirname(SCHEMA_HASH_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SCHEMA_HASH_PATH, `${hash}\n`);
  console.log(`[pg_schema_hash] Updated ${SCHEMA_HASH_PATH} to ${hash}`);
}

async function main() {
  const arg = process.argv[2] || 'check';
  const mode: Mode = arg === 'update' || arg === '--update' ? 'update' : 'check';

  if (process.env.SKIP_SCHEMA_HASH_CHECK === 'true') {
    const disallowed =
      process.env.NODE_ENV === 'production' ||
      process.env.CI === 'true' ||
      process.env.DEPLOY_CERTIFY === 'true';

    if (disallowed) {
      console.error(
        '[pg_schema_hash] ERROR: SKIP_SCHEMA_HASH_CHECK=true is not allowed in CI/production/certify.',
      );
      process.exit(1);
    }

    console.warn(
      '[pg_schema_hash] WARNING: Schema hash check explicitly skipped via SKIP_SCHEMA_HASH_CHECK=true.',
    );
    return;
  }

  if (!process.env.DATABASE_URL) {
    if (mode === 'update') {
      console.warn('[pg_schema_hash] WARNING: DATABASE_URL not set — skipping hash update.');
      return;
    }
    console.error('[pg_schema_hash] DATABASE_URL is required');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const hash = await computeSchemaHash(client);
    const expected = readExpectedHash();

    if (mode === 'update') {
      writeExpectedHash(hash);
      return;
    }

    if (!expected) {
      console.error(
        `[pg_schema_hash] No expected hash found at ${SCHEMA_HASH_PATH}. Run ` +
          '"pnpm schema:hash:update" to record the current schema.',
      );
      process.exit(1);
    }

    if (expected !== hash) {
      const localDriftBypass =
        process.env.ALLOW_SCHEMA_HASH_DRIFT === 'true' &&
        process.env.CI !== 'true' &&
        process.env.NODE_ENV !== 'production';
      const message = localDriftBypass
        ? '[pg_schema_hash] WARN: Schema drift detected; local bypass enabled.'
        : '[pg_schema_hash] ERROR: Schema drift detected.';
      console.error(message);
      console.error(`  expected: ${expected}`);
      console.error(`  actual:   ${hash}`);
      if (!localDriftBypass) {
        process.exit(1);
      }
    }

    console.log('[pg_schema_hash] Schema hash OK:', hash);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[pg_schema_hash] Fatal error:', err);
  process.exit(1);
});
