# CSS Module Migration — Handover Document

**Date:** 2026-03-30
**Status:** Phase 9c complete — 125 advisory files remain

---

## What this migration is

Every `.tsx` component in `src/client/` is being migrated away from inline Tailwind utility strings in `className` attributes toward co-located CSS modules (e.g. `Button.module.css`). The goal is 0 advisory files in the strict baseline, meaning all UI styling lives in typed, tree-shakeable CSS modules backed by design tokens.

## CI enforcement

`scripts/check_design_token_usage.ts` enforces two levels:

1. **Hard failure** (`moduleGovernedFiles` set) — any Tailwind utility string in a governed `.tsx` file causes `pnpm build:prod` to fail. Currently 43 files are governed.
2. **Advisory tracking** (`scripts/design-token-strict-baseline.json`) — counts files with raw Tailwind palette/spacing classes. Currently 125 files.

The repository had already moved beyond the original handover before this update: `Footer.tsx`, `StatsSkeleton.tsx`, `StatsDashboard.tsx`, and `StatsDisplay.tsx` were already migrated and governed in the workspace.

After every phase: regenerate the baseline with `WRITE_STRICT_BASELINE=1 npx tsx scripts/check_design_token_usage.ts`.

## Work completed

| Phase                                                                                                                                                                                | Commits                            | Files governed | Advisory |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------- | -------- |
| 1 — Design system Button                                                                                                                                                             | early history                      | 1              | —        |
| 2 — Glass UI primitives                                                                                                                                                              | —                                  | 5              | —        |
| 3 — Core common (CloseButton, ProgressBar, SourceBadge, Card, Skeleton, Tabs, Tooltip, LoadingIndicator)                                                                             | —                                  | 13             | 136      |
| 4 — FormField, Select                                                                                                                                                                | —                                  | 15             | —        |
| 5 — LoadingPill, TagSelector                                                                                                                                                         | `67319ca8`, `3d60d003`             | 17             | 136      |
| 5b — BatchToolbar, AddToInvestigationButton                                                                                                                                          | `2055c2aa`, `f0027f7a`, `b1588010` | 19             | —        |
| 6 — ErrorBoundary, ToastProvider, SortFilter, SearchFilters                                                                                                                          | (prev session)                     | 23             | 132      |
| 7 — Layout, Breadcrumb, MobileAlbumDropdown, BaseCard, FormLayout, HelpText, TailoredErrorFallback, CircularProgress, LazyImage, WikiLink, CollapsibleSplitPane, ScopedErrorBoundary | `36c756f6`                         | 35             | 132      |
| 8 — MobileMenu                                                                                                                                                                       | `755166ca`                         | 37             | **131**  |
| 8b — Footer                                                                                                                                                                          | existing workspace                 | 38             | 130      |
| 9a — Stats pages (StatsSkeleton, StatsDashboard, StatsDisplay)                                                                                                                       | existing workspace                 | 41             | 127      |
| 9b — FAQPage                                                                                                                                                                         | current workspace                  | 42             | 126      |
| 9c — DataQualityDashboard                                                                                                                                                            | current workspace                  | 43             | **125**  |

## Established patterns (follow these exactly)

### File structure

- Create `ComponentName.module.css` alongside `ComponentName.tsx`
- Import as `import s from './ComponentName.module.css'`
- Reference classes as `s.className`

### CSS token conventions

```css
/* Spacing */
padding: var(--space-4); /* not p-4 */
gap: var(--space-2);

/* Radius */
border-radius: var(--radius-lg); /* not rounded-lg */

/* Colors */
color: var(--text-primary);
background: var(--glass-bg);
border: 1px solid var(--glass-border);

/* Opacity via color-mix */
background: color-mix(in srgb, var(--accent) 20%, transparent); /* not bg-accent/20 */
color: color-mix(in srgb, var(--text-muted) 60%, transparent);

/* Transitions */
transition: background-color var(--duration-fast) var(--easing-liquid);

/* Z-index */
z-index: var(--z-overlay); /* or hardcode if no token */
```

### Tailwind patterns → CSS equivalents

