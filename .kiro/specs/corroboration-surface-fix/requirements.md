# Requirements Document

## Introduction

This document derives the functional and non-functional requirements from the design for the Corroboration surface fix. The work brings the `/claims/corroborated` page and the missing per-entity Corroboration tab into full compliance with the project's architecture, design system, and contract conventions.

---

## Requirements

### 1. Shared DTO and Zod Schema for Corroborated Claims

#### 1.1 Create `src/shared/dto/claims.ts`

**User story:** As a developer, I want a single canonical source of truth for the corroborated claim shape so that frontend and backend do not drift out of sync.

**Acceptance criteria:**

- The file must export `CorroboratedClaimDto`, `CorroboratedClaimsResponse`, and `EntityCorroboratedClaimsResponse` interfaces exactly as specified in the design.
- `CorroboratedClaimDto` must include: `subjectId: string`, `subjectName: string`, `predicate: string`, `objectId: string | null`, `objectName: string | null`, `objectText: string | null`, `corroborationCount: number`, `documents: Array<{ id: string; title: string }>`.
- `CorroboratedClaimsResponse` must wrap an array of `CorroboratedClaimDto` under the key `corroborated`.
- `EntityCorroboratedClaimsResponse` must extend the response with `total: number`, `limit: number`, `offset: number` pagination echo fields.
- No other file in the codebase shall define a local copy of these types — the existing inline type in `CorroborationPage.tsx` and the anonymous return type in `claimTriplesRepository.getCorroboratedClaims` must be replaced by imports from this file.

#### 1.2 Create `src/shared/schemas/claims.ts`

**User story:** As a developer, I want runtime Zod validation for both corroboration API responses so that schema violations surface immediately rather than silently producing incorrect UI.

**Acceptance criteria:**

- The file must export `corroboratedClaimDtoSchema`, `corroboratedClaimsResponseSchema`, and `entityCorroboratedClaimsResponseSchema`.
- `corroboratedClaimDtoSchema.shape.corroborationCount` must use `z.number().int().positive()` — a count of zero or negative must fail validation.
- `corroboratedClaimsResponseSchema` must validate that `corroborated` is an array of valid `corroboratedClaimDtoSchema` items.
- `entityCorroboratedClaimsResponseSchema` must validate `total`, `limit`, and `offset` as non-negative integers.
- Both schemas must be importable from `@shared/schemas/claims` using the project's path alias.

---

### 2. Backend: Repository Method for Per-Entity Corroborated Claims

#### 2.1 Add `getCorroboratedClaimsByEntity` to `claimTriplesRepository`

**User story:** As the API layer, I want to query corroborated claims scoped to a specific entity so that the per-entity tab can show relevant evidence strength data.

**Acceptance criteria:**

- The method signature must be: `getCorroboratedClaimsByEntity(entityId: string | number, options: { limit?: number; offset?: number }): Promise<{ rows: CorroboratedClaimDto[]; total: number }>`.
- The SQL query must use `WHERE ct.subject_entity_id = $1 OR ct.object_entity_id = $1` to capture claims where the entity appears as either subject or object.
- Results must be grouped by `(subject_entity_id, predicate, object_entity_id, object_text)` and filtered with `HAVING COUNT(DISTINCT document_id) > 1`.
- Results must be ordered by `corroborationCount DESC`.
- The total count must be computed in a parallel query (using `Promise.all`) rather than a sequential second query.
- The method must use parameterized queries — no string interpolation of `entityId`.
- The existing `getCorroboratedClaims` method must be updated to return `CorroboratedClaimDto[]` (the shared type) rather than an anonymous inline type.

---

### 3. Backend: New API Endpoint for Per-Entity Corroborated Claims

#### 3.1 Add `GET /api/entities/:id/claims/corroborated` to `entitiesRoutes.ts`

**User story:** As the `CorroborationTab` component, I need an endpoint scoped to a single entity so that I can display that entity's corroboration evidence without loading the global list.

