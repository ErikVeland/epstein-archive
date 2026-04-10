# Mobile Investigation Shell — Design Spec

**Date:** 2026-04-10
**Status:** Approved
**Scope:** Mobile-first redesign of the Investigation Workspace for field investigators

---

## Context

The Investigation Workspace (`InvestigationWorkspace.tsx`) is a 10-tab desktop shell containing a kanban board, evidence matrix, analyst notebook, event chronology, forensic workbench, communications analysis, network visualisation, hypotheses framework, team management, and export tools. All tabs assume desktop widths, multi-panel split views, and pointer interaction.

The primary mobile user is a **field investigator**: adding evidence in motion, updating leads, logging observations. Their primary action is **evidence capture**. Their workflow is **capture now, organise later** — no mandatory tagging, linking, or metadata at the moment of capture.

---

## Architecture: Bottom Sheet Shell (Approach C)

The desktop workspace is **unchanged**. On mobile (`max-width: 767px`), `InvestigationWorkspace` renders a parallel `MobileInvestigationShell` component in place of the tab strip and content area. Both surfaces share the same data, API calls, and underlying components — the mobile shell is a layout and interaction layer, not a data layer.

### Routing

`InvestigationWorkspace` detects mobile via a `useIsMobile()` hook (matches `(max-width: 767px)` via `window.matchMedia`). When mobile, it renders `<MobileInvestigationShell>` passing through the same props it already receives. The desktop tab strip and content area are not rendered.

---

## New Components

### 1. `MobileInvestigationShell`

**File:** `src/client/components/investigation/mobile/MobileInvestigationShell.tsx`

Root container for all mobile investigation UI. Receives the same props as `InvestigationWorkspace`. Renders:

- `MobileInvestigationHeader` — investigation name and notification icon
- Active destination content (Board / Evidence / Activity / More tool)
- `MobileBottomNav` — persistent bottom navigation bar
- `EvidenceCaptureSheet` — conditionally rendered when capture is open

**State owned here:**

- `activeDest: 'board' | 'evidence' | 'activity'`
- `captureOpen: boolean`
- `moreDest: string | null` — which More tool is open, or null
- `moreOpen: boolean`

### 2. `MobileBottomNav`

**File:** `src/client/components/investigation/mobile/MobileBottomNav.tsx`
**CSS:** `MobileBottomNav.module.css`

Persistent bar fixed to the bottom of the viewport. Five slots:

| Position | Label    | Icon              | Action                      |
| -------- | -------- | ----------------- | --------------------------- |
| 1        | Board    | `LayoutDashboard` | `setActiveDest('board')`    |
| 2        | Evidence | `FileText`        | `setActiveDest('evidence')` |
| 3        | Capture  | `Plus`            | `setCaptureOpen(true)`      |
| 4        | Activity | `Activity`        | `setActiveDest('activity')` |
| 5        | More     | `MoreHorizontal`  | `setMoreOpen(true)`         |

The Capture slot renders a raised circular FAB (`width: 3rem; height: 3rem; border-radius: 50%`) elevated `margin-top: -1.125rem` above the nav bar. Active destination is indicated by accent colour on label and icon. Capture FAB is always accent-coloured regardless of active destination.

Includes `padding-bottom: env(safe-area-inset-bottom)` for iPhone home indicator.

### 3. `EvidenceCaptureSheet`

**File:** `src/client/components/investigation/mobile/EvidenceCaptureSheet.tsx`
**CSS:** `EvidenceCaptureSheet.module.css`

Full-screen bottom sheet triggered by the Capture FAB. Renders over a dimmed backdrop (`rgba(0,0,0,0.55)`). Dismisses on: save, X button, swipe-down gesture, backdrop tap.

**Three capture modes** (tab strip inside sheet):

| Mode | Icon        | Input                                                                     |
| ---- | ----------- | ------------------------------------------------------------------------- |
| Note | `FileText`  | `<textarea>` — freeform text, 2000 char limit                             |
| File | `Paperclip` | `<input type="file" accept="*">` — opens device file picker / camera roll |
| URL  | `Link`      | `<input type="url">` + optional note textarea                             |

**Required field:** content only (text / file / URL). Everything else is optional.

**Optional fields (shown but not required):**

- **Type** — dropdown, defaults to "Auto". Server auto-classifies on save; this allows override. Options: Auto, Document, Testimony, Photo, URL, Note, Financial, Other.
- **Tag person** — autocomplete input searching known subjects in the investigation. Single tag only at capture time.

