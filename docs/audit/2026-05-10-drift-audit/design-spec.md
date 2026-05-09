# Drift Audit Design — 2026-05-10

## Goal

Produce a safe refactor blueprint that tightens schema, naming, relationships, and code surfaces across the Epstein Archive monolith without losing data. The audit covers the live PostgreSQL database, migrations, all server-side TypeScript, shared contracts, and the React frontend.

## Context

The app has accumulated drift from many agent-assisted development cycles:
- 76 live tables, 64 migrations (node-pg-migrate JS format)
- ~45 server repositories, 110+ server files, 432 frontend files
- Already-visible signals: `mentions` + `entity_mentions`, `relations` + `entity_relationships`, `timeline_events` + `global_timeline_events`, `document_assets` + `file_assets`, `resolution_candidates` + `entity_merge_candidates`, `articleRepository.ts` + `articlesRepository.ts`, `validate.ts` + `validation.ts`

## Approach

Sequential four-pass audit within a single execution context:

1. **Schema pass** — query live DB for all tables, columns, types, constraints, FK relationships, indexes, materialized views, and row counts. Cross-reference against migrations.
2. **Server-code pass** — read repositories, routes, services, mappers. Map actual DB table usage. Flag dead code, duplicates, naming mismatches.
3. **Shared-contract + frontend pass** — read DTOs, Zod schemas, frontend types, hooks, pages. Trace API consumption. Flag type mismatches and dead surfaces.
4. **Synthesis pass** — combine findings into 10 committed markdown files.

## Output

All files committed to `docs/audit/2026-05-10-drift-audit/`:

| File | Deliverable |
|------|-------------|
| `00-index.md` | Summary + table of contents |
| `01-domain-concept-inventory.md` | All named domain concepts across DB/code/UI |
| `02-duplicate-schema-report.md` | Overlapping tables and redundant columns |
| `03-canonical-naming-map.md` | Current → canonical name per layer |
| `04-relationship-integrity-report.md` | Missing/broken FKs, orphaned junction tables |
| `05-dead-surface-report.md` | Unused tables, routes, repos, components |
| `06-proposed-canonical-schema.md` | Target schema (no changes, goal state) |
| `07-staged-migration-plan.md` | Ordered steps to reach canonical schema |
| `08-rollback-preservation-plan.md` | Per-step rollback + data preservation |
| `09-ci-guardrails.md` | Tests and CI checks to prevent future drift |
| `10-prioritised-implementation-order.md` | Risk-ranked implementation order |

## Recommendation Format

Every recommendation includes:
- Current name
- Proposed canonical name
- Affected files
- Evidence from schema or code
- Migration required (yes/no)
- Risk level (low/medium/high)
- Rollback plan
- Disposition: safe-to-change-now / deprecate-gradually / needs-human-decision

## Rules

- Preserve all data
- Trace actual usage before recommending removal
- Prefer staged deprecation over destructive cleanup
- Do not merge concepts because names look similar — verify semantics
- Do not invent new structures unless they solve a documented problem
- Mark uncertain items as "needs human decision"
