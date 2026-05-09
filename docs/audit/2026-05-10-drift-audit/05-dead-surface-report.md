# Dead Surface Report

All unused, abandoned, or superseded surfaces across database, server code, and frontend. Each item is confirmed dead by import analysis, row counts, or route registration checks.

---

## Section A: Dead Database Tables (0 rows, confirmed)

| Table                     | Row count | Last activity                 | Superseded by                                                    | Disposition                               |
| ------------------------- | --------- | ----------------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| `mentions`                | 0         | Never populated in production | `entity_mentions` (2.79M rows)                                   | Drop after verifying ingest pipeline      |
| `timeline_events`         | 0         | Never populated               | `global_timeline_events` (416 rows)                              | Drop                                      |
| `media_assets`            | 0         | Never populated               | Not needed — media_items reference file_assets directly via docs | Drop                                      |
| `evidence_entity`         | 0         | Never populated               | `entity_evidence_types` (110K rows)                              | Drop                                      |
| `resolution_candidates`   | 0         | Never populated               | Has FK to `mentions` (also 0 rows)                               | Drop (both together)                      |
| `entity_merge_candidates` | 0         | Never populated               | —                                                                | Drop or keep as planned pipeline table    |
| `document_collections`    | 0         | Never populated               | —                                                                | Needs human decision (feature cancelled?) |

---

## Section B: Near-Dead Database Tables (≤11 rows, nearly unused)

| Table            | Row count | Notes                                                                                       | Disposition                                                                   |
| ---------------- | --------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `evidence`       | 11        | Legacy evidence model; structurally duplicated by `documents`. FK web makes this HIGH risk. | Needs human decision                                                          |
| `hypotheses`     | 1         | Investigation hypothesis feature barely used                                                | Keep — likely being built out                                                 |
| `collections`    | 5         | Partner to `document_collections` (0 rows)                                                  | Needs human decision                                                          |
| `evidence_types` | 3         | Only 3 type categories defined                                                              | Keep — small lookup table, referenced by 110K rows in `entity_evidence_types` |

---

## Section C: Dead Server Repository Files

Confirmed by import analysis (zero references across all production code):

| File                                        | Why it's dead                                                                                                                              | Disposition             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `src/server/db/articleRepository.ts`        | Superseded by `articlesRepository.ts` (plural). Comment in newer file explicitly notes the old one.                                        | Delete                  |
| `src/server/db/batchQuery.ts`               | No imports found anywhere in production code.                                                                                              | Delete                  |
| `src/server/db/bulkOperationsRepository.ts` | No imports found.                                                                                                                          | Delete                  |
| `src/server/db/jobsRepository.ts`           | No imports found. `jobsRepository` appears as name but actual job functionality is in `JobManager.ts`.                                     | Delete after confirming |
| `src/server/db/postgres/connection.ts`      | Orphaned nested pool factory. `db/connection.ts` (parent) re-exports from `runtime.ts`, not from `postgres/connection.ts`. Never imported. | Delete                  |

---

## Section D: Dead Server Middleware Files

| File                                  | Why it's dead                                                                                                                                              | Disposition |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `src/server/middleware/validation.ts` | Defines `validateEntityName` and `sanitizeInput` but these functions are never imported anywhere in production. The canonical middleware is `validate.ts`. | Delete      |
| `src/server/audit/logger.ts`          | Zero imports across all production code. Superseded by `src/server/utils/auditLogger.ts`.                                                                  | Delete      |

---

## Section E: Dead / Unmounted Server Route Files

| File                             | Status                                                                                                                       | Evidence                                                                            | Disposition           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------- |
| `src/server/routes/downloads.ts` | Imported in `app.ts` but **never mounted** with `router.use(...)`. The route file exists but no paths from it are reachable. | Present in import list at top of `app.ts`, absent from all `router.use(...)` calls. | Mount it or delete it |

---

## Section F: Dead Server Mapper Files

These mapper files have zero imports anywhere in production server or route code:

| File                                           | Disposition                               |
| ---------------------------------------------- | ----------------------------------------- |
| `src/server/mappers/analyticsDtoMapper.ts`     | Dead — delete                             |
| `src/server/mappers/flightsDtoMapper.ts`       | Dead — flight routes use raw DB shape     |
| `src/server/mappers/graphDtoMapper.ts`         | Dead — graph routes handle mapping inline |
| `src/server/mappers/mediaDtoMapper.ts`         | Dead — media routes handle mapping inline |
| `src/server/mappers/propertiesDtoMapper.ts`    | Dead — properties routes use raw DB shape |
| `src/server/mappers/relationshipsDtoMapper.ts` | Dead — relationship routes handle inline  |

