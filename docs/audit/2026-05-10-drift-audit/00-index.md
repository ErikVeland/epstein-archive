# Drift Audit — Epstein Archive

**Date:** 2026-05-10  
**Auditor:** Claude Sonnet 4.6 (automated multi-pass audit)  
**Database:** PostgreSQL 16.10 @ localhost:5435  
**App version:** v20.8.0 (branch: main)

---

## Audit Summary

The Epstein Archive has accumulated substantial drift from many agent-assisted development cycles. The core data model is sound — entities, documents, and their relationships are well-populated and correctly structured — but a large number of speculative or transitional structures have been left behind.

**Current worktree note:** A follow-up validation pass found that some cleanup has already been partially applied. The current checkout is not server-typecheck-clean because `src/server/db/routesDb.ts` has been removed while eight route files still import it. See [11-current-worktree-validation.md](11-current-worktree-validation.md) before acting on the original staged plan.

### Key Metrics

| Surface              | Count |
| -------------------- | ----- |
| Live DB tables       | 76    |
| Migrations           | 64    |
| Server repositories  | 45    |
| Server route files   | 43    |
| Server service files | 29    |
| Frontend pages       | 35    |
| Frontend files total | 432   |

### Critical Findings

| #   | Category          | Severity                 | Summary                                                                                                                                                   |
| --- | ----------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Build drift**   | CRITICAL                 | `routesDb.ts` was removed but route imports remain; `pnpm type-check:server` fails with TS2307 in eight route files                                       |
| 1a  | **Live bug**      | RESOLVED in current tree | `relationshipsRepository.ts` now queries `entity_relationships`; the original stale `relationships` reference is no longer present                        |
| 2   | Data integrity    | RESOLVED in v21          | `entities.type` removed from `public`; legacy values archived; `entity_type` is canonical                                                                 |
| 3   | Dead table        | HIGH                     | `mentions` — 0 rows, fully superseded by `entity_mentions`                                                                                                |
| 4   | Dead table        | HIGH                     | `timeline_events` — 0 rows, superseded by `global_timeline_events`                                                                                        |
| 5   | Dead table        | RESOLVED in v21          | `media_assets` removed from `public`; media remains canonical through `media_items` / `file_assets` / `documents`                                         |
| 6   | Dead table        | RESOLVED in v21          | `evidence_entity` removed from `public`; entity evidence is derived from `investigation_evidence.document_id` + `entity_mentions`                         |
| 7   | Dead table        | MEDIUM                   | `resolution_candidates` — 0 rows, NLP resolution never run                                                                                                |
| 8   | Dead table        | RESOLVED in v21          | `entity_merge_candidates` archived and removed from `public`                                                                                              |
| 9   | Dead table        | RESOLVED in v21          | `collections` / `document_collections` archived and removed; `documents.source_collection` remains canonical                                              |
| 10  | Column bloat      | HIGH                     | `documents` has 60 columns with 8 source-tracking columns, 3 content columns, 4 hash columns                                                              |
| 11  | Overlap           | RESOLVED in v21          | `relations` archived and removed; `relation_evidence` now references canonical `entity_relationships` composite key                                       |
| 12  | Overlap           | RESOLVED in v21          | `evidence` removed from `public`; all 11 legacy rows preserved in `archive_v21.evidence_legacy`; investigation and hypothesis links now use `document_id` |
| 13  | FK mismatch       | MEDIUM                   | `document_annotations.document_id` is INTEGER, `documents.id` is BIGINT — silent truncation risk at 2.1B documents                                        |
| 14  | FK mismatch       | MEDIUM                   | `face_clusters.entity_id` is INTEGER, `entities.id` is BIGINT — same truncation risk                                                                      |
| 15  | Duplicate indexes | MEDIUM                   | 10 duplicate index pairs (9 tables) — write overhead with no query benefit                                                                                |
| 16  | Naming            | HIGH                     | `routesDb.ts` is not a route file — it's a health-check utility                                                                                           |
| 17  | Naming            | HIGH                     | `articleRepository.ts` duplicates `articlesRepository.ts`                                                                                                 |
| 18  | Naming            | MEDIUM                   | `validate.ts` vs `validation.ts` — two middleware files; `validation.ts` is dead                                                                          |
| 19  | Routes            | MEDIUM                   | `/api/entities` mounted 3 times in app.ts; `/api/investigations` mounted twice                                                                            |
| 20  | Routes            | MEDIUM                   | `downloads.ts` imported in app.ts but never mounted — unreachable endpoint                                                                                |
| 21  | Concept           | HIGH                     | "People" (UI) = "Entities" (DB/API) — inconsistent naming across all layers                                                                               |
| 22  | Document bloat    | PARTIAL in v21           | `source_original_url` and `original_file_path` removed; `start_offset`/`end_offset` retained because 42,647 rows contain data                             |
| 23  | Dead code         | MEDIUM                   | 6 dead mapper files, 5 dead repository files, 3 dead service files — all unimported                                                                       |
| 24  | Frontend          | LOW                      | `/investigate/case/:id/*` is an exact duplicate of `/investigations/:id` in App.tsx                                                                       |

