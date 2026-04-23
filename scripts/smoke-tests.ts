/**
 * HTTP smoke tests — fast, no browser required.
 *
 * Run via: pnpm test:smoke
 * Requires the API server to be running on API_BASE_URL (default: http://127.0.0.1:3012).
 *
 * Each probe hits a real endpoint and verifies:
 *   - HTTP status is in the expected range
 *   - Response body has the required top-level keys
 *
 * Exits 0 if all pass, 1 on the first failure (fast-fail).
 */

const API_BASE = process.env.PW_API_BASE_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? 3012}`;
const TIMEOUT_MS = 10_000;

interface Probe {
  label: string;
  path: string;
  expectedStatus?: number | number[];
  /** Top-level keys that must be present in the JSON body */
  requiredKeys?: string[];
  /** Minimum array length when the body is an array */
  minArrayLength?: number;
  /** Skip this probe if the key is missing from process.env */
  requiresEnv?: string;
}

const PROBES: Probe[] = [
  // ── Health / readiness ──────────────────────────────────────────────────────
  {
    label: 'readiness probe (deep)',
    path: '/api/health/ready',
    expectedStatus: [200, 503],
    requiredKeys: ['status', 'checks'],
  },
  {
    label: 'readiness probe (soft)',
    path: '/api/health/ready?soft=1',
    expectedStatus: 200,
    requiredKeys: ['status', 'checks'],
  },
  {
    label: 'health check (stats)',
    path: '/api/stats/health',
    expectedStatus: [200, 503],
    requiredKeys: ['status', 'database'],
  },
  {
    label: 'health check (root)',
    path: '/api/health',
    expectedStatus: 200,
    requiredKeys: ['status'],
  },

  // ── Public stats ────────────────────────────────────────────────────────────
  {
    label: 'public stats',
    path: '/api/stats',
    expectedStatus: 200,
    requiredKeys: ['totalEntities', 'totalDocuments', '_meta'],
  },

  // ── Entities / subjects ─────────────────────────────────────────────────────
  {
    label: 'subjects list',
    path: '/api/subjects?page=1&limit=1',
    expectedStatus: 200,
    requiredKeys: ['subjects', 'total'],
  },
  {
    label: 'entities list',
    path: '/api/entities?page=1&limit=1',
    expectedStatus: 200,
    requiredKeys: ['data', 'total'],
  },

  // ── Documents ───────────────────────────────────────────────────────────────
  {
    label: 'documents list',
    path: '/api/documents?page=1&limit=1',
    expectedStatus: 200,
    requiredKeys: ['data', 'total'],
  },

  // ── Flights ─────────────────────────────────────────────────────────────────
  {
    label: 'flights list',
    path: '/api/flights?page=1&limit=1',
    expectedStatus: 200,
    requiredKeys: ['flights', 'total'],
  },
  {
    label: 'flights airports',
    path: '/api/flights/airports',
    expectedStatus: 200,
  },
  {
    label: 'flights co-occurrences',
    path: '/api/flights/co-occurrences?minFlights=2&limit=5',
    expectedStatus: 200,
  },

  // ── Timeline ────────────────────────────────────────────────────────────────
  {
    label: 'timeline events',
    path: '/api/timeline',
    expectedStatus: 200,
  },

  // ── Black book ──────────────────────────────────────────────────────────────
  {
    label: 'black book entries',
    path: '/api/black-book?letter=A&limit=5',
    expectedStatus: 200,
    requiredKeys: ['data', 'total'],
  },

  // ── Properties ──────────────────────────────────────────────────────────────
  {
    label: 'properties list',
    path: '/api/properties?page=1&limit=1',
    expectedStatus: 200,
    requiredKeys: ['properties', 'total'],
  },
  {
    label: 'properties stats',
    path: '/api/properties/stats',
    expectedStatus: 200,
    requiredKeys: ['totalProperties'],
  },

  // ── Graph ───────────────────────────────────────────────────────────────────
  {
    label: 'graph global',
    path: '/api/graph/global?limit=10',
    expectedStatus: 200,
    requiredKeys: ['nodes', 'edges'],
  },

  // ── Analytics ───────────────────────────────────────────────────────────────
  {
    label: 'analytics enhanced',
    path: '/api/analytics/enhanced',
    expectedStatus: 200,
    requiredKeys: ['documentsByType', 'topConnectedEntities'],
  },

  // ── Emails ──────────────────────────────────────────────────────────────────
  {
    label: 'email mailboxes',
    path: '/api/emails/mailboxes',
    expectedStatus: 200,
    requiredKeys: ['data'],
  },

  // ── Map ─────────────────────────────────────────────────────────────────────
  {
    label: 'map entities',
    path: '/api/map/entities',
    expectedStatus: 200,
  },

  // ── Validation rejects ──────────────────────────────────────────────────────
  {
    label: 'validation rejects bad flight id',
    path: '/api/flights/notanumber',
    expectedStatus: 400,
    requiredKeys: ['error'],
  },
  {
    label: 'validation rejects bad date format',
    path: '/api/flights?startDate=not-a-date',
    expectedStatus: 400,
    requiredKeys: ['error'],
  },
  {
    label: 'API 404 returns structured error',
    path: '/api/this-route-does-not-exist',
    expectedStatus: 404,
    requiredKeys: ['error'],
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function statusMatches(actual: number, expected: number | number[] | undefined): boolean {
  if (expected === undefined) return actual >= 200 && actual < 600;
  if (Array.isArray(expected)) return expected.includes(actual);
  return actual === expected;
}

async function runProbe(probe: Probe): Promise<string | null> {
  if (probe.requiresEnv && !process.env[probe.requiresEnv]) {
    return null; // skip
  }

  const url = `${API_BASE}${probe.path}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (err) {
    return `FAIL [${probe.label}] — network error: ${err instanceof Error ? err.message : String(err)}`;
  }

  if (!statusMatches(res.status, probe.expectedStatus)) {
    return `FAIL [${probe.label}] — expected status ${JSON.stringify(probe.expectedStatus)}, got ${res.status} (${url})`;
  }

  if (probe.requiredKeys && probe.requiredKeys.length > 0) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return `FAIL [${probe.label}] — response is not valid JSON (${url})`;
    }

    if (Array.isArray(body)) {
      if (probe.minArrayLength !== undefined && body.length < probe.minArrayLength) {
        return `FAIL [${probe.label}] — expected array length >= ${probe.minArrayLength}, got ${body.length}`;
      }
    } else if (body && typeof body === 'object') {
      const missing = probe.requiredKeys.filter((k) => !(k in (body as Record<string, unknown>)));
      if (missing.length > 0) {
        return `FAIL [${probe.label}] — missing keys: ${missing.join(', ')} (${url})`;
      }
    } else {
      return `FAIL [${probe.label}] — expected JSON object, got ${typeof body} (${url})`;
    }
  }

  return null;
}

async function main() {
  console.log(`\nSmoke tests → ${API_BASE}\n`);

  let passed = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const probe of PROBES) {
    const error = await runProbe(probe);
    if (error === null && probe.requiresEnv && !process.env[probe.requiresEnv]) {
      console.log(`  ⏭  [${probe.label}] (skipped — ${probe.requiresEnv} not set)`);
      skipped++;
    } else if (error) {
      console.error(`  ✗  ${error}`);
      failures.push(error);
    } else {
      console.log(`  ✓  ${probe.label}`);
      passed++;
    }
  }

  console.log(`\n${passed} passed, ${failures.length} failed, ${skipped} skipped\n`);

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Smoke test runner crashed:', err);
  process.exit(1);
});
