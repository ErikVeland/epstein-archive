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
- **Legal Header and Metadata**: Include an automated "Chain of Custody" section in the README, detailing app version, schema hash, and generation timestamp.
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
- **Bulk Triage API**: Add endpoint for bulk accepting or rejecting automated matches (e.g., `POST /api/review/bulk`).
- **Flagging API**: Add endpoint for user-initiated review requests on entities/claims.
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
- **Onboarding and Command Palette**:
  - `CommandPalette` component using a library like `cmdk` or similar.
  - `Onboarding` modal/tour triggered by version bump in `localStorage`.
- **Archive Status**:
  - Global "Archive Sync" indicator using a lightweight endpoint (e.g., `/api/status/archive`).
- Recoverable document/PDF/email/media loading failures.
- Mobile-safe state layouts.

Implementation notes:

- Reuse existing `ApiUnavailableScreen`, `OfflineIndicator`, lazy-load retry, scoped error boundary, and design-system primitives.
- Loading state must not look like "no data".
- Error state must name the failed resource and provide a retry or navigation action.

### Packet 7: Standardization and Hardened Style

Goal: bring existing investigative surfaces into compliance with the 20.0 hardened standards.

Owns:

- Migration of all direct `lucide-react` imports to the `Icon` component.
- Refactor of relative path imports to use `@client/`, `@server/`, and `@shared/` aliases.
- Audit and update of Express routes to ensure 100% `sendValidated` coverage.
- Conversion of ad-hoc layout CSS to design system primitives (`Stack`, `Flex`, `Grid`).

Implementation notes:

- Prioritize high-traffic surfaces: Search, Entity Dossier, Document Modal.
- Standardize icon sizes and colors across the app using the `Icon` component props.
- Fix any `strict` mode TypeScript errors revealed by the type-check gate.

## Public Interface Expectations

### Canonical Provenance Field Table

All provenance-bearing DTOs add these fields. Names here are canonical —
use them exactly in Zod schemas, mappers, and React prop types.

| Field              | Type                                                                                | Nullable | Description                                                  |
| ------------------ | ----------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| `sourceDocumentId` | `number \| null`                                                                    | yes      | FK to the source document record                             |
| `sourceHash`       | `string \| null`                                                                    | yes      | Immutable content hash of the source file                    |
| `extractionMethod` | `'ocr' \| 'manual' \| 'structured' \| 'agentic' \| null`                            | yes      | How the fact was extracted                                   |
| `confidence`       | `number \| null`                                                                    | yes      | Machine confidence 0–1; null = not assessed                  |
| `reviewState`      | `'unreviewed' \| 'accepted' \| 'rejected' \| 'deferred' \| 'insufficient_evidence'` | no       | Default `'unreviewed'`                                       |
| `lastVerifiedAt`   | `string \| null`                                                                    | yes      | ISO-8601; null = never verified                              |
| `provenanceStatus` | `'complete' \| 'partial' \| 'missing'`                                              | no       | Derived: complete if hash+method present, missing if neither |

Rules:

- All fields are **optional additions** to existing DTOs — do not break existing
  callers by making them required.
- Map database nulls to explicit API nulls, never empty strings.
- Use Zod `.optional()` for fields that may be absent in legacy data.
- `provenanceStatus` is a **derived field**: compute it in the mapper, never
  store it in the DB.
- Keep export manifests deterministic and checksum-compatible.

### Archive Status Endpoint

`GET /api/status/archive` — lightweight, no auth required, used by the global
freshness indicator.

Response shape (Zod schema to add to `src/shared/schemas/stats.ts`):

```typescript
export const archiveStatusSchema = z.object({
  lastIngestedAt: z.string().nullable(), // ISO-8601 of most recent ingest run
  status: z.enum(['current', 'stale', 'unknown']),
  // current  = lastIngestedAt within 48h
  // stale    = lastIngestedAt older than 48h
  // unknown  = no ingest record found
  documentCount: z.number().int(),
  entityCount: z.number().int(),
});
export type ArchiveStatusDto = z.infer<typeof archiveStatusSchema>;
```

