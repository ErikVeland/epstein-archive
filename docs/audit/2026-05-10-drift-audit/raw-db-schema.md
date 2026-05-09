# Raw DB Schema Audit — 2026-05-10

**Database:** `postgresql://epstein:epstein@localhost:5435/epstein_archive`  
**Audit run:** 2026-05-10  
**Schema:** `public`  
**Total tables:** 76  
**Total indexes:** 227  
**Materialized views:** 5  
**Regular views:** 1 (`v_investigative_signals` + `entity_connection_signals` matview)

---

## 1. Full Table Inventory — Sizes and Row Counts

> `est_rows` comes from `pg_class.reltuples` (planner stats; -1 = not yet analyzed). `total_size` includes indexes.

| table                              | total_size | est_rows                         |
| ---------------------------------- | ---------- | -------------------------------- |
| documents                          | 6372 MB    | 1,419,851                        |
| document_provenance_events         | 1478 MB    | 1,780,138                        |
| entities                           | 1300 MB    | 524,215                          |
| entity_mentions                    | 1260 MB    | 2,793,566                        |
| document_sentences                 | 1090 MB    | 3,877,543                        |
| processing_jobs                    | 470 MB     | 1,093,714                        |
| entity_relationships               | 381 MB     | 1,669,452                        |
| claim_triples                      | 197 MB     | 713,318                          |
| entity_adjacency                   | 162 MB     | 1,668,483                        |
| document_spans                     | 144 MB     | 1,385,215                        |
| media_items                        | 121 MB     | 117,276 (actual: 98,952)         |
| black_book_entries                 | 49 MB      | 216,932                          |
| forensic_signals                   | 40 MB      | 1 (actual: 1 row)                |
| document_pages                     | 40 MB      | 254,776                          |
| media_item_tags                    | 36 MB      | 196,387                          |
| relation_evidence                  | 8880 kB    | 15,082                           |
| entity_evidence_types              | 8336 kB    | 110,563 (actual: 110,563)        |
| boilerplate_phrases                | 8160 kB    | 15,586                           |
| file_assets                        | 7656 kB    | 13,942 (actual: 14,581)          |
| palm_beach_properties              | 6856 kB    | 9,535                            |
| relations                          | 2784 kB    | 11,562 (actual: 11,721)          |
| media_albums                       | 2784 kB    | 13,781                           |
| faces                              | 2592 kB    | 406                              |
| document_assets                    | 1504 kB    | 12,623 (actual: 13,110)          |
| financial_transactions             | 488 kB     | 1,275                            |
| global_timeline_events             | 264 kB     | 388 (actual: 416)                |
| flight_passengers                  | 224 kB     | 305                              |
| articles                           | 168 kB     | 32                               |
| pipeline_runs                      | 144 kB     | 49                               |
| investigation_leads                | 112 kB     | 1 (actual count via JOIN needed) |
| flights                            | 104 kB     | 110                              |
| evidence                           | 104 kB     | -1 (actual: 11)                  |
| media_item_people                  | 80 kB      | 7                                |
| investigation_notebook             | 80 kB      | -1                               |
| danger_motif_findings              | 64 kB      | -1                               |
| investigation_timeline_events      | 64 kB      | 23                               |
| evidence_types                     | 48 kB      | 3                                |
| face_clusters                      | 48 kB      | 10                               |
| pipeline_steps                     | 48 kB      | 4                                |
| investigations                     | 48 kB      | 3                                |
| investigation_evidence             | 48 kB      | -1 (actual: 11)                  |
| audit_log                          | 48 kB      | -1                               |
| media_tags                         | 48 kB      | 17                               |
| collections                        | 48 kB      | 5                                |
| users                              | 48 kB      | 3                                |
| refresh_tokens                     | 40 kB      | -1                               |
| web_vitals                         | 40 kB      | -1                               |
| investigation_activity             | 40 kB      | -1                               |
| resolver_runs                      | 32 kB      | 28                               |
| ingest_runs                        | 32 kB      | 42                               |
| danger_motif_evidence              | 32 kB      | -1                               |
| hypothesis_evidence                | 32 kB      | -1 (actual: 9)                   |
| quality_flags                      | 32 kB      | -1                               |
| hypotheses                         | 32 kB      | -1 (actual: 1)                   |
| analytics_refresh_log              | 32 kB      | 5                                |
| evidence_chain_items               | 24 kB      | -1                               |
| document_annotations               | 24 kB      | -1                               |
| redaction_spans                    | 24 kB      | -1                               |
| investigation_tags                 | 24 kB      | -1                               |
| entity_merge_candidates            | 24 kB      | -1 (actual: 0)                   |
| evidence_entity                    | 24 kB      | -1 (actual: 0)                   |
| investigation_evidence_annotations | 24 kB      | -1                               |
| pgmigrations                       | 24 kB      | 46                               |
| media_assets                       | 24 kB      | -1 (actual: 0)                   |
| document_collections               | 24 kB      | -1                               |
| graph_cache_state                  | 24 kB      | 1                                |
| timeline_events                    | 16 kB      | -1 (actual: 0)                   |
| forensic_signal_evidence           | 16 kB      | -1                               |
| media_album_items                  | 16 kB      | -1                               |
| migration_watermarks               | 16 kB      | -1                               |
| investigation_collaborators        | 16 kB      | -1                               |
| forensic_signal_entities           | 16 kB      | -1                               |
| resolution_candidates              | 16 kB      | -1 (actual: 0)                   |
| chain_of_custody                   | 16 kB      | -1                               |
| mentions                           | 16 kB      | -1 (actual: 0)                   |
| investigation_tag_links            | 8192 bytes | -1                               |

---

## 2. Full Column Listing Per Table

### analytics_refresh_log

| column       | type      | nullable | default   |
| ------------ | --------- | -------- | --------- |
| view_name    | text      | NO       |           |
| refreshed_at | timestamp | NO       | now()     |
| duration_ms  | integer   | NO       | 0         |
| status       | text      | NO       | 'pending' |

### articles

| column          | type        | nullable | default           |
| --------------- | ----------- | -------- | ----------------- |
| id              | bigint      | NO       | seq               |
| title           | text        | NO       |                   |
| link            | text        | YES      |                   |
| url             | text        | YES      |                   |
| source          | text        | YES      |                   |
| publication     | text        | YES      |                   |
| pub_date        | timestamptz | YES      |                   |
| published_date  | timestamptz | YES      |                   |
| description     | text        | YES      |                   |
| summary         | text        | YES      |                   |
| tags            | text        | YES      |                   |
| red_flag_rating | integer     | YES      | 0                 |
| image_url       | text        | YES      |                   |
| reading_time    | text        | YES      |                   |
| created_at      | timestamptz | NO       | CURRENT_TIMESTAMP |
| updated_at      | timestamptz | NO       | CURRENT_TIMESTAMP |
| content         | text        | YES      |                   |
| author          | text        | YES      |                   |
| guid            | text        | YES      |                   |

**Red flag:** `link` and `url` are semantically identical — all 33 rows have `link` populated, `url` is 100% NULL. `pub_date` and `published_date` are also duplicates — `published_date` is 100% NULL, `pub_date` has 32/33 rows set.

### audit_log

| column       | type      | nullable | default           |
| ------------ | --------- | -------- | ----------------- |
| id           | bigint    | NO       | seq               |
| timestamp    | timestamp | YES      | CURRENT_TIMESTAMP |
| actor_id     | text      | YES      |                   |
| action       | text      | NO       |                   |
| target_type  | text      | YES      |                   |
| target_id    | text      | YES      |                   |
| payload_json | jsonb     | YES      |                   |
| ip_address   | text      | YES      |                   |
| user_agent   | text      | YES      |                   |
| doc_id       | bigint    | YES      | FK→documents      |
| ent_id       | bigint    | YES      | FK→entities       |

### black_book_entries

| column          | type      | nullable | default           |
| --------------- | --------- | -------- | ----------------- |
| id              | integer   | NO       | seq               |
| person_id       | bigint    | YES      | FK→entities       |
| entry_text      | text      | YES      |                   |
| phone_numbers   | text      | YES      |                   |
| addresses       | text      | YES      |                   |
| email_addresses | text      | YES      |                   |
| notes           | text      | YES      |                   |
| page_number     | integer   | YES      |                   |
| document_id     | bigint    | YES      | FK→documents      |
| entry_category  | text      | YES      | 'original'        |
| created_at      | timestamp | YES      | CURRENT_TIMESTAMP |

### boilerplate_phrases

| column               | type        | nullable | default     |
| -------------------- | ----------- | -------- | ----------- |
| id                   | bigint      | NO       | seq         |
| sentence_hash        | text        | NO       |             |
| sentence_text_sample | text        | YES      |             |
| frequency            | integer     | NO       | 1           |
| status               | text        | NO       | 'candidate' |
| created_at           | timestamptz | NO       | now()       |

### chain_of_custody

| column      | type      | nullable | default           |
| ----------- | --------- | -------- | ----------------- |
| id          | bigint    | NO       | seq               |
| evidence_id | bigint    | YES      | FK→evidence       |
| date        | timestamp | YES      | CURRENT_TIMESTAMP |
| actor       | text      | YES      |                   |
| action      | text      | YES      |                   |
| notes       | text      | YES      |                   |
| signature   | text      | YES      |                   |

### claim_triples

| column            | type      | nullable | default           |
| ----------------- | --------- | -------- | ----------------- |
| id                | bigint    | NO       | seq               |
| subject_entity_id | bigint    | YES      | FK→entities       |
| predicate         | text      | YES      |                   |
| object_entity_id  | bigint    | YES      | FK→entities       |
| object_text       | text      | YES      |                   |
| document_id       | bigint    | YES      | FK→documents      |
| sentence_id       | bigint    | YES      |                   |
| confidence        | real      | YES      | 0.5               |
| modality          | text      | YES      | 'asserted'        |
| evidence_json     | jsonb     | YES      |                   |
| created_at        | timestamp | YES      | CURRENT_TIMESTAMP |
| verified          | integer   | YES      | 0                 |
| verified_by       | text      | YES      |                   |
| verified_at       | timestamp | YES      |                   |
| rejection_reason  | text      | YES      |                   |

### collections

| column        | type      | nullable | default           |
| ------------- | --------- | -------- | ----------------- |
| id            | bigint    | NO       | seq               |
| name          | text      | NO       |                   |
| description   | text      | YES      |                   |
| metadata_json | jsonb     | YES      |                   |
| created_at    | timestamp | YES      | CURRENT_TIMESTAMP |
| updated_at    | timestamp | YES      | CURRENT_TIMESTAMP |

### danger_motif_evidence

| column        | type      | nullable | default                  |
| ------------- | --------- | -------- | ------------------------ |
| id            | bigint    | NO       | seq                      |
| finding_id    | bigint    | NO       | FK→danger_motif_findings |
| document_id   | bigint    | YES      | FK→documents             |
| source_type   | text      | YES      |                          |
| snippet       | text      | YES      |                          |
| confidence    | float8    | YES      |                          |
| metadata_json | jsonb     | NO       | '{}'                     |
| created_at    | timestamp | NO       | CURRENT_TIMESTAMP        |