**Save behaviour:**

- Calls the existing evidence creation API endpoint.
- Evidence is saved with `status: 'unsorted'` and linked to the current investigation.
- Sheet closes immediately on save (optimistic).
- Toast notification confirms: "Evidence saved — added to unsorted queue". Toast links to the saved item in the Evidence tab.
- Save button is disabled until the content field contains at least one character (or a file is selected).

**Swipe-down to dismiss:** tracked via `touchstart` / `touchmove` / `touchend`. If downward delta > 80px, dismiss.

### 4. `MobileBoardView`

**File:** `src/client/components/investigation/mobile/MobileBoardView.tsx`
**CSS:** `MobileBoardView.module.css`

Replaces `InvestigationBoard` on mobile. The three kanban columns (Hypotheses, Evidence, Narrative) are rendered one at a time. A segmented control at the top switches between columns. Swipe left/right also switches columns (tracked via touch events).

**Per-column card:** title, type badge, supporting/conflicting count (hypotheses) or confidence badge (evidence), and inline action buttons (View, Move).

The "Add" button per column opens a lightweight sheet — title field only, same save-to-unsorted pattern as evidence capture. Full card editing goes to desktop.

Drag-and-drop is **not implemented** on mobile. Card reordering is desktop-only. Move action opens a sheet asking which column to move the card to.

### 5. `MobileEvidenceList`

**File:** `src/client/components/investigation/mobile/MobileEvidenceList.tsx`
**CSS:** `MobileEvidenceList.module.css`

Replaces `InvestigationEvidencePanel` on mobile. Single-column scrollable card list.

**Structure:**

- Sticky search bar at top
- Horizontally scrollable filter chip row: All, Documents, Testimony, Unsorted, Flagged, + more
- Grouped cards: "Unsorted" group floats to top with a blue dot indicator when new items exist
- Each card: type label + confidence colour, title, verification badge, link count, Flag + View actions

**Tap to view:** opens the existing `EvidenceModal` (already mobile-safe).

### 6. `MobileMoreDrawer`

**File:** `src/client/components/investigation/mobile/MobileMoreDrawer.tsx`
**CSS:** `MobileMoreDrawer.module.css`

Bottom sheet listing all remaining investigation tools. Opens from the More nav item. Each row: icon, tool name, subtitle, chevron. Tapping a row closes the drawer and opens the tool full-screen.

**Tools listed:**

| Tool               | Subtitle                   | Opens                                        |
| ------------------ | -------------------------- | -------------------------------------------- |
| Event Chronology   | Timeline of events         | `MobileTimelineView`                         |
| Forensic Workbench | Document analysis, network | `MobileForensicView`                         |
| Communications     | Pattern analysis           | `CommunicationAnalysis` (single-column)      |
| Hypotheses         | Test and refine theories   | `HypothesisTestingFramework` (single-column) |
| Export & Report    | Generate forensic report   | `InvestigationExportTools` (single-column)   |

### 7. `MobileToolScreen`

**File:** `src/client/components/investigation/mobile/MobileToolScreen.tsx`

Wrapper for tools opened from More. Provides:

- Back navigation header: "‹ More | Tool Name" + optional action button (e.g., "+ Add")
- Scrollable content area
- Bottom bar with "Swipe down or tap ‹ More to return" hint (fades after first use)
- Swipe-down-to-dismiss gesture (same as capture sheet, 80px threshold)

### 8. `MobileTimelineView`

**File:** `src/client/components/investigation/mobile/MobileTimelineView.tsx`

Renders `timelineEvents` (already available in `InvestigationWorkspace`) as a vertical scroll list:

- Year-group dividers
- Each event: coloured dot (event type colour), date, title, type badge, document count badge
- Tap to expand inline detail (location, description, linked evidence)
- "+ Add" in `MobileToolScreen` header opens a minimal event creation sheet: date, title, type. Full editing on desktop.

### 9. `MobileForensicView`

**File:** `src/client/components/investigation/mobile/MobileForensicView.tsx`

Renders the five forensic sub-tools via a horizontal scroll tab strip (replacing the collapsible desktop sidebar):

| Tab         | Renders                                             |
| ----------- | --------------------------------------------------- |
| Documents   | `ForensicDocumentAnalyzer` in single-column mode    |
| Entities    | `EntityRelationshipMapper` read-only, single-column |
| Financial   | `FinancialTransactionMapper` single-column          |
| Correlation | `MultiSourceCorrelationEngine` single-column        |
| Reports     | `ForensicReportGenerator` single-column             |

