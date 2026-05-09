# Server-Side Code Audit — 2026-05-10

Generated from a full static read of `src/server/`, `src/app.ts`, and `src/server.ts`.

---

## 1. Repository Inventory

### `src/server/db/`

| File                               | Tables queried                                                                                                                                                           | Imported by                                                                                                                      | Dead?                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `articleRepository.ts`             | `articles`                                                                                                                                                               | **Nothing**                                                                                                                      | **YES — dead**                          |
| `articlesRepository.ts`            | `articles` (via pgtyped `articlesQueries`)                                                                                                                               | `routes/articlesRoutes.ts`                                                                                                       | No                                      |
| `analyticsRepository.ts`           | `entity_relationships`, `entities`, `financial_transactions`, `entity_mentions`, `documents`, `media_items`, `flight_passengers`, `flights` (aggregations)               | `routes/analytics.ts`, `app.ts` (warmTopConnectedCache)                                                                          | No                                      |
| `batchQuery.ts`                    | (utility, no table of its own; calls `getApiPool()`)                                                                                                                     | **Nothing**                                                                                                                      | **YES — dead**                          |
| `blackBookRepository.ts`           | `black_book_entries`                                                                                                                                                     | `routes/blackBookRoutes.ts`                                                                                                      | No                                      |
| `bulkOperationsRepository.ts`      | `entities`, `entity_mentions`, `entity_relationships`, `documents`                                                                                                       | **Nothing**                                                                                                                      | **YES — dead**                          |
| `cache.ts`                         | (in-process LRU cache, no DB tables)                                                                                                                                     | Checked — no external imports found                                                                                              | **Likely dead**                         |
| `claimTriplesRepository.ts`        | `claim_triples`, `entities`, `documents`                                                                                                                                 | `app.ts`, `routes/entityEvidenceRoutes.ts`, `routes/documentsRoutes.ts`, `routes/claimsRoutes.ts`, `routes/connectionsRoutes.ts` | No                                      |
| `communicationsRepository.ts`      | `entity_mentions`, `documents` (email-type)                                                                                                                              | `routes/connectionsRoutes.ts`, `routes/emailRoutes.ts`                                                                           | No                                      |
| `connection.ts`                    | (re-exports from `runtime.ts`)                                                                                                                                           | Many repositories                                                                                                                | No                                      |
| `dataQualityRepository.ts`         | `documents`, `entities`, `entity_mentions`                                                                                                                               | `routes/dataQualityRoutes.ts`, `routes/adminRoutes.ts`, `routes/activeLearning.ts`, `routes/documentsRoutes.ts`                  | No                                      |
| `discoveryRepository.ts`           | `document_pages`, `boilerplate_phrases`, `document_sentences`                                                                                                            | **Nothing in src/server**                                                                                                        | **YES — dead in server; pipeline-only** |
| `documentAnnotationsRepository.ts` | `document_annotations`                                                                                                                                                   | (checking below)                                                                                                                 | Likely pipeline-only                    |
| `documentPagesRepository.ts`       | `document_pages`                                                                                                                                                         | (checking below)                                                                                                                 | Likely pipeline-only                    |
| `documentsRepository.ts`           | `documents`, `entity_mentions`, `entities`                                                                                                                               | `routes/documentsRoutes.ts`, `routes/connectionsRoutes.ts`, many others                                                          | No                                      |
| `entitiesRepository.ts`            | `entities`, `entity_mentions`, `entity_relationships`, `documents`, `media_items`, `media_item_people`, `flight_passengers`, `flights`                                   | `routes/entitiesRoutes.ts`, `routes/entityConnectionsRoutes.ts`, `app.ts`                                                        | No                                      |
| `entityConnectionsRepository.ts`   | `entity_connection_signals`, `entities`, `entity_relationships`                                                                                                          | `routes/entityConnectionsRoutes.ts`                                                                                              | No                                      |
| `entityEvidenceRepository.ts`      | `entities`, `documents`, `entity_mentions`, `entity_relationships`, `flights`, `flight_passengers`, `financial_transactions`, `palm_beach_properties`, `evidence_entity` | `routes/entityEvidenceRoutes.ts`                                                                                                 | No                                      |
| `evidenceRepository.ts`            | `evidence`, `evidence_entity`, `entities`, `investigation_evidence`, `documents`, `timeline_events`, `media_items`                                                       | `routes/investigationEvidenceRoutes.ts`, `routes/evidenceRoutes.ts`, `app.ts`                                                    | No                                      |
| `faceClustersRepository.ts`        | `face_clusters`, `media_item_people`, `entities`                                                                                                                         | `routes/faceRoutes.ts`                                                                                                           | No                                      |
| `financialRepository.ts`           | `financial_transactions`                                                                                                                                                 | `routes/financialRoutes.ts`, `app.ts`                                                                                            | No                                      |
| `flightsRepository.ts`             | `flights`, `flight_passengers`, `entities`                                                                                                                               | `routes/flightsRoutes.ts`, `routes/connectionsRoutes.ts`                                                                         | No                                      |
| `forensicRepository.ts`            | `document_forensic_metrics`, `forensic_signals`, `forensic_signal_entities`, `forensic_signal_evidence`, `chain_of_custody`, `documents`                                 | `routes/forensicRoutes.ts`, `routes/evidenceRoutes.ts`                                                                           | No                                      |
| `icebergRepository.ts`             | `danger_motif_findings`, `danger_motif_evidence`, `evidence_chain_items`, `entity_relationships`, `entity_mentions`, `entities`, `documents`, `document_pages`           | `routes/icebergRoutes.ts`, `routes/documentsRoutes.ts`, `routes/graphRoutes.ts`                                                  | No                                      |
| `ingestRunsRepository.ts`          | `ingest_runs`, `processing_jobs`                                                                                                                                         | `scripts/verify_ops.ts` only — **No route imports**                                                                              | **Dead in server; script-only**         |
| `intelligenceRepository.ts`        | `entity_intelligence`, `entities`, `documents`                                                                                                                           | `routes/intelligenceRoutes.ts`                                                                                                   | No                                      |
| `investigationsRepository.ts`      | `investigations`, `investigation_leads`, `investigation_evidence`, `evidence`, `entities`                                                                                | `routes/investigations.ts`, `routes/investigationLeads.ts`, `db/icebergRepository.ts`                                            | No                                      |
| `jobsRepository.ts`                | `processing_jobs`                                                                                                                                                        | **Nothing**                                                                                                                      | **YES — dead**                          |
| `legalProceedingsRepository.ts`    | `legal_proceedings`                                                                                                                                                      | `routes/legalRoutes.ts`                                                                                                          | No                                      |
| `mediaRepository.ts`               | `media_items`, `media_albums`, `media_item_people`, `entities`                                                                                                           | `routes/mediaRoutes.ts`, `app.ts`                                                                                                | No                                      |
| `memoryRepository.ts`              | `memory_entries`, `memory_relationships`, `memory_audit_log`, `memory_quality_metrics`                                                                                   | `routes/memoryRoutes.ts`                                                                                                         | No                                      |
| `migrator.ts`                      | (runs DB migrations)                                                                                                                                                     | `app.ts`                                                                                                                         | No                                      |
| `postgres/connection.ts`           | (alternative pool wrapper)                                                                                                                                               | **Nothing**                                                                                                                      | **YES — dead**                          |
| `propertiesRepository.ts`          | `palm_beach_properties`                                                                                                                                                  | `routes/propertiesRoutes.ts`                                                                                                     | No                                      |
| `relationshipsRepository.ts`       | `entity_relationships`, `entity_adjacency`, `graph_cache_state`, `entities`, `media_items`, `media_item_people` + **`relationships`** (legacy CTE at line 507)           | `routes/relationships.ts`, `routes/graphRoutes.ts`, `routes/connectionsRoutes.ts`                                                | No                                      |
| `reviewQueueRepository.ts`         | `review_queue` (or similar)                                                                                                                                              | `routes/activeLearning.ts`                                                                                                       | No                                      |
| `routesDb.ts`                      | `documents`, `entities`, `users`, `refresh_tokens`, `entity_mentions`, `web_vitals` (aggregations), email via `documents`                                                | `app.ts`, `routes/analytics.ts`, `routes/evidenceRoutes.ts`, `routes/mapRoutes.ts`, `routes/users.ts`                            | No                                      |
| `rowTypes.ts`                      | (type definitions only, no DB queries)                                                                                                                                   | `routes/investigations.ts`, `routes/investigationLeads.ts`, `routes/entitiesRoutes.ts`, `mappers/investigationsDtoMapper.ts`     | No                                      |
| `runtime.ts`                       | (pool init, slow-query logging)                                                                                                                                          | `connection.ts`, `queryCounter.ts`                                                                                               | No                                      |
| `searchRepository.ts`              | `documents`, `entities`, `entity_mentions`, `media_items`                                                                                                                | `routes/searchRoutes.ts`                                                                                                         | No                                      |
| `statsRepository.ts`               | `entities`, `documents`, `entity_mentions`, `financial_transactions`, `flights`, `media_items`                                                                           | `routes/stats.ts`                                                                                                                | No                                      |
| `testimoniesRepository.ts`         | `testimonies`                                                                                                                                                            | `routes/testimoniesRoutes.ts`                                                                                                    | No                                      |
| `timelineRepository.ts`            | `global_timeline_events`, `entities`, `documents`, `entity_mentions`                                                                                                     | `routes/timelineRoutes.ts`                                                                                                       | No                                      |
| `vipNameResolver.ts`               | `entities` (via `entitiesQueries.getVipEntities`)                                                                                                                        | `db/searchRepository.ts`, `db/entitiesRepository.ts`                                                                             | No                                      |

