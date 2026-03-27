# Release Notes

## v17.2.8 - 2026-03-26 - Fix Media Browser Height & Album Share Previews

- **AudioBrowser height**: Fixed `FixedSizeList` receiving a runaway height value by tracking container dimensions via `ResizeObserver` (with `window.innerHeight` cap) instead of reading `containerRef.current?.clientHeight` synchronously during render — eliminates the 263,766px list expansion
- **AudioBrowser infinite scroll**: Fixed scroll threshold bug where `rowCount * 520` (wrong) was used instead of `rowCount * 440` (the actual `itemSize`), preventing `loadMore` from ever firing
- **App layout**: Added `min-h-0` to `#main-content` flex item to properly constrain height propagation to child media browsers
- **Album social share**: Album link previews now show the real album name (fetched from the appropriate albums API) instead of the raw ID; audio/video albums no longer incorrectly query the photo images API; preview image uses the album's first photo when available

## v17.2.7 - 2026-03-26 - Eliminate White Lines

Removed all light/white UI artifacts across the dark-themed app.

- **AudioBrowser / VideoBrowser**: Removed duplicate `bg-[var(--glass-bg-strong)]` from `aspect-video` containers — the nested semi-transparent background stacked on the card's own background, creating a darker thumbnail region with a visible seam at top/bottom edges
- **CSS variable**: Defined missing `--app-bg` variable (was undefined/transparent throughout the app)
- **ClaimsList**: Fixed `bg-[var(--text-primary)]` (light `#e2e8f0`) used as container background; replaced `divide-gray-200` with dark border; swapped `bg-red-50`/`bg-green-50` and light text colors for dark-theme equivalents
- **Analysis progress bars**: `PatternRecognitionAI`, `CommunicationAnalysis`, `FinancialTransactionAnalysis` — replaced `bg-*-50`/`border-*-200` light progress sections with dark `bg-*-900/20` variants
- **TableViewer**: `bg-blue-50` info notice → dark blue
- **EvidenceDetail**: `bg-red-50`/`bg-orange-50` risk rating badges → dark equivalents

## v17.2.6 - 2026-03-26 - Comprehensive 404 Elimination

Full audit and elimination of all raw `data/...` file paths leaking into client-facing URLs.

- **Entity media paths**: `getMediaItems` now converts `filePath`, `thumbnailPath`, `url`, and `thumbnailUrl` to `/files/...` format, closing the `onError` fallback 404 cascade in EvidenceModal
- **Entity photos**: `getEntityById` `filePath` field converted to `/files/...`; photos query capped at 24 items to prevent browser overload
- **Subject card avatars**: `topPhotoUrl` now passed through `mapSubjectCardDto` (was silently dropped)
- **Audio thumbnails**: `AudioBrowser` and `AudioPlayer` replaced the non-existent `/api/static?path=` endpoint with proper `/files/...` path resolution

## v17.2.5 - 2026-03-24 - Hotfix 404 Proxies

- **Media Endpoint Scrubbing**: Completely bypassed the `id` proxying mapping logic for the `topPhotoId` fallback avatar, utilizing native `d.file_path` endpoints to prevent 404s.

## v17.2.4 - 2026-03-24 - Hotfix Profile Disappearances

This patch rectifies a critical omission from v17.2.3 which led to entity profiles rendering without images, metrics, or media files.

### Bug Fixes

- **Nginx Proxying Rules**: Corrected internal path generation for `faceCropUrls` to use the canonical `/files/` endpoint instead of `/data/` which was actively blocked by the Vite configuration and Web Servers, causing 404 black circles to render for Avatars.
- **DTO Scrubbing**: The API mapper was actively stripping `faceCropUrl` and `relationships` array elements from the network payload. Updated the parsing layer so these elements pass through to the frontend.
- **Segregated Artifact Types**: Aggregated entity media metadata queries across BOTH `documents` and `media_items` tables using native SQL `UNION` operations. This ensures that historical images parsed as documents are still routed effectively into the Evidence tabs alongside newer `media_items`.

## v17.2.3 - 2026-03-24 - Entity Metrics & Face Crops

This patch resolves bugs with entity profile metrics showing zero counts, and migrates the entity avatars to use targeted face crop images.

### Bug Fixes

- **Verified Media Metric**: Updated backend `getEntityById` route to correctly fetch and append `photos` to the payload, ensuring accurate validation counts in the Evidence Modal.
- **Relationship Signals**: Removed an invalid UI threshold which inadvertently filtered out all relationships due to an underlying database scale misinterpretation (0.0 to 1.0 proximity scores).

### Features

- **Face Crop Avatars**: Entity images now prioritize crops of their faces across the frontend application. If a crop is unavailable, it gracefully falls back to the full context photo thumbnail.

## v17.2.2 - 2026-03-24 - Entity Modal Height Fix

This patch resolves an issue where the Evidence and Investigations tabs inside the Entity Profile modal were completely blank due to a collapsed container height layout bug.

### Bug Fixes

- **Modal Tab Visibility:** Fixed an issue where the `react-window` AutoSizer in the Entity Evidence tab collapsed to 0px height, causing no evidence documents to render. Both Evidence and Investigations tabs now strictly fill their parent layout bounds using `absolute inset-0`.

---

## v17.2.1 - 2026-03-24 - Liquid Glass UI Refinements

This patch addresses several UI layout consistency issues and systematically removes hardcoded colors to fully adhere to the Liquid Glass design aesthetic.

### UI / UX

- **Navigation Alignment:** Fixed top and bottom margins in the main navigation bar so buttons are perfectly flush with the background container.
- **Loading Skeleton Consistency:** Corrected a nested grid layout bug in `DocumentSkeleton` to ensure loading squares perfectly align with actual document cards.
- **Flight Logs Restoration:** Fixed a virtualization bug where the `AutoSizer` container collapsed to 0px, causing flight timelines to disappear.

### Design System Hardening

- **Global Border Softness:** Reduced the opacity of `--glass-border`, `--glass-border-highlight`, and `--border-subtle` in `index.css` to eliminate harsh wireframe aesthetics and achieve a softer glass presentation.
- **Hardcoded Color Purge:** Swept the entire `.tsx` codebase and replaced 60+ instances of hardcoded Tailwind colors (`bg-white/10`, `border-white/5`, etc.) with their respective Liquid Glass CSS variables (`--glass-bg-highlight`, `--glass-border`, etc.).

