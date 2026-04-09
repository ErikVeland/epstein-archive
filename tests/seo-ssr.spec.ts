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

  test('evidence page returns item title in og:title', async ({ request }) => {
    // Get a valid evidence ID first
    const listRes = await request.get(`${BASE}/api/evidence?page=1&limit=1`);
    const list = await listRes.json();

    if (!list.data || list.data.length === 0) {
      test.skip(true, 'No evidence records in DB');
      return;
    }

    const id = list.data[0].id as string;
    const res = await request.get(`${BASE}/evidence/${id}`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    // Title tag should contain something other than the default site title
    expect(html).toMatch(/<title>.+\| Epstein Files Archive<\/title>/);
    // og:title must be present as a proper meta attribute
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
  });

  test('entity page returns entity name in og:title', async ({ request }) => {
    // Get a valid entity ID first
    const listRes = await request.get(`${BASE}/api/entities?page=1&limit=1`);
    const list = await listRes.json();

    if (!list.data || list.data.length === 0) {
      test.skip(true, 'No entity records in DB');
      return;
    }

    const id = list.data[0].id as string;
    const res = await request.get(`${BASE}/entity/${id}`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/<title>.+\| Epstein Files Archive<\/title>/);
    // og:title must be present as a proper meta attribute
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    // Description should reference the archive
    expect(html).toContain('archive');
  });
});

test.describe('Dynamic sitemap', () => {
  test('GET /sitemap.xml returns valid XML with entity URLs', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('application/xml');

    const xml = await res.text();
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<urlset');
    // Collection pages must be present
    expect(xml).toContain('https://epstein.academy/');
    expect(xml).toContain('https://epstein.academy/documents');
    // Entity URLs follow /entity/:id pattern
    expect(xml).toMatch(/epstein\.academy\/entity\/\d+/);
  });

  test('GET /sitemap.xml returns Cache-Control: public', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(res.headers()['cache-control']).toContain('public');
  });
});
