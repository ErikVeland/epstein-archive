# Design System Phase 1 — Common Components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate five more `components/common/` components to CSS Modules, eliminating the last `designSystem.ts` token consumers so that file can be deleted entirely, then extend the CI ratchet to guard all nine governed files.

**Architecture:** Each component gets a `*.module.css` beside its `.tsx` file. Global semantic classes (`surface-glass-card`, `glass-panel`, etc.) defined in `index.css` are kept as-is — they are not Tailwind utilities; they are design-system tokens expressed as CSS class names. Only Tailwind layout/typography/state utility strings in `className` props are replaced with CSS module rules. `spacingTokens` and `semanticTokens` in `designSystem.ts` are the last Tailwind-string-as-token anti-patterns; once their three consumers are migrated, the file is deleted. No `!important`. All values from `var(--token)` or explicit CSS values for Tailwind defaults that lack a CSS custom property.

**Tech Stack:** Vite CSS Modules (native), CSS custom properties, Tailwind v3 still active (we are migrating away from it incrementally — CSS Modules files are not processed by Tailwind's utility scanner, so animations and layout must be written as real CSS).

**Starting position:** Phase 0 complete. Four files already in `moduleGovernedFiles`: Button.tsx, CloseButton.tsx, ProgressBar.tsx, SourceBadge.tsx. `designSystem.ts` still exports `spacingTokens` (6 entries) and `semanticTokens` (5 entries), consumed by Card.tsx, FormField.tsx, and Select.tsx.

---

## File Map

**Create:**

- `src/client/components/common/Skeleton.module.css` — pulse animation, border-radius, background
- `src/client/components/common/LoadingIndicator.module.css` — fixed pill, spinner, label, spin keyframe
- `src/client/components/common/Card.module.css` — layout, padding, active scale, clickable hover, header/content/metadata/actions structure, fadeIn keyframe
- `src/client/components/common/FormField.module.css` — field gap, label, required marker, helper/error text
- `src/client/components/common/Select.module.css` — container, label, select element, chevron, error

**Modify:**

- `src/client/components/common/Skeleton.tsx` — import module, replace `cn()` string
- `src/client/components/common/LoadingIndicator.tsx` — import module, replace className strings
- `src/client/components/common/Card.tsx` — import module, replace all Tailwind strings and `spacingTokens` references
- `src/client/components/common/FormField.tsx` — import module, replace all `semanticTokens`/`spacingTokens` references
- `src/client/components/common/Select.tsx` — import module, replace all `semanticTokens` references and Tailwind strings
- `src/client/styles/designSystem.ts` — **delete the file** (all consumers gone after Tasks 3–5)
- `scripts/check_design_token_usage.ts` — extend `moduleGovernedFiles` with 5 new paths

---

## Task 1: Skeleton

**Files:**

- Create: `src/client/components/common/Skeleton.module.css`
- Modify: `src/client/components/common/Skeleton.tsx`

Current Skeleton.tsx:

```tsx
import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[var(--glass-bg-highlight)]', className)}
      {...props}
    />
  );
}
```

- [ ] **Step 1: Create `Skeleton.module.css`**

```css
/* src/client/components/common/Skeleton.module.css */

.root {
  border-radius: var(--radius-md);
  background: var(--glass-bg-highlight);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

- [ ] **Step 2: Update `Skeleton.tsx`**

```tsx
import React from 'react';
import { cn } from '../../utils/cn';
import s from './Skeleton.module.css';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn(s.root, className)} {...props} />;
}
```

- [ ] **Step 3: Verify type-check passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/components/common/Skeleton.module.css src/client/components/common/Skeleton.tsx
git commit -m "feat(design-system): migrate Skeleton to CSS module"
```

---

## Task 2: LoadingIndicator

**Files:**

- Create: `src/client/components/common/LoadingIndicator.module.css`
- Modify: `src/client/components/common/LoadingIndicator.tsx`

Current LoadingIndicator.tsx renders a fixed pill in the top-right corner with a spinner and optional label. All styling is inline Tailwind + arbitrary var() classes.

- [ ] **Step 1: Create `LoadingIndicator.module.css`**

