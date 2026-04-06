# Design System Migration

This document is the canonical source of truth for the Tailwind-to-design-system migration in `epstein-archive`.

Legacy phase labels such as `Phase 4C`, `Phase 7`, and `Phase 9f` are retired. Going forward, work is organized by migration waves and enforcement milestones so the implementation plan, code guards, and release criteria all describe the same process.

## Current State

- The design-system foundation is already on `main`.
- Tailwind is still present in the client build and remains allowed outside governed migration targets.
- The migration is a refactor, not a redesign: visuals, interactions, routes, and feature behavior must remain unchanged.
- Current enforcement snapshot:
  - `scripts/check_design_token_usage.ts` governs the token-clean component set.
  - `scripts/design-token-strict-baseline.json` tracks existing strict debt outside the governed set.
  - ESLint still warns on raw Tailwind utility patterns in `.tsx` files.

## Migration Principles

- No design changes.
- No behavior changes.
- No API, route, or schema changes.
- Preserve accessibility labels, keyboard flow, focus states, responsive behavior, and layering.
- Prefer one-for-one style extraction into CSS Modules or design-system primitives.
- Tailwind stays installed until the final retirement review proves it is safe to remove.

## Canonical Work Order

### 1. Foundation Cleanup

- Keep `src/client/design-system/` aligned with reality.
- Export completed primitives from the design-system barrel when they already exist.
- Remove stale comments and plan references that imply missing tasks incorrectly.
- Do not expand the design system with new abstractions unless needed to preserve an existing visual exactly.

### 2. Shared/Common UI Migration

- Finish reusable common components before locking feature-specific waves.
- Keep public props stable and limit changes to styling internals.
- Move governed files only after they are visually verified and raw utility strings are removed.

### 3. Navigation And App Shell Migration

- Cover layout shell, footers, menus, filters, shared wrappers, and other cross-feature navigation surfaces.
- Treat navigation as regression-sensitive: preserve routing, focus management, sticky behavior, and layering.

### 4. Feature Sweeps

Migrate remaining client code in stable, reviewable waves:

1. Flights + Properties
2. Documents + Evidence
3. Entities + Media
4. Investigation + Visualization shells
5. Remaining pages and top-level shells

The current dirty worktree is the input for Wave 1 and the start of Wave 2. Those files should not be added to governed enforcement until they are verified clean.

### 5. Enforcement Hardening

- Keep ESLint at `warn` while migration waves are active.
- Use `scripts/check_design_token_usage.ts` as the ratchet for governed files.
- Expand governed coverage only after a wave is clean.
- Shrink `scripts/design-token-strict-baseline.json` only after each migrated wave has been verified.
- Do not enable stricter failure modes until a wave has passed static checks and visual verification.

### 6. Tailwind Retirement Review

Tailwind removal is the last step, not the current step. Before removing Tailwind, confirm:

- No required governed client components depend on Tailwind utilities.
- The strict baseline has been intentionally reduced to the remaining exempt set or zero.
- The client renders correctly without `@tailwind` entrypoint directives.
- Any retained Tailwind usage is explicitly documented as an exemption.

Only then decide whether Tailwind remains for compatibility/token plumbing or is removed entirely.

## Enforcement Rules

### Governed Files

Governed files are the components that must be free of raw Tailwind utility strings today. The governed set should expand wave by wave.

### Strict Baseline

The strict baseline is debt, not completion. Files in the baseline are allowed to exist temporarily, but the count must trend downward as waves land.

### Completion Criteria For A Wave

A migration wave is complete only when all of the following are true:

- No intentional visual redesigns were introduced.
- No component behavior or accessibility flow regressed.
- Static checks pass.
- Newly migrated files are added to governed enforcement.
- Any applicable strict-baseline entries are removed.

## Verification Checklist

Run these checks before and after each migration wave:

```bash
pnpm type-check
pnpm lint
node ./scripts/check_design_token_usage.ts
```

Track these values after each wave:

- advisory violation count
- strict baseline count
- governed file count

Required smoke coverage for touched waves:

- flights browsing and detail panel
- properties browse/cards
- document list/header/metadata rail/skeleton states
- evidence viewers
- entity evidence and relationship flows
- investigation board/onboarding/modals
- shared media/article cards touched by the wave

## What To Delete Going Forward

- Do not add new migration docs that reintroduce phase taxonomies.
- Do not maintain separate “approved design” and “implementation plan” docs for this migration.
- Update this document instead.
