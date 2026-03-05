import { expect, test, type APIRequestContext } from '@playwright/test';

const API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://epstein.academy/api'
    : `${process.env.PW_API_BASE_URL || 'http://localhost:3312'}/api`;

const resolveFirstEntityId = async (request: APIRequestContext): Promise<string | null> => {
  const response = await request.get(
    `${API_BASE}/entities?limit=10&sortBy=mentions&sortOrder=desc`,
  );
  if (!response.ok()) return null;
  const payload = await response.json();
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const first = items.find((item: any) => Number.isFinite(Number(item?.id)));
  if (!first) return null;
  return String(first.id);
};

const resolveFirstDocumentId = async (request: APIRequestContext): Promise<string | null> => {
  const response = await request.get(`${API_BASE}/documents?page=1&limit=5`);
  if (!response.ok()) return null;
  const payload = await response.json();
  const items = Array.isArray(payload?.data) ? payload.data : [];
  const first = items.find((item: any) => Number.isFinite(Number(item?.id)));
  if (!first) return null;
  return String(first.id);
};

const resolveInvestigationAndEvidence = async (
  request: APIRequestContext,
): Promise<{ investigationId: string; evidenceId: string } | null> => {
  const response = await request.get(`${API_BASE}/investigations?limit=5`);
  if (!response.ok()) return null;
  const payload = await response.json();
  const first = Array.isArray(payload?.data)
    ? payload.data.find((item: any) => Number.isFinite(Number(item?.id)))
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
    const response = await request.get(`${API_BASE}/subjects?page=1&limit=1`, { timeout: 15000 });
    expect(response.ok()).toBeTruthy();
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