Each sub-tool receives a `mobileMode: true` prop. In mobile mode, the tool hides its own internal sidebar/header, renders only its result cards in a scrollable single column, and surfaces a primary action ("Add to evidence", "Run analysis") at card level rather than in a toolbar.

The network graph (`analytics` tab on desktop — `NetworkVisualization`) is **read-only on mobile**: rendered as a pinch/zoom canvas with no editing controls. A persistent banner reads "Editing available on desktop". This component is not in the More list; it is accessible via the `MobileForensicView` Entities tab.

---

## Navigation Model

```
MobileInvestigationShell
├── MobileInvestigationHeader
├── [activeDest === 'board']    → MobileBoardView
├── [activeDest === 'evidence'] → MobileEvidenceList
├── [activeDest === 'activity'] → InvestigationActivityFeed (existing, no changes needed)
├── [captureOpen]               → EvidenceCaptureSheet (portal, over everything)
├── [moreOpen && !moreDest]     → MobileMoreDrawer (bottom sheet)
└── [moreDest]                  → MobileToolScreen wrapping destination component
```

---

## `useIsMobile` Hook

**File:** `src/client/hooks/useIsMobile.ts`

```ts
// Returns true when viewport matches (max-width: 767px).
// Re-evaluates on resize via matchMedia listener.
export function useIsMobile(): boolean;
```

Single source of truth for mobile breakpoint used throughout the investigation shell. Uses `window.matchMedia('(max-width: 767px)')` with a `change` event listener. SSR-safe (returns `false` on first render if `window` is unavailable).

---

## Styling Conventions

- All mobile investigation CSS lives in `src/client/components/investigation/mobile/`
- Uses existing design tokens (`--lq-surface-*`, `--glass-*`, `--accent`, `--space-*`, `--radius-*`)
- No new CSS variables introduced
- Bottom nav height: `4.5rem` (`72px`)
- FAB elevation: `margin-top: -1.125rem` (18px above nav bar)
- Sheet border-radius top: `var(--radius-xl)` (20px)
- Drag handle: `36px × 4px`, `background: rgba(255,255,255,0.18)`, `border-radius: 2px`
- All touch targets: `min-height: 2.75rem` (44px)
- Safe area: `padding-bottom: env(safe-area-inset-bottom)` on bottom nav and sheet footers

---

## Desktop Compatibility

The desktop `InvestigationWorkspace` is **unchanged**. No existing component is modified except:

1. `InvestigationWorkspace.tsx` — add `useIsMobile()` call and conditional render of `MobileInvestigationShell` vs existing tab UI.
2. Sub-tools that receive `mobileMode?: boolean` prop — add prop to their interface and use it to suppress internal sidebars/toolbars on mobile. This is additive; desktop behaviour is unaffected.

---

## Out of Scope

The following are desktop-only and will not be adapted for mobile:

- Drag-and-drop card reordering on the Board
- Network graph editing
- Full evidence metadata form (chain of custody, confidence rating, source citation)
- Multi-panel split views in forensic sub-tools
- InvestigationTeamManagement (admin function, low mobile usage)

---

## Files To Create

```
src/client/components/investigation/mobile/
  MobileInvestigationShell.tsx
  MobileInvestigationShell.module.css
  MobileBottomNav.tsx
  MobileBottomNav.module.css
  EvidenceCaptureSheet.tsx
  EvidenceCaptureSheet.module.css
  MobileBoardView.tsx
  MobileBoardView.module.css
  MobileEvidenceList.tsx
  MobileEvidenceList.module.css
  MobileMoreDrawer.tsx
  MobileMoreDrawer.module.css
  MobileToolScreen.tsx
  MobileToolScreen.module.css
  MobileTimelineView.tsx
  MobileTimelineView.module.css
  MobileForensicView.tsx
  MobileForensicView.module.css

src/client/hooks/useIsMobile.ts
```

## Files To Modify

```
src/client/components/investigation/InvestigationWorkspace.tsx
  — add useIsMobile(), conditionally render MobileInvestigationShell

src/client/components/investigation/ForensicDocumentAnalyzer.tsx
src/client/components/investigation/MultiSourceCorrelationEngine.tsx
src/client/components/investigation/ForensicReportGenerator.tsx
src/client/components/investigation/CommunicationAnalysis.tsx
src/client/components/investigation/HypothesisTestingFramework.tsx
  — add optional mobileMode?: boolean prop to suppress internal sidebars
```