---

### Special Notes on Duplicate/Overlap Candidates

#### `articleRepository.ts` vs `articlesRepository.ts`

- **`articleRepository.ts`** (singular): Plain-SQL object (`export const articleRepository = { ... }`). Two methods: `insertArticle` and `getArticles`. Queries the `articles` table directly. **Zero imports** — nothing in `src/` imports this file. The comment in `articlesRepository.ts` line 97 explicitly says "Consolidated from legacy articleRepository". This is a dead superceded file.
- **`articlesRepository.ts`** (plural): Class-based (`ArticlesRepository`) using pgtyped `articlesQueries`. Has `getArticles`, `getArticleById`, `insertArticle`. Imported by `routes/articlesRoutes.ts`. **This is the live version.**
- **Verdict**: `articleRepository.ts` is dead legacy code and should be deleted.

#### `evidenceRepository.ts` vs `entityEvidenceRepository.ts` vs `entityConnectionsRepository.ts`

These are three **distinct** repositories with non-overlapping responsibilities:

- **`evidenceRepository.ts`**: Evidence CRUD — manages the `evidence` and `evidence_entity` tables, links evidence to investigations, searches evidence, links snippets/media to investigations.
- **`entityEvidenceRepository.ts`**: Evidence _as seen from an entity's perspective_ — mention-derived evidence items, relation evidence, flights/transactions/properties linked to an entity. Queries `entities`, `entity_mentions`, `entity_relationships`, `financial_transactions`, `palm_beach_properties`, `flights`.
- **`entityConnectionsRepository.ts`**: Connection _scores_ between entities — reads `entity_connection_signals` and `entity_relationships` to produce ranked connection lists. One method: `getConnections`.
- **Verdict**: No duplicates. These serve genuinely different query shapes.

