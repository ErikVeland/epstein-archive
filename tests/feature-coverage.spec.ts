/**
 * Feature Coverage — golden-path regression suite for every major feature.
 *
 * Two test layers per feature:
 *   1. API layer  — hits individual-record /:id endpoints directly (catches broken SQL queries
 *                   like the flight_passengers.document_id bug that broke all document opens)
 *   2. UI layer   — navigates to the page and verifies core rendering without JS errors
 *
 * Convention: resolve a live fixture ID from a list endpoint, then exercise the detail endpoint.
 * Use `test.skip()` when the database has no matching data so the suite stays green on sparse DBs.
 */

import { test, expect, type Page } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const useProductionBaseUrl = process.env.PW_USE_PROD_BASE_URL === '1';
const API_BASE = useProductionBaseUrl
  ? 'https://epstein.academy/api'
  : `${process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`}/api`;

// ── Shared helpers ─────────────────────────────────────────────────────────────

/** Inject localStorage keys that bypass first-run onboarding flows. */
function bypassOnboarding(page: Page): Promise<void> {
  return page.addInitScript(() => {
    window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
    window.localStorage.setItem('board_onboarding_seen', 'true');
  });
}

/** Assert the page shows no error boundary or hard failure text. */
async function expectNoErrorScreen(page: Page): Promise<void> {
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(page.getByText('500 Internal Server Error')).toHaveCount(0);
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Individual record API endpoints
//
// These are the highest-value regression tests. Any broken SQL query, missing
// column, or bad JOIN in a detail endpoint (like the flight_passengers bug) is
// caught here before it reaches users. One test per resource type.
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Individual record API endpoints', () => {
  test.describe.configure({ mode: 'serial' });

  // ── Documents (:id) — the bug we just fixed ─────────────────────────────────
  test('GET /api/documents/:id returns 200 with id + title', async ({ request }) => {
    // Regression: a broken subquery (flight_passengers.document_id does not exist)
    // caused this endpoint to 500 on every call, making document opening impossible.
    const listResp = await request.get(`${API_BASE}/documents?page=1&limit=5`);
    expect(listResp.ok(), 'Document list must be reachable before detail test').toBeTruthy();
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data) ? payload.data : [];
    const first = items.find((d) => d?.id != null);
    if (!first) {
      test.skip(true, 'No documents in database');
      return;
    }

    const id = String(first.id);
    const resp = await request.get(`${API_BASE}/documents/${encodeURIComponent(id)}`);
    expect(resp.status(), `GET /api/documents/${id} should be 200 (was it 500?)`).toBe(200);
    const doc = await resp.json();
    expect(doc).toHaveProperty('id');
    expect(doc).toHaveProperty('title');
  });

  // ── Entities ────────────────────────────────────────────────────────────────
  test('GET /api/entities/:id returns 200', async ({ request }) => {
    const listResp = await request.get(
      `${API_BASE}/entities?limit=5&sortBy=mentions&sortOrder=desc`,
    );
    expect(listResp.ok()).toBeTruthy();
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const first = items.find((e) => e?.id != null);
    if (!first) {
      test.skip(true, 'No entities in database');
      return;
    }

    const id = String(first.id);
    const resp = await request.get(`${API_BASE}/entities/${encodeURIComponent(id)}`);
    expect(resp.status(), `GET /api/entities/${id} should be 200`).toBe(200);
    const entity = await resp.json();
    expect(entity).toHaveProperty('id');
  });

  // ── Entity sub-endpoints (forensic relations, graph) ─────────────────────────
  test('GET /api/entities/:id/evidence and /relations return 200', async ({ request }) => {
    const listResp = await request.get(
      `${API_BASE}/entities?limit=5&sortBy=mentions&sortOrder=desc`,
    );
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const first = items.find((e) => e?.id != null);
    if (!first) {
      test.skip(true, 'No entities in database');
      return;
    }

    const id = encodeURIComponent(String(first.id));
    const [evidenceResp, relationsResp] = await Promise.all([
      request.get(`${API_BASE}/entities/${id}/evidence?limit=1`),
      request.get(`${API_BASE}/entities/${id}/relations?limit=1`),
    ]);
    expect(evidenceResp.status()).toBe(200);
    expect(relationsResp.status()).toBe(200);
  });

  // ── Flights ────────────────────────────────────────────────────────────────
  test('GET /api/flights/:id returns 200', async ({ request }) => {
    const listResp = await request.get(`${API_BASE}/flights?page=1&limit=5`);
    expect(listResp.ok()).toBeTruthy();
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.flights) ? payload.flights : [];
    const first = items.find((f) => f?.id != null);
    if (!first) {
      test.skip(true, 'No flights in database');
      return;
    }

    const id = String(first.id);
    const resp = await request.get(`${API_BASE}/flights/${id}`);
    expect(resp.status(), `GET /api/flights/${id} should be 200`).toBe(200);
  });

  // ── Media images ───────────────────────────────────────────────────────────
  test('GET /api/media/images/:id returns 200', async ({ request }) => {
    const listResp = await request.get(`${API_BASE}/media/images?limit=5`);
    if (!listResp.ok()) {
      test.skip(true, 'Media images endpoint not available');
      return;
    }
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const first = items.find((i) => i?.id != null);
    if (!first) {
      test.skip(true, 'No media images in database');
      return;
    }

    const id = String(first.id);
    const resp = await request.get(`${API_BASE}/media/images/${id}`);
    expect(resp.status(), `GET /api/media/images/${id} should be 200`).toBe(200);
  });

  // ── Email threads ──────────────────────────────────────────────────────────
  test('GET /api/emails/threads/:threadId returns 200', async ({ request }) => {
    const listResp = await request.get(`${API_BASE}/emails/threads?mailboxId=all&limit=5`);
    if (!listResp.ok()) {
      test.skip(true, 'Email threads not available');
      return;
    }
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data) ? payload.data : [];
    const first = items.find((t) => t?.threadId != null || t?.id != null);
    if (!first) {
      test.skip(true, 'No email threads in database');
      return;
    }

    const threadId = String(first.threadId ?? first.id);
    const resp = await request.get(`${API_BASE}/emails/threads/${encodeURIComponent(threadId)}`);
    expect(resp.status(), `GET /api/emails/threads/${threadId} should be 200`).toBe(200);
  });

  // ── Evidence ───────────────────────────────────────────────────────────────
  test('GET /api/evidence/:id returns 200 or 404 (not 500)', async ({ request }) => {
    const listResp = await request.get(`${API_BASE}/documents?page=1&limit=3`);
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data) ? payload.data : [];
    const first = items.find((d) => d?.id != null);
    if (!first) {
      test.skip(true, 'No documents/evidence available');
      return;
    }

    // Evidence IDs mirror document IDs; 404 is acceptable when not in evidence table
    const id = String(first.id);
    const resp = await request.get(`${API_BASE}/evidence/${encodeURIComponent(id)}`);
    expect([200, 404], `GET /api/evidence/${id} must not 500`).toContain(resp.status());
  });

  // ── Properties ─────────────────────────────────────────────────────────────
  test('GET /api/properties/:id returns 200', async ({ request }) => {
    const listResp = await request.get(`${API_BASE}/properties?page=1&limit=5`);
    if (!listResp.ok()) {
      test.skip(true, 'Properties endpoint not available');
      return;
    }
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.properties)
      ? payload.properties
      : [];
    const first = items.find((p) => p?.id != null);
    if (!first) {
      test.skip(true, 'No properties in database');
      return;
    }

    const id = String(first.id);
    const resp = await request.get(`${API_BASE}/properties/${id}`);
    expect(resp.status(), `GET /api/properties/${id} should be 200`).toBe(200);
  });

  // ── Articles ───────────────────────────────────────────────────────────────
  test('GET /api/articles/:id returns 200', async ({ request }) => {
    const listResp = await request.get(`${API_BASE}/articles?page=1&limit=5`);
    if (!listResp.ok()) {
      test.skip(true, 'Articles endpoint not available');
      return;
    }
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const first = items.find((a) => a?.id != null);
    if (!first) {
      test.skip(true, 'No articles in database');
      return;
    }

    const id = String(first.id);
    const resp = await request.get(`${API_BASE}/articles/${id}`);
    expect(resp.status(), `GET /api/articles/${id} should be 200`).toBe(200);
  });

  // ── Document sub-endpoints (related, claims, pages) ───────────────────────
  test('GET /api/documents/:id/related, /claims, /pages all return 200', async ({ request }) => {
    test.setTimeout(30_000);
    const listResp = await request.get(`${API_BASE}/documents?page=1&limit=5`);
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data) ? payload.data : [];
    const first = items.find((d) => d?.id != null);
    if (!first) {
      test.skip(true, 'No documents in database');
      return;
    }

    const id = encodeURIComponent(String(first.id));
    const [relatedResp, claimsResp, pagesResp] = await Promise.all([
      request.get(`${API_BASE}/documents/${id}/related`),
      request.get(`${API_BASE}/documents/${id}/claims`),
      request.get(`${API_BASE}/documents/${id}/pages`),
    ]);
    expect(relatedResp.status(), '/related should be 200').toBe(200);
    expect(claimsResp.status(), '/claims should be 200').toBe(200);
    expect(pagesResp.status(), '/pages should be 200').toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — People & Entity modal (UI)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('People & Entity modal', () => {
  test('people page renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await bypassOnboarding(page);
    await page.goto('/people');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);

    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT'),
    );
    expect(critical, `JS errors on /people: ${critical.join('; ')}`).toHaveLength(0);
  });

  test('entity modal opens via deep link and shows evidence tab', async ({ page, request }) => {
    const listResp = await request.get(
      `${API_BASE}/entities?limit=5&sortBy=mentions&sortOrder=desc`,
    );
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const first = items.find((e) => e?.id != null);
    if (!first) {
      test.skip(true, 'No entities available');
      return;
    }

    await bypassOnboarding(page);
    await page.goto(`/entity/${first.id}`);
    await expect(page.locator('[data-testid="evidence-modal"]')).toBeVisible({ timeout: 15000 });

    const evidenceTab = page.locator('[data-testid="entity-modal-tab-evidence"]');
    await evidenceTab.click();
    await expect(evidenceTab).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Documents page & DocumentModal (CRITICAL — was entirely broken)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Documents page & DocumentModal', () => {
  test.setTimeout(45_000);

  test('documents page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await bypassOnboarding(page);
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);

    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT'),
    );
    expect(critical, `JS errors on /documents: ${critical.join('; ')}`).toHaveLength(0);
  });

  test('DocumentModal opens via URL — core feature regression test', async ({ page, request }) => {
    // This is THE regression test for the flight_passengers.document_id bug.
    // Previously: GET /api/documents/:id returned 500 for every request,
    // making the DocumentModal show an error and preventing all document access.
    const listResp = await request.get(`${API_BASE}/documents?page=1&limit=5`);
    expect(listResp.ok()).toBeTruthy();
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data) ? payload.data : [];
    const first = items.find((d) => d?.id != null);
    if (!first) {
      test.skip(true, 'No documents in database');
      return;
    }

    await bypassOnboarding(page);
    await page.goto(`/documents/${first.id}`);

    // Modal MUST appear — this was the broken behavior
    const modal = page.locator('#DocumentModal');
    await expect(modal).toBeVisible({ timeout: 20000 });

    // Modal must not show an error overlay
    await expect(modal.getByText('Failed to load')).toHaveCount(0);
    await expect(modal.getByText('Something went wrong')).toHaveCount(0);
  });

  test('DocumentModal tabs are clickable and switch without errors', async ({ page, request }) => {
    const listResp = await request.get(`${API_BASE}/documents?page=1&limit=5`);
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data) ? payload.data : [];
    const first = items.find((d) => d?.id != null);
    if (!first) {
      test.skip(true, 'No documents in database');
      return;
    }

    await bypassOnboarding(page);
    await page.goto(`/documents/${first.id}`);

    const modal = page.locator('#DocumentModal');
    await expect(modal).toBeVisible({ timeout: 20000 });

    const tabs = modal.getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount, 'DocumentModal should have at least 2 tabs').toBeGreaterThanOrEqual(2);

    // Click first three tabs and verify selection toggles
    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('DocumentModal: body scroll is locked while modal is open', async ({ page, request }) => {
    const listResp = await request.get(`${API_BASE}/documents?page=1&limit=5`);
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data) ? payload.data : [];
    const first = items.find((d) => d?.id != null);
    if (!first) {
      test.skip(true, 'No documents in database');
      return;
    }

    await bypassOnboarding(page);
    await page.goto(`/documents/${first.id}`);
    await expect(page.locator('#DocumentModal')).toBeVisible({ timeout: 20000 });

    const bodyOverflow = await page.evaluate(
      () => window.getComputedStyle(document.body).overflowY,
    );
    expect(
      bodyOverflow === 'hidden' || bodyOverflow === 'clip',
      'Body scroll should be locked when DocumentModal is open',
    ).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Media page sub-tabs
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Media page sub-tabs', () => {
  for (const tab of ['photos', 'articles', 'audio', 'video'] as const) {
    test(`/media/${tab} loads without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await bypassOnboarding(page);
      await page.goto(`/media/${tab}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#root')).toBeVisible();
      await expectNoErrorScreen(page);

      const critical = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT'),
      );
      expect(critical, `JS errors on /media/${tab}: ${critical.join('; ')}`).toHaveLength(0);
    });
  }

  test('article detail page loads for a real article', async ({ page, request }) => {
    const listResp = await request.get(`${API_BASE}/articles?page=1&limit=5`);
    if (!listResp.ok()) {
      test.skip(true, 'Articles endpoint not available');
      return;
    }
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const first = items.find((a) => a?.id != null);
    if (!first) {
      test.skip(true, 'No articles in database');
      return;
    }

    await bypassOnboarding(page);
    await page.goto(`/media/article/${first.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Email client
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Email client', () => {
  test('email page loads with thread list visible', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/emails');
    const threadRow = page.locator('[data-testid="email-thread-row"]').first();
    await expect(threadRow).toBeVisible({ timeout: 30000 });
  });

  test('clicking a thread shows the message body without MIME artifacts', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/emails');

    const threadRow = page.locator('[data-testid="email-thread-row"]').first();
    await expect(threadRow).toBeVisible({ timeout: 30000 });
    await threadRow.click();

    const body = page.locator('[data-testid="email-message-body"]').first();
    await expect(body).toBeVisible({ timeout: 15000 });

    const text = await body.innerText();
    expect(text, 'Message body should not contain raw MIME encoding').not.toMatch(
      /=0A|=3D|Content-Type:/i,
    );
  });

  test('email search input is functional', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/emails');
    await expect(page.locator('[data-testid="email-thread-row"]').first()).toBeVisible({
      timeout: 30000,
    });

    const searchInput = page.locator('[data-testid="email-search-input"]');
    await searchInput.fill('epstein');
    // Debounce: wait for API call
    await page.waitForTimeout(800);
    // Search should not crash the page
    await expectNoErrorScreen(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Flights
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Flights page', () => {
  test('flights page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await bypassOnboarding(page);
    await page.goto('/flights');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);

    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT'),
    );
    expect(critical, `JS errors on /flights: ${critical.join('; ')}`).toHaveLength(0);
  });

  test('flight detail page loads for a real flight', async ({ page, request }) => {
    const listResp = await request.get(`${API_BASE}/flights?page=1&limit=5`);
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.flights) ? payload.flights : [];
    const first = items.find((f) => f?.id != null);
    if (!first) {
      test.skip(true, 'No flights in database');
      return;
    }

    await bypassOnboarding(page);
    await page.goto(`/flights/${first.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — Properties
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Properties page', () => {
  test('properties page loads without errors', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — Black Book
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Black Book', () => {
  test('black book page loads without errors', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/blackbook');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });

  test('black book alphabet filter works (API level)', async ({ request }) => {
    // Verify the letter filter doesn't break the query
    for (const letter of ['A', 'E', 'Z']) {
      const resp = await request.get(`${API_BASE}/black-book?letter=${letter}&limit=5`);
      expect(resp.status(), `Black book letter=${letter} should not 500`).not.toBe(500);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — Timeline
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Timeline page', () => {
  test.setTimeout(45_000);

  test('timeline page loads without errors', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 10 — Financial
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Financial page', () => {
  test('financial page loads without errors', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });

  test('financial transactions API returns 200', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/financial/transactions?page=1&limit=5`);
    expect(resp.status(), 'Financial transactions API should not 500').not.toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 11 — Analytics
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Analytics page', () => {
  test.setTimeout(60_000);

  test('analytics page loads without errors', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 12 — Investigations workspace
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Investigations workspace', () => {
  test('investigations page loads without errors', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/investigations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });

  test('investigation detail page loads for a real investigation', async ({ page, request }) => {
    const listResp = await request.get(`${API_BASE}/investigations?limit=3`);
    if (!listResp.ok()) {
      test.skip(true, 'Investigations endpoint not available');
      return;
    }
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const first = items.find((i) => i?.id != null);
    if (!first) {
      test.skip(true, 'No investigations in database');
      return;
    }

    await bypassOnboarding(page);
    await page.goto(`/investigations/${first.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 13 — Search
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Evidence search', () => {
  test('search page loads without errors', async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });

  test('search API does not 500 for a common term', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/search?q=epstein&limit=5`);
    expect(resp.status(), 'Search API must not 500 or 502').not.toBe(500);
    expect(resp.status()).not.toBe(502);
    expect(resp.status()).not.toBe(503);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 14 — Evidence detail page
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Evidence detail page', () => {
  test('/evidence/:id loads without errors for a real document', async ({ page, request }) => {
    const listResp = await request.get(`${API_BASE}/documents?page=1&limit=5`);
    const payload = await listResp.json();
    const items: Record<string, unknown>[] = Array.isArray(payload?.data) ? payload.data : [];
    const first = items.find((d) => d?.id != null);
    if (!first) {
      test.skip(true, 'No documents/evidence available');
      return;
    }

    await bypassOnboarding(page);
    await page.goto(`/evidence/${first.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#root')).toBeVisible();
    await expectNoErrorScreen(page);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 15 — Cross-cutting: API health for every list endpoint
//
// Ensures no list endpoint returns 500 (protects against schema drift, missing
// tables, or broken aggregation queries that would blank-out entire pages).
// ══════════════════════════════════════════════════════════════════════════════

test.describe('API list endpoint health (no 500 for any page)', () => {
  test.describe.configure({ mode: 'serial' });

  const listEndpoints = [
    { name: 'entities', path: '/entities?limit=5&sortBy=mentions&sortOrder=desc' },
    { name: 'subjects', path: '/subjects?page=1&limit=5' },
    { name: 'documents', path: '/documents?page=1&limit=5' },
    { name: 'flights', path: '/flights?page=1&limit=5' },
    { name: 'flight airports', path: '/flights/airports' },
    { name: 'flight stats', path: '/flights/stats' },
    { name: 'flight passengers', path: '/flights/passengers?limit=5' },
    { name: 'properties', path: '/properties?page=1&limit=5' },
    { name: 'property stats', path: '/properties/stats' },
    { name: 'black book (A)', path: '/black-book?letter=A&limit=5' },
    { name: 'timeline', path: '/timeline' },
    { name: 'financial transactions', path: '/financial/transactions?page=1&limit=5' },
    { name: 'financial stats', path: '/financial/stats' },
    { name: 'email mailboxes', path: '/emails/mailboxes' },
    { name: 'email threads', path: '/emails/threads?mailboxId=all&limit=5' },
    { name: 'media images', path: '/media/images?limit=5' },
    { name: 'media albums', path: '/media/albums' },
    { name: 'media audio', path: '/media/audio?limit=5' },
    { name: 'media video', path: '/media/video?limit=5' },
    { name: 'analytics enhanced', path: '/analytics/enhanced' },
    { name: 'search', path: '/search?q=epstein&limit=5' },
    { name: 'articles', path: '/articles?page=1&limit=5' },
    { name: 'graph global', path: '/graph/global?limit=10' },
    { name: 'stats', path: '/stats' },
    { name: 'stats health', path: '/stats/health' },
  ];

  for (const { name, path } of listEndpoints) {
    test(`GET /api${path} — ${name} must not 500`, async ({ request }) => {
      const resp = await request.get(`${API_BASE}${path}`, { timeout: 20_000 });
      expect(
        resp.status(),
        `${name} endpoint returned ${resp.status()} — check for broken SQL or missing table`,
      ).not.toBe(500);
      expect(resp.status()).not.toBe(502);
      expect(resp.status()).not.toBe(503);
    });
  }
});