---

## Deliverables

| File                                                                             | Contents                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------- |
| [01-domain-concept-inventory.md](01-domain-concept-inventory.md)                 | All named domain concepts across DB / code / UI |
| [02-duplicate-schema-report.md](02-duplicate-schema-report.md)                   | Overlapping tables and redundant columns        |
| [03-canonical-naming-map.md](03-canonical-naming-map.md)                         | Current → canonical name per layer              |
| [04-relationship-integrity-report.md](04-relationship-integrity-report.md)       | Missing/broken FKs, orphaned junction tables    |
| [05-dead-surface-report.md](05-dead-surface-report.md)                           | Unused tables, routes, repos, components        |
| [06-proposed-canonical-schema.md](06-proposed-canonical-schema.md)               | Target schema (goal state, no changes yet)      |
| [07-staged-migration-plan.md](07-staged-migration-plan.md)                       | Ordered steps to reach canonical schema         |
| [08-rollback-preservation-plan.md](08-rollback-preservation-plan.md)             | Per-step rollback + data preservation           |
| [09-ci-guardrails.md](09-ci-guardrails.md)                                       | Tests and CI checks to prevent future drift     |
| [10-prioritised-implementation-order.md](10-prioritised-implementation-order.md) | Risk-ranked implementation order                |
| [11-current-worktree-validation.md](11-current-worktree-validation.md)           | Current live-DB/worktree validation addendum    |

---

## Safe/Not Safe Summary

**Safe to act on immediately (low risk, clear evidence of disuse):**

- Drop `mentions` table (0 rows, FK-child `resolution_candidates` also empty)
- Drop `timeline_events` table (0 rows, superseded)
- Drop `media_assets` table (completed in v21)
- Rename `routesDb.ts` → `healthQueries.ts`
- Delete `articleRepository.ts` (duplicate of `articlesRepository.ts`)
- Delete `validate.ts` or `validation.ts` (one is unused)

**Needs staged deprecation:**

- `mentions` / `resolution_candidates` system — verify ingest pipeline doesn't write to these before dropping
- `evidence` table ecosystem — completed in v21; public schema now uses `documents` directly for evidence-bearing records
- `relations` table ecosystem — completed in v21; public schema now uses `entity_relationships` directly
- `documents` column cleanup — remove 100% null columns only after adding monitoring

**Needs human decision:**

- `relations` vs `entity_relationships` — both active, different semantics, clarify which is the canonical relationship store
- `evidence` ecosystem deprecation — completed in v21 with archived legacy tables and document-backed FKs
- Renaming "People" → "Entities" in the UI — SEO and user-familiarity trade-offs
