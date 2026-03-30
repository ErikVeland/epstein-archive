# Design System Phase 3 — LoadingPill + TagSelector

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `LoadingPill` and `TagSelector` to CSS Modules, replacing all Tailwind utility strings including animated spinner classes, `/50` opacity shorthand, and `text-green-400` raw palette reference with CSS token equivalents. Extend the CI ratchet to 13 governed files.

**Architecture:** Same strategy as Phases 1–2. Each component gets a `*.module.css` beside its `.tsx`. `LoadingPill.tsx` exports both `LoadingProvider` and the legacy `LoadingPill` default — both live in the same file so they share one module. `TagSelector.tsx` keeps `style={{ backgroundColor: tag.color }}` inline (dynamic data value, not a Tailwind class). The `glass-panel` and `dropdown-surface` global classes defined in `index.css` are not touched.

**Token translations used in this plan:**

- `animate-spin` → `@keyframes loadingPillSpin { to { transform: rotate(360deg); } }` with component-prefixed name
- `bg-[var(--token)]/50` → `background: color-mix(in srgb, var(--token) 50%, transparent)`
- `text-green-400` → `color: var(--accent-success)`
- `ring-offset-slate-800` (color swatch selected ring) → `box-shadow: 0 0 0 2px var(--glass-border), 0 0 0 3px #1e293b` (custom)
- `backdrop-blur-sm` → `backdrop-filter: blur(4px)`
- `transition-all duration-200` → `transition: all 0.2s var(--easing-liquid)`

**Starting position:** Phase 2 complete. 11 files in `moduleGovernedFiles` (Button, CloseButton, ProgressBar, SourceBadge, Skeleton, LoadingIndicator, Card, FormField, Select, Tabs, Tooltip).

---

## File Map

**Create:**

- `src/client/components/common/LoadingPill.module.css`
- `src/client/components/common/TagSelector.module.css`

**Modify:**

- `src/client/components/common/LoadingPill.tsx`
- `src/client/components/common/TagSelector.tsx`
- `scripts/check_design_token_usage.ts` — extend `moduleGovernedFiles` from 11 to 13

---

### Task 1: Migrate LoadingPill to CSS Module

`LoadingPill.tsx` contains three components sharing one file:

- `LoadingProvider` (exports named) — renders children + `LoadingPillDisplay`
- `LoadingPillDisplay` (internal) — the animated pill with progress
- `LoadingPill` (default export, legacy) — simplified version of the pill

All three share the same CSS module.

**Files:**

- Create: `src/client/components/common/LoadingPill.module.css`
- Modify: `src/client/components/common/LoadingPill.tsx`

- [ ] **Step 1: Baseline type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 2: Create LoadingPill.module.css**

```css
/* src/client/components/common/LoadingPill.module.css */

/* Shared container for both the display and legacy components */
.container {
  position: fixed;
  top: var(--space-3);
  right: var(--space-3);
  z-index: 50;
}

/* The pill itself */
.pill {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.375rem var(--space-3);
  border-radius: 9999px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(4px);
  cursor: pointer;
  transition: all 0.2s var(--easing-liquid);
}

.pill:hover {
  background: var(--glass-bg-strong);
}

/* Spinner — uses component-prefixed keyframe name to avoid global collision */
.spinner {
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--accent);
  border-top-color: transparent;
  border-radius: 9999px;
  animation: loadingPillSpin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes loadingPillSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    opacity: 0.6;
  }
}

/* Task label */
.label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 7.5rem;
}

/* Progress track */
.track {
  width: 3rem;
  height: 0.25rem;
  background: var(--glass-bg-strong);
  border-radius: 9999px;
  overflow: hidden;
}

/* Progress fill — width set via inline style (dynamic) */
.fill {
  height: 100%;
  background: var(--accent);
  border-radius: 9999px;
  transition: width 0.3s ease-out;
}

/* Hover task list panel */
.panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--space-2);
  min-width: 12.5rem;
}

.panelHeading {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
  font-weight: 500;
}

.taskList {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.taskRow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Small inline spinner for task rows */
.taskSpinner {
  width: 0.5rem;
  height: 0.5rem;
  border: 1px solid var(--accent);
  border-top-color: transparent;
  border-radius: 9999px;
  animation: loadingPillSpin 0.6s linear infinite;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .taskSpinner {
    animation: none;
    opacity: 0.6;
  }
}

.taskLabel {
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taskProgress {
  font-size: 0.75rem;
  color: var(--accent);
  font-family: var(--font-mono);
}
```

