/**
 * Local stack smoke tests — verifies the full dev stack (API + SPA) is healthy.
 *
 * These tests run against the live server (default: http://127.0.0.1:4173 web,
 * http://127.0.0.1:3312 API) and are intentionally broader than unit tests:
 * they ensure the routing, middleware, and database layer are all wired together
 * correctly. They do NOT test business logic — that lives in the contract tests.
 */

import { expect, test } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const API_BASE = process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getJson(request: import('@playwright/test').APIRequestContext, path: string) {
  const res = await request.get(`${API_BASE}${path}`, { timeout: 15_000 });
  return { res, body: await res.json() };
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Local stack smoke', () => {
  test.describe.configure({ mode: 'serial' });

  test('API readiness probe responds', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/stats/health/ready`, { timeout: 10_000 });
    // 200 = ready, 503 = degraded but alive — both are acceptable for smoke
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('status');
  });

  test('SPA root loads and mounts React', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Epstein/i);
    await expect(page.locator('#root')).toBeVisible();
    // Ensure no uncaught JS errors on initial load
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ERR_BLOCKED_BY_CLIENT') &&
        !e.includes('React DevTools'),
    );
    expect(critical, `Uncaught JS errors: ${critical.join('; ')}`).toHaveLength(0);
  });

  test('public stats endpoint returns required fields', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/stats');
    expect(res.ok()).toBeTruthy();
    expect(typeof body.totalEntities).toBe('number');
    expect(typeof body.totalDocuments).toBe('number');
    expect(body).toHaveProperty('_meta');
    expect(typeof body._meta.degraded).toBe('boolean');
  });

  test('subjects list returns paginated results', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/subjects?page=1&limit=5');
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(body.subjects)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  test('documents list returns paginated results', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/documents?page=1&limit=5');
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  test('flights endpoints are reachable', async ({ request }) => {
    const { res: listRes, body: listBody } = await getJson(request, '/api/flights?page=1&limit=5');
    expect(listRes.ok()).toBeTruthy();
    expect(Array.isArray(listBody.flights)).toBe(true);

    const { res: airportsRes } = await getJson(request, '/api/flights/airports');
    expect(airportsRes.ok()).toBeTruthy();
  });

  test('timeline events are reachable', async ({ request }) => {
    test.setTimeout(30_000);
    const { res, body } = await getJson(request, '/api/timeline');
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(body)).toBe(true);
  });

  test('black book entries are reachable', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/black-book?letter=A&limit=5');
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('properties list is reachable', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/properties?page=1&limit=5');
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(body.properties)).toBe(true);
  });

  test('graph global endpoint returns nodes and edges', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/graph/global?limit=10');
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(body.nodes)).toBe(true);
    expect(Array.isArray(body.edges)).toBe(true);
  });

  test('email mailboxes are reachable', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/emails/mailboxes');
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('analytics enhanced endpoint responds', async ({ request }) => {
    test.setTimeout(30_000);
    const { res, body } = await getJson(request, '/api/analytics/enhanced');
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(body.documentsByType)).toBe(true);
  });

  test('validation middleware rejects bad inputs with 400', async ({ request }) => {
    const badDate = await request.get(`${API_BASE}/api/flights?startDate=not-a-date`);
    expect(badDate.status()).toBe(400);
    const badDateBody = await badDate.json();
    expect(badDateBody).toHaveProperty('error');

    const badId = await request.get(`${API_BASE}/api/flights/notanumber`);
    expect(badId.status()).toBe(400);
  });

  test('unknown API routes return structured 404', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/this-does-not-exist`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
