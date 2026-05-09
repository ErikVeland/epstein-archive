# Duplicate Schema Report

All overlapping, redundant, or conflicting tables and columns found in the live DB and migration history.

---

## Section A: Duplicate / Overlapping Tables

### A1. `mentions` vs `entity_mentions`

| Property          | `mentions`                                                                                        | `entity_mentions`                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Row count         | **0** (DEAD)                                                                                      | 2,794,049 (ACTIVE)                                                              |
| Size              | 16 kB                                                                                             | 1,260 MB                                                                        |
| Purpose           | Raw NER output — unlinked mention candidates                                                      | Resolved entity mentions — linked to entity + document                          |
| Has `entity_id`   | NO                                                                                                | YES                                                                             |
| Has `document_id` | YES                                                                                               | YES                                                                             |
| Key columns       | surface_text, entity_type, ner_confidence, context_window_before/after, sentence_id, paragraph_id | entity_id, surface_text, mention_type, confidence, significance_score, verified |
| FK dependents     | `resolution_candidates` (also 0 rows)                                                             | none                                                                            |

**Assessment:** These are different pipeline stages, NOT semantic duplicates. `mentions` is the pre-entity-linking NER output (Stage 1); `entity_mentions` is post-entity-linking (Stage 2). However, `mentions` has 0 rows — the Stage 1 pipeline either was retired or never writes to this table in production. The table is dead.

**Recommendation:**

- Current: `mentions` (dead), `entity_mentions` (active)
- Proposed: Rename `mentions` → `raw_ner_candidates` to make its pipeline stage explicit; OR drop it if the ingest pipeline no longer writes to it.
- Migration required: YES (rename or drop)
- Risk: LOW (0 rows, FK child `resolution_candidates` also empty)

---

### A2. `relations` vs `entity_relationships`

| Property              | `relations`                                    | `entity_relationships`                                    |
| --------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| Row count             | 11,721 (ACTIVE)                                | 1,669,452 (ACTIVE)                                        |
| Size                  | 2.8 MB                                         | 381 MB                                                    |
| Purpose               | NLP-extracted subject-predicate-object triples | ML-scored entity graph edges                              |
| Subject/source column | `subject_entity_id`                            | `source_entity_id`                                        |
| Object/target column  | `object_entity_id`                             | `target_entity_id`                                        |
| Relationship column   | `predicate` (text)                             | `relationship_type` (text)                                |
| Additional scoring    | `weight`                                       | `strength`, `confidence`, `proximity_score`, `risk_score` |
| Evidence column       | (none — use `relation_evidence` junction)      | `evidence_pack_json` (embedded)                           |
| Was agentic           | NO                                             | `was_agentic` flag                                        |
| FK constraints        | YES (to entities)                              | YES (to entities)                                         |
| Referenced by         | `relation_evidence` (junction table)           | nothing directly                                          |

**Assessment:** These are NOT true duplicates — they represent different pipeline stages and semantic models. `relations` uses NLP triple extraction (subject-predicate-object with a direction and associated evidence via a junction table). `entity_relationships` uses ML-scored proximity/risk/strength scores and embeds evidence as JSONB. Both are active with real data.

The naming is the primary problem: both can reasonably be called "relationships between entities." A future developer will not understand the distinction without reading the code.

**Recommendation:**

- Current: `relations`, `entity_relationships`
- Proposed: `extracted_entity_triples` (for `relations`) + `entity_graph_edges` (for `entity_relationships`)
- Migration required: YES (rename both, update all code references)
- Risk: MEDIUM (both active, many code references)
- Disposition: Deprecate-gradually — rename in one migration, update code, then drop old aliases

---

### A3. `timeline_events` vs `global_timeline_events`

| Property           | `timeline_events`                               | `global_timeline_events`                         |
| ------------------ | ----------------------------------------------- | ------------------------------------------------ |
| Row count          | **0** (DEAD)                                    | 416 (ACTIVE)                                     |
| Size               | 16 kB                                           | 264 kB                                           |
| Purpose            | Entity-specific events extracted from documents | Manually curated canonical Epstein timeline      |
| Has `entity_id`    | YES                                             | NO (has `entities` as text array — design smell) |
| Has `document_id`  | YES                                             | `related_document_id` (optional)                 |
| Key unique columns | `entity_id`, `event_type`                       | `significance`, `source`, `entities` (text)      |
| FK dependents      | none                                            | none                                             |

**Assessment:** Different intended purposes (auto-extracted entity events vs curated global events), but `timeline_events` was never populated. The `global_timeline_events` table has a design smell: its `entities` column is `text` not an FK array, meaning entity relationships are stored as raw text with no referential integrity.

