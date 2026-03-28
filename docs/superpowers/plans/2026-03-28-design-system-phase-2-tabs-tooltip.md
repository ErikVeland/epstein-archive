# Design System Phase 2 — Tabs + Tooltip

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `Tabs` and `Tooltip` to CSS Modules, eliminating their remaining Tailwind/plain-CSS patterns, then extend the CI ratchet to guard all 11 governed files.

**Architecture:** Same pattern as Phase 1. Each component gets a `*.module.css` beside its `.tsx`. `Tabs` already has a plain `Tabs.css` — it is renamed to `Tabs.module.css` and the import is changed from a side-effect import to a named module import. The class names in both CSS and TSX are updated to camelCase module names. `Tooltip` currently builds position-aware class strings dynamically in JS (`getPositionClasses()` / `getArrowClasses()`); these functions are deleted and replaced with a `data-position` attribute on the tooltip element, with all positioning expressed as CSS `[data-position]` attribute selectors in the module file.

**Tech Stack:** Vite CSS Modules (native), CSS custom properties, Tailwind v3 still active (same migration strategy as Phase 1 — only components being migrated get modules).

**Starting position:** Phase 1 complete. Nine files in `moduleGovernedFiles`. `Tabs.css` is a plain global CSS file (not a module). `Tooltip.tsx` uses JS string-building functions for positioning.

**Base SHA (when starting):** run `git rev-parse HEAD` to record.

---

## File Map

**Rename:**

- `src/client/components/common/Tabs.css` → `src/client/components/common/Tabs.module.css`

**Create:**

- `src/client/components/common/Tooltip.module.css`

**Modify:**

- `src/client/components/common/Tabs.tsx` — change import, update className references to module style
- `src/client/components/common/Tooltip.tsx` — import module, delete position helper functions, add `data-position` attribute, use module classes
- `scripts/check_design_token_usage.ts` — extend `moduleGovernedFiles` from 9 to 11 entries

---

### Task 1: Convert Tabs from plain CSS to CSS Module

**Files:**

- Rename: `src/client/components/common/Tabs.css` → `src/client/components/common/Tabs.module.css`
- Modify: `src/client/components/common/Tabs.tsx`

- [ ] **Step 1: Run type-check baseline**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors. Record any pre-existing errors.

- [ ] **Step 2: Rename Tabs.css to Tabs.module.css and update class names to camelCase**

The current `Tabs.css` uses kebab-case class names. CSS Modules work best with camelCase. Create `Tabs.module.css` with these renames:

| Old class         | New class         |
| ----------------- | ----------------- |
| `.tabs-container` | `.tabsContainer`  |
| `.viewer`         | `.viewer` (keep)  |
| `.compact`        | `.compact` (keep) |
| `.tab-item`       | `.tabItem`        |
| `.active`         | `.active` (keep)  |
| `.tab-indicator`  | `.tabIndicator`   |
| `.tab-badge`      | `.tabBadge`       |
| `.tab-icon`       | `.tabIcon`        |

Rename the file and rewrite with updated selector names:

```css
/* src/client/components/common/Tabs.module.css */
.tabsContainer {
  display: flex;
  align-items: center;
  position: relative;
  background: transparent;
  gap: var(--space-1);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  --tab-accent: var(--accent);
  --tab-text-muted: var(--text-dim);
  --tab-text-active: var(--text-strong);
}

.tabsContainer.viewer {
  overflow: visible;
  flex-wrap: wrap;
  gap: 0;
  padding: 0;
}

.tabsContainer.compact {
  background: rgba(15, 23, 42, 0.4);
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  border-bottom: none;
}

.tabsContainer::-webkit-scrollbar {
  display: none;
}

.tabItem {
  position: relative;
  height: 44px;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--tab-text-muted);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0.02em;
  transition: all var(--duration-normal) var(--easing-liquid);
  white-space: nowrap;
  outline: none;
  flex-shrink: 0;
  border-radius: 10px;
  z-index: 1;
}

.tabsContainer.viewer .tabItem {
  border-radius: 0;
  height: 42px;
  border-bottom: 2px solid transparent;
  color: var(--text-dim);
  text-transform: none;
  letter-spacing: 0.01em;
  font-size: 12px;
  font-weight: 600;
  padding: 0 16px;
}

.tabsContainer.viewer .tabItem:hover {
  background: rgba(255, 255, 255, 0.03);
}

.tabsContainer.viewer .tabItem.active {
  border-bottom-color: var(--accent);
  color: var(--text-strong);
  background: rgba(255, 255, 255, 0.02);
}

.tabsContainer.compact .tabItem {
  height: 36px;
  padding: 0 var(--space-3);
  font-size: 10px;
}

.tabItem:hover {
  color: var(--text-default);
  background: rgba(255, 255, 255, 0.03);
}

.tabItem.active {
  color: var(--tab-text-active);
}

.tabsContainer.compact .tabItem.active {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tabIndicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background: var(--accent);
  box-shadow: none;
  transition: all var(--duration-normal) var(--easing-liquid);
  pointer-events: none;
  border-radius: 999px;
  z-index: 2;
}

.tabsContainer.compact .tabIndicator {
  display: none;
}

.tabsContainer.viewer .tabIndicator {
  display: none;
}

.tabBadge {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-dim);
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 800;
  transition: all var(--duration-normal) ease;
}

.tabItem.active .tabBadge {
  background: var(--accent);
  color: white;
}

.tabIcon {
  width: 14px;
  height: 14px;
  opacity: 0.5;
  transition: all var(--duration-normal) ease;
}

.tabItem.active .tabIcon {
  opacity: 1;
  color: var(--accent);
}

.tabItem:focus-visible {
  box-shadow: 0 0 0 2px var(--accent-glow);
}
```

