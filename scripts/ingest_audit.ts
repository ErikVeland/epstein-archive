#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import pg from 'pg';

type AuditCheck = { name: string; ok: boolean; details: string[] };

const ROOT = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.resolve(ROOT, file), 'utf8');
}

function fail(msg: string): never {
  console.error(`[ingest_audit] ${msg}`);
  process.exit(1);
}

async function withPg<T>(fn: (pool: pg.Pool) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) fail('DATABASE_URL is required for ingestion runtime audit');
  const pool = new pg.Pool({ connectionString: url, application_name: 'ingest-audit', max: 2 });
  try {
    return await fn(pool);
  } finally {
    await pool.end().catch(() => {});
  }
}

function parseIngestPoolConfig(connectionSource: string): {
  found: boolean;
  maxExpr: string | null;
} {
  const match = connectionSource.match(
    /ingress:\s*parseInt\(process\.env\.INGEST_POOL_MAX\s*\?\?\s*'(\d+)'\)/,
  );
  if (match) return { found: true, maxExpr: match[1] };
  return { found: /INGEST_POOL_MAX/.test(connectionSource), maxExpr: null };
}

async function main() {
  console.log('== PHASE 2: INGESTION PIPELINE AUDIT ==');

  const checks: AuditCheck[] = [];
  let hardFail = false;

  const ingestScript = read('scripts/ingest_pipeline.ts');
  const connectionSrc = read('src/server/db/connection.ts');
  const matViewSrc = read('src/server/services/matViewRefresh.ts');

  // 1) Simulate ingest batch in transaction (control transaction + ON CONFLICT semantics)
  try {
    await withPg(async (pool) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'CREATE TEMP TABLE IF NOT EXISTS _ingest_audit_temp (k text primary key, v int not null)',
        );
        await client.query('INSERT INTO _ingest_audit_temp (k, v) VALUES ($1, $2)', ['doc-1', 1]);
        await client.query(
          'INSERT INTO _ingest_audit_temp (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v',
          ['doc-1', 2],
        );
        const { rows } = await client.query<{ v: number }>(
          'SELECT v FROM _ingest_audit_temp WHERE k=$1',
          ['doc-1'],
        );
        if (rows[0]?.v !== 2) throw new Error('ON CONFLICT control simulation failed');
        await client.query('ROLLBACK');
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    });
    checks.push({
      name: 'Simulate ingest batch in transaction',
      ok: true,
      details: ['control transaction + ON CONFLICT simulation passed (ROLLBACK)'],
    });
    console.log('[PASS] transaction control simulation');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    hardFail = true;
    checks.push({
      name: 'Simulate ingest batch in transaction',
      ok: false,
      details: [message],
    });
    console.error(`[FAIL] transaction control simulation: ${message}`);
  }

  // 2) Duplicate row checks + upsert patterns
  try {
    const details: string[] = [];
    await withPg(async (pool) => {
      const duplicateQueries: Array<{ label: string; sql: string }> = [
        {
          label: 'documents.file_path',
          sql: `SELECT file_path::text AS key, COUNT(*)::int AS n
                FROM documents
                WHERE file_path IS NOT NULL
                GROUP BY file_path
                HAVING COUNT(*) > 1
                ORDER BY COUNT(*) DESC
                LIMIT 5`,
        },
        {
          label: 'documents.content_sha256',
          sql: `SELECT content_sha256::text AS key, COUNT(*)::int AS n
                FROM documents
                WHERE content_sha256 IS NOT NULL
                GROUP BY content_sha256
                HAVING COUNT(*) > 1
                ORDER BY COUNT(*) DESC
                LIMIT 5`,
        },
      ];

      for (const q of duplicateQueries) {
        try {
          const { rows } = await pool.query<{ key: string; n: number }>(q.sql);
          if (rows.length > 0) {
            rows.forEach((r) => details.push(`duplicate ${q.label} key=${r.key} count=${r.n}`));
          } else {
            details.push(`no duplicates on ${q.label}`);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          details.push(`skipped ${q.label}: ${message}`);
        }
      }

      // Entity duplicates are domain-specific; use exact-name heuristic and report only.
      try {
        const { rows } = await pool.query<{ key: string; n: number }>(`
          SELECT lower(trim(full_name)) AS key, COUNT(*)::int AS n
          FROM entities
          WHERE full_name IS NOT NULL AND trim(full_name) <> ''
          GROUP BY lower(trim(full_name))
          HAVING COUNT(*) > 1
          ORDER BY COUNT(*) DESC
          LIMIT 5
        `);
        if (rows.length) {
          rows.forEach((r) =>
            details.push(`duplicate entities.full_name key=${r.key} count=${r.n}`),
          );
        } else {
          details.push('no duplicates on entities.full_name heuristic');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        details.push(`skipped entities duplicate heuristic: ${message}`);
      }
    });

    const hasOnConflict =
      /ON CONFLICT/i.test(ingestScript) ||
      /ON CONFLICT/i.test(read('src/server/services/pipelineService.ts')) ||
      /ON CONFLICT/i.test(read('src/server/services/assetService.ts'));
    if (!hasOnConflict) details.push('missing ON CONFLICT patterns in ingest-adjacent code');

    const duplicateFindings = details.filter((d) => d.startsWith('duplicate documents.file_path'));
    const ok = duplicateFindings.length === 0 && hasOnConflict;
    if (!ok) hardFail = true;
    checks.push({ name: 'Duplicate row + upsert audit', ok, details });
    console.log(ok ? '[PASS] duplicates/upserts' : '[FAIL] duplicates/upserts');
    details.forEach((d) => console.log(`  ${d}`));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    hardFail = true;
    checks.push({ name: 'Duplicate row + upsert audit', ok: false, details: [message] });
    console.error(`[FAIL] duplicates/upserts: ${message}`);
  }

  // 3) Pool usage / max / maintenance bypass (static + runtime)
  {
    const details: string[] = [];
    let ok = true;
    const usesGetDb =
      /import\s+\{[^}]*getDb[^}]*\}\s+from\s+['"]\.\.\/src\/server\/db\/connection\.js['"]/.test(
        ingestScript,
      );
    const usesIngestPoolAccessor = /get(Ingress|Ingest)Pool/.test(ingestScript);
    const usesIngestDbAccessor = /get(Ingest|Ingress)Db/.test(ingestScript);
    if (usesGetDb && !usesIngestPoolAccessor && !usesIngestDbAccessor) {
      ok = false;
      details.push(
        'ingest_pipeline.ts imports getDb() (API wrapper path) and does not use ingest pool accessor',
      );
    } else {
      details.push('ingest_pipeline.ts uses dedicated ingest pool/db accessor');
    }

    const poolCfg = parseIngestPoolConfig(connectionSrc);
    if (!poolCfg.found) {
      ok = false;
      details.push('INGEST_POOL_MAX configuration not found');
    } else {
      details.push(`INGEST_POOL_MAX configured (default=${poolCfg.maxExpr ?? 'unknown'})`);
    }

    if (/REFRESH MATERIALIZED VIEW/.test(matViewSrc) && /getMaintenancePool\(\)/.test(matViewSrc)) {
      details.push('matViewRefresh uses maintenancePool');
    } else {
      ok = false;
      details.push(
        'matViewRefresh does not prove maintenancePool usage for REFRESH MATERIALIZED VIEW',
      );
    }

    try {
      const runtime = await withPg(async (pool) => {
        const { rows } = await pool.query<{ total: string }>(`
          SELECT COUNT(*)::text AS total
          FROM pg_stat_activity
          WHERE application_name = 'epstein-ingest'
        `);
        return Number(rows[0]?.total ?? 0);
      });
      details.push(`pg_stat_activity epstein-ingest sessions=${runtime}`);
      const configuredMax = Number(poolCfg.maxExpr ?? NaN);
      if (Number.isFinite(configuredMax) && runtime > configuredMax) {
        ok = false;
        details.push(`ingest sessions exceed configured max (${runtime} > ${configuredMax})`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ok = false;
      details.push(`runtime ingest pool check failed: ${message}`);
    }

    if (!ok) hardFail = true;
    checks.push({ name: 'Pool usage / max / maintenance bypass', ok, details });
    console.log(ok ? '[PASS] pool usage' : '[FAIL] pool usage');
    details.forEach((d) => console.log(`  ${d}`));
  }

  // 4) idle-in-transaction after ingest completes (runtime snapshot)
  {
    const details: string[] = [];
    let ok = true;
    try {
      const rows = await withPg(async (pool) => {
        const res = await pool.query<{
          pid: number;
          application_name: string | null;
          state: string;
          xact_age: string;
        }>(`
          SELECT pid, application_name, state, (now() - xact_start)::text AS xact_age
          FROM pg_stat_activity
          WHERE state = 'idle in transaction'
            AND pid <> pg_backend_pid()
          ORDER BY xact_start NULLS LAST
        `);
        return res.rows;
      });
      if (rows.length > 0) {
        ok = false;
        rows.forEach((r) =>
          details.push(`idle-in-tx pid=${r.pid} app=${r.application_name ?? ''} age=${r.xact_age}`),
        );
      } else {
        details.push('0 idle-in-transaction sessions');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ok = false;
      details.push(message);
    }
    if (!ok) hardFail = true;
    checks.push({ name: 'Idle in transaction check', ok, details });
    console.log(ok ? '[PASS] idle-in-transaction' : '[FAIL] idle-in-transaction');
    details.forEach((d) => console.log(`  ${d}`));
  }

  // 5) ANALYZE + matview dirty semantics (static)
  {
    const details: string[] = [];
    let ok = true;

    const analyzePostIngest = /ANALYZE/i.test(ingestScript);
    if (analyzePostIngest) details.push('ANALYZE statement present in ingest pipeline');
    else {
      ok = false;
      details.push(
        'ANALYZE not found in ingest pipeline (post-ingest planner stats update not guaranteed)',
      );
    }

    const markDirtyUsedAnywhere =
      /markViewsDirty\(/.test(read('src/server/services/matViewRefresh.ts')) &&
      fs
        .readdirSync(path.resolve(ROOT, 'src/server/services'))
        .some((name) =>
          name !== 'matViewRefresh.ts'
            ? /markViewsDirty\(/.test(
                fs.readFileSync(path.resolve(ROOT, 'src/server/services', name), 'utf8'),
              )
            : false,
        );
    if (!markDirtyUsedAnywhere && !/markViewsDirty\(/.test(ingestScript)) {
      ok = false;
      details.push('materialized views are not marked dirty from ingest path');
    } else {
      details.push('markViewsDirty is invoked from ingest-adjacent code');
    }

    if (
      /getApiPool\(\)/.test(matViewSrc) &&
      /waitingCount/.test(matViewSrc) &&
      /getMaintenancePool\(\)/.test(matViewSrc)
    ) {
      details.push('matview refresh defers under API pressure and executes on maintenancePool');
    } else {
      ok = false;
      details.push('matview refresh pressure/delegation semantics not proven');
    }

    if (!ok) hardFail = true;
    checks.push({ name: 'ANALYZE + matview post-ingest behavior', ok, details });
    console.log(ok ? '[PASS] post-ingest maintenance' : '[FAIL] post-ingest maintenance');
    details.forEach((d) => console.log(`  ${d}`));
  }

  const summary = {
    pass: checks.filter((c) => c.ok).length,
    fail: checks.filter((c) => !c.ok).length,
    checks: checks.length,
  };
  console.log(`\n[SUMMARY] checks=${summary.checks} pass=${summary.pass} fail=${summary.fail}`);
  if (hardFail) process.exit(1);
}

main().catch((err) => {
  console.error('[ingest_audit] fatal:', err);
  process.exit(1);
});
