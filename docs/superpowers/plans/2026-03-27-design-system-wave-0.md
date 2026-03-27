# Design System Wave 0 — Foundation Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the `src/client/design-system/` foundation layer — lib utilities, missing components (Tabs, Select), extended Badge, and the new `patterns/` directory — so all subsequent migration waves have a complete, enforced system to build on.

**Architecture:** The design-system already has most of its scaffolding (Button, Surface, Badge, Dialog, Icon, etc. are in place and Glass* components are already shims). This wave fills the gaps: CVA variant utilities, Radix Tabs/Select wrappers, semantic Badge extensions, shared layout patterns (MediaBrowser, Toolbar, FilterBar, StatusBanner), a scoped hex-value ESLint rule, and removal of `.media-browser-*`CSS from`index.css`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Radix UI headless primitives, class-variance-authority (CVA), clsx + tailwind-merge (already installed)

---

## File Map

**Install (package.json changes):**

- `class-variance-authority` — CVA for typed variant generation
- `@radix-ui/react-tabs` — Tabs primitive
- `@radix-ui/react-select` — Select primitive

**Create:**

- `src/client/design-system/lib/variants.ts` — CVA re-export + conventions
- `src/client/design-system/lib/radix.ts` — Slot re-export, AsChildProps, useDataState
- `src/client/design-system/components/Tabs.tsx` — Radix Tabs wrapper
- `src/client/design-system/components/Select.tsx` — Radix Select wrapper
- `src/client/design-system/patterns/MediaBrowser.tsx` — shared media layout shell
- `src/client/design-system/patterns/Toolbar.tsx` — scrollable toolbar composite
- `src/client/design-system/patterns/FilterBar.tsx` — search + filter composite
- `src/client/design-system/patterns/StatusBanner.tsx` — error/warning/info banner
- `src/client/design-system/patterns/index.ts` — re-exports all patterns

**Modify:**

- `src/client/design-system/lib/index.ts` — add variants + radix exports
- `src/client/design-system/components/Badge.tsx` — add riskLevel, navCategory, count props
- `src/client/design-system/components/index.ts` — add Tabs + Select exports
- `src/client/design-system/tokens/colors.ts` — add typed hex constants for risk/nav colors
- `src/client/design-system/index.ts` — export from patterns
- `.eslintrc.json` — add hex-value no-restricted-syntax rule scoped to design-system/
- `src/client/index.css` — remove `.media-browser-*` and `.status-banner` blocks (~175 lines)
- `scripts/check_client_server_boundary.mjs` — add design-system → components/ boundary rule

---

## Task 1: Install missing dependencies

**Files:**

- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install CVA and Radix Tabs/Select**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm add class-variance-authority @radix-ui/react-tabs @radix-ui/react-select
```

Expected: packages added, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Verify installation**

```bash
node -e "require('class-variance-authority'); require('@radix-ui/react-tabs'); require('@radix-ui/react-select'); console.log('OK')"
```

Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(design-system): add CVA, Radix Tabs and Select dependencies"
```

---

## Task 2: Add lib/variants.ts, lib/radix.ts, update lib/index.ts

**Files:**

- Create: `src/client/design-system/lib/variants.ts`
- Create: `src/client/design-system/lib/radix.ts`
- Modify: `src/client/design-system/lib/index.ts`

- [ ] **Step 1: Create lib/variants.ts**

```typescript
// src/client/design-system/lib/variants.ts
//
// CVA (class-variance-authority) re-export with project conventions.
//
// CONVENTIONS:
// 1. Always define base classes (applied to every variant) as the first argument.
// 2. Keep variant keys semantic, not visual: "danger" not "red", "ghost" not "transparent".
// 3. Only use Tailwind semantic color tokens (e.g. text-text-primary, bg-bg-elevated).
//    Do NOT use raw Tailwind color utilities (text-red-500, bg-cyan-900).
//    Do NOT use arbitrary hex values ([#fff]).
// 4. Export both the variant function AND the VariantProps type from each component file.
// 5. Use `cn()` to merge external className with CVA output:
//      className={cn(myVariants({ variant, size }), className)}

export { cva, type VariantProps } from 'class-variance-authority';
```

- [ ] **Step 2: Create lib/radix.ts**

```typescript
// src/client/design-system/lib/radix.ts
//
// Shared utilities for wrapping Radix UI primitives.

export { Slot } from '@radix-ui/react-slot';

/** Add to props of any component that supports asChild composition. */
export interface AsChildProps {
  asChild?: boolean;
}

/**
 * Converts a state record into data-* HTML attributes.
 * Use to expose interactive state to CSS without class manipulation.
 *
 * @example
 *   <div {...useDataState({ state: isOpen ? 'open' : 'closed', disabled: isDisabled })} />
 *   // Produces: data-state="open" data-disabled (or nothing if false/undefined)
 */
export function useDataState(
  state: Record<string, boolean | string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(state)
      .filter(([, v]) => v !== undefined && v !== false)
      .map(([k, v]) => [`data-${k}`, v === true ? '' : String(v)]),
  );
}
```