---

## v17.2.0 - 2026-03-23 - Flights, Properties, Evidence UI & Pipeline Hardening

This release ships three new first-class UI slices, a full `any`-free TypeScript pass, a correctness fix for entity sort ordering, and significant pipeline and server resilience improvements.

### What's New for Users

**Flights explorer**

- New `/flights` section with a full flight tracker, map view, timeline view, network graph, stats header, and detail panel.
- Flight cards surface passenger manifests, tail numbers, origin/destination airports, and date ranges.

**Properties browser**

- New `/properties` section with browse, analytics, and associates views.
- Property cards link to associated entities and surface ownership and visit history.

**Evidence search improvements**

- Evidence results now render with a dedicated card layout including document snippets, filter controls, and a result card with provenance and redaction indicators.
- Evidence filters support type, date range, and entity scoping.

**Legal page**

- New `/legal` route with terms and privacy content, accessible from the footer.

**Routing overhaul**

- App shell migrated to nested `<Routes>` / `<Route>` with `useMatch`-based active tab detection, replacing the previous manual pathname comparison.
- Flights, Properties, Evidence, and Legal routes are now first-class lazy-loaded entries.

### Bug Fixes

- Fixed entity sort-by-mentions using a stale denormalized `entities.mentions` column instead of a live count from `entity_mentions`. All sort paths (mentions, red_flag, risk, document_count, recent tiebreakers) now use correlated subqueries against the live table.
- Fixed document sort: date/title/size/red_flag sort paths now use a dynamic `ORDER BY` clause with correct column expressions and parameter binding, replacing a broken `CASE`-based approach that silently fell through to the default.
- Fixed `purgeCache` → `purgeCacheByPattern` call site in the app server after the cache middleware API changed.

### Under the Hood

- Complete `any`-free TypeScript pass across the entire codebase — zero `any` casts, zero TS errors.
- Shared API types extracted to `src/client/types/api.ts`; inline interface duplication removed from `App.tsx` and other consumers.
- Sentry integration added (`src/server/services/sentry.ts`); `initSentry()` called at app startup, `sentryErrorHandler` wired into the Express error chain.
- AI enrichment and pipeline timeouts are now configurable via environment variables (`EXO_DISCOVERY_TIMEOUT_MS`, `AI_REQUEST_TIMEOUT_MS`, `PIPELINE_DOC_TIMEOUT_MS`, `PIPELINE_STALL_TIMEOUT_MS`, etc.) with safe defaults.
- Pipeline watchdog added with configurable stall detection, per-service recovery commands, and cooldown logic.
- VIP entity lookup now degrades gracefully on Postgres statement timeout, returning a cached result rather than propagating the error.
- CORS dev origins expanded to include ports 4173 and 5173 for Vite preview and dev server compatibility.
- `deepCamelKeys` middleware removed from the app server (was already handled at the route/mapper layer).
- Documents trigram index migration added (`043_documents_trigram_index.sql`) for faster full-text search.
- Test hygiene checker and junk entity consolidation script added to the scripts directory.
- Design token strict baseline updated.

---

## v17.1.1 - 2026-03-23 - Dossier UX & Navigation Polish

This patch tightens a few high-visibility UI and data issues that showed up immediately after the 17.1.0 rollout.

### What's New for Users

**Cleaner dossier browsing**

- Entity dossier navigation now stays aligned with the page content width instead of shrinking around its labels.
- The entity profile modal now loads evidence and linked media more reliably, including fallback handling when the primary evidence feed is sparse or inconsistent.

**More legible relationship views**

- Network views now render larger nodes with persistent labels, which makes the relationship canvas easier to scan without constant hovering or zooming.

**Softer interface treatment**

- Several hard white card borders in the dossier and network UI were replaced with a softer glass outline that matches the search field treatment more closely.

---

## v17.1.0 - 2026-03-23 - Stability, Investigations & Production Confidence

This release packages the user-facing work that landed after v17.0.0 into a single minor update. It focuses on making the archive more reliable in daily use while keeping the new design system and platform hardening intact.

### What's New for Users

**More resilient analytics and visual exploration**

- Analytics views now share a typed interaction context, which makes cross-panel selection and filtering more consistent across treemap, network, and enhanced analytics experiences.
- Visualization surfaces now fail more gracefully: route maps, timelines, entity graphs, and related interactive views show contained fallback states instead of breaking the page when a malformed record appears.

**Stronger investigation and evidence workflows**

- Investigation exports and related integrity checks were tightened so exported evidence and timeline data stay aligned with the typed app model.
- Document and evidence browsing benefited from a broader strict-typing pass, reducing edge-case UI failures when records contain sparse or uneven metadata.

**Better production reliability**

- Production quality gates now cover database migration readiness, stricter SQL/query parity checks, and broader client token-compliance scanning before deploys proceed.
- Post-deploy verification was refined so the Epstein deployment path validates the correct public properties while still supporting full cross-site health checks for the wider site network.

### Under the Hood

- End-to-end strict typing was extended across both client and server codepaths, including route handlers, repositories, DTO mappers, visualizations, and shared context plumbing.
- CI and production workflows now run Postgres migrations before the unified quality gate, reducing false negatives and making local and remote verification paths match more closely.
- Public-site verification scripts now support targeted suites as well as full-network checks, making it safer to verify deploy health across all managed sites.

---

## v17.0.0 - 2026-03-20 - Design Overhaul, Data Quality & Platform Hardening

This release completes a full cycle of platform improvements begun in v16.0. The archive looks and performs substantially differently from where it started — new visual identity, a cleaner people directory, faster search, improved sharing, and a significantly more robust backend.

### What's New for Users

**Redesigned visual identity**

- New typography: IBM Plex Sans for UI text, DM Serif Display for editorial headings, IBM Plex Mono for code and identifiers.
- Archival amber accent (`#d4a84b`) replaces the previous cyan throughout — tab indicators, search, focus states, card titles on hover.
- Solid, opaque surfaces replace the glass-morphism aesthetic: darker, cleaner, faster to render.
- Risk scale simplified to three visual bands (critical/high → deep red, medium → goldenrod, low → green) for faster at-a-glance reading.
- Sharper border radii and tighter header height give the interface more density without feeling cramped.

**Cleaner people directory**

