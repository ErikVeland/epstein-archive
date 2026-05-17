# Epstein Files Full Forensic Audit And Remediation Blueprint

Audit date: 2026-05-18. Repo root: `/Volumes/Media/Epstein Files/epstein-archive`.

## Executive Summary

The application is not the exact stack described in the prompt. Current implementation is a Vite + React 18 SPA, Node/Express API, PostgreSQL via `pg` + pgtyped SQL, PM2 deployment, and local `node-cache`; I found no active Next.js, Prisma, GraphQL, Redis, Docker Compose, or AWS IaC surface in the current root. Treat any roadmap based on those assumed systems as stale until revalidated.

The v21 cleanup materially improved the platform. Current gates pass: `pnpm type-check:server`, `pnpm lint --max-warnings=0`, `pnpm check:dead-schema-surfaces`, `pnpm check:duplicate-indexes`, `pnpm check:boundaries`, `pnpm schema:hash:check`, and `pnpm audit --audit-level moderate`. The system is therefore buildable, but not yet forensic-grade at 1M+ documents because the architecture still relies on oversized modules, offset pagination, SQL ad hoc fallbacks, in-process cache islands, unauthenticated public write/read surfaces, best-effort audit logging, and AI outputs written beside canonical content.

The prior May 10 drift audit remains a canonical historical artifact and documents the major schema cleanup: archived dead `mentions`, `resolution_candidates`, old `timeline_events`, `evidence`, `relations`, duplicate entity type columns, and duplicate indexes. This audit focuses on current residual risk.

## Severity Matrix

| Area                                     |    Severity | Current evidence                                                                                        | Release gate           |
| ---------------------------------------- | ----------: | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| Public annotation writes                 |         RED | `documentsRoutes.ts:291-377` writes annotations without auth; only rate-limited                         | Must fix               |
| Public corpus file proxy/remote fallback |         RED | `documentsRoutes.ts:410-620` intentionally public, can proxy allowlisted remote URLs                    | Must policy-review     |
| AI provenance/content mutation           |         RED | `unified_pipeline.ts:923-986` overwrites `content_refined` and writes `ai_summary` into `metadata_json` | Must isolate           |
| Cache correctness                        |       AMBER | `middleware/cache.ts`, `performanceCache.ts`, `db/cache.ts`, `utils/perfCache.ts` coexist               | Fix before scale       |
| Query scalability                        |       AMBER | `documentsRepository.ts:274-335`, `search.sql:99-161` use offset, dynamic FTS, computed vectors         | Fix next minor         |
| Frontend entropy                         |       AMBER | `App.tsx` 2268 LOC, `EmailClient.tsx` 1687 LOC, many 800+ LOC components                                | Phased refactor        |
| Deployment safety                        |       AMBER | `deploy.sh:157-182` comments out schema hash/extension gates; hard-coded prod IP defaults               | Fix before prod change |
| Dependency freshness                     | GREEN/AMBER | no audit vulns; many upgrades available                                                                 | Batch by risk          |

## Critical Risk Findings

### 1. Public Annotation Write Surface

Problem: `POST /api/documents/:id/annotations` accepts public writes with no `authenticateRequest` or role requirement. Root cause: annotation feature optimized for public research collaboration, but evidentiary overlays are part of the forensic record. Severity: RED. Blast radius: every document view and exported annotation/citation surface. Affected systems: documents API, annotation DB, UX trust, legal/evidentiary review.

Exact remediation: split annotations into `public_annotations` and `forensic_annotations`. Require auth for forensic annotations; keep public comments quarantined until moderation. Add immutable `annotation_events` append-only table with actor, request id, IP hash, user-agent hash, span hash, selected_text_sha256, and previous_event_hash.