**Acceptance criteria:**

- The route must be registered in `src/server/routes/entitiesRoutes.ts` as `router.get('/:id/claims/corroborated', ...)`.
- The route must validate parameters using a Zod schema passed to the existing `validate` middleware: `id` as a non-empty string, `limit` as a coerced integer in [1, 100] (default 20), `offset` as a coerced non-negative integer (default 0).
- If the entity does not exist (checked via `entitiesRepository.getEntityById`), the route must return `404 { error: 'Entity not found' }`.
- On success, the route must call `sendValidated(res, entityCorroboratedClaimsResponseSchema, payload)` — no raw `res.json` calls.
- The response payload must include `corroborated`, `total`, `limit`, and `offset`.

#### 3.2 Apply `sendValidated` to the existing `GET /api/claims/corroborated` route

**User story:** As the API contract layer, I want the existing global corroboration endpoint to validate its response shape so that runtime regressions are caught before they reach the client.

**Acceptance criteria:**

- The existing `res.json({ corroborated })` call in `src/server/routes/claimsRoutes.ts` must be replaced with `sendValidated(res, corroboratedClaimsResponseSchema, { corroborated })`.
- The behaviour of the endpoint must be otherwise unchanged.

---

### 4. Frontend: Refactor `CorroborationPage.tsx`

#### 4.1 Replace direct `fetch()` with `apiClient`

**User story:** As the frontend, I want all API calls to go through the shared `apiClient` so that error handling, retries, circuit-breaking, and auth refresh apply uniformly.

**Acceptance criteria:**

- The `fetch('/api/claims/corroborated')` call inside the `queryFn` must be replaced with `apiClient.get<CorroboratedClaimsResponse>('/claims/corroborated')`.
- The manual `if (!response.ok)` check and `response.json()` call must be removed — `apiClient` handles both.
- The `queryFn` must import `CorroboratedClaimsResponse` from `@shared/dto/claims` rather than a local interface.

#### 4.2 Remove all inline styles

**User story:** As a developer maintaining the design system contract, I want `CorroborationPage` to use only CSS Module class names and design system tokens so that the page is consistent with every other page in the application.

**Acceptance criteria:**

- After the refactor, the rendered DOM must contain zero `style="..."` attributes originating from `CorroborationPage.tsx` (verified by component test).
- Every spacing, color, and layout value must be expressed via CSS custom properties (`--space-N`, `--text-*`, `--status-*`, `--accent`, `--glass-border`, `--radius-*`) in a new `CorroborationPage.module.css` file.
- The loading state must use the `<Skeleton>` component from `src/client/design-system/lib`.
- The error state must use `<EmptyState>` from `src/client/design-system/lib`.
- The empty state (no claims) must use `<EmptyState>` from `src/client/design-system/lib`.
- Subject/Predicate/Object chips must use `<Badge>` from `src/client/design-system/lib`.
- The corroboration count indicator must use `<Badge>` styled via the strength threshold system.
- The document list must use `<Stack>` for vertical layout.
- Document links must not use `onMouseEnter`/`onMouseLeave` inline handlers — hover must be expressed in CSS.

#### 4.3 Remove local duplicate type definitions

**User story:** As a developer, I want to eliminate duplicated type definitions so that a future schema change only requires a single update.

**Acceptance criteria:**

- The local `CorroboratedClaim` and `CorroboratedClaimsResponse` interfaces defined at the top of `CorroborationPage.tsx` must be removed.
- Equivalent types must be imported from `@shared/dto/claims`.

---

### 5. Frontend: New `CorroborationTab` Component

#### 5.1 Create `src/client/components/entities/CorroborationTab.tsx`

**User story:** As an investigator viewing an entity profile, I want a Corroboration tab that shows all claims involving that entity ranked by how many independent documents support them, so that I can quickly assess the evidence strength for key allegations.

**Acceptance criteria:**

