#!/usr/bin/env tsx

import 'dotenv/config';
import { Client } from 'pg';

const apply = process.argv.includes('--apply') || process.env.APPLY === '1';
const DEFAULT_BATCH_LIMIT = 1000;
const DEFAULT_PREVIEW_LIMIT = 50;
const DEFAULT_STATEMENT_TIMEOUT_MS = 60_000;

function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const batchLimit = positiveIntFromEnv('ENTITY_QUARANTINE_BATCH_LIMIT', DEFAULT_BATCH_LIMIT);
const previewLimit = positiveIntFromEnv('ENTITY_QUARANTINE_PREVIEW_LIMIT', DEFAULT_PREVIEW_LIMIT);
const statementTimeoutMs = positiveIntFromEnv(
  'ENTITY_QUARANTINE_STATEMENT_TIMEOUT_MS',
  DEFAULT_STATEMENT_TIMEOUT_MS,
);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const junkPredicate = `
  LOWER(COALESCE(full_name, '')) NOT IN ('jeffrey epstein', 'donald trump')
  AND (
    full_name IS NULL
    OR BTRIM(full_name) = ''
    OR LOWER(full_name) ~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\\M[:\\s-]*'
    OR LOWER(full_name) ~* '^(on|at|in|with)\\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\\M'
    OR LOWER(full_name) ~* '\\m(mon|tue|wed|thu|fri|sat|sun)\\M\\s*$'
    OR LOWER(full_name) ~* '\\m([[:alpha:]]{3,})\\s+\\1\\M'
    OR LOWER(full_name) ~* '\\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\\M'
    OR LOWER(full_name) ~* '\\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\\M'
    OR LOWER(full_name) ~* '^(east|west|north|south)\\s+(if|aft|aftstreet|street|road|avenue)\\M'
    OR LOWER(full_name) ~* '\\m(direction|provided)\\M\\s*$'
    OR LOWER(full_name) ~* '\\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M\\s*$'
    OR LOWER(full_name) ~* '\\m[[:alpha:]]+''?s\\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M'
    OR LOWER(full_name) ~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\\M'
  )
`;

const client = new Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  await client.query(`SET statement_timeout = ${statementTimeoutMs}`);

  const preview = await client.query<{ id: string; full_name: string | null; mentions: string }>(
    `
      SELECT id, full_name, COALESCE(mentions, 0) AS mentions
      FROM entities
      WHERE COALESCE(junk_tier, 'clean') = 'clean'
        AND COALESCE(quarantine_status, 0) = 0
        AND ${junkPredicate}
      LIMIT $1
    `,
    [previewLimit],
  );

  console.log(
    `[entity-quality] preview clean junk entities=${preview.rows.length} limit=${previewLimit}`,
  );
  for (const row of preview.rows) {
    console.log(`- ${row.id}: ${row.full_name ?? '(blank)'} mentions=${row.mentions}`);
  }

  if (!apply) {
    console.log('[entity-quality] dry run only; rerun with --apply to quarantine one batch.');
    process.exit(0);
  }

  const result = await client.query<{ id: string; full_name: string | null }>(
    `
      WITH candidates AS MATERIALIZED (
        SELECT id
        FROM entities
        WHERE COALESCE(junk_tier, 'clean') = 'clean'
          AND COALESCE(quarantine_status, 0) = 0
          AND ${junkPredicate}
        LIMIT $1
      )
      UPDATE entities
      SET
        junk_tier = 'junk',
        junk_probability = 1,
        junk_reason = 'quality_gate:non_person_entity_pollution',
        quarantine_status = 1
      FROM candidates
      WHERE entities.id = candidates.id
      RETURNING entities.id, entities.full_name
    `,
    [batchLimit],
  );

  const quarantined = result.rowCount ?? result.rows.length;
  console.log(`[entity-quality] quarantined=${quarantined} limit=${batchLimit}`);
  if (quarantined === batchLimit) {
    console.log('[entity-quality] batch limit reached; rerun to continue quarantine cleanup.');
  }
} finally {
  await client.end().catch(() => undefined);
}
