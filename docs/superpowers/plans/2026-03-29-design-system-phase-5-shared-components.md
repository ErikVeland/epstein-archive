# Design System Phase 5 — Shared Components + Token Additions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 5 shared/page components to CSS Modules, add missing z-index and warning-colour tokens to `index.css`, and extend the CI ratchet from 15 to 20 governed files — eliminating the one active strict-mode violation and reducing advisory debt.

**Architecture:** Same strategy as Phases 1–4. Each component gets a `*.module.css` beside its `.tsx`. All static Tailwind utility strings are replaced with `s.className` module references. Responsive variants are expressed as `@media` blocks inside the module. No inline styles are added (CLAUDE.md policy) — conditional state is expressed via additional CSS classes (`s.selected`, `s.active`). After migrations the strict baseline is regenerated to record the new, lower debt count.

**Tech Stack:** CSS Modules, Vite, TypeScript, React 18. No new runtime dependencies.

---

## Current state

- **moduleGovernedFiles**: 15 files (Phase 0–4 complete)
- **Strict baseline debt**: 147 files (advisory)
- **Active strict violation**: `src/client/components/pages/LegalPage.tsx` — NOT in baseline, breaks `STRICT_DESIGN_TOKENS=1`

## File Map

**Create:**

- `src/client/components/pages/LegalPage.module.css`
- `src/client/components/shared/DegradedBanner.module.css`
- `src/client/components/shared/SensitiveWarningBanner.module.css`
- `src/client/components/shared/AlbumSidebar.module.css`
- `src/client/components/shared/MediaBrowserLayout.module.css`

**Modify:**

- `src/client/index.css` — add z-index tokens + warning/danger colour tokens
- `src/client/components/pages/LegalPage.tsx`
- `src/client/components/shared/DegradedBanner.tsx`
- `src/client/components/shared/SensitiveWarningBanner.tsx`
- `src/client/components/shared/AlbumSidebar.tsx`
- `src/client/components/shared/MediaBrowserLayout.tsx`
- `scripts/check_design_token_usage.ts` — extend `moduleGovernedFiles` from 15 to 20

---

## Token translation reference

| Tailwind class        | CSS module equivalent                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| `space-y-N`           | `display:flex; flex-direction:column; gap:var(--space-N)`                    |
| `mb-8`                | `margin-bottom: var(--space-8)`                                              |
| `p-6`                 | `padding: var(--space-6)`                                                    |
| `md:p-8`              | `@media(min-width:768px){ padding: var(--space-8) }`                         |
| `px-4 py-2`           | `padding: var(--space-2) var(--space-4)`                                     |
| `px-4 py-3`           | `padding: var(--space-3) var(--space-4)`                                     |
| `bg-amber-500/10`     | `background: color-mix(in srgb, var(--accent-warning) 10%, transparent)`     |
| `border-amber-500/50` | `border-color: color-mix(in srgb, var(--accent-warning) 50%, transparent)`   |
| `text-amber-500`      | `color: var(--accent-warning)`                                               |
| `bg-red-900/80`       | `background: var(--bg-danger-deep)` ← new token                              |
| `border-red-700`      | `border-color: var(--border-danger)` ← new token                             |
| `text-red-200`        | `color: var(--text-danger-strong)` ← new token                               |
| `text-red-300/90`     | `color: color-mix(in srgb, var(--text-danger) 90%, transparent)` ← new token |
| `text-red-400`        | `color: var(--text-danger)` ← new token                                      |
| `bg-red-800/50`       | `background: color-mix(in srgb, var(--bg-danger-deep) 50%, transparent)`     |
| `bg-red-900/20`       | `background: color-mix(in srgb, var(--bg-danger-deep) 20%, transparent)`     |
| `border-red-500/50`   | `border-color: color-mix(in srgb, var(--accent-danger) 50%, transparent)`    |
| `text-red-200`        | `color: var(--text-danger-strong)`                                           |
| `bg-cyan-900/20`      | `background: color-mix(in srgb, var(--accent) 20%, transparent)`             |
| `z-10`                | `z-index: var(--z-content)` ← new token                                      |
| `z-20`                | `z-index: var(--z-above)` ← new token                                        |
| `z-50`                | `z-index: var(--z-dropdown)` ← new token                                     |
| `animate-spin`        | `animation: mediaBrowserSpin 1s linear infinite` + `@keyframes`              |

