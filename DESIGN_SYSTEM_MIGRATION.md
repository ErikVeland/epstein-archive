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
- Current repo snapshot as of `2026-04-08`:
  - advisory violations: `24`
  - strict-baseline entries: `25`
  - governed file count: `131`
  - Tailwind retirement status: `not ready`

## Handover Snapshot

Use [`DESIGN_SYSTEM_HANDOVER.md`](./DESIGN_SYSTEM_HANDOVER.md) as the day-to-day operator resume point.
This document remains the canonical source of truth for the migration strategy, rules, and completion criteria.

Current verified state:

- `pnpm type-check`: passing
- `node ./scripts/check_design_token_usage.ts`: passing
- `scripts/check_design_token_usage.ts` governed set: `131` files
- `scripts/design-token-strict-baseline.json`: `25` remaining entries

Current remaining strict-baseline inventory:

- App shell
  - `src/client/App.tsx`
- Shared feature surfaces
  - `src/client/components/BlackBookReview.tsx`
  - `src/client/components/BlackBookViewer.tsx`
  - `src/client/components/EvidenceSearch.tsx`
  - `src/client/components/FileBrowser.tsx`
  - `src/client/components/FinancialTransactionAnalysis.tsx`
  - `src/client/components/PatternRecognitionAI.tsx`
- Media and communications
  - `src/client/components/media/PhotoBrowser.tsx`
  - `src/client/components/email/EmailClient.tsx`
  - `src/client/components/faces/FaceGallery.tsx`
- Entity flows
  - `src/client/components/entities/CreateRelationshipModal.tsx`
- Investigation shells
  - `src/client/components/investigation/CommunicationAnalysis.tsx`
  - `src/client/components/investigation/EvidenceNotebook.tsx`
  - `src/client/components/investigation/ForensicAnalysisWorkspace.tsx`
  - `src/client/components/investigation/ForensicDocumentAnalyzer.tsx`
  - `src/client/components/investigation/ForensicReportGenerator.tsx`
  - `src/client/components/investigation/HypothesisTestingFramework.tsx`
  - `src/client/components/investigation/InvestigationCaseFolder.tsx`
  - `src/client/components/investigation/InvestigationEvidencePanel.tsx`
  - `src/client/components/investigation/InvestigationExportTools.tsx`
  - `src/client/components/investigation/InvestigationTasksPanel.tsx`
  - `src/client/components/investigation/InvestigationTeamManagement.tsx`
  - `src/client/components/investigation/InvestigationTimelineBuilder.tsx`
  - `src/client/components/investigation/InvestigationWorkspace.tsx`
  - `src/client/components/investigation/MultiSourceCorrelationEngine.tsx`
- Visualization shells
  - `src/client/components/visualizations/DataVisualization.tsx`
  - `src/client/components/visualizations/DataVisualizationEnhanced.tsx`
  - `src/client/components/visualizations/FinancialTransactionMapper.tsx`
  - `src/client/components/visualizations/InteractiveEntityMap.tsx`
  - `src/client/components/visualizations/NetworkGraph.tsx`
  - `src/client/components/visualizations/NetworkVisualization.tsx`
  - `src/client/components/visualizations/Timeline.tsx`
  - `src/client/components/visualizations/TimelineVisualization.tsx`
  - `src/client/components/visualizations/TreeMap.tsx`
- Remaining pages
  - `src/client/pages/AdminDashboard.tsx`
  - `src/client/pages/EvidenceDetail.tsx`
  - `src/client/pages/PeoplePage.tsx`
  - `src/client/pages/ReviewDashboard.tsx`

## Implementation Status

The migration is in progress. It is not complete, and Tailwind cannot be removed yet.

### Completed Or Mostly Completed

- Design-system foundation and shared primitive groundwork
- Large portions of shared/common UI
- Large portions of navigation/app shell
- Property browsing/card surfaces
- Core media browsing surfaces
- Media modal/player surfaces
- Initial document browser tranche:
  - `DocumentCard`
  - `DocumentBrowserHeader`
  - `DocumentList`
  - `DocumentSkeleton`
  - document header/metadata rail subcomponents

### In Progress

- Entities + Media follow-up
- Investigation + Visualization wave
- Remaining page and shell cleanup
- Enforcement hardening and ratcheting of cleaned files into governed coverage
- Cleanup of older baseline assumptions so the plan matches the actual repo state

### Not Finished Yet

- Remaining entity creation/relationship flows
- Remaining investigation workspaces, notebooks, and export tooling
- Remaining visualization dashboards and graph/timeline shells
- Remaining top-level pages and app shells
- Final Tailwind retirement review and removal work

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

Actual status:

- Wave 1: Flights + Properties
  - substantially complete
  - remaining cleanup, if any, should be treated as follow-up rather than the main migration front
- Wave 2: Documents + Evidence
  - substantially complete
  - remaining follow-up, if any, should be treated as adjacent cleanup rather than the main front
- Wave 3: Entities + Media
  - active
  - media follow-up remains, and entity flows still remain open
- Wave 4: Investigation + Visualization shells
  - active
  - this is now the primary remaining migration front
- Wave 5: Remaining pages and top-level shells
  - active follow-up
  - a small number of pages remain, but they still include broad shell debt

The next highest-value work should now come from Wave 4 and Wave 5, while continuing to take smaller entity/media cleanups when they provide a safer ratchet step.

### 5. Enforcement Hardening

- Keep ESLint at `warn` while migration waves are active.
- Use `scripts/check_design_token_usage.ts` as the ratchet for governed files.
- Expand governed coverage only after a wave is clean.
- Shrink `scripts/design-token-strict-baseline.json` only after each migrated wave has been verified.
- Do not enable stricter failure modes until a wave has passed static checks and visual verification.

### 6. Tailwind Retirement Review

Tailwind removal is the last step, not the current step. Before removing Tailwind, confirm:

- No required governed client components depend on Tailwind utilities.
- The strict baseline has been intentionally reduced to zero, or to a tiny explicitly approved exemption set.
- The client renders correctly without `@tailwind` entrypoint directives.
- Any retained Tailwind usage is explicitly documented as an exemption.

Only then decide whether Tailwind remains for compatibility/token plumbing or is removed entirely.

At the current repo state, this review cannot pass. With `24` advisory violations and `25` strict-baseline entries still present, Tailwind must remain installed until later waves are complete.

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

### Completion Criteria For The Overall Migration

The migration is only complete when all of the following are true:

- `scripts/design-token-strict-baseline.json` is empty, or reduced to a deliberately documented exemption set approved for long-term retention.
- `scripts/check_design_token_usage.ts` reports no remaining advisory debt that would block Tailwind removal.
- The client passes static verification after Tailwind usage is removed from the remaining app surfaces.
- A final smoke pass confirms no visual or interaction regressions on the migrated feature areas.

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

Current tracked values:

- advisory violation count: `24`
- strict baseline count: `25`
- governed file count: `131`

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
