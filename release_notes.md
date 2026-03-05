# Release Notes

## 15.6.0 - 2026-03-05 - Public Read / Admin Write Policy + Security Hardening

### Access Control Policy

- **Public Read Surface:** Read endpoints remain publicly accessible for investigative browsing, including static corpus serving.
- **Admin-Only Writes:** Non-read API methods are now centrally enforced as authenticated admin-only, covering media edits, tagging, and user-management style mutations.
- **Auth Route Tightening:** Password change operations are explicitly restricted to admin role.

### Security & Audit Integrity

- **Error Log Redaction:** Removed full request-body logging from global error handling and replaced it with key-only context.
- **Audit Logging Fail-Closed:** Audit insert failures now throw instead of being silently swallowed, preventing untracked sensitive actions.
- **Request Correlation:** Audit payloads now support request-id linkage for traceable forensic timelines.
- **Upload Chain-of-Custody Fix:** Evidence upload now correctly awaits DB insert and logs valid document IDs.
- **Refresh Token Rotation:** Added refresh-token persistence/rotation plumbing and migration support for revocation-aware session handling.

### Search & Reliability

- **Prefix Query Safety:** Removed the universal-match fallback for empty prefix tokens; invalid tokenized prefix queries now return empty, explicit result sets.
- **Document Detail Resilience:** `/api/documents/:id` now degrades gracefully when face-cluster tables are absent, instead of returning 500.
- **Production Gate Readiness:** Local CI-equivalent checks passed (`type-check`, `lint`, `test:unit`, `build`) before release cut.

## 15.5.0 - 2026-03-05 - Unified Modern Viewer + Gmail-Style Email Workspace

### Viewer Architecture

- **Legacy Viewer Deleted:** Removed the old inline `DocumentViewer` implementation from `DocumentBrowser` and all associated dead code/imports.
- **One Viewer Path:** Document selection now always routes through `DocumentModal`, eliminating split behavior and regressions between two viewer stacks.

### UX Simplification

- **Reduced Tab Overload:** Consolidated top-level viewer tabs to `Summary`, `PDF View`, `Text Analysis`, `Annotations`, and `Provenance`.
- **Text Modes Grouped:** Merged `Clean Text`, `Raw OCR`, and `Diff View` into a single `Text Analysis` workspace with in-panel mode toggles.
- **Not Everything is a Tab:** Detailed entity and related-document exploration moved into the `Summary` flow while retaining click-through and dossier actions.

### Intel Rail Behavior

- **Info Pane Collapsed by Default:** Right intelligence pane now defaults to collapsed on open for cleaner first-read focus while still available on demand.

### Email Workspace UX

- **Filter Drawer, Not Always-On Panel:** Conversation filters are now hidden behind a compact `Filters` dropdown in the thread toolbar, preserving vertical space for thread scanning.
- **Body-First Layout:** Rebalanced pane widths to prioritize the reading surface so message bodies remain the focal area.
- **No Centered Reading Canvas:** Removed centered/narrow message thread positioning to keep long-form email content left-anchored and easier to read at speed.

## 15.4.8 - 2026-03-05 - Unified Modern Document Viewer

### Viewer Consistency

- **Legacy Viewer Removed from Document Browser:** Document browser selections now open the same modern `DocumentModal` experience used elsewhere, replacing the older embedded viewer variant.
- **Consistent Controls & Layout:** Removed the legacy eye/plus-style header controls and old panel chrome from this path for a single consistent viewing UI.
- **Close Behavior Preserved:** Closing the modal still correctly clears document selection and returns to the browser context.

## 15.4.7 - 2026-03-05 - Single-Asset PDF View Simplification

### Document Viewer UI

- **Removed Variant Toggle:** Removed `Dirty / Cleaned / Original` controls from the PDF view toolbar.
- **Single Asset Behavior:** Viewer now always opens the canonical document file for this view, matching the single-source storage model.
- **OCR Separation Preserved:** Dirty vs cleaned distinctions remain in text tabs (`Clean Text` / `Raw OCR`) rather than file-level asset toggles.

## 15.4.6 - 2026-03-05 - Asset Viewer Fix for Non-PDF Documents

### Document Viewer

- **No More Infinite \"Downloading PDF...\":** Fixed `PDF View` hanging on image-backed records (e.g. `.JPG`) by detecting asset type and rendering non-PDF assets directly.
- **Single-Asset Routing:** `Dirty` and `Cleaned` now default to the same canonical document file when dedicated cleaned/original files are not present, instead of forcing missing variant paths.
- **Loading Copy Cleanup:** Updated loader text to `Loading document...` to reflect mixed asset support (PDF/image) instead of PDF-only behavior.

