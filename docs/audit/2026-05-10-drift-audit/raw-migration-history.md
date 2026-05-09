# Raw Migration History Audit

**Date:** 2026-05-10  
**Scope:** All 64 node-pg-migrate `.js` files in `src/server/db/postgres/migrations/`  
**Auditor:** Automated analysis via Claude Code

---

## Migration Inventory

All 64 migrations in chronological order. "Rollback" = has a real `down` function. "noDown" = uses `pgm.noDown()` or an intentionally empty function. "Drift flag" = name or content signals schema uncertainty.

---

### 1. `1740013800000_initial_schema.js`

**Purpose:** Foundation migration. Creates the entire initial schema in one go: users, audit_log, documents, entities, evidence_types, entity_evidence_types, entity_mentions, entity_relationships, relations, investigations, investigation_evidence, media_albums, media_items, media_tags, media_album_items, ingest_runs, claim_triples, financial_transactions, document_pages, document_sentences, timeline_events, document_spans, mentions, resolution_candidates, quality_flags, relation_evidence, migration_watermarks. Adds FTS vectors and basic indexes.

**Tables created:** users, audit_log, documents, entities, evidence_types, entity_evidence_types, **entity_mentions**, **entity_relationships**, **relations**, investigations, investigation_evidence, media_albums, media_items, media_tags, media_album_items, ingest_runs, claim_triples, financial_transactions, document_pages, document_sentences, **timeline_events**, document_spans, **mentions**, resolution_candidates, quality_flags, relation_evidence, migration_watermarks

**Rollback:** Full `down` function (drops all tables in reverse FK order)  
**Drift flag:** None — legitimate foundation

**Key note:** Both `mentions` and `entity_mentions` are created here simultaneously, as are both `relations` and `entity_relationships`. This is the root source of the dual-table ambiguity pattern. `timeline_events` is also created here (entity-scoped). `document_pages` also created here.

---

### 2. `1740014000000_perf_indexes.js`

**Purpose:** Adds performance indexes (CONCURRENTLY), FTS triggers for `entities` and `documents`, and backfills `fts_vector`. Also adds `location_lat`, `location_lng`, and `mentions` (integer count) columns to `entities` using `IF NOT EXISTS` guards.

**Tables modified:** entities (adds location_lat, location_lng, mentions), entity_mentions, entity_relationships, media_items, documents

**Rollback:** Full `down` (drops triggers, functions, indexes via CONCURRENTLY)  
**Drift flag:** Uses `IF NOT EXISTS` guards on column additions — signals uncertainty about whether columns exist. Column `mentions` added here was already implicitly expected by matview queries.

---

### 3. `1740014100000_analytics_matviews.js`

**Purpose:** Creates five materialized views for analytics endpoints: mv_docs_by_type, mv_entity_type_dist, mv_top_connected, mv_timeline_data, mv_redaction_stats.

**Objects created:** mv_docs_by_type, mv_entity_type_dist, mv_top_connected, mv_timeline_data, mv_redaction_stats (all materialized views)

**Rollback:** Full `down`  
**Drift flag:** `mv_docs_by_type` uses `mime_type` column — this column gets renamed to `file_type` in migration 25 (`1741540000000_align_schema_v2`). This creates a **silent breakage**: the matview query silently returns 'unknown' for all documents after the rename. Fixed 13 migrations later by `1753400000000_fix_matview_column_refs`.

---

### 4. `1740014200000_fts_weights.js`

**Purpose:** Upgrades FTS triggers from flat to weighted (setweight A/B/C) for entities and documents. Drops and recreates the triggers from migration 2. Batch-backfills all existing rows.

**Tables modified:** entities (fts_vector), documents (fts_vector)

**Rollback:** Full `down` (restores unweighted triggers)  
**Drift flag:** Drops and recreates triggers from the previous migration. Not problematic since it's a forward upgrade, but establishes a pattern of trigger mutation.

---

### 5. `1740014300000_refresh_log.js`

**Purpose:** Creates `analytics_refresh_log` table to track materialized view refresh health. Seeds it with the 5 matview names. Tunes autovacuum settings on hot tables.

**Tables created:** analytics_refresh_log

**Rollback:** Full `down`  
**Drift flag:** None

---

### 6. `1740214400000_align_schema.js`

**Purpose:** Historical no-op placeholder. Original schema changes were applied in production but the original file was lost. Preserves migration chain continuity only.

**Tables modified:** None  
**Rollback:** No-op `up` and `down`  
**Drift flag:** MAJOR — name contains "align". The original file was lost. This is the first sign of schema drift: a migration was applied to production but not tracked in source control. The migrator has a special `HISTORICAL_PLACEHOLDER_RULES` entry for this. A second copy at timestamp 1741540000000 carries the actual content.

---

### 7. `1740214500000_align_schema_v2.js`

**Purpose:** Historical no-op placeholder. Comment says: "The canonical repo migration was later re-timestamped to `1741540000000_align_schema_v2.js` to avoid backdated ordering failures." Preserves ledger continuity only.

**Tables modified:** None  
**Rollback:** No-op  
**Drift flag:** MAJOR — name contains "align_v2". The real content lives at timestamp 1741540000000. This is the second placeholder, confirming the pattern of lost or re-timestamped migrations. The migrator has a `HISTORICAL_PLACEHOLDER_RULES` entry for this too.

---

### 8. `1740304500000_add_black_book.js`

**Purpose:** Creates `black_book_entries` table (missed in initial schema) with person_id FK to entities, phone/address/email fields, and associated indexes.

**Tables created:** black_book_entries

**Rollback:** Full `down`  
**Drift flag:** MINOR — "missed in initial schema" admission in the comment. This table should have been in migration 1.

---

### 9. `1741000000000_schema_compat_hotfix.js`

**Purpose:** Compatibility hotfix adding `collaborator_ids`, `created_at`, `updated_at` to `investigations`; `content_preview` and `created_at` to `documents`. Uses heavily guarded `IF NOT EXISTS` blocks throughout. Backfills `content_preview` from `content_refined` or `content` whichever exists, and `created_at` from `date_created` if it exists.

**Tables modified:** investigations (adds collaborator_ids, created_at, updated_at), documents (adds content_preview, created_at)

**Rollback:** Full guarded `down`  
**Drift flag:** CRITICAL — name explicitly says "hotfix" and "compat". References non-existent columns (`content_refined`, `date_created`) via conditional checks — the code probes for multiple possible column names because the actual schema state was uncertain. This is the clearest signal of schema drift at this point in time.

---

### 10. `1741000001000_strict_schema_clean.js`

