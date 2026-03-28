# Media Browser Consolidation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicated inline album sidebar and mobile dropdown code in all three media browsers with the shared `AlbumSidebar` and `MobileAlbumDropdown` components, add the missing mobile album selector to `AudioBrowser`, and wire `SEO` into all three browsers for consistent page titles.

**Architecture:** Three media browsers (AudioBrowser, VideoBrowser, PhotoBrowser) each contain hand-rolled copies of the same album sidebar and mobile dropdown UI. Shared components (`AlbumSidebar`, `MobileAlbumDropdown`) already exist in `src/client/components/shared/` but are unused. Each browser's outer layout and header remain unchanged — only the sidebar and mobile dropdown blocks are replaced. `SEO` component uses `react-helmet-async` and is already defined; just needs to be rendered inside each browser's return.

**Tech Stack:** React 18, TypeScript, existing shared components in `src/client/components/shared/`

**Base SHA:** `562a221fe5865e4a66a075872b59b772af627056`

---

## Key Types

**`MediaAlbum`** (from `src/client/hooks/useMediaBrowser.ts`):

```ts
interface MediaAlbum {
  id: number;
  name: string;
  description?: string;
  itemCount: number;
  sensitiveCount?: number;
}
```

**`AlbumSidebar` props** (from `src/client/components/shared/AlbumSidebar.tsx`):

```ts
interface AlbumSidebarProps {
  albums: MediaAlbum[];
  selectedAlbum: number | null;
  onSelectAlbum: (albumId: number | null) => void;
  totalItemCount: number;
  allLabel: string;
}
```

**`MobileAlbumDropdown` props** (from `src/client/components/shared/MobileAlbumDropdown.tsx`):

```ts
interface MobileAlbumDropdownProps {
  albums: MediaAlbum[];
  selectedAlbum: number | null;
  onSelectAlbum: (albumId: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  totalItemCount: number;
  allLabel: string;
  currentAlbumName?: string;
}
```

**Important — PhotoBrowser type mismatch:** PhotoBrowser's `Album` type (from `src/types/media.types.ts`) uses `imageCount?: number`, not `itemCount`. When passing photo albums to `AlbumSidebar` / `MobileAlbumDropdown`, map them first:

```ts
const adaptedAlbums = albums.map((a) => ({ ...a, itemCount: a.imageCount ?? 0 }));
```

---

## File Map

**Modify:**

- `src/client/components/media/AudioBrowser.tsx` — uncomment dropdown state, import + wire AlbumSidebar + MobileAlbumDropdown + SEO
- `src/client/components/media/VideoBrowser.tsx` — import + wire AlbumSidebar + MobileAlbumDropdown + SEO
- `src/client/components/media/PhotoBrowser.tsx` — import + wire AlbumSidebar + MobileAlbumDropdown + SEO (with imageCount→itemCount map)

---

### Task 1: Wire AlbumSidebar + MobileAlbumDropdown + SEO into AudioBrowser

AudioBrowser already has all the state (`albums`, `selectedAlbum`, `setSelectedAlbum`, `libraryTotalCount`, `currentAlbum`) but is missing:

1. The mobile album dropdown entirely (the state was commented out: `// const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);`)
2. Uses of the shared components (has inline `<aside>`)

**Files:**

- Modify: `src/client/components/media/AudioBrowser.tsx`

- [ ] **Step 1: Write the failing type-check baseline**