**Recommendation:**

- Current: `timeline_events` (dead), `global_timeline_events` (active)
- Proposed: Drop `timeline_events`; rename `global_timeline_events` → `timeline_events` (reclaiming the correct name); fix `entities` column to be a proper junction table `timeline_event_entities(event_id, entity_id)`.
- Migration required: YES (drop, rename, and fix the entities column)
- Risk: MEDIUM (rename requires code update in `timelineRepository.ts` and `timelineRoutes.ts`)
- Disposition: Safe to change — `timeline_events` has 0 rows

---

### A4. `evidence` vs `documents`

| Property            | `evidence`                                                                                                                                              | `documents` |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Row count           | **11**                                                                                                                                                  | 1,425,129   |
| Size                | 104 kB                                                                                                                                                  | 6,372 MB    |
| Columns shared      | title, description, evidence_type, source_path, extracted_text/content, red_flag_rating, is_sensitive, metadata_json, word_count, file_size, fts_vector | —           |
| Unique to evidence  | evidence_tags, cleaned_path, original_file_path, original_filename, ingested_at, modified_at                                                            | —           |
| Unique to documents | 40+ columns (pipeline control, provenance, hashes, etc.)                                                                                                | —           |
| FK dependents       | `investigation_evidence`, `evidence_entity`, `chain_of_custody`, `evidence_chain_items`, `hypothesis_evidence`, `investigation_evidence_annotations`    | Many        |

**Assessment:** The `evidence` table is a near-empty (11 rows) legacy table that structurally duplicates most of `documents`. It appears to have been created early to represent "curated evidence items" before the full `documents` pipeline was built. Now all real evidence is in `documents` and the 6 tables that FK to `evidence` effectively form a zombie sub-system.

The `investigation_evidence` junction table is the most problematic: it has `evidence_id` (FK → evidence, 11 rows) AND `document_id` (FK → documents, 1.4M rows). All 11 rows have BOTH set. This means investigations reference both tables simultaneously.

**Recommendation:**

- Current: `evidence` table (11 rows), `investigation_evidence` (11 rows using both `evidence_id` and `document_id`)
- Proposed: Migrate the 11 `investigation_evidence` rows to reference only `documents`; drop `evidence_id` column from `investigation_evidence`; then drop `evidence`, `evidence_entity`, `chain_of_custody`, `evidence_chain_items`, `hypothesis_evidence`, `investigation_evidence_annotations` in stages.
- Migration required: YES (data migration for 11 rows + FK drops)
- Risk: HIGH (multiple FK dependents, need careful verification)
- Disposition: Needs human decision — verify the 11 evidence rows before migration

---

### A5. `document_assets` vs `media_assets` (junction table pair)

| Property       | `document_assets`                 | `media_assets`                      |
| -------------- | --------------------------------- | ----------------------------------- |
| Row count      | 13,110 (ACTIVE)                   | **0** (DEAD)                        |
| Purpose        | Junction: documents ↔ file_assets | Junction: media_items ↔ file_assets |
| Columns        | document_id, asset_id, role       | media_id, asset_id, role            |
| FK constraints | YES                               | YES                                 |

**Assessment:** Both are junction tables linking content records to `file_assets`. `document_assets` is active; `media_assets` is dead (0 rows). The naming inconsistency (`document_assets` vs `media_assets`) mirrors the FK source (documents vs media_items).

**Recommendation:**

- Drop `media_assets` (0 rows, nothing writes to it)
- Migration required: YES (DROP TABLE)
- Risk: LOW (0 rows)
- Disposition: Safe to change now

---

### A6. `resolution_candidates` vs `entity_merge_candidates`

| Property       | `resolution_candidates`                                      | `entity_merge_candidates`                                               |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Row count      | **0** (DEAD)                                                 | **0** (DEAD)                                                            |
| Purpose        | Link raw NER mentions to entities (entity linking)           | Merge duplicate entity records (deduplication)                          |
| Key columns    | left_entity_id, right_entity_id, mention_id, score, decision | source_entity_id, target_entity_id, similarity_score, reasoning, status |
| Pipeline stage | Stage 1 → Stage 2 (resolve mention to entity)                | Post-Stage 2 (merge duplicate entities)                                 |

**Assessment:** Both are empty. Both represent parts of an entity resolution pipeline that has not been run in production. They serve different purposes (entity linking vs entity deduplication) but neither has data.

**Recommendation:**

