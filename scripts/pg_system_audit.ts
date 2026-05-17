#!/usr/bin/env tsx
import pg from 'pg';

type CheckResult = {
  name: string;
  ok: boolean;
  warnings?: string[];
  details?: string[];
};

function qident(input: string): string {
  return `"${input.replace(/"/g, '""')}"`;
}

async function requireEnv(): Promise<string> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[pg_system_audit] DATABASE_URL is required');
    process.exit(1);
  }
  return url;
}

async function main() {
  const DATABASE_URL = await requireEnv();
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    application_name: 'pg-system-audit',
    max: 2,
  });
  const results: CheckResult[] = [];
  let hardFail = false;

  try {
    console.log('== PHASE 1: POSTGRES SYSTEM SANITY CHECK ==');

    // 1) Connectivity + version/settings
    {
      const name = 'Connectivity + version/settings';
      try {
        const settings = [
          ['version', 'SELECT version() AS value'],
          ['shared_buffers', 'SHOW shared_buffers'],
          ['work_mem', 'SHOW work_mem'],
          ['max_connections', 'SHOW max_connections'],
          ['jit', 'SHOW jit'],
          ['statement_timeout', 'SHOW statement_timeout'],
          ['lock_timeout', 'SHOW lock_timeout'],
        ] as const;
        const details: string[] = [];
        for (const [label, sql] of settings) {
          const res = await pool.query(sql);
          const first = res.rows[0];
          const value = first?.value ?? Object.values(first ?? {})[0];
          details.push(`${label}=${String(value)}`);
        }
        console.log('[PASS] connectivity');
        details.forEach((d) => console.log(`  ${d}`));
        results.push({ name, ok: true, details });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        hardFail = true;
        console.error(`[FAIL] ${name}: ${message}`);
        results.push({ name, ok: false, details: [message] });
      }
    }

    // 2) Extension verification
    {
      const name = 'Extension verification';
      try {
        const { rows } = await pool.query<{ extname: string }>(
          `SELECT extname FROM pg_extension ORDER BY extname`,
        );
        const names = rows.map((r) => r.extname);
        const ok = names.includes('pg_stat_statements');
        if (!ok) hardFail = true;
        console.log(ok ? '[PASS] extensions' : '[FAIL] extensions');
        console.log(`  installed=${names.join(', ')}`);
        if (!ok) console.log('  missing=pg_stat_statements');
        results.push({ name, ok, details: names });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        hardFail = true;
        console.error(`[FAIL] ${name}: ${message}`);
        results.push({ name, ok: false, details: [message] });
      }
    }

    // 3) Table integrity counts
    {
      const name = 'Table integrity counts';
      const tables = [
        'entities',
        'documents',
        'entity_mentions',
        'entity_relationships',
        'media_items',
      ];
      const details: string[] = [];
      let ok = true;
      for (const table of tables) {
        try {
          const { rows } = await pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM ${qident(table)}`,
          );
          details.push(`${table}=${rows[0]?.count ?? '0'}`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          ok = false;
          hardFail = true;
          details.push(`${table}=ERROR:${message}`);
        }
      }
      console.log(ok ? '[PASS] table counts' : '[FAIL] table counts');
      details.forEach((d) => console.log(`  ${d}`));
      results.push({ name, ok, details });
    }

    // 4) FK violations (all FK constraints in public/app schemas)
    {
      const name = 'Foreign key violations';
      try {
        const fkMeta = await pool.query<{
          oid: number;
          conname: string;
          src_schema: string;
          src_table: string;
          ref_schema: string;
          ref_table: string;
          conkey: number[];
          confkey: number[];
        }>(`
          SELECT
            c.oid,
            c.conname,
            sn.nspname AS src_schema,
            s.relname AS src_table,
            rn.nspname AS ref_schema,
            r.relname AS ref_table,
            c.conkey,
            c.confkey
          FROM pg_constraint c
          JOIN pg_class s ON s.oid = c.conrelid
          JOIN pg_namespace sn ON sn.oid = s.relnamespace
          JOIN pg_class r ON r.oid = c.confrelid
          JOIN pg_namespace rn ON rn.oid = r.relnamespace
          WHERE c.contype = 'f'
            AND sn.nspname IN ('public', 'app')
          ORDER BY sn.nspname, s.relname, c.conname
        `);

        const details: string[] = [];
        let ok = true;

        for (const fk of fkMeta.rows) {
          const srcAttrs = await pool.query<{ attnum: number; attname: string }>(
            `SELECT attnum, attname FROM pg_attribute WHERE attrelid = (
               SELECT conrelid FROM pg_constraint WHERE oid = $1
             ) AND attnum IN (SELECT unnest(conkey) FROM pg_constraint WHERE oid = $1)`,
            [fk.oid],
          );
          const refAttrs = await pool.query<{ attnum: number; attname: string }>(
            `SELECT attnum, attname FROM pg_attribute WHERE attrelid = (
               SELECT confrelid FROM pg_constraint WHERE oid = $1
             ) AND attnum IN (SELECT unnest(confkey) FROM pg_constraint WHERE oid = $1)`,
            [fk.oid],
          );

          const srcMap = new Map(srcAttrs.rows.map((r) => [r.attnum, r.attname]));
          const refMap = new Map(refAttrs.rows.map((r) => [r.attnum, r.attname]));
          const pairs = fk.conkey.map((srcAttnum, i) => ({
            src: srcMap.get(srcAttnum),
            ref: refMap.get(fk.confkey[i]),
          }));

          if (pairs.some((p) => !p.src || !p.ref)) {
            ok = false;
            hardFail = true;
            details.push(`${fk.conname}=ERROR:unable_to_resolve_columns`);
            continue;
          }

          const joinCond = pairs
            .map((p) => `s.${qident(p.src!)} = r.${qident(p.ref!)}`)
            .join(' AND ');
          const notNullCond = pairs.map((p) => `s.${qident(p.src!)} IS NOT NULL`).join(' AND ');
          const refNullCond = pairs.map((p) => `r.${qident(p.ref!)} IS NULL`).join(' AND ');
          const sql = `
            SELECT COUNT(*)::text AS n
            FROM ${qident(fk.src_schema)}.${qident(fk.src_table)} s
            LEFT JOIN ${qident(fk.ref_schema)}.${qident(fk.ref_table)} r
              ON ${joinCond}
            WHERE (${notNullCond}) AND (${refNullCond})
          `;
          const { rows } = await pool.query<{ n: string }>(sql);
          const n = Number(rows[0]?.n ?? 0);
          if (n > 0) {
            ok = false;
            hardFail = true;
            details.push(`${fk.conname}=${n} violations`);
          }
        }

        console.log(ok ? '[PASS] foreign keys' : '[FAIL] foreign keys');
        if (details.length === 0) console.log('  0 violations across all FK constraints');
        else details.forEach((d) => console.log(`  ${d}`));
        results.push({ name, ok, details });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        hardFail = true;
        console.error(`[FAIL] ${name}: ${message}`);
        results.push({ name, ok: false, details: [message] });
      }
    }

    // 5) Index usage check
    {
      const name = 'Index usage check';
      try {
        const { rows } = await pool.query<{
          index_name: string;
          idx_scan: string;
          bytes: string;
          pretty: string;
        }>(`
          SELECT
            i.indexrelid::regclass::text AS index_name,
            i.idx_scan::text AS idx_scan,
            pg_relation_size(i.indexrelid)::text AS bytes,
            pg_size_pretty(pg_relation_size(i.indexrelid)) AS pretty
          FROM pg_stat_user_indexes i
          ORDER BY i.idx_scan ASC, pg_relation_size(i.indexrelid) DESC
        `);
        const warnings = rows
          .filter((r) => Number(r.idx_scan) === 0 && Number(r.bytes) > 50 * 1024 * 1024)
          .map((r) => `unused_large_index ${r.index_name} size=${r.pretty} idx_scan=0`);
        console.log('[PASS] index usage snapshot');
        rows
          .slice(0, 15)
          .forEach((r) => console.log(`  ${r.index_name} idx_scan=${r.idx_scan} size=${r.pretty}`));
        warnings.forEach((w) => console.warn(`  [WARN] ${w}`));
        results.push({
          name,
          ok: true,
          warnings,
          details: rows.slice(0, 15).map((r) => r.index_name),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        hardFail = true;
        console.error(`[FAIL] ${name}: ${message}`);
        results.push({ name, ok: false, details: [message] });
      }
    }

    // 6) Dead tuple health
    {
      const name = 'Dead tuple health';
      try {
        const { rows } = await pool.query<{
          relname: string;
          n_dead_tup: string;
          dead_pct: string | null;
        }>(`
          SELECT
            relname,
            n_dead_tup::text AS n_dead_tup,
            ROUND(n_dead_tup::numeric / NULLIF(n_live_tup,0)*100,1)::text AS dead_pct
          FROM pg_stat_user_tables
          ORDER BY COALESCE(n_dead_tup::numeric / NULLIF(n_live_tup,0), 0) DESC NULLS LAST
        `);
        const warnings = rows
          .filter((r) => Number(r.dead_pct ?? 0) > 10)
          .map((r) => `${r.relname} dead_pct=${r.dead_pct}% n_dead_tup=${r.n_dead_tup}`);
        console.log('[PASS] dead tuple snapshot');
        rows
          .slice(0, 15)
          .forEach((r) =>
            console.log(
              `  ${r.relname} n_dead_tup=${r.n_dead_tup} dead_pct=${r.dead_pct ?? 'null'}`,
            ),
          );
        warnings.forEach((w) => console.warn(`  [WARN] ${w}`));
        results.push({
          name,
          ok: true,
          warnings,
          details: rows.slice(0, 15).map((r) => r.relname),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        hardFail = true;
        console.error(`[FAIL] ${name}: ${message}`);
        results.push({ name, ok: false, details: [message] });
      }
    }

    // 7) Long-running transactions
    {
      const name = 'Long-running transactions';
      try {
        const { rows } = await pool.query<{
          pid: number;
          state: string;
          duration: string;
          application_name: string | null;
          query: string;
        }>(`
          SELECT
            pid,
            state,
            (now() - xact_start)::text AS duration,
            application_name,
            COALESCE(query, '') AS query
          FROM pg_stat_activity
          WHERE state <> 'idle'
            AND xact_start IS NOT NULL
            AND now() - xact_start > interval '10 seconds'
            AND pid <> pg_backend_pid()
          ORDER BY now() - xact_start DESC
        `);
        const ok = rows.length === 0;
        if (!ok) hardFail = true;
        console.log(ok ? '[PASS] long-running tx' : '[FAIL] long-running tx');
        if (ok) console.log('  no active transactions >10s');
        rows.forEach((r) =>
          console.log(
            `  pid=${r.pid} state=${r.state} duration=${r.duration} app=${r.application_name ?? ''}`,
          ),
        );
        results.push({ name, ok, details: rows.map((r) => `${r.pid}:${r.duration}`) });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        hardFail = true;
        console.error(`[FAIL] ${name}: ${message}`);
        results.push({ name, ok: false, details: [message] });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    console.log(`\n[SUMMARY] checks=${results.length} pass=${okCount} fail=${failCount}`);
  } finally {
    await pool.end().catch(() => {});
  }

  if (hardFail) process.exit(1);
}

main().catch((err) => {
  console.error('[pg_system_audit] fatal:', err);
  process.exit(1);
});