Run type-check first to confirm baseline:

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -5
```

Expected: 0 errors (or note existing errors to compare after changes).

- [ ] **Step 2: Add imports**

At the top of `AudioBrowser.tsx`, add these three imports after the existing imports:

```tsx
import { AlbumSidebar } from '../shared/AlbumSidebar';
import { MobileAlbumDropdown } from '../shared/MobileAlbumDropdown';
import { SEO } from '../common/SEO';
```

- [ ] **Step 3: Uncomment showAlbumDropdown state**

Find this commented line (around line 88):

```tsx
// const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
```

Replace with:

```tsx
const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
```

- [ ] **Step 4: Add SEO before the outer div**

The AudioBrowser's return starts with:

```tsx
  return (
    <div className="flex flex-col h-full min-h-[500px] bg-[var(--app-bg)] ...">
```

Change to:

```tsx
  return (
    <>
      <SEO
        title={currentAlbum ? `${currentAlbum.name} — Audio` : 'Audio Recordings'}
        description="Forensic audio evidence and transcripts from the Epstein files."
      />
      <div className="flex flex-col h-full min-h-[500px] bg-[var(--app-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] overflow-hidden rounded-[var(--radius-lg)]">
```

And close with `</>` at the end of the return.

- [ ] **Step 5: Add MobileAlbumDropdown to the header**

The header div starts at (approximately line 615):

```tsx
      {/* Header */}
      <div className="app-header-glass px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0 z-10">
        <div className="flex flex-col gap-1">
```

Add `<MobileAlbumDropdown>` as the first child of the header div, before the existing `<div className="flex flex-col gap-1">`:

```tsx
      {/* Header */}
      <div className="app-header-glass px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0 z-10">
        <MobileAlbumDropdown
          albums={albums}
          selectedAlbum={selectedAlbum}
          onSelectAlbum={setSelectedAlbum}
          isOpen={showAlbumDropdown}
          onToggle={() => setShowAlbumDropdown((v) => !v)}
          totalItemCount={libraryTotalCount}
          allLabel="All Audio"
          currentAlbumName={currentAlbum?.name}
        />
        <div className="flex flex-col gap-1">
```

- [ ] **Step 6: Replace inline album aside with AlbumSidebar**

Find and delete the inline `<aside>` block. It looks like this (approximately lines 730–758):

```tsx
{
  /* Albums sidebar - Hidden on mobile */
}
<aside className="hidden md:flex w-60 bg-[var(--glass-bg-strong)] border-r border-[var(--glass-border)] flex-col shrink-0">
  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
    Albums
  </h3>
  <div className="flex-1 overflow-y-auto">
    <button
      className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === null ? 'bg-cyan-900/20 text-[var(--accent)] border-l-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border-l-2 border-transparent'}`}
      onClick={() => setSelectedAlbum(null)}
    >
      <span className="truncate">All Audio</span>
      <span className="text-xs opacity-70 bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
        {libraryTotalCount}
      </span>
    </button>
    {albums.map((album) => (
      <button
        key={album.id}
        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-[var(--accent)] border-l-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border-l-2 border-transparent'}`}
        onClick={() => setSelectedAlbum(album.id)}
        title={album.name}
      >
        <span className="truncate">{album.name}</span>
        <span className="text-xs opacity-70 bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
          {album.itemCount || 0}
        </span>
      </button>
    ))}
  </div>
</aside>;
```

Replace with:

```tsx
<AlbumSidebar
  albums={albums}
  selectedAlbum={selectedAlbum}
  onSelectAlbum={setSelectedAlbum}
  totalItemCount={libraryTotalCount}
  allLabel="All Audio"
/>
```

- [ ] **Step 7: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors. If errors, fix them before continuing.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/media/AudioBrowser.tsx && git commit -m "feat(audio): wire AlbumSidebar, add MobileAlbumDropdown, add SEO"
```

---

### Task 2: Wire AlbumSidebar + MobileAlbumDropdown + SEO into VideoBrowser

VideoBrowser already has the mobile dropdown state (`showAlbumDropdown`) and the inline implementations of both. We're replacing both with the shared components.

**Files:**

- Modify: `src/client/components/media/VideoBrowser.tsx`

- [ ] **Step 1: Add imports**

At the top of `VideoBrowser.tsx`, add after existing imports:

```tsx
import { AlbumSidebar } from '../shared/AlbumSidebar';
import { MobileAlbumDropdown } from '../shared/MobileAlbumDropdown';
import { SEO } from '../common/SEO';
```

- [ ] **Step 2: Add SEO before outer div**

The VideoBrowser return starts with:

```tsx
  return (
    <div className="flex flex-col h-full min-h-[500px] bg-[var(--app-bg)] border ...">
```

Change to:

```tsx
  return (
    <>
      <SEO
        title={currentAlbum ? `${currentAlbum.name} — Video` : 'Video Recordings'}
        description="Forensic video evidence from the Epstein files."
      />
      <div className="flex flex-col h-full min-h-[500px] bg-[var(--app-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] overflow-hidden rounded-[var(--radius-lg)]">
```

And close with `</>` at the end of the return.

- [ ] **Step 3: Replace inline mobile dropdown**