Refactor strategy: route layer calls `AnnotationPolicyService`; repository exposes `createPublicDraft`, `approvePublicDraft`, `createForensicAnnotation`. Migration strategy: add new columns/tables, backfill current annotations as `legacy_public`, then enforce write policy. Rollback: keep current table as read source and disable new write route by flag `ANNOTATION_POLICY_V2=false`. Testing: unit policy matrix, API unauth/write tests, export manifest hash tests. Rollout: shadow-write events for 1 week, then enable auth requirement. Complexity: M. Risk: moderate user workflow change. Maintainability: high positive because annotations become auditable evidence objects.

### 2. AI Mutates Canonical Text Path

Problem: pipeline replaces `content_refined` after LLM OCR cleanup and stores AI summary in `metadata_json` (`unified_pipeline.ts:923-986`). Root cause: enrichment state shares the same document row and JSON blob as canonical archive metadata. Severity: RED. Blast radius: search, previews, evidence ladders, exports, legal defensibility. Affected systems: ingestion, search, documents UI, provenance, AI artifacts.

Exact remediation: make `documents.content` and `documents.content_refined` deterministic extraction only. Move all LLM outputs to `ai_artifacts` with `artifact_type`, `prompt_version`, `model_id`, input/output hashes, source spans, confidence, review_state, and citation anchors. UI must label AI text and never use AI summary as evidentiary quote.

Refactor strategy: `DocumentTextService` owns canonical text; `AiArtifactService` owns AI derivatives. Migration: backfill `metadata_json.ai_summary` and `ai_enriched_at` into `ai_artifacts`, then stop writing AI fields into metadata. Rollback: preserve old metadata fields until two releases after read path switches. Testing: golden documents compare canonical hashes before/after pipeline, hallucination guard tests, export excludes unreviewed AI claims by default. Rollout: feature flag `AI_ARTIFACT_READ_PATH`; canary on non-sensitive collections. Complexity: L. Risk: medium migration complexity, high payoff. Maintainability: major improvement.

### 3. Audit Logging Can Disappear Silently

Problem: `logAudit` returns on schema mode `none` and swallows insert failures (`auditLogger.ts:76-118`). Root cause: compatibility with multiple historical audit schemas. Severity: RED for forensic operations. Blast radius: quarantine overrides, downloads, exports, admin actions. Affected systems: security, compliance, incident response.

Exact remediation: make audit schema mandatory in production; fail closed for privileged operations when audit write fails; use append-only partitioned `audit_events` with hash chaining and daily manifest export.

Refactor strategy: replace compatibility mode detection with boot-time `assertAuditSchema()`. Migration: create `audit_events_v2`, dual-write, verify counts, then retire compatibility. Rollback: keep legacy insert path behind `AUDIT_V2=false`. Testing: failure injection on DB write, route-level privileged action tests. Rollout: dual-write first, then fail-closed for admin/export/download. Complexity: M. Risk: some actions may return 503 when audit DB is degraded. Maintainability: high.

### 4. Search And Document Lists Will Degrade At Scale

Problem: document browsing uses `LIMIT/OFFSET`, broad `ILIKE`, `COUNT(*)`, and mixed FTS in one query (`documentsRepository.ts:274-335`); search sentences/media/articles compute `to_tsvector` at query time (`search.sql:99-161`). Root cause: query paths evolved feature-by-feature instead of around search contracts. Severity: AMBER now, RED at 10M+ records. Blast radius: public UX, API saturation, Postgres CPU.

Exact remediation: introduce search contracts per corpus: `documents_search_v1`, `entity_search_v1`, `media_search_v1`; use keyset pagination for browse, generated tsvector columns for all searchable text, precomputed counts by filter buckets, and trigram only on normalized limited columns.

Refactor strategy: keep `/api/documents` shape but internally route browse vs search. Migration: add computed/search columns and indexes concurrently, backfill in batches, add cursor API while preserving offset for compatibility. Rollback: keep offset route until clients switch. Testing: `EXPLAIN (ANALYZE, BUFFERS)` budget tests, query-count tests, 1M-row fixture. Rollout: shadow log old/new latency, canary cursor mode. Complexity: L. Risk: index build IO. Maintainability: high.

