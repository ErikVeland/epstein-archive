# Relationship Integrity Report

Covers: missing FK constraints, orphaned junction tables, type mismatches, and column naming inconsistencies in the FK graph.

---

## Section A: FK Type Mismatches (Active Bugs)

These are columns that serve as FK-like references but have mismatched types between the referencing and referenced columns, or use incorrect types relative to the referenced PK.

### A1. `document_annotations.document_id` — INTEGER vs BIGINT

|                         | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| Referenced table        | `documents.id` — `bigint`                               |
| Referencing column      | `document_annotations.document_id` — `integer`          |
| Risk                    | Silent data truncation for document IDs > 2,147,483,647 |
| Current data corruption | Possible on large datasets (1.4M documents)             |
| Table size              | 24 kB (small — safe to alter)                           |

**Recommendation:** `ALTER TABLE document_annotations ALTER COLUMN document_id TYPE bigint;`  
**Risk:** LOW (table is small)  
**Disposition:** Safe to change now

---

### A2. `face_clusters.entity_id` — INTEGER vs BIGINT

|                    | Value                                     |
| ------------------ | ----------------------------------------- |
| Referenced table   | `entities.id` — `bigint`                  |
| Referencing column | `face_clusters.entity_id` — `integer`     |
| Risk               | Truncation for entity IDs > 2,147,483,647 |
| Current data       | 48 kB (small — manageable)                |

**Recommendation:** `ALTER TABLE face_clusters ALTER COLUMN entity_id TYPE bigint;`  
**Risk:** LOW (small table)  
**Disposition:** Safe to change now

---

### A3. `media_item_people.media_item_id` — BIGINT vs TEXT id

|                    | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Referenced table   | `media_items.id` — `text`                                          |
| Referencing column | `media_item_people.media_item_id` — `bigint`                       |
| Risk               | Cannot create proper FK constraint; lookup type mismatch           |
| Notes              | `media_items.id` uses text PK (unusual) — may need cast in queries |

**Recommendation:** Needs human decision. Either change `media_items.id` to bigint sequence (significant migration on 98K rows) or change `media_item_people.media_item_id` to text. Verify how joins are actually written in `mediaRepository.ts`.  
**Risk:** HIGH  
**Disposition:** Needs human decision

---

## Section B: Column Name Typo

### B1. `forensic_signals.source_source` — doubled word

|               | Value                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Table         | `forensic_signals`                                                                                                |
| Column        | `source_source`                                                                                                   |
| Intended name | `source` or `source_type`                                                                                         |
| Impact        | Every query selecting this column by name is semantically confusing; auto-generated TS types will expose the typo |

**Recommendation:** `ALTER TABLE forensic_signals RENAME COLUMN source_source TO source_type;`  
**Risk:** LOW (small table, local code impact)  
**Disposition:** Safe to change now

---

## Section C: Entities Duplicate Column — Active Data Inconsistency

### C1. `entities.entity_type` vs `entities.type`

|                 | Value                     |
| --------------- | ------------------------- |
| Table           | `entities` (526,130 rows) |
| Column 1        | `entity_type`             |
| Column 2        | `type`                    |
| Mismatched rows | **38,841**                |
| Total rows      | 526,130                   |
| Mismatch rate   | ~7.4%                     |

**Assessment:** Two columns on the main entities table contain the same concept — the entity classification (person, organization, location, etc.). They were added at different times. Code must read both and merge them defensively. The 38,841 mismatched rows represent entities where the two columns disagree, which means any code reading only one column will return wrong data for ~7.4% of entities.

**Recommendation:**