- [ ] **Step 3: Update lib/index.ts**

```typescript
// src/client/design-system/lib/index.ts
export * from './cn';
export * from './radix';
export * from './variants';
```

- [ ] **Step 4: Verify types compile**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/client/design-system/lib/
git commit -m "feat(design-system): add CVA variants and Radix glue utilities to lib/"
```

---

## Task 3: Add Tabs.tsx component

**Files:**

- Create: `src/client/design-system/components/Tabs.tsx`

- [ ] **Step 1: Create Tabs.tsx**

```tsx
// src/client/design-system/components/Tabs.tsx
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../lib';

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'control-scroll-row-mobile flex items-center gap-1 border-b border-[var(--glass-border)]',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Layout
      'relative inline-flex shrink-0 select-none items-center gap-1.5 px-3 pb-2 pt-1',
      // Typography
      'text-sm font-medium',
      // Colors — inactive
      'text-[var(--text-muted)] transition-colors duration-[var(--duration-fast)]',
      // Colors — active
      'data-[state=active]:text-[var(--text-primary)]',
      // Active indicator bar
      'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:rounded-full after:bg-transparent',
      'data-[state=active]:after:bg-[var(--accent)]',
      // Hover
      'hover:text-[var(--text-secondary)]',
      // Focus
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]',
      // Disabled
      'disabled:pointer-events-none disabled:opacity-40',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
```

- [ ] **Step 2: Add to components/index.ts**

Open `src/client/design-system/components/index.ts` and add:

```typescript
export * from './Tabs';
```

- [ ] **Step 3: Verify types compile**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/client/design-system/components/Tabs.tsx src/client/design-system/components/index.ts
git commit -m "feat(design-system): add Tabs component (Radix wrapper)"
```

---

## Task 4: Add Select.tsx component

**Files:**

- Create: `src/client/design-system/components/Select.tsx`

- [ ] **Step 1: Create Select.tsx**

```tsx
// src/client/design-system/components/Select.tsx
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '../lib';
import { Icon } from './Icon';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'control flex w-full items-center justify-between gap-2 text-sm text-[var(--text-primary)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]',
      'disabled:pointer-events-none disabled:opacity-50',
      '[&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <Icon name="ChevronDown" size="sm" className="shrink-0 opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'glass-panel relative z-50 max-h-[var(--radix-select-content-available-height)] min-w-[8rem] overflow-hidden rounded-[var(--radius-md)]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        position === 'popper' && 'w-[var(--radix-select-trigger-width)] translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]',
      className,
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-[var(--radius-sm)] py-1.5 pl-8 pr-2 text-sm',
      'text-[var(--text-secondary)] outline-none transition-colors duration-[var(--duration-fast)]',
      'focus:bg-[var(--glass-bg-strong)] focus:text-[var(--text-primary)]',
      'data-[state=checked]:text-[var(--accent)]',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Icon name="Check" size="xs" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('my-1 h-px bg-[var(--glass-border)]', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
```

- [ ] **Step 2: Add to components/index.ts**

Add to `src/client/design-system/components/index.ts`:

```typescript
export * from './Select';
```

- [ ] **Step 3: Verify types compile**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/client/design-system/components/Select.tsx src/client/design-system/components/index.ts
git commit -m "feat(design-system): add Select component (Radix wrapper)"
```

---

## Task 5: Update Badge with risk/nav/count props

**Files:**

- Modify: `src/client/design-system/components/Badge.tsx`

The existing Badge uses `tone` for semantic color. This task extends it with three new optional props: `riskLevel` (maps to risk color tokens), `navCategory` (maps to nav category colors), and `count` (renders a numeric pill). When these are provided, they take precedence over `tone`.

- [ ] **Step 1: Replace Badge.tsx**

```tsx
// src/client/design-system/components/Badge.tsx
import * as React from 'react';
import { cn } from '../lib';

