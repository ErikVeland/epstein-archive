# 20.0 Hardening Notes (WIP)

This document tracks reliability and DTO/data-integrity hardening work aimed at a 20.0 release.

## Completed

### DTO integrity + validation

- Standardized several client components away from ad-hoc `fetch()` to `apiClient` + shared DTO/Zod parsing.
- Added server-side DTO validation for key entity endpoints (evidence/relations/claims/flights/transactions/properties).
- Added shared schema + DTO contract test coverage for:
  - `GET /api/entities/:id/relations`
  - `GET /api/documents/:id/lineage`

### Lint + TypeScript quality gates (no rule weakening)

- `pnpm lint` passes with the full rule set:
  - Deep-relative import prohibition enforced across `src/client/**/*`
  - `lucide-react` restricted to `src/client/components/common/Icon.tsx`
- `pnpm type-check` passes (TypeScript is now usable as a CI blocking gate).

### Golden path E2E (completed)

- Expanded `tests/golden-path.spec.ts` to cover fast entity switching race conditions.
- Added terminal state checks for entity modal tabs (ready/empty/error).
- Added rapid switching test to detect data leaking across entities.

### Icon coverage (completed)

- Added 25+ missing icons to `Icon.tsx` mapping: `ArrowDownLeft`, `BadgeCheck`, `Bot`, `Briefcase`, `Circle`, `Clock3`, `FileSignature`, `FileType`, `GripVertical`, `History`, `MessageCircle`, `Package`, `ScanText`, `ScrollText`, `SearchCheck`, `SlidersHorizontal`, `Sparkles`, `Type`, `Video`, and others.
- No runtime "missing icon" warnings should occur for UI icons.

### E2E coverage (completed)

- `tests/investigation-tabs-smoke.spec.ts` — smoke coverage for all 11 previously untested investigation workspace tabs (board, iceberg, intelligence, overview, activity, evidence, hypotheses, financial, team, analytics, forensic).
- `tests/investigation-board.spec.ts` — terminal state check + hypothesis creation round-trip for the board tab. Also added `data-testid="add-hypothesis-btn"` to `src/client/features/investigation/InvestigationBoard.tsx`.
- `tests/golden-path.spec.ts` (Golden Path D2) — PDF multi-page navigation (next/prev buttons, page counter). Also fixed pre-existing `?modalTab=pdf` bug in Golden Path D — correct param is `?viewMode=pdf`.

## Next (recommended)

1. **Performance budgets**
   - Enforce bundle size limits in CI via `rollup-plugin-visualizer` output.
