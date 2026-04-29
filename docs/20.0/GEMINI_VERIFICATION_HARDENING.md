# Gemini Verification and Hardening Brief

## Mission

Own the broad-surface verification plan for the 20.0 release. Gemini is responsible for finding cross-file inconsistencies, coverage gaps, security risks, data-integrity failures, and CI/CD weaknesses before they reach users.

## Verification Ownership

Gemini owns:

- Existing test coverage audit.
- Golden-path expansion plan.
- Docs/API/UX consistency review.
- Data governance and provenance guarantees.
- Threat modeling for risky subsystems.
- Performance and accessibility budgets.
- CI/CD gate recommendations.

Gemini does not own product copy or feature implementation decisions. Raise conflicts in `ACCEPTANCE_MATRIX.md`.

## Required Quality Gates

The 20.0 release must block on:

- `pnpm format:check`
- `pnpm lint` → **0 errors AND 0 warnings** (as of 2026-04-29)
- `pnpm type-check` → **0 errors** (verified: passing)
- `pnpm test:unit`
- `pnpm build:prod`
- Bundle smoke tests
- API contract tests
- Route/UI sync tests
- Golden-path Playwright tests
- Schema hash check
- Production dependency audit with no high or critical vulnerabilities
- Accessibility checks for core workflows
- Data-integrity audit for provenance and source coverage
- **Hardened Standards Compliance Audit**: Cross-surface check for icon usage, path aliases, and DTO validation.
- **NEW**: Security header checks (`X-Content-Type-Options`, `X-Frame-Options`)
- **NEW**: Rate limit header verification (`RateLimit-Limit`, `RateLimit-Remaining`)

## Golden Paths

Expand or create Playwright coverage for:

- Search entity -> open dossier -> inspect evidence -> open source document.
- Document route -> PDF tab -> text/analysis tab -> provenance panel.
- Create investigation -> add evidence -> add note/hypothesis -> export packet.
- Exported packet -> manifest exists -> checksum is deterministic -> skipped files are explained.
- Exported packet -> legal header/versioning exists and is accurate.
- Ambiguity queue -> inspect unresolved item -> defer or mark reviewed.
- Email thread -> search -> open thread -> add message/thread to investigation.
- API degraded/down state -> user sees recovery state and no blank screen.
- Mobile investigation/document flow -> no clipped controls, trapped modals, or unusable overflow.

Golden-path tests may skip only when required fixture data is absent. Skips must include a specific reason and should be tracked in the release checklist.

## Threat Model Focus

Review these areas before release:

- Uploads and file ingestion.
- PDF rendering and file serving.
- OCR and extracted text display.
- Email parsing and MIME cleanup.
- ZIP export and path traversal.
- Auth, refresh-token rotation, admin routes, and repeated auth failures.
- Search endpoints and expensive filters.
- Media thumbnails and raw media access.
- HTML sanitization and rich text display.
- CSP, cache-control, and security headers.

For each area, document:

- user-facing risk
- likely exploit or failure mode
- existing protection
- missing test
- required release gate

### Audit Findings (2026-04-29) ✅

- **Authentication & JWT Handling** ✅ AUDITED
  - Current state: `src/server/auth/middleware.ts`
  - Production exit if `JWT_SECRET` missing
  - Dev warning if secret not set (no silent fallback)
  - `getJwtSecret()` function centralizes access
  - **Verified**: No hardcoded secrets, dev fallback warns

- **Rate Limiting** ✅ AUDITED
  - Current state: `src/server/middleware/rateLimit.ts`
  - `apiRateLimiter` (100 req/min) created and applied to admin + search routes
  - Applied to: `/api/admin/*`, `/api/search*`
  - **Verified**: Rate limiters active on write and search endpoints

