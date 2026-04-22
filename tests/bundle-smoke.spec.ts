import { test, expect } from '@playwright/test';

/**
 * Production bundle smoke tests.
 *
 * These run against the built dist/ via `vite preview`, NOT the dev server.
 * Their sole job: catch JS runtime errors (ReferenceError, TypeError, etc.)
 * that only appear after Vite chunks and minifies the output.
 *
 * Routes tested are intentionally public/unauthenticated so no login is needed.
 */

const PUBLIC_ROUTES = ['/', '/search', '/documents', '/people', '/financial', '/timeline'];

// These patterns appear in the console during normal operation and are not bugs.
const EXPECTED_CONSOLE_NOISE = [
  /favicon\.ico/,
  /Content-Security-Policy/,
  /Download the React DevTools/,
  /\[HMR\]/,
  /Internal Server Error/,
  /Failed to load resource/,
  /Failed to load investigations/,
];

function isExpectedNoise(msg: string): boolean {
  return EXPECTED_CONSOLE_NOISE.some((re) => re.test(msg));
}

for (const route of PUBLIC_ROUTES) {
  test(`no JS errors on ${route}`, async ({ page }) => {
    const errors: string[] = [];

    // Uncaught JS exceptions (e.g. ReferenceError, TypeError from bad bundle init order)
    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}`);
    });

    // console.error() calls from app code or React
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isExpectedNoise(msg.text())) {
        errors.push(`[console.error] ${msg.text()}`);
      }
    });

    await page.goto(route, { waitUntil: 'domcontentloaded' });

    // Wait for React to mount — if it throws during hydration we'll see it here
    await expect(page.locator('#root')).toBeVisible({ timeout: 10_000 });

    // Give async effects a moment to run
    await page.waitForTimeout(500);

    expect(errors, `JS errors detected on ${route}:\n${errors.join('\n')}`).toHaveLength(0);
  });
}
