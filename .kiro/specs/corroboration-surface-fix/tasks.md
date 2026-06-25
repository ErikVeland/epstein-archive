# Implementation Plan: Corroboration Surface Fix

## Overview

Tasks are ordered so that shared contracts are established first, the backend is wired next, and the frontend consumes them last. Each task is independently committable.

## Tasks

- [ ] 1. Create shared DTO file `src/shared/dto/claims.ts`
  - Export `CorroboratedClaimDto`, `CorroboratedClaimsResponse`, and `EntityCorroboratedClaimsResponse` interfaces as specified in the design
  - Verify the file is importable via the `@shared/dto/claims` path alias
  - _Requirements: 1.1_

- [ ] 2. Create shared Zod schema file `src/shared/schemas/claims.ts`
  - Export `corroboratedClaimDtoSchema`, `corroboratedClaimsResponseSchema`, `entityCorroboratedClaimsResponseSchema`
  - Ensure `corroborationCount` uses `z.number().int().positive()`
  - Verify importable via `@shared/schemas/claims`
  - _Requirements: 1.2_

- [ ] 3. Update `claimTriplesRepository`: align `getCorroboratedClaims` return type
  - Change the return type annotation from the inline anonymous type to `Promise<CorroboratedClaimDto[]>` using the new shared DTO
  - Import `CorroboratedClaimDto` from `@shared/dto/claims`
  - Verify the existing `claimsRoutes.ts` still compiles after the type change
  - _Requirements: 2.1_

- [ ] 4. Add `getCorroboratedClaimsByEntity` to `claimTriplesRepository`
  - Implement `getCorroboratedClaimsByEntity(entityId, { limit?, offset? })` returning `Promise<{ rows: CorroboratedClaimDto[]; total: number }>`
  - Use the SQL from the design: `WHERE subject_entity_id = $1 OR object_entity_id = $1`, `GROUP BY`, `HAVING COUNT(DISTINCT document_id) > 1`, `ORDER BY corroborationCount DESC`
  - Run the count query and data query in parallel with `Promise.all`
  - Use parameterized queries — no string interpolation of entityId
  - _Requirements: 2.1_

- [ ] 5. Apply `sendValidated` to `GET /api/claims/corroborated`
  - Import `corroboratedClaimsResponseSchema` and `sendValidated` in `claimsRoutes.ts`
  - Replace `res.json({ corroborated })` with `sendValidated(res, corroboratedClaimsResponseSchema, { corroborated })`
  - Verify endpoint still returns the correct shape via a curl or test call
  - _Requirements: 3.2_

- [ ] 6. Add `GET /api/entities/:id/claims/corroborated` to `entitiesRoutes.ts`
  - Define `entityCorroboratedQuerySchema` with params (`id: z.string().min(1)`) and query (`limit`, `offset`)
  - Register `router.get('/:id/claims/corroborated', validate(entityCorroboratedQuerySchema), handler)`
  - Handler must: check entity exists via `entitiesRepository.getEntityById` (return 404 if not), call `claimTriplesRepository.getCorroboratedClaimsByEntity`, call `sendValidated(res, entityCorroboratedClaimsResponseSchema, payload)`
  - Confirm the route is registered before the existing `router.get('/:id', ...)` wildcard to avoid shadowing
  - _Requirements: 3.1_

- [ ] 7. Refactor `CorroborationPage.tsx` — replace `fetch()` with `apiClient`
  - Remove the `fetch('/api/claims/corroborated')` call and the manual `response.ok` check
  - Replace with `apiClient.get<CorroboratedClaimsResponse>('/claims/corroborated')`
  - Import `CorroboratedClaimsResponse` from `@shared/dto/claims` and remove the local interface definitions
  - _Requirements: 4.1, 4.3_

- [ ] 8. Create `src/client/pages/CorroborationPage.module.css`
  - Define class names for: `page`, `claimList`, `claimCard`, `claimCardHeader`, `spoRow`, `subjectBadge`, `predicateBadge`, `objectBadge`, `strengthBadge`, `strengthModerate`, `strengthStrong`, `strengthHigh`, `docList`, `docLink`
  - Use only `var(--space-*)`, `var(--text-*)`, `var(--radius-*)`, `var(--status-*)`, `var(--accent)`, `var(--glass-border)` tokens
  - Implement `:hover` rule for `docLink` replacing the `onMouseEnter`/`onMouseLeave` inline handlers
  - _Requirements: 4.2, 6.1, 6.2_