| Tailwind                  | CSS Module                                                        |
| ------------------------- | ----------------------------------------------------------------- |
| `md:hidden`               | `@media (min-width: 768px) { .root { display: none; } }`          |
| `group` / `group-hover:X` | `.parent:hover .child { X }`                                      |
| `group-focus-within:X`    | `.parent:focus-within .child { X }`                               |
| `hover:translate-x-1`     | `.class:hover { transform: translateX(0.25rem); }`                |
| `@keyframes`              | Component-prefixed: `@keyframes componentNameSpin`                |
| `truncate`                | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` |

### Preserved as bare global strings (never wrap in `s.`)

- `custom-scrollbar` — global scrollbar styling
- `mobile-nav`, `app-backdrop` — JS hook targets in Header.tsx
- `dropdown-surface` — global dropdown theming
- `control` — global form control styling
- Toast type classes: `toast-success`, `toast-error`, `toast-info`, `toast-warning`
- `content-shell`, `edge-breakout` — layout globals

### Icon sizing (CSS module governed files)

Lucide icons: use `size={16}` / `size={20}` / `size={24}` prop, not `className="w-4 h-4"`.
Custom `<Icon>` component: keep `size="sm"` prop; remove `className` height/width utilities; add `className={s.iconFoo}` for color.

### Handling `position: 'relative'` false positives

If `tailwindUtilityPattern` triggers on a style object (e.g. `{ position: 'relative' }`), the governed file check will fail. Move inline styles to the CSS module or remove the file from `moduleGovernedFiles` if it only uses global classes + inline styles.

### After each phase

1. `pnpm type-check` — must pass with 0 errors
2. `npx tsx scripts/check_design_token_usage.ts` — must print `OK`
3. `WRITE_STRICT_BASELINE=1 npx tsx scripts/check_design_token_usage.ts` — updates baseline
4. `git add` all changed files + `check_design_token_usage.ts` + `design-token-strict-baseline.json`
5. Commit as `refactor(<scope>): migrate to CSS module`

---

## Remaining work — 125 files

### Phase 9d — Pages (4 files, ordered small → large)

- `src/client/components/pages/MemoryDashboard.tsx` (~579 lines)
- `src/client/components/pages/About.tsx` (~827 lines)
- `src/client/components/pages/EnhancedAnalytics.tsx` (~937 lines)
- `src/client/components/pages/AboutPage.tsx` (~1435 lines)

### Phase 10 — Layout/Navigation (1 large file)

- `src/client/components/layout/GlobalSearch.tsx` (~882 lines) — command palette overlay; complex keyboard navigation, multi-section results list

### Phase 11 — Common (1 very large file)

- `src/client/components/common/EvidenceModal.tsx` (~1912 lines) — the largest single component; full evidence browsing modal with tabs, PDF viewer, annotations

### Phase 12 — Documents (17 files)

- `DocumentAnnotationSystem.tsx`, `DocumentBrowserFilters.tsx`, `DocumentBrowserHeader.tsx`
- `DocumentCard.tsx`, `DocumentContentRenderer.tsx`, `DocumentDiffView.tsx`
- `DocumentHoverPreview.tsx`, `DocumentList.tsx`, `DocumentMetadataPanel.tsx`
- `DocumentModal.tsx`, `DocumentProvenance.tsx`, `DocumentSkeleton.tsx`
- `DocumentUploader.tsx`, `EvidenceAnnotation.tsx`, `InvestigationTextRenderer.tsx`
- `PDFVariantViewer.tsx`, `ProvenancePanel.tsx`
- `subcomponents/DocumentAnalysisTab.tsx`, `DocumentHeader.tsx`, `DocumentMetadataRail.tsx`, `DocumentPDFTab.tsx`

### Phase 13 — Entities (11 files)

- `CreateEntityModal.tsx`, `CreateRelationshipModal.tsx`, `EntityConfidenceDisplay.tsx`
- `EntityEvidencePanel.tsx`, `EntityMediaGallery.tsx`, `EntityRelationshipMapper.tsx`
- `EntityTypeFilter.tsx`, `PersonCard.tsx`, `PersonCardSkeleton.tsx`
- `SubjectCardV2.tsx`, `cards/EvidenceBadge.tsx`

### Phase 14 — Evidence (13 files)

- `ClaimsList.tsx`, `ContactListViewer.tsx`, `DepositionViewer.tsx`
- `DocumentViewer.tsx`, `EmailViewer.tsx`, `EvidenceDocSnippets.tsx`
- `EvidenceFilters.tsx`, `EvidenceLadder.tsx`, `EvidenceResultCard.tsx`
- `ImageViewer.tsx`, `PDFViewer.tsx`, `RedactionPlaceholder.tsx`, `TableViewer.tsx`

### Phase 15 — Investigation (18 files)

- `BoardOnboarding.tsx`, `ChainOfCustodyModal.tsx`, `CommunicationAnalysis.tsx`
- `EvidenceNotebook.tsx`, `EvidencePacketExporter.tsx`, `ForensicAnalysisWorkspace.tsx`
- `ForensicDocumentAnalyzer.tsx`, `ForensicReportGenerator.tsx`, `HypothesisTestingFramework.tsx`
- `InvestigationActivityFeed.tsx`, `InvestigationBoard.tsx`, `InvestigationCaseFolder.tsx`
- `InvestigationEvidencePanel.tsx`, `InvestigationExportTools.tsx`, `InvestigationMemoryPanel.tsx`
- `InvestigationOnboarding.tsx`, `InvestigationTasksPanel.tsx`, `InvestigationTeamManagement.tsx`
- `InvestigationTimelineBuilder.tsx`, `InvestigationWorkspace.tsx`, `MultiSourceCorrelationEngine.tsx`

### Phase 16 — Media (12 files)

- `ArticleCard.tsx`, `ArticleViewerModal.tsx`, `ArticlesTab.tsx`
- `AudioBrowser.tsx`, `AudioPlayer.tsx`, `MediaAndArticlesTab.tsx`
- `MediaViewer.tsx`, `MediaViewerModal.tsx`, `PhotoBrowser.tsx`
- `VideoBrowser.tsx`, `VideoPlayer.tsx`

### Phase 17 — Visualizations (15 files)

- `AreaTimeline.tsx`, `DataIntegrityPanel.tsx`, `DataVisualization.tsx`
- `DataVisualizationEnhanced.tsx`, `DocumentBarChart.tsx`, `EvidenceDrawer.tsx`
- `FinancialTransactionMapper.tsx`, `InteractiveEntityMap.tsx`, `LocationMap.tsx`
- `NetworkGraph.tsx`, `NetworkVisualization.tsx`, `SunburstChart.tsx`
- `Timeline.tsx`, `TimelineVisualization.tsx`, `TreeMap.tsx`

### Phase 18 — Misc root-level & pages (13 files)

- `src/client/App.tsx`
- `src/client/components/ArticleFeed.tsx`
- `src/client/components/BlackBookReview.tsx`, `BlackBookViewer.tsx`
- `src/client/components/EvidenceSearch.tsx`, `FileBrowser.tsx`
- `src/client/components/FinancialTransactionAnalysis.tsx`
- `src/client/components/FirstRunOnboarding.tsx`, `KeyboardShortcutsModal.tsx`
- `src/client/components/PatternRecognitionAI.tsx`, `ReleaseNotesPanel.tsx`, `UndoManager.tsx`
- `src/client/components/admin/ReviewQueuePanel.tsx`
- `src/client/components/faces/FaceGallery.tsx`
- `src/client/components/flights/FlightDetailPanel.tsx`, `FlightTracker.tsx`
- `src/client/components/properties/PropertyBrowseView.tsx`
- `src/client/components/email/EmailClient.tsx`
- `src/client/pages/AdminDashboard.tsx`, `AnalyticsPage.tsx`, `EvidenceDetail.tsx`
- `src/client/pages/LoginPage.tsx`, `PeoplePage.tsx`, `ReviewDashboard.tsx`, `TheEpsteinFilesPage.tsx`

> Note: `src/client/components/ui/GlassButton.tsx` and `GlassDropdown.tsx` appear in the advisory list. These are already `moduleGovernedFiles` and `enforcedFiles` — they have separate `.module.css` files. Their advisory listing likely reflects residual Tailwind spacing/palette classes in utility props passed through from callers, not in the component's own JSX. Investigate before adding to a phase.

---

## Completion criteria

- `scripts/design-token-strict-baseline.json` contains `[]` (0 files)
- `npx tsx scripts/check_design_token_usage.ts` prints `[design-token-usage] OK` with no advisory line
- All files in `src/client/` are either CSS-module governed or use only global utility classes (no Tailwind utility strings in `className` attributes)