## 15.4.5 - 2026-03-05 - Entity Header Cleanup & Profile Photo Reliability

### UI Refinement

- **Removed Oversized Header Badge:** Removed the large floating `Inferred Evidence` header badge from the entity modal profile area to reduce visual clutter.
- **Profile Image Reliability:** Header profile image now resolves from multiple media URL fields with thumbnail-first fallback and API fallback (`/api/media/images/:id/thumbnail` then `/api/media/images/:id`) for PostgreSQL-normalized media rows.
- **Graceful Fallback:** If an image still fails, the modal falls back to the neutral icon without breaking layout.

## 15.4.4 - 2026-03-05 - Evidence Cards Open Viewer by Full-Row Click

### UX & Navigation

- **Full-Row Click for Evidence:** High-significance evidence rows and linked evidence cards in the entity modal are now fully clickable to open the in-app document viewer (`/documents?id=...`), not just the corner action link.
- **Keyboard Accessible:** Added `Enter` / `Space` activation for these cards to preserve accessibility and fast keyboard workflows.
- **Corner Action Preserved:** The corner `Open source` action still opens in a new tab, but now no longer blocks full-card click behavior.

## 15.4.3 - 2026-03-05 - Document Viewer Entity-Name Crash Fix

### Core Fix

- **Document Viewer Stability:** Fixed a production crash in the document viewer caused by entity records missing `full_name`. Entity rendering now safely normalizes names from `full_name | fullName | name` before matching and click dispatch.
- **Related Entities Panel:** Prevented runtime failures when mention chips are generated from partial entity payloads, ensuring documents always render even with heterogeneous PostgreSQL-backed entity rows.
- **Deployment Hardening:** Excluded local `venv/` trees from formatter/linter scans so production deploy gates are not blocked by workstation-only Python/TensorFlow artifacts.

## 15.4.2 - 2026-03-04 - Timeline Accuracy & Evidence Backing

### Timeline & API

- **Evidence-Backed Timeline:** The Timeline API (`GET /api/timeline`) now returns comprehensive evidence counts for each event, including document, media, and supporting evidence totals.
- **Deduplication:** Improved event grouping logic to merge duplicate timeline entries (e.g., "Epstein Court Documents Released") into single canonical milestones, preventing clutter.
- **Date Filtering:** Added `startDate` and `endDate` query parameters to the timeline feed for precise historical filtering.

### Data Integrity