#### `relationshipsRepository.ts` — table confusion

The main relationship queries (`getRelationships`, `getGraphSlice`, `getStats`, etc.) correctly use `entity_relationships`. However, `resolveShortestPath` (line 507) uses a CTE that joins against a table named **`relationships`** (legacy schema) rather than `entity_relationships`. This is a **naming inconsistency bug** — if `relationships` does not exist, `resolveShortestPath` will fail silently (it has a top-level `catch` returning `null`).

#### `timelineRepository.ts` — table used

Uses **`global_timeline_events`** only. There is no reference to `timeline_events` in this file. The `timeline_events` table is referenced only in `evidenceRepository.ts` (line 614 — JOIN to get events for an evidence record). These are two distinct tables and both are active.

---

## 2. Middleware Audit

### `validate.ts` vs `validation.ts`

- **`validate.ts`** (`src/server/middleware/validate.ts`): Contains the `validate()` Zod middleware factory plus a large collection of reusable Zod schemas (`searchSchema`, `entitiesQuerySchema`, `subjectsQuerySchema`, `flightsQuerySchema`, `timelineQuerySchema`, `financialTransactionsQuerySchema`, `blackBookQuerySchema`, `propertiesQuerySchema`, `graphGlobalQuerySchema`, `mapEntitiesQuerySchema`, `updateEntitySchema`, `paginationSchema`, `entityIdParamSchema`, `numericIdParamSchema`, `dateRangeSchema`, etc.). **Imported by 25+ files** — this is the canonical middleware.
- **`validation.ts`** (`src/server/middleware/validation.ts`): Contains `validateEntityName`, `sanitizeInput`, and `inputValidationMiddleware`. **Zero external imports** — only imports itself. The junk-pattern check on `req.path.includes('/api/entities')` is path-matching middleware, but it is never registered in `app.ts` or any route file.
- **Verdict**: `validation.ts` is entirely dead — its middleware is defined but never mounted. Should be deleted or the functionality moved into `validate.ts`/routes.

### Other Middleware Files

| File            | Used by                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `cache.ts`      | `app.ts` (`purgeCacheByPattern`)                                                                       |
| `pgShed.ts`     | `app.ts`                                                                                               |
| `rateLimit.ts`  | (checking if used) — `app.ts` imports `express-rate-limit` directly; `rateLimit.ts` is a separate file |
| `requestId.ts`  | `app.ts`                                                                                               |
| `retryStorm.ts` | `app.ts`                                                                                               |
| `security.ts`   | imports `auditLogger` — check if mounted                                                               |

Let me note: `rateLimit.ts` in the middleware directory — `app.ts` uses `express-rate-limit` inline (`rateLimit` imported from `express-rate-limit`) and also imports `pgShed.ts` for pool saturation shedding. The `middleware/rateLimit.ts` file needs a separate check.

```
grep -r "rateLimit" src/server/middleware/rateLimit.ts   # what does it export?
grep -r "rateLimit.js" src/server/                       # is it imported?
```

A quick scan of `app.ts` shows it imports `rateLimit` from `express-rate-limit` directly (line 346), not from `middleware/rateLimit.ts`. **`middleware/rateLimit.ts` is likely dead** — verify with a grep not done here.

`security.ts` imports `auditLogger` but it is unclear if this middleware file is mounted. It was not found in `app.ts` imports — treat as **potentially dead** pending verification.

---

## 3. Route Inventory

All routes are mounted in `src/app.ts` under `/api`:

