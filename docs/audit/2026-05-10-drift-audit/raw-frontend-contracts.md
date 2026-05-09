# Frontend & Shared Contracts Audit

**Date:** 2026-05-10  
**Scope:** `src/shared/`, `src/client/types/`, `src/client/pages/`, `src/client/hooks/`, `src/client/services/`, `src/client/design-system/`

---

## 1. Shared DTO/Schema Inventory

### DTOs (`src/shared/dto/`)

| File                | Domain                      | Field convention                        | Notes                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entities.ts`       | Entities / Subjects         | camelCase throughout                    | Exports `SubjectCardListItemDto`, `SubjectCardStatsDto`, `SubjectCardForensicsDto`, `EntityListItemDto`, `EntityDetailDto`, `EntityListResponseDto`, `SubjectsListResponseDto`                                                                          |
| `documents.ts`      | Documents                   | camelCase                               | `DocumentListItemDto`, `DocumentDetailDto`, `DocumentsListResponseDto`; `filePath` camelCase                                                                                                                                                            |
| `emails.ts`         | Emails                      | camelCase                               | `EmailMailboxDto`, `EmailThreadListItemDto`, `EmailThreadDetailsDto`, `EmailMessageBodyDto`, `EmailRawMessageDto`, `EmailSearchResponseDto`, etc.                                                                                                       |
| `relationships.ts`  | Entity relationships        | camelCase                               | `RelationshipDto` has `entityId`, `relatedEntityId`, `relationshipType` — all camelCase                                                                                                                                                                 |
| `connections.ts`    | Connection Dossier          | camelCase                               | `ConnectionDossierDto`, `SharedFlightDto`, `SharedCommunicationDto`, `SharedClaimDto`, `SharedDocumentDto`                                                                                                                                              |
| `graph.ts`          | Network graph               | camelCase                               | `GraphNodeDto`, `GraphEdgeDto`, `GraphResponseDto`                                                                                                                                                                                                      |
| `flights.ts`        | Flights                     | camelCase                               | `FlightItemDto`, `FlightPassengerDto`, `FlightsListResponseDto` — fields like `departureAirport`, `arrivalAirport`, `aircraftTail`                                                                                                                      |
| `evidence.ts`       | Evidence per entity         | camelCase **plus two snake_case leaks** | `EntityRelationEvidenceDto` has `document_id?`, `span_id?`, `quote_text?`, `mention_ids?`, `document_title?`, `document_path?` as snake_case optional fields                                                                                            |
| `analytics.ts`      | Analytics                   | camelCase                               | `AnalyticsSummaryDto`, `CorrelationDto`, `CorrelationResponseDto`                                                                                                                                                                                       |
| `financial.ts`      | Financial                   | camelCase                               | `FinancialTransactionDto`, `FinancialSummaryDto`                                                                                                                                                                                                        |
| `iceberg.ts`        | Iceberg leads / graph paths | camelCase                               | `IcebergLeadDto`, `GraphPathDto`, `RelationshipExplanationDto`, `EvidenceChainItemDto`                                                                                                                                                                  |
| `investigations.ts` | Investigations              | camelCase                               | `InvestigativeLeadDto`, `InvestigationListItemDto`, `InvestigationEvidenceListItemDto`, `InvestigationCaseEvidenceItemDto`, `InvestigationTaskDto` — note `LeadStatus` and `LeadPriority` types **duplicated** from `src/client/types/investigation.ts` |
| `media.ts`          | Media items                 | camelCase                               | `MediaItemDto` with `filePath`, `thumbnailPath` (camelCase)                                                                                                                                                                                             |
| `properties.ts`     | Properties                  | camelCase                               | `PropertyItemDto` with `ownerName1`, `siteAddress`, `yearBuilt` — **directly conflicts with the Zod schema** which uses snake_case                                                                                                                      |
| `provenance.ts`     | Provenance                  | camelCase                               | `ProvenanceFieldsDto`, `ReviewState`, `ExtractionMethod`, `ProvenanceStatus` — `ReviewState` **duplicated** in `src/shared/dto/iceberg.ts` as `IcebergReviewState` (identical values)                                                                   |
| `search.ts`         | Search                      | camelCase + one snake_case              | `SearchDocumentResultDto` has optional `filePath?: string` (camelCase) and `sourcePath` (camelCase); no snake_case leaks                                                                                                                                |
| `stats.ts`          | Stats                       | camelCase **except one field**          | `StatsDto` has `pipelineStatus` (camelCase) but the actual API returns `pipeline_status` (snake_case) — **mismatch**                                                                                                                                    |
| `annotations.ts`    | Document annotations        | camelCase                               | `PublicDocumentAnnotation`, `CreateAnnotationPayload`                                                                                                                                                                                                   |

### Zod Schemas (`src/shared/schemas/`)

| File                    | Domain                                                                                | Field convention                                                                     | Key observations                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entities.ts`           | Entities                                                                              | camelCase                                                                            | Mirrors DTOs; `entityMinimalItemSchema` allows **both** `full_name` and `fullName`, `primary_role` and `primaryRole` simultaneously — intentional leniency for mixed endpoints                                                                                                                          |
| `documents.ts`          | Entity tab — documents, flights, transactions, properties, claims, connections        | **Mixed**                                                                            | Entity-tab schemas use snake_case: `entityFlightItemSchema` (`departure_airport`, `arrival_airport`), `entityTransactionItemSchema` (`from_entity`, `transaction_date`, `risk_level`), `entityPropertyItemSchema` (`owner_name_1`, `site_address`), `coPassengerSchema` (`passenger_name`, `entity_id`) |
| `relationships.ts`      | Relationships (raw) + entity graph                                                    | **snake_case for raw endpoint**                                                      | `relationshipItemSchema` uses `entity_id`, `related_entity_id`, `relationship_type` — direct DB column names                                                                                                                                                                                            |
| `blackBook.ts`          | Black Book entries                                                                    | **snake_case**                                                                       | All fields: `person_id`, `entry_text`, `phone_numbers`, `page_number`, `person_name`, `thumbnail_path` — matches raw DB shape                                                                                                                                                                           |
| `graph.ts`              | Global network graph                                                                  | camelCase                                                                            | `graphGlobalResponseSchema` mirrors `GraphResponseDto`                                                                                                                                                                                                                                                  |
| `stats.ts`              | Stats                                                                                 | **mixed**                                                                            | Uses `pipeline_status` (snake_case) where `StatsDto` has `pipelineStatus` (camelCase) — **confirmed mismatch**                                                                                                                                                                                          |
| `flights.ts`            | Flights list                                                                          | **both**                                                                             | `flightItemSchema` accepts both `departureAirport` (camelCase) and `departure_airport` (snake_case), passengers also both forms                                                                                                                                                                         |
| `properties.ts`         | Properties list                                                                       | **snake_case**                                                                       | `propertyItemSchema` uses `owner_name_1`, `site_address`, `year_built` — directly contradicts `PropertyItemDto` which is camelCase                                                                                                                                                                      |
| `timeline.ts`           | Timeline events                                                                       | **mixed**                                                                            | `timelineEventSchema` has camelCase `title`, `description`, `type` but snake_case `significance_score`, `file_path`, `original_file_path`, `is_curated` — matches raw DB output, commented as intentional                                                                                               |
| `iceberg.ts`            | Iceberg leads                                                                         | camelCase                                                                            | Mirrors `IcebergLeadDto` well                                                                                                                                                                                                                                                                           |
| `investigations.ts`     | Investigations                                                                        | camelCase                                                                            | Note `investigationEvidenceListItemSchema` has `extractedAt`/`extractedBy` but `InvestigationEvidenceListItemDto` marks these as back-compat fields                                                                                                                                                     |
| `intelligenceSchema.ts` | Intelligence review queue                                                             | camelCase                                                                            | Exports TypeScript types derived from schemas                                                                                                                                                                                                                                                           |
| `reviewQueueSchema.ts`  | Review queues                                                                         | **snake_case**                                                                       | All fields snake_case: `entity_name`, `document_id`, `mention_context`, `confidence_score`, `signal_score`                                                                                                                                                                                              |
| `exportManifest.ts`     | Export manifests                                                                      | camelCase                                                                            | Well-typed                                                                                                                                                                                                                                                                                              |
| `entityTabs.ts`         | Entity tab data (media, docs, flights, transactions, properties, claims, connections) | **Mixed** — camelCase for media/docs, snake_case for flights/transactions/properties | The `entityDocumentItemSchema` has `content_refined` (snake_case) alongside camelCase fields                                                                                                                                                                                                            |
| `provenance.ts`         | Provenance (Zod)                                                                      | camelCase                                                                            | Matches `ProvenanceFieldsDto` exactly                                                                                                                                                                                                                                                                   |

