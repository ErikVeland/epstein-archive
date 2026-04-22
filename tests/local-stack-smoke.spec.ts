import { expect, test } from '@playwright/test';

test.describe('Local stack smoke', () => {
  test('boots the local frontend and backend together', async ({ page }) => {
    const health = await page.request.get('/api/health');
    expect(health.ok()).toBeTruthy();

    const healthBody = await health.json();
    expect(healthBody.status).toBe('ok');

    await page.goto('/');
    await expect(page).toHaveTitle(/Epstein/i);
    await expect(page.locator('#root')).toBeVisible();
  });
});
