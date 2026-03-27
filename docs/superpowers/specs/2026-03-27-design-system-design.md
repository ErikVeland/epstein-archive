# Design System: Token-First Cohesion

**Date:** 2026-03-27
**Status:** Approved — pending implementation
**Scope:** Full migration of all 196 client components to a single authoritative design system layer

---

## Why This Exists

The app has a mature, intentional dark glass aesthetic with a comprehensive token system already defined in `index.css` and `tailwind.config.js`. But the system is not enforced — it is advisory. This has produced measurable drift:

- `AudioPlayer.tsx` uses `text-red-500`, `bg-cyan-900/30`, `text-green-400` — raw Tailwind color names that bypass the accent/risk token system entirely
- `DocumentCard.css` hardcodes `#ef4444`, `#f97316`, `#10b981` instead of `var(--risk-*)` tokens
- Six near-identical glass surface classes (`.glass-panel`, `.glass-surface`, `.glass-card`, `.surface-glass`, `.surface-glass-card`, `.surface-quiet`) with no documented rules for which to use when
- `GlassButton` exists but components define their own button styles inline rather than using it
- Direct `lucide-react` imports in components bypass the centralized `Icon.tsx` wrapper
- Four media browser components (`PhotoBrowser`, `VideoBrowser`, `AudioBrowser`, `ArticlesTab`) share identical layout structure but are not abstracted
- `designSystem.ts` exports only 3 token objects — the token system has no typed JS representation

The root cause is structural: the design system lives in CSS files and a Tailwind config, not in an importable layer with enforced contracts. Any component author can reach past it. This spec defines a new structure where reaching past it is technically impossible.

---

## Guiding Principles

1. **One source of truth.** Every visual value — color, spacing, type size, surface style, motion — comes from one place. No value is defined twice.

2. **Violations are build errors, not style guide violations.** Hardcoded hex values produce nothing in the browser (Tailwind lockdown). Direct lucide-react imports fail lint. There is no "technically works but is wrong" path.

3. **Radix for behavior, our tokens for everything visual.** We do not import a third-party component aesthetic. We own 100% of the visual layer. Radix UI headless primitives handle accessibility (focus traps, ARIA, keyboard navigation) — the hard problems we should not maintain ourselves.

4. **The design-system layer is primitives only.** Domain logic stays in `src/client/components/`. The design system does not know what a SubjectCard or a FlightTracker is. Components consume the system; the system does not know about components.

5. **Migration is measurable.** Each wave ends with zero lint violations and a smaller `index.css`. Progress is visible in line counts.

---

## Foundation: Radix UI Headless + Our Tokens

### Why not shadcn/ui

shadcn/ui copies Radix-wired components with a clean neutral aesthetic into your repo. For most projects this is the right call. For this app it is the wrong call:

- The dark glass aesthetic is distinctive enough that every shadcn component would require a complete restyle. The pre-built visual layer is a liability, not an asset.
- shadcn source code diverges silently from upstream as you restyle it. You end up with the maintenance burden of rolling your own, without the design freedom of actually owning it.
- The existing `GlassButton`, `GlassModal`, `GlassSwitch`, `GlassTooltip`, `GlassDropdown` are already correctly-structured Radix wrappers. The foundation exists. We are formalizing it, not replacing it.

### Why Radix headless

Radix solves the genuinely hard problems in UI primitives: focus trapping in modals, keyboard navigation in dropdowns, ARIA role management in toggles and tabs, portal rendering for overlays. These are not problems we should maintain. Radix's API surface is stable and non-opinionated — it delivers behavior and nothing else. We style on top.

For any net-new complex primitive (date picker, combobox, virtualized table), the approach is: use Radix for the behavior scaffold, write the styled wrapper ourselves to match the token system. Use shadcn as a _reference_ for understanding the Radix wiring, not as a dependency.

---

## Architecture