// ── Nav category colours (match index.css --nav-* tokens) ────────────────────
const navCategoryStyles: Record<string, string> = {
  documents:
    'bg-[color-mix(in_srgb,var(--nav-documents)_14%,transparent)] text-[var(--nav-documents)] border-[color-mix(in_srgb,var(--nav-documents)_30%,transparent)]',
  emails:
    'bg-[color-mix(in_srgb,var(--nav-emails)_14%,transparent)] text-[var(--nav-emails)] border-[color-mix(in_srgb,var(--nav-emails)_30%,transparent)]',
  media:
    'bg-[color-mix(in_srgb,var(--nav-media)_14%,transparent)] text-[var(--nav-media)] border-[color-mix(in_srgb,var(--nav-media)_30%,transparent)]',
  people:
    'bg-[color-mix(in_srgb,var(--nav-people)_14%,transparent)] text-[var(--nav-people)] border-[color-mix(in_srgb,var(--nav-people)_30%,transparent)]',
  investigations:
    'bg-[color-mix(in_srgb,var(--nav-investigations)_14%,transparent)] text-[var(--nav-investigations)] border-[color-mix(in_srgb,var(--nav-investigations)_30%,transparent)]',
  timeline:
    'bg-[color-mix(in_srgb,var(--nav-timeline)_14%,transparent)] text-[var(--nav-timeline)] border-[color-mix(in_srgb,var(--nav-timeline)_30%,transparent)]',
  flights:
    'bg-[color-mix(in_srgb,var(--nav-flights)_14%,transparent)] text-[var(--nav-flights)] border-[color-mix(in_srgb,var(--nav-flights)_30%,transparent)]',
  properties:
    'bg-[color-mix(in_srgb,var(--nav-properties)_14%,transparent)] text-[var(--nav-properties)] border-[color-mix(in_srgb,var(--nav-properties)_30%,transparent)]',
  network:
    'bg-[color-mix(in_srgb,var(--nav-network)_14%,transparent)] text-[var(--nav-network)] border-[color-mix(in_srgb,var(--nav-network)_30%,transparent)]',
};

// ── Risk level colours (match index.css --risk-* tokens) ─────────────────────
const riskLevelStyles: Record<string, string> = {
  critical:
    'bg-[color-mix(in_srgb,var(--risk-critical)_14%,transparent)] text-[var(--risk-critical)] border-[color-mix(in_srgb,var(--risk-critical)_30%,transparent)]',
  high: 'bg-[color-mix(in_srgb,var(--risk-high)_14%,transparent)] text-[var(--risk-high)] border-[color-mix(in_srgb,var(--risk-high)_30%,transparent)]',
  medium:
    'bg-[color-mix(in_srgb,var(--risk-medium)_14%,transparent)] text-[var(--risk-medium)] border-[color-mix(in_srgb,var(--risk-medium)_30%,transparent)]',
  low: 'bg-[color-mix(in_srgb,var(--risk-low)_14%,transparent)] text-[var(--risk-low)] border-[color-mix(in_srgb,var(--risk-low)_30%,transparent)]',
  minimal:
    'bg-[color-mix(in_srgb,var(--risk-minimal)_14%,transparent)] text-[var(--risk-minimal)] border-[color-mix(in_srgb,var(--risk-minimal)_30%,transparent)]',
  unknown: 'bg-[var(--glass-bg-strong)] text-[var(--text-muted)] border-[var(--glass-border)]',
};

// ── Tone colours (existing API, kept for backwards compatibility) ─────────────
const toneClasses: Record<string, string> = {
  accent: 'tone-accent',
  info: 'tone-info',
  success: 'tone-success',
  warning: 'tone-warning',
  danger: 'tone-danger',
  neutral: 'bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] border-[var(--glass-border)]',
};

