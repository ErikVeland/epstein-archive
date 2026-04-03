#!/usr/bin/env tsx
import pg from 'pg';

type StressSummary = {
  endpointCounts: Record<string, { total: number; ok: number; s503: number; other: number }>;
  total503: number;
  recovered: boolean;
  poolWaitingZero: boolean;
  idleInTransactionZero: boolean;
  hotQueryMeanUnder300: boolean;
  noProcessCrash: boolean;
  noUnhandledRejectionObserved: boolean;
  planRegressionPass: boolean;
  poolSafetyPass: boolean;
};

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3012';
const CONCURRENCY_PER_ENDPOINT = Number(process.env.STRESS_CONCURRENCY ?? 25);
const ENDPOINTS = [
  '/api/analytics/enhanced',
  '/api/search?q=epstein',
  '/api/graph/global',
] as const;

async function fetchOnce(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    await res.text().catch(() => '');
    return { ok: true, status: res.status };
  } catch (err: unknown) {
    return { ok: false, status: -1, error: (err as Error)?.message || String(err) };
  }
}

async function getMeta() {
  const res = await fetch(`${API_BASE_URL}/api/_meta/db`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`_meta/db status=${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

async function getHealth(url = `${API_BASE_URL}/api/health`) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function waitForRecovery(): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    try {
      const h = await getHealth();
      if (h.status === 200 && h.body?.status === 'ok') return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function queryPgChecks(): Promise<{
  idleInTransactionZero: boolean;
  hotQueryMeanUnder300: boolean;
}> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required for pg_stat_activity / pg_stat_statements validation',
    );
  }
  const pool = new pg.Pool({ connectionString: url, application_name: 'stress-check', max: 2 });
  try {
    const idleRes = await pool.query<{ n: string }>(`
      SELECT COUNT(*)::text AS n
      FROM pg_stat_activity
      WHERE state = 'idle in transaction'
        AND pid <> pg_backend_pid()
    `);
    const idleInTransactionZero = Number(idleRes.rows[0]?.n ?? 0) === 0;

    const extRes = await pool.query<{ extname: string }>(
      `SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements'`,
    );
    if (extRes.rows.length === 0) {
      throw new Error('pg_stat_statements extension not installed');
    }

    const hotRes = await pool.query<{ mean_exec_time: string }>(
      `
      SELECT COALESCE(MAX(mean_exec_time), 0)::text AS mean_exec_time
      FROM pg_stat_statements
      WHERE query ILIKE ANY($1)
    `,
      [
        [
          '%FROM mv_top_connected%',
          '%websearch_to_tsquery%',
          '%FROM entity_relationships%',
          '%FROM entities%',
          '%FROM documents%',
        ],
      ],
    );
    const maxMean = Number(hotRes.rows[0]?.mean_exec_time ?? 0);
    const hotQueryMeanUnder300 = maxMean < 300;
    return { idleInTransactionZero, hotQueryMeanUnder300 };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  console.log('== PHASE 4: INGEST + QUERY PLAN STRESS TEST ==');
  console.log(`base=${API_BASE_URL} concurrency_per_endpoint=${CONCURRENCY_PER_ENDPOINT}`);

  const endpointCounts: StressSummary['endpointCounts'] = {};
  ENDPOINTS.forEach((e) => (endpointCounts[e] = { total: 0, ok: 0, s503: 0, other: 0 }));

  const tasks: Promise<{ ok: boolean; status: number; error?: string }>[] = [];
  for (const endpoint of ENDPOINTS) {
    for (let i = 0; i < CONCURRENCY_PER_ENDPOINT; i++) {
      tasks.push(
        fetchOnce(`${API_BASE_URL}${endpoint}`).then((r) => {
          const bucket = endpointCounts[endpoint];
          bucket.total++;
          if (r.ok && r.status >= 200 && r.status < 300) bucket.ok++;
          else if (r.status === 503) bucket.s503++;
          else bucket.other++;
          return r;
        }),
      );
    }
  }

  const settled = await Promise.all(tasks);
  const total503 = settled.filter((r) => r.status === 503).length;
  const connectionErrors = settled.filter((r) => !r.ok && r.status === -1);

  const recovered = await waitForRecovery();
  let poolWaitingZero = false;
  let noProcessCrash = recovered;
  try {
    const meta = await getMeta();
    const pools = (meta?.pools || {}) as Record<string, Record<string, { waiting?: number }>>;
    poolWaitingZero = Number(pools.api?.waiting ?? -1) === 0;
  } catch (err: unknown) {
    console.error(`[WARN] meta check failed: ${(err as Error)?.message}`);
    noProcessCrash = false;
  }

  let idleInTransactionZero = false;
  let hotQueryMeanUnder300 = false;
  try {
    const pgChecks = await queryPgChecks();
    idleInTransactionZero = pgChecks.idleInTransactionZero;
    hotQueryMeanUnder300 = pgChecks.hotQueryMeanUnder300;
  } catch (err: unknown) {
    console.error(`[FAIL] postgres post-stress checks: ${(err as Error)?.message}`);
  }

  // "No unhandled promise rejection" cannot be directly proven externally; infer from process survival + recovery.
  const noUnhandledRejectionObserved = recovered && connectionErrors.length === 0;

  const planRegressionPass = hotQueryMeanUnder300;
  const poolSafetyPass = total503 >= 1 && poolWaitingZero && idleInTransactionZero && recovered;

  const summary: StressSummary = {
    endpointCounts,
    total503,
    recovered,
    poolWaitingZero,
    idleInTransactionZero,
    hotQueryMeanUnder300,
    noProcessCrash,
    noUnhandledRejectionObserved,
    planRegressionPass,
    poolSafetyPass,
  };

  Object.entries(endpointCounts).forEach(([ep, s]) => {
    console.log(`[RESULT] ${ep} total=${s.total} ok=${s.ok} 503=${s.s503} other=${s.other}`);
  });
  console.log(`[RESULT] total503=${total503}`);
  console.log(`[RESULT] recovered=${recovered}`);
  console.log(`[RESULT] poolWaitingZero=${poolWaitingZero}`);
  console.log(`[RESULT] idleInTransactionZero=${idleInTransactionZero}`);
  console.log(`[RESULT] hotQueryMeanUnder300=${hotQueryMeanUnder300}`);
  console.log(`[RESULT] noProcessCrash=${noProcessCrash}`);
  console.log(`[RESULT] noUnhandledRejectionObserved=${noUnhandledRejectionObserved} (inferred)`);
  console.log(`STRESS_CHECK_SUMMARY_JSON=${JSON.stringify(summary)}`);

  const failures: string[] = [];
  if (total503 < 1) failures.push('expected >=1 HTTP 503 under saturation test');
  if (!recovered) failures.push('API did not recover after stress');
  if (!poolWaitingZero) failures.push('pool.waitingCount did not return to 0');
  if (!idleInTransactionZero) failures.push('idle-in-transaction sessions remain');
  if (!hotQueryMeanUnder300) failures.push('pg_stat_statements hot query mean_exec_time >= 300ms');
  if (!noProcessCrash) failures.push('process crash or meta endpoint unavailable after stress');

  if (failures.length) {
    failures.forEach((f) => console.error(`[FAIL] ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[stress_check] fatal:', err);
  process.exit(1);
});
