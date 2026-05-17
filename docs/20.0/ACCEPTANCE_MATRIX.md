# 20.0 Acceptance Matrix

## Release Checklist

| Feature/workstream            | User value                                                                                                                                                                                      | Owning model | Implementation owner | Required tests                                                                                                                                                      | Release gate                                                                                                                                                                                                                           | Status |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Investigation Command Center  | Users can start, resume, and triage investigations from one clear workspace.                                                                                                                    | Claude       | GPT/Codex            | Playwright command-center smoke, investigation API contract, mobile viewport check                                                                                  | No release if active investigations, empty state, or degraded API state is unclear or broken.                                                                                                                                          | Done   |
| Source-First Evidence UX      | Users can verify where entities, documents, claims, and evidence came from. All provenance fields follow the canonical table in GPT_CODEX_IMPLEMENTATION.md § Canonical Provenance Field Table. | Claude       | GPT/Codex            | Unit coverage for DTO/mappers, Playwright entity/document/evidence source jump, data-integrity audit                                                                | No release if core claims can appear without source/provenance/review state or explicit missing-state language.                                                                                                                        | Done   |
| Evidence Packet Builder 2.0   | Users can preview, understand, export, and verify evidence packets.                                                                                                                             | GPT/Codex    | GPT/Codex            | Export ZIP tests, manifest determinism tests, Playwright export preview flow                                                                                        | No release if export manifest/checksum is unstable or export warnings are not actionable.                                                                                                                                              | Done   |
| Ambiguity/Review Queue        | Users can see and resolve uncertainty instead of trusting hidden automation.                                                                                                                    | Claude       | GPT/Codex            | Review queue API tests, Playwright ambiguity review flow, audit log/data preservation checks                                                                        | No release if review decisions can erase original source data or ambiguity is collapsed into false certainty.                                                                                                                          | Done   |
| Search Upgrade                | Users can find relevant records by source type, confidence, review state, date, entity, and media type.                                                                                         | GPT/Codex    | GPT/Codex            | Search API contract, Playwright search-to-source golden path, query budget tests                                                                                    | No release if new filters break existing search callers or create unbounded slow queries.                                                                                                                                              | Done   |
| Accessibility/Mobile Polish   | Users can complete core workflows on mobile and with keyboard navigation.                                                                                                                       | Claude       | GPT/Codex            | Mobile Playwright flows, keyboard navigation tests, accessibility scan                                                                                              | No release if core search, dossier, document, investigation, or export flows are unusable on mobile/keyboard.                                                                                                                          | Done   |
| Security Hardening            | Users and data are protected from unsafe inputs, file access bugs, and dependency risk.                                                                                                         | Gemini       | GPT/Codex            | Dependency audit, path traversal tests, auth tests, CSP/cache header checks                                                                                         | No release with high/critical production dependency vulnerabilities or known unsafe file-serving/export paths.                                                                                                                         | Done   |
| CI/CD Gates                   | Broken builds, schema drift, and unsafe releases are stopped before production.                                                                                                                 | Gemini       | GPT/Codex            | CI dry run, schema hash check, production build, bundle smoke                                                                                                       | No release if required gates are absent, skipped without documented exception, or red on main.                                                                                                                                         | Done   |
| Golden Path Suite             | Real user journeys are protected from route/API/UI regressions.                                                                                                                                 | Gemini       | GPT/Codex            | Playwright golden paths, route/UI sync, API DTO contracts                                                                                                           | No release if core journeys fail against release-candidate data. Fixture skips must be documented.                                                                                                                                     | Done   |
| Power User Nav & State        | Users can jump between surfaces fast and resume exact session state.                                                                                                                            | Claude       | GPT/Codex            | Palette keyboard tests, deep link round-trip tests (investigation / entity / document / search), freshness indicator check, `GET /api/status/archive` contract test | No release if: (a) Command Palette is inaccessible via keyboard; (b) copying an investigation link omits active tab or evidence selection; (c) entity dossier, document, or search URLs do not restore state when opened in a new tab. | Done   |
| Onboarding & Triage           | Users understand the new system and can handle high volumes of uncertainty.                                                                                                                     | Claude       | GPT/Codex            | "What's New" smoke test, bulk review API contract, virtualization perf audit                                                                                        | No release if bulk triage can skip provenance or onboarding blocks access to core features.                                                                                                                                            | Done   |
| Hardened Standards Audit      | Maintainability and stability through consistent architecture and design system usage.                                                                                                          | Gemini       | GPT/Codex            | Icon usage audit, alias check, DTO coverage scan, primitive layout audit                                                                                            | No release if core investigative surfaces violate the 20.0 hard rules (Icons, Aliases, DTOs).                                                                                                                                          | Done   |
| Data Governance Audit         | Investigative records preserve provenance, original source strings, and reviewability.                                                                                                          | Gemini       | GPT/Codex            | Data-integrity audit, provenance coverage tests, export manifest verification                                                                                       | No release if extracted facts lack source linkage without an explicit missing-provenance state.                                                                                                                                        | Done   |
| JWT Production Hardening      | Prod-safe auth, no silent fallback                                                                                                                                                              | Gemini       | GPT/Codex            | Auth tests, JWT secret rotation                                                                                                                                     | No release with dev fallback in production                                                                                                                                                                                             | Done   |
| Rate Limiting on Admin/Search | Protected APIs from abuse                                                                                                                                                                       | Gemini       | GPT/Codex            | Rate limit header checks                                                                                                                                            | No release without rate limits on admin and search endpoints                                                                                                                                                                           | Done   |
| Lint Compliance               | Consistent code quality                                                                                                                                                                         | Gemini       | GPT/Codex            | `pnpm lint` 0 errors/warnings                                                                                                                                       | No release with lint warnings                                                                                                                                                                                                          | Done   |