### danger_motif_findings

| column              | type      | nullable | default                |
| ------------------- | --------- | -------- | ---------------------- |
| id                  | bigint    | NO       | seq                    |
| investigation_id    | bigint    | YES      | FK→investigations      |
| lead_id             | bigint    | YES      | FK→investigation_leads |
| motif_type          | text      | NO       |                        |
| harm_type           | text      | NO       | 'unknown'              |
| title               | text      | NO       |                        |
| description         | text      | YES      |                        |
| source_summary      | text      | NO       | ''                     |
| confidence          | float8    | YES      |                        |
| risk_score          | float8    | YES      |                        |
| evidence_count      | integer   | NO       | 0                      |
| path_length         | integer   | YES      |                        |
| contradiction_count | integer   | NO       | 0                      |
| review_state        | text      | NO       | 'unreviewed'           |
| status              | text      | NO       | 'open'                 |
| priority            | text      | NO       | 'medium'               |
| primary_entity_ids  | bigint[]  | NO       | '{}'                   |
| explainability_json | jsonb     | NO       | '{}'                   |
| generated_by        | text      | NO       | 'danger_motif_service' |
| generated_at        | timestamp | NO       | CURRENT_TIMESTAMP      |
| created_at          | timestamp | NO       | CURRENT_TIMESTAMP      |
| updated_at          | timestamp | NO       | CURRENT_TIMESTAMP      |

### document_annotations

| column                  | type        | nullable | default                                  |
| ----------------------- | ----------- | -------- | ---------------------------------------- |
| id                      | bigint      | NO       | seq                                      |
| document_id             | integer     | NO       | FK→documents (note: integer, not bigint) |
| annotation_type         | text        | NO       |                                          |
| selected_text           | text        | NO       |                                          |
| note                    | text        | NO       | ''                                       |
| start_offset            | integer     | NO       |                                          |
| end_offset              | integer     | NO       |                                          |
| context_before          | text        | YES      |                                          |
| context_after           | text        | YES      |                                          |
| author_label            | text        | NO       | 'anonymous'                              |
| author_fingerprint_hash | text        | YES      |                                          |
| created_at              | timestamptz | NO       | CURRENT_TIMESTAMP                        |
| updated_at              | timestamptz | NO       | CURRENT_TIMESTAMP                        |
| pdf_page                | integer     | YES      |                                          |
| pdf_x                   | numeric     | YES      |                                          |
| pdf_y                   | numeric     | YES      |                                          |
| pdf_width               | numeric     | YES      |                                          |
| pdf_height              | numeric     | YES      |                                          |

**Red flag:** `document_id` is `integer` but `documents.id` is `bigint`. The FK constraint exists anyway (PostgreSQL coerces), but this is a type mismatch.

### document_assets

| column      | type   | nullable | default        |
| ----------- | ------ | -------- | -------------- |
| document_id | bigint | NO       | FK→documents   |
| asset_id    | bigint | NO       | FK→file_assets |
| role        | text   | NO       | 'primary'      |

PK: `(document_id, asset_id)`

### document_collections

| column        | type      | nullable | default           |
| ------------- | --------- | -------- | ----------------- |
| document_id   | bigint    | NO       | FK→documents      |
| collection_id | bigint    | NO       | FK→collections    |
| added_at      | timestamp | YES      | CURRENT_TIMESTAMP |
| notes         | text      | YES      |                   |

PK: `(document_id, collection_id)`

### document_pages

| column             | type      | nullable | default           |
| ------------------ | --------- | -------- | ----------------- |
| id                 | bigint    | NO       | seq               |
| document_id        | bigint    | YES      | FK→documents      |
| page_number        | integer   | YES      |                   |
| extracted_text     | text      | YES      |                   |
| signal_score       | real      | YES      | 0                 |
| ocr_quality_score  | real      | YES      |                   |
| text_source        | text      | YES      |                   |
| created_at         | timestamp | YES      | CURRENT_TIMESTAMP |
| ocr_confidence_avg | real      | YES      |                   |
| phash              | text      | YES      |                   |

### document_provenance_events

| column             | type        | nullable | default           |
| ------------------ | ----------- | -------- | ----------------- |
| id                 | bigint      | NO       | seq               |
| event_uuid         | uuid        | NO       | gen_random_uuid() |
| event_key          | text        | NO       | UNIQUE            |
| document_id        | bigint      | NO       | FK→documents      |
| run_id             | bigint      | YES      | FK→pipeline_runs  |
| event_type         | text        | NO       |                   |
| event_order        | integer     | NO       | 0                 |
| actor_type         | text        | NO       | 'system'          |
| actor_id           | text        | YES      |                   |
| tool_name          | text        | YES      |                   |
| tool_version       | text        | YES      |                   |
| input_asset_id     | bigint      | YES      | FK→file_assets    |
| output_asset_id    | bigint      | YES      | FK→file_assets    |
| input_document_id  | bigint      | YES      | FK→documents      |
| parent_document_id | bigint      | YES      | FK→documents      |
| source_collection  | text        | YES      |                   |
| source_path        | text        | YES      |                   |
| source_url         | text        | YES      |                   |
| file_sha256        | text        | YES      |                   |
| text_sha256        | text        | YES      |                   |
| metadata_json      | jsonb       | NO       | '{}'              |
| occurred_at        | timestamptz | NO       | now()             |
| created_at         | timestamptz | NO       | now()             |

### document_sentences

| column         | type      | nullable | default           |
| -------------- | --------- | -------- | ----------------- |
| id             | bigint    | NO       | seq               |
| document_id    | bigint    | YES      | FK→documents      |
| page_id        | bigint    | YES      | FK→document_pages |
| sentence_text  | text      | YES      |                   |
| sentence_index | integer   | YES      |                   |
| signal_score   | real      | YES      | 0                 |
| is_boilerplate | integer   | YES      | 0                 |
| created_at     | timestamp | YES      | CURRENT_TIMESTAMP |

### document_spans

| column          | type    | nullable | default      |
| --------------- | ------- | -------- | ------------ |
| id              | text    | NO       |              |
| document_id     | bigint  | YES      | FK→documents |
| page_num        | integer | YES      |              |
| span_start_char | integer | YES      |              |
| span_end_char   | integer | YES      |              |
| raw_text        | text    | YES      |              |
| cleaned_text    | text    | YES      |              |
| ocr_confidence  | real    | YES      |              |
| layout_json     | jsonb   | YES      |              |

### documents

| column                     | type        | nullable | default           |
| -------------------------- | ----------- | -------- | ----------------- |
| id                         | bigint      | NO       | seq               |
| file_name                  | text        | YES      |                   |
| file_path                  | text        | YES      | UNIQUE            |
| title                      | text        | YES      |                   |
| content                    | text        | YES      |                   |
| file_type                  | text        | YES      |                   |
| file_size                  | bigint      | YES      |                   |
| page_count                 | integer     | YES      | 0                 |
| is_sensitive               | boolean     | YES      | false             |
| signal_score               | real        | YES      | 0                 |
| processing_status          | text        | YES      | 'queued'          |
| processing_error           | text        | YES      |                   |
| processing_attempts        | integer     | YES      | 0                 |
| worker_id                  | text        | YES      |                   |
| lease_expires_at           | timestamp   | YES      |                   |
| last_processed_at          | timestamp   | YES      |                   |
| date_created               | timestamp   | YES      | CURRENT_TIMESTAMP |
| analyzed_at                | timestamp   | YES      |                   |
| unredaction_attempted      | integer     | YES      | 0                 |
| unredaction_succeeded      | integer     | YES      | 0                 |
| redaction_coverage_before  | real        | YES      |                   |
| redaction_coverage_after   | real        | YES      |                   |
| unredacted_text_gain       | real        | YES      |                   |
| unredaction_baseline_vocab | text        | YES      |                   |
| source_collection          | text        | YES      |                   |
| content_hash               | text        | YES      |                   |
| fts_vector                 | tsvector    | YES      |                   |
| red_flag_rating            | integer     | YES      | 0                 |
| has_failed_redactions      | integer     | YES      | 0                 |
| is_hidden                  | integer     | YES      | 0                 |
| evidence_type              | text        | YES      |                   |
| content_refined            | text        | YES      |                   |
| metadata_json              | jsonb       | YES      |                   |
| word_count                 | integer     | YES      | 0                 |
| content_preview            | text        | YES      |                   |
| created_at                 | timestamptz | YES      |                   |
| original_file_id           | bigint      | YES      |                   |
| original_file_path         | text        | YES      |                   |
| failed_redaction_count     | integer     | YES      | 0                 |
| failed_redaction_data      | text        | YES      |                   |
| extracted_date             | timestamp   | YES      |                   |
| start_offset               | integer     | YES      |                   |
| end_offset                 | integer     | YES      |                   |
| pipeline_version           | text        | YES      |                   |
| ingestion_run_id           | text        | YES      |                   |
| hash_algo                  | text        | YES      | 'sha256'          |
| content_sha256             | text        | YES      |                   |
| unredacted_span_json       | text        | YES      |                   |
| normalized_text_sha256     | text        | YES      |                   |
| source_original_url        | text        | YES      |                   |
| source_path                | text        | YES      |                   |
| source_url                 | text        | YES      |                   |
| source_system              | text        | YES      |                   |
| source_release             | text        | YES      |                   |
| source_acquisition_method  | text        | YES      |                   |
| source_acquired_at         | timestamptz | YES      |                   |
| provenance_status          | text        | YES      | 'missing'         |
| provenance_score           | real        | YES      | 0                 |
| parent_document_id         | bigint      | YES      |                   |
| significance_score         | float8      | NO       | 0                 |

**Notes:** 47 columns — very wide. `date_created` (timestamp) and `created_at` (timestamptz) both exist. `content_hash` and `content_sha256` overlap. `source_path` / `source_url` / `source_original_url` are three similar source tracking fields. Two FTS indexes: `documents_fts_vector_index` and `idx_documents_fts` — exact duplicates.

### entities

| column                | type      | nullable | default           |
| --------------------- | --------- | -------- | ----------------- |
| id                    | bigint    | NO       | seq               |
| full_name             | text      | NO       |                   |
| entity_type           | text      | YES      | 'Person'          |
| type                  | text      | YES      | 'Person'          |
| entity_category       | text      | YES      |                   |
| risk_level            | text      | YES      |                   |
| red_flag_rating       | integer   | YES      | 1                 |
| red_flag_description  | text      | YES      |                   |
| bio                   | text      | YES      |                   |
| birth_date            | text      | YES      |                   |
| death_date            | text      | YES      |                   |
| aliases               | text      | YES      |                   |
| notes                 | text      | YES      |                   |
| primary_role          | text      | YES      |                   |
| connections_summary   | text      | YES      |                   |
| canonical_id          | bigint    | YES      | FK→entities       |
| junk_tier             | text      | YES      | 'clean'           |
| quarantine_status     | integer   | YES      | 0                 |
| entity_metadata_json  | jsonb     | YES      |                   |
| is_vip                | integer   | YES      | 0                 |
| created_at            | timestamp | YES      | CURRENT_TIMESTAMP |
| updated_at            | timestamp | YES      | CURRENT_TIMESTAMP |
| fts_vector            | tsvector  | YES      |                   |
| location_lat          | float8    | YES      |                   |
| location_lng          | float8    | YES      |                   |
| mentions              | integer   | YES      | 0                 |
| was_agentic           | integer   | YES      | 0                 |
| junk_flag             | integer   | YES      | 0                 |
| needs_review          | integer   | YES      | 0                 |
| manually_reviewed     | integer   | YES      | 0                 |
| community_id          | bigint    | YES      |                   |
| junk_reason           | text      | YES      |                   |
| title                 | text      | YES      |                   |
| junk_probability      | real      | YES      | 0                 |
| evidence_count        | integer   | YES      | 0                 |
| red_flag_score        | real      | YES      | 0                 |
| calculated_rank_score | float8    | YES      | 0                 |

