# Epstein Archive De-Vibing And Production Hardening Plan

Date: 2026-05-18

This is the executable stabilization blueprint for turning the current codebase from accumulated AI-generated drift into a production-grade system. It is based on local repository inspection, TypeScript/lint/test gates, Knip import/export analysis, dependency checks, and database/schema gates.

## 1. Vibe-Code Severity Matrix

| Severity | Issue                                                   | Evidence                                                                                                                      | Operational Impact                                                     | Required Action                                                                          |
| -------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| RED      | Canonical evidence state mixed with generated AI output | `scripts/ingest_pipeline.ts`, `scripts/unified_pipeline.ts` previously wrote `metadata_json.ai_summary` and `content_refined` | Legal/provenance risk; source text indistinguishable from model output | Completed first-pass fix: artifact-only AI output with `ALLOW_AI_CONTENT_REWRITE` opt-in |
| RED      | Deploy/schema gates were permissive                     | `deploy.sh`, `scripts/pg_schema_hash.ts` had disabled or warning-only gates                                                   | Drift reaches production undetected                                    | Completed first-pass fix: fail closed in CI/production                                   |
| RED      | Public mutation endpoint for document annotations       | `POST /api/documents/:id/annotations`                                                                                         | Evidence annotation spam/spoofing                                      | Completed first-pass fix: authenticated writes only                                      |
| RED      | Huge god files with mixed responsibilities              | `scripts/ingest_pipeline.ts` 3193 LOC, `src/client/App.tsx` 2268 LOC, `src/client/components/email/EmailClient.tsx` 1687 LOC  | Slow review, incident diagnosis, unsafe partial edits                  | Split by bounded contexts in phases 2-4                                                  |
| AMBER    | Active duplicate cache abstractions                     | `middleware/cache.ts`, `performanceCache.ts`, `db/cache.ts`, `utils/perfCache.ts`                                             | Stale data and invalidation surprises                                  | Merge HTTP cache APIs now; replace remaining DB/email caches with tagged cache adapter   |
| AMBER    | Root diagnostic artifacts tracked as source             | `tsc_output*.txt`, `build_output*.txt`, `lint_output.txt`, dumps                                                              | Noisy grep, onboarding confusion, stale evidence                       | Deleted in this pass; hygiene gate updated                                               |
| AMBER    | Duplicate/retired UI surfaces                           | `About.tsx` vs `AboutPage.tsx`                                                                                                | Product drift and inconsistent copy/data                               | Deleted unused `About.tsx` and CSS                                                       |
| AMBER    | Query files still use `SELECT *` and offset pagination  | `packages/db/src/queries/*.sql`, repository SQL                                                                               | Large-table latency, brittle DTO contracts                             | Replace with explicit projections and cursor pagination by endpoint priority             |
| AMBER    | Swallowed errors and console logging in app code        | 577 catch sites, 167 console calls in `src`                                                                                   | Incident invisibility                                                  | Route through canonical logger and error envelope                                        |
| GREEN    | Generated pgtyped files report `any`/unused in Knip     | `packages/db/src/queries/__generated__/*`                                                                                     | Mostly tool artifact noise                                             | Exclude generated files from dead-code reports, regenerate after SQL cleanup             |

## 2. Dead Code Elimination Plan

Already removed:

- `build_output.txt`
- `build_output_lint.txt`
- `errors.txt`
- `full_lint.txt`
- `hashes_dump.csv`
- `lint.json`
- `lint_output.txt`
- `redaction_dump.csv`
- `tsc_errors.txt`
- `tsc_output.txt`
- `tsc_output_v2.txt`
- `tsc_output_v3.txt`
- `tsc_output_v4.txt`
- `tsc_output_v5.txt`
- `src/client/components/pages/About.tsx`
- `src/client/components/pages/About.module.css`

Next deletion candidates require route-level verification before removal:

- `src/client/components/common/BaseCard.tsx`, `Card.tsx`, `FormLayout.tsx`, `HelpText.tsx`: Knip unused; confirm no dynamic import.
- `src/client/components/email/mobile/*`: currently wrappers/unused; delete after mobile email route decision.
- `src/client/services/OptimizedDataService.ts`, `optimizedDataLoader.ts`: overlapping data clients; replace with React Query hooks backed by `apiClient`.
- `src/client/services/ocr/*`: browser OCR stack should move to worker/server ingestion or be removed from client bundle.

Rollback: each deletion must be isolated in its own commit; rollback by reverting that commit. Test gate: `pnpm type-check && pnpm lint --max-warnings=0 && pnpm test:unit`.

## 3. Dependency Cleanup Plan

Remove after import verification:

- Deprecated types: `@types/diff`, `@types/dompurify`, `@types/react-virtualized-auto-sizer`, `@types/react-window-infinite-loader`, `@types/bcryptjs`.
- Heavy client-side OCR/ML if no live route needs it: `@tensorflow/tfjs-*`, `@vladmandic/face-api`, `tesseract.js`, `canvas`.
- Duplicate sanitization stack: keep `dompurify` or `isomorphic-dompurify`, not both.

Safe patch upgrades first:

- `pg 8.18.0 -> 8.20.0`
- `@sentry/node/react 10.45.0 -> 10.53.1`
- `@tanstack/react-query 5.95.0 -> 5.100.10`
- `dompurify 3.4.1 -> 3.4.4`
- `tsx 4.20.6 -> 4.22.1`
- `vitest 4.0.18 -> 4.1.6`

Breaking upgrade train:

- React 18 -> 19, `@types/react` 18 -> 19
- Vite 7 -> 8 and `@vitejs/plugin-react` 4 -> 6
- Express 4 -> 5
- Zod 3 -> 4
- TypeScript 5.9 -> 6.0
- React Router 6 -> 7

Order: patch upgrades, test; Express 5 backend branch, test; React 19 frontend branch, test; Vite/TS toolchain branch, test; Zod 4 schema branch, test.

## 4. Architectural Simplification Plan

Canonical boundaries:

- `src/shared`: DTOs, Zod schemas, constants only. No DB, no React.
- `src/server/routes`: transport only. Validate request, call service/repository, return DTO.
- `src/server/services`: business workflows and transactions.
- `src/server/db`: SQL and repository mapping only.
- `src/client/pages`: route composition only.
- `src/client/components`: display and interaction only.
- `src/client/hooks`: React Query/state orchestration only.

Files to split:

- `src/client/App.tsx`: extract route registry, shell chrome, global search, modal orchestration, onboarding, keyboard command setup.
- `scripts/ingest_pipeline.ts`: split into discovery, extraction, provenance, AI artifacts, queue lease worker, CLI runner.
- `src/server/routes/investigations.ts`: split notebook, evidence, export, leads, timeline routes.
- `src/server/routes/mediaRoutes.ts`: split listing, streaming, albums, people/faces, batch operations.
- `src/client/components/email/EmailClient.tsx`: split mailbox state, thread list, message detail, search, keyboard actions.

Files to merge:

- `src/server/utils/perfCache.ts` into `src/server/middleware/cache.ts`.
- `src/server/performanceCache.ts` and `src/server/db/cache.ts` into one `src/server/cache/cacheService.ts` with namespaces/tags.
- `src/client/services/OptimizedDataService.ts` into `src/client/services/apiClient.ts` plus typed hooks.

## 5. Type Safety Hardening Plan

Current rot:

- Generated pgtyped files use `any`; acceptable only under generated-path lint override.
- `apiClient.ts` exposes several `unknown` casts and legacy response coercions.
- Some route DTOs are manually mapped while others leak database shape.

Rules:

- No new `any` outside generated files and explicitly approved mappers.
- Every route response must have a shared DTO type and mapper.
- Every request body/query must use Zod at the route edge.
- Client cannot infer server shape from raw JSON.

CI gate: add `pnpm dlx knip --production --reporter compact` as advisory first, then fail on new unused exports after baseline file is checked in.