- Removed 1,658 phantom entities that were being extracted from document phrasing rather than real people — salutations ("Dear Donald Trump"), legal role prefixes ("Defendant Ghislaine…"), possessive role descriptions ("Jeffrey Epstein's Housekeeper"), and video link text ("Watch Jeffrey Epstein"). The people directory now surfaces actual individuals.
- Ingest pipeline updated to block these patterns from re-entering the database on future document processing runs.

**Improved sharing & discovery**

- Media item and album deep links now generate correct Open Graph preview images and titles when shared on social platforms or messaging apps.
- New high-intent landing pages for search engine discovery: `/epstein-documents`, `/epstein-people`, `/epstein-media`, `/epstein-timeline`, `/epstein-flights`, `/the-epstein-files`.

**Session continuity**

- Refreshing the page no longer logs you out. The app now silently restores your session from the refresh cookie without requiring a manual re-login.

**Investigation workspace**

- New investigations are now created under your own user account rather than a hardcoded placeholder account.

### Under the Hood

- All API responses standardised to camelCase — eliminates a long-running inconsistency between routes.
- Evidence search loads associated people in a single batch query instead of one query per result.
- Token refresh is now atomic (transaction + row lock), preventing concurrent tab refreshes from creating duplicate live tokens.
- Removed unauthenticated static file handler for `/data`; all document access now routes through the audited path-traversal-protected handler.
- Full structured logging via `pino` across all server code; zero `console.log` calls remaining in production paths.
- Zero TypeScript errors, zero ESLint errors. Clean Vite build.

---

## v16.9.0 - 2026-03-19 - Production Readiness Hardening

### Security

- Removed hardcoded `JWT_REFRESH_SECRET` from PM2 ecosystem config; all secrets now loaded exclusively from the remote `.env`.
- Untracked `.env.production` and `.env.audit` from Git; broadened `.gitignore` to blanket-exclude `.env.*` except `.env.example`.
- Added `CORS_ORIGIN` to the `env_production` PM2 block to prevent empty-origin misconfiguration.

### Observability

- Added `pino-http` structured access logging for all HTTP requests (health probes excluded).
- Migrated 120+ `console.error/warn/log` calls across server code to the structured `pino` logger.
- Global error handler now emits structured JSON logs with request context, PG metadata, and pool stats.

### Reliability

- Added `process.on('unhandledRejection')` and `process.on('uncaughtException')` safety nets in the server entry point.
- Graceful shutdown now force-closes lingering HTTP connections after an 8-second grace period, preventing stale requests from blocking deploys.
- Added `process.send('ready')` for PM2 `wait_ready` integration.
- API response cache is now automatically purged after any successful write operation.

### Deployment

- Added `pg_dump -Fc` pre-migration backup step to the deploy pipeline.
- Rollback procedure updated from legacy SQLite restore to Postgres `pg_restore --clean --if-exists`.

### Database

- Ran pending schema sync migration (entities.needs_review, entities.manually_reviewed, evidence.original_file_path, articles.link unique index, investigation_evidence unique constraint).
- Ran `red_flag_score` column migration.

### Verification

- Zero TypeScript compiler errors and zero ESLint errors across the full codebase.

## v16.8.0 - 2026-03-19 - Error Fixes, Security Hardening & Deployment Refresh

### Bug Fixes

- Fixed malformed imports in `relationshipsRepository`, `emails-optimized`, and `graphRoutes` that caused ESLint parsing failures
- Added `unhandledRejection` and `uncaughtException` safety nets to the server entry point

### Security

- Removed hardcoded `JWT_REFRESH_SECRET` from `ecosystem.config.cjs`; secrets must now live in the remote `.env` file
- Tightened `.gitignore` to blanket-exclude all `.env.*` variants except `.env.example`

### Deployment

- Upgraded deploy rollback path from legacy SQLite to Postgres `pg_dump`/`pg_restore`
- Added pre-migration `pg_dump` backup step to the deploy pipeline
- Added `CORS_ORIGIN` to the production PM2 env block

### Verification

- Confirmed zero TypeScript compiler errors and zero ESLint errors across the full codebase
- Confirmed clean Vite production build (3,248 modules, no warnings)

## v16.7.0 - 2026-03-19 - UI Polish & Design System Cleanup

### UI / UX

- Reduced header height from ~72px to ~55px (tighter padding, smaller stat numbers)
- Fixed nav labels truncating: "Investigate" → "Cases", "Black Book" → "Blackbook"
- Removed broken tooltip on Subjects nav tab (was clipped by overflow-hidden container)
- Eliminated toast storm on server-down: removed two background-API error toasts that stacked on load

### Design System

- Added missing CSS tokens: `--glass-border-highlight`, `--bg-elevated`, `--border-subtle`, `--type-xs`
- Fixed `BaseCard` malformed Tailwind class (`hover:shadow-[var(--shadow-[...])]` → `hover:shadow-[var(--glass-shadow)]`)
- Fixed `BaseCard` undefined token: `--accent-primary` → `--accent`
- Replaced hardcoded `text-[10px]`/`text-[9px]` in `PersonCard` with `text-[var(--type-xs)]`
- Replaced hardcoded px values in `DocumentCard.css` with design tokens
- Replaced 4-level ternary toast class logic with clean CSS utility classes (`.toast-success`, `.toast-error`, etc.)

## 16.6.0 - 2026-03-17 - Humanistic Design Refactor

### Visual Design

- Replaced ambient radial gradient blobs on the page body with a clean flat dark background (`#0a0a0b`).
- Swapped Inter for **IBM Plex Sans** (body/UI) and added **DM Serif Display** as a display typeface for editorial contexts; IBM Plex Mono replaces JetBrains Mono.
- Replaced cyan accent (`#33a8ff`) with archival amber (`#d4a84b`) across tab indicators, search button, focus outlines, and card hover titles.
- Domain accents desaturated: docs → deep editorial red, emails → steel-blue, investigations → measured purple, evidence → teal.
- Risk scale collapsed from 6 saturated colours to 3 visual bands: deep red (critical/high), dark goldenrod (medium), forest green (low/minimal).
- Border radii sharpened: `8/12/16px` → `4/6/8px`.

### Glass-morphism Removal

- `.glass-panel`, `.glass-card`, `.glass-surface` converted to opaque solid surfaces (`#15151a`); backdrop-filter and `--glass-shine` pseudo-element removed.
- Card and control hover states no longer apply `translateY` lift.
- Document cards: solid background, no blur, no lift on hover; `.document-card::before` radial glow and `.preview-glow` deleted.
- Blur preserved only on justified overlay elements: sticky header, dropdowns, header search pill.

