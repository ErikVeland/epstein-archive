# Design System Handover

This is the operator handoff for the Tailwind-to-design-system migration.
The canonical plan, rules, and completion criteria live in `DESIGN_SYSTEM_MIGRATION.md`.

## Verified Snapshot

- Date: `2026-04-08`
- `pnpm type-check`: passing
- `node ./scripts/check_design_token_usage.ts`: passing
- advisory violations: `38`
- strict-baseline entries: `38`
- governed file count: `131`

## What Was Completed Recently

Recent migration passes moved the repo out of the document/evidence-heavy phase and into the remaining investigation, visualization, entity, and page shells.

Notable recently governed files include:

- Document and evidence surfaces
  - `DocumentViewer`
  - `DocumentContentRenderer`
  - `DocumentAnalysisTab`
  - `DocumentDiffView`
  - `InvestigationTextRenderer`
  - `DocumentModal`
  - `ImageViewer`
  - `PDFViewer`
  - `TableViewer`
  - `RedactionPlaceholder`
- Entity, search, and page surfaces
  - `EntityConfidenceDisplay`
  - `EntityMediaGallery`
  - `GlobalSearch`
  - `AnalyticsPage`
  - `LoginPage`
  - `TheEpsteinFilesPage`
  - `CreateEntityModal`
  - `SubjectCardV2`
- Investigation, admin, and chart shells
  - `EvidencePacketExporter`
  - `DataIntegrityPanel`
  - `UndoManager`
  - `FirstRunOnboarding`
  - `LocationMap`
  - `EvidenceDrawer`
  - `InvestigationOnboarding`
  - `ReviewQueuePanel`
  - `ReleaseNotesPanel`
  - `ArticleFeed`
  - `InvestigationActivityFeed`
  - `InvestigationMemoryPanel`
  - `SunburstChart`
  - `AreaTimeline`

## Remaining Strict Baseline

The remaining strict-baseline files are:

- `src/client/App.tsx`
- `src/client/components/BlackBookReview.tsx`
- `src/client/components/BlackBookViewer.tsx`
- `src/client/components/EvidenceSearch.tsx`
- `src/client/components/FileBrowser.tsx`
- `src/client/components/FinancialTransactionAnalysis.tsx`
- `src/client/components/PatternRecognitionAI.tsx`
- `src/client/components/media/PhotoBrowser.tsx`
- `src/client/components/email/EmailClient.tsx`
- `src/client/components/entities/CreateRelationshipModal.tsx`
- `src/client/components/faces/FaceGallery.tsx`
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
- `src/client/components/visualizations/DataVisualization.tsx`
- `src/client/components/visualizations/DataVisualizationEnhanced.tsx`
- `src/client/components/visualizations/FinancialTransactionMapper.tsx`
- `src/client/components/visualizations/InteractiveEntityMap.tsx`
- `src/client/components/visualizations/NetworkGraph.tsx`
- `src/client/components/visualizations/NetworkVisualization.tsx`
- `src/client/components/visualizations/Timeline.tsx`
- `src/client/components/visualizations/TimelineVisualization.tsx`
- `src/client/components/visualizations/TreeMap.tsx`
- `src/client/pages/AdminDashboard.tsx`
- `src/client/pages/EvidenceDetail.tsx`
- `src/client/pages/PeoplePage.tsx`
- `src/client/pages/ReviewDashboard.tsx`

## Recommended Next Order

Take the remaining work in this order unless a nearby file offers a clearly smaller ratchet step:

1. Entity and modal follow-up
   - `CreateRelationshipModal.tsx`
2. Remaining standalone media and communication surfaces
   - `PhotoBrowser.tsx`
   - `EmailClient.tsx`
   - `FaceGallery.tsx`
3. Investigation shell cluster
   - `CommunicationAnalysis.tsx`
   - `EvidenceNotebook.tsx`
   - `InvestigationExportTools.tsx`
   - `InvestigationTasksPanel.tsx`
   - `InvestigationTimelineBuilder.tsx`
4. Visualization shell cluster
   - `Timeline.tsx`
   - `TimelineVisualization.tsx`
   - `NetworkGraph.tsx`
   - `NetworkVisualization.tsx`
   - `InteractiveEntityMap.tsx`
   - `FinancialTransactionMapper.tsx`
5. Heavier page and app shells
   - `PeoplePage.tsx`
   - `EvidenceDetail.tsx`
   - `AdminDashboard.tsx`
   - `ReviewDashboard.tsx`
   - `App.tsx`

## Rules For The Next Pass

- Do not treat the migration as a redesign.
- Keep changes styling-only unless a local type or safety fix is required to complete the extraction.
- Add files to `scripts/check_design_token_usage.ts` only after raw utility strings are removed.
- Remove the same files from `scripts/design-token-strict-baseline.json` in the same pass.
- Re-run:
  - `pnpm type-check`
  - `node ./scripts/check_design_token_usage.ts`
- Update both docs after each batch:
  - `DESIGN_SYSTEM_MIGRATION.md`
  - `DESIGN_SYSTEM_HANDOVER.md`

## Completion Condition

The migration is only finished when:

- `scripts/design-token-strict-baseline.json` is empty or intentionally reduced to an approved tiny exemption set.
- `node ./scripts/check_design_token_usage.ts` reports no remaining advisory debt blocking Tailwind retirement.
- Tailwind removal can be evaluated safely without visual or interaction regressions.