## 6. State Management Cleanup Plan

Canonical model:

- Server state: React Query only.
- Auth state: `AuthContext` only, backed by refresh flow.
- UI ephemeral state: local component state.
- Investigation workspace shared state: one provider, no duplicate notebook/evidence stores.

Remove:

- Ad hoc caching inside client services.
- Duplicate local copies of server collections unless they are optimistic updates with explicit invalidation.
- Manual prefetch systems not backed by React Query.

## 7. API Contract Enforcement Plan

Canonical response envelope for errors:

```json
{
  "error": { "code": "STRING_CODE", "message": "safe message", "requestId": "uuid", "details": {} }
}
```

Actions:

- Centralize route error handling in `src/server/utils/errorHandler.ts`.
- Replace route-local `{ error: string }` responses.
- Generate OpenAPI from route schemas or keep a shared DTO registry.
- Contract test every public API route used by `apiClient.ts`.

## 8. Database Integrity Cleanup Plan

Immediate:

- Keep `pnpm schema:hash:check` fail-closed.
- Keep duplicate-index and dead-schema checks in CI.
- Replace `SELECT *` in `packages/db/src/queries/*.sql` with explicit columns.

Migration strategy:

- One migration per semantic change.
- Every destructive migration archives affected rows/columns under `archive_vXX`.
- Every migration must include rollback notes, row-count preflight, lock-time estimate, and verification query.

## 9. Frontend Rendering Optimization Plan

Worst offenders:

- `src/client/App.tsx` owns too much global state and modal routing.
- Large page bundles: About, email, network, investigation workspace.
- Client OCR/ML services risk dragging heavy dependencies into bundles.

Targets:

- Main JS initial payload under 350 KB gzip.
- Route chunk under 250 KB gzip unless explicitly justified.
- Interaction to Next Paint under 200 ms for search/filter actions.
- No list view renders more than 100 DOM rows without virtualization.

## 10. React Modernization Plan

This is Vite React, not Next.js. Do not invent a Next.js migration unless SSR/SEO requirements justify it.

React 19 migration:

- Upgrade `react`, `react-dom`, `@types/react`, `@types/react-dom`.
- Run strict hook lint; fix invalid effects before enabling compiler.
- React Compiler only after component purity warnings are clean.

Next.js/RSC:

- Not applicable to current architecture. If adopted later, move only SEO/static public pages first; do not rewrite investigative workspace into RSC until data contracts are stable.

## 11. Async/Concurrency Hardening Plan

Rules:

- No unbounded `Promise.all` over documents/files.
- Every queue job has idempotency key, lease, retry count, terminal failure state.
- Every polling loop has timeout, jitter, and cancellation.
- LLM calls must be bounded by timeout and artifact persistence.

Actions:

- Extract a shared `pLimit`-style concurrency helper.
- Replace magic concurrency defaults in ingest scripts with validated env config.
- Fail production when AI artifact writes fail.

## 12. Observability Modernization Plan

Canonical logging:

- Server: `Logger.ts`/pino only.
- Scripts: structured logger wrapper, not raw `console.log` except CLI progress.
- Every request has `requestId`.
- Every background job logs run id, document id, stage, retry, duration, status.

Metrics:

- API latency p50/p95/p99 by route.
- DB query latency p95 by repository method.
- Queue lease age, retry count, dead-letter count.
- AI artifact success/failure rates by provider/model.

## 13. CI/CD Enforcement Plan

Release gates:

- `pnpm type-check`
- `pnpm lint --max-warnings=0`
- `pnpm check:hygiene`
- `pnpm check:boundaries`
- `pnpm check:dead-schema-surfaces`
- `pnpm check:duplicate-indexes`
- `pnpm schema:hash:check`
- `pnpm test:unit`
- `pnpm audit --audit-level moderate`

Add after baseline:

- Knip unused export delta gate.
- Bundle budget gate per route.
- Query plan gate for high-traffic routes.

## 14. Security Hardening Plan

Already improved:

- Annotation writes require auth.
- Production audit logging fails closed.