---

### Task 1: Add missing CSS tokens to index.css

**Files:**

- Modify: `src/client/index.css`

- [ ] **Step 1: Baseline type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 2: Add z-index and danger colour tokens**

Find the line `--accent-danger: #ef4444;` in `src/client/index.css` (currently line 88). Add the following block directly after it (before `--chip-accent:`):

```css
/* z-index scale */
--z-content: 10;
--z-above: 20;
--z-dropdown: 50;
--z-overlay: 100;
--z-modal: 200;
--z-toast: 300;

/* Danger / warning background tokens (for non-Tailwind components) */
--bg-danger-deep: rgba(127, 29, 29, 0.8); /* Tailwind red-900/80 */
--border-danger: #b91c1c; /* Tailwind red-700 */
--text-danger-strong: #fecaca; /* Tailwind red-200 */
--text-danger: #fca5a5; /* Tailwind red-300 */
```

- [ ] **Step 3: Run CI ratchet to confirm no regressions**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected: `[design-token-usage] OK`

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/index.css && git commit -m "chore(tokens): add z-index scale and danger/warning colour tokens"
```

---

### Task 2: Migrate LegalPage to CSS Module

**Files:**

- Create: `src/client/components/pages/LegalPage.module.css`
- Modify: `src/client/components/pages/LegalPage.tsx`

Notes:

- `surface-glass-card` is a global utility class defined in `index.css` — keep it as a bare string in `className`, do not move it into the module
- `space-y-N` → `flex-direction: column; gap: var(--space-N)`
- Responsive `md:p-8` → `@media (min-width: 768px)` block in module

- [ ] **Step 1: Create LegalPage.module.css**

```css
/* src/client/components/pages/LegalPage.module.css */

.root {
  padding: var(--space-6);
  max-width: 56rem; /* max-w-4xl = 896px = 56rem */
}

@media (min-width: 768px) {
  .root {
    padding: var(--space-8);
  }
}