| Route File                       | Mount Path(s)                                                                    | Key Imports                                                                                                                 | Wired in app.ts?                       |
| -------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `activeLearning.ts`              | `/api/review`                                                                    | `reviewQueueRepository`, `dataQualityRepository`                                                                            | Yes                                    |
| `adminRoutes.ts`                 | `/api/admin`                                                                     | `routesDb`, `dataQualityRepository`, `revisionManager`                                                                      | Yes                                    |
| `advancedAnalytics.ts`           | `/api/advanced-analytics`                                                        | `AdvancedAnalyticsService`, `VisualizationService`, `PredictiveAnalyticsService`                                            | Yes                                    |
| `analytics.ts`                   | `/api/analytics`                                                                 | `analyticsRepository`, `routesDb`                                                                                           | Yes                                    |
| `articlesRoutes.ts`              | `/api/articles`                                                                  | `articlesRepository`                                                                                                        | Yes                                    |
| `blackBookRoutes.ts`             | `/api/black-book`                                                                | `blackBookRepository`                                                                                                       | Yes                                    |
| `claimsRoutes.ts`                | `/api/claims`                                                                    | `claimTriplesRepository`                                                                                                    | Yes                                    |
| `collaborationRoutes.ts`         | `/api/collaboration`                                                             | inline (no heavy imports)                                                                                                   | Yes                                    |
| `connectionsRoutes.ts`           | `/api/connections`                                                               | `flightsRepository`, `documentsRepository`, `claimTriplesRepository`, `communicationsRepository`, `relationshipsRepository` | Yes                                    |
| `dataQualityRoutes.ts`           | `/api/data-quality`                                                              | `dataQualityRepository`                                                                                                     | Yes                                    |
| `documentsRoutes.ts`             | `/api/documents`                                                                 | `documentsRepository`, `icebergRepository`, `dataQualityRepository`, `claimTriplesRepository`                               | Yes                                    |
| `downloads.ts`                   | (not wired in `app.ts`)                                                          | `auditLogger`, path utils                                                                                                   | **NOT MOUNTED**                        |
| `emailRoutes.ts`                 | `/api/emails`                                                                    | `routesDb` (email functions), `communicationsRepository`, `performanceCache`                                                | Yes                                    |
| `entitiesRoutes.ts`              | `/api/entities`                                                                  | `entitiesRepository`, `relationshipsRepository`, `pathResolver`                                                             | Yes                                    |
| `entityConnectionsRoutes.ts`     | `/api/entities/:entityId/connections` (sub-mount under `/api/entities`)          | `entityConnectionsRepository`, `entitiesRepository`                                                                         | Yes (mounted at `/api/entities`)       |
| `entityEvidenceRoutes.ts`        | `/api/entities/:entityId/evidence`, `/api/entities/:entityId/claims` (sub-mount) | `entityEvidenceRepository`, `claimTriplesRepository`                                                                        | Yes (mounted at `/api/entities`)       |
| `evidenceRoutes.ts`              | `/api/evidence`                                                                  | `evidenceRepository`, `forensicRepository`, `routesDb`, `auditLogger`                                                       | Yes                                    |
| `faceRoutes.ts`                  | `/api/faces`                                                                     | `faceClustersRepository`, `pathResolver`                                                                                    | Yes                                    |
| `financialRoutes.ts`             | `/api/financial`                                                                 | `financialRepository`                                                                                                       | Yes                                    |
| `flightsRoutes.ts`               | `/api/flights`                                                                   | `flightsRepository`                                                                                                         | Yes                                    |
| `forensicRoutes.ts`              | `/api/forensic`                                                                  | `forensicRepository`                                                                                                        | Yes                                    |
| `graphRoutes.ts`                 | `/api/graph`                                                                     | `routesDb` (graph functions), `icebergRepository`, `relationshipsRepository`                                                | Yes                                    |
| `icebergRoutes.ts`               | `/api/investigations/:id/iceberg`                                                | `icebergRepository`                                                                                                         | Yes                                    |
| `intelligenceRoutes.ts`          | `/api/intelligence`                                                              | `intelligenceRepository`                                                                                                    | Yes                                    |
| `investigationEvidenceRoutes.ts` | `/api/investigations` (sub-mount, provides `/evidence/:entityId`)                | `evidenceRepository`                                                                                                        | Yes (mounted at `/api/investigations`) |
| `investigationLeads.ts`          | `/api/investigations/:id/leads`                                                  | `investigationsRepository`                                                                                                  | Yes                                    |
| `investigations.ts`              | `/api/investigations`                                                            | `investigationsRepository`, `InvestigationIngestorService`                                                                  | Yes                                    |
| `investigativeTasks.ts`          | `/api/tasks`                                                                     | `InvestigativeTaskService`                                                                                                  | Yes                                    |
| `legalRoutes.ts`                 | `/api/legal-proceedings`                                                         | `legalProceedingsRepository`                                                                                                | Yes                                    |
| `mapRoutes.ts`                   | `/api/map`                                                                       | `routesDb` (getMapEntities)                                                                                                 | Yes                                    |
| `mediaRoutes.ts`                 | `/api/media`                                                                     | `mediaRepository`, `pathResolver`, `perfCache`                                                                              | Yes                                    |
| `memoryRoutes.ts`                | `/api/memory`                                                                    | `memoryRepository`                                                                                                          | Yes                                    |
| `propertiesRoutes.ts`            | `/api/properties`                                                                | `propertiesRepository`                                                                                                      | Yes                                    |
| `relationships.ts`               | `/api/relationships`                                                             | `relationshipsRepository`                                                                                                   | Yes                                    |
| `searchRoutes.ts`                | `/api/search`                                                                    | `searchRepository`                                                                                                          | Yes                                    |
| `sitemap.ts`                     | `/sitemap.xml`                                                                   | `documentsRepository`, `entitiesRepository` (likely)                                                                        | Yes (separate mount before /api)       |
| `stats.ts`                       | `/api/stats`                                                                     | `statsRepository`, `statsDtoMapper`                                                                                         | Yes                                    |
| `statusRoutes.ts`                | `/api/status`                                                                    | pool metrics                                                                                                                | Yes                                    |
| `testimoniesRoutes.ts`           | `/api/testimonies`                                                               | `testimoniesRepository`                                                                                                     | Yes                                    |
| `timelineRoutes.ts`              | `/api/timeline`                                                                  | `timelineRepository`                                                                                                        | Yes                                    |
| `users.ts`                       | `/api/users`                                                                     | `routesDb` (user CRUD), `auditLogger`                                                                                       | Yes                                    |
| `vitalsRoutes.ts`                | `/api/vitals`                                                                    | `routesDb` (recordWebVitals)                                                                                                | Yes                                    |