**Red flag:** `entity_type` and `type` are duplicate columns, both defaulting to 'Person'. Of 526,130 rows with both set, 38,841 have mismatched values — active drift.

### entity_adjacency

| column             | type   | nullable | default |
| ------------------ | ------ | -------- | ------- |
| entity_id          | bigint | NO       |         |
| neighbor_id        | bigint | NO       |         |
| weight             | real   | YES      | 0       |
| bridge_score       | real   | YES      | 0       |
| relationship_types | text   | YES      |         |
| risk_score         | real   | YES      | 0       |
| confidence         | real   | YES      | 1       |

PK: `(entity_id, neighbor_id)` — no FK constraints (no FK to entities, intentional for performance).

### entity_evidence_types

| column           | type   | nullable | default           |
| ---------------- | ------ | -------- | ----------------- |
| entity_id        | bigint | NO       | FK→entities       |
| evidence_type_id | bigint | NO       | FK→evidence_types |

PK: `(entity_id, evidence_type_id)`

### entity_mentions

| column              | type        | nullable | default           |
| ------------------- | ----------- | -------- | ----------------- |
| id                  | text        | NO       |                   |
| entity_id           | bigint      | YES      | FK→entities       |
| document_id         | bigint      | YES      | FK→documents      |
| span_id             | text        | YES      |                   |
| start_offset        | integer     | YES      |                   |
| end_offset          | integer     | YES      |                   |
| surface_text        | text        | YES      |                   |
| mention_type        | text        | YES      |                   |
| mention_context     | text        | YES      |                   |
| confidence          | real        | YES      | 1                 |
| ingest_run_id       | text        | YES      |                   |
| page_number         | integer     | YES      |                   |
| position_start      | integer     | YES      |                   |
| position_end        | integer     | YES      |                   |
| significance_score  | real        | YES      | 1                 |
| created_at          | timestamp   | YES      | CURRENT_TIMESTAMP |
| doc_red_flag_rating | integer     | YES      |                   |
| doc_date_created    | timestamptz | YES      |                   |
| sentence_id         | bigint      | YES      |                   |
| verified            | integer     | YES      | 0                 |
| verified_by         | text        | YES      |                   |
| verified_at         | timestamp   | YES      |                   |
| rejection_reason    | text        | YES      |                   |

**Note:** Has both `start_offset`/`end_offset` AND `position_start`/`position_end` — two parallel offset pairs.

### entity_merge_candidates

| column           | type      | nullable | default           |
| ---------------- | --------- | -------- | ----------------- |
| id               | bigint    | NO       | seq               |
| source_entity_id | bigint    | NO       | FK→entities       |
| target_entity_id | bigint    | NO       | FK→entities       |
| similarity_score | float8    | NO       |                   |
| reasoning        | text      | YES      |                   |
| status           | text      | NO       | 'pending'         |
| created_at       | timestamp | NO       | CURRENT_TIMESTAMP |
| updated_at       | timestamp | NO       | CURRENT_TIMESTAMP |

**Row count: 0** — empty table.

### entity_relationships

| column             | type      | nullable | default           |
| ------------------ | --------- | -------- | ----------------- |
| source_entity_id   | bigint    | NO       | FK→entities       |
| target_entity_id   | bigint    | NO       | FK→entities       |
| relationship_type  | text      | NO       | 'co_occurrence'   |
| strength           | real      | YES      | 0                 |
| confidence         | real      | YES      | 0.5               |
| proximity_score    | real      | YES      | 0                 |
| risk_score         | real      | YES      | 0                 |
| first_seen_at      | timestamp | YES      |                   |
| last_seen_at       | timestamp | YES      |                   |
| ingest_run_id      | text      | YES      |                   |
| evidence_pack_json | jsonb     | YES      |                   |
| created_at         | timestamp | YES      | CURRENT_TIMESTAMP |
| updated_at         | timestamp | YES      | CURRENT_TIMESTAMP |
| was_agentic        | integer   | YES      | 0                 |
| signal_ids         | uuid[]    | YES      | '{}'              |

PK: `(source_entity_id, target_entity_id, relationship_type)` — composite, no surrogate id.

### evidence

| column             | type      | nullable | default           |
| ------------------ | --------- | -------- | ----------------- |
| id                 | bigint    | NO       | seq               |
| title              | text      | NO       |                   |
| description        | text      | YES      |                   |
| evidence_type      | text      | YES      | 'document'        |
| source_path        | text      | YES      | UNIQUE            |
| original_filename  | text      | YES      |                   |
| extracted_text     | text      | YES      |                   |
| evidence_tags      | text      | YES      |                   |
| red_flag_rating    | integer   | YES      | 0                 |
| is_sensitive       | boolean   | YES      | false             |
| metadata_json      | jsonb     | YES      |                   |
| created_at         | timestamp | YES      | CURRENT_TIMESTAMP |
| fts_vector         | tsvector  | YES      |                   |
| ingested_at        | timestamp | YES      | CURRENT_TIMESTAMP |
| modified_at        | timestamp | YES      | CURRENT_TIMESTAMP |
| word_count         | integer   | YES      |                   |
| file_size          | bigint    | YES      |                   |
| cleaned_path       | text      | YES      |                   |
| original_file_path | text      | YES      |                   |

**Row count: 11** — effectively dead; all document-level evidence is in `documents`.

### evidence_chain_items

| column           | type      | nullable | default           |
| ---------------- | --------- | -------- | ----------------- |
| id               | bigint    | NO       | seq               |
| investigation_id | bigint    | NO       | FK→investigations |
| lead_id          | text      | YES      |                   |
| item_type        | text      | NO       |                   |
| title            | text      | NO       |                   |
| payload_json     | jsonb     | NO       | '{}'              |
| created_by       | text      | YES      |                   |
| created_at       | timestamp | NO       | CURRENT_TIMESTAMP |

### evidence_entity

| column          | type      | nullable | default           |
| --------------- | --------- | -------- | ----------------- |
| evidence_id     | bigint    | NO       | FK→evidence       |
| entity_id       | bigint    | NO       | FK→entities       |
| role            | text      | NO       | 'participant'     |
| confidence      | real      | YES      | 0.8               |
| mention_context | text      | YES      |                   |
| created_at      | timestamp | YES      | CURRENT_TIMESTAMP |

**Row count: 0** — empty table.

### evidence_types

| column      | type   | nullable | default |
| ----------- | ------ | -------- | ------- |
| id          | bigint | NO       | seq     |
| type_name   | text   | NO       | UNIQUE  |
| description | text   | YES      |         |

**Row count: 3** — nearly static reference table.

### face_clusters

| column                 | type        | nullable | default           |
| ---------------------- | ----------- | -------- | ----------------- |
| id                     | uuid        | NO       | gen_random_uuid() |
| name                   | text        | YES      |                   |
| is_hidden              | boolean     | YES      | false             |
| representative_face_id | uuid        | YES      |                   |
| created_at             | timestamptz | YES      | now()             |
| updated_at             | timestamptz | YES      | now()             |
| entity_id              | integer     | YES      | FK→entities       |

**Red flag:** `entity_id` is `integer`, but `entities.id` is `bigint`. Type mismatch on FK column.

### faces

| column               | type        | nullable | default           |
| -------------------- | ----------- | -------- | ----------------- |
| id                   | uuid        | NO       | gen_random_uuid() |
| media_item_id        | text        | YES      | FK→media_items    |
| cluster_id           | uuid        | YES      | FK→face_clusters  |
| embedding            | float8[]    | YES      |                   |
| bounding_box         | jsonb       | YES      |                   |
| detection_confidence | float8      | YES      |                   |
| created_at           | timestamptz | YES      | now()             |
| crop_path            | text        | YES      |                   |

### file_assets

| column                 | type        | nullable | default                   |
| ---------------------- | ----------- | -------- | ------------------------- |
| id                     | bigint      | NO       | seq                       |
| asset_uuid             | uuid        | NO       | gen_random_uuid()         |
| original_asset_id      | bigint      | YES      | FK→file_assets (self-ref) |
| storage_path           | text        | NO       |                           |
| file_name              | text        | YES      |                           |
| mime_type              | text        | YES      |                           |
| file_type              | text        | YES      |                           |
| file_size              | bigint      | YES      |                           |
| sha256                 | text        | YES      | UNIQUE (where not null)   |
| source_collection      | text        | YES      |                           |
| is_original            | integer     | NO       | 1                         |
| is_derivative          | integer     | NO       | 0                         |
| derivative_kind        | text        | YES      |                           |
| derivative_params_json | text        | YES      |                           |
| phash                  | text        | YES      |                           |
| created_at             | timestamptz | NO       | now()                     |

### financial_transactions

| column             | type      | nullable | default           |
| ------------------ | --------- | -------- | ----------------- |
| id                 | bigint    | NO       | seq               |
| from_entity        | text      | NO       |                   |
| to_entity          | text      | NO       |                   |
| amount             | numeric   | NO       |                   |
| currency           | text      | YES      | 'USD'             |
| transaction_date   | timestamp | NO       |                   |
| transaction_type   | text      | NO       |                   |
| method             | text      | NO       |                   |
| risk_level         | text      | YES      | 'medium'          |
| description        | text      | YES      |                   |
| investigation_id   | bigint    | YES      | FK→investigations |
| source_document_id | bigint    | YES      | FK→documents      |
| metadata_json      | jsonb     | YES      |                   |
| created_at         | timestamp | YES      | CURRENT_TIMESTAMP |

**Note:** `from_entity` and `to_entity` are text (not FKs to entities table) — no referential integrity.

### flight_passengers

| column         | type      | nullable | default           |
| -------------- | --------- | -------- | ----------------- |
| id             | bigint    | NO       |                   |
| flight_id      | bigint    | YES      | FK→flights        |
| entity_id      | bigint    | YES      | FK→entities       |
| passenger_name | text      | NO       |                   |
| role           | text      | YES      |                   |
| created_at     | timestamp | YES      | CURRENT_TIMESTAMP |

### flights

| column            | type      | nullable | default           |
| ----------------- | --------- | -------- | ----------------- |
| id                | bigint    | NO       |                   |
| date              | text      | YES      |                   |
| departure_airport | text      | YES      |                   |
| departure_city    | text      | YES      |                   |
| departure_country | text      | YES      |                   |
| arrival_airport   | text      | YES      |                   |
| arrival_city      | text      | YES      |                   |
| arrival_country   | text      | YES      |                   |
| aircraft_tail     | text      | YES      |                   |
| aircraft_type     | text      | YES      |                   |
| pilot             | text      | YES      |                   |
| notes             | text      | YES      |                   |
| created_at        | timestamp | YES      | CURRENT_TIMESTAMP |

