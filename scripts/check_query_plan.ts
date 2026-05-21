#!/usr/bin/env tsx
/**
 * Query Plan Gate — CI gate that detects dangerous query plans on
 * high-traffic routes. Runs EXPLAIN (BUFFERS, FORMAT JSON) against
 * known-hot queries and fails if sequential scans, missing index
 * usage, or sort spills are found.
 *
 * Usage: DATABASE_URL=postgres://... tsx scripts/check_query_plan.ts
 * Env:   SKIP_QUERY_PLAN_GATE=1  — bypass (for local dev without DB)
 *        PG_EXPLAIN_SYNTAX_ONLY=1 — skip ANALYZE (faster, less invasive)
 */

import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

if (process.env.SKIP_QUERY_PLAN_GATE === '1') {
  console.log('[check-query-plan] SKIP_QUERY_PLAN_GATE=1 — skipping');
  process.exit(0);
}

interface ExplainQuery {
  name: string;
  sql: string;
  params: unknown[];
  /** Allow Seq Scan on tables matching these patterns */
  allowSeqScanOn?: RegExp[];
  /** Max estimated rows if a seq scan is unavoidable */
  maxSeqScanRows?: number;
  /** Expected index usage hint */
  expectIndex?: string;
}

const QUERIES: ExplainQuery[] = [
  {
    name: 'documents_list_paginated',
    sql: `SELECT d.id, d.file_name, d.file_type, d.evidence_type,
                 d.date_created, d.red_flag_rating, d.file_size, d.significance_score,
                 d.metadata_json
          FROM documents d
          ORDER BY d.date_created DESC NULLS LAST
          LIMIT $1 OFFSET $2`,
    params: [50, 0],
    expectIndex: 'documents_date_created_idx',
  },
  {
    name: 'documents_search_fts',
    sql: `SELECT d.id, d.file_name
          FROM documents d, websearch_to_tsquery('english', $1) q
          WHERE d.fts_vector @@ q
          ORDER BY ts_rank_cd(d.fts_vector, q, 32) DESC
          LIMIT 50`,
    params: ['flight log'],
    expectIndex: 'documents_fts_idx',
  },
  {
    name: 'entities_list_paginated',
    sql: `SELECT e.id, e.full_name, e.red_flag_rating, e.entity_type
          FROM entities e
          WHERE COALESCE(e.junk_tier, 'clean') = 'clean'
          ORDER BY e.red_flag_rating DESC NULLS LAST
          LIMIT $1 OFFSET $2`,
    params: [50, 0],
    expectIndex: 'entities_red_flag_idx',
  },
  {
    name: 'entities_search_fts',
    sql: `SELECT e.id, e.full_name
          FROM entities e, websearch_to_tsquery('english', $1) q
          WHERE e.fts_vector @@ q
          ORDER BY ts_rank_cd(e.fts_vector, q, 32) DESC
          LIMIT 50`,
    params: ['jeffrey epstein'],
    expectIndex: 'entities_fts_idx',
  },
  {
    name: 'media_images_paginated',
    sql: `SELECT mi.id, mi.file_path, mi.file_type, mi.title, mi.description
          FROM media_items mi
          WHERE mi.file_type LIKE 'image/%'
          ORDER BY mi.id DESC
          LIMIT $1 OFFSET $2`,
    params: [50, 0],
    expectIndex: 'media_items_file_type_idx',
  },
  {
    name: 'media_by_album',
    sql: `SELECT mi.id, mi.file_path, mi.file_type, mi.title
          FROM media_items mi
          WHERE mi.album_id = $1
          ORDER BY mi.red_flag_rating DESC NULLS LAST, mi.created_at DESC
          LIMIT 200`,
    params: [1],
    expectIndex: 'idx_media_items_album_redflag_created',
  },
  {
    name: 'emails_list_paginated',
    sql: `SELECT d.id, d.file_name, d.date_created
          FROM documents d
          WHERE d.evidence_type = 'email'
          ORDER BY d.date_created DESC NULLS LAST
          LIMIT $1 OFFSET $2`,
    params: [50, 0],
    expectIndex: 'idx_documents_evidence_type_date_created',
  },
  {
    name: 'graph_neighbors',
    sql: `SELECT target_entity_id, relationship_type
          FROM entity_relationships
          WHERE source_entity_id = ANY($1::bigint[])
          LIMIT 2000`,
    params: [[1, 2, 3]],
    expectIndex: 'entity_relationships_source_idx',
  },
  {
    name: 'investigation_evidence',
    sql: `SELECT ie.id, ie.document_id, ie.relevance, ie.added_at, ie.added_by
          FROM investigation_evidence ie
          WHERE ie.investigation_id = $1
          ORDER BY ie.added_at DESC
          LIMIT 500`,
    params: [1],
    expectIndex: 'idx_investigation_evidence_investigation_added',
  },
  {
    name: 'search_hybrid',
    sql: `SELECT d.id, d.file_name
          FROM documents d
          WHERE d.fts_vector @@ plainto_tsquery('english', $1)
             OR d.file_name ILIKE '%' || $1 || '%'
          ORDER BY d.date_created DESC
          LIMIT 50`,
    params: ['epstein'],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[check-query-plan] DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const syntaxOnly = process.env.PG_EXPLAIN_SYNTAX_ONLY === '1';

  let gitSha = 'unknown';
  try {
    gitSha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    /* ok */
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(ROOT, 'docs', 'explain');
  mkdirSync(outDir, { recursive: true });

  const results: Record<string, unknown> = {};
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const query of QUERIES) {
    const { name, sql, params } = query;
    process.stdout.write(`[check-query-plan] EXPLAIN ${name}... `);
    try {
      const explainMode = syntaxOnly
        ? 'EXPLAIN (FORMAT JSON)'
        : 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)';
      const { rows } = await pool.query(`${explainMode} ${sql}`, params);
      const plan = rows[0]['QUERY PLAN'];
      results[name] = plan;

      const planStr = JSON.stringify(plan);
      const hasSeqScan = planStr.includes('"Seq Scan"');
      const hasIndexScan =
        planStr.includes('"Index Scan"') || planStr.includes('"Index Only Scan"');
      const hasBitmapScan = planStr.includes('"Bitmap Heap Scan"');
      const hasExternalSort = planStr.includes('"External Sort"');
      const hasSortSpill =
        planStr.includes('"Sort Space Used"') || planStr.includes('"Sort Space Type"');

      const isAllowedSeqScan = query.allowSeqScanOn?.some((re) => re.test(name));
      const preferIndex = query.expectIndex;

      if (hasSeqScan && !isAllowedSeqScan) {
        const tableMatch = planStr.match(/"Seq Scan on (\w+)"/);
        const tableName = tableMatch?.[1] || 'unknown';
        const rowsMatch = planStr.match(/"Plan Rows": (\d+)/);
        const estRows = rowsMatch ? Number(rowsMatch[1]) : 0;

        if (estRows > (query.maxSeqScanRows ?? 1000)) {
          failures.push(
            `Seq Scan on "${tableName}" for "${name}" (est. ${estRows} rows) — ` +
              `missing or unused index${preferIndex ? ` (expected: ${preferIndex})` : ''}`,
          );
        } else {
          warnings.push(
            `Small Seq Scan on "${tableName}" for "${name}" (est. ${estRows} rows)` +
              (preferIndex ? ` — verify index "${preferIndex}" exists and is used` : ''),
          );
        }
      }

      if (preferIndex && !hasIndexScan && !hasBitmapScan && hasSeqScan) {
        warnings.push(`Expected index "${preferIndex}" for "${name}" but query chose Seq Scan`);
      }

      if (hasExternalSort) {
        warnings.push(`External Sort detected in "${name}" — consider raising work_mem`);
      }

      if (hasSortSpill) {
        warnings.push(`Sort spill detected in "${name}" — consider raising work_mem`);
      }

      process.stdout.write('OK\n');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results[name] = { error: message };
      failures.push(`${name}: EXPLAIN failed — ${message}`);
      process.stdout.write(`FAILED: ${message}\n`);
    }
  }

  const outFile = `${outDir}/${ts}-${gitSha}-gate.json`;
  writeFileSync(outFile, JSON.stringify(results, null, 2));

  if (warnings.length > 0) {
    console.log('\n[check-query-plan] Warnings:');
    for (const w of warnings) console.log(`  ⚠️  ${w}`);
  }

  if (failures.length > 0) {
    console.error(`\n[check-query-plan] ❌ ${failures.length} failure(s) detected:`);
    for (const f of failures) console.error(`  ❌ ${f}`);
    console.error(`\nFull explain output: ${outFile}`);
    await pool.end();
    process.exit(1);
  }

  if (warnings.length === 0) {
    console.log(`\n[check-query-plan] ✅ All plans OK (${QUERIES.length} queries)`);
  } else {
    console.log(`\n[check-query-plan] ✅ No hard failures (${warnings.length} warning(s))`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error('[check-query-plan] Fatal:', e);
  process.exit(1);
});