Delete the old `Tabs.css` file.

- [ ] **Step 3: Update Tabs.tsx to use the module**

Open `src/client/components/common/Tabs.tsx`. Change:

```tsx
import './Tabs.css';
```

to:

```tsx
import s from './Tabs.module.css';
```

Then update the JSX. Change:

```tsx
return (
  <div className={`tabs-container ${variant} ${className}`} role="tablist" ref={containerRef}>
    {tabs.map((tab, index) => (
      <button
        key={tab.key}
        ref={(el) => (tabRefs.current[tab.key] = el)}
        data-testid={`tab-${tab.key}`}
        className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
        role="tab"
        aria-selected={activeTab === tab.key}
        aria-controls={`panel-${tab.key}`}
        id={`tab-${tab.key}`}
        onClick={() => onChange(tab.key)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        tabIndex={activeTab === tab.key ? 0 : -1}
      >
        {tab.icon && <span className="tab-icon">{tab.icon}</span>}
        <span>{tab.label}</span>
        {tab.count !== undefined && <span className="tab-badge">{tab.count}</span>}
      </button>
    ))}
    <div className="tab-indicator" style={indicatorStyle} aria-hidden="true" />
  </div>
);
```

to:

```tsx
return (
  <div
    className={`${s.tabsContainer} ${variant === 'compact' ? s.compact : ''} ${variant === 'viewer' ? s.viewer : ''} ${className}`}
    role="tablist"
    ref={containerRef}
  >
    {tabs.map((tab, index) => (
      <button
        key={tab.key}
        ref={(el) => (tabRefs.current[tab.key] = el)}
        data-testid={`tab-${tab.key}`}
        className={`${s.tabItem} ${activeTab === tab.key ? s.active : ''}`}
        role="tab"
        aria-selected={activeTab === tab.key}
        aria-controls={`panel-${tab.key}`}
        id={`tab-${tab.key}`}
        onClick={() => onChange(tab.key)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        tabIndex={activeTab === tab.key ? 0 : -1}
      >
        {tab.icon && <span className={s.tabIcon}>{tab.icon}</span>}
        <span>{tab.label}</span>
        {tab.count !== undefined && <span className={s.tabBadge}>{tab.count}</span>}
      </button>
    ))}
    <div className={s.tabIndicator} style={indicatorStyle} aria-hidden="true" />
  </div>
);
```

- [ ] **Step 4: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 5: Verify no broken references to old class names**

```bash
grep -rn "tabs-container\|tab-item\|tab-indicator\|tab-badge\|tab-icon" "/Volumes/Media/Epstein Files/epstein-archive/src/" 2>/dev/null
```

Expected: no results (if any appear, track them down — they may be in test files or other components).

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/common/Tabs.module.css src/client/components/common/Tabs.tsx && git rm src/client/components/common/Tabs.css && git commit -m "refactor(tabs): convert plain CSS to CSS Module"
```

---

### Task 2: Migrate Tooltip to CSS Module

**Files:**

- Create: `src/client/components/common/Tooltip.module.css`
- Modify: `src/client/components/common/Tooltip.tsx`

**Approach:** Delete `getPositionClasses()` and `getArrowClasses()` entirely. Add `data-position={position}` on the tooltip `<div>`. Express all positioning in CSS using `[data-position]` attribute selectors. This is cleaner than switching to per-position module class names because positions map 1:1 to the attribute value without extra TS logic.

- [ ] **Step 1: Create Tooltip.module.css**

```css
/* src/client/components/common/Tooltip.module.css */

/* Trigger wrapper */
.trigger {
  display: inline-block;
  position: relative;
}

/* Tooltip bubble — base styles */
.tooltip {
  position: absolute;
  z-index: 100;
  padding: var(--space-2) var(--space-3);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(12px);
  white-space: normal;
  min-width: 12.5rem;
  max-width: 18.75rem;
}