```css
/* src/client/components/common/LoadingIndicator.module.css */

.root {
  position: fixed;
  top: var(--space-3);
  right: var(--space-3);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: 9999px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.spinner {
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--accent);
  border-top-color: transparent;
  border-radius: 9999px;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

.label {
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--text-secondary);
  max-width: 6.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 2: Update `LoadingIndicator.tsx`**

```tsx
import React from 'react';
import s from './LoadingIndicator.module.css';

interface LoadingIndicatorProps {
  isLoading: boolean;
  label?: string;
}

/**
 * A single subtle loading indicator that shows in the top-right corner.
 * Only renders when isLoading is true.
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ isLoading, label }) => {
  if (!isLoading) return null;

  return (
    <div className={s.root}>
      <div className={s.spinner} />
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
};

export default LoadingIndicator;
```

- [ ] **Step 3: Verify type-check passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/components/common/LoadingIndicator.module.css src/client/components/common/LoadingIndicator.tsx
git commit -m "feat(design-system): migrate LoadingIndicator to CSS module"
```

---

## Task 3: Card

Card is the most complex component in Phase 1. It uses:

- `surface-glass-card` (semantic global class — keep it)
- `spacingTokens.cardPadding` → `p-[var(--space-6)]` → `padding: var(--space-6)`
- `spacingTokens.cardSectionGap` → `space-y-[var(--space-5)]` → flex column with gap
- Conditional clickable state with `group` + `group-hover:` → CSS Module `.clickable` + `:hover .title`
- `active:scale-[0.99]` → `:active { transform: scale(0.99); }`
- `animate-fade-in` → `@keyframes fadeIn` defined in module

**Files:**

- Create: `src/client/components/common/Card.module.css`
- Modify: `src/client/components/common/Card.tsx`

- [ ] **Step 1: Create `Card.module.css`**

```css
/* src/client/components/common/Card.module.css */

/* Root — padding + active + fade-in animation.
   glass surface styles come from the global surface-glass-card class. */
.root {
  padding: var(--space-6);
  animation: fadeIn var(--duration-normal) var(--easing-swift);
  transition: all var(--duration-normal) var(--easing-liquid);
}

.root:active {
  transform: scale(0.99);
}

.clickable {
  cursor: pointer;
}

/* Header row */
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-5);
  gap: var(--space-4);
}

.headerLeft {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  overflow: hidden;
  min-width: 0;
}

