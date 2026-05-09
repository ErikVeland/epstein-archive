# Domain Concept Inventory

This file catalogues every named domain concept across the database, API, server code, and frontend. For each concept, the canonical name and all variant names found in each layer are listed.

---

## Core Investigative Concepts

### 1. Entity / Subject / Person

| Layer             | Name(s)                                    |
| ----------------- | ------------------------------------------ |
| Database table    | `entities`                                 |
| DB columns        | `entity_id`, `entity_type`, `canonical_id` |
| Server repository | `entitiesRepository.ts`                    |
| API route         | `/api/entities`, `/api/subjects`           |
| Server mapper     | `entitiesDtoMapper.ts`                     |
| DTO               | `src/shared/dto/entities.ts`               |
| Frontend route    | `/people`, `/entity/:id`                   |
| Frontend page     | `PeoplePage`                               |
| Frontend type     | `Person` (in `src/client/types/`)          |
| UI label          | "People"                                   |

**Canonical name:** `entity`  
**Variant names:** subject, person, subject-card  
**Drift severity:** HIGH — "People" in UI, "Entities" in DB/API, "Subject" in the `/api/subjects` route. These all mean the same thing.

---

### 2. Document / Evidence File

| Layer             | Name(s)                                                    |
| ----------------- | ---------------------------------------------------------- |
| Database table    | `documents`, `evidence`                                    |
| DB columns        | `document_id`, `source_document_id`, `related_document_id` |
| Server repository | `documentsRepository.ts`, `evidenceRepository.ts`          |
| API route         | `/api/documents`, `/api/evidence`                          |
| Frontend route    | `/documents`, `/evidence/:id`                              |
| Frontend page     | `DocumentsPage`, `EvidenceDetail`                          |
| UI label          | "Documents", "Evidence"                                    |

**Canonical name:** `document`  
**Drift severity:** HIGH — `evidence` table (11 rows) overlaps structurally with `documents` (1.4M rows). In the UI, "Evidence" sometimes means the `evidence` table record, sometimes means any document used as evidence. The `/evidence/:id` page renders `evidence` table records, but most "evidence" in the app is actually `documents`.

---

### 3. Relationship / Connection / Network

| Layer               | Name(s)                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Database tables     | `relations`, `entity_relationships`, `entity_adjacency`                                    |
| API routes          | `/api/relationships`, `/api/connections`, `/api/graph`, `/api/entities/:id/connections`    |
| Server repositories | `relationshipsRepository.ts`, `entityConnectionsRepository.ts`                             |
| Server routes       | `relationships.ts`, `connectionsRoutes.ts`, `entityConnectionsRoutes.ts`, `graphRoutes.ts` |
| Frontend route      | `/connections`, `/network`                                                                 |
| Frontend pages      | `ConnectionDossierPage`, `NetworkPage`                                                     |
| UI labels           | "Connections", "Network", "Relationships"                                                  |

**Canonical name:** `entity_relationship`  
**Drift severity:** HIGH — four different names in DB, five route files, two frontend pages (`/connections` vs `/network`), three UI labels. `relations` (NLP triples) and `entity_relationships` (graph edges) are different things but both named "relationships" in various layers.

---

### 4. Timeline Event

| Layer             | Name(s)                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Database tables   | `timeline_events` (0 rows, DEAD), `global_timeline_events` (416 rows, ACTIVE), `investigation_timeline_events` |
| API route         | `/api/timeline`                                                                                                |
| Server repository | `timelineRepository.ts`                                                                                        |
| Frontend route    | `/timeline`                                                                                                    |
| Frontend page     | `TimelinePage`                                                                                                 |

**Canonical name:** `global_timeline_event`  
**Drift severity:** MEDIUM — `timeline_events` (entity-specific, dead) vs `global_timeline_events` (curated global, active). Same concept split across two tables, one empty.

---

### 5. Media / Photo / Image / Article

| Layer               | Name(s)                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Database tables     | `media_items`, `media_albums`, `media_album_items`, `media_tags`, `media_item_tags`, `media_item_people`, `articles` |
| API routes          | `/api/media`, `/api/articles`                                                                                        |
| Server repositories | `mediaRepository.ts`, `articleRepository.ts`, `articlesRepository.ts`                                                |
| Frontend routes     | `/media`, `/media/article/:id`                                                                                       |
| Frontend page       | `MediaPage`, `ArticleDetailPage`                                                                                     |
| UI labels           | "Media", "Articles"                                                                                                  |

**Canonical name:** `media_item`, `article` (separate concepts)  
**Drift severity:** MEDIUM — `articleRepository.ts` and `articlesRepository.ts` are duplicate files. Articles and media items are distinct concepts but share the `/media` parent route.

---

### 6. Flight / Passenger

| Layer             | Name(s)                           |
| ----------------- | --------------------------------- |
| Database tables   | `flights`, `flight_passengers`    |
| API route         | `/api/flights`                    |
| Server repository | `flightsRepository.ts`            |
| Frontend route    | `/flights`                        |
| Frontend page     | `FlightsPage`, `FlightDetailPage` |

**Canonical name:** `flight`, `flight_passenger`  
**Drift severity:** LOW — consistent naming throughout.

---

### 7. Property / Real Estate

| Layer             | Name(s)                   |
| ----------------- | ------------------------- |
| Database table    | `palm_beach_properties`   |
| API route         | `/api/properties`         |
| Server repository | `propertiesRepository.ts` |
| Frontend route    | `/properties`             |
| Frontend page     | `PropertyPage`            |

**Canonical name:** `property`  
**Drift severity:** MEDIUM — DB table is named `palm_beach_properties` (too specific) while all other layers use `properties`. The table scope is now wider than its name suggests.

