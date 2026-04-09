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
    // The media SSR handler injects "Epstein Media Album 1 | Epstein Files Archive"
    // for albumId=1. This verifies the title override actually ran.
    expect(html).toContain('<title>Epstein Media Album 1 | Epstein Files Archive</title>');
  });
});
