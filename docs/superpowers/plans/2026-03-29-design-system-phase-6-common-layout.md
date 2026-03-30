# Design System Phase 6 — ErrorBoundary, ToastProvider, SortFilter, SearchFilters

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 4 common/layout components to CSS Modules, extending the CI ratchet from 20 to 24 governed files and reducing the strict advisory count.

**Architecture:** Same pattern as Phases 1–5. Each component gets a `*.module.css` beside its `.tsx`. All Tailwind utility strings are removed from className attributes and replaced with `s.className` module references. Conditional classes use additional CSS modifier classes combined with template literals. Global utility classes (`control`, `dropdown-surface`, `custom-scrollbar`) are preserved as bare strings. After all migrations the strict baseline is regenerated.

**Tech Stack:** CSS Modules, Vite, TypeScript, React 18.

---

## Current state

- **moduleGovernedFiles**: 20 files (Phases 0–5 complete)
- **Strict baseline debt**: 136 files

## File Map

**Create:**

- `src/client/components/common/ErrorBoundary.module.css`
- `src/client/components/common/ToastProvider.module.css`
- `src/client/components/layout/SortFilter.module.css`
- `src/client/components/layout/SearchFilters.module.css`

**Modify:**

- `src/client/components/common/ErrorBoundary.tsx`
- `src/client/components/common/ToastProvider.tsx`
- `src/client/components/layout/SortFilter.tsx`
- `src/client/components/layout/SearchFilters.tsx`
- `scripts/check_design_token_usage.ts` — extend `moduleGovernedFiles` 20 → 24

---

## Token translation reference

| Tailwind class                        | CSS module equivalent                                            |
| ------------------------------------- | ---------------------------------------------------------------- |
| `min-h-screen`                        | `min-height: 100vh`                                              |
| `max-w-lg`                            | `max-width: 32rem`                                               |
| `text-red-400`                        | `color: var(--text-danger)`                                      |
| `bg-red-600`                          | `background: #dc2626`                                            |
| `hover:bg-red-700`                    | `.btn:hover { background: #b91c1c }`                             |
| `space-y-2`                           | `display:flex; flex-direction:column; gap:var(--space-2)`        |
| `animate-spin`                        | `animation: toastProviderSpin 1s linear infinite` + `@keyframes` |
| `z-[1200]`                            | `z-index: 1200` (hardcoded — above Radix portals at z-1000)      |
| `z-[1210]`                            | `z-index: 1210`                                                  |
| `h-10`                                | `height: 2.5rem`                                                 |
| `min-w-[160px]`                       | `min-width: 10rem`                                               |
| `min-w-[140px]`                       | `min-width: 8.75rem`                                             |
| `focus:ring-2 focus:ring-primary-500` | `outline: 2px solid var(--accent); outline-offset: 2px`          |

---

### Task 1: Migrate ErrorBoundary to CSS Module

**Files:**

- Create: `src/client/components/common/ErrorBoundary.module.css`
- Modify: `src/client/components/common/ErrorBoundary.tsx`

Notes:

