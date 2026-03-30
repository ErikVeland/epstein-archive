# Design System Migration — Handover (2026-03-29)

Branch: `feature/v17-functional-salvage`

---

## What Was Done

### Phase 0 — Foundation (plan: `2026-03-28-design-system-phase-0-foundation.md`)

Established the CSS token infrastructure and deleted the old JS-based design system file.

- Created CSS custom properties in `src/client/index.css`: `--space-*`, `--radius-*`, `--accent`, `--glass-bg`, `--glass-border`, `--glass-shadow`, `--glass-blur`, `--text-*`, `--easing-liquid`, `--duration-*`, `--font-mono`
- Deleted `src/client/designSystem.ts` — all consumers migrated to CSS tokens
- Created `scripts/check_design_token_usage.ts` — CI ratchet that prevents regression in governed files

Commits: `19c1b671`

---

### Phase 1 — Common Components (plan: `2026-03-28-design-system-phase-1-common-components.md`)

Migrated 9 common UI primitives from Tailwind utility strings to CSS Modules.

| Component              | Module                        | Notes                                                              |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `Button.tsx`           | `Button.module.css`           | Design-system button                                               |
| `CloseButton.tsx`      | `CloseButton.module.css`      |                                                                    |
| `ProgressBar.tsx`      | `ProgressBar.module.css`      | Dynamic width via inline `style={{ width }}` (established pattern) |
| `SourceBadge.tsx`      | `SourceBadge.module.css`      |                                                                    |
| `Skeleton.tsx`         | `Skeleton.module.css`         |                                                                    |
| `LoadingIndicator.tsx` | `LoadingIndicator.module.css` | `loadingIndicatorSpin` prefixed keyframe                           |
| `Card.tsx`             | `Card.module.css`             |                                                                    |
| `FormField.tsx`        | `FormField.module.css`        |                                                                    |
| `Select.tsx`           | `Select.module.css`           | `focus-visible` ring, label association                            |

CI ratchet extended to 9 governed files.

Commits: `233584f1`, `0fff0f96`, `4f472d4d`, `227cbb08`, `23b7c1f7`, `19c1b671`, `76a857c7`, `562a221f`

---

### Media Browser Consolidation (plan: `2026-03-28-media-browser-consolidation.md`)

Wired all three media browsers onto the shared `AlbumSidebar` and `MobileAlbumDropdown` components that previously existed but were never imported anywhere.

| Browser            | Changes                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AudioBrowser.tsx` | Added `AlbumSidebar`, `MobileAlbumDropdown`, `SEO`                                                                                                   |
| `VideoBrowser.tsx` | Added `AlbumSidebar`, `MobileAlbumDropdown`, `SEO`                                                                                                   |
| `PhotoBrowser.tsx` | Added `AlbumSidebar`, `MobileAlbumDropdown`, `SEO`; adapted `imageCount → itemCount` via `albums.map(a => ({ ...a, itemCount: a.imageCount ?? 0 }))` |

`Album` type in `src/types/media.types.ts` uses `imageCount?: number` while shared components expect `itemCount: number` — the adapt-on-the-way-in pattern handles this without changing the shared type.

Commits: `ae47d114`, `04d26511`

---

### Phase 2 — Tabs + Tooltip (plan: `2026-03-28-design-system-phase-2-tabs-tooltip.md`)

| Component     | Module               | Notes                                                                                                                                            |
| ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Tabs.tsx`    | `Tabs.module.css`    | Renamed `Tabs.css` → module; camelCase class names; `variant` logic via conditional module classes                                               |
| `Tooltip.tsx` | `Tooltip.module.css` | Replaced JS `getPositionClasses()` / `getArrowClasses()` functions with `data-position` attribute selectors in CSS; no JS position logic remains |

CI ratchet extended to 11 governed files.

Commits: `04d26511`, `6181e298`

---

### Phase 3 — LoadingPill + TagSelector (plan: `2026-03-29-design-system-phase-3-loading-tagselector.md`)

| Component         | Module                   | Notes                                                                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LoadingPill.tsx` | `LoadingPill.module.css` | Three components share one module: `LoadingProvider`, `LoadingPillDisplay`, legacy `LoadingPill`; `loadingPillSpin` prefixed keyframe; `-webkit-backdrop-filter` included; `prefers-reduced-motion` guard on both spinners                                                                                         |
| `TagSelector.tsx` | `TagSelector.module.css` | `style={{ backgroundColor: tag.color }}` stays inline (dynamic data); `dropdown-surface` global class preserved; `text-green-400` → `color: var(--accent-success)`; ring-offset → `box-shadow: 0 0 0 1px #1e293b, 0 0 0 3px var(--glass-border)`; Lucide icons use `size` prop instead of Tailwind `w-/h-` classes |

