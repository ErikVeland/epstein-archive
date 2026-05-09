# Prioritised Implementation Order

Single consolidated backlog of all recommended changes, ranked by: (1) live bugs first, (2) risk to ongoing data integrity, (3) blocking dependencies, (4) effort/value ratio. Each item links to the detailed write-up in the relevant audit file.

**Rule:** Complete each item (or explicitly decide to skip it) before starting the next. Never run Stage 2+ migrations without Stage 1 complete.

---

## Tier 0 — Fix Now (Live Bugs, Zero Risk)

These are bugs or near-zero-risk cleanup items that can be merged immediately. No migration required. No coordination needed.

| Priority | Item                                             | File                                           | What to do                                                                               | Risk |
| -------- | ------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ---- |
| **P0.1** | Fix silent shortest-path bug                     | `src/server/db/relationshipsRepository.ts:507` | Change `relationships` → `entity_relationships` in the `resolveShortestPath` CTE         | ZERO |
| **P0.2** | Fix schema hash enforcement                      | `package.json`                                 | Add `pnpm schema:hash:check` to `prebuild:prod` script                                   | ZERO |
| **P0.3** | Fix boundary check `rg` PATH issue               | `scripts/check-boundaries.sh`                  | Add `grep -r` fallback so CI doesn't silently pass                                       | ZERO |
| **P0.4** | Unmount or delete `downloads.ts`                 | `src/app.ts`                                   | Either add `router.use('/api/downloads', downloadsRouter)` or delete the import and file | ZERO |
| **P0.5** | Remove duplicate `/investigate/case/:id/*` route | `src/client/App.tsx`                           | Delete the duplicate route; keep `/investigations/:id`                                   | ZERO |
| **P0.6** | Add duplicate index detection to `pnpm verify`   | `scripts/verify.ts`                            | Add the duplicate-index SQL query (see `09-ci-guardrails.md` G8)                         | ZERO |

---

## Tier 1 — Stage 0 (Code-Only, Low Risk, Deploy Independently)

_Prerequisite: Tier 0 complete. Estimated time: 1–2 days._

| Priority | Item                                      | Files                                                                                                                                           | What to do                                                                       | Risk   |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| **P1.1** | Delete dead repository files              | `articleRepository.ts`, `batchQuery.ts`, `bulkOperationsRepository.ts`, `jobsRepository.ts`, `postgres/connection.ts`                           | Verify zero imports via `grep -r`, then delete                                   | LOW    |
| **P1.2** | Delete dead middleware files              | `middleware/validation.ts`, `audit/logger.ts`                                                                                                   | Verify zero imports, delete                                                      | LOW    |
| **P1.3** | Delete dead service files                 | `IdentityFusionService.ts`, `InvestigationAgentService.ts`, `DangerMotifService.ts`                                                             | Verify zero imports, delete                                                      | LOW    |
| **P1.4** | Delete dead mapper files                  | `analyticsDtoMapper.ts`, `flightsDtoMapper.ts`, `graphDtoMapper.ts`, `mediaDtoMapper.ts`, `propertiesDtoMapper.ts`, `relationshipsDtoMapper.ts` | Verify zero imports, delete                                                      | LOW    |
| **P1.5** | Delete dead frontend component            | `BlackBookReview.tsx`                                                                                                                           | Verify not imported, delete                                                      | LOW    |
| **P1.6** | Rename `routesDb.ts` → `healthQueries.ts` | `src/server/db/routesDb.ts`, `src/app.ts`                                                                                                       | Rename file + update import                                                      | LOW    |
| **P1.7** | Fix DTO camelCase mismatches (code-only)  | `src/shared/dto/stats.ts`, `relationships.ts`, `flights.ts`                                                                                     | Rename fields to snake_case — coordinate with any frontend consuming these types | MEDIUM |

---

## Tier 2 — Stage 1: Drop Dead Tables

_Prerequisite: Stage 0 deployed and verified. Estimated time: 1 hour._

All four tables have 0 rows. Run the prerequisite row-count checks before each drop.