.iconWrapper {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.textBlock {
  min-width: 0;
}

.title {
  font-size: 1.125rem;
  line-height: 1.25;
  font-weight: 700;
  color: var(--text-primary);
  transition: color var(--duration-fast) var(--easing-swift);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

/* Hover title colour only applies on clickable cards */
.clickable:hover .title {
  color: var(--accent);
}

.subtitle {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 0.375rem;
  font-weight: 500;
}

.headerRight {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* Content area — acts as a flex column to replace space-y */
.content {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Metadata section */
.metadata {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--glass-border);
}

.metadataList {
  display: flex;
  flex-wrap: wrap;
  row-gap: var(--space-2);
  column-gap: var(--space-4);
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--text-secondary);
}

.metadataItem {
  display: flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  background: var(--glass-bg-strong);
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
}

.metaIconWrapper {
  margin-right: 0.375rem;
  color: var(--text-muted);
}

.metaLabel {
  font-weight: 500;
  color: var(--text-muted);
  margin-right: 0.25rem;
}

.metaValue {
  color: var(--text-secondary);
  font-weight: 600;
}

/* Action buttons row */
.actions {
  margin-top: var(--space-5);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: var(--space-2);
  gap: var(--space-2);
}

.actionBtn {
  font-size: 0.75rem;
  font-weight: 500;
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-lg);
  transition: all var(--duration-fast) var(--easing-swift);
  border: 1px solid transparent;
  cursor: pointer;
}

.actionBtn[data-variant='primary'] {
  background: var(--accent);
  color: var(--text-primary);
  box-shadow: var(--glass-shadow);
}

.actionBtn[data-variant='primary']:hover {
  filter: brightness(1.1);
}

.actionBtn[data-variant='secondary'] {
  color: var(--text-secondary);
  background: transparent;
}

.actionBtn[data-variant='secondary']:hover {
  color: var(--text-primary);
  background: var(--glass-bg-strong);
  border-color: var(--glass-border);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

- [ ] **Step 2: Update `Card.tsx`**

```tsx
import React from 'react';
import { cn } from '../../utils/cn';
import Icon, { IconName } from './Icon';
import { RedFlagIndex } from '../visualizations/RedFlagIndex';
import s from './Card.module.css';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'white'
    | 'gray';
  redFlagRating?: number;
  metadata?: Array<{
    label: string;
    value: string | number;
    icon?: IconName;
  }>;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  title,
  subtitle,
  icon,
  iconColor = 'gray',
  redFlagRating,
  metadata = [],
  actionButtons = [],
}) => {
  return (
    <div
      onClick={onClick}
      className={cn('surface-glass-card', s.root, onClick && s.clickable, className)}
    >
      {/* Header section with title, subtitle, and icon */}
      {(title || subtitle || icon || redFlagRating !== undefined) && (
        <div className={s.header}>
          <div className={s.headerLeft}>
            {icon && (
              <div className={s.iconWrapper}>
                <Icon name={icon} size="md" color={iconColor} />
              </div>
            )}
            <div className={s.textBlock}>
              {title && (
                <h3 className={s.title} title={title}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={s.subtitle} title={subtitle}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {redFlagRating !== undefined && (
            <div className={s.headerRight}>
              <RedFlagIndex
                value={redFlagRating}
                size="sm"
                showLabel={false}
                variant="combined"
                showTextLabel={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className={s.content}>{children}</div>

      {/* Metadata section */}
      {metadata.length > 0 && (
        <div className={s.metadata}>
          <div className={s.metadataList}>
            {metadata.map((item, index) => (
              <div key={index} className={s.metadataItem}>
                {item.icon && (
                  <span className={s.metaIconWrapper}>
                    <Icon name={item.icon} size="xs" />
                  </span>
                )}
                <span className={s.metaLabel}>{item.label}:</span>
                <span className={s.metaValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {actionButtons.length > 0 && (
        <div className={s.actions}>
          {actionButtons.map((button, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                button.onClick();
              }}
              className={s.actionBtn}
              data-variant={button.variant ?? 'secondary'}
            >
              {button.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Verify type-check passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/components/common/Card.module.css src/client/components/common/Card.tsx
git commit -m "feat(design-system): migrate Card to CSS module"
```

---

## Task 4: FormField

FormField uses `semanticTokens` (fieldLabel, required, helperText, errorText) and `spacingTokens` (fieldGap, labelGap, helperGap) — all Tailwind-string-as-token anti-patterns.

**Files:**

- Create: `src/client/components/common/FormField.module.css`
- Modify: `src/client/components/common/FormField.tsx`

Current `designSystem.ts` values being replaced:

- `spacingTokens.fieldGap` = `'mb-[var(--space-4)]'` → `margin-bottom: var(--space-4)`
- `spacingTokens.labelGap` = `'mb-[var(--space-2)]'` → `margin-bottom: var(--space-2)`
- `spacingTokens.helperGap` = `'mt-[var(--space-1)]'` → `margin-top: var(--space-1)`
- `semanticTokens.fieldLabel` = `'text-[var(--text-secondary)]'` → `color: var(--text-secondary)`
- `semanticTokens.required` = `'text-[var(--accent-danger)]'` → `color: var(--accent-danger)`
- `semanticTokens.helperText` = `'text-[var(--text-muted)]'` → `color: var(--text-muted)`
- `semanticTokens.errorText` = `'text-[var(--accent-danger)]'` → `color: var(--accent-danger)`

- [ ] **Step 1: Create `FormField.module.css`**

```css
/* src/client/components/common/FormField.module.css */

.root {
  margin-bottom: var(--space-4);
}

.label {
  display: block;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.required {
  color: var(--accent-danger);
  margin-left: var(--space-1);
}

.helper {
  margin-top: var(--space-1);
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--text-muted);
}

.error {
  margin-top: var(--space-1);
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--accent-danger);
}
```

- [ ] **Step 2: Update `FormField.tsx`**

```tsx
import React from 'react';
import s from './FormField.module.css';
import { cn } from '../../utils/cn';

interface FormFieldProps {
  label: React.ReactNode;
  id: string;
  children: React.ReactNode;
  error?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  children,
  error,
  helpText,
  required = false,
  className = '',
}) => {
  return (
    <div className={cn(s.root, className)}>
      <label htmlFor={id} className={s.label}>
        {label}
        {required && <span className={s.required}>*</span>}
      </label>
      {children}
      {helpText && (
        <p className={s.helper} id={`${id}-description`}>
          {helpText}
        </p>
      )}
      {error && (
        <p className={s.error} id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
```

- [ ] **Step 3: Verify type-check passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/components/common/FormField.module.css src/client/components/common/FormField.tsx
git commit -m "feat(design-system): migrate FormField to CSS module"
```

---

## Task 5: Select

Select uses `semanticTokens.errorBorder` and `semanticTokens.errorText`. It also has a complex Tailwind string on the `<select>` element. The chevron icon uses inline positioning.

**Files:**

- Create: `src/client/components/common/Select.module.css`
- Modify: `src/client/components/common/Select.tsx`

Current `designSystem.ts` values being replaced:

- `semanticTokens.errorBorder` = `'border-[var(--accent-danger)] focus:border-[var(--accent-danger)] focus:ring-[var(--accent-danger)]/20'`
- `semanticTokens.errorText` = `'text-[var(--accent-danger)]'`

- [ ] **Step 1: Create `Select.module.css`**

```css
/* src/client/components/common/Select.module.css */

.root {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.label {
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: 0.25rem;
}

.wrapper {
  position: relative;
}

.select {
  width: 100%;
  appearance: none;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.25rem;
  border-radius: var(--radius-md);
  padding: 0.625rem var(--space-3);
  padding-right: 2.5rem;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--easing-swift),
    border-color var(--duration-fast) var(--easing-swift);
}

.select:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 50%, transparent);
  border-color: var(--accent);
}