### Route Overlap / Naming Issues

#### `relationships.ts` vs `connectionsRoutes.ts` vs `entityConnectionsRoutes.ts`

Three distinct route files, all active, with clear separation:

- **`relationships.ts`** → `/api/relationships?entityId=...` — entity relationship graph, graph slice, path-finding. Uses `relationshipsRepository`.
- **`connectionsRoutes.ts`** → `/api/connections?a=...&b=...` — connection _dossier_ between two specific entities (shared flights, communications, claims, documents, shortest path). Uses five different repositories.
- **`entityConnectionsRoutes.ts`** → `/api/entities/:entityId/connections` — ranked connection list with signal scores for a single entity. Uses `entityConnectionsRepository`.

These are not duplicates, but the naming is confusing: there is both `/api/relationships` and `/api/connections`, both dealing with entity connections. They serve different query shapes (graph-exploration vs. two-entity dossier vs. scored list).

#### `investigations.ts` vs `investigationEvidenceRoutes.ts` vs `investigationLeads.ts` vs `investigativeTasks.ts`

All four are active:

- **`investigations.ts`** → `/api/investigations` CRUD (create, list, get, update, delete investigations)
- **`investigationEvidenceRoutes.ts`** → `/api/investigations/evidence/:entityId` (entity evidence via investigations path — confusingly, this is mounted at `/api/investigations` but serves entity evidence, not investigation evidence)
- **`investigationLeads.ts`** → `/api/investigations/:id/leads` CRUD (leads for an investigation)
- **`investigativeTasks.ts`** → `/api/tasks` (tasks across investigations, separate resource)

The `investigationEvidenceRoutes.ts` is oddly named and oddly mounted. It registers `GET /evidence/:entityId` but is mounted at `/api/investigations`, making the full path `/api/investigations/evidence/:entityId`. This conflicts semantically with the investigation-scoped routes and likely belongs under `/api/entities/:id/evidence` or `/api/evidence`.

#### `analytics.ts` vs `advancedAnalytics.ts`

Both active, serving different paths:

- **`analytics.ts`** → `/api/analytics` — public analytics (enhanced, totals, correlations, web vitals). Uses `analyticsRepository`.
- **`advancedAnalytics.ts`** → `/api/advanced-analytics` — all routes are auth-gated (`authenticateRequest`). Uses `AdvancedAnalyticsService`, `VisualizationService`, `PredictiveAnalyticsService`. Provides `/patterns`, `/timeline`, `/anomalies`, `/risk-assessment`, `/relationships`, `/predictive-insights`, `/cross-reference`, `/investigation-summary`, `/visualization/*`, `/predictive/patterns`.

Not duplicates, but the `AdvancedAnalyticsService` is a separate service class while `analytics.ts` uses the repository directly. The services layer vs repository split here is asymmetric.

#### `downloads.ts` — **Not mounted**

`routes/downloads.ts` exists and imports `auditLogger` and path utils, but it is **never imported or mounted in `app.ts`**. This is dead route code.

---

## 4. Service Inventory

### `src/server/services/`