```
src/client/
├── design-system/                  ← single source of truth (NEW)
│   ├── tokens/
│   │   ├── colors.ts               ← all color values as typed constants + CSS var names
│   │   ├── typography.ts           ← type scale, font families, weights
│   │   ├── spacing.ts              ← spacing scale
│   │   ├── surfaces.ts             ← 3 canonical glass surface definitions
│   │   ├── motion.ts               ← easing curves, durations
│   │   └── index.ts                ← re-exports all tokens
│   ├── components/
│   │   ├── Button.tsx              ← replaces GlassButton
│   │   ├── Surface.tsx             ← typed wrapper for 3 glass variants
│   │   ├── Badge.tsx               ← risk / nav category / status / count variants
│   │   ├── Icon.tsx                ← moves from common/, same API
│   │   ├── EmptyState.tsx          ← replaces all inline empty-state JSX
│   │   ├── Spinner.tsx             ← replaces all inline animate-spin patterns
│   │   ├── MediaBrowser.tsx        ← shared shell for photo/video/audio/articles
│   │   └── index.ts                ← re-exports all components
│   └── index.ts                    ← @design-system alias root
│
├── components/                     ← domain components (consumers of @design-system)
├── index.css                       ← shrinks to keyframes + @font-face only (~4KB)
└── tailwind.config.js              ← references tokens/, color palette locked
```

**Path alias:** `@design-system` → `src/client/design-system/index.ts`
Add to `vite.config.ts` resolve.alias and `tsconfig.json` paths.

---

## Token System

### Colors (`tokens/colors.ts`)

All values are exported as typed constants AND generate the CSS custom properties consumed by Tailwind.

```ts
export const colors = {
  bg: {
    page: '#09090b', // page background (zinc-950)
    surface: '#111116', // cards, panels
    elevated: '#1c1c24', // hover states, dropdowns
    overlay: '#0f0f17e6', // modal backdrops (semi-transparent)
  },
  text: {
    primary: '#f8fafc', // headings, active labels
    secondary: '#cbd5e1', // body text
    muted: '#64748b', // timestamps, metadata
    disabled: '#334155', // disabled inputs
  },
  accent: {
    gold: '#d4a84b', // primary brand accent
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#34d399',
    info: '#06b6d4',
  },
  risk: {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#d97706',
    low: '#16a34a',
    minimal: '#0d9488',
    unknown: '#475569',
  },
  nav: {
    documents: '#34d399',
    emails: '#fbbf24',
    media: '#a78bfa',
    people: '#60a5fa',
    investigations: '#ec4899',
    timeline: '#fb923c',
    flights: '#38bdf8',
    properties: '#a3e635',
    network: '#f472b6',
  },
  glass: {
    border: 'rgba(148,163,184,0.07)',
    borderHighlight: 'rgba(148,163,184,0.14)',
    shadow: '0 10px 32px rgba(2,6,23,0.5)',
    shadowSoft: '0 4px 16px rgba(2,6,23,0.25)',
  },
} as const;
```

**Key changes from current state:**

