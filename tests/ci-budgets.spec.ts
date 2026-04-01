/**
 * CI PERFORMANCE BUDGETS
 *
 * Enforces hard limits on:
 * - API response times (p95 < 500ms, p99 < 1000ms)
 * - Payload sizes (< 100KB for lists)
 * - Bundle size (< 500KB gzipped)
 * - Console errors (zero tolerance)
 *
 * Run in CI to fail builds that violate budgets
 */

import { test, expect } from '@playwright/test';

const API_BUDGETS = {
  p95: 500, // ms
  p99: 1000, // ms
  maxPayloadKB: 100,
};

const BUNDLE_BUDGET = {
  maxMainBundleKB: 500, // gzipped
};

test.describe('CI Performance Budgets', () => {
  test.skip(!process.env.CI, 'CI-only performance budget checks');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('API p95 latency < 500ms', async ({ page }) => {
    const apiTimes: number[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = (response as any).timing();
        if (timing) {
          apiTimes.push(timing.responseEnd);
        }
      }
    });

    // Navigate and trigger API calls
    await page.goto('/people');
    await page.waitForTimeout(2000);
    await page.click('[data-testid="subject-card"]');
    await page.waitForTimeout(1000);

    // Calculate p95
    apiTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(apiTimes.length * 0.95);
    const p95 = apiTimes[p95Index] || 0;

    console.log(`API p95: ${p95.toFixed(2)}ms (budget: ${API_BUDGETS.p95}ms)`);
    expect(p95).toBeLessThan(API_BUDGETS.p95);
  });

  test('API p99 latency < 1000ms', async ({ page }) => {
    const apiTimes: number[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = (response as any).timing();
        if (timing) {
          apiTimes.push(timing.responseEnd);
        }
      }
    });

    // Navigate and trigger API calls
    await page.goto('/people');
    await page.waitForTimeout(2000);
    await page.click('[data-testid="subject-card"]');
    await page.waitForTimeout(1000);

    // Calculate p99
    apiTimes.sort((a, b) => a - b);
    const p99Index = Math.floor(apiTimes.length * 0.99);
    const p99 = apiTimes[p99Index] || 0;

    console.log(`API p99: ${p99.toFixed(2)}ms (budget: ${API_BUDGETS.p99}ms)`);
    expect(p99).toBeLessThan(API_BUDGETS.p99);
  });

  test('List endpoint payloads < 100KB', async ({ page }) => {
    const violations: Array<{ url: string; sizeKB: number }> = [];

    page.on('response', async (response) => {
      const url = response.url();

      // Check list endpoints
      if (
        url.includes('/api/subjects') ||
        url.includes('/api/entities') ||
        url.includes('/api/documents') ||
        url.includes('/api/emails')
      ) {
        const body = await response.body();
        const sizeKB = body.length / 1024;

        if (sizeKB > API_BUDGETS.maxPayloadKB) {
          violations.push({ url, sizeKB });
        }
      }
    });

    await page.goto('/people');
    await page.waitForTimeout(2000);

    if (violations.length > 0) {
      console.error('Payload budget violations:');
      violations.forEach((v) => {
        console.error(
          `  ${v.url}: ${v.sizeKB.toFixed(2)} KB (budget: ${API_BUDGETS.maxPayloadKB} KB)`,
        );
      });
    }

    expect(violations).toHaveLength(0);
  });

  test('No body_raw in list responses', async ({ page }) => {
    const violations: string[] = [];

    page.on('response', async (response) => {
      const url = response.url();

      // Check list endpoints
      if (
        url.includes('/api/subjects') ||
        url.includes('/api/entities') ||
        url.includes('/api/documents')
      ) {
        try {
          const json = await response.json();
          const data = json.data || json.subjects || json.entities || [];

          for (const item of data) {
            if (item.body_raw || item.content || item.evidence_pack_json) {
              violations.push(url);
              break;
            }
          }
        } catch (_e) {
          // Not JSON, skip
        }
      }
    });

    await page.goto('/people');
    await page.waitForTimeout(2000);

    if (violations.length > 0) {
      console.error('Heavy payload violations (body_raw/content in list):');
      violations.forEach((v) => console.error(`  ${v}`));
    }

    expect(violations).toHaveLength(0);
  });

  test('Main bundle < 500KB gzipped', async ({ page }) => {
    const bundles: Array<{ url: string; sizeKB: number }> = [];

    page.on('response', async (response) => {
      const url = response.url();

      if (url.endsWith('.js') && (url.includes('index') || url.includes('main'))) {
        const body = await response.body();
        const sizeKB = body.length / 1024;
        bundles.push({ url, sizeKB });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mainBundle = bundles.find((b) => b.url.includes('index') || b.url.includes('main'));

    if (mainBundle) {
      console.log(
        `Main bundle: ${mainBundle.sizeKB.toFixed(2)} KB (budget: ${BUNDLE_BUDGET.maxMainBundleKB} KB)`,
      );
      expect(mainBundle.sizeKB).toBeLessThan(BUNDLE_BUDGET.maxMainBundleKB);
    }
  });

  test('Zero console errors during navigation', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate through app
    await page.goto('/people');
    await page.waitForTimeout(1000);
    await page.goto('/documents');
    await page.waitForTimeout(1000);
    await page.goto('/media');
    await page.waitForTimeout(1000);

    if (errors.length > 0) {
      console.error('Console errors detected:');
      errors.forEach((e) => console.error(`  ${e}`));
    }

    expect(errors).toHaveLength(0);
  });

  test('Zero React key warnings', async ({ page }) => {
    const warnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().toLowerCase().includes('key')) {
        warnings.push(msg.text());
      }
    });

    await page.goto('/people');
    await page.waitForTimeout(2000);

    if (warnings.length > 0) {
      console.error('React key warnings detected:');
      warnings.forEach((w) => console.error(`  ${w}`));
    }

    expect(warnings).toHaveLength(0);
  });
});
