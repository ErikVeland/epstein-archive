# Epstein Archive Scripts

> [!IMPORTANT]
> **SYSTEM SOURCE OF TRUTH** — All operations are consolidated into the `unified_pipeline.ts` and `deploy.sh`.

## Primary Pipelines

### `unified_pipeline.ts` — **The Evidence Orchestrator**

Continuous processing engine that runs ingestion, intelligence, and AI enrichment in a loop.

```bash
npx tsx scripts/unified_pipeline.ts --mode ingest  # New data only
npx tsx scripts/unified_pipeline.ts --mode full    # Full re-scan
npx tsx scripts/unified_pipeline.ts --mode backfill # Provenance, VLM, AI, graph, semantic, analytics
npx tsx scripts/unified_pipeline.ts --list-stages   # Inspect every registered stage
npx tsx scripts/unified_pipeline.ts --mode backfill --stage semantic-embeddings
```

The orchestrator registers every stage in `pipeline_steps`, records aggregate
and document-level stage attempts in `document_stage_runs`, and stores AI
outputs in `document_ai_artifacts` with model, prompt version, provenance,
confidence, and review state. Legacy `documents.metadata_json` markers remain
for compatibility, but backfill safety now comes from stage version + input hash

- model identity.

### `deploy.sh` — **Canonical Production Deployer**

Handles pre-flight QA, database migration, code build, and zero-downtime restart.

```bash
./deploy.sh              # Full deploy
./deploy.sh --dry-run    # Preview flight
```

---

## Technical Audit & Hardening

Run the full suite to verify repository health and database performance.

| Script               | Purpose                                                  |
| :------------------- | :------------------------------------------------------- |
| `run_audit_suite.sh` | Orchestrates all audits (Lint, Types, PG, Ingest).       |
| `pg_system_audit.ts` | Checks Postgres extensions, configurations, and health.  |
| `pg_explain.ts`      | Verifies query plan integrity and index utilization.     |
| `stress_check.ts`    | Validates database pool safety and plan regressions.     |
| `ingest_audit.ts`    | Reports on document coverage and OCR quality.            |
| `verify_ops.ts`      | Post-deployment verification for backups and API health. |

---

## Specialized Processing

| Script                             | Category     | Purpose                                                            |
| :--------------------------------- | :----------- | :----------------------------------------------------------------- |
| `ingest_pipeline.ts`               | Ingestion    | Phase 1: OCR, Text Extraction, and Parsing.                        |
| `ingest_intelligence.ts`           | Intelligence | Phase 2: Entity Resolution and Relationship Mapping.               |
| `unredact.py`                      | Forensic     | Removes standard redaction layers from complex PDFs.               |
| `scan_faces_deepface.py`           | Forensic     | Local Deepface clustering for biometric identification.            |
| `backfill_thumbnails.ts`           | Assets       | Generates standard-res previews for all visual evidence.           |
| `backfill_semantic_embeddings.ts`  | Semantic     | Backfills pgvector document/entity embeddings.                     |
| `refresh_analytics_views.ts`       | Analytics    | Refreshes materialized views and planner stats after stage writes. |
| `backfill_image_ocr.ts`            | OCR          | Backfills image text extraction gaps.                              |
| `backfill_image_media.ts`          | Media        | Backfills image media records and album bindings.                  |
| `backfill_email_headers_pg.ts`     | Email        | Backfills structured email metadata.                               |
| `backfill_extracted_date.ts`       | Dates        | Backfills normalized extracted document dates.                     |
| `extract_media_from_docs.ts`       | Media        | Extracts embedded media from documents.                            |
| `ingest_faces.ts`                  | Forensic     | Ingests face-cluster intelligence.                                 |
| `compute_document_significance.ts` | Intelligence | Recomputes document significance signals.                          |
| `recalculate_entity_risk.ts`       | Intelligence | Recomputes entity risk from graph/evidence signals.                |

---

## Database Operations

- `pg_migrate.ts`: Executes Postgres migrations in `src/server/db/postgres/migrations/`.
- `pg_schema_hash.ts`: Verifies production schema matches local expectation.
- `pg_analyze_after_migrate.ts`: Refreshes query planner statistics.
- `pg_fix_mentions.ts`: Corrects overlapping entity mention spans.

---

## ⚠️ Deprecated (Purged)

The following legacy systems are no longer supported:

- All RTF-specific one-off extraction scripts.