---

### 8. Black Book Entry

| Layer             | Name(s)                              |
| ----------------- | ------------------------------------ |
| Database table    | `black_book_entries`                 |
| API route         | `/api/black-book`                    |
| Server repository | `blackBookRepository.ts`             |
| Frontend route    | `/blackbook`                         |
| UI component      | `BlackBookViewer`, `BlackBookReview` |
| DTO               | `src/shared/dto/blackBook.ts`        |

**Canonical name:** `black_book_entry`  
**Drift severity:** LOW — consistent. Minor: route uses kebab-case (`/api/black-book`) while frontend uses no-separator (`/blackbook`).

---

### 9. Investigation

| Layer           | Name(s)                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database tables | `investigations`, `investigation_evidence`, `investigation_leads`, `investigation_notebook`, `investigation_tags`, `investigation_tag_links`, `investigation_timeline_events`, `investigation_collaborators`, `investigation_activity`, `hypotheses`, `hypothesis_evidence`, `danger_motif_findings`, `danger_motif_evidence`, `evidence_chain_items` |
| API routes      | `/api/investigations`, `/api/investigations/:id/leads`, `/api/investigations/:id/iceberg`, `/api/tasks`                                                                                                                                                                                                                                               |
| Frontend routes | `/investigations`, `/investigate/case/:id`                                                                                                                                                                                                                                                                                                            |
| Server services | `InvestigationAgentService.ts`, `InvestigativeTaskService.ts`, `InvestigationIngestorService.ts`                                                                                                                                                                                                                                                      |

**Canonical name:** `investigation`  
**Drift severity:** MEDIUM — two duplicate frontend routes (`/investigations/:id` and `/investigate/case/:id` both load the same component). Investigation tasks are mounted at `/api/tasks` not `/api/investigations/:id/tasks`. The `evidence_chain_items` and `danger_motif_*` tables are investigation sub-tables that are conceptually buried.

---

### 10. Claim / Assertion

| Layer             | Name(s)                                |
| ----------------- | -------------------------------------- |
| Database table    | `claim_triples`                        |
| API route         | `/api/claims`                          |
| Server repository | `claimTriplesRepository.ts`            |
| Frontend routes   | `/claims/:id`, `/claims/corroborated`  |
| Frontend pages    | `ClaimDetailPage`, `CorroborationPage` |

**Canonical name:** `claim_triple` (DB), `claim` (API/UI)  
**Drift severity:** LOW — consistent between layers. Minor: DB uses `claim_triples` while API/UI uses just `claims`.

---

### 11. Evidence (Investigation concept)

| Layer               | Name(s)                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Database tables     | `evidence` (11 rows), `evidence_types` (3 rows), `evidence_entity` (0 rows), `entity_evidence_types` (110K rows) |
| API route           | `/api/evidence`                                                                                                  |
| Server repositories | `evidenceRepository.ts`, `entityEvidenceRepository.ts`                                                           |

**Canonical name:** UNCLEAR  
**Drift severity:** HIGH — the `evidence` table is a near-empty (11 rows) legacy structure with massive structural overlap with `documents`. `entity_evidence_types` is active (110K rows) but represents entity-to-evidence-type category links, not actual evidence records. `evidence_entity` (0 rows) was intended to link evidence to entities but was never populated.

---

### 12. File Asset

| Layer             | Name(s)                                          |
| ----------------- | ------------------------------------------------ |
| Database tables   | `file_assets`, `document_assets`, `media_assets` |
| Server repository | (no dedicated `fileAssetsRepository.ts`)         |

**Canonical name:** `file_asset`  
**Drift severity:** MEDIUM — `document_assets` (13K rows) and `media_assets` (0 rows) are junction tables with confusing names. They link to `file_assets` as the actual store, but `document_assets` sounds like "the assets of a document" and `media_assets` sounds like "the assets of a media item."

---

### 13. Mentions

| Layer           | Name(s)                                                                |
| --------------- | ---------------------------------------------------------------------- |
| Database tables | `mentions` (0 rows, raw NER), `entity_mentions` (2.79M rows, resolved) |

**Canonical name:** `entity_mention`  
**Drift severity:** HIGH — `mentions` is dead (0 rows). The naming implies the same concept at different pipeline stages but there's nothing to distinguish them at the API level.

---

### 14. Analytics / Statistics

| Layer             | Name(s)                                                   |
| ----------------- | --------------------------------------------------------- |
| Database tables   | `analytics_refresh_log`                                   |
| API routes        | `/api/stats`, `/api/analytics`, `/api/advanced-analytics` |
| Server routes     | `stats.ts`, `analytics.ts`, `advancedAnalytics.ts`        |
| Server services   | `AdvancedAnalyticsService.ts`                             |
| Server repository | `analyticsRepository.ts`, `statsRepository.ts`            |

**Canonical name:** UNCLEAR  
**Drift severity:** MEDIUM — `stats` vs `analytics` are both active but split across separate routes and repositories without a clear boundary. `/api/advanced-analytics` is a third variant.

---

### 15. Pipeline / Processing Jobs

| Layer               | Name(s)                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| Database tables     | `processing_jobs`, `pipeline_runs`, `pipeline_steps`, `ingest_runs`, `resolver_runs` |
| Server repositories | `jobsRepository.ts`, `ingestRunsRepository.ts`                                       |
| Server services     | `pipelineService.ts`, `JobManager.ts`                                                |

**Canonical name:** UNCLEAR  
**Drift severity:** MEDIUM — five separate pipeline-state tables with overlapping purposes. `processing_jobs` (470MB) and `pipeline_runs`/`pipeline_steps` appear to be different tracking mechanisms for the same pipeline.
