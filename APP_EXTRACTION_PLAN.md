# App.tsx Extraction Plan (2,144 → 400 lines target)

## Current State Analysis

`src/client/App.tsx` contains:

- 2144 lines
- 40+ lazy-loaded page imports
- 30+ useState hooks
- 25+ useEffect hooks
- 5+ useRef hooks
- 3+ useQuery hooks
- Modal orchestration
- Navigation state
- Filter state
- Entity selection state
- Document modal state
- Search state
- Onboarding state
- Keyboard shortcuts
- LocalStorage management
- API status monitoring
- Release notes
- Date range filters
- Investigate popover
- Navigation edge fade
- Mobile menu state
- Command palette
- Global header search

## Extraction Order

### Step 1: Extract Providers (lines ~1-75)

**Target:** `AppProviders.tsx`
**Contains:** Context providers, QueryClient setup, TooltipProvider, ToastProvider, UndoProvider, InvestigationsProvider

```tsx
// AppProviders.tsx
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <UndoProvider>
            <InvestigationsProvider>{children}</InvestigationsProvider>
          </UndoProvider>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

### Step 2: Extract Navigation (lines ~200-450)

**Target:** `AppNavigation.tsx`
**Contains:** navLayoutMode, navEdgeFade, nav track refs, navigation tabs

### Step 3: Extract Header (lines ~1194-1400)

**Target:** `AppHeader.tsx`
**Contains:** Logo, search, global date filter, mobile menu

### Step 4: Extract Modal State (lines ~172-320)

**Target:** `AppModalState.tsx` (custom hook)
**Contains:** selectedPerson, documentModalId, documentModalInitial, entity closing logic

### Step 5: Extract Search (lines ~300-430)

**Target:** `useGlobalSearch.ts` (custom hook)
**Contains:** debouncedSearchTerm, search results, header suggestions

### Step 6: Extract Keyboard Shortcuts (lines ~635-775)

**Target:** `useKeyboardShortcuts.ts` (custom hook)
**Contains:** Ctrl+K, Ctrl+1-9, ESC handlers

### Step 7: Extract Filter State (lines ~150-170)

**Target:** `useAppFilters.ts` (custom hook)
**Contains:** sortBy, sortOrder, entityType, selectedRiskLevel

### Step 8: Extract Onboarding (lines ~432-434)

**Target:** `useOnboarding.ts` (custom hook)
**Contains:** shouldShowOnboarding, completeOnboarding, skipOnboarding

### Step 9: Extract Release Notes (lines ~800-900)

**Target:** `useReleaseNotes.ts` (custom hook)
**Contains:** showReleaseNotes, releaseNotes, parseReleaseNotes

### Step 10: Extract Route Registry (lines ~2020-2144)

**Target:** `AppRoutes.tsx`
**Contains:** All Routes/Route definitions

## Files to Create

```
src/client/
  App.tsx                    (target: 400 lines)
  AppProviders.tsx           (new: ~40 lines)
  AppShell.tsx               (new: ~200 lines - header + navigation)
  AppRoutes.tsx              (new: ~200 lines - route registry)
  hooks/
    useAppModalState.ts      (new: ~80 lines)
    useGlobalSearch.ts       (new: ~100 lines)
    useKeyboardShortcuts.ts  (new: ~150 lines)
    useAppFilters.ts         (new: ~60 lines)
    useOnboarding.ts         (new: ~30 lines)
    useReleaseNotes.ts       (new: ~50 lines)
    useNavigationState.ts     (new: ~100 lines)
```

## Implementation Sequence

1. Create `useAppFilters.ts` - simplest, no dependencies
2. Create `useOnboarding.ts` - simple hook
3. Create `useReleaseNotes.ts` - simple hook
4. Create `useAppModalState.ts` - more complex state
5. Create `useGlobalSearch.ts` - query hooks
6. Create `useKeyboardShortcuts.ts` - effect-based
7. Create `AppProviders.tsx` - compose providers
8. Create `AppShell.tsx` - compose header + navigation
9. Update `App.tsx` to use extracted pieces
10. Run tests, fix issues, iterate

## Verification

After each step:

```bash
pnpm type-check && pnpm lint --max-warnings=0 && pnpm test:unit
```

Final verification:

```bash
wc -l src/client/App.tsx  # Should be ~400
pnpm build                # Should succeed
pnpm test:e2e            # All tests pass
```

## Migration Notes

- All imports from `./app/lazyRoutes` stay as-is
- All design-system imports stay in App.tsx
- All hooks from `./hooks/` are imported, not extracted unless specified
- Context providers stay in App.tsx until providers are extracted
- Modal state is the most entangled - handle last