| Priority | Item                                                       | SQL                                                                          | Risk                                                            |
| -------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **P2.1** | Drop `timeline_events` (old entity-specific, 0 rows)       | `DROP TABLE IF EXISTS timeline_events;`                                      | NONE                                                            |
| **P2.2** | Drop `resolution_candidates` then `mentions` (both 0 rows) | `DROP TABLE IF EXISTS resolution_candidates; DROP TABLE IF EXISTS mentions;` | NONE (verify ingest pipeline doesn't write to `mentions` first) |
| **P2.3** | Drop `media_assets` (0 rows)                               | `DROP TABLE IF EXISTS media_assets;`                                         | NONE                                                            |
| **P2.4** | Drop `evidence_entity` (0 rows)                            | `DROP TABLE IF EXISTS evidence_entity;`                                      | NONE                                                            |

**Verification after each drop:** `pnpm type-check` + `curl http://localhost:3012/api/health/ready`

---

## Tier 3 — Stage 2: Drop Duplicate Indexes

_Prerequisite: Stage 1 complete. Estimated time: 30 minutes. Run `CONCURRENTLY` — zero downtime._

| Priority | Item                                                         | SQL                                                            |
| -------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| **P3.1** | Drop duplicate `documents(source_collection)` index          | `DROP INDEX CONCURRENTLY IF EXISTS <older_index>;`             |
| **P3.2** | Drop duplicate `documents(file_path)` index                  | `DROP INDEX CONCURRENTLY IF EXISTS <older_index>;`             |
| **P3.3** | Drop duplicate `entities(name)` index                        | `DROP INDEX CONCURRENTLY IF EXISTS <older_index>;`             |
| **P3.4** | Drop duplicate `flight_passengers(entity_id)` index          | `DROP INDEX CONCURRENTLY IF EXISTS <older_index>;`             |
| **P3.5** | Drop duplicate `forensic_signals(entity_id)` index           | `DROP INDEX CONCURRENTLY IF EXISTS <older_index>;`             |
| **P3.6** | Drop duplicate `pipeline_runs(status)` index                 | `DROP INDEX CONCURRENTLY IF EXISTS <older_index>;`             |
| **P3.7** | Drop duplicate `investigation_leads(investigation_id)` index | `DROP INDEX CONCURRENTLY IF EXISTS <older_index>;`             |
| **P3.8** | Drop duplicate `boilerplate_phrases(phrase_hash)` index      | `DROP INDEX CONCURRENTLY IF EXISTS <older_index>;`             |
| **P3.9** | Drop wasted trgm index on `entities.aliases`                 | `DROP INDEX CONCURRENTLY IF EXISTS entities_aliases_trgm_idx;` |

_To identify which of each duplicate pair to drop: use `\d+ <table>` in psql to compare index creation timestamps or names, then drop the older/less-descriptively-named one._

---

## Tier 4 — Stage 3: Column Fixes on Small Tables

_Prerequisite: Stages 1-2 complete. Estimated time: 30 minutes._

| Priority | Item                                                               | SQL                                                                                                          | Risk                |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------- |
| **P4.1** | Fix `document_annotations.document_id` INTEGER → BIGINT            | `ALTER TABLE document_annotations ALTER COLUMN document_id TYPE bigint;`                                     | LOW (table is 24kB) |
| **P4.2** | Fix `face_clusters.entity_id` INTEGER → BIGINT                     | `ALTER TABLE face_clusters ALTER COLUMN entity_id TYPE bigint;`                                              | LOW (table is 48kB) |
| **P4.3** | Rename `forensic_signals.source_source` → `source_type`            | `ALTER TABLE forensic_signals RENAME COLUMN source_source TO source_type;` + update any code references      | LOW                 |
| **P4.4** | Drop `articles.url` and `articles.published_date` (both 100% null) | `ALTER TABLE articles DROP COLUMN IF EXISTS url; ALTER TABLE articles DROP COLUMN IF EXISTS published_date;` | NONE                |
| **P4.5** | _(Deferred)_ `media_item_people.media_item_id` type mismatch       | Needs human decision — see `04-relationship-integrity-report.md` A3                                          | HIGH                |

---

## Tier 5 — Stage 4: Entities `type` Conflict Resolution

_Prerequisite: Stages 1-3 complete. This is the highest-risk change. Take a full `pg_dump` first._

| Priority | Item                                                           | Action                                                                                   | Risk                       |
| -------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- |
| **P5.1** | Audit the 38,841 conflicting rows                              | Run the conflict snapshot query from `08-rollback-preservation-plan.md` Stage 4          | N/A                        |
| **P5.2** | Backfill `entity_type` from `type` where `entity_type IS NULL` | `UPDATE entities SET entity_type = type WHERE entity_type IS NULL AND type IS NOT NULL;` | LOW                        |
| **P5.3** | Human review of conflict rows                                  | Review the `entities_type_conflict_snapshot` table                                       | N/A                        |
| **P5.4** | Update all server code to use `entity_type` only               | `grep -r "entities\.type\|e\.type" src/server/` then update each file                    | MEDIUM                     |
| **P5.5** | Drop `type` column                                             | `ALTER TABLE entities DROP COLUMN type;`                                                 | MEDIUM (after code update) |

---

## Tier 6 — Stage 5: Drop Dead Document Columns

_Prerequisite: Stage 4 complete. Take `pg_dump` first. 1.4M row table but ALTER TABLE DROP is metadata-only in PG16._

| Priority | Item                                                               | SQL                                                                                                                 | Risk   |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------ |
| **P6.1** | Drop `documents.source_original_url` (100% null)                   | `ALTER TABLE documents DROP COLUMN IF EXISTS source_original_url;`                                                  | NONE   |
| **P6.2** | Drop `documents.start_offset` and `end_offset` (97% null)          | `ALTER TABLE documents DROP COLUMN IF EXISTS start_offset; ALTER TABLE documents DROP COLUMN IF EXISTS end_offset;` | LOW    |
| **P6.3** | Drop `documents.content_hash` (superseded by `content_sha256`)     | `ALTER TABLE documents DROP COLUMN IF EXISTS content_hash;` + verify code uses `content_sha256`                     | LOW    |
| **P6.4** | _(Monitor first)_ Drop `documents.source_url` (~100% null in prod) | Verify in production before running                                                                                 | MEDIUM |
| **P6.5** | _(Monitor first)_ Drop `documents.source_acquisition_method`       | Verify in production before running                                                                                 | MEDIUM |

---

## Tier 7 — Stage 6: Table Renames

_Prerequisite: Stage 5 complete. Renames require code updates before migration. Use backward-compat views during transition._

| Priority | Item                                                 | Action                                                                                                 | Risk   |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| **P7.1** | Rename `palm_beach_properties` → `properties`        | Update code first, then `ALTER TABLE palm_beach_properties RENAME TO properties;` + create compat view | MEDIUM |
| **P7.2** | Rename `global_timeline_events` → `timeline_events`  | Update code first, then rename + compat view                                                           | MEDIUM |
| **P7.3** | Add `timeline_event_entities` junction table         | Create table, run backfill script, verify, then drop `entities` text column                            | MEDIUM |
| **P7.4** | Rename `relations` → `extracted_entity_triples`      | Rename both `relations` and `relation_evidence` tables + compat views                                  | MEDIUM |
| **P7.5** | Rename `entity_relationships` → `entity_graph_edges` | Rename table + compat view                                                                             | MEDIUM |

_Keep backward-compat views for minimum 2 deployment cycles before dropping._

---

## Tier 8 — Stage 7: Investigation Evidence Fix

_Prerequisite: Stage 6 complete. Active feature — do full human review before any change._

| Priority | Item                                       | Action                                                                                                                                         | Risk   |
| -------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **P8.1** | Audit all 11 `investigation_evidence` rows | Run the verification query from `08-rollback-preservation-plan.md` Stage 7                                                                     | N/A    |
| **P8.2** | Drop `investigation_evidence.evidence_id`  | After verifying all rows have valid `document_id`                                                                                              | MEDIUM |
| **P8.3** | Archive then drop `evidence` ecosystem     | `CREATE TABLE evidence_archive AS SELECT * FROM evidence;` then drop `evidence`, `chain_of_custody`, `evidence_chain_items` after updating FKs | HIGH   |

---

## Tier 9 — Needs Human Decision (Deferred)

These items cannot be safely automated. Each requires a product or architectural decision before any change.

| Item                                                          | Decision needed                                                                               | Reference                                |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `document_collections` / `collections` tables                 | Is the collections feature cancelled? Drop both, or implement it?                             | `05-dead-surface-report.md` Section A    |
| `entity_merge_candidates` table                               | Is entity dedup pipeline planned? Keep as placeholder or drop?                                | `05-dead-surface-report.md` Section A    |
| `media_item_people.media_item_id` type mismatch               | Change `media_items.id` to bigint or `media_item_people.media_item_id` to text?               | `04-relationship-integrity-report.md` A3 |
| `financial_transactions` entity text columns                  | Add `from_entity_id`/`to_entity_id` FK columns? Requires fuzzy entity name matching.          | `04-relationship-integrity-report.md` D1 |
| `MemoryContext` / `MemoryProvider`                            | Mount `MemoryProvider` in `App.tsx` or delete the memory feature?                             | `05-dead-surface-report.md` Section I    |
| `downloads.ts` route                                          | Mount it or delete it?                                                                        | `05-dead-surface-report.md` Section E    |
| Entity dedup `canonical_id` column                            | Add self-referential FK on `entities` for dedup links?                                        | `06-proposed-canonical-schema.md`        |
| Worktree migration `042_entity_mentions_dedup_constraint.sql` | Port to main migrations? Requires dedup pass first.                                           | `05-dead-surface-report.md` Section M    |
| Stage 8: `document_processing_state` extraction               | Extract 9 pipeline columns from `documents`? Not urgent — defer until performance bottleneck. | `07-staged-migration-plan.md` Stage 8    |

---

## Tier 10 — CI Guardrails (Add Throughout)

Deploy these alongside (or before) their corresponding migration tier.

| When          | Guardrail                                           |
| ------------- | --------------------------------------------------- |
| Now           | G1: Add schema hash to `prebuild:prod`              |
| Now           | G2: Fix `rg` PATH fallback in boundary check        |
| Now           | G6: TS strict mode for `src/shared/`                |
| Now           | G8: Add duplicate index query to `pnpm verify`      |
| Now           | G9: Pre-commit check for `pg` imports in client     |
| Before Tier 2 | G7: Dead table row count check                      |
| Before Tier 3 | G5: Expand contract test coverage to missing routes |
| Before Tier 3 | G4: Add migration dry-run to CI test pipeline       |
| After Tier 1  | G3: Dead export detection                           |
| Ongoing       | G10: Migration naming convention lint               |

---

## Risk Summary

| Tier | Stage                      | Risk level | Data at risk                | Rows affected       |
| ---- | -------------------------- | ---------- | --------------------------- | ------------------- |
| 0    | Bug fixes                  | ZERO       | None                        | 0                   |
| 1    | Code-only                  | LOW        | None                        | 0                   |
| 2    | Dead table drops           | NONE       | None                        | 0 rows (all empty)  |
| 3    | Index drops                | NONE       | None                        | Index metadata only |
| 4    | Column fixes, small tables | LOW        | None                        | <1K rows            |
| 5    | `entities.type` conflict   | HIGH       | 38,841 conflicted rows      | 526K rows           |
| 6    | Dead document columns      | LOW–MEDIUM | None (100% null)            | 1.4M rows touched   |
| 7    | Table renames              | MEDIUM     | None (rename + compat view) | Up to 1.67M rows    |
| 8    | Investigation evidence     | HIGH       | 11 active rows              | Active feature      |
| 9    | Human decisions            | N/A        | N/A                         | N/A                 |

**Total estimated time:** 2–4 weeks across all tiers (gated by human review at Tiers 5 and 8).

---

## One-Page Cheat Sheet

```
Week 1:  Tier 0 (live bug fix) + Tier 1 (delete dead files) + CI guardrails G1/G2/G6/G8
Week 2:  Tier 2 (drop 4 empty tables) + Tier 3 (drop 9 duplicate indexes)
Week 3:  Tier 4 (column type fixes, forensic_signals rename, articles columns)
Week 4:  Tier 5 (entities type conflict — REVIEW carefully, take pg_dump first)
Week 5:  Tier 6 (dead document columns) + Tier 7 begins (palm_beach_properties rename)
Week 6:  Tier 7 continues (relations/entity_relationships renames + junction table backfill)
Week 7+: Tier 8 (investigation evidence) — only after full human review of 11 rows
Ongoing: Tier 9 items as product decisions are made
```
