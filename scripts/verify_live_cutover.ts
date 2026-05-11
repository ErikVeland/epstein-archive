#!/usr/bin/env tsx

export {};

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

const baseUrl = (process.env.DEPLOY_VERIFY_URL || process.argv[2] || '').replace(/\/+$/, '');
const timeoutMs = Math.max(1000, Number(process.env.DEPLOY_VERIFY_TIMEOUT_MS || 12_000) || 12_000);

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

async function getJson(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

async function main() {
  const checks = await Promise.all([
    check('basic health', async () => {
      const { status, body } = await getJson('/api/health');
      if (status !== 200 || body.status !== 'ok') {
        throw new Error(`status=${status} body.status=${String(body.status)}`);
      }
      return 'status=ok';
    }),

    check('readiness live data', async () => {
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
  ]);

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