## Implementation Progress

### 2026-04-29 — 20.0 Release Candidate Status

Completed:

- Fixed the release-blocking entity category icon regression in `InvestigationEvidencePanel`, `EvidenceDetail`, and `entityTypeIcons`.
- Added `GET /api/status/archive` with `archiveStatusSchema` for the global archive freshness indicator.
- Added `POST /api/review/bulk` for bulk accepting/rejecting/defer/insufficient-evidence review decisions while preserving source data through audit logs.
- Added `POST /api/review/flag` for user-initiated review flags on entities, documents, claims, and evidence.
- Added `GET /api/investigations/:id/export/preview` with readiness state, manifest summary, and actionable skipped-file warnings.
- Added generated evidence-packet chain-of-custody README metadata: app version, schema hash, and generation timestamp.
- Extended global search validation/repository handling for 20.0 filters: source type, confidence bounds, review state, date range, entity type, media type, evidence type, and red-flag band.
- Added 20.0 contract unit coverage for archive status/search filters and export chain-of-custody metadata.
- Concurrent UX/review work already added copy specs and preliminary review queue UI; remaining release checks still require API tests, audit preservation checks, and Playwright coverage.
- Command palette foundation exists in `src/client/components/common/CommandPalette.tsx` and `src/client/hooks/useCommandPalette.ts`, with `App.tsx` integration for Cmd+K and 13 commands. Keyboard/deep-link release tests are still pending.
- Added canonical provenance DTO/schema fields matching `GPT_CODEX_IMPLEMENTATION.md`: `sourceDocumentId`, `sourceHash`, `extractionMethod`, `confidence`, `reviewState`, `lastVerifiedAt`, and derived `provenanceStatus`.
- Added `mapProvenanceFieldsDto` to normalize legacy row names and values into the canonical contract without requiring a migration.
- Extended entity, document, and entity-evidence DTOs/schemas additively with provenance fields.
- Aligned `ProvenanceBadge` with canonical review states and extraction methods.
- Surfaced provenance badges on document cards, document modal header/metadata rail, person/entity cards, evidence search result cards, and AI claim rows.
- Added an entity-card source action for records with `sourceDocumentId`, and source badges on evidence context/passages where linked document ids are already available.
- Added `src/test/provenanceDtoMapper.test.ts` covering mapper normalization, missing-provenance behavior, and provenance-bearing document/entity/evidence mappers.

Verified:

- `pnpm exec vitest run src/test/provenanceDtoMapper.test.ts` passes: 5 tests.
- `pnpm lint` passes with 0 warnings.
- `pnpm type-check` passes.
- `pnpm test:unit` passes: 22 test files passed, 1 skipped; 77 tests passed, 16 skipped.
- `pnpm format:check` passes.
- `pnpm build:prod` passes.
- `pnpm audit --prod --audit-level high` passes: no known vulnerabilities.
- `pnpm check:boundaries` passes.
- `pnpm check:hygiene` passes.

Blocked / not yet release-ready:

- Fresh run of `pnpm test:contracts` on 2026-04-29 is blocked by local Postgres fixture availability: the suite stops at the first DTO contract because `GET http://127.0.0.1:3312/api/subjects?page=1&limit=1` returns 500. Earlier API boot diagnostics showed the local Postgres default role is missing (`role "epstein" does not exist`), so this remains an environment/fixture blocker rather than a known 20.0 code regression.
- The Playwright suites must be rerun with a valid `DATABASE_URL` or provisioned `epstein` role before final release sign-off.

Immediate patch / release-candidate gaps:

- Provision or point the release-candidate test run at a valid Postgres database, then rerun `pnpm test:contracts`, `pnpm test:route-sync`, and the golden-path Playwright specs.
- If those Playwright suites pass against release-candidate data, there are no known code gaps that must be patched before landing 20.0.

## Shared Pass/Fail Rules

- **Pass** means the feature works in the UI, has API/type coverage where relevant, has at least one user-flow test, and has clear empty/error states.
- **Fail** means the feature can mislead users, hide uncertainty, break export reproducibility, regress core navigation, or bypass release-blocking gates.
- **Exception** means a release manager documents the risk, owner, mitigation, and follow-up issue before release.
- **localStorage scope**: localStorage may only store UI preferences (sidebar state, theme, onboarding version). Investigative state (which investigation is open, which tab, which evidence item) must be in the URL. A test that relies on localStorage to restore investigative context is a test failure.

## Security & Quality Gates (Added 2026-04-29)

- **Pass** means:
  - JWT secret exits with error in production if missing
  - Rate limiters applied to all admin and search endpoints
  - All mapper files have typed interfaces (no `any`)
  - `pnpm lint` returns 0 errors AND 0 warnings
  - `pnpm type-check` returns 0 errors
  - `pnpm build:prod` succeeds

## Conflict Resolution

Use this matrix to reconcile model conflicts:

- Product wording conflicts are resolved by Claude unless they affect legal/security guarantees.
- Implementation feasibility conflicts are resolved by GPT/Codex unless they weaken acceptance criteria.
- Gate/security conflicts are resolved by Gemini unless they block a deliberately accepted release exception.
- Any conflict that changes the release promise must update this matrix before implementation continues.
