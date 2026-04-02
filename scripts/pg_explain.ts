#!/usr/bin/env tsx
/**
 * pg_explain.ts — Captures EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) for the
 * 6 heaviest production queries. Run after deployments to detect plan regressions.
 *
 * Usage: DATABASE_URL=postgres://... tsx scripts/pg_explain.ts
 * Output: docs/explain/<timestamp>-<githash>.json
 */

import pg from 'pg';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUERIES: Array<{ name: string; sql: string; params: unknown[] }> = [
  {
    name: 'graph_neighbors',
    sql: `SELECT target_entity_id FROM entity_relationships
          WHERE source_entity_id = ANY($1::bigint[]) LIMIT 2000`,
    params: [[1, 2, 3]],
  },
  {
    name: 'entity_fts_websearch',
    sql: `SELECT id, full_name FROM entities, websearch_to_tsquery('english', $1) q
          WHERE fts_vector @@ q ORDER BY ts_rank_cd(fts_vector, q, 32) DESC LIMIT 50`,
    params: ['jeffrey epstein'],
  },
  {
    name: 'document_fts_websearch',
    sql: `SELECT id, file_name FROM documents, websearch_to_tsquery('english', $1) q
          WHERE fts_vector @@ q LIMIT 50`,
    params: ['flight log'],
  },
  {
    name: 'analytics_top_connected',
    sql: `SELECT * FROM mv_top_connected LIMIT 100`,
    params: [],
  },
  {
    name: 'map_entities',
    sql: `SELECT id, full_name, location_lat, location_lng, red_flag_rating
          FROM entities
          WHERE location_lat BETWEEN -90 AND 90
            AND location_lng BETWEEN -180 AND 180
            AND red_flag_rating >= $1
            AND COALESCE(junk_tier,'clean') = 'clean'
          ORDER BY red_flag_rating DESC LIMIT 500`,
    params: [1],
  },
  {
    name: 'media_batch_by_entity',
    sql: `SELECT entity_id, file_path, file_type FROM media_items
          WHERE entity_id = ANY($1::bigint[]) AND file_type LIKE 'image/%'`,
    params: [[1, 2, 3]],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  let gitSha = 'unknown';
  try {
    gitSha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    /* ok */
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(__dirname, '..', 'docs', 'explain');
  fs.mkdirSync(outDir, { recursive: true });

  const results: Record<string, unknown> = {};
  const regressions: string[] = [];
  const failures: string[] = [];

  for (const { name, sql, params } of QUERIES) {
    console.log(`\nEXPLAIN: ${name}`);
    try {
      const { rows } = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, params);
      const plan = rows[0]['QUERY PLAN'];
      results[name] = plan;

      // Inline regression check
      const planStr = JSON.stringify(plan);
      const hasSeqScan = planStr.includes('"Seq Scan"');
      const hasExternalMerge = planStr.includes('"External Merge"');
      if (name === 'graph_neighbors' && hasSeqScan) {
        regressions.push(`❌ ${name}: Seq Scan detected on entity_relationships`);
      }
      if ((name === 'entity_fts_websearch' || name === 'document_fts_websearch') && hasSeqScan) {
        regressions.push(`❌ ${name}: Seq Scan detected (GIN index not used)`);
      }
      if (hasExternalMerge) {
        regressions.push(`⚠️  ${name}: External Merge sort (consider raising work_mem)`);
      }

      console.log(`  → OK`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results[name] = { error: message };
      failures.push(`${name}: ${message}`);
      console.warn(`  → FAILED: ${message}`);
    }
  }

  const outFile = `${outDir}/${ts}-${gitSha}.json`;
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\nEXPLAIN outputs written to ${outFile}`);

  if (failures.length > 0) {
    console.error('\nEXPLAIN execution failures:');
    failures.forEach((f) => console.error(' ', f));
    await pool.end();
    process.exit(1);
  }

  if (regressions.length > 0) {
    console.error('\nPlan Regressions Detected:');
    regressions.forEach((r) => console.error(' ', r));
    await pool.end();
    process.exit(1);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