**Note:** `date` is stored as text, not a date/timestamp type.

### forensic_signal_entities

| column    | type   | nullable | default             |
| --------- | ------ | -------- | ------------------- |
| signal_id | uuid   | NO       | FK→forensic_signals |
| entity_id | bigint | NO       | FK→entities         |
| role      | text   | YES      |                     |

PK: `(signal_id, entity_id)`

### forensic_signal_evidence

| column      | type   | nullable | default             |
| ----------- | ------ | -------- | ------------------- |
| signal_id   | uuid   | NO       | FK→forensic_signals |
| document_id | bigint | NO       | FK→documents        |
| snippet     | text   | YES      |                     |

PK: `(signal_id, document_id)`

### forensic_signals

| column        | type        | nullable | default           |
| ------------- | ----------- | -------- | ----------------- |
| id            | uuid        | NO       | gen_random_uuid() |
| signal_type   | text        | NO       |                   |
| confidence    | real        | NO       | 0.5               |
| risk_score    | real        | NO       | 0                 |
| source_source | text        | NO       |                   |
| source_ref_id | text        | NO       |                   |
| entity_ids    | bigint[]    | NO       | '{}'              |
| metadata_json | jsonb       | YES      | '{}'              |
| status        | text        | YES      | 'pending_review'  |
| created_at    | timestamptz | YES      | CURRENT_TIMESTAMP |
| updated_at    | timestamptz | YES      | CURRENT_TIMESTAMP |

**Red flag:** Column named `source_source` — obviously a naming error (duplicated word). **Row count: 1.**

### global_timeline_events

| column              | type      | nullable | default           |
| ------------------- | --------- | -------- | ----------------- |
| id                  | bigint    | NO       | seq               |
| title               | text      | NO       |                   |
| date                | date      | NO       |                   |
| description         | text      | YES      |                   |
| type                | text      | YES      | 'other'           |
| significance        | text      | YES      | 'medium'          |
| entities            | text      | YES      |                   |
| related_document_id | bigint    | YES      |                   |
| created_at          | timestamp | YES      | CURRENT_TIMESTAMP |
| source              | text      | YES      |                   |

**Note:** `entities` is a plain text field — not a FK or array of entity IDs. No formal relationship to `entities` table. **Row count: 416.**

### graph_cache_state

| column       | type      | nullable | default           |
| ------------ | --------- | -------- | ----------------- |
| id           | integer   | NO       | seq               |
| last_rebuild | timestamp | YES      | CURRENT_TIMESTAMP |
| is_dirty     | integer   | YES      | 1                 |

### hypotheses

| column           | type      | nullable | default           |
| ---------------- | --------- | -------- | ----------------- |
| id               | bigint    | NO       | seq               |
| investigation_id | bigint    | YES      | FK→investigations |
| title            | text      | NO       |                   |
| description      | text      | YES      |                   |
| status           | text      | YES      | 'active'          |
| confidence       | real      | YES      | 0.5               |
| created_at       | timestamp | YES      | CURRENT_TIMESTAMP |
| updated_at       | timestamp | YES      | CURRENT_TIMESTAMP |

**Row count: 1**

### hypothesis_evidence

| column        | type      | nullable | default           |
| ------------- | --------- | -------- | ----------------- |
| id            | bigint    | NO       | seq               |
| hypothesis_id | bigint    | YES      | FK→hypotheses     |
| evidence_id   | bigint    | YES      | FK→evidence       |
| relevance     | text      | YES      | 'supporting'      |
| created_at    | timestamp | YES      | CURRENT_TIMESTAMP |

**Row count: 9** — points to `evidence` (11 rows), not `documents`.

### ingest_runs

| column             | type      | nullable | default           |
| ------------------ | --------- | -------- | ----------------- |
| id                 | text      | NO       |                   |
| status             | text      | YES      | 'queued'          |
| git_commit         | text      | YES      |                   |
| pipeline_version   | text      | YES      |                   |
| agentic_enabled    | integer   | YES      | 0                 |
| notes              | text      | YES      |                   |
| created_at         | timestamp | YES      | CURRENT_TIMESTAMP |
| finished_at        | timestamp | YES      |                   |
| agentic_model_id   | text      | YES      |                   |
| extractor_versions | text      | YES      |                   |
| error_message      | text      | YES      |                   |

### investigation_activity

| column           | type      | nullable | default                |
| ---------------- | --------- | -------- | ---------------------- |
| id               | bigint    | NO       | seq                    |
| investigation_id | bigint    | YES      | FK→investigations      |
| user_id          | text      | YES      |                        |
| user_name        | text      | YES      |                        |
| action_type      | text      | NO       |                        |
| target_type      | text      | YES      |                        |
| target_id        | text      | YES      |                        |
| target_title     | text      | YES      |                        |
| metadata_json    | jsonb     | YES      |                        |
| created_at       | timestamp | YES      | CURRENT_TIMESTAMP      |
| doc_id           | bigint    | YES      | FK→documents           |
| ent_id           | bigint    | YES      | FK→entities            |
| lead_id          | bigint    | YES      | FK→investigation_leads |

### investigation_collaborators

| column           | type      | nullable | default           |
| ---------------- | --------- | -------- | ----------------- |
| investigation_id | bigint    | NO       | FK→investigations |
| user_id          | text      | NO       | FK→users          |
| permission_level | text      | YES      | 'editor'          |
| joined_at        | timestamp | YES      | CURRENT_TIMESTAMP |

PK: `(investigation_id, user_id)`

### investigation_evidence

| column           | type      | nullable | default           |
| ---------------- | --------- | -------- | ----------------- |
| investigation_id | bigint    | NO       | FK→investigations |
| document_id      | bigint    | NO       | FK→documents      |
| added_by         | text      | YES      |                   |
| added_at         | timestamp | YES      | CURRENT_TIMESTAMP |
| notes            | text      | YES      |                   |
| id               | bigint    | NO       | seq               |
| evidence_id      | bigint    | YES      | FK→evidence       |
| relevance        | text      | YES      | 'medium'          |

**Note:** Column order is unusual — `id` is column 6 of 8. The table started as a pure junction table (document_id + investigation_id) and had `id`, `evidence_id`, `relevance` added later. **Row count: 11.**

### investigation_evidence_annotations

| column           | type        | nullable | default           |
| ---------------- | ----------- | -------- | ----------------- |
| id               | bigint      | NO       | seq               |
| investigation_id | bigint      | NO       | FK→investigations |
| evidence_id      | bigint      | NO       | FK→evidence       |
| annotation_type  | text        | NO       |                   |
| content          | text        | NO       |                   |
| color            | text        | YES      |                   |
| start_offset     | integer     | YES      |                   |
| end_offset       | integer     | YES      |                   |
| created_by       | text        | YES      |                   |
| metadata_json    | jsonb       | NO       | '{}'              |
| created_at       | timestamptz | NO       | CURRENT_TIMESTAMP |
| updated_at       | timestamptz | NO       | CURRENT_TIMESTAMP |

### investigation_leads

| column             | type      | nullable | default             |
| ------------------ | --------- | -------- | ------------------- |
| id                 | bigint    | NO       | seq                 |
| investigation_id   | bigint    | NO       | FK→investigations   |
| title              | text      | NO       |                     |
| description        | text      | YES      |                     |
| status             | text      | NO       | 'open'              |
| priority           | text      | NO       | 'medium'            |
| source_document_id | bigint    | YES      | FK→documents        |
| source_efta_ref    | text      | YES      |                     |
| assigned_to        | text      | YES      |                     |
| created_by         | text      | YES      |                     |
| resolved_at        | timestamp | YES      |                     |
| resolution_notes   | text      | YES      |                     |
| created_at         | timestamp | NO       | CURRENT_TIMESTAMP   |
| updated_at         | timestamp | NO       | CURRENT_TIMESTAMP   |
| forensic_signal_id | uuid      | YES      | FK→forensic_signals |

### investigation_notebook

| column           | type      | nullable | default                |
| ---------------- | --------- | -------- | ---------------------- |
| investigation_id | bigint    | NO       | FK→investigations (PK) |
| order_json       | jsonb     | YES      | '[]'                   |
| annotations_json | jsonb     | YES      | '[]'                   |
| updated_at       | timestamp | YES      | CURRENT_TIMESTAMP      |

### investigation_tag_links

| column           | type   | nullable | default               |
| ---------------- | ------ | -------- | --------------------- |
| investigation_id | bigint | NO       | FK→investigations     |
| tag_id           | bigint | NO       | FK→investigation_tags |

PK: `(investigation_id, tag_id)`

### investigation_tags

| column   | type   | nullable | default |
| -------- | ------ | -------- | ------- |
| id       | bigint | NO       | seq     |
| tag_name | text   | NO       | UNIQUE  |

### investigation_timeline_events

| column           | type      | nullable | default           |
| ---------------- | --------- | -------- | ----------------- |
| id               | bigint    | NO       | seq               |
| investigation_id | bigint    | YES      | FK→investigations |
| title            | text      | NO       |                   |
| description      | text      | YES      |                   |
| type             | text      | YES      | 'event'           |
| start_date       | text      | YES      |                   |
| end_date         | text      | YES      |                   |
| confidence       | real      | YES      | 1                 |
| entities_json    | jsonb     | YES      | '[]'              |
| documents_json   | jsonb     | YES      | '[]'              |
| created_at       | timestamp | YES      | CURRENT_TIMESTAMP |

**Note:** `start_date`/`end_date` are text, not date types. Entities and documents stored as JSON arrays, not via FK. **Row count: 23.**

### investigations

| column           | type      | nullable | default           |
| ---------------- | --------- | -------- | ----------------- |
| id               | bigint    | NO       | seq               |
| uuid             | text      | YES      | UNIQUE            |
| title            | text      | NO       |                   |
| description      | text      | YES      |                   |
| status           | text      | YES      | 'active'          |
| priority         | text      | YES      | 'medium'          |
| owner_id         | text      | YES      |                   |
| created_by       | text      | YES      |                   |
| assigned_to      | text      | YES      |                   |
| created_at       | timestamp | YES      | CURRENT_TIMESTAMP |
| updated_at       | timestamp | YES      | CURRENT_TIMESTAMP |
| metadata_json    | jsonb     | YES      |                   |
| collaborator_ids | text      | YES      | '[]'              |
| scope            | text      | YES      |                   |

**Note:** `collaborator_ids` is plain text defaulting to `'[]'` — JSON-in-text pattern, not jsonb. **Row count: 3.**

### media_album_items

| column        | type      | nullable | default           |
| ------------- | --------- | -------- | ----------------- |
| album_id      | bigint    | NO       | FK→media_albums   |
| media_item_id | text      | NO       | FK→media_items    |
| order         | integer   | YES      | 0                 |
| added_at      | timestamp | YES      | CURRENT_TIMESTAMP |