Find the inline mobile dropdown block (approximately lines 316–354):

```tsx
{
  /* Mobile Album Dropdown */
}
<div className="md:hidden">
  <button
    onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
    className="w-full flex items-center justify-between px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] text-sm h-8"
  >
    <span className="flex items-center gap-2">
      <Icon name="Folder" size="sm" />
      {selectedAlbum ? currentAlbum?.name : 'All Videos'}
    </span>
    <Icon name={showAlbumDropdown ? 'ChevronUp' : 'ChevronDown'} size="sm" />
  </button>
  {showAlbumDropdown && (
    <div className="absolute left-3 right-3 mt-1 dropdown-surface z-30 max-h-60 overflow-y-auto">
      <button
        className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between ${selectedAlbum === null ? 'bg-cyan-900/20 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'}`}
        onClick={() => {
          setSelectedAlbum(null);
          setShowAlbumDropdown(false);
        }}
      >
        <span>All Videos</span>
        <span className="text-xs opacity-70">{libraryTotalCount}</span>
      </button>
      {albums.map((album) => (
        <button
          key={album.id}
          className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between border-t border-[var(--glass-border)] ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'}`}
          onClick={() => {
            setSelectedAlbum(album.id);
            setShowAlbumDropdown(false);
          }}
        >
          <span className="truncate">{album.name}</span>
          <span className="text-xs opacity-70">{album.itemCount || 0}</span>
        </button>
      ))}
    </div>
  )}
</div>;
```

Replace with:

```tsx
<MobileAlbumDropdown
  albums={albums}
  selectedAlbum={selectedAlbum}
  onSelectAlbum={setSelectedAlbum}
  isOpen={showAlbumDropdown}
  onToggle={() => setShowAlbumDropdown((v) => !v)}
  totalItemCount={libraryTotalCount}
  allLabel="All Videos"
  currentAlbumName={currentAlbum?.name}
/>
```

- [ ] **Step 4: Replace inline aside**

Find the inline `<aside>` block (approximately lines 403–431):

```tsx
{
  /* Albums sidebar - Hidden on mobile */
}
<aside className="hidden md:flex w-60 bg-[var(--glass-bg-strong)] border-r border-[var(--glass-border)] flex-col shrink-0">
  <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
    Albums
  </h3>
  <div className="flex-1 overflow-y-auto">
    <button
      className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === null ? 'bg-cyan-900/20 text-[var(--accent)] border-l-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border-l-2 border-transparent'}`}
      onClick={() => setSelectedAlbum(null)}
    >
      <span className="truncate">All Videos</span>
      <span className="text-xs opacity-70 bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
        {libraryTotalCount}
      </span>
    </button>
    {albums.map((album) => (
      <button
        key={album.id}
        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-[var(--accent)] border-l-2 border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border-l-2 border-transparent'}`}
        onClick={() => setSelectedAlbum(album.id)}
        title={album.name}
      >
        <span className="truncate">{album.name}</span>
        <span className="text-xs opacity-70 bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
          {album.itemCount || 0}
        </span>
      </button>
    ))}
  </div>
</aside>;
```

Replace with:

```tsx
<AlbumSidebar
  albums={albums}
  selectedAlbum={selectedAlbum}
  onSelectAlbum={setSelectedAlbum}
  totalItemCount={libraryTotalCount}
  allLabel="All Videos"
/>
```

- [ ] **Step 5: Run type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/media/VideoBrowser.tsx && git commit -m "feat(video): wire AlbumSidebar, MobileAlbumDropdown, add SEO"
```

---

### Task 3: Wire AlbumSidebar + MobileAlbumDropdown + SEO into PhotoBrowser

PhotoBrowser's `albums` array comes from `usePhotoBrowserData` and has type `Album` (from `src/types/media.types.ts`), which uses `imageCount?: number` instead of `itemCount`. Must map before passing to shared components.

**Files:**

- Modify: `src/client/components/media/PhotoBrowser.tsx`

- [ ] **Step 1: Add imports**

At the top of `PhotoBrowser.tsx`, add after existing imports:

```tsx
import { AlbumSidebar } from '../shared/AlbumSidebar';
import { MobileAlbumDropdown } from '../shared/MobileAlbumDropdown';
import { SEO } from './SEO';
```