CI ratchet extended to **13 governed files**.

Commits: `c27d932c`, `67319ca8`, `3d60d003`

---

## Current State

### CI Ratchet (`scripts/check_design_token_usage.ts`)

The `moduleGovernedFiles` Set contains 13 files. Any Tailwind utility string in these files fails the build:

```
src/client/design-system/components/Button.tsx
src/client/components/common/CloseButton.tsx
src/client/components/common/ProgressBar.tsx
src/client/components/common/SourceBadge.tsx
src/client/components/common/Skeleton.tsx
src/client/components/common/LoadingIndicator.tsx
src/client/components/common/Card.tsx
src/client/components/common/FormField.tsx
src/client/components/common/Select.tsx
src/client/components/common/Tabs.tsx
src/client/components/common/Tooltip.tsx
src/client/components/common/LoadingPill.tsx     ← Phase 3
src/client/components/common/TagSelector.tsx     ← Phase 3
```

Advisory (not yet failing builds): **143 files** still use raw Tailwind palette/spacing classes. Run `STRICT_DESIGN_TOKENS=1 npx tsx scripts/check_design_token_usage.ts` to see the full list.

### Key Patterns Established

| Pattern                                                        | Where used                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `import s from './Component.module.css'` + `className={s.foo}` | All migrated files                                               |
| `style={{ backgroundColor: dynamicValue }}`                    | ProgressBar fill width, TagSelector swatches — dynamic data only |
| Component-prefixed `@keyframes` (e.g., `loadingPillSpin`)      | LoadingPill, LoadingIndicator — avoids global name collision     |
| `data-position` attribute selectors for variant CSS            | Tooltip                                                          |
| `color-mix(in srgb, var(--token) 50%, transparent)`            | TagSelector addBtn — replaces Tailwind `/50` opacity             |
| Lucide `size` prop instead of `w-/h-` classes                  | TagSelector — avoids Tailwind size utilities in governed files   |
| `glass-panel`, `dropdown-surface` global classes kept as-is    | LoadingPill hover panel, TagSelector dropdown                    |

---

## What Remains

### Phase 4 — BatchToolbar + AddToInvestigationButton (not started)

These were explicitly deferred due to complexity:

**`src/client/components/common/BatchToolbar.tsx`**

- ~84 `className` uses
- 5 dropdown menus
- Complex conditional class logic for active/inactive states
- Recommend starting with a careful audit of which classes map cleanly to tokens vs. which need new CSS variables

**`src/client/components/common/AddToInvestigationButton.tsx`**

- ~33 `className` uses
- Contains programmatic DOM manipulation with hardcoded Tailwind class strings (not just JSX classNames)
- The DOM manipulation strings will need a different approach (likely data attributes or refs)

### Phase 5+ — Broad Migration (143 advisory files)

After governed-file coverage is solid, run `STRICT_DESIGN_TOKENS=1` and work through the advisory list. Likely candidates for early phases:

- `src/client/components/media/` — PhotoBrowser, VideoBrowser, AudioBrowser wrappers already consolidated but still use Tailwind internally
- `src/client/pages/` — route-level page components
- `src/client/components/network/` — graph/visualization components (heavier lift)

### Token Gaps

The following Tailwind utilities appear frequently in non-governed files and have no CSS token equivalent yet. These should be added to `index.css` before migrating files that use them:

- Responsive breakpoints (`sm:`, `md:`, `lg:`) — CSS modules can use `@media` directly, but a breakpoint token system would help
- `z-index` values (currently scattered: `z-10`, `z-20`, `z-50`) — worth defining `--z-overlay`, `--z-dropdown`, `--z-modal`
- Animation utilities beyond `animate-spin` — `animate-pulse`, `animate-bounce` used in a few places

---

## File Map of All CSS Modules (as of 2026-03-29)

```
src/client/
├── design-system/components/
│   └── Button.module.css
└── components/common/
    ├── Card.module.css
    ├── CloseButton.module.css
    ├── FormField.module.css
    ├── LoadingIndicator.module.css
    ├── LoadingPill.module.css          ← Phase 3
    ├── ProgressBar.module.css
    ├── Select.module.css
    ├── Skeleton.module.css
    ├── SourceBadge.module.css
    ├── TagSelector.module.css          ← Phase 3
    ├── Tabs.module.css                 ← Phase 2
    └── Tooltip.module.css              ← Phase 2
```