- Keep both tables but mark as "pipeline tables — not production data"
- If the entity resolution pipeline is never planned, drop both
- Migration required: YES (if dropping)
- Risk: LOW (both empty)
- Disposition: Needs human decision — is entity resolution a planned feature?

---

## Section B: Redundant Columns on `documents` (60 columns)

The `documents` table has 60 columns — the most bloated table in the system. Multiple agents have added columns over time without removing obsolete ones.

### B1. Source-tracking column explosion (8 columns)

| Column                      | Null rate | Notes                              |
| --------------------------- | --------- | ---------------------------------- |
| `source_collection`         | ~1%       | Active — e.g. "DataSet 6"          |
| `source_original_url`       | **100%**  | DEAD — never populated             |
| `source_path`               | Low       | Active — local file path           |
| `source_url`                | ~100%     | Near-dead — almost always null     |
| `source_system`             | Low       | Active — e.g. "doj"                |
| `source_release`            | Low       | Active — e.g. "epstein_files_2024" |
| `source_acquisition_method` | High      | Mostly null                        |
| `source_acquired_at`        | High      | Mostly null                        |

**Proposed canonical set:** `source_collection`, `source_path`, `source_system`, `source_release` (4 columns). Drop `source_original_url` immediately (100% null). Deprecate `source_url`, `source_acquisition_method`, `source_acquired_at`.

### B2. Content column redundancy (3 columns)

| Column            | Purpose                      |
| ----------------- | ---------------------------- |
| `content`         | Full raw extracted text      |
| `content_refined` | Pipeline-cleaned version     |
| `content_preview` | Short excerpt for UI display |

**Assessment:** Three legitimate variants but `content_refined` may be a transitional artifact. Needs human decision on whether `content` or `content_refined` is the canonical serving text.

### B3. Hash column redundancy (4 columns)

| Column                   | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `content_hash`           | Legacy hash (algorithm unspecified)       |
| `content_sha256`         | SHA-256 of content                        |
| `hash_algo`              | Algorithm identifier for `content_sha256` |
| `normalized_text_sha256` | SHA-256 of normalised text                |

**Proposed canonical:** Keep `content_sha256` + `hash_algo` as a pair. Deprecate `content_hash` (predecessor). `normalized_text_sha256` can stay if deduplication uses it.

### B4. Pipeline-control columns embedded in main table (9 columns)

| Column                | Notes                        |
| --------------------- | ---------------------------- |
| `processing_status`   | Active — pipeline state      |
| `processing_error`    | Active — error tracking      |
| `processing_attempts` | Active                       |
| `worker_id`           | Active — locking             |
| `lease_expires_at`    | Active — distributed locking |
| `last_processed_at`   | Active                       |
| `analyzed_at`         | Active                       |
| `pipeline_version`    | 97.5% null                   |
| `ingestion_run_id`    | Low null rate                |

**Assessment:** These 9 pipeline-control columns embedded in the main documents table make the table very wide and make the `documents` concept semantically ambiguous (is it a document or a processing job?). Ideally these would live in a `document_processing_state` child table, but extraction would require a large migration. Flag for long-term refactor.

### B5. Near-dead positional columns

| Column           | Null rate | Notes                                     |
| ---------------- | --------- | ----------------------------------------- |
| `start_offset`   | 97% null  | Speculative — never populated             |
| `end_offset`     | 97% null  | Speculative — never populated             |
| `extracted_date` | 84% null  | Partially populated — useful when present |

---

## Section C: Duplicate Server Files

### C1. `articleRepository.ts` vs `articlesRepository.ts`

Both files exist in `src/server/db/`. One is almost certainly an old copy of the other or an abandoned rename. Evidence: only one can be the canonical import.

**Recommendation:** Identify which file is actually imported by routes; delete the unused one.  
Risk: LOW | Migration required: NO (no DB change)

### C2. `validate.ts` vs `validation.ts` in `src/server/middleware/`

Two files with overlapping names suggesting either a rename in progress or a duplicated module.

**Recommendation:** Read both files; one is the canonical middleware, the other should be deleted.  
Risk: LOW | Migration required: NO

### C3. `src/server/performanceCache.ts` vs `src/server/utils/perfCache.ts`

Both exist in the server directory at different levels. One is likely a leftover from a reorganisation.

**Recommendation:** Identify which is imported; delete the other.  
Risk: LOW | Migration required: NO

### C4. `src/server/audit/logger.ts` vs `src/server/utils/auditLogger.ts`

Two audit logging files at different paths.

**Recommendation:** Determine which is imported at runtime; mark the other as dead.  
Risk: LOW | Migration required: NO
