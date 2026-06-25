# My Onboarding Notes

A living document for things I've learned, things that tripped me up, and questions I'm still working through. This is for me — not a formal doc.

---

## The Project in One Sentence

A searchable, cross-referenceable research platform for the Epstein Files corpus — built so journalists and researchers can actually use the documents, not just have access to them.

---

## Mental Model: How the Pieces Connect

```
Data (PDFs, flight logs, emails)
  ↓  scripts/unified_pipeline.ts  (ETL: OCR, entity extraction, risk scoring)
  ↓
PostgreSQL (entities, documents, communications, investigations, claims…)
  ↓
src/server/ (Express API — repositories → routes → Zod-validated responses)
  ↓
src/client/ (React SPA — contexts → hooks → components → design system)
  ↓
User (browse entities, search documents, run investigations, visualize networks)
```

---

## The Three Things That Confused Me Most (Captured Here So I Don't Re-Learn Them)

### 1. Which DB pool to use?

There are three pools and using the wrong one causes either silent degraded performance or outright connection exhaustion.

- **`getApiPool()`** — for route handlers. Read-only, short timeout. This is the default.
- **`getIngestPool()`** — only for the ingest pipeline. Heavy workloads, 8 connections.
- **`getMaintenancePool()`** — for backfills and repair scripts. Long timeouts, 256 MB work_mem.

Rule of thumb: if you're writing a route handler, use `getApiPool()`. If you're writing a script in `scripts/`, check which category it falls into.

### 2. The `sendValidated()` pattern

Every route response goes through `sendValidated()` which runs the Zod schema against the payload before sending. This means:

- If your mapper or repository returns something that doesn't match the Zod contract, it fails at response time, not silently.
- Always define your response Zod schema in `src/shared/contracts/` before writing the route.

### 3. URL state management

React Router `useSearchParams` is wrapped by a custom `useSearchParam` hook in `src/client/hooks/useSearchParam.ts`. Always use that hook — never read `window.location.search` directly. The reason: it keeps URL state in sync with React state and enables shareable deep links for every surface.

---

## My Entry Point

Starting with the **People/Entities surface** (`/subjects` API, entity cards, `SubjectDossierPanel`). It touches:

- Search and filtering (`FilterContext`, `/api/subjects` query params)
- Entity data model (risk scores, mentions, relations)
- The design system (cards, badges, empty states)

This is a contained surface that teaches the patterns without needing to understand the full pipeline.

---

## Key Files to Know First

| File                                            | Why it matters                                                 |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `src/client/design-system/lib/index.ts`         | The full component library — check here before building any UI |
| `src/shared/contracts/`                         | All Zod schemas — defines the client-server contract           |
| `src/server/db/`                                | Repository classes — where all SQL lives                       |
| `src/client/contexts/InvestigationsContext.tsx` | The investigation workspace state machine                      |
| `src/client/hooks/useSearchParam.ts`            | URL state — use this everywhere                                |
| `scripts/unified_pipeline.ts`                   | The ETL entry point (if ever touching data ingestion)          |

---

## Things I Want to Understand Better

- [ ] How entity risk scores are calculated (see `scripts/recalculate_entity_risk.ts`)
- [ ] The semantic search path vs lexical — `?mode=semantic` hits a different code path
- [ ] How the investigation board's drag-and-drop persistence works
- [ ] The `pgTyped` workflow — how SQL changes flow to TypeScript types

---

## Commands I Actually Use

```bash
pnpm local:setup      # First time: spin up Postgres, migrate, seed
pnpm dev              # Start everything
pnpm precheck         # Before any commit
pnpm type-check       # Quick TS check during dev
pnpm lint:fix         # Auto-fix lint issues
pnpm hygiene:clean    # Before opening a PR
```

---

## Gotchas

- **Tailwind is gone.** Don't add it. CSS Modules + design tokens only.
- **`src/client` cannot import from `src/server`** — the boundary check will catch it but it's worth knowing upfront.
- **No `SELECT *`** — always name columns explicitly. There's a check script for this.
- **Schema hash** — after any DB migration, run `pnpm schema:hash:update` and commit `docs/schema.hash` or CI will fail.
- **Node version** — needs ≥20.19. The project actually runs on Node 25.8.2 in production. Check with `node -v`.

---

## Questions for the Team

_(Add as you go)_

- ***

_Last updated: [fill in as you go]_
