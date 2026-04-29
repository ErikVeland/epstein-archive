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
- `pnpm lint`
- `pnpm type-check`
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

## Golden Paths

Expand or create Playwright coverage for:

- Search entity -> open dossier -> inspect evidence -> open source document.
- Document route -> PDF tab -> text/analysis tab -> provenance panel.
- Create investigation -> add evidence -> add note/hypothesis -> export packet.
- Exported packet -> manifest exists -> checksum is deterministic -> skipped files are explained.
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

Track and gate regressions for:

- app shell load
- entity search response time
- document detail open time
- PDF first page render time
- investigation workspace open time
- export preview generation time
- graph/timeline interaction responsiveness

Performance budgets should fail release candidates when regression is user-visible and unexplained.

## Accessibility Budgets

Verify:

- keyboard navigation through search, entity dossier, document modal, investigation evidence, and export preview
- focus containment in modals and bottom sheets
- visible focus states
- screen-reader names for icon-only controls
- non-color-only status indicators
- mobile text and controls do not clip

## Deliverables

Gemini should maintain:

- coverage gap notes
- threat model notes
- golden-path checklist
- CI/CD gate recommendations
- release-blocking risk register

Gemini should not implement features directly unless explicitly assigned a verification or hardening patch.
