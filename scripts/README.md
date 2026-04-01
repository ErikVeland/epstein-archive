# Epstein Archive Scripts

> [!IMPORTANT]
> **SYSTEM SOURCE OF TRUTH** — All operations are consolidated into the `unified_pipeline.ts` and `deploy.sh`. Legacy SQLite/RTF scripts have been purged.

## Primary Pipelines

### `unified_pipeline.ts` — **The Evidence Orchestrator**

Continuous processing engine that runs ingestion, intelligence, and AI enrichment in a loop.

```bash
npx tsx scripts/unified_pipeline.ts --mode ingest  # New data only
npx tsx scripts/unified_pipeline.ts --mode full    # Full re-scan
```

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

| Script                   | Category     | Purpose                                                  |
| :----------------------- | :----------- | :------------------------------------------------------- |
| `ingest_pipeline.ts`     | Ingestion    | Phase 1: OCR, Text Extraction, and Parsing.              |
| `ingest_intelligence.ts` | Intelligence | Phase 2: Entity Resolution and Relationship Mapping.     |
| `unredact.py`            | Forensic     | Removes standard redaction layers from complex PDFs.     |
| `scan_faces_deepface.py` | Forensic     | Local Deepface clustering for biometric identification.  |
| `backfill_thumbnails.ts` | Assets       | Generates standard-res previews for all visual evidence. |

---

## Database Operations

- `pg_migrate.ts`: Executes migrations in `scripts/migrations/`.
- `pg_schema_hash.ts`: Verifies production schema matches local expectation.
- `pg_analyze_after_migrate.ts`: Refreshes query planner statistics.
- `pg_fix_mentions.ts`: Corrects overlapping entity mention spans.

---

## ⚠️ Deprecated (Purged)

The following legacy systems are no longer supported:

- `sync-db.ts` (SQLite/PG parity is deprecated)
- `post_deploy_verify.sh` (Replaced by `verify_ops.ts`)
- `tech_debt_scan.sh` (Debt addressed/purged)
- All RTF-specific one-off extraction scripts.