.select:hover {
  background: var(--glass-bg-strong);
  border-color: var(--glass-border-highlight);
}

.select.hasError {
  border-color: var(--accent-danger);
}

.select.hasError:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-danger) 20%, transparent);
  border-color: var(--accent-danger);
}

.select option {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.chevron {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-muted);
  transition: color var(--duration-fast) var(--easing-swift);
  display: flex;
  align-items: center;
}

.wrapper:hover .chevron {
  color: var(--accent);
}

.errorText {
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--accent-danger);
  margin-left: 0.25rem;
}
```

- [ ] **Step 2: Update `Select.tsx`**

```tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import s from './Select.module.css';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  containerClassName = '',
  className = '',
  ...props
}) => {
  return (
    <div className={cn(s.root, containerClassName)}>
      {label && <label className={s.label}>{label}</label>}
      <div className={s.wrapper}>
        <select className={cn(s.select, error && s.hasError, className)} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={s.chevron}>
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </div>
      {error && <span className={s.errorText}>{error}</span>}
    </div>
  );
};
```

- [ ] **Step 3: Verify type-check passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add src/client/components/common/Select.module.css src/client/components/common/Select.tsx
git commit -m "feat(design-system): migrate Select to CSS module"
```

---

## Task 6: Delete `designSystem.ts`

All three consumers (Card, FormField, Select) are now migrated. `designSystem.ts` has no remaining imports. Delete it.

**Files:**

- Delete: `src/client/styles/designSystem.ts`

- [ ] **Step 1: Confirm zero imports remain**

```bash
grep -rn "from.*styles/designSystem\|from.*designSystem" \
  "/Volumes/Media/Epstein Files/epstein-archive/src/client" \
  --include="*.tsx" --include="*.ts"
```

Expected: no output (zero matches).

- [ ] **Step 2: Delete the file**

```bash
rm "/Volumes/Media/Epstein Files/epstein-archive/src/client/styles/designSystem.ts"
```