Next:

- Normalize all auth/role checks through `auth/middleware.ts`.
- Add CSRF protection for cookie-backed mutations.
- Remove caller-supplied attribution headers.
- Make file-serving allowlist explicit and deny remote paths by default.
- Rate-limit all expensive search/export/AI endpoints by user and IP.

## 15. Cache Consolidation Plan

Current:

- HTTP cache: `middleware/cache.ts`
- Wrapper HTTP cache: `utils/perfCache.ts`
- DB query cache: `db/cache.ts`
- Email/search performance cache: `performanceCache.ts`

Target:

- One `CacheService` with namespaces: `http`, `query`, `search`, `email`.
- Keys include schema hash/data revision/user scope.
- Mutations publish tag invalidations.
- No private cache maps in route files.

## 16. Naming Standardization Plan

Rules:

- Database columns: snake_case.
- DTO fields: camelCase.
- Route params: `id` only when resource type is obvious; otherwise `documentId`, `entityId`.
- AI output: never stored under canonical metadata names; always `document_ai_artifacts`.
- Evidence confidence: one enum and one scoring module.

## 17. File Structure Rationalization

Move:

- Ingest scripts into `src/server/pipeline/*` plus thin CLI wrappers in `scripts/`.
- Route-specific client components under `src/client/features/<domain>`.
- Shared DTOs/schemas beside each other in `src/shared/contracts/<domain>`.

Delete:

- Root generated diagnostics.
- Superseded page/component duplicates.
- Legacy client services once hooks replace them.

## 18. Service Boundary Redesign

Canonical server flow:
`route -> validator -> service -> repository -> mapper -> DTO`

Forbidden:

- Routes doing multi-step business transactions.
- Repositories building UI DTOs.
- Client duplicating scoring or evidence rules.

## 19. Queue/Worker Redesign

Target:

- Durable `jobs` table or managed queue, not ad hoc loops.
- Lease with heartbeat and dead-letter state.
- Stage runs are append-only.
- Workers are single-purpose: extraction, entity extraction, AI artifacts, media thumbnails.

Rollback:

- Keep old script entrypoints as wrappers for one minor version.
- Feature flag new worker orchestration by stage.

## 20. Production Reliability Plan

Incident prevention:

- Fail deploy if schema drift, pg extensions, query plans, or audit table are unhealthy.
- Canary 5% read traffic, then 25%, then 100%.
- Separate deploy of schema migrations from app behavior changes.
- Rollback checkpoints after schema, API, frontend, worker phases.

## 21. Incident Prevention Plan

Runbooks required:

- Search latency spike.
- Ingest queue stuck.
- AI provider timeout/failure.
- Missing source asset.
- Schema hash mismatch.
- Cache stale data incident.
- Auth/session failure.

## 22. Technical Debt Elimination Roadmap

Phase 0 completed in this pass:

- Remove tracked diagnostics.
- Delete duplicate About page.
- Strengthen hygiene gate.
- Begin cache consolidation.

Phase 1:

- Finish cache merge.
- Add canonical error envelope.
- Convert top 10 `SELECT *` queries.
- Split `App.tsx` route registry/shell.

Phase 2:

- Split ingestion pipeline.
- Replace client data service duplication with typed hooks.
- Enforce Knip baseline.
- Remove dead client OCR/ML bundles if unused.

Phase 3:

- Worker redesign.
- React 19/Vite 8 upgrade.
- Express 5/Zod 4 upgrade.
- Bundle and query budgets blocking release.

## 23. Long-Term Maintainability Strategy

Ownership:

- Data platform owns schema, migrations, repositories, ingest workers.
- Product frontend owns pages/components/hooks.
- Platform owns deploy, observability, CI gates, cache, auth middleware.
- Investigations domain owns evidence/provenance/scoring semantics.

Non-negotiables:

- One source of truth per concept.
- One validation layer per API edge.
- One cache service.
- One logger.
- One retry/concurrency helper.
- One DTO contract per route.
- No AI output in canonical evidence fields.