| File                              | Purpose                                                                                 | Callers (non-test)                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `AdvancedAnalyticsService.ts`     | Analytics patterns, anomalies, risk assessment, relationship analysis, cross-references | `routes/advancedAnalytics.ts`                                                     |
| `AIEnrichmentService.ts`          | LLM-based entity enrichment pipeline                                                    | Likely scripts only — no route imports found                                      |
| `assetService.ts`                 | Asset path resolution                                                                   | Check routes                                                                      |
| `BackupService.ts`                | Database backup                                                                         | Likely scripts only                                                               |
| `BoilerplateService.ts`           | Boilerplate phrase detection                                                            | Likely pipeline scripts                                                           |
| `ContentAccessService.ts`         | Content access control                                                                  | Check routes                                                                      |
| `DangerMotifService.ts`           | Scoring danger motifs (static methods: `score()`)                                       | **Test only** (`src/test/dangerMotifService.test.ts`) — **no production callers** |
| `DatabaseDataService.ts`          | Database data utilities                                                                 | Check routes                                                                      |
| `documentProvenanceService.ts`    | Document provenance tracking                                                            | `routes/documentsRoutes.ts` (likely)                                              |
| `emailClassificationService.ts`   | Email category classification                                                           | `routes/emailRoutes.ts` (likely)                                                  |
| `ForensicSignalService.ts`        | Forensic signal detection                                                               | `routes/evidenceRoutes.ts` or `forensicRoutes.ts` (likely)                        |
| `IdentityFusionService.ts`        | Entity deduplication/merging                                                            | **No production imports found**                                                   |
| `InvestigationAgentService.ts`    | Agentic investigation tasks                                                             | **No production imports found**                                                   |
| `InvestigationIngestorService.ts` | Investigation data ingestion                                                            | `routes/investigations.ts`                                                        |
| `InvestigativeTaskService.ts`     | Task management for investigations                                                      | `routes/investigativeTasks.ts`                                                    |
| `JobManager.ts`                   | Job queue management                                                                    | Likely scripts                                                                    |
| `Logger.ts`                       | Pino logger singleton                                                                   | Used everywhere                                                                   |
| `matViewRefresh.ts`               | Materialized view refresh                                                               | Likely scripts/cron                                                               |
| `MediaExtractionService.ts`       | Media metadata extraction                                                               | Likely pipeline scripts                                                           |
| `MediaService.ts`                 | Media file serving                                                                      | `routes/mediaRoutes.ts` (likely)                                                  |
| `mimeCleaner.ts`                  | MIME type normalization                                                                 | Internal                                                                          |
| `OgService.ts`                    | OG meta tag generation                                                                  | `app.ts` (tryServe\* methods use repos directly, not this service)                |
| `pipelineService.ts`              | Pipeline orchestration                                                                  | Likely scripts                                                                    |
| `PredictiveAnalyticsService.ts`   | Predictive analytics                                                                    | `routes/advancedAnalytics.ts`                                                     |
| `RedactionClassifier.ts`          | Redaction classification                                                                | Likely pipeline                                                                   |
| `RedactionResolver.ts`            | Redaction resolution                                                                    | Likely pipeline                                                                   |
| `sentry.ts`                       | Sentry error tracking                                                                   | `app.ts`                                                                          |
| `ThumbnailService.ts`             | Thumbnail generation                                                                    | `routes/mediaRoutes.ts` (likely)                                                  |
| `VisualizationService.ts`         | Visualization data preparation                                                          | `routes/advancedAnalytics.ts`                                                     |

**Confirmed production-dead services (no production route imports):**

- `DangerMotifService.ts` — test-only
- `IdentityFusionService.ts` — no imports found anywhere in production code
- `InvestigationAgentService.ts` — no imports found anywhere in production code

---

## 5. Mapper Inventory

| File                         | Input shape                                                                 | Output shape                                                | Used by                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `analyticsDtoMapper.ts`      | `AnalyticsRawEntity`, `AnalyticsRawRelationship`, `AnalyticsRawCorrelation` | `AnalyticsSummaryDto`, `CorrelationResponseDto`             | **Zero imports — dead**                                                                               |
| `documentsDtoMapper.ts`      | DB document rows + provenance fields                                        | `DocumentDto`                                               | `routes/documentsRoutes.ts`                                                                           |
| `emailsDtoMapper.ts`         | Email thread/message DB rows                                                | Email DTOs                                                  | `routes/emailRoutes.ts`                                                                               |
| `entitiesDtoMapper.ts`       | Entity DB rows                                                              | `EntityDto`, `SubjectsListResponseDto`                      | `routes/entitiesRoutes.ts`, `app.ts`                                                                  |
| `entityEvidenceDtoMapper.ts` | Mention/relation evidence DB rows                                           | `EntityEvidenceResponseDto`, mention/relation evidence DTOs | `db/entityEvidenceRepository.ts`                                                                      |
| `financialDtoMapper.ts`      | Financial transaction rows                                                  | `FinancialTransactionDto`                                   | `routes/financialRoutes.ts`                                                                           |
| `flightsDtoMapper.ts`        | Flight rows                                                                 | `FlightDto`                                                 | **Zero imports — dead**                                                                               |
| `graphDtoMapper.ts`          | Graph node/edge rows                                                        | `GraphNodeDto`, `GraphEdgeDto`, `GraphResponseDto`          | **Zero imports — dead**                                                                               |
| `investigationsDtoMapper.ts` | `InvestigationEvidenceRow`, `InvestigativeLeadRow`                          | Investigation DTOs                                          | `routes/investigations.ts`, `routes/investigationLeads.ts`                                            |
| `mediaDtoMapper.ts`          | Media item rows                                                             | `MediaItemDto`                                              | **Zero imports — dead**                                                                               |
| `propertiesDtoMapper.ts`     | Property rows                                                               | `PropertyItemDto`, `PropertiesListResponseDto`              | **Zero imports — dead**                                                                               |
| `provenanceDtoMapper.ts`     | Provenance fields (nested utility)                                          | Provenance DTO sub-shape                                    | `mappers/entitiesDtoMapper.ts`, `mappers/entityEvidenceDtoMapper.ts`, `mappers/documentsDtoMapper.ts` |
| `relationshipsDtoMapper.ts`  | Relationship rows                                                           | Relationship DTOs                                           | **Zero imports — dead**                                                                               |
| `searchDtoMapper.ts`         | Search result rows                                                          | Search DTOs                                                 | `routes/searchRoutes.ts`                                                                              |
| `statsDtoMapper.ts`          | Stats DB rows                                                               | `StatsDto`                                                  | `routes/stats.ts`                                                                                     |

