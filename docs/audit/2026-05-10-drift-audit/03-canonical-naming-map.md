# Canonical Naming Map

For every concept with an inconsistent name, this file maps the current name to the proposed canonical name in each layer. Use this as the reference when making any rename.

---

## Naming Convention Rules (established from existing codebase)

- **Database tables:** `snake_case`, plural nouns (e.g. `entity_mentions`)
- **Database columns:** `snake_case` (e.g. `entity_id`, `created_at`)
- **Repository files:** `camelCase` + `Repository.ts` suffix (e.g. `entitiesRepository.ts`)
- **Route files:** domain + `Routes.ts` suffix, or just domain name for top-level (e.g. `entitiesRoutes.ts`, `relationships.ts`)
- **API routes:** `/api/kebab-case` plural (e.g. `/api/entities`, `/api/black-book`)
- **DTO files:** `src/shared/dto/camelCase.ts` (e.g. `entities.ts`)
- **Frontend pages:** `PascalCasePage.tsx`

---

## Entry Format

Each entry lists:

- **Current name** (what it's called now)
- **Proposed canonical name**
- **Affected files** (key files to update)
- **Evidence** (why this rename is warranted)
- **Migration required** (DB rename needed?)
- **Risk level**
- **Rollback plan**
- **Disposition**

---

## R1. Entity / Subject / Person → `entity`

| Layer         | Current Name                         | Proposed Canonical                                       |
| ------------- | ------------------------------------ | -------------------------------------------------------- |
| DB table      | `entities`                           | `entities` ✓ (already correct)                           |
| API route     | `/api/entities` ✓, `/api/subjects` ✗ | `/api/entities` (keep), deprecate `/api/subjects`        |
| Repository    | `entitiesRepository.ts` ✓            | no change                                                |
| Mapper        | `entitiesDtoMapper.ts` ✓             | no change                                                |
| Frontend type | `Person` ✗                           | `Entity` (long-term; high risk)                          |
| Frontend page | `PeoplePage`                         | keep (UI label is user-facing, separate from data layer) |
| UI label      | "People"                             | keep — user-facing label, correct for the domain         |
| URL route     | `/people`, `/entity/:id`             | keep — SEO-sensitive                                     |

**Affected files:** `src/server/routes/entitiesRoutes.ts` (add `/subjects` deprecation header), `src/client/types/index.ts` (long-term `Person` → `Entity`)  
**Evidence:** `/api/subjects` is a separate endpoint that returns the same data as `/api/entities` via a different mapper. It exists in `app.ts` as an inline route (not a route file).  
**Migration required:** NO (DB already correct)  
**Risk:** LOW for API deprecation; HIGH for frontend type rename  
**Rollback:** Revert route deprecation header  
**Disposition:** `/api/subjects` — deprecate gradually; frontend `Person` type — needs human decision (large refactor)

---

## R2. Relations/Relationships naming

| Layer                  | Current Name                     | Proposed Canonical                                           |
| ---------------------- | -------------------------------- | ------------------------------------------------------------ |
| DB table (NLP triples) | `relations`                      | `extracted_entity_triples`                                   |
| DB table (graph edges) | `entity_relationships`           | `entity_graph_edges`                                         |
| DB junction            | `relation_evidence`              | `entity_triple_evidence`                                     |
| API route              | `/api/relationships`             | `/api/relationships` (keep — serves `entity_relationships`)  |
| API route              | `/api/connections`               | `/api/connections` (keep — serves entity connection dossier) |
| Repository             | `relationshipsRepository.ts`     | `entityGraphEdgesRepository.ts`                              |
| Repository             | `entityConnectionsRepository.ts` | keep                                                         |
| Route file             | `relationships.ts`               | `entityGraphEdgesRoutes.ts`                                  |
| Route file             | `connectionsRoutes.ts`           | keep                                                         |
| Frontend page          | `ConnectionDossierPage`          | keep                                                         |
| Frontend page          | `NetworkPage`                    | keep                                                         |
| UI label               | "Connections"                    | keep                                                         |
| UI label               | "Network"                        | keep (different view)                                        |

**Affected files:** `src/server/db/relationshipsRepository.ts`, `src/server/routes/relationships.ts`, migration required for table renames  
**Evidence:** `relations` (11.7K rows, NLP triples) and `entity_relationships` (1.67M rows, ML-scored graph) are different concepts with almost identical names. Multiple developers and agents have confused them.  
**Migration required:** YES (rename tables, update all SQL in repository files)  
**Risk:** HIGH (both tables active, many code references)  
**Rollback:** Rename back in a single migration  
**Disposition:** Deprecate gradually — create views with old names first, migrate code, then drop views

---

## R3. Timeline table naming

| Layer             | Current Name             | Proposed Canonical                                                                  |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| DB table (dead)   | `timeline_events`        | DROP (after verifying 0 rows)                                                       |
| DB table (active) | `global_timeline_events` | `timeline_events` (reclaim the correct name)                                        |
| DB column         | `entities` (text)        | Move to junction table `timeline_event_entities(event_id bigint, entity_id bigint)` |
| Repository        | `timelineRepository.ts`  | no change                                                                           |
| API route         | `/api/timeline`          | no change                                                                           |

**Affected files:** `src/server/db/timelineRepository.ts`, migration file  
**Evidence:** `timeline_events` has 0 rows; `global_timeline_events` was seeded by migration `1741630000000_seed_canonical_epstein_timeline.js`. The names should swap.  
**Migration required:** YES (DROP old table, rename active table, add junction table for entities)  
**Risk:** MEDIUM (rename requires `timelineRepository.ts` update)  
**Rollback:** Rename back, drop junction, restore text column  
**Disposition:** Safe to change now for the table drop; deprecate gradually for the entities-column fix

---

## R4. `mentions` → `raw_ner_candidates` or DROP

| Layer          | Current Name                                     | Proposed Canonical                                                  |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| DB table       | `mentions`                                       | `raw_ner_candidates` (if kept) or DROP (if not written by pipeline) |
| DB junction FK | `resolution_candidates.mention_id → mentions.id` | Update or drop with parent                                          |

**Affected files:** Any ingest pipeline scripts that write to `mentions`  
**Evidence:** `mentions` has 0 rows. `entity_mentions` has 2.79M rows. The two names imply the same concept.  
**Migration required:** YES (rename or drop)  
**Risk:** LOW (0 rows)  
**Rollback:** Rename back  
**Disposition:** Verify ingest pipeline; if no writes, drop immediately

---

## R5. `palm_beach_properties` → `properties`

| Layer      | Current Name                   | Proposed Canonical |
| ---------- | ------------------------------ | ------------------ |
| DB table   | `palm_beach_properties`        | `properties`       |
| Repository | `propertiesRepository.ts`      | no change          |
| API route  | `/api/properties`              | no change          |
| DTO        | `src/shared/dto/properties.ts` | no change          |

**Affected files:** All SQL in `propertiesRepository.ts` and any migration that references the table name  
**Evidence:** The table is named after one specific location but the route and all code uses the generic "properties" concept. The corpus includes properties beyond Palm Beach.  
**Migration required:** YES (ALTER TABLE RENAME)  
**Risk:** MEDIUM (used by propertiesRepository which generates significant traffic)  
**Rollback:** Rename back  
**Disposition:** Safe to change with a single ALTER TABLE + code update

---

## R6. `routesDb.ts` → `healthQueries.ts`

| Layer       | Current Name                | Proposed Canonical               |
| ----------- | --------------------------- | -------------------------------- |
| Server file | `src/server/db/routesDb.ts` | `src/server/db/healthQueries.ts` |

**Affected files:** `src/app.ts` (imports `getEntityAndDocumentCounts` from it)  
**Evidence:** `routesDb.ts` is in the `db/` directory but is not a repository. It exports `getEntityAndDocumentCounts()` which is used only in the health-check endpoint in `app.ts`. It has nothing to do with "routes."  
**Migration required:** NO (no DB change, rename file + import)  
**Risk:** LOW  
**Rollback:** Rename back  
**Disposition:** Safe to change now

---

## R7. `articleRepository.ts` → DELETE

| Layer       | Current Name                         | Proposed Canonical |
| ----------- | ------------------------------------ | ------------------ |
| Server file | `src/server/db/articleRepository.ts` | DELETE             |

**Affected files:** Any route file importing `articleRepository` (singular)  
**Evidence:** Both `articleRepository.ts` (singular) and `articlesRepository.ts` (plural) exist. The plural form is the convention throughout the codebase. One is almost certainly dead.  
**Migration required:** NO  
**Risk:** LOW  
**Rollback:** Restore file  
**Disposition:** Verify by checking imports; safe to delete the unused one

---

## R8. `validate.ts` vs `validation.ts` → keep one

| Layer      | Current Name                          | Proposed Canonical         |
| ---------- | ------------------------------------- | -------------------------- |
| Middleware | `src/server/middleware/validate.ts`   | Keep whichever is imported |
| Middleware | `src/server/middleware/validation.ts` | Delete the unused one      |

**Affected files:** All route files that import middleware  
**Evidence:** Both files exist at the same path level. `app.ts` imports `validate` from `validate.ts`. The `validation.ts` file is likely dead.  
**Migration required:** NO  
**Risk:** LOW  
**Disposition:** Safe to change now after import verification

---

## R9. Performance Cache duplicate

| Layer       | Current Name                     | Proposed Canonical      |
| ----------- | -------------------------------- | ----------------------- |
| Server file | `src/server/performanceCache.ts` | DELETE one              |
| Server file | `src/server/utils/perfCache.ts`  | Keep canonical location |

**Affected files:** Any file importing either  
**Evidence:** Two files appear to serve the same purpose at different paths.  
**Migration required:** NO  
**Risk:** LOW  
**Disposition:** Safe to change now after import verification

---

## R10. Audit logger duplicate

| Layer       | Current Name                      | Proposed Canonical                                 |
| ----------- | --------------------------------- | -------------------------------------------------- |
| Server file | `src/server/audit/logger.ts`      | Keep (better organised — in `audit/` subdirectory) |
| Server file | `src/server/utils/auditLogger.ts` | DELETE if unused                                   |

**Migration required:** NO  
**Risk:** LOW  
**Disposition:** Safe to change now after import verification

---

## R11. API route naming inconsistencies

| Current API path          | Proposed canonical          | Notes                                |
| ------------------------- | --------------------------- | ------------------------------------ |
| `/api/black-book`         | `/api/black-book` ✓         | Keep as-is                           |
| `/api/advanced-analytics` | `/api/analytics/advanced`   | Hierarchical sub-resource            |
| `/api/tasks`              | `/api/investigations/tasks` | Investigation tasks should be scoped |
| `/api/faces`              | `/api/entities/faces`       | Face data is entity-scoped           |
| `/api/review`             | `/api/review` ✓             | Keep as-is                           |
| `/api/forensic`           | `/api/forensic` ✓           | Keep as-is                           |
| `/api/data-quality`       | `/api/data-quality` ✓       | Keep as-is                           |

---

## R12. Frontend route duplicates

| Current Frontend path     | Proposed canonical    | Notes                                               |
| ------------------------- | --------------------- | --------------------------------------------------- |
| `/investigations/*`       | `/investigations/*` ✓ | Keep                                                |
| `/investigate/case/:id/*` | DELETE                | Duplicate of `/investigations/:id` — same component |
| `/people`                 | Keep                  | User-facing label                                   |
| `/`                       | Alias for `/people`   | Keep (homepage default)                             |

**Affected files:** `src/client/App.tsx`  
**Evidence:** Both `/investigations/:id` and `/investigate/case/:id` render `InvestigationWorkspace` with the same props. The second route was never removed after a URL scheme change.  
**Risk:** LOW  
**Disposition:** Safe to remove the duplicate route