**Note:** Active mappers (used in production): `documentsDtoMapper.ts`, `emailsDtoMapper.ts`, `entitiesDtoMapper.ts`, `entityEvidenceDtoMapper.ts`, `financialDtoMapper.ts`, `investigationsDtoMapper.ts`, `provenanceDtoMapper.ts`, `searchDtoMapper.ts`, `statsDtoMapper.ts`.

---

## Section G: Dead Server Services

| File                                               | Why it's dead                                                                  | Disposition                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| `src/server/services/DangerMotifService.ts`        | Test-only callers. No production route or startup code imports it.             | Delete or confirm test-only |
| `src/server/services/IdentityFusionService.ts`     | No production imports. An entity resolution service that was speculative.      | Delete                      |
| `src/server/services/InvestigationAgentService.ts` | No production imports. AI investigation agent service that was never wired up. | Delete                      |

---

## Section H: Dead Frontend Components / Pages

| File                                               | Why it's dead                                                                           | Disposition |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| `src/client/components/BlackBookReview.tsx`        | Never imported in `App.tsx` or any page. `BlackBookViewer.tsx` is the active component. | Delete      |
| `src/client/pages/EvidencePage.tsx` (if it exists) | Re-exports the component already directly routed in App.tsx                             | Delete      |
| `src/client/pages/AdminPage.tsx` (if it exists)    | Re-exports component already directly routed                                            | Delete      |

---

## Section I: Dead Frontend Contexts

| Context                            | Why it's dead                                                                                                                                                           | Disposition                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `MemoryContext` / `MemoryProvider` | `MemoryDashboard.tsx` uses `MemoryContext` but `MemoryProvider` is never mounted in the React tree. Any component consuming this context gets undefined/default values. | Either mount the provider in `App.tsx` or delete the memory feature |

---

## Section J: Dead / Orphaned Frontend Routes

| Route                     | Component                | Issue                                                                                                      | Disposition           |
| ------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------- |
| `/investigate/case/:id/*` | `InvestigationWorkspace` | Exact duplicate of `/investigations/:id` — same component, same props. Both load `InvestigationWorkspace`. | Remove from `App.tsx` |

---

## Section K: Dead Columns on Active Tables

Columns confirmed to be 100% null (or near-100%) on high-traffic tables:

| Table       | Column                | Null rate                                        | Disposition                                                          |
| ----------- | --------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `documents` | `source_original_url` | 100%                                             | Drop                                                                 |
| `documents` | `start_offset`        | 97%                                              | Drop (speculative — never populated)                                 |
| `documents` | `end_offset`          | 97%                                              | Drop (speculative — never populated)                                 |
| `articles`  | `url`                 | 100%                                             | Drop                                                                 |
| `articles`  | `published_date`      | 100%                                             | Drop                                                                 |
| `entities`  | `aliases`             | 99.94%                                           | Keep column but drop the `gin` trigram index (wasted index overhead) |
| `entities`  | `type`                | Has data but 38,841 conflicts with `entity_type` | Drop after resolving `entity_type` conflict                          |

---

## Section L: Dead Shared DTOs with No Consumer

These DTO files exist in `src/shared/dto/` but are not imported by any route handler or frontend component:

| File                                       | Issue                                                                                           | Disposition                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `src/shared/dto/properties.ts`             | `PropertyItemDto` is all camelCase but API returns snake_case — DTO never consumed by UI        | Fix camelCase mismatch and connect, or delete |
| `src/shared/dto/flights.ts`                | `FlightItemDto` is camelCase but flight UI uses local snake_case `Flight` type                  | Fix mismatch and connect, or delete           |
| Parts of `src/shared/dto/stats.ts`         | `pipelineStatus` (camelCase in DTO) conflicts with `pipeline_status` (snake_case in schema/API) | Fix field name                                |
| Parts of `src/shared/dto/relationships.ts` | `RelationshipDto` is camelCase but schema and API return snake_case                             | Fix mismatch                                  |

---

## Section M: Unported Worktree Migration

The file `.worktrees/ds-foundation/src/server/db/migrations/042_entity_mentions_dedup_constraint.sql` was never ported to the main `src/server/db/postgres/migrations/` directory.

This migration adds a uniqueness constraint on `entity_mentions(entity_id, document_id, start_offset, end_offset)` to prevent duplicate NER extractions. Without it, the pipeline can insert duplicate mentions silently.

**Recommendation:** Port this migration to the main migration system.  
**Risk:** MEDIUM (will fail if duplicates already exist; requires dedup pass first)  
**Disposition:** Needs human decision (check for existing duplicates before porting)