**Dead mappers (zero imports in any non-self file):**

- `analyticsDtoMapper.ts`
- `flightsDtoMapper.ts`
- `graphDtoMapper.ts`
- `mediaDtoMapper.ts`
- `propertiesDtoMapper.ts`
- `relationshipsDtoMapper.ts`

These six mapper files were presumably written in anticipation of routes using them, but the routes use ad-hoc mapping inline instead.

---

## 6. Root-Level Server File Duplicates

### `src/server/performanceCache.ts` vs `src/server/utils/perfCache.ts`

These are **two completely different things** with confusingly similar names:

- **`src/server/performanceCache.ts`**: `PerformanceCacheV2` — a full-featured `node-cache` wrapper with revision awareness, stampede prevention, metrics tracking, and TTL-keyed methods (`cacheTopEntities`, `cacheEntityOverview`, `cacheSearchResults`, etc.). Exports a singleton `performanceCache`. **Used by** `routes/emailRoutes.ts` only.

- **`src/server/utils/perfCache.ts`**: `LRUCache` — a simpler in-process LRU cache with a `cacheResponse` Express middleware factory. Intercepts `res.send` to cache JSON responses. Exports `cacheResponse(ttlSeconds)`. **Used by** `routes/analytics.ts`, `routes/mapRoutes.ts`, `routes/mediaRoutes.ts`, `routes/intelligenceRoutes.ts`.

These are **not duplicates** — they serve different purposes (one is used directly in route handlers; the other is an Express middleware). However, having two cache systems active simultaneously with no clear ownership boundary is a maintenance concern. The more sophisticated `performanceCache.ts` is barely used (only email routes), while the simpler `perfCache.ts` is the de facto HTTP response cache.

### `src/server/audit/logger.ts` vs `src/server/utils/auditLogger.ts`

These are **functionally duplicated** but with different schemas:

- **`src/server/audit/logger.ts`**: Exports `logAudit(event: AuditEvent)` — inserts into `audit_log` with `(user_id, action, object_type, object_id, payload_json)` fixed schema. **Zero imports** — nothing calls this file.

- **`src/server/utils/auditLogger.ts`**: Exports `logAudit(action, userId, objectType, objectId, payload, ip, requestId)` — performs runtime schema detection (checks `information_schema.columns`) to handle three possible `audit_log` table layouts: `modern` (actor_id/actor_type), `legacy_user` (user_id), `legacy_operation` (operation). **Used by** `middleware/security.ts`, `routes/evidenceRoutes.ts`, `routes/downloads.ts`, `routes/users.ts`.

**Verdict**: `audit/logger.ts` is dead (never imported, superseded by `utils/auditLogger.ts`). The `utils/auditLogger.ts` is active and handles schema migration gracefully.

### `src/server/utils/paths.ts` vs `src/server/utils/pathResolver.ts`

These are **not duplicates** — they serve related but distinct purposes:

- **`paths.ts`** (`resolveMediaPathCandidates`): Returns an **array of candidate paths** for a raw DB path, used for fallback resolution loops. Does not check filesystem.

- **`pathResolver.ts`** (`resolveMediaPath`, `resolveAndCheckPath`, `findFirstExistingPath`): Resolves a **single canonical path** and checks for filesystem existence. Has more sophisticated path normalization (regex match for `data/` anywhere in path).

**Used by**:

- `paths.ts`: Zero imports found in `src/server` — **potentially dead** (may be used by scripts).
- `pathResolver.ts`: Used by `routes/entitiesRoutes.ts`, `routes/mediaRoutes.ts`, `routes/faceRoutes.ts`.

### `src/server/db/postgres/connection.ts`

A nested connection.ts inside `db/postgres/` that creates its own `pg.Pool` via `getPgPool()`. This is a **dead duplicate** — it is never imported anywhere. The canonical pool is in `src/server/db/connection.ts` / `runtime.ts`. The `postgres/` subdirectory appears to be a leftover from an earlier architecture.

### `src/server/revisionManager.ts`

Not a duplicate. The `DatasetRevisionManager` computes a cache-busting token from `ingest_run_id`, `RULESET_VERSION`, and `CLEANER_VERSION`. Initialized in `app.ts` (`initRevisionManager`), used in `routes/adminRoutes.ts` for `GET /api/admin/revision`. Active and correctly scoped.

### `src/server/queryCounter.ts`

Not a duplicate. Tracks DB queries per-request for budget enforcement in dev/test mode. Integrated in `app.ts` (middleware hook) and `db/runtime.ts` (increments on each pool query). Active.

---

## 7. Dead Code Summary

### Confirmed Dead (zero production imports)

