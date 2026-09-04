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

test.describe('Investigation mobile access', () => {
  test('uses one case shell and preserves the requested view', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile shell test');
    const investigationId = await resolveFirstInvestigation(request);
    test.skip(!investigationId, 'No investigation is available');

    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
    });
    await page.goto(`/investigations/${investigationId}?tab=evidence`);

    await expect(page).toHaveURL(/tab=evidence/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('navigation', { name: 'Investigation navigation' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Notifications' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Back to cases' })).toBeVisible();
  });

  test('sends signed-out users to sign-in before they create', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile shell test');
    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
    });
    await page.goto('/investigations');
    await page
      .getByRole('button', { name: /Investigator sign-in/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login\?returnTo=%2Finvestigations/);
  });
});
