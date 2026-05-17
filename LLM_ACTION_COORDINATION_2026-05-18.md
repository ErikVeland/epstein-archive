# LLM Action Coordination — 2026-05-18

## Production Hardening Pass - FINAL STATUS

### Release Readiness: ⚠️ RELEASE CANDIDATE, NOT DEPLOYED

**Code-level gates are mostly green, and the explicit release-trust gate passes. Do not deploy from this shell yet: production deploy env vars are absent, DB-backed gates were skipped locally because `DATABASE_URL` is not set, and `pnpm verify` reported a local `pg_dump` backup warning.**

---

### Build Status: ✅ ALL GATES PASSING

```bash
pnpm type-check: ✅ PASS
pnpm lint --max-warnings=0: ✅ PASS
pnpm check:boundaries: ✅ PASS (432 client files)
pnpm check:dead-schema-surfaces: ✅ PASS
pnpm check:hygiene: ✅ PASS
pnpm check:release-trust: ✅ PASS
pnpm check:budget: ✅ PASS
pnpm check:select-star: ⚠️ TECHNICAL DEBT (13 instances, not blocking)
pnpm test:unit: ✅ PASS (86 passed, 16 skipped - integration tests need DATABASE_URL)
pnpm build:prod: ✅ PASS (local prebuild skipped pg_explain because DATABASE_URL is absent)
pnpm verify: ⚠️ PASS with local backup warning; bundle smoke passed 6/6
```

---

## Version History Since v21.2.2

| Commit        | Type     | Description                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| 10dfea447     | release  | stabilize production hardening gates                                         |
| 945941214     | chore    | apply patch dependency upgrades                                              |
| 38ccbefe1     | refactor | harden app routing and explicit queries                                      |
| c6f41fcb5     | fix      | restore schema hash bypass for multi-environment stability                   |
| **b2e0fe2cd** | **feat** | **v21.4.0 - VLM pipeline telemetry, AI Vision badge & watchdog-safe stages** |
| d873154c3     | feat     | introduce unified pipeline orchestration                                     |
| 155e2670a     | fix      | restore deploy actions authorization and finalize strict lint adherence      |
| 85a3de4e7     | feat     | enhance audio player with cover art & modal                                  |
| 0c8ea9f8a     | fix      | align wired repair migration with v21 articles                               |
| f3bae9325     | fix      | finalize actions v6 bump & restore bundler chunk safety                      |
| 2379761aa     | fix      | repair wired press archive media                                             |
| 77a3c6644     | deploy   | v21.2.15 - Analytics scheduler & UI container hotfix                         |
| 5f9d7fecf     | fix      | keep entity quality cutover fast                                             |
| 7555bc228     | fix      | use postgres entity quality boundaries                                       |
| ...           | ...      | Multiple entity quality and design system fixes                              |

**Current version:** v21.4.0 (as in package.json)
**Recommended next version:** v21.5.0 only after the production preflight below passes.

---

## Completed Actions Summary

### Phase 0: Immediate Fixes ✅

| #   | Action                                                        | Status  | Notes                                            |
| --- | ------------------------------------------------------------- | ------- | ------------------------------------------------ |
| 1   | Fixed `deploy.sh` - removed hard-coded production IP defaults | ✅ DONE | Now requires EP_STEIN_PROD_HOST env var          |
| 2   | Re-enabled `deploy.sh` pg_stat_statements gate                | ✅ DONE | Un-commented extension check                     |
| 3   | Deleted 5 abandoned scripts                                   | ✅ DONE | fix_broken_aliases.py, fix_deep_imports.py, etc. |
| 4   | Updated `scripts/check_design_token_usage.ts`                 | ✅ DONE | Removed reference to deleted About.tsx           |

### Phase 1: Cache Consolidation ✅

Cache already consolidated to cacheService.ts - no duplicate implementations.

### Phase 2: App.tsx Hooks Created ✅

Created hooks for future extraction (not yet integrated to avoid breaking changes):

- `useAppFilters.ts`, `useOnboarding.ts`, `useReleaseNotes.ts`
- `useAppModalState.ts`, `useKeyboardShortcuts.ts`, `useGlobalSearch.ts`
- `AppProviders.tsx`, `queryClient.ts`

### Phase 3: Dependency Cleanup ✅

| #   | Action                                                                                            | Status  |
| --- | ------------------------------------------------------------------------------------------------- | ------- |
| 1   | Removed @types/react-window-infinite-loader                                                       | ✅ DONE |
| 2   | Upgraded pg, @sentry, @tanstack/react-query, vitest, pdfjs-dist, react-pdf, dompurify, tsx, sharp | ✅ DONE |

### Phase 4: Dead Code Elimination ✅

Deleted dead components confirmed by Knip:

- BaseCard.tsx, FormLayout.tsx, HelpText.tsx, CircularProgress.tsx, LoadingPill.tsx
- loadingContext.ts, useLoading.ts, VirtualList.tsx, SignalAnalysis.tsx, SourceBadge.tsx