### Key Schema vs DTO Conflicts

1. **`PropertyItemDto` (camelCase) vs `propertyItemSchema` (snake_case):** The DTO in `dto/properties.ts` defines `ownerName1`, `siteAddress`, `yearBuilt`, etc. The Zod schema in `schemas/properties.ts` defines `owner_name_1`, `site_address`, `year_built`. The entity-tab property schema in `schemas/entityTabs.ts` also uses snake_case. The API actually returns snake_case — so the DTO is aspirational/wrong.

2. **`StatsDto.pipelineStatus` (camelCase) vs `statsResponseSchema.pipeline_status` (snake_case):** The DTO says `pipelineStatus` but the schema (and confirmed API behaviour) returns `pipeline_status`. The frontend `GlobalStatsPayload` type in `src/client/types/api.ts` correctly uses `pipeline_status`.

3. **`FlightItemDto` (camelCase) vs client-side `Flight` type (snake_case):** The DTO defines `departureAirport`, `arrivalAirport`, etc. but `src/client/components/flights/types.ts` defines a local `Flight` type using `departure_airport`, `arrival_airport`, `aircraft_tail`. The flight pages use the local type. The DTO is unused by the flight UI.

4. **`RelationshipDto` (camelCase) vs `relationshipsResponseSchema` (snake_case):** The DTO uses `entityId`, `relatedEntityId`, `relationshipType`. The Zod schema uses `entity_id`, `related_entity_id`, `relationship_type`. The raw API endpoint returns snake_case.