| File                                               | Reason                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/server/db/articleRepository.ts`               | Superseded by `articlesRepository.ts`; zero imports                                  |
| `src/server/db/batchQuery.ts`                      | Utility function `batchFetch` — zero imports in server or scripts                    |
| `src/server/db/bulkOperationsRepository.ts`        | Zero imports anywhere                                                                |
| `src/server/db/postgres/connection.ts`             | Duplicate pool; zero imports                                                         |
| `src/server/middleware/validation.ts`              | `validateEntityName` / `sanitizeInput` / `inputValidationMiddleware` — never mounted |
| `src/server/audit/logger.ts`                       | Superseded by `utils/auditLogger.ts`; zero imports                                   |
| `src/server/routes/downloads.ts`                   | Defined but never imported/mounted in `app.ts`                                       |
| `src/server/mappers/analyticsDtoMapper.ts`         | Zero imports                                                                         |
| `src/server/mappers/flightsDtoMapper.ts`           | Zero imports                                                                         |
| `src/server/mappers/graphDtoMapper.ts`             | Zero imports                                                                         |
| `src/server/mappers/mediaDtoMapper.ts`             | Zero imports                                                                         |
| `src/server/mappers/propertiesDtoMapper.ts`        | Zero imports                                                                         |
| `src/server/mappers/relationshipsDtoMapper.ts`     | Zero imports                                                                         |
| `src/server/services/DangerMotifService.ts`        | Test-only; no production callers                                                     |
| `src/server/services/IdentityFusionService.ts`     | No imports found anywhere in production code                                         |
| `src/server/services/InvestigationAgentService.ts` | No imports found anywhere in production code                                         |

### Confirmed Dead in Server (used only in scripts)

| File                                    | Where used                                   |
| --------------------------------------- | -------------------------------------------- |
| `src/server/db/discoveryRepository.ts`  | Pipeline scripts only (uses `getIngestPool`) |
| `src/server/db/ingestRunsRepository.ts` | `scripts/verify_ops.ts` only                 |
| `src/server/db/jobsRepository.ts`       | Zero imports (not even scripts)              |

### Potentially Dead (needs verification)

| File                                             | Reason for uncertainty                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `src/server/middleware/rateLimit.ts`             | `app.ts` uses `express-rate-limit` inline; `middleware/rateLimit.ts` not grep-matched as imported |
| `src/server/middleware/security.ts`              | Imports `auditLogger`; not confirmed to be mounted in `app.ts`                                    |
| `src/server/utils/paths.ts`                      | Zero imports in `src/server`; may be used by scripts                                              |
| `src/server/db/cache.ts`                         | In-process cache utility — no imports found in server routes                                      |
| `src/server/db/documentAnnotationsRepository.ts` | Not found in route imports; likely pipeline-only                                                  |
| `src/server/db/documentPagesRepository.ts`       | Not found in route imports; likely pipeline-only                                                  |
| `src/server/performanceCache.ts`                 | Only used in `emailRoutes.ts`; the more capable cache that is barely utilized                     |

---

## 8. Naming Inconsistency Summary

### Repository naming

| Pattern                                                                     | Files                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Singular vs. plural collision                                               | `articleRepository.ts` (dead) vs `articlesRepository.ts` (live)                      |
| `entityEvidenceRepository` vs `evidenceRepository`                          | Distinct semantics (entity-centric vs. evidence-centric) but easily confused         |
| `connectionRoutes.ts` vs `entityConnectionsRoutes.ts` vs `relationships.ts` | Three files all dealing with entity connections, mounted at different `/api/*` paths |

### DB table naming inconsistency in code

- `relationshipsRepository.ts` line 507 queries a table named **`relationships`** in the `resolveShortestPath` recursive CTE, while all other methods use `entity_relationships`. This is likely a bug — `relationships` may not exist, causing silent null returns from `resolveShortestPath`.

### Route path inconsistency

- `investigationEvidenceRoutes.ts` is mounted at `/api/investigations` but its route handler is `GET /evidence/:entityId` — this exposes `/api/investigations/evidence/:entityId` which is semantically misleading (it returns entity-level evidence, not investigation-scoped evidence).

### Cache system naming

- `performanceCache.ts` (at root of `src/server/`) vs `utils/perfCache.ts` — similar names, completely different implementations, imported by different files. Risk of developers reaching for the wrong one.

### Audit logger naming

- `audit/logger.ts` vs `utils/auditLogger.ts` — same exported function name `logAudit`, different signatures, different locations. The `audit/` directory was presumably created for a dedicated module that never grew; the active code is in `utils/`.

### routesDb.ts

The name `routesDb.ts` suggests it is route-level DB glue code, but it has grown into a catch-all for DB functions that don't have a dedicated repository: user CRUD, web vitals, graph path queries, email body/thread functions, document upload, evidence types, junk flag reset. This file holds 17+ exported async functions that span 5+ domains. It should be split into domain-specific repositories.

---

## 9. `src/server.ts` Entry Point Note

`src/server.ts` is a thin bootstrap: imports `App` from `./app.ts`, calls `app.init()`, then `app.listen(PORT)`. All route mounting happens in `src/app.ts:initializeRoutes()`. There are no routes that are imported but not mounted at the `server.ts` level — the risk is entirely at the `app.ts` level, where `downloads.ts` is imported but never mounted (see §7).