.titleBlock {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.title {
  font-size: 1.875rem; /* text-3xl */
  font-weight: 600;
  color: var(--text-primary);
}

.intro {
  color: var(--text-secondary);
  max-width: 42rem; /* max-w-2xl */
}

.sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sectionHeading {
  font-size: 1.125rem; /* text-lg */
  font-weight: 600;
  color: var(--text-primary);
}

.sectionBody {
  color: var(--text-secondary);
  line-height: 1.75; /* leading-7 */
}
```

- [ ] **Step 2: Update LegalPage.tsx**

Add the module import after the existing React import:

```tsx
import s from './LegalPage.module.css';
```

Replace the return statement:

```tsx
return (
  <div className={`surface-glass-card ${s.root}`}>
    <div className={s.titleBlock}>
      <h1 className={s.title}>{title}</h1>
      <p className={s.intro}>{intro}</p>
    </div>

    <div className={s.sections}>
      {sections.map((section) => (
        <section key={section.heading} className={s.section}>
          <h2 className={s.sectionHeading}>{section.heading}</h2>
          <p className={s.sectionBody}>{section.body}</p>
        </section>
      ))}
    </div>
  </div>
);
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/pages/LegalPage.module.css src/client/components/pages/LegalPage.tsx && git commit -m "refactor(legal-page): migrate to CSS module"
```

---

### Task 3: Migrate DegradedBanner to CSS Module

**Files:**

- Create: `src/client/components/shared/DegradedBanner.module.css`
- Modify: `src/client/components/shared/DegradedBanner.tsx`

Notes:

- `bg-amber-500/10` → `color-mix(in srgb, var(--accent-warning) 10%, transparent)`
- `border-amber-500/50` → `color-mix(in srgb, var(--accent-warning) 50%, transparent)`
- `text-amber-500` → `color: var(--accent-warning)`
- `w-5 h-5` on Lucide icon → use `size={20}` prop (established pattern from TagSelector)

- [ ] **Step 1: Create DegradedBanner.module.css**

```css
/* src/client/components/shared/DegradedBanner.module.css */

.banner {
  background: color-mix(in srgb, var(--accent-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-warning) 50%, transparent);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  margin-top: var(--space-4);
  color: var(--accent-warning);
  max-width: 42rem; /* max-w-2xl */
  margin-left: auto;
  margin-right: auto;
  box-shadow: var(--glass-shadow);
}

.icon {
  flex-shrink: 0;
}

.text {
  font-size: 0.875rem;
}

.strong {
  font-weight: 600;
  display: block;
}

.detail {
  opacity: 0.9;
}
```

- [ ] **Step 2: Update DegradedBanner.tsx**

Add the module import:

```tsx
import s from './DegradedBanner.module.css';
```

Replace the return statement:

```tsx
return (
  <div className={s.banner}>
    <AlertTriangle className={s.icon} size={20} />
    <div className={s.text}>
      <strong className={s.strong}>System under heavy load</strong>
      <span className={s.detail}>
        Auto-retries have been paused. Functionality may be limited or cached. Please wait a moment
        before trying again.
      </span>
    </div>
  </div>
);
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/shared/DegradedBanner.module.css src/client/components/shared/DegradedBanner.tsx && git commit -m "refactor(degraded-banner): migrate to CSS module"
```

---

### Task 4: Migrate SensitiveWarningBanner to CSS Module

**Files:**

- Create: `src/client/components/shared/SensitiveWarningBanner.module.css`
- Modify: `src/client/components/shared/SensitiveWarningBanner.tsx`

Notes:

- Uses the new `--bg-danger-deep`, `--border-danger`, `--text-danger-strong`, `--text-danger` tokens added in Task 1
- The inline SVG close icon stays as-is (it's not a Tailwind class — it's just SVG markup)
- `shrink-0` → `flex-shrink: 0`

- [ ] **Step 1: Create SensitiveWarningBanner.module.css**

```css
/* src/client/components/shared/SensitiveWarningBanner.module.css */

.banner {
  background: var(--bg-danger-deep);
  border-bottom: 1px solid var(--border-danger);
  padding: 0.75rem var(--space-4); /* px-4 py-3 */
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  position: relative;
}

.icon {
  color: var(--text-danger);
  flex-shrink: 0;
  margin-top: 0.125rem; /* mt-0.5 */
}

.body {
  flex: 1;
  padding-right: 1.5rem; /* pr-6 */
}

.heading {
  color: var(--text-danger-strong);
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.message {
  color: color-mix(in srgb, var(--text-danger) 90%, transparent);
  font-size: 0.875rem;
  margin-top: var(--space-1);
}

.dismissBtn {
  position: absolute;
  right: var(--space-2);
  top: var(--space-2);
  padding: 0.375rem; /* p-1.5 */
  color: color-mix(in srgb, var(--text-danger-strong) 60%, transparent);
  border-radius: 9999px;
  transition:
    color var(--duration-fast) var(--easing-liquid),
    background-color var(--duration-fast) var(--easing-liquid);
}

.dismissBtn:hover {
  color: var(--text-danger-strong);
  background: color-mix(in srgb, var(--bg-danger-deep) 50%, transparent);
}
```

- [ ] **Step 2: Update SensitiveWarningBanner.tsx**

Add the module import:

```tsx
import s from './SensitiveWarningBanner.module.css';
```

Replace the return statement (keep the inline SVG as-is):

```tsx
return (
  <div className={s.banner}>
    <AlertTriangle className={s.icon} size={20} />
    <div className={s.body}>
      <h4 className={s.heading}>Sensitive &amp; Disturbing Content</h4>
      <p className={s.message}>
        This album contains {mediaTypeLabel} testimony from victims and survivors. Content may be
        graphic, traumatic, and disturbing. {discretionLabel} discretion is strongly advised.
      </p>
    </div>
    <button onClick={handleDismiss} className={s.dismissBtn} aria-label="Dismiss warning">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
);
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/shared/SensitiveWarningBanner.module.css src/client/components/shared/SensitiveWarningBanner.tsx && git commit -m "refactor(sensitive-warning-banner): migrate to CSS module"
```

---

### Task 5: Migrate AlbumSidebar to CSS Module

**Files:**

- Create: `src/client/components/shared/AlbumSidebar.module.css`
- Modify: `src/client/components/shared/AlbumSidebar.tsx`

Notes:

- The `getButtonClasses()` helper is replaced by two static classes: `s.albumBtn` (base) and `s.albumBtnSelected` (modifier), combined with a conditional: `` `${s.albumBtn} ${isSelected ? s.albumBtnSelected : ''}` ``
- `bg-cyan-900/20` translates to `color-mix(in srgb, var(--accent) 20%, transparent)` — the sidebar uses the accent colour for selection state (cyan in Tailwind, but semantically it's the accent)
- `hidden md:flex` → `display: none` default + `@media (min-width: 768px) { display: flex }` in module
- `text-xs opacity-70 ... rounded-full` on badge spans → a `.badge` class in module

- [ ] **Step 1: Create AlbumSidebar.module.css**

```css
/* src/client/components/shared/AlbumSidebar.module.css */

.sidebar {
  display: none; /* hidden by default on mobile */
  width: 15rem; /* w-60 */
  background: var(--glass-bg-strong);
  border-right: 1px solid var(--glass-border);
  flex-direction: column;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .sidebar {
    display: flex;
  }
}

.heading {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-3) var(--space-4);
}

.list {
  flex: 1;
  overflow-y: auto;
}

/* Base album button */
.albumBtn {
  width: 100%;
  padding: var(--space-2) var(--space-4);
  text-align: left;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition:
    background-color var(--duration-fast) var(--easing-liquid),
    color var(--duration-fast) var(--easing-liquid);
  border-left: 2px solid transparent;
  color: var(--text-muted);
}

.albumBtn:hover {
  background: var(--glass-bg);
  color: var(--text-primary);
}

/* Selected state modifier */
.albumBtnSelected {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  color: var(--accent);
  border-left-color: var(--accent);
}

.albumBtnSelected:hover {
  background: color-mix(in srgb, var(--accent) 25%, transparent);
}

.albumName {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  font-size: 0.75rem;
  opacity: 0.7;
  background: var(--glass-bg);
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Update AlbumSidebar.tsx**

Add the module import:

```tsx
import s from './AlbumSidebar.module.css';
```

Replace the entire component body:

```tsx
export function AlbumSidebar({
  albums,
  selectedAlbum,
  onSelectAlbum,
  totalItemCount,
  allLabel,
}: AlbumSidebarProps): React.ReactElement {
  return (
    <aside className={s.sidebar}>
      <h3 className={s.heading}>Albums</h3>
      <div className={s.list}>
        <button
          className={`${s.albumBtn} ${selectedAlbum === null ? s.albumBtnSelected : ''}`}
          onClick={() => onSelectAlbum(null)}
        >
          <span className={s.albumName}>{allLabel}</span>
          <span className={s.badge}>{totalItemCount}</span>
        </button>
        {albums.map((album) => (
          <button
            key={album.id}
            className={`${s.albumBtn} ${selectedAlbum === album.id ? s.albumBtnSelected : ''}`}
            onClick={() => onSelectAlbum(album.id)}
            title={album.name}
          >
            <span className={s.albumName}>{album.name}</span>
            <span className={s.badge}>{album.itemCount || 0}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/shared/AlbumSidebar.module.css src/client/components/shared/AlbumSidebar.tsx && git commit -m "refactor(album-sidebar): migrate to CSS module"
```

---

### Task 6: Migrate MediaBrowserLayout to CSS Module

**Files:**

- Create: `src/client/components/shared/MediaBrowserLayout.module.css`
- Modify: `src/client/components/shared/MediaBrowserLayout.tsx`

Notes:

- The `animate-spin` class on the loading spinner → `@keyframes mediaBrowserSpin` (component-prefixed) with `prefers-reduced-motion` guard
- The ternary className for the Batch Edit button (active/inactive) → `s.batchBtn` + `s.batchBtnActive` modifier
- `hidden md:block` on subtitle → `display: none` default + `@media (min-width: 768px) { display: block }`
- `flex flex-col md:flex-row` on header → `display: flex; flex-direction: column` default + `@media (min-width: 768px) { flex-direction: row }`
- `bg-red-900/20 border-red-500/50 text-red-200` on error box → uses `--bg-danger-deep` and `--accent-danger` tokens from Task 1
- `MediaEmptyState` and `LoadMoreButton` helpers in the same file each get classes in the same module

- [ ] **Step 1: Create MediaBrowserLayout.module.css**

```css
/* src/client/components/shared/MediaBrowserLayout.module.css */

/* ── Root container ──────────────────────────────────────── */
.root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
  border-radius: var(--radius-lg);
}

/* ── Header ──────────────────────────────────────────────── */
.header {
  background: var(--glass-bg-strong);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  flex-shrink: 0;
  z-index: var(--z-content);
  gap: var(--space-2);
}

@media (min-width: 768px) {
  .header {
    flex-direction: row;
    align-items: center;
    padding: 0 var(--space-4);
    height: 3.5rem; /* h-14 */
  }
}

.titleGroup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.titleText {
  font-size: 1.125rem;
  font-weight: 300;
  color: var(--text-primary);
}

.subtitle {
  display: none;
  color: var(--text-muted);
  font-size: 0.75rem;
}

@media (min-width: 768px) {
  .subtitle {
    display: block;
  }
}

.batchBtn {
  padding: var(--space-1) var(--space-3); /* py-1.5 px-3 */
  border-radius: var(--radius-lg);
  font-size: 0.75rem;
  transition:
    background-color var(--duration-fast) var(--easing-liquid),
    color var(--duration-fast) var(--easing-liquid);
  background: var(--glass-bg);
  color: var(--text-muted);
  border: 1px solid var(--glass-border);
}

.batchBtn:hover {
  color: var(--text-primary);
}

.batchBtnActive {
  background: var(--accent);
  color: var(--text-primary);
  border-color: transparent;
}

/* ── Body ────────────────────────────────────────────────── */
.body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.main {
  flex: 1;
  background: var(--glass-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

/* ── Loading overlay ─────────────────────────────────────── */
.loadingOverlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-above);
  background: var(--glass-bg);
  backdrop-filter: blur(4px);
}

.spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  border: 2px solid transparent;
  border-top-color: var(--accent);
  border-bottom-color: var(--accent);
  animation: mediaBrowserSpin 1s linear infinite;
}

@keyframes mediaBrowserSpin {
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

/* ── Error box ───────────────────────────────────────────── */
.errorBox {
  background: color-mix(in srgb, var(--bg-danger-deep) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-danger) 50%, transparent);
  color: var(--text-danger-strong);
  padding: var(--space-4);
  margin: var(--space-6);
  border-radius: var(--radius-lg);
}

/* ── Footer ──────────────────────────────────────────────── */
.footer {
  height: 1.5rem;
  background: var(--glass-bg-strong);
  border-top: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  font-size: 0.625rem;
  color: var(--text-muted);
  user-select: none;
  flex-shrink: 0;
}

/* ── MediaEmptyState (exported helper) ───────────────────── */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}

.emptyIcon {
  margin-bottom: var(--space-2);
  opacity: 0.5;
}

/* ── LoadMoreButton (exported helper) ────────────────────── */
.loadMoreWrap {
  text-align: center;
  margin-top: var(--space-8);
}

.loadMoreBtn {
  padding: var(--space-2) var(--space-6);
  background: var(--glass-bg);
  color: var(--text-secondary);
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color var(--duration-fast) var(--easing-liquid);
}

.loadMoreBtn:hover {
  background: var(--glass-bg-highlight);
}
```

- [ ] **Step 2: Update MediaBrowserLayout.tsx**

Add the module import:

```tsx
import s from './MediaBrowserLayout.module.css';
```

Replace the `MediaBrowserLayout` return statement:

```tsx
return (
  <div className={s.root}>
    {/* Header */}
    <div className={s.header}>
      {/* Mobile Album Dropdown */}
      {mobileAlbumDropdown}

      <div className={s.titleGroup}>
        <div>
          <h2 className={s.titleText}>{title}</h2>
          <p className={s.subtitle}>{subtitle}</p>
        </div>
        <button
          onClick={onToggleBatchMode}
          className={`${s.batchBtn} ${isBatchMode ? s.batchBtnActive : ''}`}
        >
          {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
        </button>
      </div>
    </div>

    <div className={s.body}>
      {/* Albums sidebar - Hidden on mobile */}
      {albumSidebar}

      {/* Main Content */}
      <div className={s.main}>
        {/* Loading overlay for initial load */}
        {loading && isInitialLoad && (
          <div className={s.loadingOverlay}>
            <div className={s.spinner} />
          </div>
        )}

        {/* Warning Banner */}
        {warningBanner}

        {/* Error Display */}
        {error && <div className={s.errorBox}>{error}</div>}

        {/* Content Area */}
        <div className={s.content}>{children}</div>
      </div>
    </div>

    {/* Footer Status Bar */}
    <div className={s.footer}>
      <div>{footerLeft}</div>
      <div>{footerRight}</div>
    </div>

    {/* Batch Toolbar */}
    {batchToolbar}
  </div>
);
```

Replace `MediaEmptyState`:

```tsx
export function MediaEmptyState({
  icon,
  message,
}: {
  icon: IconName;
  message: string;
}): React.ReactElement {
  return (
    <div className={s.emptyState}>
      <Icon name={icon} size="lg" className={s.emptyIcon} />
      <p>{message}</p>
    </div>
  );
}
```

Replace `LoadMoreButton`:

```tsx
export function LoadMoreButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <div className={s.loadMoreWrap}>
      <button onClick={onClick} className={s.loadMoreBtn}>
        Load More
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/shared/MediaBrowserLayout.module.css src/client/components/shared/MediaBrowserLayout.tsx && git commit -m "refactor(media-browser-layout): migrate to CSS module with prefixed keyframe"
```

---

### Task 7: Extend CI ratchet + update strict baseline

**Files:**

- Modify: `scripts/check_design_token_usage.ts`

- [ ] **Step 1: Add 5 new files to moduleGovernedFiles**

The Set currently has 15 entries. Add five more:

```ts
    'src/client/components/pages/LegalPage.tsx',
    'src/client/components/shared/DegradedBanner.tsx',
    'src/client/components/shared/SensitiveWarningBanner.tsx',
    'src/client/components/shared/AlbumSidebar.tsx',
    'src/client/components/shared/MediaBrowserLayout.tsx',
```

- [ ] **Step 2: Run the CI ratchet in normal mode**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected: `[design-token-usage] OK`

If any governed file fails the `tailwindUtilityPattern` check, find the remaining Tailwind string and replace it with the appropriate `s.className` reference before continuing.

- [ ] **Step 3: Regenerate the strict baseline**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && WRITE_STRICT_BASELINE=1 npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected output: `[design-token-usage] wrote strict baseline: N files` where N < 147.

- [ ] **Step 4: Verify strict mode passes**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && STRICT_DESIGN_TOKENS=1 npx tsx scripts/check_design_token_usage.ts 2>&1
```

Expected: `[design-token-usage] OK` (no violations beyond the new baseline).

- [ ] **Step 5: Run type-check and lint**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check && pnpm lint 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add scripts/check_design_token_usage.ts scripts/design-token-strict-baseline.json && git commit -m "chore(ci): extend CSS module ratchet to 20 governed files (LegalPage, shared components)"
```

---

## Self-Review

**Spec coverage:**

- ✅ Fix active strict-mode violation (LegalPage) — Task 2
- ✅ Add z-index tokens — Task 1
- ✅ Add warning/danger colour tokens — Task 1
- ✅ Migrate DegradedBanner — Task 3
- ✅ Migrate SensitiveWarningBanner — Task 4
- ✅ Migrate AlbumSidebar — Task 5
- ✅ Migrate MediaBrowserLayout (incl. MediaEmptyState + LoadMoreButton helpers) — Task 6
- ✅ Extend moduleGovernedFiles 15 → 20 — Task 7
- ✅ Regenerate strict baseline to record reduced debt — Task 7

**Placeholder scan:** No TBDs or "implement later" language present.

**Type consistency:**

- `s.albumBtn` / `s.albumBtnSelected` used consistently in Task 5
- `s.batchBtn` / `s.batchBtnActive` used consistently in Task 6
- `--bg-danger-deep`, `--border-danger`, `--text-danger-strong`, `--text-danger` defined in Task 1 and consumed in Tasks 4 and 6
