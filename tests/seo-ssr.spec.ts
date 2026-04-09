import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3012';

test.describe('SSR OG meta tags', () => {
  test('media share URL returns og:title in HTML', async ({ request }) => {
    // Smoke-test that the existing media handler still works after refactor.
    // Uses albumId=1 which will fall back gracefully even if album doesn't exist.
    const res = await request.get(`${BASE}/media?albumId=1`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('og:image');
  });
});
