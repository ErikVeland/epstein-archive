# SEO & Social Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side OG tag injection for `/evidence/:id` and `/entity/:id`, replace the static sitemap with a dynamic DB-backed one, and add small missing meta tags.

**Architecture:** Extend `src/app.ts` with two new private SSR methods (`tryServeEvidenceShareMeta`, `tryServeEntityShareMeta`) following the exact pattern of the existing `tryServeMediaShareMeta`. Extract shared tag-injection into a private `injectOgTags` helper to eliminate duplication. Add a new Express route file for the dynamic sitemap.

**Tech Stack:** Express.js, TypeScript, PostgreSQL (`pg` pool), Playwright (tests), `react-helmet-async` (client-side)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/app.ts` | Modify | Extract `injectOgTags` helper; add two new SSR methods; import `evidenceRepository`; register sitemap route; wire new handlers into SPA fallback |
| `src/server/routes/sitemap.ts` | Create | Dynamic sitemap Express router — queries entity IDs, emits XML |
| `src/client/hooks/useSeoConfig.ts` | Modify | Add `BreadcrumbList` JSON-LD schema to each collection route |
| `index.html` | Modify | Add `og:image:type` and `fediverse:creator` tags |
| `public/sitemap.xml` | Delete | Superseded by dynamic route |
| `tests/seo-ssr.spec.ts` | Create | Integration tests for SSR OG injection and sitemap |

---

## Task 1: Extract `injectOgTags` helper in `app.ts`

**Files:**
- Modify: `src/app.ts` (around line 938 — inside `tryServeMediaShareMeta`)

This task refactors the existing media OG handler to use a shared helper. No behaviour changes — just extraction. The test for this task verifies the existing media SSR still works after the refactor.

- [ ] **Step 1: Create the test file**

Create `tests/seo-ssr.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to confirm it currently passes (baseline)**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts --reporter=line
```

Expected: 1 test passes (media SSR is already working).

- [ ] **Step 3: Extract `injectOgTags` private method into `app.ts`**

In `src/app.ts`, add this private method immediately before `tryServeMediaShareMeta` (around line 869):

```typescript
private injectOgTags(
  html: string,
  opts: {
    title: string;
    description: string;
    image: string;
    imageAlt: string;
    canonical: string;
    imageType?: string;
  },
): string {
  const t = this.escapeHtml(opts.title);
  const d = this.escapeHtml(opts.description);
  const img = this.escapeHtml(opts.image);
  const imgAlt = this.escapeHtml(opts.imageAlt);
  const canon = this.escapeHtml(opts.canonical);
  const imgType = this.escapeHtml(opts.imageType ?? 'image/jpeg');

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${t} | Epstein Files Archive</title>`);
  html = this.replaceMetaTag(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${d}" />`);
  html = this.replaceMetaTag(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canon}" />`);
  html = this.replaceMetaTag(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${t}" />`);
  html = this.replaceMetaTag(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${d}" />`);
  html = this.replaceMetaTag(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${img}" />`);
  html = this.replaceMetaTag(html, /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${imgAlt}" />`);
  html = this.replaceMetaTag(html, /<meta\s+property="og:image:type"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:type" content="${imgType}" />`);
  html = this.replaceMetaTag(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canon}" />`);
  html = this.replaceMetaTag(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${t}" />`);
  html = this.replaceMetaTag(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${d}" />`);
  html = this.replaceMetaTag(html, /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${img}" />`);
  html = this.replaceMetaTag(html, /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image:alt" content="${imgAlt}" />`);
  return html;
}
```

- [ ] **Step 4: Update `tryServeMediaShareMeta` to use `injectOgTags`**

Replace the block in `tryServeMediaShareMeta` that starts with `let html = await this.loadIndexTemplate();` (lines 931–996) with:

```typescript
      let html = await this.loadIndexTemplate();
      html = this.injectOgTags(html, { title, description, image, imageAlt, canonical });

      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).type('html').send(html);
      return true;
```

Remove the 13 individual `this.replaceMetaTag` calls and the `escaped*` variable declarations that preceded them.

- [ ] **Step 5: Run the test to confirm refactor didn't break anything**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts --reporter=line
```

Expected: 1 test passes.

- [ ] **Step 6: Type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/app.ts tests/seo-ssr.spec.ts
git commit -m "refactor(seo): extract injectOgTags helper, use in media SSR handler"
```

---

## Task 2: SSR OG for `/evidence/:id`

**Files:**
- Modify: `src/app.ts` (add import + new method + wire into SPA fallback)
- Modify: `tests/seo-ssr.spec.ts` (add test)

- [ ] **Step 1: Add the test**

Append to the `test.describe` block in `tests/seo-ssr.spec.ts`:

```typescript
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
    // og:title must be present
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts -g "evidence page" --reporter=line
```

Expected: FAIL — the evidence page currently returns the generic SPA shell with the default title.

- [ ] **Step 3: Add `evidenceRepository` import to `app.ts`**

Find the existing import block around lines 59-60:

```typescript
import { entitiesRepository } from './server/db/entitiesRepository.js';
import { mediaRepository } from './server/db/mediaRepository.js';
```

Add after those two lines:

```typescript
import { evidenceRepository } from './server/db/evidenceRepository.js';
```

- [ ] **Step 4: Add `tryServeEvidenceShareMeta` private method to `app.ts`**

Add this method immediately after `tryServeMediaShareMeta` (after line 1007):

```typescript
  private async tryServeEvidenceShareMeta(req: Request, res: Response): Promise<boolean> {
    try {
      if (!req.path.startsWith('/evidence/')) return false;
      const id = req.path.replace('/evidence/', '').split('/')[0].trim();
      if (!id) return false;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const canonical = `${baseUrl}${req.originalUrl}`;

      let title = `Evidence Record ${id}`;
      let description =
        'Search and analyze the Epstein Files archive: documents, emails, media, entities, timelines, and flights.';
      const image = `${baseUrl}/epstein-files.jpg`;
      const imageAlt = 'Epstein Files Archive cover image';

      const evidence = await evidenceRepository.getEvidenceById(id);
      if (evidence) {
        if (typeof evidence.title === 'string' && evidence.title.trim()) {
          title = evidence.title.trim();
        }
        if (typeof evidence.description === 'string' && evidence.description.trim()) {
          const raw = evidence.description.trim();
          description = raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
        }
      }

      let html = await this.loadIndexTemplate();
      html = this.injectOgTags(html, { title, description, image, imageAlt, canonical });

      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).type('html').send(html);
      return true;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to render evidence OG metadata, falling back to SPA shell');
      return false;
    }
  }
```

- [ ] **Step 5: Wire into the SPA fallback handler**

Find the SPA fallback block (around line 838):

```typescript
    this.app.get('*', async (req, res) => {
      if (await this.tryServeMediaShareMeta(req, res)) {
        return;
      }
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
```

Replace with:

```typescript
    this.app.get('*', async (req, res) => {
      if (await this.tryServeMediaShareMeta(req, res)) {
        return;
      }
      if (await this.tryServeEvidenceShareMeta(req, res)) {
        return;
      }
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
```

- [ ] **Step 6: Run the test**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts -g "evidence page" --reporter=line
```

Expected: PASS.

- [ ] **Step 7: Type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/app.ts tests/seo-ssr.spec.ts
git commit -m "feat(seo): server-side OG injection for /evidence/:id"
```

---

## Task 3: SSR OG for `/entity/:id`

**Files:**
- Modify: `src/app.ts` (add method + wire into SPA fallback)
- Modify: `tests/seo-ssr.spec.ts` (add test)

- [ ] **Step 1: Add the test**

Append to the `test.describe` block in `tests/seo-ssr.spec.ts`:

```typescript
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
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    // Description should reference the archive
    expect(html).toContain('archive');
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts -g "entity page" --reporter=line
```

Expected: FAIL.

- [ ] **Step 3: Add `tryServeEntityShareMeta` private method to `app.ts`**

Add immediately after `tryServeEvidenceShareMeta`:

```typescript
  private async tryServeEntityShareMeta(req: Request, res: Response): Promise<boolean> {
    try {
      if (!req.path.startsWith('/entity/')) return false;
      const rawId = req.path.replace('/entity/', '').split('/')[0].trim();
      if (!rawId) return false;
      const numericId = Number(rawId);
      if (Number.isNaN(numericId) || numericId <= 0) return false;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const canonical = `${baseUrl}${req.originalUrl}`;

      let title = `Entity ${numericId}`;
      let description =
        'Browse entities, mention context, and supporting references across the Epstein files archive.';
      const image = `${baseUrl}/epstein-files.jpg`;
      const imageAlt = 'Epstein Files Archive cover image';

      const entity = await entitiesRepository.getEntityById(numericId);
      if (entity) {
        if (entity.name && entity.name !== 'Unknown') {
          title = entity.name;
        }
        const role = entity.primaryRole && entity.primaryRole !== 'Unknown' ? entity.primaryRole : null;
        const mentions = typeof entity.mentions === 'number' ? entity.mentions : 0;
        description = role
          ? `${role} — ${mentions} mention${mentions === 1 ? '' : 's'} in the Epstein Files archive.`
          : `${mentions} mention${mentions === 1 ? '' : 's'} in the Epstein Files archive.`;
      }

      let html = await this.loadIndexTemplate();
      html = this.injectOgTags(html, { title, description, image, imageAlt, canonical });

      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(200).type('html').send(html);
      return true;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to render entity OG metadata, falling back to SPA shell');
      return false;
    }
  }
```

- [ ] **Step 4: Wire into the SPA fallback handler**

Find the SPA fallback block updated in Task 2:

```typescript
      if (await this.tryServeEvidenceShareMeta(req, res)) {
        return;
      }
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
```

Replace with:

```typescript
      if (await this.tryServeEvidenceShareMeta(req, res)) {
        return;
      }
      if (await this.tryServeEntityShareMeta(req, res)) {
        return;
      }
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
```

- [ ] **Step 5: Run the test**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts -g "entity page" --reporter=line
```

Expected: PASS.

- [ ] **Step 6: Type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/app.ts tests/seo-ssr.spec.ts
git commit -m "feat(seo): server-side OG injection for /entity/:id"
```

---

## Task 4: Dynamic Sitemap

**Files:**
- Create: `src/server/routes/sitemap.ts`
- Modify: `src/app.ts` (import + register route)
- Delete: `public/sitemap.xml`
- Modify: `tests/seo-ssr.spec.ts` (add test)

- [ ] **Step 1: Add the sitemap test**

Append a new `test.describe` block to `tests/seo-ssr.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts -g "Dynamic sitemap" --reporter=line
```

Expected: FAIL — `/sitemap.xml` currently serves the static file (no entity URLs).

- [ ] **Step 3: Create `src/server/routes/sitemap.ts`**

```typescript
import { Router } from 'express';
import type { Request, Response } from 'express';
import { getApiPool } from '../db/connection.js';

const router = Router();

const ORIGIN = 'https://epstein.academy';

interface CollectionEntry {
  loc: string;
  changefreq: string;
  priority: string;
}

const COLLECTION_URLS: CollectionEntry[] = [
  { loc: `${ORIGIN}/`, changefreq: 'hourly', priority: '1.0' },
  { loc: `${ORIGIN}/search`, changefreq: 'hourly', priority: '0.9' },
  { loc: `${ORIGIN}/the-epstein-files`, changefreq: 'daily', priority: '0.95' },
  { loc: `${ORIGIN}/epstein-documents`, changefreq: 'daily', priority: '0.9' },
  { loc: `${ORIGIN}/epstein-people`, changefreq: 'daily', priority: '0.85' },
  { loc: `${ORIGIN}/epstein-media`, changefreq: 'daily', priority: '0.85' },
  { loc: `${ORIGIN}/epstein-timeline`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/epstein-flights`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/documents`, changefreq: 'hourly', priority: '0.9' },
  { loc: `${ORIGIN}/people`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/media`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/emails`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/timeline`, changefreq: 'daily', priority: '0.7' },
  { loc: `${ORIGIN}/flights`, changefreq: 'daily', priority: '0.7' },
  { loc: `${ORIGIN}/properties`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${ORIGIN}/blackbook`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${ORIGIN}/analytics`, changefreq: 'daily', priority: '0.7' },
  { loc: `${ORIGIN}/about`, changefreq: 'weekly', priority: '0.5' },
  { loc: `${ORIGIN}/faq`, changefreq: 'weekly', priority: '0.5' },
];

function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string): string {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodLine}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const pool = getApiPool();
    const result = await pool.query<{ id: number }>('SELECT id FROM entities ORDER BY id');
    const entityIds = result.rows.map((r) => r.id);

    const collectionXml = COLLECTION_URLS.map(({ loc, changefreq, priority }) =>
      urlEntry(loc, changefreq, priority, today),
    ).join('\n');

    const entityXml = entityIds
      .map((id) => urlEntry(`${ORIGIN}/entity/${id}`, 'weekly', '0.6'))
      .join('\n');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      collectionXml,
      entityXml,
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).type('text').send('Error generating sitemap');
  }
});

export default router;
```

- [ ] **Step 4: Import and register sitemap route in `app.ts`**

Add the import near the other route imports (around line 56):

```typescript
import sitemapRouter from './server/routes/sitemap.js';
```

Register the route **before** `this.app.use('/api', router)` (around line 835). Find the line:

```typescript
    this.app.use('/api', router);
```

Add before it:

```typescript
    this.app.use('/sitemap.xml', sitemapRouter);
```

- [ ] **Step 5: Delete the static sitemap**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
rm public/sitemap.xml
```

- [ ] **Step 6: Run the sitemap tests**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts -g "Dynamic sitemap" --reporter=line
```

Expected: both tests PASS.

- [ ] **Step 7: Type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/app.ts src/server/routes/sitemap.ts tests/seo-ssr.spec.ts
git rm public/sitemap.xml
git commit -m "feat(seo): replace static sitemap.xml with dynamic DB-backed route including entity URLs"
```

---

## Task 5: Small meta tag additions

**Files:**
- Modify: `index.html`
- Modify: `src/client/hooks/useSeoConfig.ts`

No tests needed for static HTML changes; the existing Playwright tests cover page load.

- [ ] **Step 1: Add `og:image:type` and `fediverse:creator` to `index.html`**

Find the existing block (around line 25):

```html
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
```

Add after `og:image:height`:

```html
    <meta property="og:image:type" content="image/jpeg" />
    <meta name="fediverse:creator" content="@ErikVeland@threads.net" />
```

- [ ] **Step 2: Add `BreadcrumbList` schema to each collection route in `useSeoConfig.ts`**

At the top of the `useMemo` callback (after the `commonKeywords` line), add a helper function:

```typescript
    const breadcrumb = (sectionName: string, sectionUrl: string) => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
        { '@type': 'ListItem', position: 2, name: sectionName, item: sectionUrl },
      ],
    });
```

Then update each route to include breadcrumb in its `schema` array. For example the `/documents` route changes from:

```typescript
        schema: {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          ...
        },
```

to:

```typescript
        schema: [
          {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'Epstein Documents Dataset',
            description:
              'Searchable collection of documents, OCR text, and metadata from the Epstein files archive.',
            url: canonical,
            inLanguage: 'en',
            isAccessibleForFree: true,
          },
          breadcrumb('Documents', canonical),
        ],
```

Apply the same pattern to every route that already has a `schema` property: `/people`, `/media`, `/timeline`, `/flights`, `/about`, `/emails`, `/analytics`, `/blackbook`, `/properties`, `/investigations`, `/guide`. For routes that already have an array schema (e.g. `/the-epstein-files`), append `breadcrumb(...)` to the existing array.

Routes that have no `schema` key (e.g. `/about`, `/emails`) should receive `schema: [breadcrumb('About', canonical)]` etc.

- [ ] **Step 3: Type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 4: Lint fix**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm lint:fix
```

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add index.html src/client/hooks/useSeoConfig.ts
git commit -m "feat(seo): add og:image:type, fediverse:creator, and BreadcrumbList schema to all collection routes"
```

---

## Task 6: Full test run + verification

- [ ] **Step 1: Run the full SSR test suite**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/seo-ssr.spec.ts --reporter=line
```

Expected: all 5 tests PASS.

- [ ] **Step 2: Run the contract tests**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx playwright test tests/api-dto-contract.spec.ts --reporter=line
```

Expected: all PASS (sitemap route is outside `/api`, should not affect contracts).

- [ ] **Step 3: Spot-check OG tags manually**

With the server running on `:3012`, open these URLs in a browser and view source to confirm:

- `http://localhost:3012/evidence/<any-valid-id>` — `<title>` should contain the document title
- `http://localhost:3012/entity/<any-valid-id>` — `<title>` should contain the entity name
- `http://localhost:3012/sitemap.xml` — well-formed XML with `/entity/` URLs present

- [ ] **Step 4: Final type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.