Wait — `PhotoBrowser.tsx` is in `src/client/components/media/` and `SEO.tsx` is in `src/client/components/common/`. Use:

```tsx
import { SEO } from '../common/SEO';
```

- [ ] **Step 2: Add adaptedAlbums derived value**

After all the existing `useMemo` / state declarations in the component body, add:

```tsx
const adaptedAlbums = useMemo(
  () => albums.map((a) => ({ ...a, itemCount: a.imageCount ?? 0 })),
  [albums],
);
```

`albums` here is whatever the hook returns (check the exact variable name from the hook destructure in PhotoBrowser — look for the destructure of `usePhotoBrowserData`).

- [ ] **Step 3: Find the current album name**

PhotoBrowser already computes the selected album name to display in the mobile dropdown. Find the variable — it should be something like:

```tsx
albums.find((a) => a.id === selectedAlbum)?.name;
```

This is used inline in the dropdown. Extract it as a memo if not already extracted:

```tsx
const currentPhotoAlbum = useMemo(
  () => albums.find((a) => a.id === selectedAlbum),
  [albums, selectedAlbum],
);
```

- [ ] **Step 4: Add SEO before outer div**

The PhotoBrowser return starts with:

```tsx
  return (
    <div className="flex flex-col h-full min-h-[500px] bg-[var(--app-bg)] border ...">
```

Change to:

```tsx
  return (
    <>
      <SEO
        title={currentPhotoAlbum ? `${currentPhotoAlbum.name} — Photos` : 'Photos'}
        description="Forensic photographic evidence from the Epstein files."
      />
      <div className="flex flex-col h-full min-h-[500px] bg-[var(--app-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] overflow-hidden rounded-[var(--radius-lg)]">
```

Close with `</>` at end of return.

- [ ] **Step 5: Replace inline mobile dropdown in PhotoBrowser**

Find the inline mobile dropdown block in the PhotoBrowser header (approximately lines 616–654). The block starts with `{/* Mobile Album Dropdown */}` and contains the `md:hidden` div with the button and dropdown list.

Replace the entire `<div className="md:hidden">...</div>` block with:

```tsx
<MobileAlbumDropdown
  albums={adaptedAlbums}
  selectedAlbum={selectedAlbum}
  onSelectAlbum={setSelectedAlbum}
  isOpen={showAlbumDropdown}
  onToggle={() => setShowAlbumDropdown((v) => !v)}
  totalItemCount={libraryTotalCount}
  allLabel="All Photos"
  currentAlbumName={currentPhotoAlbum?.name}
/>
```

Where `selectedAlbum`, `setSelectedAlbum`, `showAlbumDropdown`, `setShowAlbumDropdown`, and `libraryTotalCount` are the existing state variables from `usePhotoBrowserData`. Check their exact names in the hook destructure at the top of the component.

- [ ] **Step 6: Replace inline aside in PhotoBrowser**

Find the desktop album `<aside>` block (approximately lines 787–815). It has the same pattern as Audio/Video: `hidden md:flex w-60 bg-[var(--glass-bg-strong)]...`.

Replace the entire `<aside>` block with:

```tsx
<AlbumSidebar
  albums={adaptedAlbums}
  selectedAlbum={selectedAlbum}
  onSelectAlbum={setSelectedAlbum}
  totalItemCount={libraryTotalCount}
  allLabel="All Photos"
/>
```

- [ ] **Step 7: Remove now-unused Icon imports (if applicable)**

The inline dropdowns imported `Icon` for `Folder`, `ChevronUp`, `ChevronDown`. If `Icon` is still used elsewhere in PhotoBrowser (grid cells, search icon, etc.), leave the import. If not, remove it.

Run:

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check 2>&1 | tail -10
```

Expected: 0 errors. TypeScript will catch unused imports if `noUnusedLocals` is on, or tsc will catch them in strict mode.

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add src/client/components/media/PhotoBrowser.tsx && git commit -m "feat(photo): wire AlbumSidebar, MobileAlbumDropdown, add SEO"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full type-check**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 2: Lint**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Smoke test**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && pnpm test:smoke
```

Expected: All pass.

- [ ] **Step 4: Commit if any lint fixes were needed**

```bash
cd "/Volumes/Media/Epstein Files/epstein-archive" && git add -p && git commit -m "fix: lint cleanup after media browser consolidation"
```
