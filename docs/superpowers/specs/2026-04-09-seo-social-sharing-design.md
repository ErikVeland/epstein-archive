# SEO & Social Sharing Improvements — Design Spec

**Date:** 2026-04-09
**Status:** Approved

## Overview

Four targeted improvements to make the Epstein Archive more discoverable and shareable:

1. SSR OG tags for `/evidence/:id`
2. SSR OG tags for `/entity/:id`
3. Dynamic sitemap at `/sitemap.xml` (collections + entities)
4. Small missing meta tags (`og:image:type`, `fediverse:creator`, breadcrumb schema)

## Current State

- `index.html` has a static OG/Twitter baseline (fallback for all crawlers)
- `react-helmet-async` + `useSeoConfig.ts` updates tags client-side on route changes
- `app.ts` already does server-side OG injection for `/media` share URLs via `tryServeMediaShareMeta()`
- `public/sitemap.xml` is a static file with 18 collection-page URLs only
- No SSR OG for evidence or entity deep-links

## Architecture — Approach

**Option 1 selected:** Extend `app.ts` directly, following the existing `tryServeMediaShareMeta` pattern exactly. Extract shared tag-injection into a private helper to eliminate duplication.

## Design

### A — OG injection helper refactor

Extract the repeated regex-replace logic from `tryServeMediaShareMeta` into:

```ts
private injectOgTags(
  html: string,
  opts: { title: string; description: string; image: string; imageAlt: string; canonical: string }
): string
```

This helper handles all tag replacements (title, meta description, canonical, og:title, og:description, og:image, og:image:alt, og:image:type, og:url, twitter:title, twitter:description, twitter:image, twitter:image:alt) and is used by all three SSR handlers.

### B — `tryServeEvidenceShareMeta` (new)

- **Trigger:** `req.path` matches `/evidence/<id>` (non-empty ID segment)
- **Data source:** `evidenceRepository.getEvidenceById(id)`
- **Title:** evidence record `title` or `name` field; fallback `"Evidence Record <id>"`
- **Description:** evidence `description` or `summary` field, truncated to 160 chars; fallback site description
- **Image:** site default (`/epstein-files.jpg`) — no universal thumbnail endpoint for all evidence types
- **On error or no match:** returns `false`, falls through to SPA shell
- **Cache-Control:** `no-store` (same as media handler — evidence content should not be cached by proxies)

### C — `tryServeEntityShareMeta` (new)

- **Trigger:** `req.path` matches `/entity/<id>` (numeric ID)
- **Data source:** `entitiesRepository.getEntityById(id)`
- **Title:** `entity.name`
- **Description:** `"{primaryRole} — {N} mentions in the Epstein Files archive"`; fallback site description
- **Image:** site default (`/epstein-files.jpg`)
- **On error or no match:** returns `false`, falls through to SPA shell
- **Cache-Control:** `no-store`

Both are called from the SPA fallback handler in sequence, same call site as `tryServeMediaShareMeta`.

### D — Dynamic Sitemap

**New file:** `src/server/routes/sitemap.ts`

- Registered as `GET /sitemap.xml` in `app.ts` **before** the static file middleware and SPA fallback
- Fetches entity IDs via lightweight query: `SELECT id FROM entities ORDER BY id`
- Combines with hardcoded collection page URLs (same list as current static file, with `<lastmod>` using today's ISO date)
- Entity entries: `https://epstein.academy/entity/:id`, `changefreq: weekly`, `priority: 0.6`
- Returns `Content-Type: application/xml`, `Cache-Control: public, max-age=3600`
- **Removes** `public/sitemap.xml` (superseded)

### E — Small tag additions

**`index.html`:**
- Add `<meta property="og:image:type" content="image/jpeg" />`
- Add `<meta name="fediverse:creator" content="@ErikVeland@threads.net" />`

**`useSeoConfig.ts`:**
- Add a `BreadcrumbList` JSON-LD schema to each collection route config:
  ```json
  { "@type": "BreadcrumbList", "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://epstein.academy/" },
    { "@type": "ListItem", "position": 2, "name": "<Section>", "item": "<canonical>" }
  ]}
  ```
- The existing `schema` field already supports arrays, so breadcrumb is appended alongside existing schemas

**`injectOgTags` helper:**
- Also replaces `og:image:type` so SSR-overridden pages get the correct type tag

## File Change Summary

| File | Change |
|---|---|
| `src/app.ts` | Extract `injectOgTags()` helper; add `tryServeEvidenceShareMeta()`; add `tryServeEntityShareMeta()`; register sitemap route; call new handlers in SPA fallback |
| `src/server/routes/sitemap.ts` | New file — dynamic sitemap Express handler |
| `src/client/hooks/useSeoConfig.ts` | Add BreadcrumbList schema to each collection route |
| `index.html` | Add `og:image:type` and `fediverse:creator` tags |
| `public/sitemap.xml` | Delete (superseded by dynamic route) |

## Constraints

- No new npm dependencies
- No changes to DB schema
- The entity ID query must be read-only and use `getApiPool()`
- All HTML injection uses `escapeHtml()` (already available in `app.ts`)
- TypeScript strict mode — no `any`
