import { expect, test, type APIRequestContext } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const useProductionBaseUrl = process.env.PW_USE_PROD_BASE_URL === '1';
const API_BASE = useProductionBaseUrl
  ? 'https://epstein.academy/api'
  : `${process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`}/api`;

async function resolveFirstInvestigation(request: APIRequestContext): Promise<string | null> {
  const response = await request.get(`${API_BASE}/investigations?limit=5`);
  if (!response.ok()) return null;
  const payload = await response.json();
  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  return first ? String(first.uuid || first.id) : null;
}

test.describe('Investigation Board', () => {
  test('renders in terminal state (hypotheses or empty state)', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop workspace smoke — mobile uses a different shell');
    const investigationId = await resolveFirstInvestigation(request);
    if (!investigationId) {
      expect(true, 'No investigations available').toBeFalsy();
      return;
    }

    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
      window.localStorage.setItem('board_onboarding_seen', 'true');
      window.localStorage.setItem('hasSeenInvestigationOnboarding', 'true');
    });

    await page.goto(`/investigations/${investigationId}?tab=board`);

    // Workspace mounted — the nav button visibility confirms workspace rendered
    await expect(
      page.locator('button').filter({ hasText: 'Investigation Board' }).first(),
    ).toBeVisible({
      timeout: 15000,
    });

    // No uncaught React error boundary
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

    // Terminal state: either the hypothesis column header is visible, or the empty-state prompt
    const hasHypothesisColumn = await page
      .locator('text="Theories & Hypotheses"')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasEmptyState = await page
      .locator('text=/No active theories defined/i')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasHypothesisColumn || hasEmptyState, 'Board should be in terminal state').toBeTruthy();
  });

  test('hypothesis creation round-trip: add button → form → appears in board', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop workspace smoke — mobile uses a different shell');
    const investigationId = await resolveFirstInvestigation(request);
    if (!investigationId) {
      expect(true, 'No investigations available').toBeFalsy();
      return;
    }

    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
      window.localStorage.setItem('board_onboarding_seen', 'true');
      window.localStorage.setItem('hasSeenInvestigationOnboarding', 'true');
    });

    await page.goto(`/investigations/${investigationId}?tab=board`);
    await expect(
      page.locator('button').filter({ hasText: 'Investigation Board' }).first(),
    ).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('text="Theories & Hypotheses"')).toBeVisible({ timeout: 10000 });

    // The add-hypothesis button uses data-testid for robust selection
    const addBtn = page.getByTestId('add-hypothesis-btn');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Inline form appears with "Theoretical Designation..." placeholder
    const titleInput = page.getByPlaceholder('Theoretical Designation...');
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    const hypothesisTitle = `E2E Hypothesis ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await titleInput.fill(hypothesisTitle);

    // Intercept the POST before clicking so we can await it
    const createRespPromise = page.waitForResponse(
      (r) => r.url().includes('/hypotheses') && r.request().method() === 'POST',
      { timeout: 10000 },
    );

    // Submit via the "Initialize" button
    await page.locator('button').filter({ hasText: 'Initialize' }).first().click();

    const createResp = await createRespPromise;
    expect(createResp.ok(), `Hypothesis POST failed: ${createResp.status()}`).toBeTruthy();

    // New hypothesis title must appear in the board
    await expect(page.locator(`text="${hypothesisTitle}"`)).toBeVisible({ timeout: 10000 });
  });
});
