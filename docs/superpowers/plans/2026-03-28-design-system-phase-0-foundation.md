# Design System Phase 0 — Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the CSS Module migration pattern by fixing the primary design-system primitive (`Button`) and migrating three proof components, with an enforced CI gate that prevents regression.

**Architecture:** Design-system primitives use regular imported CSS with semantic class names and data-attribute variant selectors. Application components use `*.module.css` for scoping. No Tailwind utility strings anywhere in migrated files. No `!important`. No utility class reconstruction in `index.css`.

**Starting position:** `tailwindcss` is already absent from `package.json` — its class strings in components are dead code producing zero CSS output. `tailwind-merge` remains as the `cn()` utility backbone and stays for now. The token system (CSS custom properties) in `index.css` is complete and correct.

**Tech Stack:** Vite CSS Modules (native, zero config), CSS custom properties, `clsx` + `tailwind-merge` (cn utility — tailwind-merge stays until final cleanup phase), TypeScript.

---

## File Map

**Create:**

- `src/client/design-system/components/Button.css` — primary design-system primitive, replaces Tailwind strings in Button.tsx
- `src/client/components/common/CloseButton.module.css` — proof component 1
- `src/client/components/common/ProgressBar.module.css` — proof component 2
- `src/client/components/common/SourceBadge.module.css` — proof component 3

**Modify:**

- `src/client/design-system/components/Button.tsx` — import Button.css, reduce className to `cn('ds-btn', className)`
- `src/client/components/common/CloseButton.tsx` — import module, replace cn() strings
- `src/client/components/common/ProgressBar.tsx` — import module, replace cn() strings
- `src/client/components/common/SourceBadge.tsx` — import module, delete sourceBadgeTokens + spacingTokens usage
- `src/client/design-system/tokens/colors.ts` — delete `sourceBadgeTokens` and `spacingTokens` (Tailwind-string token anti-patterns)
- `scripts/check_design_token_usage.ts` — add `moduleClassPattern` gate for governed files

---

## Task 1: Create `Button.css` and update `Button.tsx`

Button is the most-used design-system primitive. It currently outputs a long Tailwind string for base layout/focus/disabled states, plus per-variant and per-size Tailwind strings. None of these produce any CSS. The `.control` class from `index.css` is also referenced — that class stays in `index.css` as a shim for now; Button.css supersedes it for the Button component itself.

**Files:**

- Create: `src/client/design-system/components/Button.css`
- Modify: `src/client/design-system/components/Button.tsx`

- [ ] **Step 1: Create `Button.css`**

```css
/* src/client/design-system/components/Button.css */

.ds-btn {
  /* Layout */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  white-space: nowrap;
  flex-shrink: 0;
  padding-inline: var(--control-padding-inline);

  /* Typography */
  font-family: inherit;
  font-weight: var(--weight-medium);
  font-size: var(--type-small);

  /* Interactive */
  cursor: pointer;
  user-select: none;

  /* Glass surface */
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(148, 163, 184, 0.012)),
    color-mix(in srgb, var(--glass-bg) 94%, transparent);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, transparent);
  border-radius: var(--radius-md);
  box-shadow: var(--glass-shadow-soft);
  transition:
    background-color var(--duration-fast) var(--easing-swift),
    border-color var(--duration-fast) var(--easing-swift),
    box-shadow var(--duration-fast) var(--easing-swift),
    transform var(--duration-fast) var(--easing-swift),
    color var(--duration-fast) var(--easing-swift),
    filter var(--duration-fast) var(--easing-swift);
  will-change: background-color, border-color;
}

.ds-btn:hover:not(:disabled) {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(148, 163, 184, 0.018)),
    color-mix(in srgb, var(--glass-bg-strong) 95%, transparent);
  border-color: color-mix(in srgb, var(--glass-border-highlight) 78%, transparent);
  transform: translateY(-1px);
  box-shadow: var(--glass-shadow);
}

.ds-btn:active:not(:disabled) {
  box-shadow: var(--glass-shadow-soft);
  transform: translateY(0);
}

.ds-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 80%, #fff 20%);
  outline-offset: 2px;
}

.ds-btn:disabled {
  pointer-events: none;
  opacity: 0.5;
}

/* --- Size variants --- */

.ds-btn[data-size='sm'] {
  min-height: var(--control-height-compact);
  font-size: var(--type-small);
}

.ds-btn[data-size='md'] {
  min-height: var(--control-height);
  font-size: var(--type-small);
}

.ds-btn[data-size='lg'] {
  min-height: calc(var(--control-height) + 4px);
  font-size: var(--type-body);
}

/* --- Semantic variants --- */

.ds-btn[data-variant='primary'] {
  background: var(--accent);
  color: var(--bg-dark);
  border-color: transparent;
  box-shadow: var(--glass-shadow);
}

.ds-btn[data-variant='primary']:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
  background: var(--accent);
}

.ds-btn[data-variant='secondary'] {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--glass-bg) 70%, transparent);
}

.ds-btn[data-variant='secondary']:hover:not(:disabled) {
  color: var(--text-primary);
  background: var(--glass-bg-strong);
}

.ds-btn[data-variant='danger'] {
  border-color: color-mix(in srgb, var(--accent-danger) 30%, transparent);
  background: color-mix(in srgb, var(--accent-danger) 16%, transparent);
  color: color-mix(in srgb, var(--accent-danger) 30%, #fff 70%);
}

.ds-btn[data-variant='danger']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-danger) 24%, transparent);
  border-color: color-mix(in srgb, var(--accent-danger) 40%, transparent);
}

.ds-btn[data-variant='ghost'] {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--text-secondary);
}

.ds-btn[data-variant='ghost']:hover:not(:disabled) {
  background: var(--glass-bg-strong);
  color: var(--text-primary);
  box-shadow: none;
}
```