/* Positioning by data-position attribute */
.tooltip[data-position='top'] {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: var(--space-2);
}

.tooltip[data-position='top-end'] {
  bottom: 100%;
  right: 0;
  margin-bottom: var(--space-2);
}

.tooltip[data-position='right'] {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: var(--space-2);
}

.tooltip[data-position='bottom'] {
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: var(--space-2);
}

.tooltip[data-position='bottom-end'] {
  top: 100%;
  right: 0;
  margin-top: var(--space-2);
}

.tooltip[data-position='left'] {
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: var(--space-2);
}

/* Arrow — base: a rotated square sharing the border/background of the bubble */
.arrow {
  position: absolute;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--glass-bg-strong);
  border-top: 1px solid var(--glass-border);
  border-left: 1px solid var(--glass-border);
  rotate: 45deg;
}

/* Arrow positioning per tooltip position */
.tooltip[data-position='top'] .arrow {
  top: 100%;
  left: 50%;
  translate: -50% -50%;
}

.tooltip[data-position='top-end'] .arrow {
  top: 100%;
  right: 0.75rem;
  translate: 0 -50%;
}

.tooltip[data-position='right'] .arrow {
  left: 0;
  top: 50%;
  translate: -50% -50%;
}

.tooltip[data-position='bottom'] .arrow {
  bottom: 100%;
  left: 50%;
  translate: -50% 50%;
}

.tooltip[data-position='bottom-end'] .arrow {
  bottom: 100%;
  right: 0.75rem;
  translate: 0 50%;
}

.tooltip[data-position='left'] .arrow {
  right: 0;
  top: 50%;
  translate: 50% -50%;
}
```

- [ ] **Step 2: Update Tooltip.tsx**

Replace the entire file content. The new version removes `getPositionClasses()`, `getArrowClasses()`, uses `s.trigger`, `s.tooltip`, `s.arrow`, and adds `data-position`:

```tsx
import React, { useState, useRef, useEffect, useId } from 'react';
import s from './Tooltip.module.css';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'top-end' | 'bottom-end';
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [delayTimeout, setDelayTimeout] = useState<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  const showTooltip = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setDelayTimeout(timeout);
  };

  const hideTooltip = () => {
    if (delayTimeout) {
      clearTimeout(delayTimeout);
      setDelayTimeout(null);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        hideTooltip();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (delayTimeout) {
        clearTimeout(delayTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hideTooltip is stable
  }, [isVisible, delayTimeout]);

  return (
    <span
      className={`${s.trigger} ${className}`}
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      aria-describedby={isVisible ? tooltipId : undefined}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={s.tooltip}
          data-position={position}
          role="tooltip"
          id={tooltipId}
        >
          <div className={s.arrow} aria-hidden="true" />
          <div>{content}</div>
        </div>
      )}
    </span>
  );
};

export default Tooltip;
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Verify no remaining Tailwind position strings**

```bash
grep -n "getPositionClasses\|getArrowClasses\|bottom-full\|top-full\|left-full\|right-full" "/Volumes/Media/Epstein Files/epstein-archive/src/client/components/common/Tooltip.tsx" 2>/dev/null
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/common/Tooltip.module.css src/client/components/common/Tooltip.tsx && git commit -m "refactor(tooltip): replace dynamic class builders with CSS module + data-position"
```

---

### Task 3: Extend CI ratchet to 11 governed files

**Files:**

- Modify: `scripts/check_design_token_usage.ts`

- [ ] **Step 1: Open check_design_token_usage.ts and find moduleGovernedFiles**

The `moduleGovernedFiles` Set currently has 9 entries (from Phases 0 and 1):

```
Button.tsx, CloseButton.tsx, ProgressBar.tsx, SourceBadge.tsx,
Skeleton.tsx, LoadingIndicator.tsx, Card.tsx, FormField.tsx, Select.tsx
```

- [ ] **Step 2: Add Tabs.tsx and Tooltip.tsx to the Set**

Find the `moduleGovernedFiles` Set definition and add the two new entries:

```ts
  'Tabs.tsx',
  'Tooltip.tsx',
```

The updated set should have 11 entries total.

- [ ] **Step 3: Run the CI ratchet to verify it passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && npx tsx scripts/check_design_token_usage.ts 2>&1 | tail -20
```

Expected: passes with no violations for the 11 governed files. If it reports a violation on Tabs.tsx or Tooltip.tsx, check that the module imports are correct in those files.

- [ ] **Step 4: Run type-check and lint**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check && pnpm lint 2>&1 | tail -10
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add scripts/check_design_token_usage.ts && git commit -m "chore(ci): extend CSS module ratchet to 11 governed files (Tabs, Tooltip)"
```