- [ ] 9. Refactor `CorroborationPage.tsx` — replace inline styles with CSS Modules and design system components
  - Import and apply classes from `CorroborationPage.module.css`
  - Replace loading `<div style={...}>` with `<Skeleton>` components
  - Replace error `<div style={...}>` with `<EmptyState>`
  - Replace empty `<div style={...}>` with `<EmptyState>`
  - Replace SPO `<span style={...}>` chips with `<Badge>` components
  - Replace corroboration count `<span style={...}>` with `<Badge>` using strength class
  - Replace document list `<div style={{ display: 'flex', flexDirection: 'column' }}>` with `<Stack>`
  - Remove `onMouseEnter`/`onMouseLeave` handlers from document links
  - Verify zero `style=` attributes in the rendered DOM
  - _Requirements: 4.2, 6.1, 6.2_

- [ ] 10. Create `src/client/components/entities/CorroborationTab.tsx`
  - Accept `entityId: string` and `entityName: string` props
  - Fetch via `apiClient.get<EntityCorroboratedClaimsResponse>` using query key `['entity-corroborated-claims', entityId]`
  - Render claim cards with: full claim text, strength badge (amber/green/accent by count), expandable doc source list with `useState` toggle
  - Implement "Load more" pagination: track `offset` in state, append results on load
  - Loading state: `<Skeleton>` stacked items; empty state: `<EmptyState>`; all layout via design system primitives
  - No inline styles
  - _Requirements: 5.1_

- [ ] 11. Create `src/client/components/entities/CorroborationTab.module.css`
  - Define class names for the tab's card layout, strength badge variants, expandable source list, load-more button area
  - Match the token vocabulary from `CorroborationPage.module.css`
  - _Requirements: 5.1, 6.1, 6.2_

- [ ] 12. Wire `CorroborationTab` into the entity profile tab system
  - Identify where entity profile tabs are declared (the component consuming `?tab=` from `useSearchParams`)
  - Add `corroboration` as a valid tab key alongside existing tabs
  - Lazy-load `CorroborationTab` with `React.lazy()` and wrap in `<Suspense>`
  - Add "Corroboration" label to the tab bar
  - Verify that `/entity/:id?tab=corroboration` renders `CorroborationTab` with the correct `entityId`
  - _Requirements: 5.2_

- [ ] 13. End-to-end verification
  - Confirm `CorroborationPage` at `/claims/corroborated` renders without any inline `style=` attributes
  - Confirm `GET /api/claims/corroborated` response passes `corroboratedClaimsResponseSchema.parse()`
  - Confirm `GET /api/entities/:id/claims/corroborated` responds with correct shape and 404 for unknown IDs
  - Confirm `/entity/:id?tab=corroboration` loads and displays the `CorroborationTab`
  - Confirm TypeScript compiles with zero errors across all modified files (`tsc --noEmit`)
  - _Requirements: all_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "description": "Shared contracts — DTO and Zod schema. No dependencies. Can be worked in parallel."
    },
    {
      "wave": 2,
      "tasks": ["3", "4"],
      "description": "Repository layer — depends on DTO from wave 1."
    },
    {
      "wave": 3,
      "tasks": ["5", "6"],
      "description": "API routes — depends on Zod schemas (wave 1) and repository methods (wave 2)."
    },
    {
      "wave": 4,
      "tasks": ["7", "8", "9"],
      "description": "Page refactor — depends on DTO (task 1) and apiClient. Tasks 8 and 9 should be done together."
    },
    {
      "wave": 5,
      "tasks": ["10", "11", "12"],
      "description": "CorroborationTab — depends on new API route (task 6) and DTO (task 1)."
    },
    {
      "wave": 6,
      "tasks": ["13"],
      "description": "Final end-to-end verification. Depends on all prior tasks."
    }
  ]
}
```

Tasks 1 and 2 are independent and can be worked in parallel. Tasks 3–6 depend on 1 and 2. Tasks 7–9 can proceed once task 1 is done. Tasks 10–12 require tasks 4 and 6. Task 13 is the final verification gate.

## Notes

- Task 6 must register the new route **before** `router.get('/:id', ...)` to avoid the wildcard handler shadowing it. Express matches routes in registration order.
- The existing `SharedDetailPage.module.css` imported by `CorroborationPage` should be retained for the breadcrumb and hero surface classes that are already correct — only new CSS for the claim list area goes in `CorroborationPage.module.css`.
- `CorroborationPage.module.css` is a new file; `SharedDetailPage.module.css` should not be modified.
- When adding the `CorroborationTab` to the entity profile, check the existing tab registration pattern in `EntityEvidencePanel.tsx` or the parent profile component — do not break existing tabs.