1. Determine which column is the "truth" (likely `entity_type` — it's the more explicit name)
2. Run: `UPDATE entities SET entity_type = type WHERE entity_type IS NULL AND type IS NOT NULL;`
3. Run: `UPDATE entities SET entity_type = type WHERE entity_type != type AND type IS NOT NULL;` (with manual review of conflicting rows)
4. Drop `type` column
5. Update all code to use only `entity_type`

**Migration required:** YES (data migration + column drop)  
**Risk:** HIGH (526K rows on the most-queried table; requires careful rollback plan)  
**Rollback plan:** Before migration, `CREATE TABLE entities_type_backup AS SELECT id, entity_type, type FROM entities;`  
**Disposition:** Deprecate gradually — add `type` as a view alias first, update all code, then drop

---

## Section D: Missing FK Constraints (Unsafe References)

These columns act as FK references in application code but have no FK constraint in the DB. Orphaned rows can accumulate silently.

| Table                    | Column                | Should reference    | Current data quality                         |
| ------------------------ | --------------------- | ------------------- | -------------------------------------------- |
| `financial_transactions` | `from_entity` (text)  | `entities.id`       | No FK — entity names stored as text, not IDs |
| `financial_transactions` | `to_entity` (text)    | `entities.id`       | Same — text names, not IDs                   |
| `palm_beach_properties`  | `linked_entity_id`    | `entities.id`       | No FK constraint                             |
| `global_timeline_events` | `related_document_id` | `documents.id`      | No FK constraint                             |
| `global_timeline_events` | `entities`            | `entities.id`       | Stored as TEXT, not FK array                 |
| `entity_relationships`   | `ingest_run_id`       | (no tracking table) | Text field, no FK                            |
| `entity_mentions`        | `ingest_run_id`       | (no tracking table) | Text field, no FK                            |
| `documents`              | `ingestion_run_id`    | (no tracking table) | Text field, no FK                            |

### D1. `financial_transactions.from_entity` / `to_entity`

These store entity names as plain text. This breaks any join attempt, prevents referential integrity, and makes entity renames non-propagating.

**Recommendation:** Add `from_entity_id bigint REFERENCES entities(id)` and `to_entity_id bigint REFERENCES entities(id)`; populate via entity name lookup; deprecate text columns.  
**Risk:** MEDIUM (requires entity name → ID resolution for existing data)  
**Disposition:** Needs human decision (entity name matching may be fuzzy)

### D2. `global_timeline_events.entities` (text column)

The `entities` column stores a comma-separated or JSON list of entity names as text. No FK, no referential integrity, no easy join.

**Recommendation:** Create `timeline_event_entities(event_id bigint REFERENCES global_timeline_events(id), entity_id bigint REFERENCES entities(id))` junction table; backfill by name lookup; drop text column.  
**Risk:** MEDIUM (416 rows — manageable migration)  
**Disposition:** Safe to change with careful name-matching

---

## Section E: Orphaned Junction Tables

### E1. `investigation_evidence` — bifurcated FK design

```sql
investigation_evidence:
  investigation_id → investigations.id  ✓
  document_id      → documents.id       ✓  (1.4M possible refs)
  evidence_id      → evidence.id        ✓  (11 possible refs)
```

All 11 rows have BOTH `evidence_id` AND `document_id` set. This is a design error — the table should reference one canonical "piece of evidence" type, not two different tables simultaneously.

**Recommendation:** The `evidence_id` column should be dropped. All 11 investigation evidence links should reference only `documents.id`. After verifying the 11 rows reference valid document records, drop `evidence_id`.  
**Risk:** MEDIUM (active feature — investigations reference these rows)  
**Disposition:** Needs human decision (verify data before migration)

### E2. `evidence_entity` (0 rows) — orphaned junction

Exists to link `evidence` to `entities` but has never had any data. The `entity_evidence_types` table (110K rows) serves a similar purpose (linking entities to evidence type categories).

**Recommendation:** Drop `evidence_entity`  
**Risk:** LOW (0 rows)  
**Disposition:** Safe to change now

### E3. `media_assets` (0 rows) — orphaned junction

Links `media_items` to `file_assets` but has never been used.

**Recommendation:** Drop `media_assets`  
**Risk:** LOW (0 rows)  
**Disposition:** Safe to change now

### E4. `document_collections` (0 rows) — feature never shipped

A collections/folders feature was built (migrations exist) but never used. `collections` has 5 rows; `document_collections` has 0 rows.

**Recommendation:** Drop `document_collections`; optionally drop `collections` if the feature is cancelled.  
**Risk:** LOW  
**Disposition:** Needs human decision (is collections feature planned?)

---

## Section F: Duplicate Indexes

10 duplicate index pairs were identified. These consume write overhead on every INSERT/UPDATE without providing additional query performance.

| Table                 | Duplicate index pair                 | Recommendation |
| --------------------- | ------------------------------------ | -------------- |
| `documents`           | Two indexes on `(source_collection)` | Drop one       |
| `documents`           | Two indexes on `(file_path)`         | Drop one       |
| `entities`            | Two indexes on `(name)`              | Drop one       |
| `flight_passengers`   | Two indexes on `(entity_id)`         | Drop one       |
| `forensic_signals`    | Two indexes on `(entity_id)`         | Drop one       |
| `pipeline_runs`       | Two indexes on `(status)`            | Drop one       |
| `investigation_leads` | Two indexes on `(investigation_id)`  | Drop one       |
| `boilerplate_phrases` | Two indexes on `(phrase_hash)`       | Drop one       |

**Risk:** LOW (drop only the truly duplicate index, not both)  
**Disposition:** Safe to change now — `DROP INDEX CONCURRENTLY` is safe on live tables

---

## Section G: Wasted Index

### G1. `entities.aliases` trgm index — 99.94% null column

The `entities.aliases` column is 99.94% null (only ~315 of 526K entities have aliases). A `gin` trigram index on a near-empty column wastes space and adds write overhead.

**Recommendation:** Drop the trigram index on `aliases`; add it back only when the column is populated.  
**Risk:** LOW  
**Disposition:** Safe to change now

---

## Section H: Silent Query Bug

### H1. `relationshipsRepository.ts:507` — query against non-existent table

The `resolveShortestPath` function in `relationshipsRepository.ts` around line 507 uses a CTE that joins against a table named `relationships` (a legacy name). This table does not exist in the current schema. The query silently returns `null` whenever `resolveShortestPath` is called.

**Affected feature:** Entity network shortest-path routing  
**Current behavior:** Always returns null (broken silently)  
**Fix:** Change `relationships` → `entity_relationships` in the query  
**Risk:** LOW (fix is a string change in one file)  
**Disposition:** Safe to change now — this is a live bug