### 5. Cache Fragmentation And Non-Distributed State

Problem: at least four cache implementations exist (`middleware/cache.ts`, `performanceCache.ts`, `db/cache.ts`, `utils/perfCache.ts`) using process-local `node-cache`. Root cause: local performance patches without one invalidation model. Severity: AMBER. Blast radius: PM2 cluster, deploys, ingestion updates, graph/search freshness.

Exact remediation: create `CacheService` with explicit namespaces, revision tokens from `revisionManager`, stale-while-revalidate, and optional Redis adapter. For current PM2, either disable mutable API response cache across workers or include dataset revision in every key.

Refactor strategy: replace route-level `cacheResponse` and `cacheMiddleware` with shared service. Migration: no DB migration; add instrumentation for hit/miss/eviction/staleness. Rollback: adapter can fall back to in-memory by namespace. Testing: cache stampede tests across simulated workers, mutation invalidation tests. Rollout: enable per namespace: stats, media albums, entities, graph. Complexity: M. Risk: temporary latency increase. Maintainability: high.

### 6. Frontend Root Component Is A God Object

Problem: `App.tsx` owns routing, search, modal orchestration, data prefetch, local/session storage, navigation state, release notes, and onboarding state. Root cause: SPA shell accumulated cross-cutting concerns. Severity: AMBER. Blast radius: render thrash, accessibility regressions, hard-to-test routing bugs.

Exact remediation: split into `AppProviders`, `AppRoutes`, `ShellLayout`, `SearchController`, `ModalHost`, `OnboardingController`. Move header search to its own route-independent query hook. Replace ad hoc `fetch` calls with typed `apiClient`/React Query hooks.

Refactor strategy: extract without behavior change, one slice per PR. Migration: none. Rollback: each extraction is reversible. Testing: Playwright route sync, keyboard navigation, modal focus trap, mobile viewport screenshots. Rollout: behind no flag; pure refactor. Complexity: M. Risk: moderate regression risk. Maintainability: very high.

## Subsystem Audit

Architecture: Express app is a single router hub with 40+ route modules mounted in `app.ts:744-809`. Good: request IDs, pino, helmet, pool shedding, retry storm detector, readiness checks. Bad: no strong module boundary between domain repositories/services/routes; dynamic imports in routes; API concepts overlap (`evidence`, `documents`, `entityEvidence`, `investigationEvidence`, `iceberg`, `forensic`).

Database: v21 cleanup fixed many historical schema issues and guards now pass. Residual risks: `documents` remains wide; `metadata_json` carries typed business state; `entity_mentions` duplicate-prevention still needs current uniqueness review; `documentsRepository.ts:470` casts `document_id` list as `int[]` despite `documents.id` being bigint; financial/property/timeline text-to-entity references should be audited in live DB before next schema freeze.

API: Good use of Zod in many routes. Problems: public GETs are intentionally broad; public POST annotations; inconsistent pagination; duplicate media batch endpoints for PUT and POST (`mediaRoutes.ts:864-995`); search route accepts filters not consistently enforced across all categories.

Frontend: Good lazy loading exists, but many large components remain: `App.tsx` 2268 LOC, `EmailClient.tsx` 1687, `InvestigationWorkspace.tsx` 1440, network components >1100. Risks: manual storage caches (`App.tsx:797-875`), direct `fetch` mixed with `apiClient`, multiple modal systems, expensive graph rendering.

Search: FTS exists for core docs/entities, but media/articles/investigations still compute vectors inline. Semantic search exists but must be treated as enhancement, not canonical evidence. Add query plans to CI for all search modes.

Graph: v21 collapsed legacy relations into canonical entity relationships. Remaining risk is scoring semantics: `risk_score`, `red_flag_rating`, `confidence`, `strength`, `proximity_score`, and `likelihood` are computed in many files. Establish one graph edge scoring contract and version it.

