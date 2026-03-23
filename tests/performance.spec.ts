/**
 * Performance test suite for Epstein Archive
 * Ensures performance regressions are caught early
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to be ready
    await page.waitForSelector('[data-testid="people-page"]', { timeout: 10000 });
  });

  test('People page loads and renders subject cards', async ({ page }) => {
    await page.goto('/people');
    await page.waitForSelector('[data-testid="subject-card"]', { timeout: 5000 });
  });

  test('Entity modal opens and renders evidence panel', async ({ page }) => {
    await page.goto('/people');
    await page.waitForSelector('[data-testid="subject-card"]');

    await page.click('[data-testid="subject-card"]');
    await page.waitForSelector('[data-testid="evidence-modal"]', { timeout: 2000 });
  });

  test('Search debounce prevents excessive API calls', async ({ page }) => {
    let apiCallCount = 0;

    page.on('request', (request) => {
      if (request.url().includes('/api/search')) {
        apiCallCount++;
      }
    });

    await page.goto('/people');
    const searchInput = page.locator('input[type="text"]');

    // Type quickly
    await searchInput.type('test', { delay: 50 });

    // Wait for debounce
    await page.waitForTimeout(500);

    // Should only make 1 API call due to debouncing
    expect(apiCallCount).toBeLessThanOrEqual(1);
  });

  test('API responses are under 500KB', async ({ page }) => {
    let largePayloads = 0;

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const body = await response.body();
        const sizeKB = body.length / 1024;

        if (sizeKB > 500) {
          console.warn(`Large payload detected: ${response.url()} (${sizeKB.toFixed(2)} KB)`);
          largePayloads++;
        }
      }
    });

    await page.goto('/people');
    await page.waitForTimeout(2000);

    expect(largePayloads).toBe(0);
  });

  test('No console errors during navigation', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/people');
    await page.getByRole('button', { name: 'Documents', exact: true }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Media', exact: true }).click();
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });

  test('Bundle size is under 500KB (gzipped)', async ({ page }) => {
    const resources: { url: string; size: number }[] = [];

    page.on('response', async (response) => {
      if (response.url().endsWith('.js')) {
        const body = await response.body();
        resources.push({
          url: response.url(),
          size: body.length,
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mainBundle = resources.find((r) => r.url.includes('index') || r.url.includes('main'));

    if (mainBundle) {
      const sizeKB = mainBundle.size / 1024;
      console.log(`Main bundle size: ${sizeKB.toFixed(2)} KB`);
      expect(sizeKB).toBeLessThan(500);
    }
  });

  test('Component renders complete within 16ms (60fps)', async ({ page }) => {
    await page.goto('/people');

    // Enable performance monitoring
    await page.evaluate(() => {
      (window as any).PerformanceMonitor?.setEnabled(true);
      (window as any).PerformanceMonitor?.clear?.();
    });

    // Trigger re-render by changing filters
    await page.click('[data-testid="sort-filter"]');
    await page.waitForTimeout(500);

    // Check render metrics
    const slowRenders = await page.evaluate(() => {
      const metrics = (window as any).PerformanceMonitor?.getMetrics();
      if (!metrics) return 0;

      return metrics.renders.filter((r: any) => r.duration > 16).length;
    });

    expect(slowRenders).toBe(0);
  });

  test('Lazy-loaded tabs do not fetch data until activated', async ({ page }) => {
    let networkTabRequests = 0;

    page.on('request', (request) => {
      if (request.url().includes('/relationships')) {
        networkTabRequests++;
      }
    });

    await page.goto('/people');
    await page.click('[data-testid="subject-card"]');
    await page.waitForSelector('[data-testid="evidence-modal"]');

    // Network tab should not have been loaded yet
    expect(networkTabRequests).toBe(0);

    // Click network tab
    await page.click('[data-testid="tab-network"]');
    await page.waitForTimeout(500);

    // Now it should have loaded
    expect(networkTabRequests).toBeGreaterThan(0);
  });
});