- The component must accept `entityId: string` and `entityName: string` props.
- Data must be fetched via `apiClient.get<EntityCorroboratedClaimsResponse>('/entities/${entityId}/claims/corroborated?limit=20&offset=0')`.
- The query key must be `['entity-corroborated-claims', entityId]`.
- Claims must be displayed in descending order by `corroborationCount` (the API guarantees this; no client-side sort is needed).
- Each claim card must display:
  - The full claim text (subject name + predicate + object name or object text)
  - A corroboration strength badge with count and color: 2–3 = amber (`--status-warning`), 4–9 = green (`--status-success`), 10+ = accent (`--accent`)
  - An expandable source list showing document title and a link to `/documents/${encodeURIComponent(doc.id)}`
- Expanding/collapsing the source list must be controlled by local component state (`useState`), not URL state.
- A "Load more" button must appear when `offset + 20 < total`. Clicking it must fetch the next page and append results to the displayed list.
- The loading state must use `<Skeleton>` stacked items.
- The empty state (zero corroborated claims for this entity) must use `<EmptyState>` with an appropriate message.
- All layout must use design system primitives (`Surface`, `Flex`, `Stack`, `Badge`, `Button`, `LqText`) and a `CorroborationTab.module.css` CSS Module — no inline styles.

#### 5.2 Wire `CorroborationTab` into the entity profile tab system

**User story:** As an investigator, I want to reach the Corroboration tab from the entity profile page using the existing tab navigation, so that the new surface is discoverable without a separate URL.

**Acceptance criteria:**

- The tab must be reachable via the URL pattern `/entity/:id?tab=corroboration`.
- URL state must be managed by the existing tab system's `useSearchParams` mechanism — not via `window.location.search` directly.
- The tab label visible in the tab bar must be "Corroboration".
- The `CorroborationTab` component must be lazy-loaded (same pattern as other entity tabs) to avoid increasing the initial bundle.

---

### 6. Design System Compliance (Cross-cutting)

#### 6.1 No Tailwind, no inline styles

**Acceptance criteria:**

- Neither `CorroborationPage.tsx` nor `CorroborationTab.tsx` nor their CSS Modules must contain any Tailwind utility classes.
- No `style={{ ... }}` props must appear in either component file after the refactor.
- All component imports must come from `src/client/design-system/lib` — no direct imports from sub-paths like `../design-system/components/Button`.

#### 6.2 Token vocabulary

**Acceptance criteria:**

- All spacing values in CSS Modules must use `var(--space-N)` tokens.
- All text styles must use `var(--text-*)` tokens or `<LqText>` variants.
- Color values must use design tokens (`--accent`, `--status-success`, `--status-warning`, `--status-error`, `--text-primary`, `--text-secondary`, `--text-muted`, `--glass-border`) — no hardcoded hex or `rgba(...)` values except `color-mix()` expressions using the above tokens.

---

## Glossary

- **DTO (Data Transfer Object)**: A typed interface shared between client and server that defines the shape of API payloads.
- **Zod schema**: A runtime validation schema that mirrors a DTO's shape and throws on violations.
- **`sendValidated`**: A project utility that validates a response payload against a Zod schema before sending it, ensuring API contract compliance.
- **`apiClient`**: The project's singleton HTTP client (`src/client/services/apiClient.ts`) that provides retry logic, circuit-breaking, auth refresh, and typed response handling.
- **Design system**: The set of shared UI primitives exported from `src/client/design-system/lib` — `Surface`, `Badge`, `LqText`, `Flex`, `Stack`, `Button`, `EmptyState`, `Skeleton`.
- **CSS Module**: A `.module.css` file whose class names are locally scoped at build time.
- **SPO**: Subject–Predicate–Object — the triple structure of a `claim_triple` database row.
- **Corroboration count**: The number of distinct `document_id` values associated with a grouped claim triple. A count ≥ 2 indicates multi-source corroboration.
- **Corroboration strength**: A three-tier classification of corroboration count: moderate (2–3), strong (4–9), high (10+), used to drive badge coloring.
