# Staged Migration Plan

All schema changes are ordered by risk, dependency, and reversibility. Each stage is a deployable unit — the app must remain operational after every stage.

**Rule:** Each stage must be reviewed, tested, and deployed independently before the next begins.

---

## Stage 0 — Code-Only Fixes (No Migration, No Risk)

_Estimated time: 1–2 days. Deploy first — these fix live bugs and clean up dead code._

### S0.1 Fix the silent query bug in `relationshipsRepository.ts`

- **File:** `src/server/db/relationshipsRepository.ts` ~line 507
- **Change:** In `resolveShortestPath` CTE, replace `relationships` → `entity_relationships`
- **Why first:** This is a live bug. The shortest-path feature silently returns null for all queries.
- **Risk:** LOW

### S0.2 Delete dead repository files

- **Files to delete:**
  - `src/server/db/articleRepository.ts` (superseded by `articlesRepository.ts`)
  - `src/server/db/batchQuery.ts` (no imports)
  - `src/server/db/bulkOperationsRepository.ts` (no imports)
  - `src/server/db/jobsRepository.ts` (no imports)
  - `src/server/db/postgres/connection.ts` (orphaned nested file)
- **Risk:** LOW — verify no imports before deleting

### S0.3 Delete dead middleware and service files

- **Files to delete:**
  - `src/server/middleware/validation.ts` (superseded by `validate.ts`)
  - `src/server/audit/logger.ts` (superseded by `utils/auditLogger.ts`)
  - `src/server/services/IdentityFusionService.ts` (no callers)
  - `src/server/services/InvestigationAgentService.ts` (no callers)
  - `src/server/services/DangerMotifService.ts` (test-only)
- **Risk:** LOW

### S0.4 Delete dead mapper files

- **Files to delete:** `analyticsDtoMapper.ts`, `flightsDtoMapper.ts`, `graphDtoMapper.ts`, `mediaDtoMapper.ts`, `propertiesDtoMapper.ts`, `relationshipsDtoMapper.ts` (all in `src/server/mappers/`)
- **Risk:** LOW — confirm zero imports first

### S0.5 Rename `routesDb.ts` → `healthQueries.ts`

- **Change:** Rename file, update import in `app.ts`
- **Risk:** LOW

### S0.6 Remove duplicate frontend route `/investigate/case/:id/*`

- **File:** `src/client/App.tsx`
- **Change:** Delete the `/investigate/case/:id/*` route — it's identical to `/investigations/:id`
- **Risk:** LOW (check analytics/SEO for any traffic on this path)

### S0.7 Delete dead frontend components

- **Files:** `BlackBookReview.tsx` (never imported)
- **Risk:** LOW

### S0.8 Fix DTO camelCase mismatches (code-only, no DB)

- **Files:** `src/shared/dto/stats.ts` (rename `pipelineStatus` → `pipeline_status`), `src/shared/dto/relationships.ts` (align to snake_case), `src/shared/dto/flights.ts` (align to snake_case)
- **Risk:** MEDIUM — breaking change for any client using old camelCase field names. Coordinate with frontend.

---

## Stage 1 — Safe Dead Table Drops

_Requires: Stage 0 complete. No data to preserve. Reversible with empty CREATE TABLE._

### S1.1 Drop `timeline_events` (entity-specific, 0 rows)

```sql
-- Migration: drop_dead_timeline_events
DROP TABLE IF EXISTS timeline_events;
```

- **Down:** `CREATE TABLE timeline_events (...);` — restore empty table
- **Risk:** LOW

### S1.2 Drop `mentions` and `resolution_candidates` (both 0 rows)

```sql
-- Migration: drop_dead_mentions_system
DROP TABLE IF EXISTS resolution_candidates;  -- must go first (FK to mentions)
DROP TABLE IF EXISTS mentions;
```

- **Prerequisite:** Verify ingest pipeline does NOT write to `mentions` by checking `scripts/ingest_pipeline.ts`
- **Down:** Recreate both tables from migration 1 DDL
- **Risk:** LOW

### S1.3 Drop `media_assets` (0 rows)

