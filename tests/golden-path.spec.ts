import { test, expect, type APIRequestContext } from '@playwright/test';

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

test.describe('Golden Path A: People → Entity → Documents → DocumentModal', () => {
  test('opens entity, shows evidence, opens source document route', async ({ page, request }) => {
    const resolved = await resolveEntityWithEvidence(request);
    if (!resolved) {
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

test.describe('Golden Path B: DocumentModal tab and scroll behavior', () => {
  test('refined/raw/pdf toggles and scroll containment behave correctly', async ({
    page,
    request,
  }) => {
    const documentId = await resolveFirstDocumentId(request);
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
      test.skip(true, 'No PDF documents available');
      return;
    }

    const fileResponse = await request.get(
      `${API_BASE}/documents/${encodeURIComponent(pdfDocumentId)}/file?variant=dirty`,
    );
    if (!fileResponse.ok()) {
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
  test('loads threads, opens a thread, searches, and adds to investigation', async ({ page }) => {
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