PK: `(album_id, media_item_id)`

### media_albums

| column         | type      | nullable | default           |
| -------------- | --------- | -------- | ----------------- |
| id             | bigint    | NO       | seq               |
| name           | text      | NO       |                   |
| description    | text      | YES      |                   |
| cover_image_id | text      | YES      |                   |
| created_at     | timestamp | YES      | CURRENT_TIMESTAMP |
| date_modified  | timestamp | YES      | CURRENT_TIMESTAMP |
| is_sensitive   | boolean   | YES      | false             |

### media_assets

| column   | type   | nullable | default                         |
| -------- | ------ | -------- | ------------------------------- |
| media_id | bigint | NO       | FK→? (no FK constraint defined) |
| asset_id | bigint | NO       | FK→file_assets                  |
| role     | text   | NO       | 'primary'                       |

PK: `(media_id, asset_id)` **Row count: 0** — empty table. Structural mirror of `document_assets`.

### media_item_people

| column        | type        | nullable | default           |
| ------------- | ----------- | -------- | ----------------- |
| id            | bigint      | NO       | seq               |
| media_item_id | bigint      | NO       |                   |
| entity_id     | bigint      | NO       | FK→entities       |
| created_at    | timestamptz | YES      | CURRENT_TIMESTAMP |
| role          | text        | YES      | 'participant'     |

**Note:** `media_item_id` is bigint but `media_items.id` is text. Type mismatch — no FK constraint. **Row count: 7.**

### media_item_tags

| column        | type   | nullable | default        |
| ------------- | ------ | -------- | -------------- |
| media_item_id | text   | NO       | FK→media_items |
| tag_id        | bigint | NO       | FK→media_tags  |

PK: `(media_item_id, tag_id)`. **Row count: 196,387.**

### media_items

| column              | type      | nullable | default           |
| ------------------- | --------- | -------- | ----------------- |
| id                  | text      | NO       |                   |
| entity_id           | bigint    | YES      | FK→entities       |
| document_id         | bigint    | YES      | FK→documents      |
| album_id            | bigint    | YES      | FK→media_albums   |
| file_type           | text      | YES      |                   |
| file_path           | text      | NO       |                   |
| thumbnail_path      | text      | YES      |                   |
| original_url        | text      | YES      |                   |
| title               | text      | YES      |                   |
| caption             | text      | YES      |                   |
| description         | text      | YES      |                   |
| verification_status | text      | YES      | 'unverified'      |
| red_flag_rating     | integer   | YES      | 1                 |
| is_sensitive        | boolean   | YES      | false             |
| exif_json           | jsonb     | YES      |                   |
| metadata_json       | jsonb     | YES      |                   |
| created_at          | timestamp | YES      | CURRENT_TIMESTAMP |
| file_size           | bigint    | YES      |                   |
| width               | integer   | YES      |                   |
| height              | integer   | YES      |                   |
| date_taken          | timestamp | YES      |                   |
| has_text            | boolean   | NO       | false             |

**Note:** `id` is text type (not bigint). **Row count: 98,952.**

### media_tags

| column   | type   | nullable | default   |
| -------- | ------ | -------- | --------- |
| id       | bigint | NO       | seq       |
| name     | text   | NO       | UNIQUE    |
| category | text   | YES      |           |
| color    | text   | YES      | '#6366f1' |

### mentions

| column                  | type    | nullable | default           |
| ----------------------- | ------- | -------- | ----------------- |
| id                      | text    | NO       |                   |
| document_id             | bigint  | YES      | FK→documents      |
| span_id                 | text    | YES      | FK→document_spans |
| mention_start_char      | integer | YES      |                   |
| mention_end_char        | integer | YES      |                   |
| surface_text            | text    | YES      |                   |
| normalised_text         | text    | YES      |                   |
| entity_type             | text    | YES      |                   |
| ner_model               | text    | YES      |                   |
| ner_confidence          | real    | YES      |                   |
| context_window_before   | text    | YES      |                   |
| context_window_after    | text    | YES      |                   |
| sentence_id             | text    | YES      |                   |
| paragraph_id            | text    | YES      |                   |
| extracted_features_json | jsonb   | YES      |                   |

**Row count: 0** — empty table.

### migration_watermarks

| column            | type      | nullable | default           |
| ----------------- | --------- | -------- | ----------------- |
| source_table      | text      | NO       | PK                |
| last_record_id    | bigint    | NO       | 0                 |
| last_processed_at | timestamp | YES      | CURRENT_TIMESTAMP |

### palm_beach_properties

| column              | type      | nullable | default           |
| ------------------- | --------- | -------- | ----------------- |
| id                  | bigint    | NO       | seq               |
| pcn                 | text      | YES      | UNIQUE            |
| owner_name_1        | text      | YES      |                   |
| owner_name_2        | text      | YES      |                   |
| street_name         | text      | YES      |                   |
| site_address        | text      | YES      |                   |
| total_tax_value     | float8    | YES      |                   |
| acres               | float8    | YES      |                   |
| property_use        | text      | YES      |                   |
| year_built          | integer   | YES      |                   |
| bedrooms            | integer   | YES      |                   |
| full_bathrooms      | integer   | YES      |                   |
| half_bathrooms      | integer   | YES      |                   |
| stories             | float8    | YES      |                   |
| building_value      | float8    | YES      |                   |
| building_area       | integer   | YES      |                   |
| living_area         | integer   | YES      |                   |
| is_epstein_property | integer   | YES      | 0                 |
| is_known_associate  | integer   | YES      | 0                 |
| linked_entity_id    | bigint    | YES      |                   |
| source_file         | text      | YES      |                   |
| created_at          | timestamp | YES      | CURRENT_TIMESTAMP |
| address_source      | text      | YES      |                   |

**Note:** `linked_entity_id` has no FK constraint to entities. **Row count: 9,535.**

### pgmigrations

| column | type         | nullable | default |
| ------ | ------------ | -------- | ------- |
| id     | integer      | NO       | seq     |
| name   | varchar(255) | NO       |         |
| run_on | timestamp    | NO       |         |

Migration tracker (node-pg-migrate). **Row count: 46.**

### pipeline_runs

| column           | type        | nullable | default              |
| ---------------- | ----------- | -------- | -------------------- |
| id               | bigint      | NO       | seq                  |
| run_uuid         | uuid        | NO       | UNIQUE (two indexes) |
| pipeline_version | text        | NO       |                      |
| git_commit       | text        | YES      |                      |
| config_json      | jsonb       | YES      |                      |
| environment_json | jsonb       | YES      |                      |
| status           | text        | NO       |                      |
| error_message    | text        | YES      |                      |
| started_at       | timestamptz | NO       | CURRENT_TIMESTAMP    |
| finished_at      | timestamptz | YES      |                      |
| control_signal   | text        | YES      |                      |

### pipeline_steps

| column      | type        | nullable | default           |
| ----------- | ----------- | -------- | ----------------- |
| id          | bigint      | NO       | seq               |
| step_name   | text        | NO       | UNIQUE            |
| description | text        | YES      |                   |
| created_at  | timestamptz | NO       | CURRENT_TIMESTAMP |

### processing_jobs

| column       | type        | nullable | default           |
| ------------ | ----------- | -------- | ----------------- |
| id           | bigint      | NO       | seq               |
| run_id       | bigint      | YES      |                   |
| step_name    | text        | NO       |                   |
| target_type  | text        | NO       |                   |
| target_id    | bigint      | NO       |                   |
| status       | text        | NO       | 'queued'          |
| attempts     | integer     | NO       | 0                 |
| max_attempts | integer     | NO       | 5                 |
| locked_by    | text        | YES      |                   |
| locked_at    | timestamptz | YES      |                   |
| last_error   | text        | YES      |                   |
| created_at   | timestamptz | NO       | CURRENT_TIMESTAMP |
| updated_at   | timestamptz | NO       | CURRENT_TIMESTAMP |

**Row count: 1,093,714.** No FK on `run_id` to `pipeline_runs`.

### quality_flags

| column       | type      | nullable | default           |
| ------------ | --------- | -------- | ----------------- |
| id           | text      | NO       |                   |
| target_type  | text      | YES      |                   |
| target_id    | text      | YES      |                   |
| flag_type    | text      | YES      |                   |
| severity     | text      | YES      |                   |
| details_json | jsonb     | YES      |                   |
| created_at   | timestamp | YES      | CURRENT_TIMESTAMP |
| resolved_at  | timestamp | YES      |                   |
| doc_id       | bigint    | YES      | FK→documents      |
| ent_id       | bigint    | YES      | FK→entities       |

### redaction_spans

| column           | type        | nullable | default           |
| ---------------- | ----------- | -------- | ----------------- |
| id               | bigint      | NO       | seq               |
| document_id      | bigint      | NO       | FK→documents      |
| span_start       | integer     | NO       |                   |
| span_end         | integer     | NO       |                   |
| replacement_text | text        | YES      |                   |
| created_at       | timestamptz | YES      | CURRENT_TIMESTAMP |

### refresh_tokens

| column       | type        | nullable | default  |
| ------------ | ----------- | -------- | -------- |
| id           | bigint      | NO       | seq      |
| user_id      | text        | NO       | FK→users |
| token_hash   | text        | NO       | UNIQUE   |
| expires_at   | timestamptz | NO       |          |
| created_at   | timestamptz | NO       | now()    |
| last_used_at | timestamptz | YES      |          |
| revoked_at   | timestamptz | YES      |          |

### relation_evidence

| column      | type   | nullable | default           |
| ----------- | ------ | -------- | ----------------- |
| id          | text   | NO       |                   |
| relation_id | text   | YES      | FK→relations      |
| document_id | bigint | YES      | FK→documents      |
| span_id     | text   | YES      | FK→document_spans |
| quote_text  | text   | YES      |                   |
| confidence  | real   | YES      |                   |
| mention_ids | text   | YES      |                   |

### relations

| column            | type      | nullable | default           |
| ----------------- | --------- | -------- | ----------------- |
| id                | text      | NO       |                   |
| subject_entity_id | bigint    | YES      | FK→entities       |
| object_entity_id  | bigint    | YES      | FK→entities       |
| predicate         | text      | YES      |                   |
| direction         | text      | YES      |                   |
| weight            | real      | YES      | 1                 |
| first_seen_at     | timestamp | YES      | CURRENT_TIMESTAMP |
| last_seen_at      | timestamp | YES      | CURRENT_TIMESTAMP |
| status            | text      | YES      | 'active'          |

**Row count: 11,721.**

### resolution_candidates

| column              | type      | nullable | default     |
| ------------------- | --------- | -------- | ----------- |
| id                  | text      | NO       |             |
| left_entity_id      | bigint    | YES      | FK→entities |
| right_entity_id     | bigint    | YES      | FK→entities |
| mention_id          | text      | YES      | FK→mentions |
| candidate_type      | text      | YES      |             |
| score               | real      | YES      |             |
| feature_vector_json | jsonb     | YES      |             |
| decision            | text      | YES      |             |
| decided_at          | timestamp | YES      |             |
| decided_by          | text      | YES      |             |

**Row count: 0** — empty table. `mention_id` FK points to `mentions` which is also empty.

