import { test, expect } from '@playwright/test';

test.describe('Entity Network Navigator', () => {
  test('network page loads and shows graph filter bar', async ({ page }) => {
    await page.goto('/network');
    await expect(page.getByPlaceholder('Search entities...')).toBeVisible();
    await expect(page.getByText('All signals')).toBeVisible();
    await expect(page.getByText('Financial')).toBeVisible();
    await expect(page.getByText('Flights')).toBeVisible();
  });

  test('clicking a signal filter updates the active state', async ({ page }) => {
    await page.goto('/network');
    await page.getByText('Financial').click();
    const financialBtn = page.getByRole('button', { name: /financial/i });
    await expect(financialBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('entity profile has Connections tab', async ({ page }) => {
    await page.goto('/people');
    const firstCard = page.locator('[data-testid="subject-card"]').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();
    await expect(page.getByRole('tab', { name: /connections/i })).toBeVisible();
  });

  test('connections tab renders list or empty state', async ({ page }) => {
    await page.goto('/people');
    const firstCard = page.locator('[data-testid="subject-card"]').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();
    await page.getByRole('tab', { name: /connections/i }).click();
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;
    const hasEmpty = await page
      .getByText('No connections found')
      .isVisible()
      .catch(() => false);
    expect(hasCards || hasEmpty).toBe(true);
  });
});
