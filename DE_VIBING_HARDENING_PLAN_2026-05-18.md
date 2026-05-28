# Epstein Archive De-Vibing And Production Hardening Plan

Date opened: 2026-05-18
Last updated: 2026-05-28

This is the executable stabilization blueprint for turning the current codebase from accumulated AI-generated drift into a production-grade system. It is based on local repository inspection, TypeScript/lint/test gates, Knip import/export analysis, dependency checks, and database/schema gates.

## 0. Current Status — 2026-05-22

The original hardening plan is complete and production is live on the hardened release path.

Production evidence from the 2026-05-21 deploy:

- GitHub Actions production deploy completed for `8e959be1f`.
- Live `/api/health` returned `200` with `{"status":"ok"}`.
- Live homepage returned `200` with title `Epstein Files Archive`.
- Remote `dist` points at `/home/svc_epstein/epstein-archive/.releases/20260521142823-8e959be1f60c/dist`.
- PM2 has both `epstein-archive` cluster workers online.

Remaining work is no longer "finish the original plan." It is hardening burn-down: keep the gates strict, remove the remaining large-module and dependency debt, and make deploy operations harder to trip over.

## 1. Vibe-Code Severity Matrix

| Severity | Issue                                                   | Current State                                                                                                                                                                                           | Next Action                                                                                        |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| GREEN    | Canonical evidence state mixed with generated AI output | Fixed: AI output is artifact-only unless explicit rewrite override is enabled.                                                                                                                          | Keep `ALLOW_AI_CONTENT_REWRITE` exceptional and audited.                                           |
| GREEN    | Deploy/schema/query gates were permissive               | Fixed: schema hash, forbidden identifiers, Knip baseline, query-plan gate, select-star gate, bundle budget, and production certification are wired into release.                                        | Keep gates blocking; review baselines only through intentional commits.                            |
| GREEN    | Public mutation endpoint for document annotations       | Fixed: annotation writes require authentication.                                                                                                                                                        | Fold remaining write endpoints through the same auth/rate-limit pattern.                           |
| GREEN    | Huge modules with mixed responsibilities                | Fixed: `App.tsx`, ingest pipeline, `EmailClient.tsx` (1551→841 lines, 4 sub-components), `mediaRoutes.ts` (1050→17 lines, 6 sub-routers), `investigations.ts` (1245→16 lines, 5 sub-routers) all split. | Continue burn-down on any new large surfaces; baseline is now under 900 lines per file.            |
| GREEN    | Active duplicate cache abstractions                     | Fixed: retired server/client cache services are gone and `check:hygiene` blocks their return.                                                                                                           | Audit smaller local component caches for stale-data risk; keep server data behind `cacheService`.  |
| GREEN    | Root diagnostic artifacts tracked as source             | Fixed: tracked dumps removed and hygiene gate blocks reintroduction.                                                                                                                                    | Keep generated diagnostics out of git.                                                             |
| GREEN    | Duplicate/retired UI surfaces                           | Fixed: duplicate About surface removed.                                                                                                                                                                 | Treat future duplicate pages as delete-first work.                                                 |
| GREEN    | `SELECT *` and high-traffic query plans                 | Fixed for the release gate: explicit projections are enforced and route explain plans block regressions.                                                                                                | Add cursor pagination endpoint-by-endpoint where offset pagination still matters for large tables. |
| GREEN    | Swallowed errors and console logging in app code        | Fixed: zero `console.*` calls remain in `src/server/` (outside the logger itself). Canonical API error envelope is in place. Client `console.*` calls are acceptable browser-side debugging output.     | Continue monitoring for regressions via `grep` in CI; client-side cleanup is lower priority.       |
| GREEN    | Generated pgtyped files report `any`/unused in Knip     | Contained: generated-path noise is excluded/baselined and Knip baseline is enforced.                                                                                                                    | Burn down the baseline gradually; do not widen it without review.                                  |

## 2. Dead Code Elimination Plan

Removed and guarded:

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
- `src/client/services/OptimizedDataService.ts`
- `src/client/services/optimizedDataLoader.ts`
- Client OCR service bundle under `src/client/services/ocr/*`
- Retired server cache wrappers: `src/server/performanceCache.ts`, `src/server/utils/perfCache.ts`

`scripts/check_hygiene.sh` now blocks the retired cache/data-client paths and imports from returning.

Remaining deletion candidates require route-level verification before removal:

- `src/client/components/common/Card.tsx`: still present but appears drift-prone; either prove active usage and normalize it or delete after import/design-token verification.
- `src/client/services/documentProcessor.ts`: still used by uploader/tests; decide whether it remains a client feature or moves behind server ingestion.
- `src/client/features/email/EmailClient.tsx`: split further before deleting any local helpers.
- Untracked/editor backup artifacts such as `*.bak` should never enter git; add a hygiene pattern if one is accidentally staged.