- [ ] **Step 3: Update LoadingPill.tsx**

Add the module import after the existing imports:

```tsx
import s from './LoadingPill.module.css';
```

Update `LoadingPillDisplay` JSX. Replace:

```tsx
return (
  <div
    className="fixed top-3 right-3 z-50"
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
  >
    {/* Main compact pill */}
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-sm cursor-pointer transition-all duration-200 hover:bg-[var(--glass-bg-strong)]">
      <div
        className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"
        aria-hidden
      />
      <span
        className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]"
        aria-live="polite"
      >
        {tasks.length === 1 ? mainTask.label : `${tasks.length} tasks`}
      </span>
      <div
        className="w-12 h-1 bg-[var(--glass-bg-strong)] rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(totalProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loading progress"
      >
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${totalProgress}%` }}
        />
      </div>
    </div>

    {/* Hover tooltip with all tasks */}
    {hovered && tasks.length > 0 && (
      <div className="absolute top-full right-0 mt-2 min-w-[200px] glass-panel p-3">
        <div className="text-xs text-[var(--text-muted)] mb-2 font-medium">Active Tasks</div>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              <div className="w-2 h-2 border border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">
                {task.label}
              </span>
              {task.progress !== undefined && (
                <span className="text-xs text-[var(--accent)] font-mono">
                  {Math.round(task.progress)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
```

With:

```tsx
return (
  <div
    className={s.container}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
  >
    <div className={s.pill}>
      <div className={s.spinner} aria-hidden />
      <span className={s.label} aria-live="polite">
        {tasks.length === 1 ? mainTask.label : `${tasks.length} tasks`}
      </span>
      <div
        className={s.track}
        role="progressbar"
        aria-valuenow={Math.round(totalProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loading progress"
      >
        <div className={s.fill} style={{ width: `${totalProgress}%` }} />
      </div>
    </div>

    {hovered && tasks.length > 0 && (
      <div className={`${s.panel} glass-panel p-3`}>
        <div className={s.panelHeading}>Active Tasks</div>
        <div className={s.taskList}>
          {tasks.map((task) => (
            <div key={task.id} className={s.taskRow}>
              <div className={s.taskSpinner} aria-hidden />
              <span className={s.taskLabel}>{task.label}</span>
              {task.progress !== undefined && (
                <span className={s.taskProgress}>{Math.round(task.progress)}%</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
```

Update the legacy `LoadingPill` JSX. Replace:

```tsx
return (
  <div className="fixed top-3 right-3 z-50">
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-sm">
      <div
        className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"
        aria-hidden
      />
      <span
        className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]"
        aria-live="polite"
      >
        {label || 'Loading'}
      </span>
      {pct !== undefined && (
        <div
          className="w-12 h-1 bg-[var(--glass-bg-strong)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  </div>
);
```

With:

```tsx
return (
  <div className={s.container}>
    <div className={s.pill}>
      <div className={s.spinner} aria-hidden />
      <span className={s.label} aria-live="polite">
        {label || 'Loading'}
      </span>
      {pct !== undefined && (
        <div
          className={s.track}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={s.fill} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  </div>
);
```

- [ ] **Step 4: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/common/LoadingPill.module.css src/client/components/common/LoadingPill.tsx && git commit -m "refactor(loading-pill): migrate to CSS module with prefixed keyframe"
```

---

### Task 2: Migrate TagSelector to CSS Module

**Files:**

- Create: `src/client/components/common/TagSelector.module.css`
- Modify: `src/client/components/common/TagSelector.tsx`

Notes:

- `style={{ backgroundColor: tag.color }}` stays as inline style throughout — it's a dynamic data value
- `dropdown-surface` global class is preserved on the dropdown wrapper
- `glass-panel` is NOT used here (that's LoadingPill); TagSelector uses `dropdown-surface`
- The color swatch selected state uses `ring-2 ring-[var(--glass-border)] ring-offset-1 ring-offset-slate-800` — this becomes `box-shadow: 0 0 0 1px #1e293b, 0 0 0 2px var(--glass-border)` (simulating ring + ring-offset)
- `text-green-400` on the checkmark becomes `color: var(--accent-success)`

- [ ] **Step 1: Create TagSelector.module.css**

```css
/* src/client/components/common/TagSelector.module.css */

.root {
  position: relative;
}

/* Selected tags row */
.tagList {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: var(--space-2);
}

/* Individual tag pill */
.tagPill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.125rem var(--space-2);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-primary);
  /* background set via inline style (dynamic color) */
}

.tagPill.clickable {
  cursor: pointer;
}

.tagPill.clickable:hover {
  opacity: 0.9;
}

/* Remove button inside tag pill */
.tagRemove {
  margin-left: var(--space-1);
  padding: 0.125rem;
  border-radius: var(--radius-sm);
  transition: background-color var(--duration-normal) var(--easing-liquid);
}

.tagRemove:hover {
  background: var(--glass-bg-highlight);
}

/* "Add Tag" trigger button */
.addBtn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem var(--space-2);
  background: color-mix(in srgb, var(--glass-bg-highlight) 50%, transparent);
  color: var(--text-secondary);
  border-radius: var(--radius-lg);
  font-size: 0.75rem;
  font-weight: 500;
  transition:
    background-color var(--duration-normal) var(--easing-liquid),
    color var(--duration-normal) var(--easing-liquid);
}

.addBtn:hover {
  background: var(--glass-bg-highlight);
  color: var(--text-primary);
}

/* Dropdown container */
.dropdown {
  position: absolute;
  z-index: 50;
  margin-top: var(--space-2);
  width: 14rem;
  overflow: hidden;
}

/* Search area */
.searchWrap {
  padding: var(--space-2);
  border-bottom: 1px solid var(--glass-border);
}

.searchInner {
  position: relative;
}

.searchIcon {
  position: absolute;
  left: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.searchInput {
  width: 100%;
  padding-left: 2rem;
  padding-right: var(--space-3);
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
  background: var(--glass-bg-highlight);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--duration-normal) var(--easing-liquid);
}

.searchInput:focus {
  border-color: var(--accent);
}

/* Tags list scrollable area */
.tagListScroll {
  max-height: 10rem;
  overflow-y: auto;
  padding: var(--space-1);
}

/* Individual tag option row */
.tagOption {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem var(--space-2);
  border-radius: var(--radius-sm);
  text-align: left;
  transition: background-color var(--duration-normal) var(--easing-liquid);
}

.tagOption:hover {
  background: var(--glass-bg-highlight);
}

.tagOptionInner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tagDot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  flex-shrink: 0;
  /* background set via inline style */
}

.tagName {
  font-size: 0.875rem;
  color: var(--text-primary);
}

/* Checkmark for selected tag */
.tagCheck {
  width: 1rem;
  height: 1rem;
  color: var(--accent-success);
  flex-shrink: 0;
}

.emptyMsg {
  font-size: 0.875rem;
  color: var(--text-muted);
  padding: 0.375rem var(--space-2);
}

/* Create new tag section */
.createWrap {
  border-top: 1px solid var(--glass-border);
  padding: var(--space-2);
}

.createFields {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.createInput {
  width: 100%;
  padding: 0.375rem var(--space-2);
  background: var(--glass-bg-highlight);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--duration-normal) var(--easing-liquid);
}

.createInput:focus {
  border-color: var(--accent);
}

/* Color swatches row */
.colorSwatches {
  display: flex;
  gap: var(--space-1);
}

.colorSwatch {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  /* background set via inline style */
  transition: box-shadow var(--duration-normal) var(--easing-liquid);
}

/* Selected swatch ring — simulates ring-2 ring-offset-1 ring-offset-slate-800 */
.colorSwatch.selected {
  box-shadow:
    0 0 0 1px #1e293b,
    0 0 0 3px var(--glass-border);
}

/* Create/Cancel buttons row */
.createActions {
  display: flex;
  gap: var(--space-2);
}

.createBtn {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  background: var(--accent);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  transition: filter var(--duration-normal) var(--easing-liquid);
}

.createBtn:hover {
  filter: brightness(1.1);
}

.cancelBtn {
  padding: var(--space-1) var(--space-2);
  background: var(--glass-bg-highlight);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  transition: filter var(--duration-normal) var(--easing-liquid);
}

.cancelBtn:hover {
  filter: brightness(1.1);
}

/* "Create new tag" trigger button */
.createTrigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.375rem var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.875rem;
  transition:
    background-color var(--duration-normal) var(--easing-liquid),
    color var(--duration-normal) var(--easing-liquid);
}

.createTrigger:hover {
  background: var(--glass-bg-highlight);
  color: var(--text-primary);
}
```

- [ ] **Step 2: Update TagSelector.tsx**

Add module import after existing imports:

```tsx
import s from './TagSelector.module.css';
```

Replace the entire return statement:

```tsx
return (
  <div className={`${s.root} ${className}`} ref={dropdownRef}>
    {/* Selected Tags Display */}
    <div className={s.tagList}>
      {selectedTags.map((tag) => (
        <span
          key={tag.id}
          className={`${s.tagPill} ${onTagClick ? s.clickable : ''}`}
          style={{ backgroundColor: tag.color }}
          onClick={(e) => {
            if (onTagClick) {
              e.preventDefault();
              e.stopPropagation();
              onTagClick(tag);
            }
          }}
        >
          {tag.name}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleTag(tag);
              }}
              className={s.tagRemove}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
    </div>

    {/* Add Tag Button */}
    <button onClick={() => setIsOpen(!isOpen)} className={s.addBtn}>
      <Tag className="w-3.5 h-3.5" />
      Add Tag
    </button>

    {/* Dropdown */}
    {isOpen && (
      <div className={`${s.dropdown} dropdown-surface`}>
        {isAdmin && (
          <div className={s.searchWrap}>
            <div className={s.searchInner}>
              <Search className={`${s.searchIcon} w-4 h-4`} />
              <input
                type="text"
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={s.searchInput}
              />
            </div>
          </div>
        )}

        {/* Tags List */}
        <div className={s.tagListScroll}>
          {filteredTags.map((tag) => (
            <button key={tag.id} onClick={() => handleToggleTag(tag)} className={s.tagOption}>
              <span className={s.tagOptionInner}>
                <span className={s.tagDot} style={{ backgroundColor: tag.color }} />
                <span className={s.tagName}>{tag.name}</span>
              </span>
              {isTagSelected(tag.id) && <Check className={s.tagCheck} />}
            </button>
          ))}
          {filteredTags.length === 0 && <p className={s.emptyMsg}>No tags found</p>}
        </div>

        {/* Create New Tag - Admin Only */}
        {isAdmin && (
          <div className={s.createWrap}>
            {isCreating ? (
              <div className={s.createFields}>
                <input
                  type="text"
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className={s.createInput}
                  autoFocus
                />
                <div className={s.colorSwatches}>
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`${s.colorSwatch} ${newTagColor === color ? s.selected : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className={s.createActions}>
                  <button onClick={handleCreateTag} className={s.createBtn}>
                    Create
                  </button>
                  <button onClick={() => setIsCreating(false)} className={s.cancelBtn}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsCreating(true)} className={s.createTrigger}>
                <Plus className="w-4 h-4" />
                Create new tag
              </button>
            )}
          </div>
        )}
      </div>
    )}
  </div>
);
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Verify no raw Tailwind remains in TagSelector**

```bash
grep -n "flex\|gap-\|px-\|py-\|text-xs\|text-sm\|rounded\|overflow\|absolute\|z-50\|border\|font-" "/Volumes/Media/Epstein Files/epstein-archive/src/client/components/common/TagSelector.tsx" 2>/dev/null | grep "className"
```

Expected: no output (any remaining `className` lines should use only `s.` references or `dropdown-surface`).

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/common/TagSelector.module.css src/client/components/common/TagSelector.tsx && git commit -m "refactor(tag-selector): migrate to CSS module"
```

---

### Task 3: Extend CI ratchet to 13 governed files

**Files:**

- Modify: `scripts/check_design_token_usage.ts`

- [ ] **Step 1: Add LoadingPill.tsx and TagSelector.tsx to moduleGovernedFiles**

The Set currently has 11 entries. Add two more:

```ts
  'src/client/components/common/LoadingPill.tsx',
  'src/client/components/common/TagSelector.tsx',
```

- [ ] **Step 2: Run the CI ratchet**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected: `[design-token-usage] OK` — no violations on any of the 13 governed files.

If a violation is reported on LoadingPill or TagSelector, find the remaining Tailwind string and fix it.

- [ ] **Step 3: Run type-check and lint**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check && pnpm lint 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add scripts/check_design_token_usage.ts && git commit -m "chore(ci): extend CSS module ratchet to 13 governed files (LoadingPill, TagSelector)"
```
