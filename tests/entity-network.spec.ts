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
    const financialBtn = page.getByRole('button', { name: /financial/i }).first();
    await financialBtn.click();
    await expect(financialBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('entity profile has Connections tab', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
      window.localStorage.setItem('board_onboarding_seen', 'true');
    });
    await page.goto('/people');
    const firstCard = page.locator('[data-testid="subject-card"]').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();
    await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 10_000 });
    await expect(page.getByRole('tab', { name: /connections/i })).toBeVisible();
  });

  test('connections tab renders list or empty state', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
      window.localStorage.setItem('board_onboarding_seen', 'true');
    });
    await page.goto('/people');
    const firstCard = page.locator('[data-testid="subject-card"]').first();
    await firstCard.waitFor({ state: 'visible' });
    await firstCard.click();
    await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 10_000 });
    await page.getByRole('tab', { name: /connections/i }).click();
    const modal = page.locator('[data-testid="evidence-modal"]');
    const hasConnections = (await modal.getByLabel('Filter connections by name').count()) > 0;
    const hasEmpty = await modal
      .getByText(/no connections found/i)
      .isVisible()
      .catch(() => false);
    expect(hasConnections || hasEmpty).toBe(true);
  });
});