### Footer

- Brand name gradient clip-text replaced with DM Serif Display plain white.
- Column headings (`Mission`, `Support`, `Network`) changed from uppercase+icon to a quiet `border-l` label style.
- Status indicator pulsing animation removed.

### Tabs

- Tab labels: uppercase + heavy tracking removed; `font-weight: 500`, `text-transform: none`, `letter-spacing: 0.02em`.
- Tab indicator glow (`box-shadow`) removed.

### Card Component

- Decorative gradient icon wrapper removed; icon rendered bare with `shrink-0` positioning.

## 16.5.0 - 2026-03-16 - API camelCase Standardisation & Risk Score Backfill

### API Contract

- All `/api` responses now return camelCase keys unconditionally. A global `deepCamelKeys` middleware on the Express router recursively transforms every response object before it is sent, eliminating the previous mixed state where some routes returned snake_case fields and others returned camelCase.
- Removed dual-field outputs (`evidence_types` + `evidenceTypes`, `red_flag_rating` + `redFlagRating`, etc.) from all entity and investigation DTO mappers.
- All shared DTOs (`src/shared/dto/`), Zod schemas (`src/shared/schemas/`), and the root `Person` / `SubjectCardDTO` interfaces (`src/types.ts`) updated to camelCase-only field names.
- Client components, hooks, services, and utilities updated across 50+ files to read camelCase properties exclusively.

### Risk Score Backfill

- Ran `scripts/recalculate_entity_risk.ts` to recompute risk scores for all 532,791 entities using the current `entityRisk-v1` algorithm; anchor score 250, Jeffrey Epstein normalised to 100/100.

### Bug Fixes

- Fixed `PersonCard` showing 0/5 risk rating: `EvidenceModal` was reading `entity.redFlagRating` but the mapper was emitting `red_flag_rating`; resolved by the global middleware.
- Fixed `GraphService.normalizeNode` reading stale `primary_role`, `top_photo_id`, `photo_url` properties; updated to `primaryRole`, `topPhotoId`.
- Fixed `InvestigationWorkspace` entity category fallback reading `entity.primary_role` instead of `entity.primaryRole`.

## 16.4.0 - 2026-03-15 - Security, Reliability & Pipeline Observability

### Security

- Removed unauthenticated `express.static('/data', ...)` handler; `/data/*` URLs now route through the same audited, path-traversal-protected handler as `/files/*`, preserving all document browser and download functionality.
- Token rotation endpoint (`POST /api/auth/refresh`) now uses a `BEGIN/COMMIT` transaction with `SELECT ... FOR UPDATE`, eliminating the race condition where concurrent refresh requests could produce two live tokens for the same session.
- Update schemas in investigations routes no longer use `.passthrough()`; unknown fields are stripped at validation time, preventing callers from injecting arbitrary DB columns via `updateInvestigation`, `updateTimelineEvent`, `updateHypothesis`, and `addEvidence`.
- `getCriticalTableCounts` now validates table names against an explicit allowlist before interpolating into SQL.
- User IDs now generated with `crypto.randomUUID()` instead of `Date.now()`, eliminating creation-timestamp disclosure and collision risk under concurrent admin requests.

### Reliability

- `recordWebVitals` call in vitals route is now fire-and-forget with an explicit `.catch()` logger; DB errors no longer become unhandled promise rejections on the hot vitals path.
- `createAlbumArchive` now registers an `archive.on('error', ...)` handler to cleanly destroy the response stream on mid-archive filesystem errors.
- People page fallback query path now runs the main entity query, count query, max-connectivity, and VIP lookup in a single `Promise.all`, reducing sequential DB round-trips from 4 to 1 parallel batch.

### Auth / UX

- `AuthContext` now attempts `POST /api/auth/refresh` on page reload when `/api/auth/me` returns no user, restoring session state from the refresh cookie without requiring a manual re-login.
- `InvestigationsContext` now uses the authenticated user's ID (from `AuthContext`) instead of the hardcoded `'1'` when creating investigations and populating the team lead field.

### Pipeline Observability

- AI Enrichment progress bar in the Übersicht desktop widget now displays real-time throughput (docs/s) and an ETA derived from elapsed time since `enrichStartedAt`, replacing the stale ingest-rate approximation.
- `unified_pipeline.ts` writes `enrichStartedAt` timestamp to `live_status.json` at the beginning of each enrichment run so the rate calculation survives widget and pipeline restarts.
- `get_stats.sh` passes `enrichStartedAt`, `enrichProcessed`, and `enrichTotal` from the status JSON through to the widget's merged output.

## 16.3.1 - 2026-03-12 - Server-Side Media Share Metadata

### Search & Sharing

- Added server-side Open Graph/Twitter meta rendering for `/media` deep links with `id`, `photoId`, or `albumId` query parameters.
- Media item links now return bot-visible OG tags and canonical URLs without requiring JavaScript execution.
- Album share links now attempt to use the first image in the selected album as the OG preview image.
- Preserved SPA fallback behavior if metadata enrichment fails, with safe no-cache headers for share endpoints.

## 16.3.0 - 2026-03-12 - SEO Intent Pages + Rich Metadata

### Search Engine Visibility

- Added high-intent landing routes for search discovery: `/the-epstein-files`, `/epstein-documents`, `/epstein-people`, `/epstein-media`, `/epstein-timeline`, and `/epstein-flights`.
- Added static prerendered HTML counterparts under `public/` for crawler-first indexing on those intent pages.
- Extended app SEO metadata with per-route title/description/keywords/canonical controls and route-specific structured data (`CollectionPage`, `Dataset`, `NewsArticle` where relevant).
- Added stronger internal linking from homepage fallback and footer to intent pages and high-value sections.
- Expanded sitemap coverage to include all new intent landing URLs for faster discovery across search engines.
- Added media share metadata behavior so media deep links and album links resolve OG images/canonical URLs with item/album-specific context.

## 16.2.1 - 2026-03-12 - SEO Crawlability Hardening

### Search Engine Visibility

- Added real `robots.txt` and `sitemap.xml` artifacts to the production build output so crawlers can discover and index core archive routes.
- Added default canonical URL, standard description meta tag, robots directives, Open Graph image alt text, and JSON-LD website metadata to the HTML shell.
- Added crawlable fallback HTML content and section links in the initial `#root` markup so non-JS and low-JS crawlers see meaningful page content.
- Enhanced runtime SEO tags in the `SEO` component with canonical normalization, robots directives, and JSON-LD page metadata.