### resolver_runs

| column           | type      | nullable | default           |
| ---------------- | --------- | -------- | ----------------- |
| id               | bigint    | NO       | seq               |
| resolver_name    | text      | NO       |                   |
| resolver_version | text      | YES      |                   |
| started_at       | timestamp | YES      | CURRENT_TIMESTAMP |
| completed_at     | timestamp | YES      |                   |
| status           | text      | YES      | 'running'         |
| metrics_json     | jsonb     | YES      |                   |

### timeline_events

| column            | type      | nullable | default           |
| ----------------- | --------- | -------- | ----------------- |
| id                | bigint    | NO       | seq               |
| entity_id         | bigint    | YES      | FK→entities       |
| event_date        | timestamp | YES      |                   |
| event_description | text      | YES      |                   |
| event_type        | text      | YES      |                   |
| document_id       | bigint    | YES      | FK→documents      |
| created_at        | timestamp | YES      | CURRENT_TIMESTAMP |

**Row count: 0** — empty table.

### users

| column        | type      | nullable | default           |
| ------------- | --------- | -------- | ----------------- |
| id            | text      | NO       |                   |
| username      | text      | YES      | UNIQUE            |
| email         | text      | YES      |                   |
| role          | text      | YES      |                   |
| password_hash | text      | YES      |                   |
| created_at    | timestamp | YES      | CURRENT_TIMESTAMP |
| last_login_at | timestamp | YES      |                   |
| last_active   | timestamp | YES      |                   |

### web_vitals

| column          | type      | nullable | default           |
| --------------- | --------- | -------- | ----------------- |
| id              | integer   | NO       | seq               |
| session_id      | text      | NO       |                   |
| route           | text      | NO       |                   |
| cls             | real      | NO       |                   |
| lcp             | real      | NO       |                   |
| inp             | real      | NO       |                   |
| long_task_count | integer   | NO       |                   |
| collected_at    | timestamp | YES      | CURRENT_TIMESTAMP |

---

## 3. Views and Materialized Views

| name                      | type              |
| ------------------------- | ----------------- |
| mv_docs_by_type           | materialized_view |
| mv_entity_type_dist       | materialized_view |
| mv_redaction_stats        | materialized_view |
| entity_connection_signals | materialized_view |
| mv_top_connected          | materialized_view |
| mv_timeline_data          | materialized_view |
| v_investigative_signals   | view              |

---

## 4. All Foreign Key Relationships

| table                              | column             | → foreign_table       | foreign_column | constraint_name                                          |
| ---------------------------------- | ------------------ | --------------------- | -------------- | -------------------------------------------------------- |
| audit_log                          | doc_id             | documents             | id             | audit_log_doc_id_fkey                                    |
| audit_log                          | ent_id             | entities              | id             | audit_log_ent_id_fkey                                    |
| black_book_entries                 | document_id        | documents             | id             | black_book_entries_document_id_fkey                      |
| black_book_entries                 | person_id          | entities              | id             | black_book_entries_person_id_fkey                        |
| chain_of_custody                   | evidence_id        | evidence              | id             | chain_of_custody_evidence_id_fkey                        |
| claim_triples                      | object_entity_id   | entities              | id             | claim_triples_object_entity_id_fkey                      |
| claim_triples                      | document_id        | documents             | id             | claim_triples_document_id_fkey                           |
| claim_triples                      | subject_entity_id  | entities              | id             | claim_triples_subject_entity_id_fkey                     |
| danger_motif_evidence              | finding_id         | danger_motif_findings | id             | danger_motif_evidence_finding_id_fkey                    |
| danger_motif_evidence              | document_id        | documents             | id             | danger_motif_evidence_document_id_fkey                   |
| danger_motif_findings              | investigation_id   | investigations        | id             | danger_motif_findings_investigation_id_fkey              |
| danger_motif_findings              | lead_id            | investigation_leads   | id             | danger_motif_findings_lead_id_fkey                       |
| document_annotations               | document_id        | documents             | id             | document_annotations_document_id_fkey                    |
| document_assets                    | document_id        | documents             | id             | document_assets_document_id_fkey                         |
| document_assets                    | asset_id           | file_assets           | id             | document_assets_asset_id_fkey                            |
| document_collections               | document_id        | documents             | id             | document_collections_document_id_fkey                    |
| document_collections               | collection_id      | collections           | id             | document_collections_collection_id_fkey                  |
| document_pages                     | document_id        | documents             | id             | document_pages_document_id_fkey                          |
| document_provenance_events         | parent_document_id | documents             | id             | document_provenance_events_parent_document_id_fkey       |
| document_provenance_events         | input_document_id  | documents             | id             | document_provenance_events_input_document_id_fkey        |
| document_provenance_events         | output_asset_id    | file_assets           | id             | document_provenance_events_output_asset_id_fkey          |
| document_provenance_events         | input_asset_id     | file_assets           | id             | document_provenance_events_input_asset_id_fkey           |
| document_provenance_events         | run_id             | pipeline_runs         | id             | document_provenance_events_run_id_fkey                   |
| document_provenance_events         | document_id        | documents             | id             | document_provenance_events_document_id_fkey              |
| document_sentences                 | page_id            | document_pages        | id             | document_sentences_page_id_fkey                          |
| document_sentences                 | document_id        | documents             | id             | document_sentences_document_id_fkey                      |
| document_spans                     | document_id        | documents             | id             | document_spans_document_id_fkey                          |
| entities                           | canonical_id       | entities              | id             | entities_canonical_id_fkey                               |
| entity_evidence_types              | entity_id          | entities              | id             | entity_evidence_types_entity_id_fkey                     |
| entity_evidence_types              | evidence_type_id   | evidence_types        | id             | entity_evidence_types_evidence_type_id_fkey              |
| entity_mentions                    | document_id        | documents             | id             | entity_mentions_document_id_fkey                         |
| entity_mentions                    | entity_id          | entities              | id             | entity_mentions_entity_id_fkey                           |
| entity_merge_candidates            | target_entity_id   | entities              | id             | entity_merge_candidates_target_entity_id_fkey            |
| entity_merge_candidates            | source_entity_id   | entities              | id             | entity_merge_candidates_source_entity_id_fkey            |
| entity_relationships               | target_entity_id   | entities              | id             | entity_relationships_target_entity_id_fkey               |
| entity_relationships               | source_entity_id   | entities              | id             | entity_relationships_source_entity_id_fkey               |
| evidence_chain_items               | investigation_id   | investigations        | id             | evidence_chain_items_investigation_id_fkey               |
| evidence_entity                    | entity_id          | entities              | id             | evidence_entity_entity_id_fkey                           |
| evidence_entity                    | evidence_id        | evidence              | id             | evidence_entity_evidence_id_fkey                         |
| face_clusters                      | entity_id          | entities              | id             | face_clusters_entity_id_fkey                             |
| faces                              | cluster_id         | face_clusters         | id             | faces_cluster_id_fkey                                    |
| faces                              | media_item_id      | media_items           | id             | faces_media_item_id_fkey                                 |
| file_assets                        | original_asset_id  | file_assets           | id             | file_assets_original_asset_id_fkey                       |
| financial_transactions             | investigation_id   | investigations        | id             | financial_transactions_investigation_id_fkey             |
| financial_transactions             | source_document_id | documents             | id             | financial_transactions_source_document_id_fkey           |
| flight_passengers                  | flight_id          | flights               | id             | flight_passengers_flight_id_fkey                         |
| flight_passengers                  | entity_id          | entities              | id             | flight_passengers_entity_id_fkey                         |
| forensic_signal_entities           | entity_id          | entities              | id             | forensic_signal_entities_entity_id_fkey                  |
| forensic_signal_entities           | signal_id          | forensic_signals      | id             | forensic_signal_entities_signal_id_fkey                  |
| forensic_signal_evidence           | signal_id          | forensic_signals      | id             | forensic_signal_evidence_signal_id_fkey                  |
| forensic_signal_evidence           | document_id        | documents             | id             | forensic_signal_evidence_document_id_fkey                |
| hypotheses                         | investigation_id   | investigations        | id             | hypotheses_investigation_id_fkey                         |
| hypothesis_evidence                | evidence_id        | evidence              | id             | hypothesis_evidence_evidence_id_fkey                     |
| hypothesis_evidence                | hypothesis_id      | hypotheses            | id             | hypothesis_evidence_hypothesis_id_fkey                   |
| investigation_activity             | lead_id            | investigation_leads   | id             | investigation_activity_lead_id_fkey                      |
| investigation_activity             | investigation_id   | investigations        | id             | investigation_activity_investigation_id_fkey             |
| investigation_activity             | doc_id             | documents             | id             | investigation_activity_doc_id_fkey                       |
| investigation_activity             | ent_id             | entities              | id             | investigation_activity_ent_id_fkey                       |
| investigation_collaborators        | investigation_id   | investigations        | id             | investigation_collaborators_investigation_id_fkey        |
| investigation_collaborators        | user_id            | users                 | id             | investigation_collaborators_user_id_fkey                 |
| investigation_evidence             | evidence_id        | evidence              | id             | investigation_evidence_evidence_id_fkey                  |
| investigation_evidence             | investigation_id   | investigations        | id             | investigation_evidence_investigation_id_fkey             |
| investigation_evidence             | document_id        | documents             | id             | investigation_evidence_document_id_fkey                  |
| investigation_evidence_annotations | investigation_id   | investigations        | id             | investigation_evidence_annotations_investigation_id_fkey |
| investigation_evidence_annotations | evidence_id        | evidence              | id             | investigation_evidence_annotations_evidence_id_fkey      |
| investigation_leads                | forensic_signal_id | forensic_signals      | id             | investigation_leads_forensic_signal_id_fkey              |
| investigation_leads                | source_document_id | documents             | id             | investigation_leads_source_document_id_fkey              |
| investigation_leads                | investigation_id   | investigations        | id             | investigation_leads_investigation_id_fkey                |
| investigation_notebook             | investigation_id   | investigations        | id             | investigation_notebook_investigation_id_fkey             |
| investigation_tag_links            | investigation_id   | investigations        | id             | investigation_tag_links_investigation_id_fkey            |
| investigation_tag_links            | tag_id             | investigation_tags    | id             | investigation_tag_links_tag_id_fkey                      |
| investigation_timeline_events      | investigation_id   | investigations        | id             | investigation_timeline_events_investigation_id_fkey      |
| media_album_items                  | media_item_id      | media_items           | id             | media_album_items_media_item_id_fkey                     |
| media_album_items                  | album_id           | media_albums          | id             | media_album_items_album_id_fkey                          |
| media_assets                       | asset_id           | file_assets           | id             | media_assets_asset_id_fkey                               |
| media_item_tags                    | media_item_id      | media_items           | id             | media_item_tags_media_item_id_fkey                       |
| media_item_tags                    | tag_id             | media_tags            | id             | media_item_tags_tag_id_fkey                              |
| media_items                        | entity_id          | entities              | id             | media_items_entity_id_fkey                               |
| media_items                        | document_id        | documents             | id             | media_items_document_id_fkey                             |
| media_items                        | album_id           | media_albums          | id             | media_items_album_id_fkey                                |
| mentions                           | span_id            | document_spans        | id             | mentions_span_id_fkey                                    |
| mentions                           | document_id        | documents             | id             | mentions_document_id_fkey                                |
| quality_flags                      | doc_id             | documents             | id             | quality_flags_doc_id_fkey                                |
| quality_flags                      | ent_id             | entities              | id             | quality_flags_ent_id_fkey                                |
| refresh_tokens                     | user_id            | users                 | id             | refresh_tokens_user_id_fkey                              |
| relation_evidence                  | document_id        | documents             | id             | relation_evidence_document_id_fkey                       |
| relation_evidence                  | span_id            | document_spans        | id             | relation_evidence_span_id_fkey                           |
| relation_evidence                  | relation_id        | relations             | id             | relation_evidence_relation_id_fkey                       |
| relations                          | subject_entity_id  | entities              | id             | relations_subject_entity_id_fkey                         |
| relations                          | object_entity_id   | entities              | id             | relations_object_entity_id_fkey                          |
| resolution_candidates              | left_entity_id     | entities              | id             | resolution_candidates_left_entity_id_fkey                |
| resolution_candidates              | right_entity_id    | entities              | id             | resolution_candidates_right_entity_id_fkey               |
| resolution_candidates              | mention_id         | mentions              | id             | resolution_candidates_mention_id_fkey                    |
| timeline_events                    | document_id        | documents             | id             | timeline_events_document_id_fkey                         |
| timeline_events                    | entity_id          | entities              | id             | timeline_events_entity_id_fkey                           |

