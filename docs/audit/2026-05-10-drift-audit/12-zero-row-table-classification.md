# Zero-Row Table Classification

Audit date: 2026-05-11  
Scope: live `public` schema after v21 drift cleanup.

This file separates empty-but-valid operational tables from stale overlap/speculative tables already removed in v21. Empty tables are not automatically drift; the deciding factor is whether the codebase still has an active write/read path and whether the table owns a distinct concept.

## Removed From Public In v21

These were archived under `archive_v21` before removal:

| Removed table                                          | Canonical source now                                        | Reason                                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `evidence`                                             | `documents` + `investigation_evidence.document_id`          | Duplicate evidence-bearing record.                                                             |
| `relations`                                            | `entity_relationships` + `relation_evidence`                | Duplicate graph relationship table; quote evidence was rewired to canonical relationship keys. |
| `collections`, `document_collections`                  | `documents.source_collection`                               | Empty document junction plus seed-only collection rows.                                        |
| `entity_merge_candidates`                              | none active                                                 | Empty speculative entity-dedup queue.                                                          |
| `evidence_types`, `entity_evidence_types`              | `documents.evidence_type` derived through `entity_mentions` | Stale denormalized taxonomy with weaker coverage than canonical document/mention data.         |
| `media_assets`, `evidence_entity`                      | `media_items`, `file_assets`, `entity_mentions`             | Empty overlap tables with migrated code paths.                                                 |
| `mentions`, `resolution_candidates`, `timeline_events` | `entity_mentions`, `global_timeline_events`                 | Empty legacy extraction/timeline tables.                                                       |

## Empty But Kept

These tables are empty in the current local dataset but should stay because they are active feature or operational surfaces:

| Table                                                                                   | Classification                 | Evidence of active purpose                                             |
| --------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `chain_of_custody`                                                                      | Investigation feature table    | Routes/repositories support custody events by canonical `document_id`. |
| `claim_triples`                                                                         | Extraction output              | Claim extraction and intelligence review surfaces query/write it.      |
| `danger_motif_*`                                                                        | Intelligence feature tables    | Danger motif service/tests use these structures.                       |
| `document_annotations`                                                                  | User annotation feature        | Document annotation routes write/read it.                              |
| `document_assets`, `file_assets`                                                        | File/provenance feature tables | Asset service and provenance flows use these tables.                   |
| `document_pages`, `document_spans`, `redaction_spans`                                   | OCR/redaction feature tables   | OCR/redaction scripts and document detail views use these.             |
| `document_provenance_events`                                                            | Provenance ledger              | Provenance service writes events and computes completeness.            |
| `entity_adjacency`, `graph_cache_state`                                                 | Graph cache tables             | Relationship repository owns cache rebuild/read paths.                 |
| `entity_connection_signals`                                                             | Connection signal cache        | Entity connection fallback/cache path.                                 |
| `evidence_chain_items`                                                                  | Iceberg investigation feature  | Iceberg repository writes evidence-chain items.                        |
| `face_clusters`, `faces`                                                                | Face recognition feature       | Face clustering/review repositories and scripts use them.              |
| `financial_transactions`, `flight_passengers`, `flights`                                | Extraction domain tables       | Financial/flight extractors and routes own these concepts.             |
| `forensic_signal_*`, `forensic_signals`                                                 | Forensic signal feature        | Forensic signal service writes these tables.                           |
| `global_timeline_events`                                                                | Curated/global timeline        | Timeline routes use this canonical table.                              |
| `hypotheses`, `hypothesis_evidence`                                                     | Investigation feature          | Investigation workspace supports hypotheses linked to documents.       |
| `investigation_*`, `investigations`                                                     | Investigation feature          | Routes/repositories actively own these workflows.                      |
| `media_album_items`, `media_item_people`                                                | Media feature                  | Media routes/repositories use these joins.                             |
| `migration_watermarks`, `pipeline_*`, `processing_jobs`, `ingest_runs`, `resolver_runs` | Operational tables             | Pipeline/job/migration scripts own these.                              |
| `quality_flags`                                                                         | Review/quality feature         | Review/data-quality paths use this table.                              |
| `refresh_tokens`, `users`, `audit_log`, `web_vitals`                                    | Auth/audit/telemetry           | App-level operational tables.                                          |
| `palm_beach_properties`                                                                 | Domain feature                 | Property routes/repository own this concept.                           |

## Guardrail

`pnpm check:schema-identifiers` now blocks reintroducing retired table SQL references and retired duplicate identifiers such as `original_file_path`, `originalFilePath`, `entities.type`, and investigation `evidence_id` link columns outside migrations/generated code.
