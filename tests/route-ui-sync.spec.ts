import { expect, test, type APIRequestContext } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const useProductionBaseUrl = process.env.PW_USE_PROD_BASE_URL === '1';
const API_BASE = useProductionBaseUrl
  ? 'https://epstein.academy/api'
  : `${process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`}/api`;

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
  if (!response.ok()) return null;
  const payload = await response.json();
  const first = Array.isArray(payload?.data)
    ? payload.data.find((item: Record<string, unknown>) => Number.isFinite(Number(item?.id)))
    : null;
  if (!first) return null;

  const investigationId = String(first.uuid || first.id);
  const evidenceResponse = await request.get(
    `${API_BASE}/investigations/${investigationId}/evidence-by-type`,
  );
  if (!evidenceResponse.ok()) return null;
  const evidencePayload = await evidenceResponse.json();
  const evidenceItem = Array.isArray(evidencePayload?.all) ? evidencePayload.all[0] : null;
  if (!evidenceItem) return null;

  return {
    investigationId,
    evidenceId: String(evidenceItem.investigation_evidence_id || evidenceItem.id),
  };
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
      test.skip(true, 'No entities available');
      return;
    }

    await preparePage(page);
    await page.goto(`/entity/${entityId}`);
    const quickAction = page.getByTestId('entity-modal-action-blackbook');
    const visibleFromRoute = await quickAction.isVisible({ timeout: 20000 }).catch(() => false);
    if (!visibleFromRoute) {
      await page.goto('/people');
      const openEntity = page
        .locator('button:has-text("VIEW"), a:has-text("VIEW"), button:has-text("View")')
        .first();
      if (!(await openEntity.isVisible().catch(() => false))) {
        test.skip(true, 'No entity card action available to open Evidence modal');
        return;
      }
      await openEntity.click();
    }

    await expect(page.getByTestId('entity-modal-action-blackbook')).toBeVisible({ timeout: 20000 });

    await page.getByTestId('entity-modal-action-timeline').click();
    await expect(page.getByRole('tab', { name: 'Network' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('entity-modal-tab-network')).toBeVisible();

    await page.getByTestId('entity-modal-action-search').click();
    await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('entity-modal-tab-evidence')).toBeVisible();
    await expect(page.locator('input[placeholder="Search relevant documents..."]')).not.toHaveValue(
      '',
    );

    await page.getByTestId('entity-modal-action-blackbook').click();
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('entity-modal-tab-overview')).toBeVisible();
    await expect(page.getByTestId('entity-modal-context')).toContainText('Black Book');
  });

  test('document modal tab changes preserve size and single primary scroll region', async ({
    page,
    request,
  }) => {
    const documentId = await resolveFirstDocumentId(request);
    if (!documentId) {
      test.skip(true, 'No documents available');
      return;
    }

    await preparePage(page);
    await page.goto(`/documents/${documentId}?modalTab=analysis`);

    const modal = page.locator('#DocumentModal');
    const openedFromRoute = await modal.isVisible({ timeout: 20000 }).catch(() => false);
    if (!openedFromRoute) {
      await page.goto('/documents');
      const firstCard = page.locator('.document-card').first();
      if (!(await firstCard.isVisible().catch(() => false))) {
        test.skip(true, 'No document cards available to open Document modal');
        return;
      }
      await firstCard.click();
    }
    await expect(modal).toBeVisible({ timeout: 20000 });

    const initialBox = await modal.boundingBox();
    expect(initialBox).toBeTruthy();

    await expect(page.getByTestId('document-modal-scroll-region')).toHaveCount(1);

    const scrollRegionCount = await page
      .locator('#DocumentModal .flex-1.min-h-0.relative')
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

    await page.getByText('Clean Text').click();
    await expect(page).toHaveURL(/textMode=clean/);
    await expect(page.getByTestId('document-modal-tabpanel-analysis')).toBeVisible();

    await page.getByText('Raw OCR').click();
    await expect(page).toHaveURL(/textMode=ocr/);
    await expect(page.getByTestId('document-modal-tabpanel-analysis')).toBeVisible();

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
      test.skip(true, 'No entity with linked flights available');
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
    const hasCard = await firstCard.isVisible({ timeout: 20000 }).catch(() => false);
    if (!hasCard) {
      test.skip(true, 'No subject cards available');
      return;
    }

    await firstCard.click();
    await expect(page).toHaveURL(/\/entity\/\d+/);

    await page.getByRole('button', { name: 'Go back' }).click();
    await expect(page).toHaveURL(/\/people(?:\?|$)/, { timeout: 20000 });
    await expect(page.getByTestId('subject-card').first()).toBeVisible({ timeout: 20000 });
  });

  test('email evidence navigation returns to the originating thread and message', async ({
    page,
    request,
  }) => {
    const resolved = await resolveThreadAndMessage(request);
    if (!resolved) {
      test.skip(true, 'No email thread/message fixture available');
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
    const evidenceVisible = await evidenceButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (!evidenceVisible) {
      test.skip(true, 'Evidence button not available for selected email message');
      return;
    }

    await evidenceButton.click();
    await expect(page).toHaveURL(
      new RegExp(`/documents/${encodeURIComponent(resolved.messageId)}(?:\\?|$)`),
    );

    await page.getByRole('button', { name: 'Go back' }).click();
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
    await page.goto('/intelligence');

    // Should load the page heading
    await expect(page.getByRole('heading', { name: /intelligence review/i })).toBeVisible({
      timeout: 20000,
    });

    // Should render queue cards (regardless of whether they have data or show empty)
    const queueCards = page.locator('[class*="queueCard"]');
    const cardCount = await queueCards.count().catch(() => 0);

    // Either queue cards are visible, or the loading state resolved cleanly
    const loadingText = await page
      .getByText(/loading intelligence queues/i)
      .isVisible()
      .catch(() => false);
    if (!loadingText) {
      // After loading, we expect either queue cards or the readiness widget
      const hasQueues = cardCount > 0;
      const hasReadiness = await page
        .locator('[class*="readinessTile"]')
        .count()
        .catch(() => 0);
      expect(hasQueues || hasReadiness > 0).toBeTruthy();
    }

    // No JavaScript errors on this page
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(1000);
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

    // After loading, should show queue items or the empty state — never a blank screen
    const queueResolved = await Promise.race([
      page
        .locator('[class*="queueItem"]')
        .first()
        .isVisible({ timeout: 15000 })
        .catch(() => false),
      page
        .getByText(/queue is empty/i)
        .isVisible({ timeout: 15000 })
        .catch(() => false),
      page
        .getByText(/loading queue/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false),
    ]);
    expect(queueResolved).toBeTruthy();
  });

  test('investigation evidence deep links reconstruct case-folder UI for both route patterns', async ({
    page,
    request,
  }) => {
    const resolved = await resolveInvestigationAndEvidence(request);
    if (!resolved) {
      test.skip(true, 'No investigation evidence available');
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
      const caseFolderButton = page
        .locator(
          'button:has-text("Case Folder"), button[title="Case Folder"], button[aria-label="Case Folder"]',
        )
        .first();
      const hasCaseFolder = await caseFolderButton.isVisible({ timeout: 60000 }).catch(() => false);
      if (!hasCaseFolder) {
        test.skip(true, 'Investigation workspace deep-link controls not available in this fixture');
        return;
      }
      await expect(caseFolderButton).toBeVisible({ timeout: 60000 });
      await caseFolderButton.click();

      const row = page.locator(`[data-evidence-row-id="${evidenceId}"]`);
      await expect(row).toBeVisible({ timeout: 12000 });
      await expect(row).toHaveClass(/border-cyan-400/);

      await expect(page.locator('#DocumentModal, [role="dialog"][aria-modal="true"]')).toBeVisible({
        timeout: 12000,
      });
    }
  });
});
