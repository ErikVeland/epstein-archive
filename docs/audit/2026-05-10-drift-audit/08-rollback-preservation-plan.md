# Rollback and Data Preservation Plan

For every migration stage, this file documents: what data exists, how to preserve it, and how to roll back.

---

## General Rollback Principles

1. **Always take a `pg_dump` before any Stage 3+ migration**
2. **Test `down()` functions in development before running `up()` in production**
3. **For renames, keep backward-compat views for one full release cycle before dropping**
4. **For drops, keep a backup table for 30 days before purging**
5. **Never run destructive migrations during peak hours**

---

## Stage 0 — Code-only changes

**Rollback:** `git revert` the commit. No DB state changes.  
**Data at risk:** None.

---

## Stage 1 — Dead Table Drops

### S1.1 `timeline_events` (0 rows)

**Data to preserve:** None (0 rows)  
**Backup before drop:** `CREATE TABLE timeline_events_backup AS SELECT * FROM timeline_events;` (empty — just for schema preservation)  
**Rollback:** Recreate table from original migration DDL  
**Recovery time:** < 1 minute  
**Data loss risk:** NONE

### S1.2 `mentions` and `resolution_candidates` (both 0 rows)

**Data to preserve:** None  
**Backup before drop:** Schema only (tables are empty)  
**Prerequisite check:** `SELECT count(*) FROM mentions;` must return 0. If not, STOP.  
**Rollback:** Recreate both tables  
**Data loss risk:** NONE

### S1.3 `media_assets` (0 rows)

**Data to preserve:** None  
**Rollback:** `CREATE TABLE media_assets (media_id bigint, asset_id bigint REFERENCES file_assets(id), role text);`  
**Data loss risk:** NONE

### S1.4 `evidence_entity` (0 rows)

**Data to preserve:** None  
**Rollback:** Recreate from original DDL  
**Data loss risk:** NONE

---

## Stage 2 — Index Drops

**Rollback:** `CREATE INDEX CONCURRENTLY ...` to recreate. No data at risk.  
**Recovery time:** Minutes to hours depending on table size (documents indexes can take 10–30 min)  
**Data loss risk:** NONE

---

## Stage 3 — Column Type Fixes on Small Tables

### S3.1 FK type mismatches

**Backup before:** `SELECT document_id FROM document_annotations WHERE document_id > 2147483647;` (check for values that would overflow int→bigint — should be none)  
**Rollback:** `ALTER TABLE document_annotations ALTER COLUMN document_id TYPE integer;`  
**Data loss risk:** NONE (widening cast, no data loss)

### S3.2 `forensic_signals.source_source` rename

**Backup before:** `CREATE TABLE forensic_signals_source_backup AS SELECT id, source_source FROM forensic_signals;`  
**Rollback:** `ALTER TABLE forensic_signals RENAME COLUMN source_type TO source_source;`  
**Data loss risk:** NONE

### S3.3 Dead `articles` columns

**Backup before:** `CREATE TABLE articles_dead_cols_backup AS SELECT id, url, published_date FROM articles WHERE url IS NOT NULL OR published_date IS NOT NULL;` (should be empty given 100% null rates)  
**Rollback:** `ALTER TABLE articles ADD COLUMN url text; ALTER TABLE articles ADD COLUMN published_date timestamptz;`  
**Data loss risk:** NONE (columns are 100% null)

---

## Stage 4 — Entities `type` Conflict Resolution (HIGH RISK)

This is the highest-risk change in the entire plan. The entities table has 526K rows and is the most-queried table in the app.

### Pre-migration mandatory steps

```sql
-- Step 1: Full backup
pg_dump postgresql://epstein:epstein@localhost:5435/epstein_archive > backup_before_entities_type_fix_$(date +%Y%m%d).dump

-- Step 2: Save conflict state
CREATE TABLE entities_type_conflict_snapshot AS
SELECT id, name, entity_type, type,
  CASE WHEN entity_type != type AND type IS NOT NULL THEN 'conflict'
       WHEN entity_type IS NULL AND type IS NOT NULL THEN 'missing_entity_type'
       ELSE 'ok'
  END as status
FROM entities;

-- Step 3: Verify counts
SELECT status, count(*) FROM entities_type_conflict_snapshot GROUP BY status;
```

### Rollback plan

```sql
-- Restore type column if it was dropped prematurely
ALTER TABLE entities ADD COLUMN type text;
UPDATE entities e SET type = b.type
FROM entities_type_conflict_snapshot b WHERE e.id = b.id;
```

**Recovery time:** 5–15 minutes (UPDATE on 526K rows)  
**Data loss risk:** LOW if backup snapshot exists; HIGH if snapshot was not taken

---

## Stage 5 — Dead Columns on `documents` (1.4M rows)

### S5.1 Drop dead document columns

**Backup before drop:**

```sql
-- Save any non-null values (expected: none for source_original_url)
CREATE TABLE documents_dead_cols_backup AS
SELECT id, source_original_url, start_offset, end_offset, content_hash
FROM documents
WHERE source_original_url IS NOT NULL
   OR start_offset IS NOT NULL
   OR end_offset IS NOT NULL
   OR content_hash IS NOT NULL;
-- Check count — if > 0, review before proceeding
SELECT count(*) FROM documents_dead_cols_backup;
```