## 16.2.0 - 2026-03-12 - Search Performance & Investigation Reliability

### Improvements

- Evidence search now loads associated people significantly faster — entity relationships are fetched in a single batch query instead of one per result
- Adding media or documents to an investigation is now atomic — if anything fails mid-operation, no partial records are left behind
- Sensitive content preference now resets when you close the browser tab, rather than persisting across sessions
- Fixed the analytics timeline chart returning 500 errors — column alias ordering bug in the underlying query

## 16.1.0 - 2026-03-12 - Database Reliability & Schema Sync

### Improvements

- Sentence discovery operations are now atomic — boilerplate and document sentence inserts commit together or not at all
- Database session settings now apply correctly on pool connection — previously some SET commands were silently dropped
- Pipeline mode validation now exits with a clear error on invalid arguments instead of proceeding with unexpected behavior
- Applied 3 schema migrations: file assets, document pages, and boilerplate phrases tables

## 16.0.2 - 2026-03-10 - Sascha Riley Entity + Media Linking

### Entities & Media

- **Canonical Profile Alignment:** Normalized Sascha profile handling so `Sascha Riley`/`Sasha Riley` aliases resolve consistently in ingestion and entity lookups.
- **Testimony Media Linking:** Linked all six Sascha testimony audio assets plus album cover image to the canonical `Sascha Riley` entity in media relations.
- **People Tag Reliability:** Added explicit `media_item_people` associations for testimony assets so they surface correctly in entity/media views and people filters.

## 16.0.1 - 2026-03-10 - Face Cluster Entity Linking

### Face Gallery

- **Entity Linking:** Face clusters can now be linked to canonical entities via an autocomplete search in the Face Gallery detail view.
- **Auto-tagging:** Linking a cluster automatically upserts all photos in that cluster into `media_item_people`, making them immediately discoverable via the PhotoBrowser "People" filter.
- **Link Badge:** Gallery cards show a cyan link indicator when a cluster is associated with an entity.
- **Unlink:** One-click unlink removes the entity association from a cluster.
- **Photo Count Toast:** Confirmation toast on link shows how many photos were tagged.

### Database

- Migration `1753600000000_face_cluster_entity_link`: adds `entity_id` FK column and index to `face_clusters`.

## 16.0.0 - 2026-03-10 - Full Ingestion Milestone

### Milestone

- **100% Ingestion Reached:** The tracked DOJ and media corpus has reached full ingestion coverage.
- **Phase Transition:** The pipeline focus now shifts from ingestion throughput to intelligence analysis, OCR quality reruns, and graph/entity refinement.

### About Page

- **Milestone Messaging:** Replaced "ingestion ongoing" copy with completion-aware language tied to live pipeline totals.
- **Status Banner Upgrade:** Ingestion dashboard now flips to a "Milestone Reached" state once aggregate target coverage is complete.
- **ETA Behavior Update:** ETA/throughput panel is hidden once ingestion completes and replaced with post-ingest intelligence-phase status messaging.
- **Roadmap Framing:** "Built for Future Releases" section now reflects a fully ingested baseline with ongoing intelligence work.

## 15.10.3 - 2026-03-10 - Enrichment Backfill Mode Stabilization

### Ingestion Pipeline

- **Backfill Mode Added:** `scripts/ingest_pipeline.ts` now supports `enrich-only` mode to enrich completed documents without touching queue leases.
- **Safe Pagination Fix:** Backfill iteration now uses `id > lastId` keyset pagination (not mutable `OFFSET`) to avoid skipping records while updates are applied.
- **Bounded Concurrency:** Processing now runs in fixed-size chunks with `Promise.allSettled`, keeping concurrency predictable and resilient to per-document failures.

## 15.10.2 - 2026-03-10 - Ingestion AI Text Cleanup Inclusion

### Ingestion Pipeline

- **Parallel AI Post-Processing:** The queue now runs wildcard-repair, OCR cleanup, and summary generation in one pass for ingested document text.
- **Conditional Metadata Update:** `metadata_json.ai_summary` is only written when summary output exists, while content fields are only updated when text actually changed.

### AI Enrichment

- **Deterministic Decode Pre-Pass:** Added HTML entity, numeric entity, unicode mojibake, ligature, and invisible-character normalization before MIME wildcard repair.
- **Chunked OCR Cleaner:** Added bounded chunk-level OCR cleanup (`max 5` chunks) with strict guardrails to reject unstable LLM output lengths.

## 15.10.1 - 2026-03-10 - Modal Header + File Route + API Contract Stabilization

### Document Modal UX

- **Find Input Spacing Fix:** Increased left input padding so `Find in record...` no longer overlaps the search icon.
- **Header Right Alignment:** Reduced right header padding so the close control sits closer to the modal edge.

### Original Document Reliability

- **Email File Route Hardening:** `/api/documents/:id/file` now ignores URL-like pseudo-paths and resolves only valid local file candidates.
- **Email Fallback Delivery:** When no local file exists for email records, the route returns an inline RFC822 `.eml` payload built from metadata/content instead of failing with invalid-path errors.

### API Stability

- **Subjects Timeout Fallback:** `/api/subjects` now falls back to a lighter query path on Postgres statement timeout, preventing 503s from heavy aggregation paths.
- **Audit Logging Compatibility:** `audit_log` writes now auto-detect legacy/modern schemas and never fail request paths.
- **Evidence DTO Normalization:** `/api/evidence/:id` now returns canonical document-detail fields required by shared DTO contracts.
- **Graph DTO Type Fix:** `/api/graph/global` now returns numeric `connectionCount` values (and numeric `risk`/`community`) for schema compliance.

## 15.10.0 - 2026-03-09 - Ingestion Snapshot + Document Browser Stabilization

### Pipeline Snapshot

- **Ingestion State Captured:** Added runtime snapshot at `backups/ingestion_snapshots/ingestion_snapshot_20260309_220536.json` with ingest run status, queue phase, current file, and unlock/crash indicators.
- **Dataset Totals Captured:** Snapshot includes current Postgres totals at capture time: 1,425,126 documents and 4,278,383 entity mentions.

### UI Reliability

