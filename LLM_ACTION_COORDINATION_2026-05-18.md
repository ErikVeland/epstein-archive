# LLM Action Coordination — 2026-05-18

## Production Hardening Pass - STATUS: RELEASE BLOCKED

### Release Status: ❌ NOT READY FOR PRODUCTION

```bash
pnpm type-check: ✅ PASS
pnpm lint --max-warnings=0: ✅ PASS
pnpm check:boundaries: ✅ PASS
pnpm check:dead-schema-surfaces: ✅ PASS
pnpm check:hygiene: ✅ PASS
pnpm check:budget: ✅ PASS (NEW)
pnpm build:prod: ✅ PASS
pnpm test:unit: ✅ PASS (86 passed, 16 skipped)
pnpm check:release-trust: ❌ FAIL (47 findings)
```

Release is blocked until `pnpm check:release-trust` passes. Current blockers:

- `docs/20.0/ACCEPTANCE_MATRIX.md` still marks six release-gated workstreams as `In Progress` or `Blocked`.
- Release-critical specs contain unannotated `test.skip(...)` calls across API DTO contracts, data-integrity audit, golden paths, investigation export, and route/UI sync.
- DB-backed release checks still need a production-like `DATABASE_URL`/fixture run; local prebuild skipped pg explain/schema runtime checks when `DATABASE_URL` was absent.
- The working tree is dirty. Cut a release only from a clean, reviewed release candidate.

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

| #   | Action               | Status  | Notes                                         |
| --- | -------------------- | ------- | --------------------------------------------- |
| 1   | Audited cache layers | ✅ DONE | Cache already consolidated to cacheService.ts |
| 2   | No duplicates found  | ✅ DONE | Only 1 active cache implementation            |

### Phase 2: App.tsx Hooks Extraction — IN PROGRESS

Created and wired hooks:

- `useAppFilters.ts` - ✅ WIRED: replaces 19 lines of inline filter state in App.tsx
- `useGlobalSearch.ts` - ✅ WIRED: replaces 83 lines of inline search query block in App.tsx
- `useOnboarding.ts` - Created, not yet wired
- `useReleaseNotes.ts` - Created, not yet wired
- `useAppModalState.ts` - Created, not yet wired
- `useKeyboardShortcuts.ts` - Created, not yet wired
- `AppProviders.tsx` - Created, not yet wired (wraps TooltipProvider, UndoProvider, InvestigationsProvider, QueryClientProvider, ToastProvider)
- `queryClient.ts` - React Query singleton (used by AppProviders.tsx; note: main.tsx also has a queryClient at ./services/queryClient — deduplicate before wiring AppProviders)

**Gate status post wiring:** `pnpm type-check` ✅ PASS, `pnpm lint --max-warnings=0` ✅ PASS

Note: App.tsx size reduced ~100 lines from hook extractions above. Remaining wiring tasks below.

### Phase 3: Dependency Cleanup ✅

| #   | Action                                      | Status  | Notes               |
| --- | ------------------------------------------- | ------- | ------------------- |
| 1   | Removed @types/react-window-infinite-loader | ✅ DONE | Was deprecated      |
| 2   | Upgraded pg to 8.20.0                       | ✅ DONE |                     |
| 3   | Upgraded @sentry/node/react to 10.53.1      | ✅ DONE |                     |
| 4   | Upgraded @tanstack/react-query              | ✅ DONE | Already at 5.100.10 |
| 5   | Upgraded vitest to 4.1.6                    | ✅ DONE |                     |
| 6   | Upgraded pdfjs-dist to 5.7.284              | ✅ DONE |                     |
| 7   | Upgraded react-pdf to 10.4.1                | ✅ DONE |                     |
| 8   | Upgraded dompurify to 3.4.4                 | ✅ DONE |                     |
| 9   | Upgraded tsx to 4.22.1                      | ✅ DONE |                     |
| 10  | Upgraded sharp to 0.34.5                    | ✅ DONE |                     |

### Phase 3: Dead Code Elimination ✅

Deleted dead components confirmed by Knip:

- `BaseCard.tsx`, `BaseCard.module.css`
- `FormLayout.tsx`, `FormLayout.module.css`
- `HelpText.tsx`, `HelpText.module.css`
- `CircularProgress.tsx`, `CircularProgress.module.css`
- `LoadingPill.tsx`, `LoadingPill.module.css`
- `loadingContext.ts`, `useLoading.ts`
- `VirtualList.tsx`
- `SignalAnalysis.tsx`, `SignalAnalysis.module.css`
- `SourceBadge.tsx`, `SourceBadge.module.css`

### Phase 4: CI Budgets & Static Analysis ✅

| #   | Action                                  | Status  | Notes                          |
| --- | --------------------------------------- | ------- | ------------------------------ |
| 1   | Created bundle budget CI gate           | ✅ DONE | scripts/check_bundle_budget.ts |
| 2   | Added check:budget to package.json      | ✅ DONE |                                |
| 3   | Added check:budget to prebuild:prod     | ✅ DONE | Integrated into CI pipeline    |
| 4   | Installed Knip                          | ✅ DONE | v6.14.1                        |
| 5   | Generated Knip baseline                 | ✅ DONE | knip-baseline.txt              |
| 6   | Created SELECT \* checker script        | ✅ DONE | scripts/check_select_star.ts   |
| 7   | Added check:select-star to package.json | ✅ DONE |                                |

### Phase 5: SELECT \* Detection ✅

Found 13 instances of SELECT \* in repositories:

- memoryRepository.ts: 4 instances
- propertiesRepository.ts: 3 instances
- entitiesRepository.ts: 1 instance
- flightsRepository.ts: 1 instance
- forensicRepository.ts: 1 instance
- faceClustersRepository.ts: 1 instance
- ingestRunsRepository.ts: 1 instance
- icebergRepository.ts: 1 instance

These are technical debt - not critical bugs. Script created for awareness.

### API Error Handling ✅

Canonical error envelope already in place at `src/server/utils/errorHandler.ts`:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "safe message",
    "requestId": "uuid",
    "details": {}
  }
}
```

---

## Release-Blocking Items

| #   | Action                                                                                      | Rationale                                               | Status      |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------- |
| 1   | Clear `pnpm check:release-trust` findings                                                   | This is the explicit release trust gate                 | ❌ BLOCKING |
| 2   | Finish or formally except acceptance-matrix workstreams                                     | Matrix contains no-release gates                        | ❌ BLOCKING |
| 3   | Replace fixture-dependent skips with deterministic fixtures or annotated release exceptions | Critical specs currently skip core flows                | ❌ BLOCKING |
| 4   | Run DB-backed release gates with valid `DATABASE_URL`                                       | Local prebuild skipped pg explain/schema runtime checks | ❌ BLOCKING |
| 5   | Review and clean/stage the dirty working tree                                               | Release should be cut from a known RC diff              | ❌ BLOCKING |

---

## Remaining Non-Blocking Items

### High Priority

| #   | Action                           | Rationale                                    | Status                    |
| --- | -------------------------------- | -------------------------------------------- | ------------------------- |
| 1   | Create Knip baseline file        | ✅ DONE                                      | knip-baseline.txt created |
| 2   | Add bundle budget CI gate        | ✅ DONE                                      | check:budget script added |
| 3   | Replace SELECT \* in SQL queries | Brittle DTO contracts, needs testing         | ⏳ PENDING                |
| 4   | Add check:budget to CI pipeline  | Include in prebuild:prod or separate CI gate | ⏳ PENDING                |

### Medium Priority

| #   | Action                        | Rationale                      | Status                                                                                                                                      |
| --- | ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Integrate App.tsx hooks       | Complex, needs careful testing | 🔄 IN PROGRESS — useAppFilters + useGlobalSearch wired ✅; remaining: useReleaseNotes, useAppModalState, useKeyboardShortcuts, AppProviders |
| 2   | Split investigations.ts route | Large route file               | ⏳ PENDING                                                                                                                                  |
| 3   | Split EmailClient.tsx         | 1687 LOC component             | ⏳ PENDING                                                                                                                                  |
| 4   | Remove ML/OCR client deps     | Check if used first            | ⏳ PENDING                                                                                                                                  |

### Low Priority (Complex)

| #   | Action                     | Rationale                           | Status     |
| --- | -------------------------- | ----------------------------------- | ---------- |
| 1   | React 19 upgrade           | Requires branch, strict hook lint   | ⏳ PENDING |
| 2   | Vite 8 / Express 5 / Zod 4 | Breaking changes, extensive testing | ⏳ PENDING |
| 3   | OpenTelemetry              | Observability                       | ⏳ PENDING |
| 4   | Queue redesign             | Durable jobs table                  | ⏳ PENDING |

---

## Files Modified This Session

```
Modified:
  deploy.sh                           - Removed hard-coded IPs, re-enabled pg_stat_statements gate
  package.json                       - Dependency upgrades, added check:budget, check:select-star scripts
  scripts/check_design_token_usage.ts - Removed About.tsx reference
  knip.json                          - Added workspace config

Created:
  scripts/check_bundle_budget.ts     - Bundle budget CI gate
  scripts/check_select_star.ts       - SELECT * detection script
  knip-baseline.txt                  - Knip unused exports/files baseline

Deleted:
  scripts/fix_broken_aliases.py
  scripts/fix_deep_imports.py
  scripts/fix_deep_imports_v2.py
  scripts/generate_face_crops.py
  scripts/generate_gallery.py
  src/client/components/common/BaseCard.tsx
  src/client/components/common/BaseCard.module.css
  src/client/components/common/FormLayout.tsx
  src/client/components/common/FormLayout.module.css
  src/client/components/common/HelpText.tsx
  src/client/components/common/HelpText.module.css
  src/client/components/common/CircularProgress.tsx
  src/client/components/common/CircularProgress.module.css
  src/client/components/common/LoadingPill.tsx
  src/client/components/common/LoadingPill.module.css
  src/client/components/common/loadingContext.ts
  src/client/components/common/useLoading.ts
  src/client/components/common/VirtualList.tsx
  src/client/components/common/SignalAnalysis.tsx
  src/client/components/common/SignalAnalysis.module.css
  src/client/components/common/SourceBadge.tsx
  src/client/components/common/SourceBadge.module.css
```

---

## Verification Commands

```bash
# Full build verification
pnpm type-check && pnpm lint --max-warnings=0

# CI gates
pnpm check:boundaries
pnpm check:dead-schema-surfaces
pnpm check:hygiene
pnpm check:budget

# Bundle smoke test
pnpm test:bundle-smoke:only

# Knip (check for new unused exports)
pnpm exec knip --no-exit-code
```

---

## Notes

- App.tsx hooks created but not integrated to avoid breaking changes
- App.tsx still at 2,144 LOC - future work
- Cache already consolidated (no duplicate implementations found)
- Canonical error envelope already in place
- All critical deploy gates are now enforced
- Knip baseline shows 94 unused files, 18 unused deps, 8 unused devDeps, 184 unused exports