```sql
DROP TABLE IF EXISTS media_assets;
```

- **Down:** `CREATE TABLE media_assets (media_id bigint, asset_id bigint, role text);`
- **Risk:** LOW

### S1.4 Drop `evidence_entity` (0 rows)

```sql
DROP TABLE IF EXISTS evidence_entity;
```

- **Down:** Recreate from DDL
- **Risk:** LOW

---

## Stage 2 — Index Cleanup (CONCURRENTLY — zero downtime)

_Can be run any time. Each DROP INDEX CONCURRENTLY is independent._

### S2.1 Drop duplicate indexes

For each duplicate pair, identify which index is the older/less-used one and drop it with `CONCURRENTLY`:

```sql
DROP INDEX CONCURRENTLY IF EXISTS <older_duplicate_index_name>;
```

Run for all 9 duplicate index pairs identified in the audit (see `04-relationship-integrity-report.md` Section F).

### S2.2 Drop wasted trgm index on `entities.aliases`

```sql
DROP INDEX CONCURRENTLY IF EXISTS entities_aliases_trgm_idx;
```

---

## Stage 3 — Column Fixes on Small Tables

_Low risk — small tables._

### S3.1 Fix FK type mismatches

```sql
-- Migration: fix_fk_type_mismatches
ALTER TABLE document_annotations ALTER COLUMN document_id TYPE bigint;
ALTER TABLE face_clusters ALTER COLUMN entity_id TYPE bigint;
-- Note: media_item_people.media_item_id needs human decision before fixing
```

### S3.2 Fix `forensic_signals.source_source` typo

```sql
-- Migration: fix_forensic_signals_column_typo
ALTER TABLE forensic_signals RENAME COLUMN source_source TO source_type;
```

### S3.3 Drop dead columns on `articles`

```sql
-- Migration: drop_dead_article_columns
ALTER TABLE articles DROP COLUMN IF EXISTS url;
ALTER TABLE articles DROP COLUMN IF EXISTS published_date;
```

---

## Stage 4 — Entities `type` / `entity_type` conflict resolution

_HIGH RISK — on the most-queried table (526K rows). Requires careful data migration._

### S4.1 Pre-migration data backup

```sql
CREATE TABLE entities_type_conflict_backup AS
SELECT id, entity_type, type FROM entities WHERE entity_type IS DISTINCT FROM type;
```

### S4.2 Resolve conflicts

```sql
-- Migration: resolve_entities_type_column_conflict
-- Step 1: Backfill entity_type from type where entity_type is null
UPDATE entities SET entity_type = type WHERE entity_type IS NULL AND type IS NOT NULL;
-- Step 2: Log conflicts for human review
INSERT INTO audit_log (action, details, created_at)
SELECT 'entity_type_conflict',
  json_build_object('id', id, 'entity_type', entity_type, 'type', type)::text,
  NOW()
FROM entities WHERE entity_type IS DISTINCT FROM type AND type IS NOT NULL;
-- Step 3: Set entity_type to type where they differ (entity_type wins if both have values)
-- HUMAN REVIEW REQUIRED before this step
```

### S4.3 Drop `type` column (after human review + code update)

```sql
ALTER TABLE entities DROP COLUMN type;
```

**Prerequisite:** Update all server code to use only `entity_type` — grep for `entities.type` and `e.type` in all repository files first.

---

## Stage 5 — Dead Columns on `documents`

_MEDIUM risk — 1.4M row table, but ALTER TABLE ADD/DROP is metadata-only in PG16._

### S5.1 Drop confirmed-dead columns

```sql
-- Migration: drop_dead_document_columns
ALTER TABLE documents DROP COLUMN IF EXISTS source_original_url;
ALTER TABLE documents DROP COLUMN IF EXISTS start_offset;
ALTER TABLE documents DROP COLUMN IF EXISTS end_offset;
ALTER TABLE documents DROP COLUMN IF EXISTS content_hash;
-- The following require monitoring before dropping:
-- source_url (verify ~100% null in prod before running)
-- source_acquisition_method
```