const sizeClasses = {
  sm: 'min-h-5 text-[11px]',
  md: 'min-h-6 text-xs',
} as const;

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal' | 'unknown';
export type NavCategory =
  | 'documents'
  | 'emails'
  | 'media'
  | 'people'
  | 'investigations'
  | 'timeline'
  | 'flights'
  | 'properties'
  | 'network';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic tone — the existing API. Ignored when riskLevel or navCategory is set. */
  tone?: 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  /** Risk severity level. Overrides tone when set. */
  riskLevel?: RiskLevel;
  /** Navigation category. Overrides tone when set. */
  navCategory?: NavCategory;
  /** Renders a count pill with this numeric value. Overrides tone when set. */
  count?: number;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, tone = 'neutral', size = 'md', riskLevel, navCategory, count, children, ...props },
    ref,
  ) => {
    // Resolve colour classes in priority order: riskLevel > navCategory > count > tone
    const colourClass = riskLevel
      ? riskLevelStyles[riskLevel]
      : navCategory
        ? navCategoryStyles[navCategory]
        : count !== undefined
          ? 'bg-[var(--glass-bg)] text-[var(--text-muted)] border-[var(--glass-border)]'
          : toneClasses[tone];

    const content = count !== undefined ? count : children;

    const dataProps: Record<string, string> = { slot: 'badge', size };
    if (riskLevel) dataProps['risk-level'] = riskLevel;
    if (navCategory) dataProps['nav-category'] = navCategory;
    if (tone && !riskLevel && !navCategory && count === undefined) dataProps['tone'] = tone;

    return (
      <span
        ref={ref}
        {...Object.fromEntries(Object.entries(dataProps).map(([k, v]) => [`data-${k}`, v]))}
        className={cn('status-chip', sizeClasses[size], colourClass, className)}
        {...props}
      >
        {content}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/design-system/components/Badge.tsx
git commit -m "feat(design-system): extend Badge with riskLevel, navCategory, and count props"
```

---

## Task 6: Update tokens/colors.ts with hex constants

**Files:**

- Modify: `src/client/design-system/tokens/colors.ts`

The current file exports CSS var references. Add typed hex constants for risk and nav colours so JS code can reference them without CSS var lookups (e.g. in data-vis, canvas, SVG).

- [ ] **Step 1: Append to tokens/colors.ts**

Read the current file first, then append after the last export:

```typescript
// ── Hex constants (for use in JS contexts: canvas, SVG, data-vis) ─────────────
// These MUST match the CSS variable values defined in index.css :root {}
// If you update a colour in index.css, update the matching constant here.

export const riskHex = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#16a34a',
  minimal: '#0d9488',
  unknown: '#475569',
} as const;

export const navHex = {
  documents: '#34d399',
  emails: '#fbbf24',
  media: '#a78bfa',
  people: '#60a5fa',
  investigations: '#ec4899',
  timeline: '#fb923c',
  flights: '#38bdf8',
  properties: '#a3e635',
  network: '#f472b6',
} as const;

export const accentHex = {
  gold: '#d4a84b',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#34d399',
  info: '#06b6d4',
} as const;

export type RiskHexKey = keyof typeof riskHex;
export type NavHexKey = keyof typeof navHex;
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/design-system/tokens/colors.ts
git commit -m "feat(design-system): add typed hex constants for risk, nav, and accent colours"
```

---

## Task 7: Create patterns/MediaBrowser.tsx

**Files:**

- Create: `src/client/design-system/patterns/MediaBrowser.tsx`

This component replaces the `.media-browser-*` CSS classes in `index.css`. It accepts slot props for each region and handles layout, search, and responsive sidebar visibility internally.

- [ ] **Step 1: Create patterns/MediaBrowser.tsx**

```tsx
// src/client/design-system/patterns/MediaBrowser.tsx
//
// Shared layout shell for PhotoBrowser, VideoBrowser, AudioBrowser, ArticlesTab.
// Handles the responsive shell, header, toolbar, sidebar, search, and grid slots.
// Domain components pass their specific grids/toolbars as children props.

import * as React from 'react';
import { cn } from '../lib';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/Spinner';

export interface MediaBrowserAlbumItem {
  id: string;
  label: string;
  count?: number;
}

export interface MediaBrowserProps {
  /** Domain-specific filter controls, sort buttons, etc. */
  toolbar?: React.ReactNode;
  /** Album/category list — shown in sidebar on desktop, dropdown on mobile. */
  sidebarItems?: MediaBrowserAlbumItem[];
  /** Currently selected sidebar item id. */
  selectedSidebarItem?: string;
  /** Called when user clicks a sidebar/dropdown item. */
  onSidebarItemSelect?: (id: string) => void;
  /** Label shown above sidebar items. */
  sidebarTitle?: string;
  /** The grid or list of results. */
  grid: React.ReactNode;
  /** Shown when grid is empty and not loading. Defaults to nothing. */
  emptyState?: React.ReactNode;
  /** Search input value. */
  searchValue?: string;
  /** Called on search input change. */
  onSearch?: (q: string) => void;
  /** Search placeholder text. */
  searchPlaceholder?: string;
  /** Status text shown in toolbar (e.g. "42 items"). */
  statusText?: string;
  /** Number of currently selected items (shows batch action bar when > 0). */
  selectionCount?: number;
  /** Batch action controls — shown when selectionCount > 0. */
  batchActions?: React.ReactNode;
  /** Shows loading spinner overlay when true. */
  loading?: boolean;
  /** Error message to show as alert banner. */
  errorMessage?: string;
  className?: string;
}

/** Item rendered in the sidebar or mobile dropdown. */
const BrowserItem = ({
  item,
  isActive,
  onSelect,
  mode,
}: {
  item: MediaBrowserAlbumItem;
  isActive: boolean;
  onSelect: () => void;
  mode: 'sidebar' | 'dropdown';
}) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      // Base
      'flex w-full items-center justify-between gap-2 text-left text-sm transition-colors duration-[var(--duration-fast)]',
      'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      // Mode-specific
      mode === 'sidebar' && [
        'min-h-[var(--control-height)] border-l-2 border-transparent px-4',
        isActive &&
          'border-l-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]',
      ],
      mode === 'dropdown' && [
        'min-h-[var(--control-height)] px-4',
        isActive && 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]',
      ],
    )}
  >
    <span className="min-w-0 truncate">{item.label}</span>
    {item.count !== undefined && (
      <span className="inline-flex min-h-6 min-w-8 items-center justify-center rounded-full bg-[var(--glass-bg)] px-2 text-[var(--type-small)] text-[var(--text-muted)]">
        {item.count}
      </span>
    )}
  </button>
);