- **Public Read / Auth Write Architecture** ✅ AUDITED
  - Decision: Read access open, write requires `authenticateRequest`
  - Verified routes with auth:
    - `src/server/routes/investigations.ts` - write ops have auth
    - `src/server/routes/activeLearning.ts` - all endpoints have auth
    - `src/server/routes/faceRoutes.ts` - admin endpoints have `requireRole('admin')`
  - **Verified**: No auth on read routes (intended), auth on all write routes

## Data Integrity Audit

Verify:

- Extracted facts link to immutable source records when expected.
- Source hashes or source identifiers are present or explicitly marked missing.
- Review state distinguishes unreviewed, accepted, rejected, deferred, and insufficient evidence.
- Export manifests include included files, skipped files, checksums, app version, generated timestamp, and limits.
- Alias resolution preserves original source strings.
- Conflict handling never deletes original evidence.

## CI/CD Pipeline Recommendations

### PR Fast Gate

Run on every pull request:

- install with frozen lockfile
- format check
- lint
- type-check
- unit tests
- design token check
- test hygiene check
- seed conflict policy check

### PR Full Gate

Run for main-bound changes or labeled release candidates:

- production build
- bundle smoke
- API contract tests
- route/UI sync tests
- selected golden paths
- schema hash check
- production dependency audit
- migration test on clean Postgres

### Release-Candidate Gate

Run before tagging:

- full golden-path suite
- data-integrity audit
- export determinism tests
- accessibility scan for core flows
- performance budget checks
- staging deploy
- post-deploy smoke against staging

### Production Gate

Run at deploy:

- manual production approval
- backup verification
- deploy
- readiness and deep health checks
- production smoke tests
- Sentry/log monitoring window
- rollback criteria if health, errors, or latency exceed thresholds

## Performance Budgets

All budgets are p95 under simulated 4G (25 Mbps / 100ms RTT) in Chromium.
Gate release candidates when any budget is exceeded without documented explanation.

| Metric                                  | Budget               | Measurement                                       |
| --------------------------------------- | -------------------- | ------------------------------------------------- |
| App shell load (first contentful paint) | < 1.5s               | Lighthouse / Playwright `page.goto` timing        |
| Entity search response (API p95)        | < 400ms              | `pnpm test:contracts` latency header              |
| Document detail open                    | < 600ms              | Playwright `waitForResponse`                      |
| PDF first page render                   | < 1.2s               | Playwright screenshot timing                      |
| Investigation workspace open            | < 800ms              | Playwright `waitForSelector` on tab nav           |
| Export preview generation               | < 2s                 | Playwright `waitForResponse` on `/export/preview` |
| List scroll 60fps (> 1000 items)        | no frame drop > 16ms | Playwright `page.evaluate` RAF timing             |
| Graph/timeline interaction              | < 100ms response     | User-timing marks                                 |

Regressions > 20% from baseline are release-blocking. Regressions < 20% must be
explained in the PR description.

## Accessibility Budgets

### Target Viewports

All mobile Playwright tests run at:

- **Primary**: 390 × 844 (iPhone 14 / typical Android equivalent)
- **Minimum**: 375 × 667 (iPhone SE — smallest supported)

Desktop tests run at 1440 × 900. Do not test at arbitrary viewports; pin these
values in Playwright config so CI results are reproducible.

The golden-path mobile flows (search → entity dossier → source document → export
preview) must complete without horizontal scroll at 390px width.

Verify:

- keyboard navigation through search, entity dossier, document modal, investigation evidence, and export preview
- focus containment in modals and bottom sheets
- visible focus states
- screen-reader names for icon-only controls
- non-color-only status indicators
- mobile text and controls do not clip
- **Degraded Visual Consistency**: Verify that "API down" or "Service Unavailable" states use the approved design-system warning patterns consistently across all routes.

## Deliverables

Gemini should maintain:

- coverage gap notes
- threat model notes
- golden-path checklist
- CI/CD gate recommendations
- release-blocking risk register

Gemini should not implement features directly unless explicitly assigned a verification or hardening patch.
