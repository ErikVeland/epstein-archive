# Unified Gap Inventory Resolution Tasks

## Frontend

- [x] **C-1**: Fix nullable `article.author` in `ArticleDetailPage.tsx` and `ArticleViewerModal.tsx`.
- [x] **C-2**: Fix nullable `p.role` in `FlightDetailPage.tsx`, `FlightDetailPanel.tsx`, `FlightCard.tsx`.
- [x] **H-1**: Fix divide-by-zero NaN in `StatsDashboard.tsx` and `DataVisualizationEnhanced.tsx`.
- [x] **H-2**: Fix `Math.max(...emptyArray)` in `FlightStatsView.tsx`.
- [x] **H-3**: Handle nullable `fileSize` in `EvidenceDetail.tsx`.
- [x] **M-8**: Surface React Query errors in `useSubjectsQuery`, `useDocumentBrowserData`.
- [x] **M-9**: Surface thread load errors in `useEmailWorkspaceData`.

## Backend Database

- [x] **C-3**: Fix INNER JOIN chain in `investigationsRepository.ts` (`getInvestigationsByEntityId`).
- [x] **C-4**: Fix `getEvidenceByType` joins in `investigationsRepository.ts`.
- [x] **C-5**: Fix `getTransactionsForEntity` in `entityEvidenceRepository.ts`.
- [x] **C-6**: Return actual `riskScore` and `confidence` in `relationshipsRepository.ts`.
- [x] **C-7**: Fix `GROUP BY` canonical_id collapsing unmerged entities in `relationshipsRepository.ts`.
- [x] **H-4**: Refactor fuzzy ILIKE in `getFlightsForEntity` in `entityEvidenceRepository.ts`.
- [x] **H-5**: Fix INNER JOIN subquery in `documentsRepository.ts`. (Verified: No longer present or not applicable in current implementation).
- [x] **H-6**: Fix audit_log column names in `blackBookRepository.ts`.
- [x] **M-10**: Fix INNER JOIN in `loadAggregateStatsForSubjects`.
- [x] **M-11**: Fix INNER JOIN in `getInvestigationEvidenceSummary`.
- [x] **M-12**: Fix INNER JOIN in `getHypotheses`. (Fixed via LEFT JOIN in getEvidence and getHypothesisEvidence).
- [x] **M-13**: Add caller-side guards for nullable columns in `getProperties`.
- [x] **M-14**: Fix correlated subquery in `analyticsRepository.getTopEntityByMentions`.

## API Contracts & Mappers

- [x] **C-8**: Implement DTO mapper and schema for `GET /api/documents/:id`.
- [x] **H-7**: Replace `z.record(z.unknown())` in `entityTabs.ts`.
- [x] **H-8**: Make `isVip` and `isVerified` optional in `emailMailboxSchema`.
- [x] **H-9**: Fix `nextCursor` sending `''` instead of `null`.
- [x] **H-10**: Add `description` field to `entityDetailSchema` and `entitiesDtoMapper.ts`.
- [x] **M-1**: Create schemas and mappers for `GET /api/investigations`.
- [x] **M-2**: Add schemas for `GET /api/entities/:id/evidence`, `/relations`, `/graph`.
- [x] **M-3**: Add schemas for document sub-routes.
- [x] **M-4**: Add schemas for entities/all, search.
- [x] **M-5**: Add schemas for relationships.
- [x] **M-6**: Add schemas for analytics/enhanced.
- [x] **M-7**: Standardize all route files with validation and mappers.
- [x] **Final**: Full Code Review for "Spiritual Release" (v19.7.5).
