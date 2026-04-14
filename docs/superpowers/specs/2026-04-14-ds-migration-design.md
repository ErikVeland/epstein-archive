# Design System Migration — Full App Sweep

**Date:** 2026-04-14
**Status:** Approved

## Goal

Complete the in-progress design system migration so every component in `src/client/` uses DS primitives (`Button`, `TextInput`, `SearchField`, `Textarea`, `Select`, `FileInput`) instead of raw HTML form elements. Also closes the CSS global-class-to-module gap started in the working tree.

---

## Section 1: Design System Additions

Three gaps to close before sweeping the app:

### 1a. Missing exports in `lib/index.ts`
Both `SearchField` and `Textarea` already exist in `design-system/components/forms/TextInput.tsx` but are not re-exported from `lib/index.ts`. These are imported by in-progress files (`GlobalSearch`, `TagSelector`, `BatchToolbar`) and will cause build errors until exported.

Add to `lib/index.ts`:
```ts
export * from '../components/forms/TextInput'; // already there — SearchField + Textarea now included
```
Or add explicit named exports alongside the existing `TextInput` export line.

### 1b. New `FileInput` component
**Location:** `src/client/design-system/components/forms/FileInput.tsx`
**Pattern:** Thin wrapper around `<input type="file">` following the same `BaseFieldProps` interface as `TextInput` (density, size, className, rootClassName). Renders a styled label + input pair that respects DS tokens. No drag-drop logic — single-file picker only.

Export from `lib/index.ts`.

---

## Section 2: Migration Rules

All agents apply this mapping uniformly. No logic or structure changes — only element substitution and import additions.

| Raw element | DS replacement | Notes |
|---|---|---|
| `<button>` | `<Button>` | Infer `variant`: destructive→`danger`, primary action→`primary`, most cases→`ghost`. Infer `size` from surrounding UI density. |
| `<input type="text/email/number/password">` | `<TextInput>` | Preserve all HTML attributes. |
| `<input type="search">` | `<SearchField>` | |
| `<input type="file">` | `<FileInput>` | |
| `<select>` | `<Select options={...}>` | Convert `<option>` children to `options` prop array `[{ value, label }]`. |
| `<textarea>` | `<Textarea>` | |
| `className="mr-N"` / `"ml-N"` global utils | `className={s.mrN}` CSS module | Add `.mrN { margin-right: Npx }` to the component's `.module.css` if not already present. |
| Global loading/network class strings | CSS module classes | Follow `FlightNetworkView` pattern: move styles to `.module.css`, reference via `s.className`. |

**Intentional exclusions** (no DS primitive exists):
- `<input type="hidden">`
- `<input type="checkbox">`
- `<input type="radio">`

---

## Section 3: Execution Phases

### Phase 1 — Sequential (blocking)
Must complete before Phase 2 starts.

1. Fix `lib/index.ts` exports (`SearchField`, `Textarea`)
2. Create and export `FileInput` component
3. Complete the 14 partially-migrated files in the current working tree:
   - `NetworkGraph.tsx` — 7 raw `<button>` elements (+ `glass-surface` class)
   - `EvidenceNotebook.tsx` — 1 raw element
   - `ForensicReportGenerator.tsx` — 2 raw `<select>` elements
   - `HypothesisTestingFramework.tsx` — 1 `<textarea>`, 2 `<select>` elements
   - `InvestigationBoard.tsx` — 1 raw element
   - `InvestigationEvidencePanel.tsx` — 2 raw elements
   - `InvestigationTeamManagement.tsx` — 1 `<input type="file">`, 2 `<select>` elements
   - `MultiSourceCorrelationEngine.tsx` — 2 raw elements

### Phase 2 — Parallel agent sweep
Seven agents dispatched simultaneously, each scoped to a domain:

| Agent | Scope |
|---|---|
| `investigation/` | All non-mobile investigation components |
| `documents/` | All document viewer/annotation components |
| `email/` | Email client + `email/mobile/` subcomponents |
| `entities/` | Entity cards, modals, relationship mapper, people selector |
| `visualizations/` | Network, timeline, charts, maps, financial mapper |
| `flights/` + `admin/` + `faces/` + `media/` | Smaller domains bundled |
| `common/` + `layout/` + `pages/` + `shared/` + standalone | Remaining utility components |

Each agent:
- Imports DS primitives from `../../design-system/lib` (or adjust relative path)
- Converts elements per the mapping table
- Adjusts the component's `.module.css` if new utility classes are needed
- Does NOT touch business logic, state, or component structure

---

## Out of Scope

- No new DS components beyond `FileInput`
- No refactoring of component structure or logic
- No changes to `src/server/` or `src/shared/`
- Mobile investigation shell (`investigation/mobile/`) is included in the `investigation/` agent scope
