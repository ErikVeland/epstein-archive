import { expect, test, type APIRequestContext } from '@playwright/test';

const resolveFirstInvestigation = async (request: APIRequestContext) => {
  const response = await request.get('/api/investigations?limit=5');
  if (!response.ok()) return null;
  const payload = await response.json();
  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  return first ? String(first.uuid || first.id) : null;
};

test('communications analysis provides a real action path', async ({ page, request }) => {
  const investigationId = await resolveFirstInvestigation(request);
  if (!investigationId) {
    expect(true, 'No investigations available').toBeFalsy();
    return;
  }

  await page.goto(`/investigations/${investigationId}?tab=communications`);

  const startButton = page.getByRole('button', { name: /Start Communication Analysis/i }).first();
  const visibleFromRoute = await startButton.isVisible({ timeout: 4000 }).catch(() => false);
  if (!visibleFromRoute) {
    await page.getByRole('button', { name: 'Communications' }).click();
  }
  await expect(startButton).toBeVisible({ timeout: 10000 });

  if (await startButton.isEnabled()) {
    await startButton.click();
    await page.waitForTimeout(1500);
  }

  const patternCard = page.locator('text=Detected Communication Patterns').first();
  const needsInputText = page.locator('text=Needs input:').first();
  const openScoped = page.getByRole('button', { name: /Open case-scoped email view/i }).first();

  const hasPattern = await patternCard.isVisible().catch(() => false);
  const hasNeedsInput = await needsInputText.isVisible().catch(() => false);

  expect(hasPattern || hasNeedsInput).toBeTruthy();
  await expect(openScoped).toBeVisible({ timeout: 10000 });
});