- **Document Browser Build Fixes:** Resolved TypeScript and lint blockers in document browser list/header/filter integration so production build and deploy gates pass again.
- **List Rendering Cleanup:** Removed stale imports/state wiring that was causing CI-style no-unused-local failures during release build.

## 15.9.2 - 2026-03-08 - Pipeline Resume

### Infrastructure

- **Pipeline Tracking Tables:** Added `pipeline_runs` and `pipeline_steps` tables (migration 1753500000000) so the ingestion pipeline can resume on production after 20-day idle gap.

## 15.9.1 - 2026-03-08 - Civ-Style Mentions Board + About Status Accuracy

### Visualizations

- **Top Mentioned Individuals Rebuilt:** Replaced the prior bar chart with a Civ VI-style ranked scoreboard UI (rank badge, mentions meter, risk tier chip) for faster scanability.
- **Non-Junk Person Enforcement:** Leaderboard now hard-filters to person-like entities only and excludes junk/suppressed rows via `isJunkEntity`, `junk_tier`, and `junk_flag`.

### Content Accuracy

- **About Page Ingestion Language Updated:** Removed outdated “Data Sets 9–12 complete” wording and replaced with live-progress framing.
- **Live Status Summary:** About page now derives ingestion summary text from the runtime `pipeline_status.datasets` payload, so headline status tracks real ingest state.

## 15.9.0 - 2026-03-07 - Pipeline Snapshot + Analytics Fixes

### Data Integrity

- **Document Type Chart Fixed:** Rebuilt `mv_docs_by_type` materialized view using `file_type` (was silently referencing renamed column `mime_type`, freezing all documents as "Other").
- **Extracted Date Backfill:** 225,440 documents now carry historical `extracted_date` values derived from YYYYMMDD filename prefixes and RFC 2822 email `Date:` headers — timeline now shows accurate 1952–2024 document distribution instead of all-2026 ingestion dates.
- **Total Documents Stat Card:** Stat now reads from live `totalCounts.documents` query rather than stale `mv_redaction_stats`, eliminating the "0 documents" display bug.
- **Top Entities De-Junked:** Entity count display fixed (BigInt string concatenation → numeric add); stricter SQL filters (word-count ≤ 3, mentions ≥ 2, expanded NOT ILIKE patterns) remove construction/OCR artifacts like "Dumpster Hauls Provided" from rankings.

### Pipeline Status

- **Ingestion Progress:** 286,638 / 1,425,126 documents (20.1%) have extracted content. DOJ Data Set 9 is 42.7% processed; DS10 is actively ingesting (2.4%); DS11 queued.
- **Enrichment:** 532,374 entities extracted; 1,675,020 relationships mapped.

## 15.8.0 - 2026-03-06 - Analytics Data Integrity + Map/Chart Reliability

### Analytics Data Quality

- **Top Mentioned Individuals De-Junked:** Replaced the prior top-entities aggregation path with stricter person-only, non-junk, non-quarantined server filtering and canonical-name consolidation so OCR/UI artifact entities no longer dominate rankings.
- **Risk Distribution Fallbacks Fixed:** Classic analytics now correctly derives risk buckets from `redFlagDistribution` / `likelihoodDistribution` when `riskByType` is absent, preventing empty risk charts.
- **Tree Map Data Source Corrected:** Interactive entity treemap now falls back to `topEntities` when `topConnectedEntities` is unavailable, eliminating empty map states in classic analytics.

### Timeline + Type Visuals

- **Document Distribution Readability:** Timeline bars now aggregate to yearly buckets (1980–2026 window) with stable year ticks, making the expected historical span visible instead of being visually dominated by ingestion-month spikes.
- **Document Type Normalization:** Enhanced analytics document types are grouped into meaningful categories (`PDF`, `Email`, `Image`, `Video`, `Audio`, `Text`, `Other`) before rendering, so the chart surface no longer presents as a single undifferentiated total.
- **Top Mentioned Chart Alignment:** Increased Y-axis label space and tick anchoring in the horizontal bar chart to fix label/bar misalignment and overflow.

### Geospatial Reliability

- **Map No-Data Fallback:** When entity geocoordinates are unavailable, the interactive map now falls back to real flight-airport coordinates from `/api/flights/airports` instead of rendering zero locations.
- **World-Zoom Constraint:** The interactive map now enforces world bounds and minimum zoom at full-world scale, preventing zoom-out beyond a 1:1 world frame.

## 15.7.0 - 2026-03-06 - Degraded Mode Stability + 503 Read Availability

### Runtime Stability

- **Degraded Mode Provider Wiring:** Added `DegradedModeProvider` to the client root tree so `useDegradedMode` consumers (including the degraded banner) no longer throw runtime context errors.
- **Crash Loop Resolved:** Eliminated the `useDegradedMode must be used within DegradedModeProvider` production failure path surfaced through `ScopedErrorBoundary`.

### Availability Under Load

- **Load Shedding Policy Adjustment:** Updated server-side `toobusy` handling to prioritize shedding mutating traffic first while keeping public read requests (`GET/HEAD/OPTIONS`) available.
- **503 Handling Improvement:** Mutating `/api/*` requests now receive structured JSON `503` responses during overload, while read/UI traffic remains serviceable.

### Data Surface Reliability

- **Black Book Filter Safety:** Stopped sending `letter=ALL` as a literal API filter from the Black Book UI.
- **About/Stats Fetch Hardening:** Switched About page aggregate fetches to JSON-validated `Promise.allSettled` handling so one failing endpoint no longer zeros all displayed metrics.
- **Document Detail Schema Fallback:** Hardened `/api/documents/:id` text derivation to support both `document_pages.extracted_text` and legacy `document_pages.content`, with `document_sentences` fallback, preventing 500s on mixed production schemas.

## 15.6.0 - 2026-03-05 - Public Read / Admin Write Policy + Security Hardening

### Access Control Policy

- **Public Read Surface:** Read endpoints remain publicly accessible for investigative browsing, including static corpus serving.
- **Admin-Only Writes:** Non-read API methods are now centrally enforced as authenticated admin-only, covering media edits, tagging, and user-management style mutations.
- **Auth Route Tightening:** Password change operations are explicitly restricted to admin role.

### Security & Audit Integrity