AI/LLM: LLM prompts use low temperature and output parsing, but error handling is best-effort and hallucination surfaces remain. AI outputs must be typed artifacts with review state, source spans, model/prompt hashes, and clear UI labeling.

Security: Good: helmet, JWT refresh rotation transaction, rate limits, path traversal checks, production secret guard. Bad: guest tokens, public annotations, public file endpoint policy, audit swallow, CORS allows localhost in all modes, no CSRF token for cookie refresh/logout/change-password flows beyond SameSite.

Performance: Good: pool statement timeouts, query budget logging, some batch queries. Bad: offset pagination, count queries, `ILIKE '%term%'`, large `LEFT(content, 600)` list payloads, sync fs checks in request path, PM2 worker-local caches.

Accessibility: Some focus-trap and modal hooks exist, but god shell and custom controls require automated axe + keyboard regression tests. Treat modals, document viewer, search palette, graph canvas, media browser, and mobile nav as P0 accessibility flows.

Observability: Good: pino, Sentry hooks, readiness, query budget. Missing: OpenTelemetry traces, route latency histograms, cache metrics export, ingestion stage SLOs, AI artifact failure dashboards, audit-write failure alerts.

Infrastructure: PM2 deployment has useful guardrails but is not cloud-portable. No current Docker/AWS IaC found. `deploy.sh` defaults to a public IP and comments out some DB gates. Production needs immutable artifact builds, secrets manager, backup/restore drills, and blue/green/canary automation.

Migration: Migrations are numerous and include hotfix/restore/compat history. Current schema hash guard is good. Require forward-only migrations for data tables, archive schema for drops, concurrent index builds, lock timeout, preflight row counts, and rollback runbooks.

Evidence Integrity / Provenance: Export manifest hashing exists, document provenance service exists, and v21 archived old evidence structures. Remaining gap: immutable chain for annotations, downloads, AI claims, graph edge derivations, and citation snippets.

## Must Fix Before Release

1. Auth/policy split for annotation writes.
2. AI artifact isolation from canonical document text/metadata.
3. Fail-closed production audit logging for privileged actions.
4. Re-enable deploy schema/extension gates and remove hard-coded production defaults from tracked scripts.
5. Replace `ANY($1::int[])` document ID casts with bigint arrays.
6. Define cache namespace/revision contract and remove route cache islands from mutable paths.

## Safe To Defer

React 19, Vite 8, Express 5, TypeScript 6, route-level RSC/server actions, Redis adoption, full PM2-to-container migration, graph layout rewrite, and complete component decomposition can wait if the release is read-mostly and the six release blockers above are fixed.

## High ROI Improvements

Keyset pagination for documents/media/entities; generated tsvector columns for media/articles/investigations; unified `SearchResultDto`; OpenTelemetry; `axe` Playwright gates; bundle budgets; cache metrics; evidence export golden tests; AI artifact review queue.

## Delete Immediately

Delete generated or stale local artifacts only after import scan: `.DS_Store`, old `tsc_output*.txt`, `errors.txt`, `lint_output.txt`, `.playwright-mcp/page-*.yml`, and any `.worktrees/*` content not intentionally retained. Do not delete historical audit docs.

## Merge / Consolidate Immediately

Cache layers into `CacheService`; entity normalization into shared server-side `EntityResolutionService`; red flag/risk/confidence calculations into `ForensicScoringService`; file path resolution into one `FileAccessPolicy`; DTO mapping into shared contracts consumed by frontend and backend.

## Rewrite Entirely

Rewrite the unified AI/OCR enrichment stage as idempotent queued jobs with durable `pipeline_stage_runs`, advisory locks or `FOR UPDATE SKIP LOCKED`, artifact-only outputs, bounded concurrency, and resumable batches. Rewrite graph scoring as deterministic SQL/materialized views plus reviewed AI-derived candidate edges, not mixed ad hoc service math.