- **Canonical Milestones:** Established deterministic deduplication keys for major historical events (e.g., Epstein's death, 2024 document releases, bank settlements) to ensure a clean, authoritative chronology.
- **Inference Classifier Fix:** Resolved a regression where real individuals with professional roles (e.g., "Lawyer") were incorrectly classified as inferred entities.
- **Real-Person Priority:** Enforced strict sorting precedence (`RFI -> Risk -> Mentions`) to ensure named individuals always rank above inferred or role-based entities in search results.

### User Experience

- **Rate Limit Stabilization:** Fixed `429 Too Many Requests` errors for public users by implementing proxy-aware rate limiting (`trust proxy`) and increasing the global per-IP allowance.
- **Profile Avatars:** Restored profile photos for entities by implementing a smarter fallback lookup that checks for album matches when direct media links are missing.

## 15.3.0 - 2026-03-04 - Subject Integrity & Performance

### Core Improvements

- **Subject Aggregation:** Hardened the subject card system to correctly merge stats from all alias variants (e.g., "Donald Trump" + "President Trump"), preventing undercounting of mentions.
- **Startup Reliability:** Added automatic fallback to `/api/subjects` if the primary entities endpoint fails, ensuring the application always boots successfully even during partial outages.
- **Media Access:** Opened media endpoints (`/api/media/*`) for public read access, allowing researchers to browse albums and tags without authentication.

### Bug Fixes

- **Stale Bundle Reload:** The client now automatically detects new deployments and reloads the page to prevent "ChunkLoadError" crashes for users with long-running tabs.
- **Public Validation:** Fixed validation logic to allow `limit=500` on public document queries, matching the behavior of the active client.

## 15.0.0 - 2026-03-02 - Production Hardening & PostgreSQL Migration

### Major Architecture Update

- **PostgreSQL Migration:** Completed the transition from SQLite to PostgreSQL 16+, enabling massive concurrency and improved data integrity for the 1.3M document corpus.
- **Database Hardening:** Implemented strict connection pooling, robust health checks (`/api/health/deep`), and automated schema verification to prevent drift.
- **Legacy Cleanup:** Removed all dependencies on `better-sqlite3` and purged legacy SQLite database files from production.

### Security & Access

- **Strict RBAC:** Enforced Role-Based Access Control on all sensitive endpoints. Public users can access health and auth routes, while investigative data requires appropriate permissions.
- **Case Export:** Added a secure `GET /api/investigations/:id/export/zip` endpoint for researchers to download comprehensive case bundles (evidence + metadata).

## 14.5.0 - 2026-02-24 - Forensic Analytics & Network Intelligence

### Interactive Intelligence

- **Global Entity Map:** Launched a high-performance geospatial map visualizing 130k+ entity locations with risk-based clustering.
- **Network Graph V2:** Introduced "Semantic Zoom" and "VIP Face Integration" to the network graph, revealing deeper connections and high-risk figures at a glance.
- **Signal Purification:** Deployed advanced heuristics to filter out OCR noise and low-signal artifacts, ensuring cleaner search results and analytics.

### Data Recovery

- **Dataset Restoration:** Restored missing datasets for "Black Book" entries, "Palm Beach Properties," and "Flight Logs" via idempotent PostgreSQL migrations.
- **Email Metadata:** Backfilled missing sender/recipient metadata for thousands of emails by parsing raw `.eml` files, enabling accurate "Person-Only" mailbox filtering.

## 14.0.0 - 2026-02-19 - Temporal Investigation & Forensic Determinism

### Investigative Tools

- **Temporal Graph Filtering:** Added a global timeline slider to the Analytics dashboard, allowing investigators to slice the network graph by specific time periods.
- **Provenance Tracking:** The Evidence Drawer now displays full extraction metadata (AI model, pipeline version), providing complete traceability for every claim.
- **Visual Evidence Encoding:** Differentiated graph edges to show "Direct" (evidence-backed) vs. "Inferred" (agentic) connections.

### UI Polish

- **Liquid Glass Design:** Refreshed the entire UI with a modern "liquid glass" aesthetic, improved depth, and consistent high-contrast accessibility tokens.
- **Unified Navigation:** Reworked the global header and search bar for better usability and reduced visual clutter.

## 13.0.0 - 2026-02-11 - Forensic Transparency & Credibility

### Evidence & Audit

- **Evidence Ladder:** Launched a verified evidence system where every "Direct" claim is backed by at least one specific document span.
- **Agentic Watermarking:** All AI-assisted inferences are now explicitly marked (`was_agentic=true`) and logged for forensic audit.
- **Integrity Suite:** Deployed a new `credibility_tests` suite to continuously verify graph invariants and confidence consistency.

### Operations

- **Deep Health Checks:** Enhanced monitoring to track FTS synchronization, database journal health, and critical table statistics.
- **Automated Backups:** Implemented zero-downtime backups with daily restore drills to guarantee data preservation.

## 12.0.0 - 2026-02-02 - DOJ Archive Consolidation

### Archive Expansion

- **Massive Ingestion:** Integrated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence.
- **Unified Discovery:** Standardized the organizational structure for all DOJ materials to enable seamless cross-referencing.

### Forensic Workspace

- **Financial Transaction Mapper:** Visualizes financial flows between entities to highlight potential money laundering or high-risk transfers.
- **Multi-Source Correlation:** Cross-references entity mentions across the entire archive to surface hidden connections and verify facts.

## 11.0.0 - 2026-01-20 - Data Expansion & Analytics Upgrade

### Flight Logs & Properties

- **Flight Log Expansion:** Expanded the flight database to 110 documented flights (1995-2005) and added support for the "N212JE" Gulfstream II aircraft.
- **Palm Beach Properties:** Ingested 9,535 property records, automatically flagging those owned by known Epstein associates.

### Media & Search

- **Audio Intelligence:** Added transcript-derived titles and smart albums for audio evidence (e.g., "Sascha Barros Interviews").
- **Full Text Search:** Restored high-performance FTS with term highlighting (`<mark>`) in document results.

## 10.0.0 - 2026-01-13 - Media Unification & Audio Intelligence

### Unified Media Experience

- **Media Browser:** Unified Audio, Video, and Image browsing into a consistent interface with batch tagging and filtering.
- **Smart Metadata:** Automatically generates titles and descriptions for audio files based on their transcripts.

### Bug Fixes

- **Modal Stacking:** Resolved critical z-index issues where document viewers would open behind entity modals.
- **Junk Filtering:** Aggressively removed thousands of OCR noise entities (e.g., "Total Cash Disbursements") to improve index quality.