- **Error Log Redaction:** Removed full request-body logging from global error handling and replaced it with key-only context.
- **Audit Logging Fail-Closed:** Audit insert failures now throw instead of being silently swallowed, preventing untracked sensitive actions.
- **Request Correlation:** Audit payloads now support request-id linkage for traceable forensic timelines.
- **Upload Chain-of-Custody Fix:** Evidence upload now correctly awaits DB insert and logs valid document IDs.
- **Refresh Token Rotation:** Added refresh-token persistence/rotation plumbing and migration support for revocation-aware session handling.

### Search & Reliability

- **Prefix Query Safety:** Removed the universal-match fallback for empty prefix tokens; invalid tokenized prefix queries now return empty, explicit result sets.
- **Document Detail Resilience:** `/api/documents/:id` now degrades gracefully when face-cluster tables are absent, instead of returning 500.
- **Production Gate Readiness:** Local CI-equivalent checks passed (`type-check`, `lint`, `test:unit`, `build`) before release cut.

## 15.5.0 - 2026-03-05 - Unified Modern Viewer + Gmail-Style Email Workspace

### Viewer Architecture

- **Legacy Viewer Deleted:** Removed the old inline `DocumentViewer` implementation from `DocumentBrowser` and all associated dead code/imports.
- **One Viewer Path:** Document selection now always routes through `DocumentModal`, eliminating split behavior and regressions between two viewer stacks.

### UX Simplification

- **Reduced Tab Overload:** Consolidated top-level viewer tabs to `Summary`, `PDF View`, `Text Analysis`, `Annotations`, and `Provenance`.
- **Text Modes Grouped:** Merged `Clean Text`, `Raw OCR`, and `Diff View` into a single `Text Analysis` workspace with in-panel mode toggles.
- **Not Everything is a Tab:** Detailed entity and related-document exploration moved into the `Summary` flow while retaining click-through and dossier actions.

### Intel Rail Behavior

- **Info Pane Collapsed by Default:** Right intelligence pane now defaults to collapsed on open for cleaner first-read focus while still available on demand.

### Email Workspace UX

- **Filter Drawer, Not Always-On Panel:** Conversation filters are now hidden behind a compact `Filters` dropdown in the thread toolbar, preserving vertical space for thread scanning.
- **Body-First Layout:** Rebalanced pane widths to prioritize the reading surface so message bodies remain the focal area.
- **No Centered Reading Canvas:** Removed centered/narrow message thread positioning to keep long-form email content left-anchored and easier to read at speed.

## 15.4.8 - 2026-03-05 - Unified Modern Document Viewer

### Viewer Consistency

- **Legacy Viewer Removed from Document Browser:** Document browser selections now open the same modern `DocumentModal` experience used elsewhere, replacing the older embedded viewer variant.
- **Consistent Controls & Layout:** Removed the legacy eye/plus-style header controls and old panel chrome from this path for a single consistent viewing UI.
- **Close Behavior Preserved:** Closing the modal still correctly clears document selection and returns to the browser context.

## 15.4.7 - 2026-03-05 - Single-Asset PDF View Simplification

### Document Viewer UI

- **Removed Variant Toggle:** Removed `Dirty / Cleaned / Original` controls from the PDF view toolbar.
- **Single Asset Behavior:** Viewer now always opens the canonical document file for this view, matching the single-source storage model.
- **OCR Separation Preserved:** Dirty vs cleaned distinctions remain in text tabs (`Clean Text` / `Raw OCR`) rather than file-level asset toggles.

## 15.4.6 - 2026-03-05 - Asset Viewer Fix for Non-PDF Documents

### Document Viewer

- **No More Infinite \"Downloading PDF...\":** Fixed `PDF View` hanging on image-backed records (e.g. `.JPG`) by detecting asset type and rendering non-PDF assets directly.
- **Single-Asset Routing:** `Dirty` and `Cleaned` now default to the same canonical document file when dedicated cleaned/original files are not present, instead of forcing missing variant paths.
- **Loading Copy Cleanup:** Updated loader text to `Loading document...` to reflect mixed asset support (PDF/image) instead of PDF-only behavior.

## 15.4.5 - 2026-03-05 - Entity Header Cleanup & Profile Photo Reliability

### UI Refinement

- **Removed Oversized Header Badge:** Removed the large floating `Inferred Evidence` header badge from the entity modal profile area to reduce visual clutter.
- **Profile Image Reliability:** Header profile image now resolves from multiple media URL fields with thumbnail-first fallback and API fallback (`/api/media/images/:id/thumbnail` then `/api/media/images/:id`) for PostgreSQL-normalized media rows.
- **Graceful Fallback:** If an image still fails, the modal falls back to the neutral icon without breaking layout.

## 15.4.4 - 2026-03-05 - Evidence Cards Open Viewer by Full-Row Click

### UX & Navigation

- **Full-Row Click for Evidence:** High-significance evidence rows and linked evidence cards in the entity modal are now fully clickable to open the in-app document viewer (`/documents?id=...`), not just the corner action link.
- **Keyboard Accessible:** Added `Enter` / `Space` activation for these cards to preserve accessibility and fast keyboard workflows.
- **Corner Action Preserved:** The corner `Open source` action still opens in a new tab, but now no longer blocks full-card click behavior.

## 15.4.3 - 2026-03-05 - Document Viewer Entity-Name Crash Fix

### Core Fix

- **Document Viewer Stability:** Fixed a production crash in the document viewer caused by entity records missing `full_name`. Entity rendering now safely normalizes names from `full_name | fullName | name` before matching and click dispatch.
- **Related Entities Panel:** Prevented runtime failures when mention chips are generated from partial entity payloads, ensuring documents always render even with heterogeneous PostgreSQL-backed entity rows.
- **Deployment Hardening:** Excluded local `venv/` trees from formatter/linter scans so production deploy gates are not blocked by workstation-only Python/TensorFlow artifacts.

## 15.4.2 - 2026-03-04 - Timeline Accuracy & Evidence Backing

### Timeline & API

- **Evidence-Backed Timeline:** The Timeline API (`GET /api/timeline`) now returns comprehensive evidence counts for each event, including document, media, and supporting evidence totals.
- **Deduplication:** Improved event grouping logic to merge duplicate timeline entries (e.g., "Epstein Court Documents Released") into single canonical milestones, preventing clutter.
- **Date Filtering:** Added `startDate` and `endDate` query parameters to the timeline feed for precise historical filtering.

### Data Integrity

