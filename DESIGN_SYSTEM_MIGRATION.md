# Design System Migration Status

This file tracks the real state of the migration from “Tailwind removed” to “one cohesive design system.”

## Current Status

- Tailwind retirement: complete
- Canonical UI layer: `src/client/design-system/lib`
- Compatibility layer: `src/client/components/ui/*` is deprecated and should only exist as a temporary bridge
- Runtime token source: `src/client/index.css`
- Governance:
  - `scripts/check_design_token_usage.ts` enforces token hygiene and governed-file design-system rules
  - `scripts/audit_design_system_usage.ts` reports one-off debt by pattern family
  - `scripts/design-system-exceptions.json` records temporary exceptions

## What Was Added In This Consolidation Pass

- Canonical design-system primitives for forms, overlays, feedback, pagination, and semantic chart tokens
- Deprecated `Glass*` components re-routed to the design-system implementation surface
- Runtime token duplication removed from `src/client/main.tsx`
- `src/designTokens.ts` converted into a JS helper layer backed by CSS variables instead of redefining `:root`
- Initial feature migrations onto the canonical surface:
  - `src/client/pages/PeoplePage.tsx`
  - `src/client/components/PropertyBrowser.tsx`
  - `src/client/components/properties/PropertyBrowseView.tsx`
  - `src/client/components/flights/FlightTracker.tsx`

## Remaining Migration Buckets

The broad backlog still exists and should be burned down by reusable pattern family, not by arbitrary file order.

1. Shared/common patterns
   - raw form controls
   - icon buttons and button bars
   - cards and empty states
   - global presentation classes
2. Browser and document surfaces
   - search/filter shells
   - modal headers and metadata rails
   - result cards and list rows
3. Investigation and media workflows
   - toolbar patterns
   - panel shells
   - data-dense action clusters
4. Visualizations
   - hardcoded palettes
   - local control styling
   - axis/grid/token normalization

## Verification Commands

```bash
pnpm type-check
pnpm check:design-tokens
pnpm check:design-tokens:strict
pnpm audit:design-system
pnpm build
```

## Definition Of Done

The migration is only complete when:

- shared UI concepts route through `src/client/design-system/lib`
- `components/ui/*` can be removed
- deprecated global presentation classes are no longer used in governed product surfaces
- new feature code no longer introduces raw interactive elements or presentational one-offs outside approved exceptions