- [ ] **Step 3: Verify type-check still passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add -u src/client/styles/designSystem.ts
git commit -m "chore(design-system): delete designSystem.ts (all consumers migrated)"
```

---

## Task 7: Extend CI Ratchet

Add the five new CSS-module-governed files to `moduleGovernedFiles` in `check_design_token_usage.ts`.

**Files:**

- Modify: `scripts/check_design_token_usage.ts`

- [ ] **Step 1: Update `moduleGovernedFiles`**

Find the existing `moduleGovernedFiles` set (lines 43–51 in `scripts/check_design_token_usage.ts`):

```ts
const moduleGovernedFiles = new Set(
  [
    'src/client/design-system/components/Button.tsx',
    'src/client/components/common/CloseButton.tsx',
    'src/client/components/common/ProgressBar.tsx',
    'src/client/components/common/SourceBadge.tsx',
  ].map((f) => path.join(rootDir, f)),
);
```

Replace with:

```ts
const moduleGovernedFiles = new Set(
  [
    'src/client/design-system/components/Button.tsx',
    'src/client/components/common/CloseButton.tsx',
    'src/client/components/common/ProgressBar.tsx',
    'src/client/components/common/SourceBadge.tsx',
    'src/client/components/common/Skeleton.tsx',
    'src/client/components/common/LoadingIndicator.tsx',
    'src/client/components/common/Card.tsx',
    'src/client/components/common/FormField.tsx',
    'src/client/components/common/Select.tsx',
  ].map((f) => path.join(rootDir, f)),
);
```

- [ ] **Step 2: Run the CI gate to confirm it passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected: `[design-token-usage] OK` (exit 0). The five new files are clean (no Tailwind strings) so the gate should pass immediately.

- [ ] **Step 3: Verify type-check and lint pass**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5 && pnpm lint 2>&1 | tail -5
```

Expected: zero errors on both.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive"
git add scripts/check_design_token_usage.ts
git commit -m "feat(ci): extend CSS module gate to 9 governed files"
```

---

## Self-Review

**1. Spec coverage check:**

- ✅ Skeleton — Task 1
- ✅ LoadingIndicator — Task 2
- ✅ Card (spacingTokens.cardPadding, spacingTokens.cardSectionGap, clickable group-hover, active:scale, animate-fade-in) — Task 3
- ✅ FormField (semanticTokens.fieldLabel, semanticTokens.required, semanticTokens.helperText, semanticTokens.errorText, spacingTokens.fieldGap, spacingTokens.labelGap, spacingTokens.helperGap) — Task 4
- ✅ Select (semanticTokens.errorBorder, semanticTokens.errorText, all Tailwind strings) — Task 5
- ✅ designSystem.ts deleted — Task 6
- ✅ CI gate extended to 9 files — Task 7

**2. Placeholder scan:** No TBDs. All CSS values are explicit. All code complete.

**3. Type consistency check:**

- Card.tsx uses `s.root`, `s.clickable`, `s.header`, `s.headerLeft`, `s.iconWrapper`, `s.textBlock`, `s.title`, `s.subtitle`, `s.headerRight`, `s.content`, `s.metadata`, `s.metadataList`, `s.metadataItem`, `s.metaIconWrapper`, `s.metaLabel`, `s.metaValue`, `s.actions`, `s.actionBtn` — all defined in Card.module.css ✅
- FormField.tsx uses `s.root`, `s.label`, `s.required`, `s.helper`, `s.error` — all defined in FormField.module.css ✅
- Select.tsx uses `s.root`, `s.label`, `s.wrapper`, `s.select`, `s.hasError`, `s.chevron`, `s.errorText` — all defined in Select.module.css ✅

**One gotcha for the Card implementer:** The original Card.tsx uses `Icon` with a `className` prop for metadata icons:

```tsx
<Icon name={item.icon} size="xs" className="mr-1.5 text-[var(--text-muted)]" />
```

In the new version, the icon color is moved to a wrapper span (`.metaIconWrapper`) and the className is removed from Icon. This is correct because the wrapper provides the color via `color: var(--text-muted)` and icons inherit `currentColor`. The `Icon` component renders a Lucide SVG which inherits color from its CSS context.