- **Canonical Milestones:** Established deterministic deduplication keys for major historical events (e.g., Epstein's death, 2024 document releases, bank settlements) to ensure a clean, authoritative chronology.
- **Inference Classifier Fix:** Resolved a regression where real individuals with professional roles (e.g., "Lawyer") were incorrectly classified as inferred entities.
- **Real-Person Priority:** Enforced strict sorting precedence (`RFI -> Risk -> Mentions`) to ensure named individuals always rank above inferred or role-based entities in search results.

### User Experience

- **Rate Limit Stabilization:** Fixed `429 Too Many Requests` errors for public users by implementing proxy-aware rate limiting (`trust proxy`) and increasing the global per-IP allowance.
- **Profile Avatars:** Restored profile photos for entities by implementing a smarter fallback lookup that checks for album matches when direct media links are missing.

## 15.3.0 - 2026-03-04 - Subject Integrity & Performance

### Core Improvements

- **Subject Aggregation:** Hardened the subject card system to correctly merge stats from all alias variants (e.g., "Donald Trump" + "President Trump"), preventing undercounting of mentions.
- **Startup Reliability:** Added automatic fallback to `/api/subjects` if the primary entities endpoint fails, ensuring the application always boots successfully even during partial outages.
- **Media Access:** Opened media endpoints (`/api/media/*`) for public read access, allowing researchers to browse albums and tags without authentication.

### Bug Fixes

- **Stale Bundle Reload:** The client now automatically detects new deployments and reloads the page to prevent "ChunkLoadError" crashes for users with long-running tabs.
- **Public Validation:** Fixed validation logic to allow `limit=500` on public document queries, matching the behavior of the active client.

## 15.0.0 - 2026-03-02 - Production Hardening & PostgreSQL Migration

### Major Architecture Update

- **PostgreSQL Migration:** Completed the transition from SQLite to PostgreSQL 16+, enabling massive concurrency and improved data integrity for the 1.3M document corpus.
- **Database Hardening:** Implemented strict connection pooling, robust health checks (`/api/health/deep`), and automated schema verification to prevent drift.
- **Legacy Cleanup:** Removed all dependencies on `better-sqlite3` and purged legacy SQLite database files from production.

### Security & Access

- **Strict RBAC:** Enforced Role-Based Access Control on all sensitive endpoints. Public users can access health and auth routes, while investigative data requires appropriate permissions.
- **Case Export:** Added a secure `GET /api/investigations/:id/export/zip` endpoint for researchers to download comprehensive case bundles (evidence + metadata).

## 14.5.0 - 2026-02-24 - Forensic Analytics & Network Intelligence

### Interactive Intelligence

- **Global Entity Map:** Launched a high-performance geospatial map visualizing 130k+ entity locations with risk-based clustering.
- **Network Graph V2:** Introduced "Semantic Zoom" and "VIP Face Integration" to the network graph, revealing deeper connections and high-risk figures at a glance.
- **Signal Purification:** Deployed advanced heuristics to filter out OCR noise and low-signal artifacts, ensuring cleaner search results and analytics.

### Data Recovery

- **Dataset Restoration:** Restored missing datasets for "Black Book" entries, "Palm Beach Properties," and "Flight Logs" via idempotent PostgreSQL migrations.
- **Email Metadata:** Backfilled missing sender/recipient metadata for thousands of emails by parsing raw `.eml` files, enabling accurate "Person-Only" mailbox filtering.

## 14.0.0 - 2026-02-19 - Temporal Investigation & Forensic Determinism

### Investigative Tools

- **Temporal Graph Filtering:** Added a global timeline slider to the Analytics dashboard, allowing investigators to slice the network graph by specific time periods.
- **Provenance Tracking:** The Evidence Drawer now displays full extraction metadata (AI model, pipeline version), providing complete traceability for every claim.
- **Visual Evidence Encoding:** Differentiated graph edges to show "Direct" (evidence-backed) vs. "Inferred" (agentic) connections.

### UI Polish

- **Liquid Glass Design:** Refreshed the entire UI with a modern "liquid glass" aesthetic, improved depth, and consistent high-contrast accessibility tokens.
- **Unified Navigation:** Reworked the global header and search bar for better usability and reduced visual clutter.

## 13.0.0 - 2026-02-11 - Forensic Transparency & Credibility

### Evidence & Audit

- **Evidence Ladder:** Launched a verified evidence system where every "Direct" claim is backed by at least one specific document span.
- **Agentic Watermarking:** All AI-assisted inferences are now explicitly marked (`was_agentic=true`) and logged for forensic audit.
- **Integrity Suite:** Deployed a new `credibility_tests` suite to continuously verify graph invariants and confidence consistency.

### Operations

- **Deep Health Checks:** Enhanced monitoring to track FTS synchronization, database journal health, and critical table statistics.
- **Automated Backups:** Implemented zero-downtime backups with daily restore drills to guarantee data preservation.

## 12.0.0 - 2026-02-02 - DOJ Archive Consolidation

### Archive Expansion

- **Massive Ingestion:** Integrated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence.
- **Unified Discovery:** Standardized the organizational structure for all DOJ materials to enable seamless cross-referencing.

### Forensic Workspace

- **Financial Transaction Mapper:** Visualizes financial flows between entities to highlight potential money laundering or high-risk transfers.
- **Multi-Source Correlation:** Cross-references entity mentions across the entire archive to surface hidden connections and verify facts.

## 11.0.0 - 2026-01-20 - Data Expansion & Analytics Upgrade

### Flight Logs & Properties

- **Flight Log Expansion:** Expanded the flight database to 110 documented flights (1995-2005) and added support for the "N212JE" Gulfstream II aircraft.
- **Palm Beach Properties:** Ingested 9,535 property records, automatically flagging those owned by known Epstein associates.

### Media & Search

- **Audio Intelligence:** Added transcript-derived titles and smart albums for audio evidence (e.g., "Sascha Barros Interviews").
- **Full Text Search:** Restored high-performance FTS with term highlighting (`<mark>`) in document results.

## 10.0.0 - 2026-01-13 - Media Unification & Audio Intelligence

### Unified Media Experience

- **Media Browser:** Unified Audio, Video, and Image browsing into a consistent interface with batch tagging and filtering.
- **Smart Metadata:** Automatically generates titles and descriptions for audio files based on their transcripts.

### Bug Fixes

- **Modal Stacking:** Resolved critical z-index issues where document viewers would open behind entity modals.
- **Junk Filtering:** Aggressively removed thousands of OCR noise entities (e.g., "Total Cash Disbursements") to improve index quality.