- [ ] **Step 2: Update `Button.tsx` to import the CSS and shed Tailwind strings**

The `data-variant` and `data-size` attributes are already set on the element — the CSS uses attribute selectors, so Button.tsx only needs to apply the single base class.

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../lib';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, variant = 'primary', size = 'md', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn('ds-btn', className)}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
```

- [ ] **Step 3: Verify TypeScript is clean**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors (same as before — Button.tsx change is type-safe).

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/design-system/components/Button.css src/client/design-system/components/Button.tsx
git commit -m "design-system: create Button.css and remove Tailwind strings from Button"
```

---

## Task 2: Migrate `CloseButton` to CSS Module

CloseButton uses `cn()` to compose Tailwind layout, surface, color, focus, and size classes — all currently dead. This migration replaces all of them with a `CloseButton.module.css` sidecar.

**Files:**

- Create: `src/client/components/common/CloseButton.module.css`
- Modify: `src/client/components/common/CloseButton.tsx`

- [ ] **Step 1: Create `CloseButton.module.css`**

```css
/* src/client/components/common/CloseButton.module.css */

.root {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
  border-radius: 9999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-strong);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--easing-swift),
    color var(--duration-fast) var(--easing-swift);
}

.root:hover {
  background: var(--glass-bg-highlight);
  color: var(--text-primary);
}

.root:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-surface),
    0 0 0 4px var(--accent);
}

/* Size variants */
.sm {
  width: 2rem;
  height: 2rem;
}
.md {
  width: 2.5rem;
  height: 2.5rem;
}
.lg {
  width: 3rem;
  height: 3rem;
}

/* Icon sizing (applied to the SVG wrapper) */
.icon {
  display: block;
  flex-shrink: 0;
}
.iconSm {
  width: 1rem;
  height: 1rem;
}
.iconMd {
  width: 1.25rem;
  height: 1.25rem;
}
.iconLg {
  width: 1.5rem;
  height: 1.5rem;
}
```

- [ ] **Step 2: Update `CloseButton.tsx`**

```tsx
import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import s from './CloseButton.module.css';

type CloseButtonSize = 'sm' | 'md' | 'lg';

interface CloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: CloseButtonSize;
  label?: string;
}

const sizeMap: Record<CloseButtonSize, string> = {
  sm: s.sm,
  md: s.md,
  lg: s.lg,
};

const iconSizeMap: Record<CloseButtonSize, string> = {
  sm: s.iconSm,
  md: s.iconMd,
  lg: s.iconLg,
};

export const CloseButton: React.FC<CloseButtonProps> = ({
  size = 'md',
  label = 'Close',
  className,
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(s.root, sizeMap[size], className)}
      {...rest}
    >
      <X className={cn(s.icon, iconSizeMap[size])} />
    </button>
  );
};

export default CloseButton;
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/components/common/CloseButton.module.css src/client/components/common/CloseButton.tsx
git commit -m "design-system: migrate CloseButton to CSS module"
```

---

## Task 3: Migrate `ProgressBar` to CSS Module