**Purpose:** Large cleanup migration adding many columns to `documents` (original_file_id, original_file_path, failed_redaction columns, unredaction columns, etc.) and `entity_mentions` (doc_red_flag_rating, doc_date_created). Also creates `document_pages` (second time — `IF NOT EXISTS`), `redaction_spans`, `claim_triples` (second time — `IF NOT EXISTS`), `document_sentences` (second time — `IF NOT EXISTS`), and `media_item_people`.

**Tables modified/created:** documents (many columns), entity_mentions (2 columns), document_pages (IF NOT EXISTS — duplicate from migration 1), redaction_spans (new), claim_triples (IF NOT EXISTS — already existed from migration 1), document_sentences (IF NOT EXISTS — already existed from migration 1), media_item_people (new)

**Rollback:** Full `down`  
**Drift flag:** CRITICAL — name says "strict_schema_clean". Attempts to recreate tables already created in migration 1 using IF NOT EXISTS. The `claim_triples` in migration 1 has a different schema (more FK columns, `predicate`, `modality`) than the one attempted here (simpler, `claim_text`). The `document_sentences` schema also differs. This means the IF NOT EXISTS guard silently skips applying the alternate definition. Schema for these tables is ambiguous.

---

### 11. `1741000002000_ensure_articles_table.js`

**Purpose:** Creates `articles` table with `IF NOT EXISTS` guard.

**Tables created:** articles

**Rollback:** Full `down` with `ifExists: true`  
**Drift flag:** MODERATE — name starts with "ensure" (synonym for "IF NOT EXISTS uncertainty"). This table should have been in the initial schema or a proper additive migration.

---

### 12. `1741500000000_investigation_parity.js`

**Purpose:** Creates the `evidence` table (polymorphic), drops the old PK on `investigation_evidence` and adds new columns (id, evidence_id, relevance), creates `hypotheses`, `hypothesis_evidence`, `investigation_activity`, `investigation_notebook`, `investigation_timeline_events`, `chain_of_custody`.

**Tables created:** evidence, hypotheses, hypothesis_evidence, investigation_activity, investigation_notebook, investigation_timeline_events, chain_of_custody

**Tables modified:** investigation_evidence (drops PK pk_investigation_evidence, adds id/evidence_id/relevance columns)

**Rollback:** Full `down`  
**Drift flag:** MAJOR — name contains "parity". Drops and modifies `investigation_evidence` PK — destructive change. The `evidence` table is a new entity that partially overlaps with `documents` semantics.

---

### 13. `1741500000001_add_scope_investigations.js`

**Purpose:** Adds `scope` column to `investigations` using `ADD COLUMN IF NOT EXISTS`.

**Tables modified:** investigations

**Rollback:** Full `down` with `DROP COLUMN IF EXISTS`  
**Drift flag:** MINOR — uses IF NOT EXISTS pattern

---

### 14. `1741500000002_evidence_fts_and_junction.js`

**Purpose:** Creates `evidence_entity` junction table, adds `fts_vector` to `evidence`, creates FTS trigger for `evidence`, backfills.

**Tables created:** evidence_entity  
**Tables modified:** evidence (adds fts_vector)

**Rollback:** Full `down`  
**Drift flag:** None — clean additive migration

---

### 15. `1741500000003_evidence_schema_alignment.js`

**Purpose:** Adds ingested_at, modified_at, word_count, file_size to `evidence`; adds `role` to `media_item_people`; creates `media_item_tags` junction.

**Tables modified:** evidence (4 columns), media_item_people (role column)  
**Tables created:** media_item_tags

**Rollback:** Full `down`  
**Drift flag:** MODERATE — name contains "alignment". Columns that should have been on `evidence` from its creation (migration 12) are added here.

---

### 16. `1741500000004_final_schema_parity.js`

**Purpose:** Adds `cleaned_path` to `evidence`, adds `file_size` to `media_items`.

**Tables modified:** evidence (cleaned_path), media_items (file_size)

**Rollback:** Full `down`  
**Drift flag:** MODERATE — name says "final_schema_parity". Two more columns that should have been present at creation.

---

### 17. `1741510000000_create_web_vitals.js`

**Purpose:** Creates `web_vitals` table for frontend performance metrics.

**Tables created:** web_vitals

**Rollback:** Full `down`  
**Drift flag:** None

---

### 18. `1741520000000_repository_alignment.js`

**Purpose:** Large batch of `IF NOT EXISTS` column additions: community_id/junk_reason/title/junk_probability to `entities`; sentence_id/verified/verified_by/verified_at/rejection_reason to `entity_mentions`; verified columns to `claim_triples`; last_active to `users`; was_agentic to `entity_relationships`; agentic_model_id/extractor_versions to `ingest_runs`; width/height/date_taken to `media_items`.

**Tables modified:** entities (4 cols), entity_mentions (5 cols), claim_triples (4 cols), users (1 col), entity_relationships (1 col), ingest_runs (2 cols), media_items (3 cols)

**Rollback:** Full `down`  
**Drift flag:** MAJOR — name contains "alignment". The sheer number of columns added via IF NOT EXISTS means the actual production schema at this point was unknown — code was referencing these columns but they had never been migrated. The repetition of IF NOT EXISTS on nearly every statement is a clear sign the developer was not confident about what columns existed.

---

### 19. `1741520000001_repository_alignment_v2.js`

**Purpose:** Adds `junk_probability` to `entities` (again, IF NOT EXISTS) and `date_taken` to `media_items` (again, IF NOT EXISTS) — both were already in migration 18.

**Tables modified:** entities (junk_probability — duplicate), media_items (date_taken — duplicate)

**Rollback:** Full `down`  
**Drift flag:** MAJOR — name says "alignment_v2". Explicitly duplicates two of the IF NOT EXISTS additions from the immediately preceding migration. This is a secondary patch on a patch. Both columns were already covered by migration 18. The IF NOT EXISTS guards prevent actual harm but this file serves no purpose.

---

### 20. `1741530000000_articles_schema_fix.js`

**Purpose:** Adds `content`, `author`, `guid` (unique) columns to `articles`.

**Tables modified:** articles

**Rollback:** Full `down`  
**Drift flag:** MODERATE — name contains "fix". These columns should have been in migration 11 (`ensure_articles_table`).

---

### 21. `1741540000000_align_schema_v2.js`

**Purpose:** The "real" content of the placeholder at 1740214500000. Renames `mime_type` → `file_type`, `file_size_bytes` → `file_size`, `created_at` → `date_created` on `documents`. Renames `media_type` → `file_type` on `media_items`. Adds missing columns to `documents` (red_flag_rating, has_failed_redactions, is_hidden, evidence_type, content_refined, metadata_json, word_count) and `entities` (was_agentic, junk_flag). Creates `entity_adjacency` (IF NOT EXISTS) and `graph_cache_state` (IF NOT EXISTS).

**Tables modified:** documents (3 renames + 7 new cols), entities (2 cols), media_items (1 rename)  
**Tables created:** entity_adjacency, graph_cache_state