---

## Stage 6 — Table Renames

_MEDIUM risk — requires code updates first. Use views as aliases during transition._

### S6.1 Rename `palm_beach_properties` → `properties`

```sql
-- Migration: rename_palm_beach_properties
BEGIN;
ALTER TABLE palm_beach_properties RENAME TO properties;
-- Create backward-compatibility view for any missed references
CREATE VIEW palm_beach_properties AS SELECT * FROM properties;
COMMIT;
```

Drop the view after all code is updated.

### S6.2 Rename `global_timeline_events` → `timeline_events`

```sql
-- Migration: rename_timeline_events
BEGIN;
ALTER TABLE global_timeline_events RENAME TO timeline_events;
CREATE VIEW global_timeline_events AS SELECT * FROM timeline_events;
COMMIT;
```

### S6.3 Add `timeline_event_entities` junction table

```sql
-- Migration: add_timeline_event_entities_junction
CREATE TABLE timeline_event_entities (
  event_id  bigint NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
  entity_id bigint NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, entity_id)
);
-- Backfill: parse entities text column → entity name lookup → insert
-- (Run as a separate backfill script — not in this migration)
```

### S6.4 Rename `relations` → `extracted_entity_triples`

```sql
-- Migration: rename_relations_to_extracted_entity_triples
BEGIN;
ALTER TABLE relations RENAME TO extracted_entity_triples;
ALTER TABLE relation_evidence RENAME TO entity_triple_evidence;
ALTER TABLE entity_triple_evidence RENAME COLUMN relation_id TO triple_id;
CREATE VIEW relations AS SELECT * FROM extracted_entity_triples;
COMMIT;
```

### S6.5 Rename `entity_relationships` → `entity_graph_edges`

```sql
-- Migration: rename_entity_relationships_to_entity_graph_edges
BEGIN;
ALTER TABLE entity_relationships RENAME TO entity_graph_edges;
CREATE VIEW entity_relationships AS SELECT * FROM entity_graph_edges;
COMMIT;
```

---

## Stage 7 — Investigation Evidence Bifurcation Fix

_HIGH RISK — active feature with 11 rows. Requires careful human review._

### S7.1 Migrate `investigation_evidence.evidence_id` to use documents

```sql
-- First: verify all 11 evidence records have a corresponding document
SELECT ie.id, ie.evidence_id, ie.document_id, e.source_path, d.file_path
FROM investigation_evidence ie
JOIN evidence e ON e.id = ie.evidence_id
LEFT JOIN documents d ON d.id = ie.document_id;
-- Human review output before proceeding
```

### S7.2 Drop `evidence_id` from `investigation_evidence`

```sql
-- Migration: remove_investigation_evidence_evidence_id
ALTER TABLE investigation_evidence DROP COLUMN evidence_id;
```

### S7.3 Drop legacy `evidence` ecosystem

Once no FKs point to `evidence`:

```sql
DROP TABLE hypothesis_evidence;   -- or update FK to documents
DROP TABLE evidence_chain_items;  -- or update FK to documents
DROP TABLE investigation_evidence_annotations;  -- update to reference documents
DROP TABLE chain_of_custody;
DROP TABLE evidence;
```

---

## Stage 8 — Documents Pipeline State Extraction (Long-term, Optional)

_Only needed if the documents table performance becomes a bottleneck._

Extract 9 pipeline-control columns into `document_processing_state`. This is a multi-step migration requiring a backfill script and careful coordination. Not urgent — defer until needed.

---

## Migration File Naming Convention

All new migrations follow the existing timestamp format:

```
src/server/db/postgres/migrations/<timestamp>_<descriptive_name>.js
```

Use the current Unix millisecond timestamp as the prefix.

---

## Pre-Migration Checklist

Before running any stage:

- [ ] `pnpm type-check` passes
- [ ] `pnpm test:contracts` passes
- [ ] Database backup taken (`pg_dump epstein_archive > backup_$(date +%Y%m%d).dump`)
- [ ] All application code updated to not reference the target column/table
- [ ] Stage tested in development environment first