**Total FK constraints: 95**

**Notable missing FKs:**

- `entity_adjacency` → `entities` (no FK, intentional for performance)
- `financial_transactions.from_entity` / `to_entity` → entities (text fields, no FK)
- `palm_beach_properties.linked_entity_id` → entities (no FK)
- `media_item_people.media_item_id` → media_items (type mismatch: bigint vs text id)
- `face_clusters.entity_id` → entities (type mismatch: integer vs bigint)
- `processing_jobs.run_id` → pipeline_runs (no FK)
- `global_timeline_events.related_document_id` → documents (no FK)

---

## 5. All Indexes (227 total)

### Duplicate / Redundant Index Pairs Identified

| table               | index_1                               | index_2                                    | note                                 |
| ------------------- | ------------------------------------- | ------------------------------------------ | ------------------------------------ |
| documents           | documents_fts_vector_index            | idx_documents_fts                          | Exact same GIN on fts_vector         |
| entities            | entities_name_trgm_idx                | idx_entities_full_name_trgm                | Exact same GIN trgm on full_name     |
| flight_passengers   | idx_flight_passengers_flight          | idx_flight_passengers_flight_id            | Exact same btree on flight_id        |
| flight_passengers   | idx_flight_passengers_name            | idx_flight_passengers_passenger_name       | Exact same btree on passenger_name   |
| forensic_signals    | forensic_signals_status_index         | idx_forensic_signals_status                | Exact same btree on status           |
| forensic_signals    | forensic_signals_signal_type_index    | idx_forensic_signals_type                  | Exact same btree on signal_type      |
| pipeline_runs       | pipeline_runs_run_uuid_key            | pipeline_runs_uuid                         | Exact same UNIQUE btree on run_uuid  |
| investigation_leads | idx_investigation_leads_inv           | investigation_leads_investigation_id_index | Exact same btree on investigation_id |
| investigation_leads | idx_investigation_leads_status        | investigation_leads_status_index           | Exact same btree on status           |
| boilerplate_phrases | boilerplate_phrases_sentence_hash_key | idx_boilerplate_phrases_hash               | UNIQUE + non-unique on same column   |

**Total confirmed duplicate index pairs: 10** — approximately 10 excess indexes consuming space and slowing writes.

---

## 6. Potentially Duplicate Table Pairs — Side-by-Side Comparison

### Pair 1: `mentions` vs `entity_mentions`

|                                | mentions                                                          | entity_mentions                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Row count**                  | **0**                                                             | **2,794,049**                                                                                                          |
| **Size**                       | 16 kB                                                             | 1260 MB                                                                                                                |
| **id type**                    | text                                                              | text                                                                                                                   |
| **entity_id**                  | absent                                                            | bigint (FK→entities)                                                                                                   |
| **document_id**                | bigint                                                            | bigint                                                                                                                 |
| **span_id**                    | text (FK→document_spans)                                          | text                                                                                                                   |
| **offset fields**              | mention_start_char, mention_end_char                              | start_offset, end_offset, position_start, position_end                                                                 |
| **surface_text**               | yes                                                               | yes                                                                                                                    |
| **entity_type / mention_type** | entity_type (NER class)                                           | mention_type                                                                                                           |
| **confidence**                 | ner_confidence (real)                                             | confidence (real)                                                                                                      |
| **context**                    | context_window_before, context_window_after                       | mention_context                                                                                                        |
| **sentence_id**                | text                                                              | bigint                                                                                                                 |
| **Extra in entity_mentions**   | —                                                                 | entity_id FK, ingest_run_id, page_number, significance_score, doc_red_flag_rating, doc_date_created, verified workflow |
| **Extra in mentions**          | normalised_text, ner_model, paragraph_id, extracted_features_json | —                                                                                                                      |

**Assessment:** `mentions` is the **older NER pipeline output** (raw span store, no entity link). `entity_mentions` is the **active successor** — it adds the resolved entity FK, verification workflow, and per-mention significance scoring. `mentions` is completely empty (0 rows) and should be considered dead. `resolution_candidates` (also 0 rows) FK points to `mentions.id`, confirming the old pipeline never populated in production.

---

### Pair 2: `relations` vs `entity_relationships`

|                                   | relations                      | entity_relationships                                                |
| --------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| **Row count**                     | **11,721**                     | **1,669,452**                                                       |
| **Size**                          | 2784 kB                        | 381 MB                                                              |
| **id type**                       | text (surrogate)               | none — composite PK (source, target, type)                          |
| **subject/source**                | subject_entity_id              | source_entity_id                                                    |
| **object/target**                 | object_entity_id               | target_entity_id                                                    |
| **relationship label**            | predicate (text)               | relationship_type (text, default 'co_occurrence')                   |
| **direction**                     | direction field                | implied by source/target                                            |
| **weight/strength**               | weight (real)                  | strength (real)                                                     |
| **temporal**                      | first_seen_at, last_seen_at    | first_seen_at, last_seen_at                                         |
| **status**                        | status (active/etc.)           | absent                                                              |
| **confidence**                    | absent                         | confidence (real)                                                   |
| **evidence**                      | via relation_evidence junction | evidence_pack_json (inline jsonb)                                   |
| **Extra in entity_relationships** | —                              | proximity_score, risk_score, ingest_run_id, was_agentic, signal_ids |

**Assessment:** `relations` is the **older NLP-extracted relation store** (predicate-object triples with direction). `entity_relationships` is the **active successor** — much larger, has richer scoring (confidence, proximity, risk), inline evidence packing, and agentic provenance. `relations` at 11,721 rows is not empty but dwarfed ~143x. The two serve the same conceptual role (entity-to-entity links) but have diverged schemas. The `relation_evidence` junction table links only to `relations`, not `entity_relationships` — that side of evidence is superseded by `evidence_pack_json`.

---

### Pair 3: `timeline_events` vs `global_timeline_events`

|                                     | timeline_events       | global_timeline_events                       |
| ----------------------------------- | --------------------- | -------------------------------------------- |
| **Row count**                       | **0**                 | **416**                                      |
| **Size**                            | 16 kB                 | 264 kB                                       |
| **id type**                         | bigint                | bigint                                       |
| **entity_id**                       | bigint (FK→entities)  | absent                                       |
| **event_date**                      | timestamp             | date (separate `date` column)                |
| **description**                     | event_description     | description                                  |
| **type**                            | event_type            | type                                         |
| **document_id**                     | bigint (FK→documents) | related_document_id (no FK)                  |
| **Extra in global_timeline_events** | —                     | title, significance, entities (text), source |

**Assessment:** `timeline_events` is **entity-centric** (one event per entity per document) and is completely empty. `global_timeline_events` is **narrative/curated** (broader historical events, no per-entity FK, free-text entities field) and has 416 rows of presumably hand-curated content. These serve different purposes but the `timeline_events` table is dead. The active timeline for investigation-scoped events is `investigation_timeline_events` (23 rows).

---

### Pair 4: `document_assets` vs `media_assets`

|                 | document_assets         | media_assets            |
| --------------- | ----------------------- | ----------------------- |
| **Row count**   | **13,110**              | **0**                   |
| **Size**        | 1504 kB                 | 24 kB                   |
| **PK**          | (document_id, asset_id) | (media_id, asset_id)    |
| **FK to left**  | document_id → documents | media_id → (no FK!)     |
| **FK to right** | asset_id → file_assets  | asset_id → file_assets  |
| **role**        | text, default 'primary' | text, default 'primary' |

**Assessment:** `document_assets` is the **active** junction linking documents to their file assets (13,110 rows). `media_assets` is **structurally identical** but empty and has a broken `media_id` column with no FK constraint to `media_items`. Likely created to mirror the documents pattern for media but never used. `media_items` instead stores `file_path` directly.

---

### Pair 5: `resolution_candidates` vs `entity_merge_candidates`

|                                    | resolution_candidates                 | entity_merge_candidates            |
| ---------------------------------- | ------------------------------------- | ---------------------------------- |
| **Row count**                      | **0**                                 | **0**                              |
| **id type**                        | text                                  | bigint                             |
| **entity_1 / source**              | left_entity_id (FK→entities)          | source_entity_id (FK→entities)     |
| **entity_2 / target**              | right_entity_id (FK→entities)         | target_entity_id (FK→entities)     |
| **anchor**                         | mention_id (FK→mentions, also 0 rows) | absent                             |
| **score**                          | score (real)                          | similarity_score (float8)          |
| **decision**                       | decision, decided_at, decided_by      | status (pending/approved/rejected) |
| **Extra in resolution_candidates** | candidate_type, feature_vector_json   | reasoning, updated_at              |

**Assessment:** Both tables serve the same purpose — candidate pairs for entity deduplication/merging. Both are **completely empty**. `resolution_candidates` is the older pipeline artifact (references `mentions` which is also dead). `entity_merge_candidates` is the newer, cleaner design. Neither has been used in production.

---

### Pair 6: `media_assets` vs `media_items`

These are **not duplicates** — `media_assets` is a junction (media→file_assets) while `media_items` is the core media record. See Pair 4 above for `media_assets`. `media_items` has 98,952 rows and is fully active.

---

### Pair 7: `evidence` vs `documents` (semantic overlap)

|               | evidence                                                                                                                                        | documents           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Row count** | **11**                                                                                                                                          | **1,419,851**       |
| **Purpose**   | Formal evidence record (investigation tool)                                                                                                     | Raw corpus document |
| **Overlap**   | title, description, evidence_type, source_path, extracted_text, word_count, file_size, red_flag_rating, is_sensitive, metadata_json, fts_vector | Same set of fields  |

