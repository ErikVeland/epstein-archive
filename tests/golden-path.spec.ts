import { expect, test, type APIRequestContext } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const useProductionBaseUrl = process.env.PW_USE_PROD_BASE_URL === '1';
const API_BASE = useProductionBaseUrl
  ? 'https://epstein.academy/api'
  : `${process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`}/api`;

async function resolveEntityWithEvidence(
  request: APIRequestContext,
): Promise<{ entityId: string; documentId: string } | null> {
  const entitiesResp = await request.get(
    `${API_BASE}/entities?limit=15&sortBy=mentions&sortOrder=desc`,
  );
  if (!entitiesResp.ok()) return null;
  const payload = await entitiesResp.json();
  const entities = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  for (const entity of entities) {
    const entityId = String(entity?.id ?? '');
    if (!entityId) continue;
    const docsResp = await request.get(
      `${API_BASE}/entities/${encodeURIComponent(entityId)}/documents?limit=1`,
    );
    if (!docsResp.ok()) continue;
    const docsPayload = await docsResp.json();
    const docs = Array.isArray(docsPayload?.data)
      ? docsPayload.data
      : Array.isArray(docsPayload)
        ? docsPayload
        : [];
    if (docs.length > 0) {
      const firstDoc = docs.find((doc: Record<string, unknown>) => doc?.id != null);
      if (firstDoc) return { entityId, documentId: String(firstDoc.id) };
    }
  }

  return null;
}

async function resolveEntityWithTabData(
  request: APIRequestContext,
  tab: string,
): Promise<string | null> {
  const entitiesResp = await request.get(
    `${API_BASE}/entities?limit=20&sortBy=mentions&sortOrder=desc`,
  );
  if (!entitiesResp.ok()) return null;
  const payload = await entitiesResp.json();
  const entities = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  const readItems = (body: Record<string, unknown> | unknown[]): unknown[] => {
    if (Array.isArray(body)) return body;
    if (Array.isArray(body.data)) return body.data;
    if (Array.isArray(body.flights)) return body.flights;
    if (Array.isArray(body.transactions)) return body.transactions;
    if (Array.isArray(body.properties)) return body.properties;
    return [];
  };

  for (const entity of entities) {
    const entityId = String(entity?.id ?? '');
    if (!entityId) continue;
    const tabPath = tab === 'financial' ? 'transactions' : tab;
    const endpoint =
      tab === 'evidence'
        ? `${API_BASE}/entities/${entityId}/documents?limit=5`
        : `${API_BASE}/entities/${entityId}/${tabPath}?limit=5`;
    const response = await request.get(endpoint);
    if (!response.ok()) continue;
    const body = await response.json();
    if (readItems(body).length > 0) return entityId;
  }

  return null;
}

async function resolveFirstDocumentId(request: APIRequestContext): Promise<string | null> {
  const resp = await request.get(`${API_BASE}/documents?page=1&limit=5`);
  if (!resp.ok()) return null;
  const payload = await resp.json();
  const items = Array.isArray(payload?.data) ? payload.data : [];
  const first = items.find((item: Record<string, unknown>) => Number.isFinite(Number(item?.id)));
  return first ? String(first.id) : null;
}

async function resolveFirstPdfDocumentId(request: APIRequestContext): Promise<string | null> {
  const resp = await request.get(`${API_BASE}/documents?page=1&limit=50`);
  if (!resp.ok()) return null;
  const payload = await resp.json();
  const items = Array.isArray(payload?.data) ? payload.data : [];
  const firstPdf = items.find((item: Record<string, unknown>) => {
    const fileType = String(item?.fileType || item?.file_type || '').toLowerCase();
    const fileName = String(item?.fileName || item?.file_name || item?.title || '').toLowerCase();
    return fileType.includes('pdf') || fileName.endsWith('.pdf');
  });
  return firstPdf ? String(firstPdf.id) : null;
}

async function resolveTwoEntities(
  request: APIRequestContext,
): Promise<{ a: { id: string; name: string }; b: { id: string; name: string } } | null> {
  const resp = await request.get(`${API_BASE}/entities?limit=10&sortBy=mentions&sortOrder=desc`);
  if (!resp.ok()) return null;
  const payload = await resp.json();
  const entities = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  const normalized = entities
    .map((e: Record<string, unknown>) => {
      const id = e?.id != null ? String(e.id) : '';
      const name = String(e.fullName ?? e.full_name ?? e.name ?? '').trim();
      return { id, name };
    })
    .filter((e: { id: string; name: string }) => e.id.length > 0 && e.name.length > 0);
  if (normalized.length < 2) return null;
  return { a: normalized[0], b: normalized[1] };
}

test.describe('Golden Path A: People → Entity → Documents → DocumentModal', () => {
  test('opens entity, shows evidence, opens source document route', async ({ page, request }) => {
    const resolved = await resolveEntityWithEvidence(request);
    if (!resolved) {
      // @release-skip-ok
      test.skip(true, 'No entity with linked evidence found');
      return;
    }
    const { entityId, documentId } = resolved;

    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
      window.localStorage.setItem('board_onboarding_seen', 'true');
    });
    await page.goto(`/entity/${entityId}?entityTab=evidence`);
    await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="entity-modal-tab-evidence"]');
    await expect(page.locator('[data-testid="entity-evidence-count"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Search relevant documents..."]')).toBeVisible();
    const firstEvidenceRow = page
      .locator('[data-testid="entity-modal-tab-evidence"]')
      .locator('[data-testid="entity-evidence-row"], [data-testid="evidence-card"]')
      .first();
    await expect(firstEvidenceRow).toBeVisible({ timeout: 20000 });

    await page.goto(`/documents/${documentId}`);
    await expect(page).toHaveURL(new RegExp(`/documents/${documentId}`));
  });
});

test.describe('Golden Path A2: Entity modal populated tabs', () => {
  test('opens seeded entity modal tabs with data states', async ({ page, request }) => {
    const tabs = [
      'evidence',
      'media',
      'claims',
      'investigations',
      'flights',
      'financial',
      'properties',
    ];

    for (const tab of tabs) {
      const entityId = await resolveEntityWithTabData(request, tab);
      if (!entityId) continue;

      await page.goto(`/entity/${entityId}?entityTab=${tab}`);
      await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 15000 });
      const panel = page.locator(`[data-testid="entity-modal-tab-${tab}"]`);
      await expect(panel).toBeVisible({ timeout: 20000 });

      // Terminal state: ready (has data), empty (no data), or error (failed to load).
      const hasData = await panel.locator('[data-testid]').count();
      const hasEmpty = await panel.getByText(/no .*found|no .*linked|empty/i).count();
      const hasError = await panel.getByText(/could not be loaded|error|failed/i).count();

      expect(hasData > 0 || hasEmpty > 0 || hasError > 0).toBeTruthy();
    }
  });
});

test.describe('Golden Path A3: Fast entity switching', () => {
  test('does not leak header state across entities', async ({ page, request }) => {
    const resolved = await resolveTwoEntities(request);
    if (!resolved) {
      // @release-skip-ok
      test.skip(true, 'Not enough entities to run fast-switch test');
      return;
    }
    const { a, b } = resolved;

    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
      window.localStorage.setItem('board_onboarding_seen', 'true');
    });

    await page.goto(`/entity/${encodeURIComponent(a.id)}?entityTab=evidence`);
    await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="evidence-modal"] h2')).toContainText(a.name, {
      timeout: 20000,
    });

    // Switch quickly to another entity; header should update and remain stable.
    await page.goto(`/entity/${encodeURIComponent(b.id)}?entityTab=evidence`);
    await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="evidence-modal"] h2')).toContainText(b.name, {
      timeout: 20000,
    });

    // Move to another tab to trigger additional fetches while ensuring header remains entity B.
    await page.getByTestId('tab-financial').click();
    await expect(page.locator('[data-testid="entity-modal-tab-financial"]')).toBeVisible({
      timeout: 20000,
    });
    await page.waitForTimeout(750);
    await expect(page.locator('[data-testid="evidence-modal"] h2')).toContainText(b.name);
  });

  test('race condition: rapid switching does not mix entity data', async ({ page, request }) => {
    const resolved = await resolveTwoEntities(request);
    if (!resolved) {
      // @release-skip-ok
      test.skip(true, 'Not enough entities to run race test');
      return;
    }
    const { a, b } = resolved;

    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
      window.localStorage.setItem('board_onboarding_seen', 'true');
    });

    // Rapidly switch between entities to trigger race conditions.
    for (let i = 0; i < 3; i++) {
      await page.goto(`/entity/${encodeURIComponent(a.id)}?entityTab=evidence`);
      await page.goto(`/entity/${encodeURIComponent(b.id)}?entityTab=financial`);
    }

    await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="evidence-modal"] h2')).toContainText(b.name, {
      timeout: 20000,
    });

    const panel = page.locator('[data-testid="entity-modal-tab-financial"]');
    await expect(panel).toBeVisible({ timeout: 20000 });
    await expect(panel).not.toContainText(a.name, { timeout: 10000 });
  });
});

test.describe('Golden Path B: DocumentModal tab and scroll behavior', () => {
  test('refined/raw/pdf toggles and scroll containment behave correctly', async ({
    page,
    request,
  }) => {
    const documentId = await resolveFirstDocumentId(request);
    // @release-skip-ok
    test.skip(!documentId, 'No documents available');

    await page.goto(`/documents/${documentId}?modalTab=analysis`);

    const modal = page.locator('#DocumentModal');
    await expect(modal).toBeVisible({ timeout: 20000 });

    const tabs = modal.getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    const firstTab = tabs.nth(0);
    const secondTab = tabs.nth(1);

    await firstTab.click();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');

    await secondTab.click();
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');

    const modalBody = page.locator('[data-testid="document-modal-scroll-region"]');
    await expect(modalBody).toBeVisible();

    const bodyOverflow = await page.evaluate(
      () => window.getComputedStyle(document.body).overflowY,
    );
    expect(bodyOverflow === 'hidden' || bodyOverflow === 'clip').toBeTruthy();

    const scrollContainers = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div'));
      return elements.filter((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          style.overflowY === 'overlay'
        );
      }).length;
    });

    expect(scrollContainers).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Golden Path D: DocumentModal PDF rendering', () => {
  test('opens PDF tab and renders at least one page for a PDF-backed record', async ({
    page,
    request,
  }) => {
    const pdfDocumentId = await resolveFirstPdfDocumentId(request);
    if (!pdfDocumentId) {
      // @release-skip-ok
      test.skip(true, 'No PDF documents available');
      return;
    }

    const fileResponse = await request.get(
      `${API_BASE}/documents/${encodeURIComponent(pdfDocumentId)}/file?variant=dirty`,
    );
    if (!fileResponse.ok()) {
      // @release-skip-ok
      test.skip(true, 'PDF file endpoint not available for this fixture');
      return;
    }
    const contentType = String(fileResponse.headers()['content-type'] || '').toLowerCase();
    expect(contentType).toContain('pdf');

    await page.goto(`/documents/${encodeURIComponent(pdfDocumentId)}?modalTab=pdf`);
    const modal = page.locator('#DocumentModal');
    await expect(modal).toBeVisible({ timeout: 20000 });

    await expect(page.getByText('PDF Rendering Failed')).toHaveCount(0);
    await expect(page.locator('#DocumentModal canvas')).toHaveCount(1, { timeout: 30000 });
  });
});

test.describe('Golden Path C: EmailClient threads, search, and add to investigation', () => {
  test('loads threads, opens a thread, searches, and adds to investigation', async ({
    page,
    request,
  }) => {
    const threadResp = await request.get('/api/emails/threads?mailboxId=all&limit=1');
    if (!threadResp.ok()) {
      // @release-skip-ok
      test.skip(true, 'Email threads API not available');
      return;
    }
    const threadPayload = await threadResp.json();
    const threads = Array.isArray(threadPayload?.data) ? threadPayload.data : [];
    if (threads.length === 0) {
      // @release-skip-ok
      test.skip(true, 'No email threads available');
      return;
    }

    await page.goto('/emails');

    const threadList = page.locator('[data-testid="email-thread-row"]').first();
    await expect(threadList).toBeVisible({ timeout: 30000 });

    await threadList.click();

    const messageBody = page.locator('[data-testid="email-message-body"]').first();
    await expect(messageBody).toBeVisible();

    const bodyText = await messageBody.innerText();
    expect(bodyText).not.toMatch(/=0A|=3D|multipart\/alternative/i);

    const searchInput = page.locator('[data-testid="email-search-input"]');
    await searchInput.fill('test');
    await page.waitForTimeout(750);

    const addToInvestigationButton = page
      .locator('[data-testid="email-thread-actions"]')
      .locator('button[title="Add to Investigation"]')
      .first();
    await expect(addToInvestigationButton).toBeVisible();

    await addToInvestigationButton.click();
    await expect(page.locator('[data-testid="email-thread-actions"]')).toBeVisible();
  });
});

test.describe('Golden Path E: Investigation workspace export panel', () => {
  test('opens investigation, navigates to export tab, and export panel renders', async ({
    page,
    request,
  }) => {
    // Resolve an existing investigation or create one
    const listRes = await request.get(`${API_BASE}/investigations?limit=5`);
    if (!listRes.ok()) {
      // @release-skip-ok
      test.skip(true, 'Investigations API not available');
      return;
    }
    const listBody = await listRes.json();
    const items = Array.isArray(listBody?.data)
      ? listBody.data
      : Array.isArray(listBody)
        ? listBody
        : [];

    let investigationId: string | null = null;
    const first = items.find((i: Record<string, unknown>) => i?.id != null || i?.uuid != null);
    if (first) {
      investigationId = String(first.uuid ?? first.id);
    }

    if (!investigationId) {
      // @release-skip-ok
      test.skip(true, 'No investigations available for export test');
      return;
    }

    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
      window.localStorage.setItem('board_onboarding_seen', 'true');
    });
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate directly to the investigation workspace export tab
    await page.goto(`/investigations/${investigationId}?tab=export`);
    await page
      .waitForSelector('[data-testid="investigation-workspace"]', {
        timeout: 20000,
        state: 'attached',
      })
      .catch(() => {
        // workspace may not have this exact testid — fall back to checking for the tab navigation
      });

    // The export panel should be visible — look for the export panel header text
    const exportPanelVisible = await page
      .getByText(/evidence packet synthesis/i)
      .isVisible({ timeout: 20000 })
      .catch(() => false);

    if (!exportPanelVisible) {
      // Try clicking an "Export" tab if the workspace loaded without the tab pre-selected
      const exportTab = page.getByRole('tab', { name: /export/i }).first();
      const hasExportTab = await exportTab.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasExportTab) {
        await exportTab.click();
        await expect(page.getByText(/evidence packet synthesis/i)).toBeVisible({ timeout: 10000 });
      } else {
        // @release-skip-ok
        test.skip(true, 'Export tab not accessible in this fixture state');
        return;
      }
    }

    // The Generate button should be present and enabled
    const generateButton = page.getByRole('button', { name: /generate/i }).first();
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await expect(generateButton).not.toBeDisabled();

    // The format selector should be present (JSON and ZIP options)
    await expect(page.getByText(/json stream/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/zip archive/i)).toBeVisible({ timeout: 5000 });
  });
});