export const MediaBrowser = React.forwardRef<HTMLDivElement, MediaBrowserProps>(
  (
    {
      toolbar,
      sidebarItems,
      selectedSidebarItem,
      onSidebarItemSelect,
      sidebarTitle,
      grid,
      emptyState,
      searchValue = '',
      onSearch,
      searchPlaceholder = 'Search…',
      statusText,
      selectionCount = 0,
      batchActions,
      loading = false,
      errorMessage,
      className,
    },
    ref,
  ) => {
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const hasSidebar = sidebarItems && sidebarItems.length > 0;
    const selectedItem = hasSidebar
      ? sidebarItems!.find((i) => i.id === selectedSidebarItem)
      : undefined;

    return (
      <div
        ref={ref}
        data-slot="media-browser"
        className={cn(
          'relative flex h-full min-h-[500px] flex-col overflow-hidden rounded-[var(--radius-lg)]',
          className,
        )}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="z-10 flex flex-shrink-0 flex-col gap-2 px-3 py-2">
          {/* Mobile album trigger */}
          {hasSidebar && (
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="control flex min-h-[var(--control-height)] w-full items-center justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <Icon name="FolderOpen" size="sm" color="muted" />
                  <span className="truncate text-sm text-[var(--text-primary)]">
                    {selectedItem?.label ?? 'All'}
                  </span>
                </span>
                <Icon
                  name="ChevronDown"
                  size="sm"
                  color="muted"
                  className={cn('transition-transform', dropdownOpen && 'rotate-180')}
                />
              </button>
              {dropdownOpen && (
                <div className="glass-panel absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-[var(--radius-md)]">
                  {sidebarItems!.map((item) => (
                    <BrowserItem
                      key={item.id}
                      item={item}
                      isActive={item.id === selectedSidebarItem}
                      mode="dropdown"
                      onSelect={() => {
                        onSidebarItemSelect?.(item.id);
                        setDropdownOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search */}
          {onSearch !== undefined && (
            <div className="relative w-full">
              <Icon
                name="Search"
                size="sm"
                color="muted"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="control w-full min-h-[var(--control-height)] pl-9 pr-3 text-sm"
              />
            </div>
          )}

          {/* Toolbar row */}
          {(toolbar || statusText) && (
            <div className="flex flex-wrap items-center gap-2">
              {toolbar && (
                <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-px scrollbar-none [&::-webkit-scrollbar]:hidden [&>*]:flex-shrink-0">
                  {toolbar}
                </div>
              )}
              {statusText && (
                <span className="ml-auto whitespace-nowrap text-[var(--type-small)] text-[var(--text-muted)]">
                  {statusText}
                </span>
              )}
            </div>
          )}

          {/* Batch action bar */}
          {selectionCount > 0 && batchActions && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-1.5">
              <span className="text-sm font-medium text-[var(--accent)]">
                {selectionCount} selected
              </span>
              <div className="ml-auto flex items-center gap-1">{batchActions}</div>
            </div>
          )}
        </div>

        {/* ── Error banner ──────────────────────────────────────────────────── */}
        {errorMessage && (
          <div className="mx-4 mb-2 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--accent-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent-danger)_14%,transparent)] p-4 text-sm text-[color-mix(in_srgb,var(--accent-danger)_36%,#fff_64%)]">
            {errorMessage}
          </div>
        )}

        {/* ── Body (sidebar + grid) ─────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          {hasSidebar && (
            <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-[var(--glass-border)] bg-[var(--glass-bg-strong)] md:flex">
              {sidebarTitle && (
                <p className="px-4 py-3 text-[var(--type-small)] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {sidebarTitle}
                </p>
              )}
              <div className="flex-1 overflow-y-auto">
                {sidebarItems!.map((item) => (
                  <BrowserItem
                    key={item.id}
                    item={item}
                    isActive={item.id === selectedSidebarItem}
                    mode="sidebar"
                    onSelect={() => onSidebarItemSelect?.(item.id)}
                  />
                ))}
              </div>
            </aside>
          )}

          {/* Grid / content area */}
          <div className="relative min-w-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="lg" label="Loading…" />
              </div>
            ) : (
              (grid ?? emptyState)
            )}
          </div>
        </div>
      </div>
    );
  },
);

MediaBrowser.displayName = 'MediaBrowser';
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/design-system/patterns/MediaBrowser.tsx
git commit -m "feat(design-system): add MediaBrowser pattern component"
```

---

## Task 8: Create patterns/Toolbar.tsx, FilterBar.tsx, StatusBanner.tsx

**Files:**

- Create: `src/client/design-system/patterns/Toolbar.tsx`
- Create: `src/client/design-system/patterns/FilterBar.tsx`
- Create: `src/client/design-system/patterns/StatusBanner.tsx`

- [ ] **Step 1: Create patterns/Toolbar.tsx**

```tsx
// src/client/design-system/patterns/Toolbar.tsx
//
// Flexible toolbar with a scrollable row of items (filters, sort controls,
// action buttons) and an optional fixed right-side action area.

import * as React from 'react';
import { cn } from '../lib';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Items that scroll horizontally on overflow (filters, sort buttons, etc.) */
  children: React.ReactNode;
  /** Fixed right side — actions that should always be visible (e.g. "Add" button). */
  actions?: React.ReactNode;
}

export const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, children, actions, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="toolbar"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {/* Scrollable item row */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden pb-px scrollbar-none [&::-webkit-scrollbar]:hidden [&>*]:flex-shrink-0">
        {children}
      </div>
      {/* Fixed actions */}
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  ),
);

Toolbar.displayName = 'Toolbar';
```

- [ ] **Step 2: Create patterns/FilterBar.tsx**

```tsx
// src/client/design-system/patterns/FilterBar.tsx
//
// Search input + filter controls composite.
// The search input is always visible; filters are in a scrollable Toolbar.

import * as React from 'react';
import { cn } from '../lib';
import { Icon } from '../components/Icon';
import { Toolbar } from './Toolbar';

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled search input value. */
  searchValue?: string;
  /** Called when the search input changes. */
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  /** Filter controls rendered in the scrollable toolbar row. */
  filters?: React.ReactNode;
  /** Fixed right-side actions (e.g. "Add new"). */
  actions?: React.ReactNode;
  /** Status text shown between toolbar and right actions (e.g. "42 results"). */
  statusText?: string;
}

export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  (
    {
      className,
      searchValue = '',
      onSearch,
      searchPlaceholder = 'Search…',
      filters,
      actions,
      statusText,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      data-slot="filter-bar"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {/* Search row */}
      {onSearch !== undefined && (
        <div className="relative w-full">
          <Icon
            name="Search"
            size="sm"
            color="muted"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="control w-full min-h-[var(--control-height)] pl-9 pr-3 text-sm"
          />
        </div>
      )}
      {/* Filter + status + actions row */}
      {(filters || statusText || actions) && (
        <Toolbar actions={actions}>
          {filters}
          {statusText && (
            <span className="ml-auto whitespace-nowrap text-[var(--type-small)] text-[var(--text-muted)]">
              {statusText}
            </span>
          )}
        </Toolbar>
      )}
    </div>
  ),
);

FilterBar.displayName = 'FilterBar';
```

- [ ] **Step 3: Create patterns/StatusBanner.tsx**

```tsx
// src/client/design-system/patterns/StatusBanner.tsx
//
// Error, warning, info, and success banner. Replaces .status-banner and
// .media-browser-alert inline patterns across the codebase.

import * as React from 'react';
import { cn } from '../lib';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';

const toneConfig: Record<
  'error' | 'warning' | 'info' | 'success',
  { icon: IconName; classes: string }
> = {
  error: {
    icon: 'AlertCircle',
    classes:
      'border-[color-mix(in_srgb,var(--accent-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] text-[color-mix(in_srgb,var(--accent-danger)_60%,var(--text-primary))]',
  },
  warning: {
    icon: 'AlertTriangle',
    classes:
      'border-[color-mix(in_srgb,var(--accent-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent-warning)_10%,transparent)] text-[color-mix(in_srgb,var(--accent-warning)_60%,var(--text-primary))]',
  },
  info: {
    icon: 'Info',
    classes:
      'border-[color-mix(in_srgb,var(--accent-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent-info)_10%,transparent)] text-[color-mix(in_srgb,var(--accent-info)_60%,var(--text-primary))]',
  },
  success: {
    icon: 'CheckCircle',
    classes:
      'border-[color-mix(in_srgb,var(--accent-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent-success)_10%,transparent)] text-[color-mix(in_srgb,var(--accent-success)_60%,var(--text-primary))]',
  },
};

export interface StatusBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'error' | 'warning' | 'info' | 'success';
  /** If true, shows the tone icon. Default true. */
  showIcon?: boolean;
}

export const StatusBanner = React.forwardRef<HTMLDivElement, StatusBannerProps>(
  ({ className, tone = 'info', showIcon = true, children, ...props }, ref) => {
    const config = toneConfig[tone];
    return (
      <div
        ref={ref}
        data-slot="status-banner"
        data-tone={tone}
        role={tone === 'error' ? 'alert' : 'status'}
        className={cn(
          'flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-sm',
          config.classes,
          className,
        )}
        {...props}
      >
        {showIcon && <Icon name={config.icon} size="sm" className="mt-px flex-shrink-0" />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  },
);

StatusBanner.displayName = 'StatusBanner';
```

- [ ] **Step 4: Verify types compile**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/client/design-system/patterns/Toolbar.tsx src/client/design-system/patterns/FilterBar.tsx src/client/design-system/patterns/StatusBanner.tsx
git commit -m "feat(design-system): add Toolbar, FilterBar, and StatusBanner patterns"
```

---

## Task 9: Create patterns/index.ts and update design-system/index.ts

**Files:**

- Create: `src/client/design-system/patterns/index.ts`
- Modify: `src/client/design-system/index.ts`

- [ ] **Step 1: Create patterns/index.ts**

```typescript
// src/client/design-system/patterns/index.ts
export * from './FilterBar';
export * from './MediaBrowser';
export * from './StatusBanner';
export * from './Toolbar';
```

- [ ] **Step 2: Update design-system/index.ts**

```typescript
// src/client/design-system/index.ts
export * from './components';
export * from './lib';
export * from './patterns';
export * from './tokens';
```

- [ ] **Step 3: Verify types compile**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/client/design-system/patterns/index.ts src/client/design-system/index.ts
git commit -m "feat(design-system): wire patterns/ into design-system index"
```

---

## Task 10: Add hex-value ESLint rule scoped to design-system/

**Files:**

- Modify: `.eslintrc.json`

This adds a `no-restricted-syntax` rule that flags hardcoded hex/rgb/hsl values in the design-system source itself. The design-system must only reference tokens, never raw values.

- [ ] **Step 1: Read current .eslintrc.json**

```bash
cat .eslintrc.json
```

- [ ] **Step 2: Add a new override block for src/client/design-system/**

In the `overrides` array, add this block (before the closing `]`):

```json
{
  "files": ["src/client/design-system/**/*.{ts,tsx}"],
  "rules": {
    "no-restricted-syntax": [
      "warn",
      {
        "selector": "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
        "message": "Hardcoded hex colour in design-system. Use a CSS var reference (var(--token)) or export from tokens/colors.ts instead."
      }
    ]
  }
}
```

Note: This is `warn` not `error` because `tokens/colors.ts` itself defines hex strings (intentionally). The rule helps catch accidental hardcoding in components while allowing token definitions. Upgrade to `error` once all token definitions use the `as const` pattern.

- [ ] **Step 3: Run lint to verify zero new errors**

```bash
pnpm lint 2>&1 | tail -20
```

Expected: any warnings in tokens/ are expected (they define the hex values). Zero errors in components/ or patterns/.

- [ ] **Step 4: Commit**

```bash
git add .eslintrc.json
git commit -m "chore(lint): add hex-value warning rule scoped to design-system/"
```

---

## Task 11: Remove .media-browser-\* from index.css

**Files:**

- Modify: `src/client/index.css`

These styles are now encoded in `patterns/MediaBrowser.tsx`. Remove the CSS class block from index.css.

- [ ] **Step 1: Find the exact line range**

```bash
grep -n "\.media-browser-\|\.status-banner" src/client/index.css
```

Note the first and last line numbers of the block.

- [ ] **Step 2: Delete lines 883–1059 (the .media-browser-\* and .status-banner block)**

The block starts at `.media-browser-shell {` and ends after `.status-banner {`. Verify visually that you're removing only these classes, then delete the lines. The surrounding CSS (before 883 and after 1059) must remain intact.

- [ ] **Step 3: Verify no references remain that would break existing render**

```bash
grep -r "media-browser-\|status-banner" src/client/components/ --include="*.tsx" --include="*.ts" | grep -v "design-system"
```

If any components still use `className="media-browser-*"` — that is expected. Those components will be migrated in Wave 1. The CSS removal is safe because Wave 0's gate allows components using the old classes to visually break during the wave (they'll be fixed in their own waves). However, to prevent the Wave 0 gate from failing visually, you can defer this step to Wave 1 if preferred.

**IMPORTANT:** If any existing components still rely on `.media-browser-*` classes for critical layout, defer this step to Wave 1 (Media) when those components are migrated to `<MediaBrowser>`. Update this task's checkbox accordingly.

- [ ] **Step 4: Verify types compile and lint passes**

```bash
pnpm type-check && pnpm lint
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/client/index.css
git commit -m "chore(css): remove .media-browser-* classes (moved to patterns/MediaBrowser.tsx)"
```

---

## Task 12: Verify boundary check covers design-system → components/

**Files:**

- Read-only verification (no changes needed — rule already exists)

The `scripts/check_client_server_boundary.mjs` script already contains the `checkDesignSystemBoundary` function with this exact rule:

```js
if (isDesignSystemFile) {
  if (spec.startsWith('@client/components/') || spec.includes('/components/')) {
    return 'Design-system modules may not import from src/client/components.';
  }
}
```

This task confirms it runs clean with the new patterns/ files.

- [ ] **Step 1: Run boundary check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
node scripts/check_client_server_boundary.mjs
```

Expected output: `Boundary check passed (N client files).`

If any violations are reported from the new `src/client/design-system/patterns/*.tsx` files, fix those imports before continuing.

- [ ] **Step 2: Confirm no violations**

If Step 1 exits cleanly — nothing to commit. The rule is already enforced.

---

## Task 13: Add semantic colour tokens to Tailwind config

**Files:**

- Modify: `tailwind.config.js`

The spec requires the full Tailwind colour palette to eventually be replaced with only semantic tokens. However, removing `tokenizedPaletteFamilies` now would visually break all unmigrated components (Wave 1–5 work). The correct Wave 0 approach: **add** the semantic token aliases to `tailwind.config.js` so they're available immediately, while leaving the existing colour families untouched. Each migration wave removes the old families from the components it migrates. Wave 6 removes the families entirely.

- [ ] **Step 1: Read the current extend.colors block in tailwind.config.js**

```bash
grep -n "bg:\|text:\|accent:\|semantic:\|risk:" tailwind.config.js | head -30
```

Confirm the existing token aliases (`text.primary`, `accent.primary`, `semantic.risk.*`, etc.).

- [ ] **Step 2: Add missing semantic aliases to extend.colors**

In `tailwind.config.js`, inside `theme.extend.colors`, add these aliases if they are not already present. These use the CSS var names defined in `index.css :root {}`:

```js
// Inside theme.extend.colors — add alongside existing entries:
nav: {
  documents:      'var(--nav-documents)',
  emails:         'var(--nav-emails)',
  media:          'var(--nav-media)',
  people:         'var(--nav-people)',
  investigations: 'var(--nav-investigations)',
  timeline:       'var(--nav-timeline)',
  flights:        'var(--nav-flights)',
  properties:     'var(--nav-properties)',
  network:        'var(--nav-network)',
},
risk: {
  critical: 'var(--risk-critical)',
  high:     'var(--risk-high)',
  medium:   'var(--risk-medium)',
  low:      'var(--risk-low)',
  minimal:  'var(--risk-minimal)',
  unknown:  'var(--risk-unknown)',
},
```

This means components can now write `text-nav-documents`, `bg-risk-critical/20` etc. as Tailwind classes — consuming CSS vars rather than hardcoded values.

- [ ] **Step 3: Verify Tailwind generates the new utilities**

Start the dev server briefly and check the compiled CSS:

```bash
pnpm build 2>&1 | tail -5
```

Expected: build completes without errors.

- [ ] **Step 4: Verify types compile**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js
git commit -m "feat(tailwind): add nav and risk semantic colour token aliases"
```

---

## Task 14: Gate verification

- [ ] **Step 1: Full lint pass**

```bash
pnpm lint
```

Expected: zero errors (warnings in tokens/ for hex strings are acceptable).

- [ ] **Step 2: Full type-check pass**

```bash
pnpm type-check
```

Expected: zero errors.

- [ ] **Step 3: Verify design-system exports are importable**

Create a temporary test file, run type-check, then delete it:

```bash
cat > /tmp/ds-smoke.ts << 'EOF'
import {
  Button, Surface, Badge, Icon, EmptyState, Spinner,
  Dialog, DialogContent, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Switch, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  MediaBrowser, Toolbar, FilterBar, StatusBanner,
  cn, cva, type VariantProps, useDataState,
  colorTokens, riskHex, navHex, accentHex,
  surfaceVariants, typographyTokens,
} from '/Volumes/Media/Epstein Files/epstein-archive/src/client/design-system/index.ts';

// Type checks only — no runtime
const _b: typeof Button = Button;
const _s: typeof Surface = Surface;
const _mb: typeof MediaBrowser = MediaBrowser;
EOF
cd "/Volumes/Media/Epstein Files/epstein-archive" && npx tsc --noEmit --strict /tmp/ds-smoke.ts --moduleResolution bundler --jsx react-jsx --esModuleInterop 2>&1 | head -20
```

Expected: if there are path resolution errors from the temp file location, that's fine — what matters is no _type_ errors about missing exports.

- [ ] **Step 4: Verify index.css line count reduced**

```bash
wc -l src/client/index.css
```

Expected: fewer than 1100 lines (down from 1276 before the .media-browser-\* removal).

- [ ] **Step 5: Smoke test — start dev server and verify app loads**

```bash
pnpm dev &
sleep 8
curl -s http://localhost:3002 | grep -c "<div" && kill %1
```

Expected: returns a positive number (HTML loaded) with no crash.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore(design-system): Wave 0 complete — foundation layer established

- CVA variants utility + Radix glue in lib/
- Tabs and Select components (Radix wrappers)
- Badge extended with riskLevel, navCategory, count props
- Typed hex constants for risk/nav/accent colours
- patterns/: MediaBrowser, Toolbar, FilterBar, StatusBanner
- Hex-value ESLint warning rule scoped to design-system/
- .media-browser-* CSS removed from index.css
- nav/risk semantic colour aliases added to Tailwind config
- Boundary check confirmed: design-system → components/ blocked"
```
