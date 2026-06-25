# Epstein Archive — Kiro Steering Context

This file is automatically loaded into every Kiro session for this workspace.
It gives Kiro the project-specific knowledge needed to write correct code without
re-explanation each time.

---

## What This Project Is

A full-stack investigative research platform for browsing, searching, and
cross-referencing the Epstein Files corpus. It serves journalists, researchers,
and the public at **epstein.academy**.

Scale: 86,000+ entities, 51,000+ documents, 500+ media files, full-text + semantic
search, network graphs, geospatial maps, and a collaborative investigation workspace.

**Stack:** React 19 + Vite (SPA, no SSR) · Express 5 API · PostgreSQL 16+ · pnpm · Node ≥20.19

---

## Project Layout

```
src/
  client/         # React SPA — all browser code lives here
    design-system/lib/   # canonical component library (the ONLY place to import from)
    components/   # feature components
    hooks/        # custom hooks
    contexts/     # React context providers
  server/         # Express API + DB layer
    routes/       # one file per domain (entities, documents, investigations…)
    db/           # repository classes — route handlers must use these, never inline SQL
    mappers/      # DTO mappers
  shared/         # contracts, DTOs, schemas — shared by client AND server
    contracts/    # Zod schemas for all client-server communication
    dto/          # DTO models — single source of truth for payloads
scripts/          # ETL pipeline, maintenance, CI gate scripts
docs/             # Architecture wiki, API reference, user guide
```

---

## Non-Negotiable Architecture Rules

### Database — Three Pool Strategy

Never use an ad-hoc `new Pool()`. Always pick the right pool:

| Pool                   | Function                       | Use for                             |
| ---------------------- | ------------------------------ | ----------------------------------- |
| `getApiPool()`         | Read-only, short timeout       | Route handlers, analysis scripts    |
| `getIngestPool()`      | Heavy workloads, 8 connections | Ingest pipeline scripts only        |
| `getMaintenancePool()` | Long timeouts, 256 MB work_mem | Backfill, repair, migration scripts |

### Repository Pattern

Route handlers **must not** contain SQL. They call repository classes in
`src/server/db/`. Direct pool usage in routes is forbidden.

### Zod Contracts

All client-server communication is validated with Zod schemas in
`src/shared/contracts/`. All responses use the `sendValidated()` helper — never
send unvalidated data.

### Client-Server Boundary

`src/client` must never import from `src/server`. Enforced by:

```bash
pnpm check:boundaries
```

### URL State

All major surface state lives in the URL (shareable, bookmarkable). Use the
`useSearchParam` hook from `src/client/hooks/useSearchParam.ts`. Never touch
`window.location.search` directly in React components.

---

## Design System — Liquid Glass

**Canonical import:** `src/client/design-system/lib` — never `src/client/components/ui/*`

**Tailwind is removed.** Do not add it. Use CSS Modules for layout; use design
tokens (CSS custom properties) for colors and spacing.

### Foundation Primitives (always use these, never hand-roll)

- Layout: `Box`, `Flex`, `Stack`, `Grid`
- Surfaces: `Surface`
- Typography: `LqText`
- Actions: `Button`
- Forms: `TextInput`, `SearchField`, `Select`, `Textarea`, `Switch`
- Overlays: `Dialog`, `DropdownMenu`, `Tooltip`
- Feedback: `Badge`, `EmptyState`, `Pagination`

### Do Not Hand-Roll

Buttons, segmented controls, tabs, switches, inputs, selects, badges, cards,
modals, drawers, tooltips, empty/loading/error states, or browser/viewer shells.
If a shared equivalent exists, use it. If it's close but not quite right, extend
it via props — don't fork it locally.

### Exceptions

Time-boxed exceptions go in `scripts/design-system-exceptions.json` with owner,
reason, and expiry. No silent workarounds.

### Token Source

CSS custom properties defined in `src/client/index.css` are the runtime source
of truth. Semantic names preferred: `--risk-high`, `--nav-flights`, `--accent-warning`.
Do not redefine tokens in JS.

---

## TypeScript Standards

- No implicit or explicit `any` — everything is typed.
- No `useEffect` for state derivation — compute in render phase.
- pgTyped generates TypeScript types from raw SQL in `packages/@epstein/db`.

---

## Quality Gates (run before every commit)

```bash
pnpm type-check              # no TS errors or any violations
pnpm type-check:server       # server-side strict check
pnpm lint                    # ESLint
pnpm format:check            # Prettier
pnpm check:boundaries        # client never imports server
pnpm schema:hash:check       # DB schema hash integrity
pnpm check:shared-component-drift  # no hand-rolled shared UI
```

Or run all at once:

```bash
pnpm precheck
```

After any DB migration:

```bash
pnpm schema:hash:update   # then commit the updated docs/schema.hash
```

---

## Key Contexts and Hooks

| Name                       | Location               | Purpose                     |
| -------------------------- | ---------------------- | --------------------------- |
| `AuthContext`              | `src/client/contexts/` | Current user, JWT state     |
| `FilterContext`            | `src/client/contexts/` | Global search/filter state  |
| `InvestigationsContext`    | `src/client/contexts/` | Active investigation state  |
| `SensitiveSettingsContext` | `src/client/contexts/` | Blur/redaction preferences  |
| `useSearchParam`           | `src/client/hooks/`    | URL search param read/write |

---

## API Basics

- Base: `http://localhost:3000/api` (dev) · `https://epstein.academy/api` (prod)
- Auth: JWT Bearer, 15-min expiry. Refresh token in HttpOnly cookie at `/api/auth`.
- Role hierarchy: `admin` → `investigator` → `viewer`
- All errors: `{ "error": "string" }` · Zod failures add `"details": []`

Key route files: `src/server/routes/entities.ts`, `documents.ts`,
`investigations.ts`, `media.ts`, `flights.ts`, `search.ts`

---

## Security Rules (non-negotiable)

- Parameterized queries only — string concatenation in SQL is forbidden.
- Never log raw SQL, JWTs, passwords, or document text excerpts.
- File uploads validated server-side by file signature (not just extension).
- `SELECT *` is banned — always name columns explicitly.

---

## Local Dev Quick Reference

```bash
pnpm local:setup      # Docker Postgres + migrate + minimal seed (recommended first run)
pnpm dev              # Start frontend + API (http://localhost:5173)
pnpm server           # API only (http://localhost:3000)
pnpm test:unit        # Vitest unit tests
pnpm local:smoke      # Smoke test the local stack
```

---

## What NOT to Commit

These paths are gitignored and blocked by pre-commit hooks:

- `docs/llm_handover/` · `docs/explain/` · `.claude/` · `.playwright-mcp/` · `.pnpm-store/`

Clean up before PRs:

```bash
pnpm hygiene:clean
pnpm precheck
```
