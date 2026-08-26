#!/usr/bin/env tsx

export {};

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

const baseUrl = (process.env.DEPLOY_VERIFY_URL || process.argv[2] || '').replace(/\/+$/, '');
const timeoutMs = Math.max(1000, Number(process.env.DEPLOY_VERIFY_TIMEOUT_MS || 30_000) || 30_000);
const readinessRetryMs = Math.max(
  1000,
  Number(process.env.DEPLOY_VERIFY_READINESS_RETRY_MS || 45_000) || 45_000,
);
const readinessRetryIntervalMs = Math.max(
  250,
  Number(process.env.DEPLOY_VERIFY_READINESS_RETRY_INTERVAL_MS || 1500) || 1500,
);

if (!baseUrl) {
  console.error('DEPLOY_VERIFY_URL is required, for example https://epstein.academy');
  process.exit(1);
}

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} did not return an object`);
  }
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeName(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function extractArray(body: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }
  if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    for (const key of keys) {
      const value = (body.data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as Record<string, unknown>[];
    }
  }
  return [];
}

function isJunkEntityName(value: unknown): boolean {
  const normalized = normalizeName(value);
  if (!normalized) return true;
  if (normalized === 'jeffrey epstein' || normalized === 'donald trump') return false;
  return [
    /^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\b[:\s-]*/i,
    /^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i,
    /\b(mon|tue|wed|thu|fri|sat|sun)\s*$/i,
    /\b([a-z]{3,})\s+\1\b/i,
    /\b(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\b/i,
    /\b(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\b/i,
    /^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\b/i,
    /\b(direction|provided)\s*$/i,
  ].some((regex) => regex.test(normalized));
}

async function getJson(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        signal: controller.signal,
      });
      const text = await response.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 120)}`);
      }
      assertObject(body, path);
      return { status: response.status, body };
    } catch (error) {
      throw new Error(`${path} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function check(name: string, fn: () => Promise<string>): Promise<CheckResult> {
  try {
    return { name, ok: true, detail: await fn() };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function eventually<T>(deadlineMs: number, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt <= deadlineMs) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(readinessRetryIntervalMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main() {
  // PM2 can return from `start --wait-ready` before a newly spawned process has
  // bound its port. Gate every contract probe behind the retrying readiness
  // check so a normal cold start does not produce a burst of connection errors.
  const readinessCheck = await check('readiness live data', async () => {
    return eventually(readinessRetryMs, async () => {
      const { status, body } = await getJson('/api/health/ready');
      assertObject(body.checks, 'readiness.checks');
      assertObject(body.checks.data, 'readiness.checks.data');
      const entities = asNumber(body.checks.data.entities);
      const documents = asNumber(body.checks.data.documents);
      if (status !== 200 || body.status !== 'ok') {
        throw new Error(`status=${status} readiness=${String(body.status)}`);
      }
      if (entities <= 0 || documents <= 0) {
        throw new Error(`core data unavailable: entities=${entities} documents=${documents}`);
      }
      return `entities=${entities} documents=${documents}`;
    });
  });

  if (!readinessCheck.ok) {
    console.log(`== LIVE CUTOVER VERIFICATION: ${baseUrl} ==`);
    console.log(`[FAIL] ${readinessCheck.name}`);
    console.log(`  ${readinessCheck.detail}`);
    console.error('\n[SUMMARY] failed=1 passed=0');
    process.exit(1);
  }

  const contractChecks = await Promise.all([
    check('basic health', async () => {
      const { status, body } = await getJson('/api/health');
      if (status !== 200 || body.status !== 'ok') {
        throw new Error(`status=${status} body.status=${String(body.status)}`);
      }
      return 'status=ok';
    }),

    check('postgres metadata', async () => {
      const { status, body } = await getJson('/api/_meta/db');
      if (status !== 200 || body.dialect !== 'postgres') {
        throw new Error(`status=${status} dialect=${String(body.dialect)}`);
      }
      return 'dialect=postgres';
    }),

    check('analytics data contract', async () => {
      const { status, body } = await getJson('/api/analytics/enhanced');
      assertObject(body.totalCounts, 'analytics.totalCounts');
      const entities = asNumber(body.totalCounts.entities);
      const documents = asNumber(body.totalCounts.documents);
      if (status !== 200 || entities <= 0 || documents <= 0) {
        throw new Error(`status=${status} entities=${entities} documents=${documents}`);
      }
      return `entities=${entities} documents=${documents}`;
    }),

    check('redactions endpoint contract', async () => {
      const { status, body } = await getJson(
        '/api/documents?hasFailedRedactions=true&sortBy=red_flag&sortOrder=desc&includeMedia=false&page=1&limit=1',
      );
      if (status !== 200 || !Array.isArray(body.data) || typeof body.total !== 'number') {
        throw new Error(
          `status=${status} dataIsArray=${Array.isArray(body.data)} total=${String(body.total)}`,
        );
      }
      return `total=${body.total}`;
    }),

    check('email threads endpoint contract', async () => {
      const { status, body } = await getJson(
        '/api/emails/threads?mailboxId=all&q=&tab=all&limit=5&showYahooPostMortem=1&showEmptyBodies=1&showSuppressedJunk=1',
      );
      assertObject(body.meta, 'emails.meta');
      const total = asNumber(body.meta.total);
      if (status !== 200 || !Array.isArray(body.data) || total <= 0) {
        throw new Error(`status=${status} dataIsArray=${Array.isArray(body.data)} total=${total}`);
      }
      return `threads=${body.data.length} total=${total}`;
    }),

    check('entity quality gates', async () => {
      const failures: string[] = [];
      for (const sortBy of ['red_flag', 'mentions']) {
        const { status, body } = await getJson(
          `/api/entities/subjects?page=1&limit=25&sortBy=${sortBy}`,
        );
        const subjects = extractArray(body, ['subjects', 'data', 'entities']);
        const names = subjects.map((subject) => subject.name ?? subject.fullName);
        if (status !== 200 || subjects.length < 2) {
          failures.push(`${sortBy}: status=${status} subjects=${subjects.length}`);
          continue;
        }
        if (
          normalizeName(names[0]) !== 'jeffrey epstein' ||
          normalizeName(names[1]) !== 'donald trump'
        ) {
          failures.push(`${sortBy}: top=${names.slice(0, 5).map(String).join(', ')}`);
        }
        const junk = names.find(isJunkEntityName);
        if (junk) failures.push(`${sortBy}: junk=${String(junk)}`);
      }

      const search = await getJson('/api/search?q=department&limit=25');
      const searchEntities = extractArray(search.body, ['entities']);
      const searchNames = searchEntities.map((entity) => entity.name ?? entity.fullName);
      const junkSearchEntity = searchNames.find(isJunkEntityName);
      if (junkSearchEntity) failures.push(`search: junk=${String(junkSearchEntity)}`);

      if (failures.length > 0) throw new Error(failures.join('; '));
      return 'Jeffrey Epstein=#1 Donald Trump=#2; no junk entity leakage';
    }),
  ]);
  const checks = [readinessCheck, ...contractChecks];

  console.log(`== LIVE CUTOVER VERIFICATION: ${baseUrl} ==`);
  for (const result of checks) {
    console.log(`${result.ok ? '[PASS]' : '[FAIL]'} ${result.name}`);
    console.log(`  ${result.detail}`);
  }

  const failures = checks.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error(
      `\n[SUMMARY] failed=${failures.length} passed=${checks.length - failures.length}`,
    );
    process.exit(1);
  }

  console.log(`\n[SUMMARY] passed=${checks.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