## Production Incident Waiting To Happen

Public annotations will pollute evidentiary overlays. AI-mutated `content_refined` can blur source text with model output. Offset/count document browsing can pin Postgres under hostile search traffic. In-process caches across PM2 workers can serve stale graph/search slices after ingest. Audit logger swallow can erase exactly the event trail needed during an incident.

## Next Minor Version Upgrade Plan

Current important versions from `pnpm outdated`: React 18.3.1 → 19.2.6, React DOM 18.3.1 → 19.2.6, Vite 7.3.2 → 8.0.13, `@vitejs/plugin-react` 4.7.0 → 6.0.2, TypeScript 5.9.3 → 6.0.3, Express 4.22.1 → 5.2.1, Zod 3.25.76 → 4.4.3, `pg` 8.18.0 → 8.20.0, Playwright 1.58.2 → 1.60.0, Vitest 4.0.18 → 4.1.6, Sentry 10.45.0 → 10.53.1, TanStack Query 5.95.0 → 5.100.10, pdfjs 5.4.296 → 5.7.284, react-pdf 10.2.0 → 10.4.1, multer 1.4.5-lts.2 → 2.1.1, sharp 0.33.5 → 0.34.5.

Do not batch all majors into the next minor. Recommended v21.5: patch/minor upgrades only: Sentry, TanStack Query, pg, pdfjs/react-pdf, Playwright, Vitest, DOMPurify/isomorphic-dompurify, sharp, cors, express-rate-limit, tsx, prettier, eslint plugins. Remove deprecated type packages where libraries ship types: `@types/diff`, `@types/dompurify`, `@types/react-virtualized-auto-sizer`; review `@types/node-cache`, `@types/bcryptjs`, `@types/react-window*`.

Breaking-change backlog for v22: React 19 + React Compiler readiness, Vite 8, Express 5, Zod 4, TypeScript 6, React Router 7, Recharts 3, Framer Motion 12, Leaflet React 5, multer 2, date-fns 4. Run these in an upgrade branch with visual regression, route tests, type budget, and bundle diff.

SSR/RSC/Next.js: there is no current Next.js app. If moving to Next.js, treat it as a platform migration, not a dependency upgrade. First extract API contracts, then move route-by-route. Server Actions are suitable only for authenticated internal workflows, not public evidence reads. Edge runtime is suitable for static metadata/search suggestions only; DB-heavy graph/search endpoints should stay Node.

Worker extraction: move OCR, AI enrichment, thumbnailing, media extraction, graph relation extraction, embeddings, and exports out of the API process. Use durable queue semantics, idempotency keys, stage input/output hashes, dead-letter queues, and explicit concurrency limits.

## Phased Roadmap

Phase 0, 1 week: freeze schema, fix public annotation policy, bigint cast, audit fail-closed, deploy gates, cache namespace inventory. Rollback checkpoint: tag current v21.4 and archive schema hash.

Phase 1, 2-3 weeks: AI artifacts migration, provenance event chain, export integrity tests, document search keyset API, generated FTS for media/articles/investigations. Canary: 5% read traffic or internal-only beta.

Phase 2, 3-5 weeks: frontend shell extraction, typed hooks, unified DTOs, accessibility gates, graph scoring contract, cache service with metrics. Rollback: route-level feature flags.

Phase 3, 6-10 weeks: queue redesign, distributed cache/Redis adapter, OpenTelemetry, backup/restore drills, immutable artifact deployment, load test harness with 1M+ fixtures.

Long-term platform strategy: treat this as an evidentiary archive, not a CRUD app. The stable core should be immutable documents, provenance events, normalized entities, reviewed relationships, citations, and artifacts. Everything probabilistic, generated, enriched, inferred, or user-submitted must be a separately versioned artifact with source anchors and review state.