Implement in `src/server/routes/stats.ts`. Query: `SELECT MAX(created_at) FROM
ingest_runs` (or the closest existing table that records pipeline runs).

## Engineering Constraints

- Follow existing design-system components and CSS Module patterns.
- Avoid unrelated refactors.
- Preserve current Vitest and Playwright layout.
- Add migrations only for durable state that cannot be represented now.
- Keep write sets narrow and announce integration points before touching shared files.
- Do not alter another model's planning doc except through integrator-approved changes.
- **NEW**: All mapper files must have typed interfaces, no `Record<string, any>`
- **NEW**: Use `interface FooInput { field?: unknown }` pattern for DB row mapping
- **NEW**: Cast to typed interfaces inside mapper functions, not at boundaries
- **NEW**: Run `pnpm lint:fix` before committing type changes

## Suggested Implementation Order

1. Add shared DTO/schema extensions and mappers for provenance/review metadata.
2. Add reusable provenance/status UI components.
3. Integrate metadata into document, entity, evidence, and claim surfaces.
4. Add command center dashboard using existing investigation APIs where possible.
5. Add export preview/readiness UI and any required preview endpoint.
6. Add ambiguity/review queue aggregation.
7. Extend search filters and saved search behavior.
8. Harden route-level loading/error/degraded states.
9. **NEW**: Lint warning cleanup (see Packet 7).

## Implementation Log

### 2026-04-29 — Packet 2 Status

Scope completed:

- Canonical provenance DTO/schema added in `src/shared/dto/provenance.ts` and `src/shared/schemas/provenance.ts`.
- Provenance mapper helper added in `src/server/mappers/provenanceDtoMapper.ts`.
- Entity, document, and entity-evidence DTO/schema contracts now include optional provenance fields.
- Document/entity/entity-evidence mappers now emit explicit provenance fields with `provenanceStatus` derived from source hash and extraction method.
- Existing `ProvenanceBadge` aligned to canonical review states and extraction methods.
- Document cards, document modal header/metadata rail, person/entity cards, evidence result cards, and AI claim rows now surface provenance status.
- Entity cards can open the linked source document when `sourceDocumentId` is present; evidence snippets show source badges for linked context/passages.
- Focused unit coverage added in `src/test/provenanceDtoMapper.test.ts` for provenance normalization plus document/entity/evidence mapper propagation.

Verification:

- Passed: `pnpm exec vitest run src/test/provenanceDtoMapper.test.ts` (5 tests).
- Passed: `pnpm format:check`.
- Passed: `pnpm lint`.
- Passed: `pnpm type-check`.
- Passed: `pnpm test:unit` (21 test files passed, 1 skipped; 74 tests passed, 16 skipped).
- Partial: `pnpm build:prod` now completes prebuild gates and the Vite client build.
- Blocked: `pnpm build:prod` fails in the final server compile step (`tsc -p tsconfig.server.json`) with 93 server type errors, mostly generated pgtyped repository contract mismatches plus a server-excluded `exif-parser` declaration.

Next Packet 2 work:

- Restore the server production-build baseline before browser release testing.
- Add Playwright source-first smoke coverage once the broader type-check/build baseline is restored.
- Audit any less-traveled claim-specific surfaces outside `ClaimsTab` or evidence results once route/UI sync coverage is available.

### Packet 7: Lint Warning Cleanup

Goal: Achieve 0 lint warnings in production code.

Owns:

- `src/app.ts` lines 429, 434, 439, 446 (4 `no-explicit-any` warnings) - **COMPLETED 2026-04-29**

Implementation notes:

- Replace `any` types with explicit interfaces or `Record<string, unknown>`
- Follow existing patterns in `src/server/auth/middleware.ts`
- Run `pnpm lint:fix` to auto-fix formatting

Acceptance:

- [x] `pnpm lint` shows 0 warnings (completed)
- [x] All type annotations are explicit (no `any`)
- [ ] `pnpm lint` maintains 0 warnings in future changes

## Required Verification Before Handoff

- `pnpm format:check`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test:unit`
- Relevant Playwright specs for changed surfaces
- `pnpm build:prod`
- Bundle smoke when export, routing, lazy loading, or shared UI boundaries change