**Rollback:** Full `down` (reverses renames)  
**Drift flag:** CRITICAL — name contains "align" and "v2". This migration contains **destructive renames** of three core document columns (`mime_type → file_type`, `file_size_bytes → file_size`, `created_at → date_created`) and one media column (`media_type → file_type`). This is the migration that breaks `mv_docs_by_type` (which still references `mime_type`). This column rename cascades to `mv_timeline_data` as well, fixed in migration 33 (`fix_timeline_data_source`). All migrations before #21 that reference `mime_type`, `file_size_bytes`, or `created_at` on documents now reference renamed columns.

---

### 22. `1741550000000_backfill_media_file_type_from_path.js`

**Purpose:** Data backfill — sets `file_type` on `media_items` rows where it is null by inferring from `file_path` extension.

**Tables modified:** media_items (data only)

**Rollback:** Intentional no-op (irreversible backfill)  
**Drift flag:** MINOR — backfill needed because the column rename in migration 21 left NULL values

---

### 23. `1741560000000_backfill_documents_metadata_from_path.js`

**Purpose:** Large data backfill — sets `file_type` and `evidence_type` on `documents` rows where they are null, inferring from `file_name`/`file_path` extensions.

**Tables modified:** documents (data only)

**Rollback:** Intentional no-op  
**Drift flag:** MODERATE — needed because columns added by migration 21 had no data

---

### 24. `1741570000000_restore_flights_dataset.js`

**Purpose:** Creates `flights` and `flight_passengers` tables (IF NOT EXISTS), then bulk-inserts hundreds of flight records using `ON CONFLICT (id) DO NOTHING`. This is a data restore migration for production dataset loss.

**Tables created:** flights, flight_passengers

**Rollback:** Intentional no-op (historical prod data)  
**Drift flag:** MAJOR — name says "restore". Dataset was lost and needed to be re-seeded via migration. The `ON CONFLICT (id) DO NOTHING` pattern means this was intended to be re-runnable (idempotent insert, not upsert). Later superseded by migration 48 (`reconcile_restore_seed_conflicts`) which converts these to proper upserts.

---

### 25. `1741580000000_restore_properties_dataset.js`

**Purpose:** Creates `palm_beach_properties` table (IF NOT EXISTS), then bulk-inserts property records with `ON CONFLICT (id) DO NOTHING`.

**Tables created:** palm_beach_properties

**Rollback:** Intentional no-op  
**Drift flag:** MAJOR — name says "restore". Same pattern as #24.

---

### 26. `1741590000000_restore_global_timeline_events.js`

**Purpose:** Creates `global_timeline_events` table (IF NOT EXISTS) — a new table separate from `timeline_events` created in migration 1. Bulk-inserts curated timeline events with `ON CONFLICT (id) DO NOTHING`.

**Tables created:** global_timeline_events

**Rollback:** Intentional no-op  
**Drift flag:** MAJOR — name says "restore". **Creates a second timeline table** (`global_timeline_events`) alongside the existing `timeline_events` from migration 1. These are fundamentally different: `timeline_events` is entity-scoped (has `entity_id` FK), `global_timeline_events` is narrative/curatorial (has `title`, `source`, `significance` columns). However the existence of both creates confusion.

---

### 27. `1741600000000_restore_articles_dataset.js`

**Purpose:** Bulk-inserts article records into the `articles` table with `ON CONFLICT (id) DO NOTHING`. No schema changes.

**Tables modified:** articles (data only)

**Rollback:** Intentional no-op  
**Drift flag:** MAJOR — name says "restore". Data that was in production was lost and re-seeded via migration. Also calls `setval` on the articles sequence.

---

### 28. `1741610000000_restore_black_book_dataset.js`

**Purpose:** Bulk-inserts thousands of `black_book_entries` records with `ON CONFLICT (id) DO NOTHING`.

**Tables modified:** black_book_entries (data only)

**Rollback:** Intentional no-op  
**Drift flag:** MAJOR — name says "restore". Same pattern. References `entities` rows by id using subqueries.

---

### 29. `1741620000000_intelligence_pipeline_schema.js`

**Purpose:** Adds `error_message` to `ingest_runs`, creates `resolver_runs` table.

**Tables created:** resolver_runs  
**Tables modified:** ingest_runs (error_message)

**Rollback:** Full `down`  
**Drift flag:** None — clean additive migration

---

### 30. `1741620000001_add_evidence_count.js`

**Purpose:** Adds `evidence_count` integer column to `entities`.

**Tables modified:** entities (evidence_count)

**Rollback:** Full `down`  
**Drift flag:** None

---

### 31. `1741620000002_add_unique_entity_constraint.js`

**Purpose:** Creates a unique index on `entities(full_name, type)` to enable `ON CONFLICT` support during ingestion.

**Tables modified:** entities (adds unique index)

**Rollback:** Full `down`  
**Drift flag:** None — though notably this uses the `type` column (from initial schema) not `entity_type`. Both columns exist on `entities` from the beginning (migration 1 creates both).

---

### 32. `1741630000000_seed_canonical_epstein_timeline.js`

**Purpose:** Inserts curated timeline events into `global_timeline_events` using `ON CONFLICT (id) DO NOTHING`.

**Tables modified:** global_timeline_events (data only)

**Rollback:** Intentional no-op  
**Drift flag:** None — expected data seeding

---

### 33. `1741700000000_fix_timeline_data_source.js`

**Purpose:** Drops and recreates `mv_timeline_data` to use `date_created` instead of `created_at` (which was renamed in migration 21).

**Objects modified:** mv_timeline_data (drop and recreate)

**Rollback:** Full `down` (recreates using `created_at`)  
**Drift flag:** MAJOR — name contains "fix". This is the first direct consequence of the destructive column rename in migration 21. The matview was silently broken for all of the 12 migrations between #21 and this one.

---

### 34. `1741800000000_add_extracted_date.js`

**Purpose:** Adds `extracted_date` to `documents`, drops and recreates `mv_timeline_data` to prefer `COALESCE(extracted_date, date_created)`.

**Tables modified:** documents (extracted_date column)  
**Objects modified:** mv_timeline_data (3rd drop and recreate)

**Rollback:** Full `down`  
**Drift flag:** MINOR — this is the 3rd version of `mv_timeline_data`. The view has been recreated in migrations 3, 33, and 34. Each time it was adapted to follow the evolving column naming.

---

### 35. `1741900000000_add_document_hierarchy.js`

**Purpose:** Placeholder (empty up/down). Comment says "placeholder for already run migration".

**Tables modified:** None

**Rollback:** Empty  
**Drift flag:** MODERATE — another ghost migration. Content was applied to production outside the migration system and this placeholder preserves chain continuity.