5. **`IcebergReviewState` vs `ReviewState`:** Identical string union type defined twice — in `dto/iceberg.ts` and `dto/provenance.ts`.

---

## 2. Client Type Inventory

### `src/client/types/`

| File                | Contents                                                                                                                                                                                                | Duplicates shared types?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.ts`            | `GlobalStatsPayload`, `SearchResponsePayload`, `EntityConnectionSignal`, `EntityConnection`, `EntityConnectionsResponse`, `EntityByIdResponse`, `GraphNode`, `GraphRelationship`, `GlobalGraphResponse` | **Partial duplicates**: `GraphNode`/`GraphRelationship` shadow `GraphNodeDto`/`GraphEdgeDto`. `EntityConnection` duplicates `entityConnectionItemSchema` shape. `GlobalStatsPayload` is a subset of `StatsDto` with `pipeline_status` (snake_case, correct) vs `StatsDto.pipelineStatus` (camelCase, wrong).                                                                                                                                                                                                                                                                                                                                      |
| `documents.ts`      | `Document`, `DocumentMetadata`, `Entity`, `EntityContext`, `Passage`, `BrowseFilters`, `BrowseOptions`, `ForensicSignal`, etc.                                                                          | **Large duplication**: `Document` overlaps significantly with `DocumentDetailDto` and `DocumentListItemDto`. `Entity` inside documents.ts is a local type for doc-extracted entities and doesn't map to `EntityDetailDto`. `DocumentMetadata` has `source_collection` and `source_original_url` (snake_case) mixed with camelCase.                                                                                                                                                                                                                                                                                                                |
| `email.ts`          | `EmailDTO`, `ThreadDTO`, `EmailSearchFilters`                                                                                                                                                           | **Full duplication**: `EmailDTO` is all snake_case (`email_id`, `thread_id`, `body_clean_text`, `ingest_run_id`, `entity_links` with `entity_id`). This conflicts with the camelCase `EmailThreadMessageHeaderDto` in `dto/emails.ts`. Neither is imported by the EmailPage which uses `apiClient` methods typed with the shared DTOs.                                                                                                                                                                                                                                                                                                            |
| `investigation.ts`  | `EvidenceChain`, `Investigation`, `InvestigationLead`, `Annotation`, `TimelineEvent`, `NetworkAnalysis`, `NetworkRelationship`, etc.                                                                    | **Extensive duplication and conflict**: `LeadStatus` and `LeadPriority` duplicated from `dto/investigations.ts`. `Investigation` interface (client) has `status: 'draft' \| 'active' \| 'review' \| 'published' \| 'archived'` but server schema uses `'active' \| 'archived' \| 'closed' \| 'open' \| 'in_progress'`. `InvestigationLead` uses `forensicSignalId?: string` but DTO uses `number`. `document_title?` is snake_case in `InvestigationLead`. `TimelineEvent` interface duplicates (conflicts with) `timelineEventSchema` — uses camelCase `startDate`, `endDate`, `hypothesisIds` while the real API returns mixed snake/camelCase. |
| `forensics.ts`      | `ForensicMetricRecord`, `ForensicSummary`                                                                                                                                                               | Local types for forensic document analyzer — no direct shared counterpart.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `media.types.ts`    | `MediaImage`, `Album`, `MediaTag`, `ImageFilter`, `ImageSort`, `MediaStats`                                                                                                                             | **Conflicts**: `MediaImage` has both `filename` (camelCase) and `file_name?`, both `path` and `file_path?`, both `thumbnailPath?` and `thumbnail_path?` — explicit dual-form to handle mixed API responses. Conflicts with `MediaItemDto` which is cleanly camelCase.                                                                                                                                                                                                                                                                                                                                                                             |
| `memory.ts`         | `MemoryEntry`, `MemoryRelationship`, `MemoryAuditLog`, etc.                                                                                                                                             | Standalone types for the memory feature. No shared schema counterpart.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `auth.ts`           | `User`                                                                                                                                                                                                  | **Duplicate**: `User` type also defined in `src/client/types.ts` with different field shapes (`role` is `string` in auth.ts vs union `'admin' \| 'investigator' \| 'viewer'` in types.ts).                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `visualizations.ts` | `TimelineEventType`, `TimelineSignificance`, `TimelineVisualizationEvent`                                                                                                                               | Conflicts with `timelineEventSchema` which uses `significance_score` (snake_case string). This type uses camelCase `significance`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### `src/client/types.ts` (root-level)

Contains `User`, `Photo`, `Person`, `Mention`, `Evidence`, `SearchFilters`, `SortOption`, `SubjectCardDTO`. These are the main "working types" used throughout the app by components.

- `Photo` type has both `filePath` (camelCase) and `file_path?`, `thumbnail_path?` — dual-form for API compat.
- `Person` mirrors `EntityDetailDto` loosely but adds UI-only fields and allows `likelihoodLevel` alongside `likelihoodScore`.
- `Evidence` has `file_path?`, `original_file_path?`, `source_collection?`, `file_type?` (all snake_case) mixed with camelCase fields.
- `SubjectCardDTO` is a client-local duplicate of `SubjectCardListItemDto` from `dto/entities.ts` — nearly identical but loosens `riskLevel` to `string` in the forensics block.

---

## 3. Page/Route Inventory

### Pages and their routes in App.tsx

| Page file                            | Route in App.tsx                                                                                                         | API calls                                                                         | Notes                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `PeoplePage.tsx`                     | `/`, `/people`, `/entity/:id`, `*` (fallback)                                                                            | `/api/subjects` (via `useSubjectsQuery`), `/api/entities/:id` (inline in App.tsx) | 4 routes for the same component                                    |
| `DocumentsPage.tsx`                  | `/documents/*`                                                                                                           | via `useDocumentBrowserData` → `/api/documents`                                   |                                                                    |
| `RedactionsPage.tsx`                 | `/redactions`                                                                                                            | presumably `/api/documents?hasFailedRedactions=true`                              |                                                                    |
| `TimelinePage.tsx`                   | `/timeline/*`                                                                                                            | `/api/timeline`                                                                   |                                                                    |
| `FlightsPage.tsx`                    | `/flights/*`                                                                                                             | flight data via component                                                         | Uses local `Flight` type (snake_case) not `FlightItemDto`          |
| `FlightDetailPage.tsx`               | `/flights/:id`                                                                                                           | `/api/flights/:id`, `/api/flights/airports`                                       | Uses `Flight` type (snake_case) from `components/flights/types.ts` |
| `ArticleDetailPage.tsx`              | `/media/article/:id`                                                                                                     | (media)                                                                           |                                                                    |
| `PropertyPage.tsx`                   | `/properties/*`                                                                                                          | via `PropertyBrowser` component                                                   |                                                                    |
| `EmailPage.tsx`                      | `/emails/*`                                                                                                              | via `useEmailWorkspaceData` → `apiClient.getEmailMailboxes` etc.                  | Uses shared DTOs via apiClient                                     |
| `CorroborationPage.tsx`              | `/claims/corroborated`                                                                                                   | `/api/claims/corroborated`                                                        | No shared DTO for claims corroborated response                     |
| `LegalTrackerPage.tsx`               | `/legal-proceedings`                                                                                                     | `/api/legal-proceedings`                                                          | No shared DTO/schema for this response                             |
| `ConnectionDossierPage.tsx`          | `/connections`                                                                                                           | (connection dossier components)                                                   |                                                                    |
| `SurvivorTrackingPage.tsx`           | `/survivors`                                                                                                             | `/api/testimonies`                                                                | No shared DTO/schema for testimonies response                      |
| `MediaPage.tsx`                      | `/media/*`                                                                                                               | via media components                                                              |                                                                    |
| `AnalyticsPage.tsx`                  | `/analytics`                                                                                                             | via App.tsx → `apiClient.getStats()` (passed as prop)                             |                                                                    |
| `EvidenceDetail.tsx`                 | `/evidence/:id`                                                                                                          | (evidence detail)                                                                 |                                                                    |
| `FinancialPage.tsx`                  | `/financial/*`                                                                                                           | (financial components)                                                            |                                                                    |
| `FinancialTransactionDetailPage.tsx` | `/financial/:id`                                                                                                         | (transaction detail)                                                              |                                                                    |
| `ClaimDetailPage.tsx`                | `/claims/:id`                                                                                                            | `/api/claims/:id`                                                                 | No shared DTO/schema                                               |
| `NetworkPage.tsx`                    | `/network`                                                                                                               | `/api/relationships/path?source=...&target=...`, graph data                       | Not in main nav but routed                                         |
| `AdminDashboard.tsx`                 | `/admin/*`                                                                                                               | (admin features)                                                                  |                                                                    |
| `IntelligenceDashboard.tsx`          | `/intelligence`                                                                                                          | (intelligence features)                                                           | Not in main nav                                                    |
| `ReviewDashboard.tsx`                | `/review/*`                                                                                                              | (review queue)                                                                    | Not in main nav                                                    |
| `TheEpsteinFilesPage.tsx`            | `/the-epstein-files`, `/epstein-documents`, `/epstein-people`, `/epstein-media`, `/epstein-timeline`, `/epstein-flights` | (static/SEO)                                                                      |                                                                    |
| `LoginPage.tsx`                      | `/login`                                                                                                                 | auth                                                                              |                                                                    |

**Pages with no route (dead):**

| Page file                     | Status                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `EvidencePage.tsx`            | Dead — thin wrapper that just renders `<EvidenceDetail />`. Not imported in App.tsx. `EvidenceDetail` is itself routed at `/evidence/:id`. |
| `AdminPage.tsx`               | Dead — thin wrapper that just renders `<AdminDashboard />`. Not imported in App.tsx. `AdminDashboard` is itself routed at `/admin/*`.      |
| `SharedDetailPage.module.css` | Only a CSS file exists — no `.tsx` component. The CSS file is not imported anywhere. Orphaned artifact.                                    |

---

## 4. App.tsx Route Summary

All 40+ routes are registered via `<Routes>` / `<Route>` in the single `App.tsx` component. Routes not in the main navigation bar: `/network`, `/intelligence`, `/review/*`, `/connections`, `/legal-proceedings`, `/survivors`, `/claims/corroborated`, `/evidence/:id`. These are accessible by URL but not linked from the nav.

`/blackbook/*` is handled inline in App.tsx by rendering `<BlackBookViewer>` wrapped in a Box, rather than via a page component.

`/investigations/*` and `/investigate/case/:id/*` both render `<InvestigationWorkspace>` — two routes for the same component; the `/investigate/case/` form appears to be a legacy path.

---

## 5. Hook Inventory

| Hook                                   | Endpoint(s)                                                                                                                                                                                   | Consumers                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `useDocumentBrowserData`               | `/api/documents` (via apiClient)                                                                                                                                                              | `DocumentBrowser.tsx`                         |
| `useEmailWorkspaceData`                | `apiClient.getEmailMailboxes`, `apiClient.getEmailThreads`, `apiClient.getEmailThread`, `apiClient.getEmailMessageBody`, `apiClient.getEmailRawMessage`, `apiClient.getEmailThreadForMessage` | `EmailClient.tsx`                             |
| `useForensicDocumentData`              | (forensic metrics endpoint)                                                                                                                                                                   | `ForensicDocumentAnalyzer.tsx`                |
| `usePhotoBrowserData`                  | `/api/media/images?page=1&limit=1&slim=true` (canary call + more)                                                                                                                             | `PhotoBrowser.tsx`                            |
| `useSubjectsQuery`                     | `apiClient.getSubjects` → `/api/subjects`                                                                                                                                                     | `PeoplePage.tsx`, `EvidenceCaptureSheet.tsx`  |
| `useAbortableRequest`                  | Utility (no API call)                                                                                                                                                                         | Various                                       |
| `useAppNavigation`                     | No API call — route matching                                                                                                                                                                  | `App.tsx`                                     |
| `useCommandPalette`                    | No API call — UI state                                                                                                                                                                        | `App.tsx`                                     |
| `useCountUp`                           | No API call — animation                                                                                                                                                                       | Various                                       |
| `useFirstRunOnboarding`                | No API call — localStorage                                                                                                                                                                    | `App.tsx`                                     |
| `useHighlightNavigation`               | No API call — DOM                                                                                                                                                                             | `DocumentModal`                               |
| `useInvestigationOnboarding`           | No API call — localStorage                                                                                                                                                                    | Investigation workspace                       |
| `useIsMobile`                          | No API call — viewport                                                                                                                                                                        | Various                                       |
| `useIsTouch`                           | No API call — touch detection                                                                                                                                                                 | Various                                       |
| `useListScrollRestoration`             | No API call — sessionStorage                                                                                                                                                                  | Document/entity lists                         |
| `useLongPress`                         | No API call — gesture                                                                                                                                                                         | Various                                       |
| `useMediaBrowser`                      | Parameterized — caller provides fetch                                                                                                                                                         | `PhotoBrowser.tsx`, `MediaAndArticlesTab.tsx` |
| `useModalFocusTrap`                    | No API call — focus management                                                                                                                                                                | Modals                                        |
| `useNavigationContextManager`          | No API call — sessionStorage                                                                                                                                                                  | `App.tsx`                                     |
| `usePageScrollRestoration`             | No API call — scroll                                                                                                                                                                          | Various                                       |
| `usePaginatedMediaCollection`          | Generic paginated fetch                                                                                                                                                                       | Media components                              |
| `usePrefetchEntity`                    | `/api/entities/:id`                                                                                                                                                                           | Viewport-triggered prefetch                   |
| `useReliableBackNavigation`            | No API call — history                                                                                                                                                                         | Various                                       |
| `useResponsive` / `useMediaQuery`      | No API call — viewport                                                                                                                                                                        | Various                                       |
| `useScrollDirection`                   | No API call — scroll                                                                                                                                                                          | Various                                       |
| `useScrollLock`                        | No API call — DOM                                                                                                                                                                             | Modals                                        |
| `useSeoConfig`                         | No API call — route-based                                                                                                                                                                     | `App.tsx`                                     |
| `useSharedIntersectionObserver`        | No API call — IntersectionObserver                                                                                                                                                            | Lists                                         |
| `useSwipeGesture` / `usePullToRefresh` | No API call — touch                                                                                                                                                                           | Mobile UI                                     |
| `useVirtualScroll`                     | No API call — virtualization                                                                                                                                                                  | Large lists                                   |

---

## 6. Frontend Services

### `src/client/services/apiClient.ts`

The `apiClient` is a class-based service wrapping `fetch`. Key observations:

- `getEntities()` calls `/api/entities` first and falls back to `/api/subjects`. Both endpoints are expected to return entity list data but may have slightly different shapes.
- `getSubjects()` calls `/api/subjects` — used by `useSubjectsQuery` for the PeoplePage.
- `getStats()` calls `/api/stats` and returns `GlobalStatsPayload`. This type has `pipeline_status` (snake_case), consistent with the schema but inconsistent with `StatsDto.pipelineStatus` (camelCase).
- `getConnectionDossier()` returns `ConnectionDossierDto` — correctly typed.
- Many methods return `unknown` or `unknown[]` (e.g. `getEntityGraph`, `getEvidence`, `getEvidenceMetrics`, `getDocument`, `getInvestigation`) — no type safety on these return values at the call site.
- `getDocuments()` in apiClient returns `unknown` despite `DocumentsListResponseDto` existing.

### Type mismatch risk in apiClient

- `getEmailMailboxes` correctly returns `EmailMailboxesResponseDto`.
- `getEmailThreads` correctly returns `EmailThreadsResponseDto`.
- `getEmailThread` correctly returns `EmailThreadDetailsDto`.
- `getEmailMessageBody` correctly returns `EmailMessageBodyDto`.
- `getInvestigations` returns `unknown` — no DTO typing applied despite `InvestigationListItemDto` existing.
- `getEntity()` returns `Person` — the client-side `Person` type, not `EntityDetailDto`. The mapping from API to `Person` happens inline in App.tsx with manual field access including dual `filePath ?? file_path` lookups.

---

## 7. Naming Mismatches (snake_case / camelCase Leaks)

### Confirmed in production code paths

1. **`significance_score` / `significanceScore`** (Timeline):
   - `src/shared/schemas/timeline.ts` deliberately defines `significance_score` (snake_case) because the API returns it that way.
   - `src/client/utils/evidenceUtils.tsx:234-238` handles both: `item.significanceScore ?? item.significance_score`.
   - `src/client/components/visualizations/Timeline.tsx:210` casts `event.significance_score as 'high' \| 'medium' \| 'low'`.
   - `src/client/types/visualizations.ts` defines `TimelineVisualizationEvent` with camelCase `significance` — disconnected from the real API shape.

2. **`file_path` in `src/client/types.ts`**:
   - `Photo` type has `file_path?` and `thumbnail_path?` alongside `filePath` and `thumbnailPath`.
   - `Evidence` type has `file_path?` and `original_file_path?` alongside `filePath`.
   - `App.tsx:504` explicitly handles `rec.filePath ?? rec.file_path ?? rec.path ?? rec.url`.

3. **`pipeline_status`**:
   - `StatsDto.pipelineStatus` (camelCase) in `dto/stats.ts`.
   - `statsResponseSchema.pipeline_status` (snake_case) in `schemas/stats.ts`.
   - `GlobalStatsPayload.pipeline_status` (snake_case) in `src/client/types/api.ts`.
   - `AboutPage.tsx:206` accesses `statsRes.pipeline_status` (snake_case) — consistent with the actual API.
   - **The DTO is wrong.** The schema and client type correctly reflect the API.

4. **`entity_id` in `src/client/types/email.ts`**:
   - `EmailDTO` uses `entity_id: string` in `entity_links[]`.
   - The shared `EmailMailboxDto` uses `entityId: number | null`.
   - The `email.ts` type file is not actually imported by the active `EmailClient` / `EmailPage` workflow — it appears to be legacy.

5. **`document_id`, `entity_id` in `investigations.model.ts`**:
   - `src/client/domains/investigations/investigations.model.ts:102,106` reads `metadata.entity_id` and `metadata.document_id` (snake_case from stored `metadataJson`).
   - `src/client/contexts/InvestigationsContext.tsx:222,228` sets `evidencePayload.entity_id` and `evidencePayload.document_id` — sending snake_case to the API.

6. **Properties response: camelCase DTO vs snake_case API**:
   - `PropertyItemDto` defines `ownerName1`, `siteAddress`, `yearBuilt` (camelCase).
   - `propertyItemSchema` and `entityPropertyItemSchema` define `owner_name_1`, `site_address`, `year_built` (snake_case).
   - `PropertyBrowser.tsx` accesses `owner_name_1` style fields.
   - **The `PropertyItemDto` is aspirational / dead.** The API returns snake_case and that is what the frontend consumes.

7. **Flight fields: dual-form everywhere**:
   - `FlightItemDto` defines camelCase (`departureAirport`, `aircraftTail`).
   - `flightItemSchema` accepts both forms.
   - `src/client/components/flights/types.ts` local `Flight` type uses only snake_case.
   - `FlightDetailPage.tsx` and `FlightCard.tsx` access `flight.departure_airport`, `flight.arrival_airport` — snake_case.
   - **The `FlightItemDto` is unused by the flight UI.** The flight pages use the local `Flight` type.

8. **`EntityRelationEvidenceDto` snake_case leaks**:
   - `dto/evidence.ts` `EntityRelationEvidenceDto` includes `document_id?`, `span_id?`, `quote_text?`, `mention_ids?`, `document_title?`, `document_path?` — snake_case optionals mixed into an otherwise camelCase DTO.

---

## 8. Dead Frontend Surfaces

### Dead pages (file exists, no route in App.tsx)

| Component                                      | Status                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/client/pages/EvidencePage.tsx`            | Dead re-export wrapper of `EvidenceDetail`. The actual component is routed at `/evidence/:id` directly. `EvidencePage.tsx` can be deleted. |
| `src/client/pages/AdminPage.tsx`               | Dead re-export wrapper of `AdminDashboard`. The actual component is routed at `/admin/*` directly. `AdminPage.tsx` can be deleted.         |
| `src/client/pages/SharedDetailPage.module.css` | Orphaned CSS file with no corresponding `.tsx` component. The component was apparently deleted but the CSS was not. Can be deleted.        |

### Dead / unwired components

| Component                                         | Status                                                                                                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/client/components/BlackBookReview.tsx`       | Not imported anywhere in the codebase outside of its own file. `BlackBookViewer.tsx` is used (routed via `/blackbook/*` in App.tsx). `BlackBookReview.tsx` appears to be an abandoned alternative implementation.                                                  |
| `src/client/components/pages/MemoryDashboard.tsx` | Imports `useMemory` from `MemoryContext`. `MemoryProvider` is never added to the React tree (not in `main.tsx` or `App.tsx`), so calling `useMemory` would throw `"useMemory must be used within a MemoryProvider"`. No route exists for this page. Entirely dead. |

### Contexts with limited/no wiring

| Context                   | Status                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MemoryContext.tsx`       | `MemoryProvider` exists but is never rendered in the component tree. `useMemory` would throw at runtime. Dead feature.                            |
| `AnalyticsContext.tsx`    | Provided inside `AnalyticsPage.tsx` only. Consumed by `DataVisualization.tsx` and `TreeMap.tsx` — both are analytics components. Properly scoped. |
| `DegradedModeContext.tsx` | Imported in `main.tsx` — correctly wired.                                                                                                         |

---

## 9. UI Label Inconsistencies

### "Connections" vs "Relationships" vs "Network"

The same concept (entity-to-entity links) appears under three different labels depending on context:

| Location                                 | Label used                                                | Notes                                                                           |
| ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `EvidenceModal.tsx` tab array (line 125) | **"Connections"**                                         | Tab label for the connections view in the entity detail modal                   |
| `EvidenceModal.tsx` tab array (line 133) | **"Network"**                                             | A second, separate tab also in the entity modal — renders a graph visualization |
| `EnhancedAnalytics.tsx:830`              | **"Relationships"**                                       | Used in the analytics page UI                                                   |
| `NetworkPage.tsx` nav                    | **"All signals"**, **"Direct links"**                     | Relationship types labeled differently on the Network page                      |
| App.tsx nav item                         | **"Network"** (not shown — Network page has no nav entry) | Route `/network` exists but is not in the nav bar                               |
| `AnalyticsPage` nav                      | (uses "Analytics")                                        | No mention of "network" or "connections" in the analytics nav label             |

The entity modal has both a "Connections" tab (signal/dossier style) and a "Network" tab (graph visualization) — these are distinct in intent but users may find two relationship-related tabs confusing.

### "Evidence" vs "Documents"

| Location                       | Label used                                                       |
| ------------------------------ | ---------------------------------------------------------------- |
| App.tsx navigation             | **"Documents"** (tab label)                                      |
| App.tsx navigation             | **"Redactions"** (tab label, but it's a document sub-feature)    |
| `useAppNavigation.ts` tab enum | Has both `'documents'` and `'evidence'` as tab values            |
| `EvidenceModal.tsx` tab        | **"Evidence"** (entity evidence tab)                             |
| Route `/evidence/:id`          | Evidence detail page (same data as documents, different context) |
| `EvidencePage.tsx`             | Wraps `EvidenceDetail` — "Evidence" framing                      |

The distinction is that `/documents` is the full corpus browser, while `/evidence/:id` shows a specific document in the context of evidence. However, the nav only shows "Documents" — users may not know the "Evidence" framing exists.

### "People" vs "Entities" vs "Subjects"

| Location                               | Term used                                             |
| -------------------------------------- | ----------------------------------------------------- |
| App.tsx nav item                       | **"People"**                                          |
| API endpoint                           | `/api/subjects` (primary), `/api/entities` (fallback) |
| Route                                  | `/people`, `/entity/:id` — mixed                      |
| `PeoplePage.tsx`                       | Internally uses "people"                              |
| `EntityDetailDto`, `EntityListItemDto` | "Entity" in all shared types                          |
| `SubjectCardListItemDto`               | "Subject" in subject-card types                       |

Three terms used interchangeably for the same concept.

---

## 10. Duplicate Type Definitions

| Type                              | Defined in                                                                                                                | Conflict                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LeadStatus`                      | `src/shared/dto/investigations.ts` AND `src/client/types/investigation.ts`                                                | Identical values — redundant                                                                                                                                                                               |
| `LeadPriority`                    | `src/shared/dto/investigations.ts` AND `src/client/types/investigation.ts`                                                | Identical values — redundant                                                                                                                                                                               |
| `ReviewState`                     | `src/shared/dto/provenance.ts` AND `src/shared/dto/iceberg.ts` (as `IcebergReviewState`)                                  | Same string union, defined twice in the same package                                                                                                                                                       |
| `User`                            | `src/client/types/auth.ts` AND `src/client/types.ts`                                                                      | Different shapes: `auth.ts` has `role: string`, `types.ts` has `role: 'admin' \| 'investigator' \| 'viewer'`. Auth context uses `auth.ts` type.                                                            |
| `Annotation`                      | `src/shared/dto/annotations.ts` (as `PublicDocumentAnnotation`) AND `src/client/types/investigation.ts` (as `Annotation`) | Completely different shapes for the same concept. `PublicDocumentAnnotation` is the API-backed type. `Annotation` in investigation.ts is a rich client-only type with `visibility`, `evidenceRating`, etc. |
| `TimelineEvent`                   | `src/client/types/investigation.ts` AND `src/client/types/visualizations.ts` (as `TimelineVisualizationEvent`)            | Different shapes. Neither matches the actual `timelineEventSchema` (snake_case fields).                                                                                                                    |
| `Investigation`                   | `src/client/types/investigation.ts` AND `src/server/db/investigationsRepository.ts`                                       | Different shapes (client vs DB model). Server-side type lives in server boundary — no direct conflict but indicates status enum divergence.                                                                |
| `SubjectCardDTO`                  | `src/client/types.ts` AND `SubjectCardListItemDto` in `src/shared/dto/entities.ts`                                        | Near-identical; `SubjectCardDTO` loosens some field types.                                                                                                                                                 |
| `GraphNode` / `GraphRelationship` | `src/client/types/api.ts` AND `GraphNodeDto` / `GraphEdgeDto` in `src/shared/dto/graph.ts`                                | Similar shape, different field names (`classification` in DTO, not in api.ts type).                                                                                                                        |
| `EntityConnection`                | `src/client/types/api.ts` AND `entityConnectionItemSchema` in `src/shared/schemas/entityTabs.ts`                          | Same shape but `api.ts` version is manually duplicated.                                                                                                                                                    |

---

## 11. Contract/Type Gaps

APIs that exist (confirmed by server routes) but have **no shared DTO or Zod schema** in `src/shared/`:

| API route                         | Coverage status                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| `GET /api/claims/:id`             | No shared DTO/schema — `ClaimDetailPage` uses inline fetch with `unknown` type                |
| `GET /api/claims/corroborated`    | No shared DTO/schema — `CorroborationPage` uses inline fetch with `unknown` type              |
| `GET /api/legal-proceedings`      | No shared DTO/schema — `LegalTrackerPage` uses inline fetch with `unknown`                    |
| `GET /api/testimonies`            | No shared DTO/schema — `SurvivorTrackingPage` uses inline fetch with `unknown`                |
| `GET /api/memory`                 | No shared DTO/schema — but `MemoryContext` is unwired so not a live concern                   |
| `GET /api/analytics/correlations` | `CorrelationResponseDto` exists in `dto/analytics.ts` but no Zod schema and no contract test  |
| `GET /api/resolve/epstein-file`   | No shared schema — `App.tsx` inline fetch returns `{ redirectTo?, documentId? }` typed inline |
| `GET /api/relationships/path`     | `NetworkPage` calls this; response shape unknown — no DTO                                     |
| `GET /api/media/images`           | No DTO — `usePhotoBrowserData` and `useMediaBrowser` use `unknown` / local types              |
| `GET /api/media/albums`           | No shared DTO                                                                                 |

**Undertyped apiClient methods (return `unknown` despite DTOs existing):**

- `getDocument()` — `DocumentDetailDto` exists
- `getDocuments()` — `DocumentsListResponseDto` exists
- `getInvestigation()` — `investigationDetailResponseSchema` exists
- `getInvestigations()` — `InvestigationListItemDto` exists
- `getEntityGraph()` — `entityGraphResponseSchema` exists
- `getEvidence()` — `EntityEvidenceResponseDto` exists

---

## Summary of Most Impactful Issues

1. **Properties, Flights, Relationships DTOs are camelCase but APIs return snake_case.** The DTOs in `dto/properties.ts`, `dto/flights.ts`, `dto/relationships.ts` don't match what the API actually delivers. The Zod schemas correctly reflect reality.

2. **`StatsDto.pipelineStatus` is wrong** — should be `pipeline_status` to match the schema and actual API. The client type `GlobalStatsPayload` has it right.

3. **`src/client/types/email.ts` is a dead legacy type file.** All-snake_case `EmailDTO` / `ThreadDTO` types are not imported by the active email workflow (`EmailClient.tsx` uses `apiClient` which returns the shared camelCase DTOs).

4. **`src/client/types/investigation.ts`** is a sprawling local type file that partially duplicates and partially conflicts with `src/shared/dto/investigations.ts`. `Investigation.status` enum diverges from the server schema. `LeadStatus`, `LeadPriority`, `Annotation`, `TimelineEvent`, `ReviewState` are all duplicated.

5. **Three dead surfaces:** `EvidencePage.tsx`, `AdminPage.tsx` (both unused wrappers), `SharedDetailPage.module.css` (orphan CSS), `BlackBookReview.tsx` (unused component), `MemoryDashboard.tsx` (context not wired).

6. **Label inconsistency:** "Connections" / "Relationships" / "Network" used for the same concept across EvidenceModal tabs, NetworkPage, AnalyticsPage. "People" / "Entities" / "Subjects" used interchangeably for the entity concept.
