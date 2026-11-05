import { expect, test, type APIRequestContext } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const useProductionBaseUrl = process.env.PW_USE_PROD_BASE_URL === '1';
const API_BASE = `${
  process.env.PW_API_BASE_URL ||
  (useProductionBaseUrl ? 'https://epstein.academy' : `http://127.0.0.1:${apiPort}`)
}/api`;

const resolveFirstEntityId = async (request: APIRequestContext): Promise<string | null> => {
  const response = await request.get(
    `${API_BASE}/entities?limit=10&sortBy=mentions&sortOrder=desc`,
  );
  if (!response.ok()) return null;
  const payload = await response.json();
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const first = items.find((item: Record<string, unknown>) => Number.isFinite(Number(item?.id)));
  if (!first) return null;
  return String(first.id);
};

const resolveFirstDocumentId = async (request: APIRequestContext): Promise<string | null> => {
  const response = await request.get(`${API_BASE}/documents?page=1&limit=5`);
  if (!response.ok()) return null;
  const payload = await response.json();
  const items = Array.isArray(payload?.data) ? payload.data : [];
  const first = items.find((item: Record<string, unknown>) => Number.isFinite(Number(item?.id)));
  if (!first) return null;
  return String(first.id);
};

const resolveEntityWithFlights = async (
  request: APIRequestContext,
): Promise<{ entityId: string; flightId: string } | null> => {
  const response = await request.get(
    `${API_BASE}/entities?limit=20&sortBy=mentions&sortOrder=desc`,
  );
  if (!response.ok()) return null;

  const payload = await response.json();
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  for (const item of items) {
    const entityId = Number(item?.id);
    if (!Number.isFinite(entityId)) continue;

    const flightsResponse = await request.get(`${API_BASE}/entities/${entityId}/flights`);
    if (!flightsResponse.ok()) continue;

    const flightsPayload = await flightsResponse.json();
    const firstFlight = Array.isArray(flightsPayload?.flights)
      ? flightsPayload.flights.find((flight: Record<string, unknown>) =>
          Number.isFinite(Number(flight?.id)),
        )
      : null;

    if (firstFlight) {
      return {
        entityId: String(entityId),
        flightId: String(firstFlight.id),
      };
    }
  }

  return null;
};

const resolveInvestigationAndEvidence = async (
  request: APIRequestContext,
): Promise<{ investigationId: string; evidenceId: string } | null> => {
  const response = await request.get(`${API_BASE}/investigations?limit=5`);
  expect(response.status(), 'Investigation fixture list must be available').toBe(200);
  const payload = await response.json();
  const cases = Array.isArray(payload?.data) ? payload.data : [];
  for (const investigation of cases) {
    const evidenceResponse = await request.get(
      `${API_BASE}/investigations/${investigation.id}/evidence-by-type`,
    );
    expect(evidenceResponse.ok()).toBeTruthy();
    const evidencePayload = await evidenceResponse.json();
    const evidenceItem = Array.isArray(evidencePayload?.all)
      ? evidencePayload.all.find(
          (item: Record<string, unknown>) =>
            item.targetType === 'document' ||
            item.documentId ||
            String(item.sourcePath).startsWith('document:'),
        )
      : null;
    if (evidenceItem)
      return {
        investigationId: String(investigation.uuid || investigation.id),
        evidenceId: String(evidenceItem.investigationEvidenceId),
      };
  }
  return null;
};

const resolveThreadAndMessage = async (
  request: APIRequestContext,
): Promise<{ threadId: string; messageId: string } | null> => {
  const threadsResponse = await request.get(`${API_BASE}/emails/threads?mailboxId=all&limit=5`);
  if (!threadsResponse.ok()) return null;

  const threadsPayload = await threadsResponse.json();
  const firstThread = Array.isArray(threadsPayload?.data)
    ? threadsPayload.data.find((item: Record<string, unknown>) =>
        String(item?.threadId || '').trim(),
      )
    : null;
  if (!firstThread) return null;

  const threadId = String(firstThread.threadId);
  const detailResponse = await request.get(
    `${API_BASE}/emails/threads/${encodeURIComponent(threadId)}`,
  );
  if (!detailResponse.ok()) return null;

  const detailPayload = await detailResponse.json();
  const firstMessage = Array.isArray(detailPayload?.messages)
    ? detailPayload.messages.find((item: Record<string, unknown>) =>
        String(item?.messageId || '').trim(),
      )
    : null;
  if (!firstMessage) return null;

  return {
    threadId,
    messageId: String(firstMessage.messageId),
  };
};

const preparePage = async (page: import('@playwright/test').Page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
    window.localStorage.setItem('board_onboarding_seen', 'true');
  });
};

test.describe('Route to UI state synchronization', () => {
  test.setTimeout(120_000);
  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000);
    let ok = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await request.get(`${API_BASE}/subjects?page=1&limit=1`, {
          timeout: 15000,
        });
        if (response.ok()) {
          ok = true;
          break;
        } else {
          console.log(
            `[WAITING FOR SERVER] Status: ${response.status()} Text: ${await response.text()}`,
          );
        }
      } catch (err) {
        console.error(`[WAITING FOR SERVER] Error:`, err);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    expect(ok).toBeTruthy();
  });

  test('entity modal quick actions update modal state (not just URL)', async ({
    page,
    request,
  }) => {
    const entityId = await resolveFirstEntityId(request);
    if (!entityId) {
      expect(true, 'No entities available').toBeFalsy();
      return;
    }

    await preparePage(page);
    const detailRequests: string[] = [];
    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (/^\/api\/entities\/\d+$/.test(pathname)) detailRequests.push(pathname);
    });
    await page.goto(`/entity/${entityId}`);
    const modal = page.getByTestId('evidence-modal');
    await expect(modal).toBeVisible({ timeout: 30000 });
    await modal.getByRole('button', { name: 'Timeline', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Network' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('entity-modal-tab-network')).toBeVisible();
    expect(detailRequests.filter((pathname) => pathname !== `/api/entities/${entityId}`)).toEqual(
      [],
    );
    expect(
      detailRequests.filter((pathname) => pathname === `/api/entities/${entityId}`),
    ).toHaveLength(1);

    await modal.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('entity-modal-tab-evidence')).toBeVisible();
    await expect(page.locator('input[placeholder="Search relevant documents..."]')).not.toHaveValue(
      '',
    );

    await modal.getByRole('button', { name: 'Black Book Entry', exact: true }).click();
    await expect(page).toHaveURL(/\/blackbook\?search=/);
  });

  test('document modal tab changes preserve size and single primary scroll region', async ({
    page,
    request,
  }) => {
    const documentId = await resolveFirstDocumentId(request);
    if (!documentId) {
      expect(true, 'No documents available').toBeFalsy();
      return;
    }

    await preparePage(page);
    await page.goto(`/documents/${documentId}?modalTab=viewer`);

    const modal = page.locator('#DocumentModal');
    await expect(modal).toBeVisible({ timeout: 20000 });

    const initialBox = await modal.boundingBox();
    expect(initialBox).toBeTruthy();

    await expect(page.getByTestId('document-modal-scroll-region')).toHaveCount(1);

    const scrollRegionCount = await page
      .getByTestId('document-modal-scroll-region')
      .evaluate((container) => {
        const nodes = Array.from(container.querySelectorAll<HTMLElement>('*'));
        return nodes.filter((node) => {
          const style = window.getComputedStyle(node);
          const overflowY = style.overflowY;
          const isScrollableStyle = overflowY === 'auto' || overflowY === 'scroll';
          const hasScrollableContent = node.scrollHeight > node.clientHeight + 2;
          return isScrollableStyle && hasScrollableContent;
        }).length;
      });
    expect(scrollRegionCount).toBeLessThanOrEqual(1);

    const modes = page.getByRole('radiogroup', { name: 'Document view mode' });
    await modes.getByRole('radio', { name: 'Clean Text', exact: true }).click();
    await expect(page).toHaveURL(/viewMode=clean/);
    await expect(modes.getByRole('radio', { name: 'Clean Text', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByTestId('document-modal-tabpanel-viewer')).toBeVisible();

    await modes.getByRole('radio', { name: 'Raw OCR', exact: true }).click();
    await expect(page).toHaveURL(/viewMode=ocr/);
    await expect(modes.getByRole('radio', { name: 'Raw OCR', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByTestId('document-modal-tabpanel-viewer')).toBeVisible();

    const afterBox = await modal.boundingBox();
    expect(afterBox).toBeTruthy();
    const heightDelta = Math.abs((afterBox?.height || 0) - (initialBox?.height || 0));
    expect(heightDelta).toBeLessThan(96);
  });

  test('flight detail back returns to the originating entity flight state', async ({
    page,
    request,
  }) => {
    const resolved = await resolveEntityWithFlights(request);
    if (!resolved) {
      expect(true, 'No entity with linked flights available').toBeFalsy();
      return;
    }

    await preparePage(page);
    await page.goto(`/entity/${resolved.entityId}?entityTab=flights`);

    const flightsTab = page.getByTestId('entity-modal-tab-flights');
    const viewLink = flightsTab.locator('a[href^="/flights/"]').first();
    await expect(viewLink).toBeVisible({ timeout: 20000 });

    await viewLink.click();
    await expect(page).toHaveURL(new RegExp(`/flights/${resolved.flightId}$`));

    await page.getByRole('button', { name: 'Go back' }).click();

    await expect(page).toHaveURL(
      new RegExp(`/entity/${resolved.entityId}(\\?entityTab=flights)?$`),
      { timeout: 20000 },
    );
    await expect(page.getByTestId('entity-modal-tab-flights')).toBeVisible({ timeout: 20000 });
  });

  test('people list navigation returns to the people surface after opening an entity', async ({
    page,
  }) => {
    await preparePage(page);
    await page.goto('/people');

    const firstCard = page.getByTestId('subject-card').first();
    await expect(firstCard).toBeVisible({ timeout: 30000 });
    await firstCard.getByRole('button', { name: 'View', exact: true }).click();
    await expect(page).toHaveURL(/\/entity\/\d+/);

    await page
      .getByTestId('evidence-modal')
      .getByRole('button', { name: 'Close entity profile', exact: true })
      .click();
    await expect(page).toHaveURL(/\/people(?:\?|$)/, { timeout: 20000 });
    await expect(page.getByTestId('subject-card').first()).toBeVisible({ timeout: 20000 });
  });

  test('email evidence navigation returns to the originating thread and message', async ({
    page,
    request,
  }) => {
    const resolved = await resolveThreadAndMessage(request);
    if (!resolved) {
      expect(true, 'No email thread/message fixture available').toBeFalsy();
      return;
    }

    await preparePage(page);
    await page.goto(
      `/emails?mailboxId=all&threadId=${encodeURIComponent(
        resolved.threadId,
      )}&messageId=${encodeURIComponent(resolved.messageId)}`,
    );

    const messageCard = page.locator(`[data-message-id="${resolved.messageId}"]`).first();
    await expect(messageCard).toBeVisible({ timeout: 30000 });

    const evidenceButton = messageCard.getByRole('button', { name: 'Evidence' }).first();
    await expect(evidenceButton).toBeVisible({ timeout: 20000 });
    await evidenceButton.click();
    await expect(page).toHaveURL(
      new RegExp(`/documents/${encodeURIComponent(resolved.messageId)}(?:\\?|$)`),
    );

    await page
      .locator('#DocumentModal')
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(
        `/emails\\?[^#]*threadId=${encodeURIComponent(resolved.threadId)}[^#]*messageId=${encodeURIComponent(resolved.messageId)}`,
      ),
      { timeout: 20000 },
    );
    await expect(page.locator(`[data-message-id="${resolved.messageId}"]`).first()).toBeVisible({
      timeout: 20000,
    });
  });

  test('intelligence dashboard renders review queues or empty states', async ({ page }) => {
    await preparePage(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const review = page.waitForResponse((response) =>
      response.url().includes('/api/intelligence/review'),
    );
    const readiness = page.waitForResponse((response) =>
      response.url().includes('/api/intelligence/readiness'),
    );
    await page.goto('/intelligence');

    // Should load the page heading
    await expect(page.getByRole('heading', { name: /intelligence review/i })).toBeVisible({
      timeout: 20000,
    });

    expect((await review).status()).toBe(200);
    expect((await readiness).status()).toBe(200);
    await expect(page.getByText(/loading intelligence queues/i)).toBeHidden();
    await expect(page.locator('[class*="queueCard"]').first()).toBeVisible();
    await expect(page.locator('[class*="readinessTile"]').first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('review dashboard renders mention queue or empty state without JS errors', async ({
    page,
  }) => {
    await preparePage(page);
    await page.goto('/review');

    // Should show the page heading
    await expect(page.getByRole('heading', { name: /active learning review/i })).toBeVisible({
      timeout: 20000,
    });

    // Should show the tabs
    await expect(page.getByRole('button', { name: /entity mentions/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('button', { name: /claims & facts/i })).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByRole('alert')).toContainText('administrator', { timeout: 20000 });
    await expect(page.getByText(/queue is empty/i)).toHaveCount(0);
  });

  test('investigation evidence deep links reconstruct case-folder UI for both route patterns', async ({
    page,
    request,
  }) => {
    const resolved = await resolveInvestigationAndEvidence(request);
    if (!resolved) {
      expect(true, 'No investigation evidence available').toBeFalsy();
      return;
    }

    await preparePage(page);
    const { investigationId, evidenceId } = resolved;
    const deepLinkPaths = [
      `/investigate/case/${investigationId}/evidence/${evidenceId}`,
      `/investigations/${investigationId}/evidence/${evidenceId}`,
      `/investigations/${investigationId}?evidenceId=${evidenceId}`,
    ];

    for (const path of deepLinkPaths) {
      await page.goto(path);
      const row = page.locator(`[data-evidence-row-id="${evidenceId}"]`);
      await expect(page.getByRole('navigation', { name: 'Case sections' })).toBeVisible({
        timeout: 60000,
      });
      await expect(row).toBeVisible({ timeout: 12000 });
      await expect(row).toHaveAttribute('aria-current', 'true');

      await expect(page.locator('#DocumentModal, [role="dialog"][aria-modal="true"]')).toBeVisible({
        timeout: 12000,
      });
    }
  });
});