---

### 36. `1749000000000_add_pipeline_version.js`

**Purpose:** Adds `pipeline_version`, `ingestion_run_id`, `hash_algo` to `documents`.

**Tables modified:** documents (3 columns)

**Rollback:** Full `down`  
**Drift flag:** None — ~7-month gap in timestamps between 35 and 36 (Feb to June 2025)

---

### 37. `1752100000000_refresh_token_rotation.js`

**Purpose:** Creates `refresh_tokens` table for JWT rotation support.

**Tables created:** refresh_tokens

**Rollback:** Full `down`  
**Drift flag:** None

---

### 38. `1753000000000_schema_sync_fixes.js`

**Purpose:** Adds `needs_review` and `manually_reviewed` columns to `entities` (referenced by SQL queries but never migrated); adds `original_file_path` to `evidence`; creates unique index on `articles.link` (required for `ON CONFLICT(link)`); creates unique index on `investigation_evidence(investigation_id, evidence_id)`.

**Tables modified:** entities (2 cols), evidence (1 col), articles (unique index), investigation_evidence (unique index)

**Rollback:** Full `down`  
**Drift flag:** CRITICAL — name contains "sync_fixes". Explicitly documents that columns were "referenced in SQL queries but never formally migrated to production." This is schema drift in its purest form: code was written and deployed before the migrations that support it were written.

---

### 39. `1753200000000_add_public_document_annotations.js`

**Purpose:** Creates `document_annotations` table with check constraints for annotation type.

**Tables created:** document_annotations

**Rollback:** Full `down`  
**Drift flag:** None — clean new feature

---

### 40. `1753300000000_add_investigation_evidence_annotations.js`

**Purpose:** Creates `investigation_evidence_annotations` table.

**Tables created:** investigation_evidence_annotations

**Rollback:** Full `down`  
**Drift flag:** None

---

### 41. `1753400000000_fix_matview_column_refs.js`

**Purpose:** Drops and recreates `mv_docs_by_type` to reference `file_type` instead of `mime_type`. Explicitly documents: "every refresh since then has silently failed, leaving the view frozen with stale data."

**Objects modified:** mv_docs_by_type (drop and recreate)

**Rollback:** Full `down`  
**Drift flag:** CRITICAL — name contains "fix". This is the direct consequence of migration 21's rename of `mime_type → file_type`. The matview was silently broken from migration 21 (timestamp ~1741540000000) until this migration (timestamp ~1753400000000) — approximately 12 months. Every analytics request for document type distribution returned stale/wrong data in that window.

---

### 42. `1753500000000_add_pipeline_tracking_tables.js`

**Purpose:** Creates `pipeline_runs` and `pipeline_steps` tables. Comment: "these tables were referenced in code but never formally migrated to production."

**Tables created:** pipeline_runs, pipeline_steps

**Rollback:** Full `down`  
**Drift flag:** MODERATE — tables referenced in code for "who knows how long" but never migrated. Similar pattern to migration 38.

---

### 43. `1753600000000_face_cluster_entity_link.js`

**Purpose:** Creates `face_clusters` and `faces` tables (IF NOT EXISTS), then adds `entity_id` FK column to `face_clusters`.

**Tables created:** face_clusters, faces

**Rollback:** Full `down`  
**Drift flag:** Minor — uses IF NOT EXISTS guards (dev schema may have had these already)

---

### 44. `1753700000000_file_assets.js`

**Purpose:** Creates `file_assets`, `document_assets`, and `media_assets` tables. Comment: "these tables were referenced by AssetService but were never formally migrated. Without them every document fails with 'relation file_assets does not exist'."

**Tables created:** file_assets, document_assets, media_assets  
**Tables modified:** documents (adds unredacted_span_json)

**Rollback:** Full `down`  
**Drift flag:** MAJOR — "every document fails" is a production breakage confession. Code was deployed referencing tables that didn't exist.

---

### 45. `1753800000000_document_pages_schema.js`

**Purpose:** Renames `document_pages.content` → `document_pages.extracted_text` to match `discoveryRepository.ts` inserts. Adds `ocr_confidence_avg` and `phash` columns.

**Tables modified:** document_pages (rename content→extracted_text, 2 new cols)

**Rollback:** Full `down`  
**Drift flag:** MAJOR — renames a column on a table that was created in migration 1. The code (discoveryRepository.ts) was inserting into `extracted_text` but the column was called `content`. This means all `document_pages` inserts had been failing silently since the beginning.

---

### 46. `1753900000000_boilerplate_phrases.js`

**Purpose:** Creates `boilerplate_phrases` table referenced by `discoveryRepository.addSentence()`.

**Tables created:** boilerplate_phrases

**Rollback:** Full `down`  
**Drift flag:** MINOR — same "code referenced missing table" pattern

---

### 47. `1753950000000_add_entity_red_flag_score.js`

**Purpose:** Adds `red_flag_score` (real) to `entities` using `IF NOT EXISTS` guard. Note: `entities` already has `red_flag_rating` (integer) from migration 1.

**Tables modified:** entities (red_flag_score)

**Rollback:** Full `down`  
**Drift flag:** MINOR — `red_flag_score` vs `red_flag_rating`: both exist on entities. The new column appears to be a float analogue of the existing integer column. Dual columns for related concepts on the same table.

---

### 48. `1754000000000_reconcile_restore_seed_conflicts.js`

**Purpose:** Reads the five `restore_*` migration files (24-28) at runtime and converts all `ON CONFLICT (id) DO NOTHING` inserts to full `ON CONFLICT (id) DO UPDATE SET ...` upserts, then re-runs them. This addresses the problem where the restore migrations silently ignored updates to existing rows.

**Tables modified:** flights, flight_passengers, palm_beach_properties, global_timeline_events, articles, black_book_entries (data only — upserts)

**Rollback:** Intentional no-op  
**Drift flag:** CRITICAL — name says "reconcile". This migration reads and re-executes other migration files at runtime. This is a meta-migration: it exists because the original restore migrations had the wrong conflict strategy. The migrator has a `HISTORICAL_PLACEHOLDER_RULES` entry noting this migration is "satisfied by" migration 49, suggesting even this reconcile was superseded.

---

### 49. `1754000000100_document_provenance.js`

**Purpose:** Adds 12 provenance-related columns to `documents` (content*sha256, normalized_text_sha256, source*\* columns, provenance_status, provenance_score, parent_document_id). Creates `document_provenance_events` event ledger table with FK to `pipeline_runs` and `file_assets`.

**Tables modified:** documents (12 columns)  
**Tables created:** document_provenance_events

**Rollback:** Full `down`  
**Drift flag:** MINOR — uses ADD COLUMN IF NOT EXISTS. The comment says "intentionally defensive because older environments in this repo have drifted schema history" — explicitly acknowledging known drift.

