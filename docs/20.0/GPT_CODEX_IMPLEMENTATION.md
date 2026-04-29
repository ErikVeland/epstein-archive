# GPT/Codex Implementation Brief

## Mission

Own the repo-aware engineering plan for the 20.0 release. GPT/Codex is responsible for turning the product intent into scoped implementation packets that can be executed without file ownership conflicts.

## Current Repo Boundaries

Use these existing surfaces unless implementation proves they are insufficient:

- Investigation UI: `src/client/components/investigation`
- Document UI: `src/client/components/documents`
- Evidence UI: `src/client/components/evidence`
- Entity UI: `src/client/components/entities`
- Pages: `src/client/pages`
- API routes: `src/server/routes`
- Server services: `src/server/services`
- Postgres and migrations: `src/server/db/postgres`
- Shared schemas and DTOs: `src/shared/schemas`, `src/server/mappers`, and existing route-local validation patterns

## Implementation Packets

### Packet 1: Investigation Command Center

Goal: give users a clear entry point for active investigation work.

Owns:

- Dashboard view for investigations, recent activity, unresolved review items, and export readiness.
- Integration with existing investigation context and route structure.
- Loading, empty, error, and degraded-API states.

Implementation notes:

- Reuse existing investigation components where possible.
- Keep the first implementation read-oriented if mutation APIs already exist.
- Add new API fields only when existing investigation list/detail responses cannot support status, evidence count, conflict count, or export readiness.

### Packet 2: Reusable Provenance and Status Surfaces

Goal: make source, confidence, provenance, and review state visible across core surfaces.

Owns:

- Shared provenance/status badge components.
- Integration into entity dossier, document modal, evidence cards, and claim lists.
- DTO extensions for source hash, extraction method, confidence, review state, and verification state.

Implementation notes:

- Keep response additions backward-compatible.
- Use optional fields where historical data may not have coverage.
- Validate with Zod schemas and existing mapper conventions.
- Do not hide records that lack provenance; show explicit missing or unverified state.

### Packet 3: Evidence Packet Builder 2.0

Goal: turn export into a previewable, deterministic, review-grade workflow.

Owns:

- Export preview UI.
- Manifest summary UI.
- Export readiness checks.
- Human-readable warning display.
- Deterministic metadata compatibility with existing checksum tests.

Implementation notes:

- Preserve existing ZIP export endpoint behavior unless a new preview endpoint is required.
- Prefer adding a lightweight preview/readiness endpoint over overloading export download.
- Keep exported manifest shape stable for current tests unless explicitly versioned.

### Packet 4: Ambiguity and Review Queue

Goal: expose unresolved investigative uncertainty as a first-class workflow.

Owns:

- Review queue API and UI for alias conflicts, missing provenance, weak confidence, duplicate entities, and disputed dates.
- Review decisions that preserve original source data.
- Audit-friendly state transitions.

Implementation notes:

- First pass can aggregate existing signals instead of creating a broad new domain model.
- Add migrations only if there is no durable place to store review decisions.
- Review state must distinguish unresolved, accepted, rejected, deferred, and insufficient evidence.

### Packet 5: Search Upgrade

Goal: make search a primary investigative workflow.

Owns:

- Saved search affordances if persistence already exists or can be added simply.
- Filters for source type, confidence, review state, date range, entity type, and media type.
- Clear result explanations and direct jumps to source context.

Implementation notes:

- Preserve existing search endpoints for current callers.
- Extend query parameters additively.
- Avoid expensive broad queries without indexes or documented performance budget.

### Packet 6: Route-Level Loading, Error, and Degraded States

Goal: replace ambiguous blank or failed states with clear user-facing recovery states.

Owns:

- Route-level fallback UI.
- API-down/degraded states.
- Recoverable document/PDF/email/media loading failures.
- Mobile-safe state layouts.

Implementation notes:

- Reuse existing `ApiUnavailableScreen`, `OfflineIndicator`, lazy-load retry, scoped error boundary, and design-system primitives.
- Loading state must not look like "no data".
- Error state must name the failed resource and provide a retry or navigation action.

## Public Interface Expectations

Add or extend DTOs with:

- `sourceHash`
- `sourceId` or existing source document/media identifier
- `extractionMethod`
- `confidence`
- `reviewState`
- `verificationState`
- `lastVerifiedAt`
- `provenanceStatus`

Rules:

- Prefer additive optional fields.
- Keep legacy field names working for current clients.
- Use Zod validation for any new route response.
- Map database nulls to explicit API nulls, not empty strings.
- Keep export manifests deterministic and checksum-compatible.

## Engineering Constraints

- Follow existing design-system components and CSS Module patterns.
- Avoid unrelated refactors.
- Preserve current Vitest and Playwright layout.
- Add migrations only for durable state that cannot be represented now.
- Keep write sets narrow and announce integration points before touching shared files.
- Do not alter another model's planning doc except through integrator-approved changes.

## Suggested Implementation Order

1. Add shared DTO/schema extensions and mappers for provenance/review metadata.
2. Add reusable provenance/status UI components.
3. Integrate metadata into document, entity, evidence, and claim surfaces.
4. Add command center dashboard using existing investigation APIs where possible.
5. Add export preview/readiness UI and any required preview endpoint.
6. Add ambiguity/review queue aggregation.
7. Extend search filters and saved search behavior.
8. Harden route-level loading/error/degraded states.

## Required Verification Before Handoff

- `pnpm format:check`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test:unit`
- Relevant Playwright specs for changed surfaces
- `pnpm build:prod`
- Bundle smoke when export, routing, lazy loading, or shared UI boundaries change
