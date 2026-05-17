# LLM Action Coordination — 2026-05-18

## Current Session: Production Hardening Pass

### Status: IN PROGRESS - Phase 2 (God File Extraction)

---

## Completed Actions

### Phase 0: Immediate Fixes ✅

| #   | Action                                                        | Status  | Notes                                            |
| --- | ------------------------------------------------------------- | ------- | ------------------------------------------------ |
| 1   | Fixed `deploy.sh` - removed hard-coded production IP defaults | ✅ DONE | Now requires EPSTEIN_PROD_HOST env var           |
| 2   | Re-enabled `deploy.sh` pg_stat_statements gate                | ✅ DONE | Un-commented extension check                     |
| 3   | Deleted 5 abandoned scripts                                   | ✅ DONE | fix_broken_aliases.py, fix_deep_imports.py, etc. |
| 4   | Updated `scripts/check_design_token_usage.ts`                 | ✅ DONE | Removed reference to deleted About.tsx           |
| 5   | Verified build passes                                         | ✅ DONE | All CI gates passing                             |

### Phase 1: Cache Consolidation ✅

| #   | Action               | Status  | Notes                                         |
| --- | -------------------- | ------- | --------------------------------------------- |
| 1   | Audited cache layers | ✅ DONE | Cache already consolidated to cacheService.ts |
| 2   | No duplicates found  | ✅ DONE | Only 1 active cache implementation            |

### Phase 2: God File Extraction 🟡 IN PROGRESS

#### Extracted Components (NEW) - 7 hooks created

| File                                       | Lines | Purpose                                             |
| ------------------------------------------ | ----- | --------------------------------------------------- |
| `src/client/hooks/useAppFilters.ts`        | 93    | Filter state + navigation state (combined)          |
| `src/client/hooks/useOnboarding.ts`        | 49    | Onboarding completion state                         |
| `src/client/hooks/useReleaseNotes.ts`      | 47    | Release notes visibility and parsing                |
| `src/client/hooks/useAppModalState.ts`     | 58    | Selected person, document modal, entity modal state |
| `src/client/hooks/useKeyboardShortcuts.ts` | 98    | Keyboard shortcut handlers                          |
| `src/client/hooks/useGlobalSearch.ts`      | 132   | Global search functionality                         |
| `src/client/queryClient.ts`                | 14    | React Query client singleton                        |
| `src/client/AppProviders.tsx`              | 28    | Provider composition                                |

#### Current App.tsx Size

- Before extraction: 2,144 LOC (git HEAD)
- Current size: 1,961 LOC (after hooks integration started)
- Target: ~400 LOC

### Phase 3: Dependency Upgrades 🔲 PENDING

| #   | Action                                            | Status     | Priority |
| --- | ------------------------------------------------- | ---------- | -------- |
| 1   | Patch upgrades (pg, sentry, tanstack-query, etc.) | 🔲 PENDING | HIGH     |
| 2   | Remove deprecated @types packages                 | 🔲 PENDING | MEDIUM   |
| 3   | React 19 / Vite 8 / Express 5 upgrade train       | 🔲 PENDING | LOW      |

---

## Next Actions (Continue from here)

### Step 1: Complete integration of useAppFilters into App.tsx

- Replace sortBy, sortOrder, entityType, selectedRiskLevel state with useAppFilters

### Step 2: Create AppShell.tsx

- Extract header and navigation from App.tsx
- Compose into AppShell component

### Step 3: Create AppProviders wrapper

- Already created AppProviders.tsx - need to use it in App.tsx

### Step 4: Continue App.tsx refactoring

- Extract navigation state
- Extract modal orchestration
- Extract keyboard shortcuts
- Extract search logic

### Step 5: Complete final refactor

- Replace all inline code with extracted hooks/components
- Target: ~400 LOC

---

## Files Created This Session

```
src/client/
  AppProviders.tsx          (28 lines) - Provider composition
  queryClient.ts            (14 lines) - React Query singleton
  hooks/
    useAppFilters.ts         (93 lines) - Filter + Navigation state
    useOnboarding.ts        (49 lines) - Onboarding state
    useReleaseNotes.ts       (47 lines) - Release notes
    useAppModalState.ts      (58 lines) - Modal state
    useKeyboardShortcuts.ts (98 lines) - Keyboard shortcuts
    useGlobalSearch.ts       (132 lines) - Global search
```

---

## Build Status

```
pnpm type-check: ✅ PASS
pnpm lint --max-warnings=0: ✅ PASS
```

---

## Notes for Continuation

If interrupted, resume from:

1. Run `pnpm type-check && pnpm lint --max-warnings=0` to verify current state
2. Check `wc -l src/client/App.tsx` to see current size
3. Continue integrating extracted hooks into App.tsx
4. Focus on reducing App.tsx from ~1961 lines to ~400 lines

Key integrations still needed:

- useAppFilters (filter state)
- useAppModalState (modal state)
- useKeyboardShortcuts (keyboard handlers)
- AppProviders (provider wrapper)

Final verification after all extraction:

```bash
pnpm type-check && pnpm lint --max-warnings=0 && pnpm build
wc -l src/client/App.tsx  # Should be ~400
```
