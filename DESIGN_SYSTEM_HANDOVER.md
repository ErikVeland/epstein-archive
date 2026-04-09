# Design System Handover

This migration handoff is now a completion snapshot.
The canonical rules and closeout criteria live in `DESIGN_SYSTEM_MIGRATION.md`.

## Verified Snapshot

- Date: `2026-04-09`
- `pnpm type-check`: passing
- `pnpm exec tsx ./scripts/check_design_token_usage.ts`: passing
- `STRICT_DESIGN_TOKENS=1 pnpm exec tsx ./scripts/check_design_token_usage.ts`: passing
- `pnpm build`: passing
- advisory violations: `0`
- strict-baseline entries: `0`
- governed file count: `166`

## Final State

- `scripts/design-token-strict-baseline.json` is empty.
- `src/client/components/investigation/InvestigationWorkspace.tsx` is now governed.
- Tailwind has been retired from the client build.
- The former trailing migration surfaces are all ratcheted into `scripts/check_design_token_usage.ts`, including:
  - `src/client/components/email/EmailClient.tsx`
  - `src/client/components/investigation/CommunicationAnalysis.tsx`
  - `src/client/components/investigation/InvestigationEvidencePanel.tsx`
  - `src/client/components/investigation/InvestigationWorkspace.tsx`
- The strict checker now reports `OK` with no baseline debt and no new violations.
- `src/client/index.css` no longer contains `@tailwind` directives.
- `postcss.config.js` no longer loads the Tailwind plugin.
- `tailwind.config.js` has been deleted.
- `tailwindcss` has been removed from `package.json`.

## What Finished The Migration

Recent endgame passes completed:

- app and page shells
  - `src/client/App.tsx`
  - `src/client/pages/AdminDashboard.tsx`
  - `src/client/pages/EvidenceDetail.tsx`
  - `src/client/pages/PeoplePage.tsx`
  - `src/client/pages/ReviewDashboard.tsx`
- investigation shells
  - `src/client/components/investigation/CommunicationAnalysis.tsx`
  - `src/client/components/investigation/EvidenceNotebook.tsx`
  - `src/client/components/investigation/ForensicAnalysisWorkspace.tsx`
  - `src/client/components/investigation/ForensicDocumentAnalyzer.tsx`
  - `src/client/components/investigation/ForensicReportGenerator.tsx`
  - `src/client/components/investigation/HypothesisTestingFramework.tsx`
  - `src/client/components/investigation/InvestigationCaseFolder.tsx`
  - `src/client/components/investigation/InvestigationEvidencePanel.tsx`
  - `src/client/components/investigation/InvestigationExportTools.tsx`
  - `src/client/components/investigation/InvestigationTasksPanel.tsx`
  - `src/client/components/investigation/InvestigationTeamManagement.tsx`
  - `src/client/components/investigation/InvestigationTimelineBuilder.tsx`
  - `src/client/components/investigation/InvestigationWorkspace.tsx`
  - `src/client/components/investigation/MultiSourceCorrelationEngine.tsx`
- visualization and feature shells
  - `src/client/components/BlackBookReview.tsx`
  - `src/client/components/BlackBookViewer.tsx`
  - `src/client/components/EvidenceSearch.tsx`
  - `src/client/components/FinancialTransactionAnalysis.tsx`
  - `src/client/components/PatternRecognitionAI.tsx`
  - `src/client/components/email/EmailClient.tsx`
  - `src/client/components/entities/CreateRelationshipModal.tsx`
  - `src/client/components/faces/FaceGallery.tsx`
  - `src/client/components/media/PhotoBrowser.tsx`
  - `src/client/components/visualizations/DataVisualizationEnhanced.tsx`
  - `src/client/components/visualizations/FinancialTransactionMapper.tsx`
  - `src/client/components/visualizations/InteractiveEntityMap.tsx`
  - `src/client/components/visualizations/NetworkGraph.tsx`
  - `src/client/components/visualizations/NetworkVisualization.tsx`
  - `src/client/components/visualizations/Timeline.tsx`
  - `src/client/components/visualizations/TimelineVisualization.tsx`
  - `src/client/components/visualizations/TreeMap.tsx`

## Tailwind Retirement Closeout

Tailwind retirement is complete as of `2026-04-09`.

The remaining utility-dependent client surfaces were converted to CSS modules or existing design-system styling, including:

- [`GlassModal.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/ui/GlassModal.tsx)
- [`GlassTooltip.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/ui/GlassTooltip.tsx)
- [`GlassSwitch.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/ui/GlassSwitch.tsx)
- [`SensitiveContent.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/common/SensitiveContent.tsx)
- [`SignalAnalysis.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/common/SignalAnalysis.tsx)
- [`ViewerShell.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/viewer/ViewerShell.tsx)
- [`FileBrowser.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/FileBrowser.tsx)
- [`DocumentBrowser.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/documents/DocumentBrowser.tsx)
- [`HighlightNavigationControls.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/documents/HighlightNavigationControls.tsx)
- [`PeopleSelector.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/entities/PeopleSelector.tsx)
- [`MediaCard.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/media/MediaCard.tsx)
- [`RouteMap.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/visualizations/RouteMap.tsx)
- [`RedFlagIndex.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/components/visualizations/RedFlagIndex.tsx)
- [`EmailPage.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/pages/EmailPage.tsx)
- [`FlightsPage.tsx`](/Users/veland/Downloads/Epstein%20Files/epstein-archive/src/client/pages/FlightsPage.tsx)

The repo now builds and verifies without Tailwind in the pipeline. Any follow-up design work should be treated as normal maintenance rather than migration or retirement cleanup.