- `--text-dim` and `--text-strong` removed — use `text.muted` and `text.primary`
- `--text-default` removed — use `text.secondary`
- Risk scale gains distinct `high` (#ea580c orange) separate from `critical` (#dc2626 red) — currently both use `#c0392b`
- Background scale gains `overlay` variant for modals
- No more `--accent-primary` (#2f96ee) alongside `--accent` (#d4a84b) — one accent system

### Typography (`tokens/typography.ts`)

```ts
export const type = {
  scale: {
    display: 'clamp(2.5rem, 4vw, 4rem)',
    h1: 'clamp(1.75rem, 2.5vw, 2.25rem)',
    h2: 'clamp(1.375rem, 2vw, 1.75rem)',
    h3: 'clamp(1.125rem, 1.5vw, 1.375rem)',
    body: '0.9375rem', // 15px
    small: '0.8125rem', // 13px
    xs: '0.6875rem', // 11px
  },
  family: {
    display: "'DM Serif Display', Georgia, serif",
    sans: "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;
```

Tailwind text utilities are restricted to this scale. `text-base`, `text-md`, arbitrary `text-[0.95rem]` are removed. Components use `text-body`, `text-small`, `text-xs`, `text-h1` etc.

### Surfaces (`tokens/surfaces.ts`)

Three canonical variants replace six overlapping CSS classes:

| Variant   | CSS class emitted     | Use when                                                      | Replaces                                           |
| --------- | --------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| `base`    | `.ds-surface-base`    | Static content panels, sidebars, page sections                | `.glass-panel`, `.glass-surface`, `.surface-glass` |
| `card`    | `.ds-surface-card`    | Clickable/interactive items, result rows, expandable sections | `.glass-card`, `.surface-glass-card`               |
| `overlay` | `.ds-surface-overlay` | Modals, dropdowns, tooltips                                   | `.surface-quiet` + modal styles                    |

All surface styles are generated from tokens — no hardcoded values in the CSS class definitions. The `Surface.tsx` component is the only entry point; raw class names are not exported.

### Spacing (`tokens/spacing.ts`)

Existing scale formalized as typed constants: `space[1]`=4px through `space[16]`=64px. Tailwind spacing scale maps directly to this. No arbitrary `px-[13px]` values.

### Motion (`tokens/motion.ts`)

```ts
export const motion = {
  easing: {
    liquid: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    swift: 'cubic-bezier(0.4, 0, 0.2, 1)',
    gentle: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  duration: {
    fast: '150ms',
    normal: '250ms', // tightened from 300ms
    slow: '450ms', // tightened from 500ms
  },
} as const;
```

---

## Canonical Components

### `Button`

Replaces `GlassButton`. Radix-primitive-free (buttons do not need Radix). All interactive states derived from tokens.

```tsx
<Button
  variant="primary" | "secondary" | "ghost" | "danger" | "nav"
  size="sm" | "md" | "lg"
  navCategory?="documents" | "emails" | ...  // only valid when variant="nav"
  loading?
  disabled?
/>
```

- `primary` — gold accent fill, for primary CTAs
- `secondary` — glass surface with border (replaces current default glass button)
- `ghost` — no border, hover-only background (toolbar actions, inline links)
- `danger` — red accent fill (destructive actions — fixes AudioPlayer raw buttons)
- `nav` — category-colored (navigation use only, requires `navCategory`)

### `Surface`

Typed wrapper for the three glass variants. The only way to render a glass surface.

```tsx
<Surface
  variant="base" | "card" | "overlay"
  padding="sm" | "md" | "lg" | "none"
  interactive?    // adds hover lift + border-highlight transition
  as?="div" | "section" | "article" | "aside"  // defaults to div
/>
```

Eliminates all `.glass-*` / `.surface-*` class usage from component authors.

### `Badge`

Four variants consolidate all badge patterns currently rebuilt inline in SubjectCard, EntityMediaGallery, DocumentCard, InvestigationWorkspace, and others.

```tsx
<Badge variant="risk"   level="critical"|"high"|"medium"|"low"|"minimal"|"unknown" />
<Badge variant="nav"    category="documents"|"emails"|"media"|... />
<Badge variant="status" color="success"|"warning"|"danger"|"info" />
<Badge variant="count"  value={42} />
```

### `Icon`

Moves from `src/client/components/common/Icon.tsx` to `src/client/design-system/components/Icon.tsx`. API unchanged.

```tsx
<Icon name="AlertCircle" size="xs"|"sm"|"md"|"lg"|"xl" color="primary"|"muted"|"danger"|... />
```

Direct `import { ... } from 'lucide-react'` in components becomes an ESLint error.

### `EmptyState`

```tsx
<EmptyState
  icon="Search"           // Icon name
  title="No results"
  description="Try adjusting your filters"
  action?={<Button>Clear filters</Button>}
/>
```

Replaces all inline empty-state JSX in every browser component.

### `Spinner`

```tsx
<Spinner size="sm"|"md"|"lg" label?="Loading documents..." />
```

Replaces all `animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]` inline patterns.

### `MediaBrowser`

Completes the abstraction begun with `.media-browser-*` CSS classes. The four media browser components become thin consumers.

```tsx
<MediaBrowser
  toolbar={ReactNode}       // domain-specific filters/controls
  sidebar?={ReactNode}      // album list, category nav (hidden on mobile)
  grid={ReactNode}          // domain-specific grid/list
  emptyState?={ReactNode}   // defaults to <EmptyState />
  searchValue={string}
  onSearch={(q: string) => void}
  selectionCount?={number}
  batchActions?={ReactNode}
  loading?
/>
```

`PhotoBrowser`, `VideoBrowser`, `AudioBrowser`, `ArticlesTab` pass their domain-specific grids and toolbars. All layout, search, toolbar, selection scaffolding is handled by `MediaBrowser`.

---

## Enforcement

### Layer 1 — ESLint (author-time, red squiggles in editor)

```js
'no-restricted-imports': [
  // No direct lucide-react — use Icon from @design-system
  { name: 'lucide-react', message: "Import Icon from '@design-system' instead" },
  // No direct Radix imports in components — must go through design-system
  { name: '@radix-ui/*', message: "Use design-system components, not Radix directly" },
],
'no-restricted-syntax': [
  // No hardcoded hex/rgb/hsl in JSX strings or style objects
  // Pattern catches: #fff, #d4a84b, rgb(255,0,0), hsl(0,0%,100%)
  {
    selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$|rgb\\(|hsl\\(/]",
    message: "Hardcoded color values are not allowed. Use design token from '@design-system/tokens/colors'",
  },
]
```

### Layer 2 — Tailwind color lockdown (build-time, silent failure in browser)

The full Tailwind color palette is replaced with only named semantic tokens:

```js
// tailwind.config.js
theme: {
  // colors key (not extend) — replaces entire default palette
  colors: {
    transparent: 'transparent',
    current: 'currentColor',
    // Backgrounds
    'bg-page':     'var(--bg-page)',
    'bg-surface':  'var(--bg-surface)',
    'bg-elevated': 'var(--bg-elevated)',
    // Text
    'text-primary':   'var(--text-primary)',
    'text-secondary': 'var(--text-secondary)',
    'text-muted':     'var(--text-muted)',
    'text-disabled':  'var(--text-disabled)',
    // Accents
    'accent':         'var(--accent-gold)',
    'accent-danger':  'var(--accent-danger)',
    'accent-warning': 'var(--accent-warning)',
    'accent-success': 'var(--accent-success)',
    'accent-info':    'var(--accent-info)',
    // Risk
    'risk-critical': 'var(--risk-critical)',
    'risk-high':     'var(--risk-high)',
    'risk-medium':   'var(--risk-medium)',
    'risk-low':      'var(--risk-low)',
    'risk-minimal':  'var(--risk-minimal)',
    'risk-unknown':  'var(--risk-unknown)',
    // Nav categories
    'nav-documents':      'var(--nav-documents)',
    'nav-emails':         'var(--nav-emails)',
    'nav-media':          'var(--nav-media)',
    'nav-people':         'var(--nav-people)',
    'nav-investigations': 'var(--nav-investigations)',
    'nav-timeline':       'var(--nav-timeline)',
    'nav-flights':        'var(--nav-flights)',
    'nav-properties':     'var(--nav-properties)',
    'nav-network':        'var(--nav-network)',
  }
}
```

`text-red-500` now produces nothing. `text-accent-danger` works. Violations are immediately visible in the browser during development.

### Layer 3 — Boundary check extension

Extend the existing `check:boundaries` script:

- `src/client/components/**` may not contain raw `var(--*)` references in className strings — must use Tailwind semantic tokens or `@design-system` components
- `src/client/design-system/**` may not import from `src/client/components/**`

---

## Migration Waves

Each wave ends with a gate: `pnpm lint` passes with zero violations, `pnpm type-check` passes with zero errors. The wave is not complete until the gate passes.

### Wave 0 — Build the design-system layer

**No component changes.** Establish the foundation:

- Create `src/client/design-system/` with all token files
- Refactor existing `GlassButton`, `GlassModal`, `GlassSwitch`, `GlassTooltip`, `GlassDropdown` into `design-system/components/`
- Add `Icon`, `EmptyState`, `Spinner`, `Badge`, `Surface`, `MediaBrowser` as new components
- Add `@design-system` path alias to `vite.config.ts` and `tsconfig.json`
- Implement ESLint rules
- Lock Tailwind color palette
- Extend boundary check
- Update `index.css` to emit CSS custom properties from token values (single source)

Gate: lint passes, type-check passes, app renders identically to before.

### Wave 1 — Media (highest drift, in progress)

- `AudioPlayer.tsx` — replace `text-red-500`, `bg-cyan-900/30`, `text-green-400` with token-based classes; replace raw `<button>` with `<Button>`
- `PhotoBrowser.tsx`, `VideoBrowser.tsx`, `AudioBrowser.tsx`, `ArticlesTab.tsx` — migrate to `<MediaBrowser>` shell
- Delete `.media-browser-*` classes from `index.css` (now inside `MediaBrowser.tsx`)

### Wave 2 — Common primitives

- `Card.tsx` — use `<Surface variant="card">`, `<Badge>`, `<Icon>`
- `Tabs.tsx` + `Tabs.css` — migrate styles to token-driven, delete `Tabs.css`
- `BatchToolbar.tsx` — use `<Button variant="ghost">` throughout
- `VirtualList.tsx` — token-based loading/empty states
- `DocumentCard.css` — delete file, migrate to inline token-based styles
- `SearchFilters.tsx` — use `<Button>`, `<Badge>`

### Wave 3 — Entities + Documents

- `SubjectCard.tsx`, `PersonCard.tsx`, `EntityMediaGallery.tsx` — use `<Badge variant="risk">`, `<Surface>`, `<Icon>`
- `DocumentBrowser.tsx`, `DocumentCard.tsx`, `PDFVariant.tsx` — use `<Surface>`, `<Badge>`, `<EmptyState>`

### Wave 4 — Investigation + Flights + Properties

- `InvestigationWorkspace.tsx`, `CommunicationAnalysis.tsx` — `<Surface>`, `<Button>`, `<Badge>`
- `FlightTracker.tsx` — delete `FlightTracker.css`, migrate to tokens
- `PropertyBrowser.tsx` — delete `PropertyBrowserStyles.tsx` inline style objects, migrate to tokens

### Wave 5 — Visualizations + Pages

- `TreeMap.tsx`, `NetworkVisualization.tsx`, `LocationMap.tsx` — token-based colors for data vis
- `AboutPage.tsx`, `StatsDisplay.tsx`, `LegalPage.tsx` — `<Surface>`, typography tokens

### Wave 6 — index.css final shrink

- Delete all migrated CSS classes
- `index.css` retains only: `@font-face`, `@keyframes` (animations), `:root` CSS variable declarations generated from token files
- Target: ~4KB (down from 33KB)
- Final `pnpm lint` + `pnpm type-check` + full smoke test

---

## Success Criteria

- `pnpm lint` passes with zero violations (no hardcoded colors, no direct lucide-react imports)
- `pnpm type-check` passes with zero errors
- `index.css` is ≤4KB
- `grep -r "text-red-\|text-green-\|text-blue-\|bg-red-\|bg-cyan-" src/client/components` returns zero results
- `grep -r "from 'lucide-react'" src/client/components` returns zero results
- `grep -r "#[0-9a-fA-F]" src/client/components` returns zero results
- All six migration waves gate-passed

---

## What This Does Not Change

- The glass dark aesthetic — it is preserved and sharpened, not replaced
- The component domain structure — SubjectCard, FlightTracker, InvestigationWorkspace etc. stay in `src/client/components/`
- React Router, Vite, Express API, PostgreSQL layer — untouched
- Light mode — out of scope; the token structure is compatible with future light mode addition but does not implement it