**Assessment:** `evidence` was the original first-class document concept before `documents` became the corpus scale table. With only 11 rows vs 1.4M in `documents`, `evidence` is functionally dead as a document store. Its remaining purpose is as a target for `investigation_evidence`, `hypothesis_evidence`, `chain_of_custody`, and `evidence_entity` — the investigation layer. This design creates a bifurcated evidence model where `investigation_evidence` has both a `document_id` (→documents) and an `evidence_id` (→evidence).

---

## 7. Null-Heavy Columns

| table     | column             | null_pct   |
| --------- | ------------------ | ---------- |
| entities  | aliases            | **99.94%** |
| documents | extracted_date     | **84.18%** |
| documents | significance_score | 0.00%      |
| articles  | url                | 100%       |
| articles  | published_date     | 100%       |

**Notes:**

- `entities.aliases` at 99.94% null is essentially dead despite an index on it (`idx_entities_aliases_trgm`). The trgm index on a near-empty column wastes space.
- `documents.extracted_date` at 84.18% null means the date coalesce pattern used in list queries (`COALESCE(extracted_date, date_created)`) will mostly fall back to `date_created`. The targeted index on `extracted_date` alone may be of limited use.
- `documents` has two creation-timestamp columns: `date_created` (timestamp, used everywhere) and `created_at` (timestamptz, mostly NULL). These are redundant.

---

## 8. Orphan Row Check

### investigation_evidence

| total | orphaned_investigation | orphaned_evidence |
| ----- | ---------------------- | ----------------- |
| 11    | 0                      | 0                 |

No orphaned rows in `investigation_evidence`. All 11 rows have valid investigation and evidence parents.

---

## 9. Actual Row Counts for Potentially Dead Tables

| table                   | actual_count |
| ----------------------- | ------------ |
| mentions                | **0**        |
| entity_mentions         | 2,794,049    |
| relations               | 11,721       |
| entity_relationships    | 1,669,452    |
| timeline_events         | **0**        |
| global_timeline_events  | 416          |
| document_assets         | 13,110       |
| file_assets             | 14,581       |
| resolution_candidates   | **0**        |
| entity_merge_candidates | **0**        |
| evidence                | 11           |
| evidence_types          | 3            |
| evidence_entity         | **0**        |
| entity_evidence_types   | 110,563      |
| media_assets            | **0**        |
| media_items             | 98,952       |
| hypotheses              | 1            |
| hypothesis_evidence     | 9            |

**Tables confirmed empty (0 rows):** `mentions`, `timeline_events`, `resolution_candidates`, `entity_merge_candidates`, `evidence_entity`, `media_assets`

---

## 10. Column Overlap — Widely Shared Column Names

> Columns appearing in > 5 tables (indicates concept reuse or schema copy-paste):

| column           | table_count | tables (abbreviated)                                                                                                                                                                                                                 |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id               | 61          | virtually all tables                                                                                                                                                                                                                 |
| created_at       | 47          | most tables                                                                                                                                                                                                                          |
| document_id      | 18          | all document-linked tables                                                                                                                                                                                                           |
| updated_at       | 15          | entities, investigations, entity_relationships, etc.                                                                                                                                                                                 |
| description      | 14          | articles, evidence, hypotheses, investigations, etc.                                                                                                                                                                                 |
| status           | 14          | analytics_refresh_log, boilerplate_phrases, danger_motif_findings, entity_merge_candidates, forensic_signals, hypotheses, ingest_runs, investigation_leads, investigations, pipeline_runs, processing_jobs, relations, resolver_runs |
| investigation_id | 12          | all investigation-child tables                                                                                                                                                                                                       |
| confidence       | 12          | claim_triples, entity_adjacency, entity_mentions, entity_relationships, etc.                                                                                                                                                         |
| metadata_json    | 12          | collections, danger_motif_evidence, documents, evidence, financial_transactions, forensic_signals, etc.                                                                                                                              |
| title            | 12          | articles, danger_motif_findings, documents, entities, evidence, hypotheses, etc.                                                                                                                                                     |
| entity_id        | 10          | entity_adjacency, entity_evidence_types, entity_mentions, evidence_entity, etc.                                                                                                                                                      |
| notes            | 7           | black_book_entries, chain_of_custody, document_collections, entities, flights, ingest_runs, investigation_evidence                                                                                                                   |
| role             | 7           | document_assets, evidence_entity, flight_passengers, forensic_signal_entities, media_assets, media_item_people, users                                                                                                                |

---

## 11. Anomalies and Red Flags Summary

### Critical Structural Issues

1. **`entities.entity_type` vs `entities.type`** — Duplicate columns, both default 'Person'. 38,841 rows have mismatched values (7.4% of the 526K-row table). Active data drift. One column must be the canonical source; both are indexed.

2. **`forensic_signals.source_source`** — Column name is a doubled word. Likely `source_type` or `source_system` was intended. Only 1 row exists, so impact is minimal but the schema typo will persist.

3. **`document_annotations.document_id` is `integer` not `bigint`** — The FK target (`documents.id`) is `bigint`. PostgreSQL allows implicit cast but this is a type mismatch. Will cause issues if any document ID exceeds 2,147,483,647 (unlikely given 1.4M rows, but the schema is incorrect).

4. **`face_clusters.entity_id` is `integer` not `bigint`** — Same type mismatch against `entities.id` (bigint). With 524K entities, overflow is possible in the future.

5. **`media_item_people.media_item_id` is `bigint` but `media_items.id` is `text`** — Type mismatch with no FK constraint. Joins will fail or be implicit-cast-dependent.

### Duplicate/Dead Table Groups

6. **`mentions` (0 rows)** — Superseded by `entity_mentions`. The `resolution_candidates` → `mentions` FK chain is also dead. Both can be dropped after confirming no application code paths reference them.

7. **`timeline_events` (0 rows)** — Superseded by `investigation_timeline_events` (23 rows) and `global_timeline_events` (416 rows). Dead table.

8. **`media_assets` (0 rows)** — Structureless mirror of `document_assets`, never populated, no `media_id` FK constraint. Dead table.

9. **`entity_merge_candidates` (0 rows) and `resolution_candidates` (0 rows)** — Both serve entity deduplication. Both empty. `resolution_candidates` depends on empty `mentions`. Either both should be populated or cleaned up.

10. **`evidence_entity` (0 rows)** — The entity-evidence junction table for the legacy `evidence` system. Dead.

11. **`evidence` (11 rows) vs `documents` (1.4M rows)** — The `evidence` table is a vestigial document store. The 11 rows are referenced by `investigation_evidence.evidence_id`, `hypothesis_evidence`, and `chain_of_custody`. The investigation layer is split between the old `evidence` model and the newer `documents` model — `investigation_evidence` bridges both via `document_id` and `evidence_id`.

### Duplicate Index Groups (10 pairs, ~10 excess indexes)

12. `documents_fts_vector_index` + `idx_documents_fts` — exact duplicates on `documents.fts_vector`
13. `entities_name_trgm_idx` + `idx_entities_full_name_trgm` — exact duplicates on `entities.full_name` trgm
14. `idx_flight_passengers_flight` + `idx_flight_passengers_flight_id` — exact duplicates on `flight_passengers.flight_id`
15. `idx_flight_passengers_name` + `idx_flight_passengers_passenger_name` — exact duplicates on `passenger_name`
16. `forensic_signals_status_index` + `idx_forensic_signals_status` — exact duplicates on `forensic_signals.status`
17. `forensic_signals_signal_type_index` + `idx_forensic_signals_type` — exact duplicates on `signal_type`
18. `pipeline_runs_run_uuid_key` + `pipeline_runs_uuid` — exact duplicate UNIQUE constraints on `run_uuid`
19. `idx_investigation_leads_inv` + `investigation_leads_investigation_id_index` — exact duplicates on `investigation_id`
20. `idx_investigation_leads_status` + `investigation_leads_status_index` — exact duplicates on `status`
21. `boilerplate_phrases_sentence_hash_key` (UNIQUE) + `idx_boilerplate_phrases_hash` (non-unique) — redundant; the UNIQUE index already serves lookups

### Missing FK Constraints (unsafe references)

22. `entity_adjacency` — no FK to `entities` (intentional, performance optimization)
23. `financial_transactions.from_entity` / `to_entity` — text fields, no referential integrity to entities
24. `palm_beach_properties.linked_entity_id` — no FK to entities
25. `global_timeline_events.related_document_id` — no FK to documents
26. `processing_jobs.run_id` — no FK to pipeline_runs
27. `media_assets.media_id` — no FK to media_items (and table is empty)
28. `media_item_people.media_item_id` — no FK (type mismatch bigint vs text)

### Schema Design Debt

29. **`articles` table**: `link` and `url` are duplicates (url 100% NULL); `pub_date` and `published_date` are duplicates (published_date 100% NULL). Table has 32 rows.

30. **`documents` table**: 47 columns, multiple overlapping hash fields (`content_hash`, `content_sha256`, `hash_algo`, `normalized_text_sha256`), two timestamp columns (`date_created` + `created_at`), three source URL fields (`source_path`, `source_url`, `source_original_url`).

31. **`entity_mentions`**: Parallel offset pairs — `start_offset`/`end_offset` AND `position_start`/`position_end`. Both appear in the same rows; unclear which is canonical.

32. **`investigations.collaborator_ids`**: Stored as plain text `'[]'` (JSON in text) instead of jsonb or a proper junction table. The `investigation_collaborators` junction table exists and should be the canonical source.

33. **`investigation_timeline_events.start_date`/`end_date`**: Stored as text, not date/timestamp. Sorting and range queries are unreliable.

34. **`flights.date`**: Stored as text, not a date type.

35. **`entities.aliases`**: 99.94% NULL, trgm index exists on it. The index is consuming space to cover 322 rows maximum.

36. **`investigation_evidence` column order**: `id` is column 6 of 8 — indicates columns were added to an existing table without consideration of logical ordering. Not a correctness issue but indicates evolutionary schema drift.

---

## Appendix: Summary Statistics

| metric                               | value                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Total tables                         | 76                                                                                                                        |
| Total indexes                        | 227                                                                                                                       |
| Confirmed duplicate index pairs      | 10 (~10 excess indexes)                                                                                                   |
| Tables with 0 rows (dead)            | 6 (mentions, timeline_events, media_assets, entity_merge_candidates, resolution_candidates, evidence_entity)              |
| Tables with < 20 rows (near-dead)    | ~12 (evidence=11, investigations=3, hypotheses=1, forensic_signals=1, etc.)                                               |
| Largest table by size                | documents (6372 MB)                                                                                                       |
| Largest table by row count           | document_sentences (3,877,543)                                                                                            |
| Total FK constraints                 | 95                                                                                                                        |
| Confirmed missing FK constraints     | 7+                                                                                                                        |
| Type mismatch FK columns             | 3 (document_annotations.document_id, face_clusters.entity_id, media_item_people.media_item_id)                            |
| Columns with > 80% NULL              | aliases (99.94%), documents.extracted_date (84.18%), articles.url (100%), articles.published_date (100%)                  |
| Duplicate column pairs in same table | entities (entity_type/type), articles (link/url), articles (pub_date/published_date), documents (date_created/created_at) |