---

### 50. `1754100000000_add_doronin_vip.js`

**Purpose:** Upserts a specific entity (Vladislav Doronin) as a VIP entity using `DO $$ ... IF EXISTS ... UPDATE ... ELSE ... INSERT`.

**Tables modified:** entities (data only)

**Rollback:** Partial `down` (sets is_vip=0, doesn't delete)  
**Drift flag:** MINOR — using a migration to manage a single entity record is unusual. Rollback is incomplete (doesn't restore original values or delete the row if inserted).

---

### 51. `1754200000000_investigation_leads.js`

**Purpose:** Creates `investigation_leads` table.

**Tables created:** investigation_leads

**Rollback:** Full `down`  
**Drift flag:** None — clean new feature

---

### 52. `1754300000000_property_address_from_name.js`

**Purpose:** Data backfill — adds `address_source` column to `palm_beach_properties` and derives `site_address` from `owner_name_1` for ~544 rows where the owner name is an address-named LLC.

**Tables modified:** palm_beach_properties (address_source column + data backfill)

**Rollback:** Full `down`  
**Drift flag:** None — legitimate data enrichment migration

---

### 53. `1754400000000_strict_relational_foundations.js`

**Purpose:** Creates `forensic_signals`, `forensic_signal_entities`, `forensic_signal_evidence`, `investigation_collaborators`, `investigation_tags`, `investigation_tag_links`. Adds typed FK columns (doc_id, ent_id, lead_id) to `investigation_activity` and `audit_log`; (doc_id, ent_id) to `quality_flags`. All PK additions guarded with `IF NOT EXISTS` on constraint name check.

**Tables created:** forensic_signals, forensic_signal_entities, forensic_signal_evidence, investigation_collaborators, investigation_tags, investigation_tag_links  
**Tables modified:** investigation_activity (3 cols), audit_log (2 cols), quality_flags (2 cols)

**Rollback:** Full `down`  
**Drift flag:** None — substantial new feature block

---

### 54. `1754400000001_entity_resolution_support.js`

**Purpose:** Creates `entity_merge_candidates` table. Enables `pg_trgm` extension. Adds trigram indexes on `entities.full_name` and `flight_passengers.passenger_name`.

**Tables created:** entity_merge_candidates

**Rollback:** Full `down`  
**Drift flag:** None

---

### 55. `1754400000002_semantic_search_foundation.js`

**Purpose:** Conditionally enables `pgvector` extension and adds `content_embedding vector(384)` to `documents` and `description_embedding vector(384)` to `entities`, plus HNSW indexes. All inside a `DO $$ BEGIN IF EXISTS ... END $$` guard — skips silently if pgvector is not installed.

**Tables modified (conditional):** documents (content_embedding), entities (description_embedding)

**Rollback:** Full `down`  
**Drift flag:** MINOR — the silent-skip pattern means this migration may or may not have applied columns depending on the environment.

---

### 56. `1754500000000_add_media_text_flag.js`

**Purpose:** Adds `has_text` boolean to `media_items`.

**Tables modified:** media_items (has_text)

**Rollback:** Full `down`  
**Drift flag:** None

---

### 57. `1754600000000_add_pipeline_controls.js`

**Purpose:** Adds `control_signal` column to `pipeline_runs`.

**Tables modified:** pipeline_runs (control_signal)

**Rollback:** Full `down`  
**Drift flag:** None

---

### 58. `1754700000000_performance_hardening.js`

**Purpose:** Adds trigram indexes (CONCURRENTLY) on `documents` (file_name, file_path, source_collection, fts_vector, red_flag_rating, date_created) and `entities` (primary_role, aliases). Adds `calculated_rank_score` float column to `entities` with trigram index. Uses a helper function `hasColumn()` that queries information_schema at runtime.

**Tables modified:** documents (6 indexes added), entities (2 indexes + calculated_rank_score column)

**Rollback:** Full `down`  
**Drift flag:** MINOR — `hasColumn()` helper is unusual (runtime schema inspection in a migration). The `idx_documents_file_name_trgm` index created here uses `file_name gin_trgm_ops` while the worktree SQL version (043) uses `LOWER(COALESCE(file_name, '')) gin_trgm_ops` — these will not be the same index despite similar names.

---

### 59. `1754800000000_api_query_perf_hotfix.js`

**Purpose:** Adds composite index `idx_documents_redflag_coalesced_date`, partial index `idx_documents_default_list_nonmedia`, and re-adds entity_mentions and media indexes (CONCURRENTLY). Note: `idx_entities_full_name_trgm` added here (without LOWER/COALESCE) likely conflicts with the worktree 044 index.

**Tables modified:** documents (2 indexes), entity_mentions (1 index), media_item_people (1 index), media_items (1 index), entities (1 index)

**Rollback:** Full `down`  
**Drift flag:** MAJOR — name explicitly says "hotfix". Created to address performance regressions in the API query path.

---

### 60. `1754900000000_add_graph_metadata_to_cache.js`

**Purpose:** Adds `risk_score` and `confidence` columns to `entity_adjacency`.

**Tables modified:** entity_adjacency (2 columns)

**Rollback:** Full `down`  
**Drift flag:** None

---

### 61. `1755000000000_add_pdf_coordinates_to_annotations.js`

**Purpose:** Adds `pdf_page`, `pdf_x`, `pdf_y`, `pdf_width`, `pdf_height` to `document_annotations`.

**Tables modified:** document_annotations (5 columns)

**Rollback:** Full `down`  
**Drift flag:** None

---

### 62. `1755100000000_investigator_iceberg.js`

**Purpose:** Creates `danger_motif_findings`, `danger_motif_evidence`, `evidence_chain_items` tables.

**Tables created:** danger_motif_findings, danger_motif_evidence, evidence_chain_items

**Rollback:** Full `down` with `ifExists: true`  
**Drift flag:** None — new feature block

---

### 63. `1755200000000_entity_network_signals.js`

**Purpose:** Adds `significance_score` float to `documents`. Creates `entity_connection_signals` materialized view WITH NO DATA (populated by an external compute script). Creates unique index CONCURRENTLY on the view.

**Tables modified:** documents (significance_score)  
**Objects created:** entity_connection_signals (materialized view, empty)

**Rollback:** Full `down`  
**Drift flag:** None — though creating a matview WITH NO DATA and depending on an external script for population is an operational pattern worth noting.

---

### 64. `1755300000000_add_wired_article_and_album.js`

**Purpose:** Upserts a specific Wired article (id=34) into `articles`, a media album (id=10) into `media_albums`, and a cover image into `media_items`. Uses `ON CONFLICT (id) DO UPDATE SET ...` (proper upsert). Updates sequences.

**Tables modified:** articles (1 row), media_albums (1 row), media_items (1 row)

**Rollback:** Full `down` (deletes the 3 rows)  
**Drift flag:** MINOR — using migrations to manage individual content records. Rollback works correctly here.

---

## Drift Indicators

### Count by category

| Category            | Count | Migration numbers  |
| ------------------- | ----- | ------------------ |
| "align" in name     | 5     | 6, 7, 15, 18, 21   |
| "parity" in name    | 3     | 12, 16, 26\*       |
| "hotfix" in name    | 2     | 9, 59              |
| "compat" in name    | 1     | 9                  |
| "fix" in name       | 3     | 20, 33, 41, 45     |
| "restore" in name   | 5     | 24, 25, 26, 27, 28 |
| "sync" in name      | 2     | 38, 48\*           |
| "ensure" in name    | 1     | 11                 |
| "reconcile" in name | 1     | 48                 |

**Total distinct drift-signal migrations: 22 out of 64 (34%)**

\* Some migrations fall under multiple categories.

### Most significant drift events

**1. The Column Rename Cascade (migration 21)**
`1741540000000_align_schema_v2` renamed `mime_type → file_type`, `file_size_bytes → file_size`, `created_at → date_created` on `documents`. This silently broke:

- `mv_docs_by_type` (used `mime_type`) — broken for ~12 months, fixed in migration 41
- `mv_timeline_data` (used `created_at`) — broken from migration 21, partially fixed in migration 33, fully addressed in migration 34

**2. The Lost Migration Files (migrations 6, 7)**
Two migrations (`1740214400000_align_schema`, `1740214500000_align_schema_v2`) were applied to production but the source files were deleted from the repository. Replaced with no-op placeholders. The migrator carries hardcoded reconciliation rules for both. This means production had schema changes that cannot be reviewed.

**3. Code-Before-Migration Pattern (migrations 38, 44, 46, 47)**
Multiple migrations contain admissions that referenced tables/columns didn't exist when code was deployed:

- Migration 38: "`needs_review`/`manually_reviewed` referenced by black_book.sql but never migrated"
- Migration 44: "`file_assets` does not exist" — every document was failing
- Migration 45: `document_pages.content` should have been `extracted_text` — all inserts were failing
- Migration 46: `boilerplate_phrases` referenced but missing

**4. The Restore Series (migrations 24-28, 48)**
Five migrations bulk-insert production dataset rows that were lost. A 6th migration (48) had to retroactively convert those inserts to upserts because the original `ON CONFLICT DO NOTHING` strategy was wrong. The root cause is unclear — likely a database reset or failed backup/restore operation in January 2026.

**5. IF NOT EXISTS Overuse**
Migrations 9, 10, 11, 18, 19, 21, 22, 37, 38, 42, 44, 45, 47, 49, 53, 54, 55, 58, 59 all use `IF NOT EXISTS` or `IF NOT EXISTS` guarded column additions — **19 out of 64 migrations (30%)**. This pattern signals the developer was uncertain about the actual schema state when writing the migration, which is a fundamental breakdown of the migration system's guarantees.

**6. Ghost/Placeholder Migrations**
Three migrations have empty or no-op up/down functions for chains that were applied outside the system:

- Migration 6: `1740214400000_align_schema` — lost file
- Migration 7: `1740214500000_align_schema_v2` — re-timestamped to 1741540000000
- Migration 35: `1741900000000_add_document_hierarchy` — "already run migration"

---

## Rollback Coverage Summary

| Category                                            | Count | Percentage |
| --------------------------------------------------- | ----- | ---------- |
| Full proper `down` function                         | 47    | 73%        |
| Intentional no-op `down` (data backfills, restores) | 7     | 11%        |
| Empty/placeholder `down`                            | 4     | 6%         |
| Partial `down` (incomplete reverse)                 | 2     | 3%         |
| Other (conditional, no-op comment)                  | 4     | 6%         |

**Migrations with intentional no-op rollback** (irreversible by design):

- 22 `backfill_media_file_type_from_path` — data backfill
- 23 `backfill_documents_metadata_from_path` — data backfill
- 24 `restore_flights_dataset` — historical data
- 25 `restore_properties_dataset` — historical data
- 26 `restore_global_timeline_events` — historical data
- 27 `restore_articles_dataset` — historical data
- 28 `restore_black_book_dataset` — historical data
- 48 `reconcile_restore_seed_conflicts` — meta upsert

**Migrations with incomplete rollback:**

- Migration 50 `add_doronin_vip` — `down` sets `is_vip = 0` but does not delete the entity if it was inserted by the `up`
- Migration 64 `add_wired_article_and_album` — `down` deletes by hard-coded IDs; works if IDs haven't been reassigned

**Critical migrations lacking rollback:**

- Migration 6/7/35 (placeholders — no content to roll back anyway)
- Migration 32 `seed_canonical_epstein_timeline` — explicitly no-op (historical seed data)

**High-risk migrations that DO have rollback but are dangerous to execute:**

- Migration 21 `align_schema_v2` — column renames; rolling back would re-break the matviews
- Migration 12 `investigation_parity` — drops a PK constraint in `up`; `down` drops columns but doesn't re-add the original PK

---

## Table Lifecycle Tracking

### `mentions` vs `entity_mentions`

| Timestamp     | Event                                                                                                                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1740013800000 | **Both created in migration 1.** `entity_mentions` is the "rich" table (entity_id FK, confidence, span, context). `mentions` is the "raw NER" table (span_id FK into document_spans, normalised_text, ner_model). They serve different purposes but co-exist from the start. |
| 1740014000000 | `entity_mentions` gets new indexes                                                                                                                                                                                                                                           |
| 1741000001000 | `entity_mentions` gets `doc_red_flag_rating`, `doc_date_created` columns                                                                                                                                                                                                     |
| 1741520000000 | `entity_mentions` gets 5 more columns (sentence_id, verified, verified_by, verified_at, rejection_reason)                                                                                                                                                                    |
| 1753000000000 | `entity_mentions` referenced by SQL that didn't exist yet (needs_review)                                                                                                                                                                                                     |
| 1754800000000 | `entity_mentions` gets new performance index                                                                                                                                                                                                                                 |

**Current state:** Both `mentions` and `entity_mentions` exist. `mentions` appears unused by the repository layer (no migration adds columns post-initial-creation; it references `document_spans` via span_id FK). `entity_mentions` is the actively evolved table.

### `relations` vs `entity_relationships`

| Timestamp     | Event                                                                                                                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1740013800000 | **Both created in migration 1.** `entity_relationships` is the graph edge table (source/target FKs, strength, confidence, PK composite). `relations` is the "standard shape" table (id text PK, subject/object FKs, predicate, direction, weight). |
| 1740014000000 | `entity_relationships` gets indexes                                                                                                                                                                                                                |
| 1741520000000 | `entity_relationships` gets `was_agentic` column                                                                                                                                                                                                   |
| 1754400000000 | `entity_relationships` referenced in `entity_connection_signals` matview                                                                                                                                                                           |
| 1755200000000 | `entity_relationships` used in `entity_connection_signals` UNION                                                                                                                                                                                   |

**Current state:** Both exist. `relations` has `relation_evidence` as a child table (also from migration 1). `entity_relationships` is the one actively used for graph queries. `relations` appears to be dormant — no post-migration-1 changes.

### `timeline_events` vs `global_timeline_events`

| Timestamp     | Event                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1740013800000 | `timeline_events` created — entity-scoped (has `entity_id` FK, `event_date`, `event_type`)                               |
| 1741590000000 | `global_timeline_events` created — narrative/curated (has `title`, `date`, `significance`, `source`, `entities` as text) |
| 1741630000000 | `global_timeline_events` seeded with canonical events                                                                    |
| 1754000000000 | `global_timeline_events` data reconciled (upserts)                                                                       |

**Current state:** Both exist. `timeline_events` is entity-granularity (pipeline-extracted events per entity). `global_timeline_events` is curated editorial timeline content. These are semantically distinct but the naming similarity is confusing.

### `document_pages` (lifecycle)

| Timestamp     | Event                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1740013800000 | Created in migration 1: id, document_id, page_number, content, signal_score, ocr_quality_score, text_source, created_at                             |
| 1741000001000 | `CREATE TABLE IF NOT EXISTS document_pages` — different schema (simpler: page_path, page_url, no content/signal columns). IF NOT EXISTS skips this. |
| 1753800000000 | Renames `content` → `extracted_text` to match repository code. Adds ocr_confidence_avg, phash.                                                      |

**Current state:** One `document_pages` table exists with the original migration 1 schema (now with content renamed to extracted_text). The migration 10 attempt to create a simpler version was silently skipped. The `signal_score`, `ocr_quality_score`, `text_source` columns from migration 1 remain but may be unused by current repository code (which targets `extracted_text`, `ocr_confidence_avg`, `phash`).

### `file_assets` vs `document_assets`

| Timestamp     | Event                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1753700000000 | Both created together in `file_assets` migration. `file_assets` is the deduplicated file registry (keyed by SHA-256). `document_assets` is an M:N junction between documents and file_assets. |

**Current state:** These were created together and serve distinct purposes — no duplication concern here.

---

## Conflicts and Redundancies Between Migrations

### 1. Column name collision: `unredaction_attempted` and `unredaction_succeeded`

Migration 1 (`initial_schema`) creates `documents.unredaction_attempted` as **integer** and `documents.unredaction_succeeded` as **integer**.

Migration 10 (`strict_schema_clean`) attempts to add `unredaction_attempted` as **BOOLEAN** and `unredaction_succeeded` as **BOOLEAN** using IF NOT EXISTS. The IF NOT EXISTS guard fires (columns exist) so the BOOLEAN versions are never created. The columns remain integers.

**Impact:** Code that expects booleans for these fields receives integers. Both conventions exist in different migration versions.

### 2. `document_pages` schema conflict

Migration 1 creates `document_pages` with `content`, `signal_score`, `ocr_quality_score`, `text_source` columns.  
Migration 10 attempts to create `document_pages` with `page_path`, `page_url` columns (no content column). IF NOT EXISTS skips it.  
Migration 45 renames `content → extracted_text` and adds `ocr_confidence_avg`, `phash`.

**Impact:** The current table has migration-1's columns with `content` renamed to `extracted_text`. The `page_path` and `page_url` columns from migration 10's attempt never exist. Code expecting `page_path` or `page_url` will fail.

### 3. `claim_triples` schema conflict

Migration 1 creates `claim_triples` with: subject_entity_id, predicate, object_entity_id, object_text, document_id, sentence_id, confidence, modality, evidence_json, created_at.  
Migration 10 attempts `CREATE TABLE IF NOT EXISTS claim_triples` with a different schema (no predicate, no object_text, adds claim_text). IF NOT EXISTS skips.

**Impact:** The live table has migration 1's richer schema. Code that only uses the simpler migration-10 schema (e.g., using `claim_text`) will find the column absent.

### 4. `document_sentences` schema conflict

Migration 1 creates `document_sentences` with page_id FK, sentence_text, sentence_index, signal_score, is_boilerplate (integer).  
Migration 10 attempts to create with a different schema (no page_id FK, `is_boilerplate` as BOOLEAN, different defaults). IF NOT EXISTS skips.

**Impact:** Live table has migration 1's schema. `page_id` is a FK that migration 10 would have omitted. Any code written against migration 10's simpler version is missing the FK column.

### 5. Duplicate column additions (migrations 18 and 19)

`entities.junk_probability` and `media_items.date_taken` are added with IF NOT EXISTS in migration 18 and then attempted again in migration 19. Migration 19 is entirely redundant.

### 6. `entity_relationship` indexes duplicated

`idx_entity_mentions_entity_document` is created in migration 59 (`api_query_perf_hotfix`). Migration 2 (`perf_indexes`) already creates `idx_em_doc_entity ON entity_mentions (document_id, entity_id)` — same columns, different order, different index name. Both indexes exist, covering the same access pattern.

### 7. `mv_timeline_data` recreated 4 times

Migration 3 (create), migration 33 (fix column ref), migration 34 (add extracted_date preference), migration 36 (not directly, but references it). The view has evolved through 3 distinct SQL definitions as the underlying column names changed.

### 8. Trigram index name collision between `performance_hardening` and `api_query_perf_hotfix`

Migration 58 creates `idx_entities_full_name_trgm ON entities USING gin (full_name gin_trgm_ops)`.  
Migration 59 also creates `idx_entities_full_name_trgm ON entities USING gin (full_name gin_trgm_ops)`.  
Both use `IF NOT EXISTS` so the second is a no-op, but they are identical — migration 59 adds nothing for this specific index.

The worktree SQL version (044) uses `LOWER(COALESCE(full_name, '')) gin_trgm_ops` — a different expression that would catch NULLs and uppercase. The production version does not have this normalization.

### 9. `has_failed_redactions` type conflict

Migration 1 doesn't include this column.  
Migration 10 adds it as **BOOLEAN DEFAULT FALSE**.  
Migration 21 adds it as **INTEGER DEFAULT 0** via IF NOT EXISTS. Since migration 10 ran first and added the column as BOOLEAN, migration 21's IF NOT EXISTS guard fires and the column remains BOOLEAN.

However migration 1 does **not** create this column, so it depends entirely on which of migrations 10 or 21 ran first. On the canonical chain (10 before 21), it's BOOLEAN.

---

## Worktree Migration Orphans

The `ds-foundation` worktree contains a legacy SQL migration system at `.worktrees/ds-foundation/src/server/db/migrations/` — a parallel set of numbered `.sql` files (040–044) that were **never ported** to the main node-pg-migrate `.js` format.

### Orphaned SQL migrations

**`040_phase6_adjacency_cache.sql`**  
Creates `entity_adjacency` (SQLite-style `DATETIME` type — this is SQLite syntax, not PostgreSQL!) and `graph_cache_state`. The PostgreSQL equivalent was integrated into migration 21 (`align_schema_v2`) via `CREATE TABLE IF NOT EXISTS entity_adjacency`. However the SQLite version uses `DATETIME` and `INSERT OR IGNORE` — syntax that would fail on PostgreSQL. **This file was never intended for the PostgreSQL migration system and was part of an earlier SQLite phase.**

**`041_face_cluster_entity_link.sql`**  
Adds `entity_id` FK to `face_clusters`. This was later ported as migration 43 (`face_cluster_entity_link.js`). The SQL file is an orphaned precursor.

**`042_entity_mentions_dedup_constraint.sql`**  
Adds `UNIQUE INDEX CONCURRENTLY uq_entity_mentions_entity_doc_surface ON entity_mentions (entity_id, document_id, surface_text)`. **This constraint does NOT exist in any `.js` migration.** It was never ported. The `entity_mentions` table in production has no unique constraint on this tuple, meaning duplicate extraction runs can insert duplicate rows.

**`043_documents_trigram_index.sql`**  
Creates trigram GIN indexes on `file_name`, `file_path`, `original_file_path` using `LOWER(COALESCE(column, '')) gin_trgm_ops`. Migration 58 and 59 create similar indexes but without the LOWER/COALESCE normalization. The worktree also indexes `original_file_path` which migration 58/59 do not.

**`044_entities_trigram_index.sql`**  
Creates trigram indexes on `full_name` and `aliases` using `LOWER(COALESCE(column, '')) gin_trgm_ops`. Migration 58/59 create similar indexes without the LOWER/COALESCE normalization.

### Summary of orphaned state

The `042_entity_mentions_dedup_constraint.sql` orphan is the most impactful: a uniqueness constraint on `entity_mentions` that prevents duplicate NER extractions was designed and committed to the worktree but never migrated to the main system. The remaining orphans (043, 044) were partially ported but with different index expressions. Migration 040 was from a SQLite phase and should be treated as dead code.

---

## Migrator Architecture Notes

`src/server/db/migrator.ts` does **not** run migrations. It is a **parity checker**, not a runner. Its behavior:

1. **`reconcileHistoricalMigrationLedger()`** — Checks `pgmigrations` for missing placeholder entries. If `1740214400000_align_schema` is missing but `1741540000000_align_schema_v2` is present, it synthesizes a ledger entry for the missing one (with `run_on` set 1 second before the anchor). Handles 3 specific rules:
   - `1740214400000_align_schema` satisfied by either of the v2 migrations
   - `1740214500000_align_schema_v2` satisfied by `1741540000000_align_schema_v2`
   - `1754000000000_reconcile_restore_seed_conflicts` satisfied by `1754000000100_document_provenance`

2. **`runMigrations()`** — Compares the list of `.js` files on disk to the `pgmigrations` table. If any pending migrations exist, **throws an error** and refuses to boot. This is a "fail closed" guard.

3. **No automatic migration execution.** Migrations must be run manually via `pnpm db:migrate:pg` (which invokes node-pg-migrate directly). The migrator only verifies parity at server startup.

The hardcoded `HISTORICAL_PLACEHOLDER_RULES` array is itself a drift artifact — it documents three specific cases where the migration chain needed duct tape to stay consistent.

---

## Overall Health Assessment

### The codebase evolved through three distinct phases, each with characteristic drift patterns:

**Phase 1: Initial construction (migrations 1–11, Feb 2026)**
The first 11 migrations show a schema being designed and immediately revised. Migration 1 creates ~25 tables in one go, but by migration 5 the first "align" migration appears. Migrations 6 and 7 are placeholder stubs for files that were applied but never committed. This phase ends with `schema_compat_hotfix` — a migration whose name describes the situation perfectly.

**Phase 2: Feature acceleration with deferred migration hygiene (migrations 12–36, Feb–Apr 2026)**
The investigation, evidence, media, and repository alignment series shows a team shipping features faster than they were writing migrations. The critical `align_schema_v2` (migration 21) introduces a destructive column rename that silently breaks two materialized views. Five "restore" migrations suggest a data loss event in January 2026. `repository_alignment` and `repository_alignment_v2` are back-to-back patches on the same problem.

**Phase 3: Stabilization and new feature work (migrations 37–64, mid-2025 to May 2026)**
A large time gap (~7 months) separates migration 36 from 37. When development resumes, the team discovers and fixes several longstanding issues: the broken matview (migration 41), missing pipeline tables (migration 42), missing file_assets (migration 44), wrong document_pages column name (migration 45). This phase also introduces substantial new features (annotations, face clustering, forensic signals, semantic search, network signals) in a more disciplined way.

### Key risk areas

1. **`document_pages.content` was renamed to `extracted_text` in migration 45.** All repository code that ran between migrations 1 and 45 that inserted into `document_pages` was silently failing. Page data is likely missing or sparse.

2. **`mv_docs_by_type` was silently broken for approximately 12 months** (between migration 21 in ~Feb 2026 and migration 41 in ~May 2026, though timestamps suggest this is compressed — checking the 4-digit millisecond spacing, the breakage window was likely production days or weeks).

3. **`entity_mentions` has no dedup constraint**. The orphaned migration `042_entity_mentions_dedup_constraint.sql` was never ported. Repeated ingest runs can produce duplicate mention rows.

4. **Two separate table pairs exist for the same conceptual domain**: `mentions`/`entity_mentions`, `relations`/`entity_relationships`. The "simple" tables (`mentions`, `relations`) appear dormant but are not dropped, creating schema noise and potential for confusion.

5. **The `reconcile_restore_seed_conflicts` migration (48) reads other migration files at runtime** using `fs.readFileSync`. This is a fragile pattern — it depends on the filesystem having the exact files at the expected relative path. If migration files are moved or deleted, this migration becomes non-repeatable.

6. **Three migrations are empty stubs** (6, 7, 35) for changes that were applied to production outside the migration system. The content of these changes is unrecoverable from the migration history.

7. **The `pgvector` semantic search migration (55) silently no-ops** on environments without the extension. Production and development environments may have divergent schemas depending on whether pgvector is installed.

8. **`entities` has both `red_flag_rating` (integer, from migration 1) and `red_flag_score` (real/float, from migration 47).** These appear to be parallel scoring fields that co-exist without documented relationship between them.