ProgressBar uses Tailwind strings for layout, sizing, and color variants. It also uses `bg-accent-secondary` (a non-existent Tailwind class — the token is `--accent-secondary`). The module replaces all of this with explicit CSS rules.

**Files:**

- Create: `src/client/components/common/ProgressBar.module.css`
- Modify: `src/client/components/common/ProgressBar.tsx`

- [ ] **Step 1: Create `ProgressBar.module.css`**

```css
/* src/client/components/common/ProgressBar.module.css */

.root {
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);
}

.label {
  font-size: var(--type-small);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
}

.percentage {
  font-size: var(--type-small);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
}

.track {
  width: 100%;
  background: var(--glass-bg-strong);
  border-radius: 9999px;
  overflow: hidden;
}

.trackSm {
  height: 0.5rem;
}
.trackMd {
  height: 0.75rem;
}
.trackLg {
  height: 1rem;
}

.fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 300ms ease-out;
}

.fillPrimary {
  background: var(--accent);
}
.fillSecondary {
  background: var(--accent-secondary);
}
.fillSuccess {
  background: var(--accent-success);
}
.fillWarning {
  background: var(--accent-warning);
}
.fillDanger {
  background: var(--accent-danger);
}
```

- [ ] **Step 2: Update `ProgressBar.tsx`**