**Rollback:**

```sql
ALTER TABLE documents
  ADD COLUMN source_original_url text,
  ADD COLUMN start_offset integer,
  ADD COLUMN end_offset integer,
  ADD COLUMN content_hash text;
-- Restore from backup if any non-null values existed
UPDATE documents d SET content_hash = b.content_hash
FROM documents_dead_cols_backup b WHERE d.id = b.id AND b.content_hash IS NOT NULL;
```

**Recovery time:** 5–10 minutes  
**Data loss risk:** LOW if backup taken; `source_original_url` is confirmed 100% null

---

## Stage 6 — Table Renames

### General rollback for all renames:

```sql
ALTER TABLE <new_name> RENAME TO <old_name>;
DROP VIEW IF EXISTS <old_name>;  -- if backward-compat view was created
```

### S6.2 `global_timeline_events` → `timeline_events` (416 rows)

**Backup before:**

```sql
CREATE TABLE global_timeline_events_backup AS SELECT * FROM global_timeline_events;
```

**Rollback:**

```sql
ALTER TABLE timeline_events RENAME TO global_timeline_events;
DROP VIEW IF EXISTS global_timeline_events;
```

**Data loss risk:** NONE (rename only)

### S6.3 `timeline_event_entities` junction creation

**Rollback:** `DROP TABLE timeline_event_entities;` (reverses the new table)  
**Data at risk for backfill:** The `entities` text column on the renamed `timeline_events` table. Do not drop this text column until the junction table is fully backfilled and verified.

```sql
-- Only drop entities text column AFTER junction table is verified:
SELECT t.id, t.entities, count(te.entity_id) as linked_count
FROM timeline_events t
LEFT JOIN timeline_event_entities te ON te.event_id = t.id
WHERE t.entities IS NOT NULL
GROUP BY t.id, t.entities;
```

### S6.4–S6.5 `relations` and `entity_relationships` renames (active data)

These renames affect **11,721** and **1,669,452** rows respectively. The backward-compat views MUST stay in place until every repository query is verified to use the new names.

**Backward-compat view window:** Minimum 2 full deployment cycles before dropping the views.

**Rollback:**

```sql
ALTER TABLE extracted_entity_triples RENAME TO relations;
ALTER TABLE entity_triple_evidence RENAME TO relation_evidence;
ALTER TABLE entity_graph_edges RENAME TO entity_relationships;
DROP VIEW IF EXISTS relations;
DROP VIEW IF EXISTS entity_relationships;
```

---

## Stage 7 — Investigation Evidence Fix (HIGH RISK)

### S7.1 Pre-migration audit

```sql
-- Save the full investigation_evidence state before any changes
CREATE TABLE investigation_evidence_backup AS SELECT * FROM investigation_evidence;

-- Verify the 11 evidence rows all have valid documents:
SELECT ie.id, ie.investigation_id, ie.evidence_id, ie.document_id,
  e.title as evidence_title, d.title as document_title,
  d.id IS NOT NULL as document_exists
FROM investigation_evidence ie
JOIN evidence e ON e.id = ie.evidence_id
LEFT JOIN documents d ON d.id = ie.document_id
ORDER BY ie.id;
```

**STOP if any row has `document_exists = false`.** Those rows reference an `evidence` record that has no corresponding `document`. Manual data recovery needed before migration.

### Rollback for `evidence_id` column drop:

```sql
-- Restore evidence_id column
ALTER TABLE investigation_evidence ADD COLUMN evidence_id bigint;
-- Restore from backup
UPDATE investigation_evidence ie
SET evidence_id = b.evidence_id
FROM investigation_evidence_backup b WHERE ie.id = b.id;
-- Restore FK
ALTER TABLE investigation_evidence ADD CONSTRAINT investigation_evidence_evidence_id_fkey
  FOREIGN KEY (evidence_id) REFERENCES evidence(id);
```

**Data loss risk:** MEDIUM — if the backup table was not taken, recovery is possible but requires manual work

### S7.2 `evidence` table drop

**Backup before drop:**

```sql
CREATE TABLE evidence_archive AS SELECT * FROM evidence;
CREATE TABLE chain_of_custody_archive AS SELECT * FROM chain_of_custody;
CREATE TABLE evidence_chain_items_archive AS SELECT * FROM evidence_chain_items;
```

**Rollback:** Recreate tables from archive backups and restore FK constraints.  
**Keep archives for:** 90 days minimum after the drop, then purge.

---

## Monitoring After Each Stage

After every stage, run these checks before declaring success:

```bash
# 1. Application health
curl -s http://localhost:3012/api/health/ready | jq .

# 2. Core stats (should return same numbers as before)
curl -s http://localhost:3012/api/stats | jq '{entities:.totalEntities, documents:.totalDocuments}'

# 3. Type check
cd /Volumes/Media/Epstein\ Files/epstein-archive && pnpm type-check

# 4. Contract tests (needs API server running)
pnpm test:contracts
```

Any failure in these checks requires immediate rollback.