Rollback: each deletion must be isolated in its own commit; rollback by reverting that commit. Test gate: `pnpm type-check && pnpm lint --max-warnings=0 && pnpm test:unit`.

## 3. Dependency Cleanup Plan

Completed:

- React 19 + React Router 7.
- Vite 8 + `@vitejs/plugin-react` 5.
- Express 5 + Zod 4 in the app.
- React Query patch train to `5.100.10`.
- Heavy client OCR/ML no longer ships through client OCR services.

Still open:

- `packages/db` still carries Zod 3; upgrade only with generated-query test coverage.
- TypeScript remains `5.9.x`; TypeScript 6 should stay deferred until the toolchain is stable.
- Server-side OCR/scan scripts still need `tesseract.js`/`canvas`; keep them out of the client path.
- Run `pnpm outdated` on a dedicated dependency branch, not during incident/deploy work.

Order for future dependency work: DB package Zod migration, TypeScript/toolchain branch, then leftover patch upgrades.

## 4. Architectural Simplification Plan

Canonical boundaries:

- `src/shared`: DTOs, Zod schemas, constants only. No DB, no React.
- `src/server/routes`: transport only. Validate request, call service/repository, return DTO.
- `src/server/services`: business workflows and transactions.
- `src/server/db`: SQL and repository mapping only.
- `src/client/pages`: route composition only.
- `src/client/components`: display and interaction only.
- `src/client/hooks`: React Query/state orchestration only.

Completed splits:

- `src/client/App.tsx`: route registry, providers, shell, modal host, and orchestration hooks extracted under `src/client/app/`.
- Ingest pipeline: stage/config/runner/recovery/status/notification modules extracted with CLI wrappers preserved.
- Queue workers: canonical `src/server/queue/` module with single-purpose workers and dead-letter/reaper behavior.

Files still worth splitting:

- `src/server/routes/investigations.ts`: split notebook, evidence, export, leads, timeline routes.
- `src/server/routes/mediaRoutes.ts`: split listing, streaming, albums, people/faces, batch operations.
- `src/client/components/email/EmailClient.tsx`: split mailbox state, thread list, message detail, search, keyboard actions.

Completed merges/retirements:

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

Completed:

- HTTP cache: `middleware/cache.ts`
- Server cache namespaces: `src/server/cache/cacheService.ts`
- Retired duplicate imports/paths blocked by `scripts/check_hygiene.sh`

Current rule:

- One `CacheService` with namespaces: `http`, `query`, `search`, `email`.
- Keys include schema hash/data revision/user scope.
- Mutations publish tag invalidations.
- No private cache maps in route files.

Remaining audit:

- Review local component caches that are purely UI affordances versus data freshness risks.
- Keep route/service data caches centralized and tag-invalidated.

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
- Build staged release artifacts and verify them through canary before `dist` promotion.
- Separate deploy of schema migrations from app behavior changes.
- Rollback checkpoints after schema, API, frontend, worker phases.
- Hold a remote `.deploy.lock` during production mutation/check phases so GitHub Actions and manual deploys cannot collide.

## 21. Incident Prevention Plan

Runbooks required:

- Search latency spike.
- Ingest queue stuck.
- AI provider timeout/failure.
- Missing source asset.
- Schema hash mismatch.
- Cache stale data incident.
- Auth/session failure.
- Production deploy lock.

## 22. Technical Debt Elimination Roadmap

Phase 0 completed (first pass):

- Remove tracked diagnostics. ✅
- Delete duplicate About page. ✅
- Strengthen hygiene gate. ✅
- Begin cache consolidation. ✅

Phase 1 — completed:

- Finish cache merge (unified `cacheService.ts`, old files removed). ✅
- Add canonical error envelope (`errorHandler.ts`, `apiErrorEnvelopeMiddleware` in `app.ts`). ✅
- Convert top 10 `SELECT *` queries (`check:select-star` gate active, no `SELECT *` in db/ or queries/). ✅
- Split `App.tsx` route registry/shell (1547→AppRoot + hooks + shell). ✅

Phase 2 — completed:

- Split ingestion pipeline (`scripts/pipeline/` with config, stages, runner, recovery, status, notifications). ✅
- Replace client data service duplication with typed hooks (38 hooks, `OptimizedDataService` removed). ✅
- Enforce Knip baseline (`knip-baseline.txt` committed, `check:knip-baseline` in `prebuild:prod` and `strict_prechecks.sh`). ✅
- Remove dead client OCR/ML bundles (client OCR services removed, `@tensorflow/tfjs-*` deps removed). ✅

Phase 3 — completed:

- React 19 + Vite 8 upgrade (React 19.2.6, Vite 8.0.13, @vitejs/plugin-react 5.2.0). ✅
- Express 5 + Zod 4 upgrade (Express 5.2.1, Zod 4.4.3). ✅
- React Router 7 upgrade. ✅
- TypeScript 6.0 deferred; app remains on TypeScript 5.9.x pending toolchain stability.
- Bundle budget gate blocking release (`check:budget` runs in `postbuild:prod`). ✅
- Worker redesign (`pipeline_jobs` table, JobManager dead-letter/reaper, `src/server/queue/` canonical module with single-purpose workers). ✅

## 23. Long-Term Maintainability Strategy

Ownership:

- Data platform owns schema, migrations, repositories, ingest workers.
- Product frontend owns pages/components/hooks.
- Platform owns deploy, observability, CI gates, cache, auth middleware.
- Investigations domain owns evidence/provenance/scoring semantics.

## 24. Completion Status — 2026-05-22

All three phases of the original plan are now complete and deployed to production. Items marked during initial assessment as out of scope or deferred were addressed or intentionally reclassified:

| Item                                              | Status | Evidence                                                                                                                                                                                                 |
| ------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Knip baseline in `prebuild:prod`                  | ✅     | `pnpm check:knip-baseline` added to `prebuild:prod` chain                                                                                                                                                |
| Query-plan gate for high-traffic routes           | ✅     | `scripts/check_query_plan.ts` created, wired into `ci_pg_nuclear_gates.sh`                                                                                                                               |
| Rate-limit file-serving + search/export endpoints | ✅     | `mediaStreamLimiter`, `documentFileLimiter`, `documentsListLimiter`, `exportRateLimiter`, `aiRateLimiter` added; applied to media file routes, document file/list routes                                 |
| PDF route symlink-bypass hardening                | ✅     | `mediaRoutes.ts` `/pdf` route now uses `fs.realpathSync()` + root allowlist                                                                                                                              |
| 8 incident/runbook procedures                     | ✅     | `docs/runbooks/01` through `08` — search latency, ingest stuck, AI timeout, missing asset, schema hash, cache stale, auth failure, production deploy lock                                                |
| Worker redesign — canonical queue module          | ✅     | `src/server/queue/` with `JobManager`, `WorkerPool`, `WorkerConfig`, single-purpose `BaseWorker`/`IngestWorker`/`AIEnrichmentWorker`/`MediaThumbnailWorker`; backward-compat re-exports at old locations |
| All old imports migrated to `src/server/queue/`   | ✅     | 5 files updated to import from canonical module                                                                                                                                                          |
| Production deploy collision guard                 | ✅     | `deploy.sh` now acquires a remote `.deploy.lock`, preserves it across `git clean`, and releases it on exit                                                                                               |

## 25. Next Steps To Completion

The plan is no longer blocked on foundational hardening. The next completion milestone is "boring production maintainability": smaller files, fewer exceptions, and stricter operational safety.

1. Deploy operations
   - Keep GitHub Actions concurrency enabled.
   - Keep the remote deploy lock in `deploy.sh`; tune `EPSTEIN_DEPLOY_LOCK_TTL_SECONDS` only if deploys routinely exceed four hours.
   - Use `docs/runbooks/08-production-deploy-lock.md` before clearing stale `.deploy.lock`.

2. Large-module burn-down ✅ (completed 2026-05-25)
   - `EmailClient.tsx`: 1551→841 lines — `EmailMailboxSidebar`, `EmailFilterPanel`, `EmailAnalyticsPane`, `EmailContentPane` extracted.
   - `mediaRoutes.ts`: 1050→17 lines (assembler) — `mediaShared`, `mediaMetadata`, `mediaImages`, `mediaBatch`, `mediaAudio`, `mediaVideo`, `mediaPdf` sub-routers.
   - `investigations.ts`: 1245→16 lines (assembler) — `investigationsCore`, `investigationsTimeline`, `investigationsEvidence`, `investigationsNotebook`, `investigationsExport` sub-routers.

3. Dependency/toolchain cleanup
   - Migrate `packages/db` from Zod 3 to Zod 4 with generated-query tests.
   - Defer TypeScript 6 until the build/test toolchain is fully compatible.
   - Keep OCR/`canvas` dependencies server-script-only; re-run bundle leak checks before each release.

4. Gate burn-down
   - Reduce `knip-baseline.txt` instead of widening it.
   - Convert any remaining offset-heavy endpoints to cursor pagination where live data size justifies it.
   - Continue replacing broad catches and console logging with the canonical logger/error envelope in production paths first.

Non-negotiables:

- One source of truth per concept.
- One validation layer per API edge.
- One cache service.
- One logger.
- One retry/concurrency helper.
- One DTO contract per route.
- No AI output in canonical evidence fields.