```tsx
import React from 'react';
import s from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const trackSizeMap = {
  sm: s.trackSm,
  md: s.trackMd,
  lg: s.trackLg,
} as const;

const fillColorMap = {
  primary: s.fillPrimary,
  secondary: s.fillSecondary,
  success: s.fillSuccess,
  warning: s.fillWarning,
  danger: s.fillDanger,
} as const;

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`${s.root} ${className}`}>
      {label && (
        <div className={s.header}>
          <span className={s.label}>{label}</span>
          {showPercentage && <span className={s.percentage}>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        className={`${s.track} ${trackSizeMap[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div className={`${s.fill} ${fillColorMap[color]}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default ProgressBar;
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/components/common/ProgressBar.module.css src/client/components/common/ProgressBar.tsx
git commit -m "design-system: migrate ProgressBar to CSS module"
```

---

## Task 4: Migrate `SourceBadge` and fix the Tailwind-string token anti-pattern

`SourceBadge` reveals a deeper problem: `sourceBadgeTokens` and `spacingTokens` in `colors.ts` export Tailwind class strings as "design tokens." These strings (e.g. `'bg-[var(--source-black-book-bg)] border-[var(--source-black-book-border)] ...'`) produce zero output since Tailwind is gone. This task migrates SourceBadge to a CSS module AND deletes the token objects that export Tailwind strings.

**Files:**

- Create: `src/client/components/common/SourceBadge.module.css`
- Modify: `src/client/components/common/SourceBadge.tsx`
- Modify: `src/client/design-system/tokens/colors.ts`

- [ ] **Step 1: Audit what uses `sourceBadgeTokens` and `spacingTokens`**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
grep -r "sourceBadgeTokens\|spacingTokens" src/client --include="*.tsx" --include="*.ts" -l
```

If any file besides `SourceBadge.tsx` uses `sourceBadgeTokens`, note it — those files need the same treatment before the token object can be deleted. (Most likely only `SourceBadge.tsx` uses it.)

- [ ] **Step 2: Create `SourceBadge.module.css`**

The source badge CSS vars are already defined in `index.css` `:root`. The module references them directly.

```css
/* src/client/components/common/SourceBadge.module.css */

.root {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) calc(var(--space-2) + 2px);
  border-radius: 9999px;
  font-size: var(--type-small);
  font-weight: var(--weight-medium);
  border: 1px solid transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.blackBook {
  background: var(--source-black-book-bg);
  border-color: var(--source-black-book-border);
  color: var(--source-black-book-text);
  box-shadow: var(--source-black-book-shadow);
}

.seventhProduction {
  background: var(--source-seventh-bg);
  border-color: var(--source-seventh-border);
  color: var(--source-seventh-text);
  box-shadow: var(--source-seventh-shadow);
}

.publicRecord {
  background: var(--source-public-bg);
  border-color: var(--source-public-border);
  color: var(--source-public-text);
  box-shadow: var(--source-public-shadow);
}

.fallback {
  background: color-mix(in srgb, var(--glass-bg) 60%, transparent);
  border-color: var(--glass-border);
  color: var(--text-muted);
}
```

- [ ] **Step 3: Update `SourceBadge.tsx`**

```tsx
import React from 'react';
import s from './SourceBadge.module.css';

interface SourceBadgeProps {
  source: 'Seventh Production' | 'Black Book' | 'Public Record' | string;
  className?: string;
}

function getVariantClass(source: string): string {
  switch (source) {
    case 'Black Book':
      return s.blackBook;
    case 'Seventh Production':
      return s.seventhProduction;
    case 'Public Record':
      return s.publicRecord;
    default:
      return s.fallback;
  }
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className = '' }) => {
  return <span className={`${s.root} ${getVariantClass(source)} ${className}`}>{source}</span>;
};
```

- [ ] **Step 4: Delete `sourceBadgeTokens` and `spacingTokens` from `colors.ts`**

These exported Tailwind class strings. Remove them entirely. The CSS vars they referenced still exist in `index.css` `:root` — the tokens are fine, just the Tailwind-string wrappers are wrong.

```ts
// src/client/design-system/tokens/colors.ts
// Delete the sourceBadgeTokens and spacingTokens exports entirely.
// Final file:

export const hexTokens = {
  accent: '#d4a84b',
  accentGlow: 'rgba(212, 168, 75, 0.35)',
  bgDark: '#0a0a0b',
  bgSurface: '#111114',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  riskCritical: '#c0392b',
  riskHigh: '#c0392b',
  riskMedium: '#b8860b',
  riskLow: '#2e7d5a',
  riskMinimal: '#2e7d5a',
  riskUnknown: '#6b7280',
  navDocuments: '#34d399',
  navEmails: '#fbbf24',
  navMedia: '#a78bfa',
  navPeople: '#60a5fa',
  navProperties: '#f97316',
  navBlackbook: '#f472b6',
  navInvestigations: '#ec4899',
} as const;

export const colorTokens = {
  accent: 'var(--accent)',
  accentSecondary: 'var(--accent-secondary)',
  accentSuccess: 'var(--accent-success)',
  accentWarning: 'var(--accent-warning)',
  accentDanger: 'var(--accent-danger)',
  accentInfo: 'var(--accent-info)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  textDisabled: 'var(--text-disabled)',
  bgPage: 'var(--bg-dark)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',
  glassBg: 'var(--glass-bg)',
  glassBgStrong: 'var(--glass-bg-strong)',
  glassBorder: 'var(--glass-border)',
  glassBorderHighlight: 'var(--glass-border-highlight)',
} as const;

export const semanticTokens = {
  required: 'text-[var(--accent-danger)]',
  errorText: 'text-[var(--accent-danger)]',
  errorBorder:
    'border-[var(--accent-danger)] focus:border-[var(--accent-danger)] focus:ring-[var(--accent-danger)]/20',
  fieldLabel: 'text-[var(--text-secondary)]',
  helperText: 'text-[var(--text-muted)]',
} as const;

export const semanticToneClasses = {
  accent: 'tone-accent',
  success: 'tone-success',
  warning: 'tone-warning',
  danger: 'tone-danger',
  info: 'tone-info',
  muted: 'tone-muted',
} as const;
```

Note: `semanticTokens` still exports Tailwind strings — those will be cleaned up when the components that use them (`FormField`, `Select`) are migrated in a later phase. Don't touch them now.

- [ ] **Step 5: Verify TypeScript**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

If `spacingTokens` is imported anywhere else, TypeScript will error here. Fix those imports by removing them (the components using `spacingTokens` for Tailwind class strings are already broken — they'll be migrated in later phases, for now just remove the import).

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/components/common/SourceBadge.module.css \
        src/client/components/common/SourceBadge.tsx \
        src/client/design-system/tokens/colors.ts
git commit -m "design-system: migrate SourceBadge to CSS module, delete Tailwind-string token exports"
```

---

## Task 5: Add CSS Module enforcement to the CI gate

The `check_design_token_usage.ts` script currently detects hardcoded palette Tailwind classes and arbitrary px/rem utilities. Extend it to enforce that **governed** (already-migrated) files contain no Tailwind layout utility strings in their `className` attributes.

**Files:**

- Modify: `scripts/check_design_token_usage.ts`

The gate uses a ratchet baseline: only files explicitly in the `moduleGoverned` set are checked. This prevents the gate from failing on unmigrated files while still enforcing progress on migrated ones.

- [ ] **Step 1: Add `moduleGoverned` set and Tailwind-string pattern to `check_design_token_usage.ts`**

Add the following block **immediately after the `enforcedFiles` array** (around line 38) and the check **inside the main `for` loop**:

```ts
// Files that have been migrated to CSS modules.
// Once a file is added here, it MUST NOT contain Tailwind utility strings in className.
const moduleGovernedFiles = new Set(
  [
    'src/client/design-system/components/Button.tsx',
    'src/client/components/common/CloseButton.tsx',
    'src/client/components/common/ProgressBar.tsx',
    'src/client/components/common/SourceBadge.tsx',
  ].map((f) => path.join(rootDir, f)),
);

// Matches Tailwind layout/sizing/typography utility class patterns inside className strings.
// These produce zero CSS output now that tailwindcss is removed.
const tailwindUtilityPattern =
  /className=[`"'][^`"']*\b(?:flex|grid|items-|justify-|gap-|p-\d|px-|py-|pt-|pb-|m-\d|mx-|my-|mt-|mb-|ml-|mr-|w-\d|h-\d|text-(?:xs|sm|base|lg|xl)|font-(?:medium|bold|semibold|mono)|rounded(?:-|$)|border(?:-b|-t|-l|-r)?$|overflow-|absolute|relative|hidden|block|inline)/;
```

Then add this check **inside the `for (const filePath of walk(clientDir))` loop**, after the existing checks:

```ts
if (moduleGovernedFiles.has(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (tailwindUtilityPattern.test(content)) {
    violations.push(
      `${path.relative(rootDir, filePath)} — CSS module governed file contains Tailwind utility strings`,
    );
  }
}
```

- [ ] **Step 2: Verify the gate passes on the current state**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx tsx scripts/check_design_token_usage.ts
```

Expected output ends with `[design-token-usage] OK`.

- [ ] **Step 3: Verify the gate catches a regression (then revert)**

Temporarily add a Tailwind class to `CloseButton.tsx`:

```tsx
// Temporarily add to root className:
className={cn(s.root, sizeMap[size], 'flex', className)}
```

Run again:

```bash
npx tsx scripts/check_design_token_usage.ts
```

Expected: fails with message about `CloseButton.tsx — CSS module governed file contains Tailwind utility strings`.

Revert the temporary change before committing.

- [ ] **Step 4: Commit the CI gate**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add scripts/check_design_token_usage.ts
git commit -m "ci: add CSS module governance gate to design token check"
```

---

## Task 6: Final verification

- [ ] **Step 1: Full type check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 2: Lint**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm lint
```

Expected: 0 errors. Fix any lint issues before continuing.

- [ ] **Step 3: Run design token gate**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
npx tsx scripts/check_design_token_usage.ts
```

Expected: `[design-token-usage] OK`

- [ ] **Step 4: Visual smoke — start dev server and inspect 3 migrated components**

```bash
# Terminal 1
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm server

# Terminal 2
pnpm dev
```

Open http://localhost:3002. Check:

- Any modal or dialog → CloseButton (`×`) should render as a rounded button, correctly sized, hover state changes color
- Any evidence or document page → ProgressBar should show bars with correct sizing
- Any evidence result card → SourceBadge should show colored pills matching source type (purple for Black Book, cyan for Seventh Production, green for Public Record)

If any of these look broken, the CSS vars are correct in `index.css` — check that the module file was saved and the import path is right.

- [ ] **Step 5: Playwright smoke tests**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
pnpm test:smoke
```

Expected: all passing (same as before this branch — no functional change).

---

## Reference: The CSS Module pattern

Every subsequent component migration in Phases 1–4 follows exactly this pattern:

```
1. Create ComponentName.module.css next to ComponentName.tsx
2. Map each Tailwind class string to a semantic CSS rule using var(--token) values
3. Replace className={cn('tailwind classes', ...)} with className={cn(s.root, s.variant, className)}
4. No !important anywhere
5. No hardcoded hex/px values — only var(--token) references
6. pnpm type-check → 0 errors
7. Add component to moduleGovernedFiles in check_design_token_usage.ts
8. Commit
```

The naming convention for CSS module classes:

- `.root` — the outermost element
- `.header`, `.body`, `.footer` — structural sections
- `.label`, `.value`, `.icon`, `.badge` — semantic leaf elements
- `.sm`, `.md`, `.lg` — size variants (applied alongside `.root`)
- `.primary`, `.secondary`, `.danger` — semantic tone variants

Never name a class after its visual output (`.rounded`, `.blue`, `.bold`). Name it after its semantic role.