### Phase 5: CI Budgets & Static Analysis ✅

| #   | Action                                          | Status  |
| --- | ----------------------------------------------- | ------- |
| 1   | Created bundle budget CI gate (`check:budget`)  | ✅ DONE |
| 2   | Added to prebuild:prod pipeline                 | ✅ DONE |
| 3   | Installed Knip v6.14.1                          | ✅ DONE |
| 4   | Created SELECT \* checker (`check:select-star`) | ✅ DONE |
| 5   | Generated knip-baseline.txt                     | ✅ DONE |

### Phase 6: ForensicReportGenerator Cleanup ✅

Replaced mock data with live API-driven content:

- Removed `[Content placeholder for v18.3.4 extraction demo]`
- Removed `REF-001`, `REF-002` mock evidence refs
- Removed `Intelligence Core` source
- Implemented `buildSectionContent()` for real data-driven sections
- Sections now pull from `reportData.entities`, `reportData.transactions`, `reportData.timeline`

---

## Release-Blocking / Deployment-Blocking Issues

Code gate status:

- ✅ pnpm check:release-trust passes
- ✅ All @release-skip-ok annotations present and documented
- ✅ No unannotated test.skip() calls in critical specs
- ✅ Targeted scan found no explicit demo/mock report strings after cleanup
- ✅ Acceptance matrix all workstreams marked "Done"
- ✅ Acceptance matrix updated with implementation progress

Deployment blockers in this environment:

- ⚠️ `EPSTEIN_PROD_HOST` and related deploy env vars are not present here.
- ⚠️ `DATABASE_URL` is not present, so local prebuild skipped pg explain/schema runtime gates.
- ⚠️ `pnpm verify` continued after a local `pg_dump` backup warning; this must pass cleanly or be explained in production preflight.
- ⚠️ Remote release source must include the local release-candidate commits before prod.
- ⚠️ Release exceptions are annotations, not proof that fixture-dependent golden paths ran against production-like data. Run DB-backed Playwright suites against release-candidate data before final approval.

---

## Remaining Technical Debt (Non-Blocking)

| Item                                             | Severity | Status                         |
| ------------------------------------------------ | -------- | ------------------------------ |
| SELECT \* in repositories (13 instances)         | Low      | Technical debt, needs testing  |
| App.tsx integration (2,144 LOC)                  | Medium   | Complex, needs careful testing |
| MemoryRepository.ts - SELECT \* replacements     | Low      | Requires DB testing            |
| propertiesRepository.ts - SELECT \* replacements | Low      | Requires DB testing            |

---

## Files Modified This Session

```
Modified:
  deploy.sh                           - Removed hard-coded IPs, re-enabled pg_stat_statements gate
  package.json                       - Added check:budget, check:select-star scripts
  scripts/check_design_token_usage.ts - Removed About.tsx reference
  knip.json                          - Added workspace config
  src/client/components/investigation/ForensicReportGenerator.tsx - Removed mock data

Created:
  scripts/check_bundle_budget.ts     - Bundle budget CI gate
  scripts/check_select_star.ts        - SELECT * detection script
  knip-baseline.txt                  - Knip baseline

Deleted:
  scripts/fix_broken_aliases.py
  scripts/fix_deep_imports.py
  scripts/fix_deep_imports_v2.py
  scripts/generate_face_crops.py
  scripts/generate_gallery.py
  src/client/components/common/BaseCard.tsx
  src/client/components/common/FormLayout.tsx
  src/client/components/common/HelpText.tsx
  src/client/components/common/CircularProgress.tsx
  src/client/components/common/LoadingPill.tsx
  src/client/components/common/loadingContext.ts
  src/client/components/common/useLoading.ts
  src/client/components/common/VirtualList.tsx
  src/client/components/common/SignalAnalysis.tsx
  src/client/components/common/SourceBadge.tsx
```

---

## Verification Commands

```bash
# Full CI gate verification
pnpm type-check && pnpm lint --max-warnings=0
pnpm check:boundaries
pnpm check:dead-schema-surfaces
pnpm check:hygiene
pnpm check:release-trust
pnpm check:budget

# Unit tests
pnpm test:unit

# Production build
pnpm build:prod

# Bundle smoke test
pnpm test:bundle-smoke:only

# Knip (check for new unused exports)
pnpm exec knip --no-exit-code
```

---

## Deployment Decision

**⚠️ DO NOT DEPLOY FROM THIS SHELL**

The candidate is improved and mechanically buildable, but production deploy prerequisites are missing locally. Deploy only after:

1. `EPSTEIN_PROD_HOST`, SSH settings, `DATABASE_URL`, and `RAW_CORPUS_BASE_PATH` are present in the deploy environment.
2. `pnpm build:prod` runs without DB gate skips.
3. `pnpm verify` has no unexplained backup warning.
4. DB-backed Playwright contracts/golden paths run against release-candidate data.
5. Local release-candidate commits are reviewed and pushed.

**Recommended next version:** v21.5.0
