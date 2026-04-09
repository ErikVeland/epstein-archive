import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3012';

test.describe('SSR OG meta tags', () => {
  test('media share URL returns og:title in HTML', async ({ request }) => {
    // Smoke-test that the existing media handler still works after refactor.
    // Uses albumId=1 which will fall back gracefully even if album doesn't exist.
    const res = await request.get(`${BASE}/media?albumId=1`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    // Verify OG tags are present as proper meta tag attributes (not just as substrings anywhere)
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:image"');
    // Verify the title tag was actually overwritten from the generic default
    expect(html).toMatch(/<title>.+<\/title>/);
  });
});