- `text-red-400` → `color: var(--text-danger)` (token from Phase 5)
- `bg-red-600` / `hover:bg-red-700` → hardcoded hex values (#dc2626 / #b91c1c) — single-use error UI, no semantic token needed
- ErrorBoundary is a class component (required for React error boundaries) — CSS module import still works fine

- [ ] **Step 1: Baseline type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 2: Create ErrorBoundary.module.css**

```css
/* src/client/components/common/ErrorBoundary.module.css */

.screen {
  min-height: 100vh;
  background: var(--glass-bg);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.card {
  max-width: 32rem; /* max-w-lg */
  width: 100%;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--glass-shadow);
}

.heading {
  font-size: 1.25rem; /* text-xl */
  font-weight: 700;
  color: var(--text-danger);
  margin-bottom: var(--space-2);
}

.message {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: var(--space-4);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.reloadBtn {
  padding: var(--space-2) var(--space-3);
  background: #dc2626;
  color: var(--text-primary);
  border-radius: var(--radius-lg);
  transition: background-color var(--duration-fast) var(--easing-liquid);
}

.reloadBtn:hover {
  background: #b91c1c;
}

.clearBtn {
  padding: var(--space-2) var(--space-3);
  background: var(--glass-bg-highlight);
  color: var(--text-primary);
  border-radius: var(--radius-lg);
  transition: background-color var(--duration-fast) var(--easing-liquid);
}

.clearBtn:hover {
  background: var(--glass-bg-strong);
}
```

- [ ] **Step 3: Update ErrorBoundary.tsx**

Add the module import after the React import:

```tsx
import s from './ErrorBoundary.module.css';
```

Replace the error state return:

```tsx
if (this.state.hasError) {
  const msg = this.state.error?.message || 'Unexpected error';
  return (
    <div className={s.screen}>
      <div className={s.card}>
        <h1 className={s.heading}>Something went wrong</h1>
        <p className={s.message}>{msg}</p>
        <div className={s.actions}>
          <button onClick={() => window.location.reload()} className={s.reloadBtn}>
            Reload
          </button>
          <button
            onClick={() => {
              try {
                localStorage.clear();
              } catch {
                // Ignore localStorage errors
              }
              window.location.reload();
            }}
            className={s.clearBtn}
          >
            Clear cache &amp; reload
          </button>
        </div>
      </div>
    </div>
  );
}
return this.props.children;
```

- [ ] **Step 4: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/common/ErrorBoundary.module.css src/client/components/common/ErrorBoundary.tsx && git commit -m "refactor(error-boundary): migrate to CSS module"
```

---

### Task 2: Migrate ToastProvider to CSS Module

**Files:**

- Create: `src/client/components/common/ToastProvider.module.css`
- Modify: `src/client/components/common/ToastProvider.tsx`

Notes:

- `space-y-2` → `display:flex; flex-direction:column; gap:var(--space-2)` (wrapper becomes a flex column)
- `animate-spin` on the loading dot → `@keyframes toastProviderSpin` with component-prefixed name
- `w-3 h-3` on spinner → `width: 0.75rem; height: 0.75rem`
- `h-6 w-6` on CloseButton via `className` prop → pass `s.closeBtn` to CloseButton's className
- The toast type classes (`toast-success`, `toast-error`, etc.) are global classes defined in `index.css` — keep them as bare strings
- `z-[100]` → `z-index: var(--z-overlay)` (100, defined in Phase 5)
- `ml-2` on inline action button → `margin-left: var(--space-2)`

- [ ] **Step 1: Create ToastProvider.module.css**

```css
/* src/client/components/common/ToastProvider.module.css */

.toastStack {
  position: fixed;
  top: var(--space-3);
  right: var(--space-3);
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.toast {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  font-size: 0.75rem;
  box-shadow: var(--glass-shadow);
  border-width: 1px;
  border-style: solid;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toastBody {
  display: flex;
  align-items: center;
}

.loadingSpinner {
  margin-left: var(--space-2);
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 9999px;
  animation: toastProviderSpin 1s linear infinite;
}

@keyframes toastProviderSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loadingSpinner {
    animation: none;
    opacity: 0.6;
  }
}

.actionBtn {
  margin-left: var(--space-2);
  padding: var(--space-1) var(--space-2);
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-fast) var(--easing-liquid);
}

.actionBtn:hover {
  background: var(--glass-bg-highlight);
}

.closeBtn {
  margin-left: var(--space-2);
  height: 1.5rem;
  width: 1.5rem;
  border-color: transparent;
  background: transparent;
  color: currentColor;
}

.closeBtn:hover {
  background: var(--glass-bg-highlight);
}
```

- [ ] **Step 2: Update ToastProvider.tsx**

Add the module import after the existing imports:

```tsx
import s from './ToastProvider.module.css';
```

Replace the return statement:

```tsx
return (
  <ToastCtx.Provider value={{ addToast }}>
    {children}
    <div className={s.toastStack}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${s.toast} ${toastTypeClass[t.type ?? 'info'] ?? 'toast-info'}`}
        >
          <div className={s.toastBody}>
            {t.text}
            {t.type === 'loading' && <div className={s.loadingSpinner} />}
          </div>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                removeToast(t.id);
              }}
              className={s.actionBtn}
            >
              {t.action.label}
            </button>
          )}
          {t.type !== 'loading' && (
            <CloseButton
              onClick={() => removeToast(t.id)}
              size="sm"
              label="Dismiss notification"
              className={s.closeBtn}
            />
          )}
        </div>
      ))}
    </div>
  </ToastCtx.Provider>
);
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/common/ToastProvider.module.css src/client/components/common/ToastProvider.tsx && git commit -m "refactor(toast-provider): migrate to CSS module with prefixed keyframe"
```

---

### Task 3: Migrate SortFilter to CSS Module

**Files:**

- Create: `src/client/components/layout/SortFilter.module.css`
- Modify: `src/client/components/layout/SortFilter.tsx`

Notes:

- `z-[1200]` / `z-[1210]` are intentionally high to sit above Radix UI portals (which use z-1000). Hardcode these values in CSS; they are not general-purpose tokens.
- The outer `<div>` receives a `className` prop from callers — compose it as `` `${s.root} ${isOpen ? s.rootOpen : ''} ${className}` ``
- `control` is a global class from `index.css` — preserve it as a bare string on the trigger button
- `dropdown-surface` is a global class — preserve it on the panel div
- `py-1` on the `<ul>` → `padding-block: var(--space-1)`
- The `bg-[var(--glass-bg-highlight)]/55` opacity shorthand → `color-mix(in srgb, var(--glass-bg-highlight) 55%, transparent)`

- [ ] **Step 1: Create SortFilter.module.css**

```css
/* src/client/components/layout/SortFilter.module.css */

.root {
  position: relative;
  z-index: var(--z-content); /* 10 — collapsed state */
}

.rootOpen {
  z-index: 1200; /* above Radix portals at z-1000 */
}

.triggerInner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown {
  position: absolute;
  z-index: 1210; /* above trigger */
  margin-top: var(--space-1);
  width: 100%;
  min-width: 10rem; /* min-w-[160px] */
  right: 0;
  padding: var(--space-1);
}

@media (min-width: 768px) {
  .dropdown {
    left: 0;
    right: auto;
  }
}

.list {
  padding-block: var(--space-1);
}

.option {
  padding: 0 var(--space-3);
  height: 2.5rem; /* h-10 */
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: background-color var(--duration-fast) var(--easing-liquid);
}

.option:hover {
  background: color-mix(in srgb, var(--glass-bg-highlight) 55%, transparent);
}

.optionSelected {
  background: color-mix(in srgb, var(--glass-bg-highlight) 65%, transparent);
  color: var(--text-primary);
}
```

- [ ] **Step 2: Update SortFilter.tsx**

Add the module import after the existing imports:

```tsx
import s from './SortFilter.module.css';
```

Replace the return statement:

```tsx
return (
  <div className={`${s.root} ${isOpen ? s.rootOpen : ''} ${className}`} ref={dropdownRef}>
    <button
      type="button"
      onClick={() => setIsOpen((open) => !open)}
      data-testid="sort-filter"
      className="control px-3 text-sm flex items-center gap-2 justify-between w-full min-w-[140px]"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
    >
      <div className={s.triggerInner}>
        {selectedOption.icon}
        <span>{selectedOption.label}</span>
      </div>
      <Icon name="ChevronDown" size="sm" />
    </button>

    {isOpen && (
      <div className={`${s.dropdown} dropdown-surface`}>
        <ul role="listbox" className={s.list}>
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`${s.option} ${option.value === value ? s.optionSelected : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.icon}
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);
```

Note: The trigger button keeps `className="control px-3 text-sm flex items-center gap-2 justify-between w-full min-w-[140px]"`. The `control` class is global. Since SortFilter.tsx will be added to `moduleGovernedFiles`, the `tailwindUtilityPattern` check will run on this line. `flex`, `items-center`, `gap-2`, `justify-between`, `w-full`, `text-sm` all match the pattern. Replace it with a module class:

Add to SortFilter.module.css:

```css
.trigger {
  padding-inline: var(--space-3);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  justify-content: space-between;
  width: 100%;
  min-width: 8.75rem; /* min-w-[140px] */
}
```

And update the button:

```tsx
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        data-testid="sort-filter"
        className={`control ${s.trigger}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/layout/SortFilter.module.css src/client/components/layout/SortFilter.tsx && git commit -m "refactor(sort-filter): migrate to CSS module"
```

---

### Task 4: Migrate SearchFilters to CSS Module

**Files:**

- Create: `src/client/components/layout/SearchFilters.module.css`
- Modify: `src/client/components/layout/SearchFilters.tsx`

Notes:

- `focus:ring-2 focus:ring-primary-500 focus:border-transparent` → `outline: 2px solid var(--accent); outline-offset: 2px; border-color: transparent` in `:focus` rule
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` → CSS grid with `@media` breakpoints
- `space-x-2` on the heading row → `gap: var(--space-2)` with flex
- `h-5 w-5` / `h-4 w-4` on Lucide icons → use `size` prop instead (established pattern from TagSelector)
- `text-primary-400` on `<Filter>` icon → this is a custom Tailwind token, not a standard palette color; replace with `color: var(--accent)`

- [ ] **Step 1: Create SearchFilters.module.css**

```css
/* src/client/components/layout/SearchFilters.module.css */

.root {
  background: color-mix(in srgb, var(--glass-bg) 50%, transparent);
  backdrop-filter: blur(4px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-8);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.headerIcon {
  color: var(--accent); /* replaces text-primary-400 */
}

.heading {
  font-size: 1.125rem; /* text-lg */
  font-weight: 600;
  color: var(--text-primary);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.field {
  display: flex;
  flex-direction: column;
}

.label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.labelIcon {
  vertical-align: middle;
  margin-right: var(--space-1);
}

.input,
.select {
  width: 100%;
  background: var(--glass-bg-highlight);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2) var(--space-3);
  color: var(--text-primary);
  outline: none;
  transition:
    border-color var(--duration-fast) var(--easing-liquid),
    outline-color var(--duration-fast) var(--easing-liquid);
}

.input:focus,
.select:focus {
  border-color: var(--accent);
  outline: 2px solid color-mix(in srgb, var(--accent) 40%, transparent);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Update SearchFilters.tsx**

Add the module import after the existing imports:

```tsx
import s from './SearchFilters.module.css';
```

Replace the return statement:

```tsx
return (
  <div className={s.root}>
    <div className={s.header}>
      <Filter className={s.headerIcon} size={20} />
      <h3 className={s.heading}>Filters</h3>
    </div>

    <div className={s.grid}>
      <div className={s.field}>
        <label className={s.label}>
          <AlertTriangle className={s.labelIcon} size={16} />
          Likelihood Level
        </label>
        <select
          value={filters.likelihood}
          onChange={(e) => handleFilterChange('likelihood', e.target.value)}
          className={s.select}
        >
          <option value="all">All Levels</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="LOW">Low Risk</option>
        </select>
      </div>

      <div className={s.field}>
        <label className={s.label}>
          <Users className={s.labelIcon} size={16} />
          Min Mentions
        </label>
        <input
          type="number"
          min="0"
          value={filters.minMentions}
          onChange={(e) => handleFilterChange('minMentions', parseInt(e.target.value) || 0)}
          className={s.input}
          placeholder="0"
        />
      </div>

      <div className={s.field}>
        <label className={s.label}>Role Type</label>
        <select
          value={filters.role}
          onChange={(e) => handleFilterChange('role', e.target.value)}
          className={s.select}
        >
          <option value="all">All Roles</option>
          <option value="president">President/Politician</option>
          <option value="business">Business</option>
          <option value="legal">Legal</option>
          <option value="media">Media</option>
          <option value="victim">Victim</option>
        </select>
      </div>

      <div className={s.field}>
        <label className={s.label}>
          <Calendar className={s.labelIcon} size={16} />
          Current Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className={s.select}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="convicted">Convicted</option>
          <option value="deceased">Deceased</option>
          <option value="retired">Retired</option>
        </select>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/layout/SearchFilters.module.css src/client/components/layout/SearchFilters.tsx && git commit -m "refactor(search-filters): migrate to CSS module"
```

---

### Task 5: Extend CI ratchet + update strict baseline

**Files:**

- Modify: `scripts/check_design_token_usage.ts`

- [ ] **Step 1: Add 4 new files to moduleGovernedFiles**

The Set currently has 20 entries. Add four more:

```ts
    'src/client/components/common/ErrorBoundary.tsx',
    'src/client/components/common/ToastProvider.tsx',
    'src/client/components/layout/SortFilter.tsx',
    'src/client/components/layout/SearchFilters.tsx',
```

- [ ] **Step 2: Run the CI ratchet in normal mode**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected: `[design-token-usage] OK`

If any governed file fails the `tailwindUtilityPattern` check, find the remaining Tailwind utility string and replace it with the appropriate `s.className` reference before continuing.

- [ ] **Step 3: Regenerate the strict baseline**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && WRITE_STRICT_BASELINE=1 npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected: `[design-token-usage] wrote strict baseline: N files` where N < 136.

- [ ] **Step 4: Verify strict mode passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && STRICT_DESIGN_TOKENS=1 npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected: `[design-token-usage] OK`

- [ ] **Step 5: Run type-check and lint**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check && pnpm lint 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add scripts/check_design_token_usage.ts scripts/design-token-strict-baseline.json && git commit -m "chore(ci): extend CSS module ratchet to 24 governed files (ErrorBoundary, ToastProvider, SortFilter, SearchFilters)"
```

---

## Self-Review

**Spec coverage:**

- ✅ Migrate ErrorBoundary — Task 1
- ✅ Migrate ToastProvider — Task 2
- ✅ Migrate SortFilter — Task 3
- ✅ Migrate SearchFilters — Task 4
- ✅ Extend moduleGovernedFiles 20 → 24 — Task 5
- ✅ Regenerate strict baseline — Task 5

**Placeholder scan:** No TBDs, no "implement later" entries.

**Type consistency:**

- `s.root` / `s.rootOpen` used consistently in Task 3 SortFilter
- `s.trigger` defined in CSS step and used in JSX step of Task 3
- `s.input` / `s.select` share the same CSS rule block in SearchFilters (both classes defined in `.input, .select` rule)
- `s.loadingSpinner` / `toastProviderSpin` keyframe name consistent in Task 2
- Token `--text-danger` (introduced in Phase 5) used in ErrorBoundary Task 1 — verify it exists before running

**Pre-flight check:** Confirm `--text-danger` token exists:

```bash
grep "text-danger" "/Volumes/Media/Epstein Files/epstein-archive/src/client/index.css"
```

Expected: `--text-danger: #fca5a5;` present (added in Phase 5 Task 1).
