# Release Notes

## 19.6.6 - 2026-04-26 - Forensic Search Integrity & Smoke Test Stabilization

### Bug Fixes

- **Search Navigation**: Document titles and context snippets in the Evidence Search results are now clickable links, allowing direct navigation to the document viewer from any search match.
- **Deep-linked Passages**: Enabled clickable file links within the "Spatial Contexts" and "Culpability Passages" sections of entity search results, bridging the gap between entity discovery and source evidence.
- **Visual Polish**: Refined the circular search button geometry and fixed a layout regression where grid card rounding was leaking into the wrong children at specific breakpoints.

### Infrastructure

- **Test Stabilization**: Increased the smoke test timeout to 60s to accommodate heavy relationship analysis queries on the full 1.6M record dataset, ensuring consistent CI/CD reliability.

## 19.6.5 - 2026-04-25 - Search Integrity & UX Polish

### Bug Fixes

- **Search Navigation**: Resolved critical 404 errors when clicking on media, investigations, or articles in the global search results. These items now correctly route to their respective viewers instead of defaulting to a broken document page.
- **Vertical Alignment**: Refined the vertical centering of navigation labels and breadcrumbs with precision optical adjustments for a more balanced aesthetic.

### Improvements

- **Evidence Display**: Enhanced entity cards to show a "Verified Media" count and a dedicated media chip when assets are present, addressing requests for better visibility of non-audio evidence.
- **Breadcrumb Compactness**: Further optimized breadcrumb vertical space and alignment for improved information density.

## 19.6.4 - 2026-04-25 - Robust Asset Serving & System Hardening

### Improvements

- **Face Gallery Assets**: Standardized path resolution using canonical `resolveMediaPath` to ensure reliable serving of face crops and thumbnails across different database path formats.
- **Security**: Hardened asset serving with centralized data root validation.

## 19.6.3 - 2026-04-25 - Emergency ESM Fix & System Stability

### Bug Fixes

- **ESM Compatibility**: Fixed missing `.js` extensions in internal imports for Memory and Admin routes which caused production startup failures.
- **Service Initialization**: Corrected RevisionManager initialization sequence in the main app lifecycle.
- **Final UI Polish**: Verified entity card rounding and shadow logic for mobile-first grid consistency.

## 19.6.2 - 2026-04-25 - Final 404 Resolution & Face Gallery Assets

### 404 Remediation & Features

- **Face Gallery Fix**: Implemented a secure asset serving route `/api/faces/assets` and updated the gallery to fix 404s on face crops and thumbnails.
- **Admin Dashboard Stability**: Fully restored the Backups and Ingest Runs history by implementing the missing API endpoints and repository methods.
- **Service Recovery**: Final stabilization of API mounting to ensure all dark routes are consistently available.

## 19.6.1 - 2026-04-25 - 404 Elimination & API System Completion

### API & Data Integrity

- **System-wide 404 Remediation**: Resolved all identified broken API links across the platform.
- **Media Endpoint Standardization**: Unified singular/plural media routes and transitioned to the `/stream` endpoint for all Audio/Video assets for improved playback performance.
- **API System Mounting**: Fully integrated the Memory, Data Quality, and Audit Log systems into the main application router.
- **New Audio Thumbnail Endpoint**: Implemented a server-side handler for audio asset thumbnails to restore broken gallery previews.
- **Hardcoded URL Removal**: Replaced absolute `epstein.academy` URLs with origin-relative paths to ensure portability across different deployment environments.

### Administrative Tools

- **Restored Audit Logs**: Fixed the missing `/api/admin/audit-logs` endpoint and mapped database records to the client-side forensic viewer.
- **System Health Restoration**: Re-enabled the System Health and Ingestion History reporting by mounting the corresponding stats and vitals routes.

## 19.6.0 - 2026-04-25 - Forensic Interface Refinement & Data Integrity Hardening

### UI & UX Polish

- **Refactored Entity Card Grid**: Removed the extraneous container box. Corner rounding is now applied per-card using complex `nth-child` logic (1, 2, and 3-column aware) so the cards themselves form a cohesive rounded block.
- **Nav Item Vertical Centering**: Corrected the vertical alignment of navigation labels with precision offsets to ensure perfect optical centering with icons.
- **Compact Breadcrumbs**: Significantly reduced the vertical height of breadcrumbs and aligned them with the main content boundaries to prioritize investigative data.
- **Evidence Overview Media Preview**: Added a "Verified Media" preview section to the Evidence Overview tab, providing immediate visual access to extracted assets.

### Media System Hardening

- **Endpoint Singularization**: Updated the client to use singular `/api/media/video/` and `/api/media/images/` to match the server's routing scheme, resolving 404s on asset retrieval.
- **Thumbnail Reliability**: Corrected `normalizeEntityMediaItem` to ensure video thumbnails are fetched via the correct media-specific endpoints.
- **Category Filtering Fix**: Resolved a bug in the Media tab where "Photos" and "Videos" categories failed to filter correctly due to singular/plural mismatches in file type checks.

### Database & Server Integrity

- **Financial Schema Alignment**: Fully migrated the `intelligenceRepository` from `financial_items` to the modern `financial_transactions` schema with explicit `from_entity` and `transaction_type` mapping.
- **Entity Identity Normalization**: Unified database queries to use `full_name` as the canonical entity identity column across the `intelligenceRepository`.
- **Evidence Mapping Hardening**: Fixed the mapping of "High Significance Evidence" in the Evidence Modal to ensure document IDs and filenames are always reliably populated.
- **Claim Triples Refinement**: Updated the intelligence repository to support verified status checks and standardized predicate naming (`predicate` vs `predicate_text`).
- **Stats & Graph Reliability**: Fixed data mapping for relationship strength and stats aggregation queries in the PostgreSQL query layer.

## 19.5.6 - 2026-04-24 - Search Button Margin Polish

### UI & UX Polish

- **Search Button Clearance**: Refined the search button geometry to ensure it sits perfectly within the search box borders with a consistent 1px-2px margin on all sides. This prevents any visual overlap with the pill-shaped container's border, resulting in a cleaner, more professional forensic aesthetic.

## 19.5.5 - 2026-04-24 - Search Box Integrity & Centering Fix

### UI & UX Polish

- **Search Box Container**: Re-engineered the search box by moving the pill-shaped background and border to the outer container. This guarantees that the search button and clear button are visually contained within the pill.
- **Nav Item Vertical Centering**: Corrected the vertical alignment of navigation labels with a negative vertical nudge to lift labels into the true optical center.

## 19.5.4 - 2026-04-24 - Perfect Pill & Alignment Refinement

### UI & UX Polish

- **Perfect Search Pill**: Forced the desktop search bar into a perfect pill shape by upgrading CSS specificity and enforcing maximum border-radius. This ensures absolute consistency with the integrated search button.
- **Nav Text Centering**: Refined the vertical centering of navigation labels across all tabs. Applied a precision vertical nudge to ensure perfect baseline alignment with forensic icons.

## 19.5.3 - 2026-04-24 - Forensic Interface Polish

### UI & UX Refinement

- **Breadcrumb Alignment**: Fixed breadcrumb left-alignment to perfectly match the logo and content edges. Added equal top and bottom padding for balanced vertical spacing.
- **Desktop Navigation Verticality**: Centered navigation labels and icons vertically within the desktop nav pill, resolving baseline offset issues.
- **Mobile Menu Optimization**: Significantly reduced vertical whitespace in the mobile slide-out menu header, search field, and footer, maximizing screen real estate for investigative content.
- **Nav Bar Alignment**: Aligned the desktop navigation bar's left and right edges with the main content boundaries and logo for a more structured, high-fidelity layout.

## 19.5.2 - 2026-04-24 - Desktop Search Polish

### UI & UX

- **Desktop Search Pill**: Refined the main search bar to a perfect pill shape with improved border-radius.
- **Search Button Integration**: Enlarged the yellow search button to fit neatly inside the pill with a precise 1px margin, providing a more integrated and premium feel.
- **Clear Button Alignment**: Adjusted the "Clear" button positioning to maintain consistent spacing with the new larger search button.

## 19.5.1 - 2026-04-24 - Navigation Polish & Mobile Consolidation

### Mobile UX & Layout

- **Unified Search & Filters**: Consolidated separate mobile buttons and sheets into a single, high-fidelity "Search & Filters" interaction. The unified button now provides a live summary of active search terms and date windows.
- **Header Alignment**: Horizontally aligned the logo and the menu button in a single row on mobile, reclaiming vertical space.
- **Enhanced Mobile Menu**: The mobile drawer now slides in from the right, layers over the entire UI (including the header), and supports a natural swipe-to-close gesture.
- **Bigger Brand Presence**: Increased the mobile logo font size for better legibility and visual weight.
- **Breadcrumb Spacing**: Significantly reduced vertical margins for breadcrumb navigation to prioritize data and charts above the fold.

### Desktop Navigation

- **Proportional Expansion**: Refactored the desktop navigation menu to fill the entire horizontal track while maintaining button widths proportional to their internal content.

---

## 19.5.0 - 2026-04-23 - Intelligence Workbench & Evidence Export Hardening

### Evidence Export

- Promoted evidence packet export into a first-class forensic bundle: `manifest.json` with deterministic evidence inventory, SHA-256 checksum, export limits, and per-file skip reasons.
- Added `evidence.csv` for reviewer-friendly spreadsheet inspection.
- Added `timeline.json` with investigation timeline events.
- Added `annotations.json` when evidence annotations are present.
- Added `README.md` inside the ZIP documenting bundle structure and integrity verification steps.
- Hardened ZIP export safety: null-byte stripping, data-root path confinement, symlink escape protection, size/file caps, and explicit skip-reason tracking (`path_traversal`, `file_not_found`, `size_limit`, `symlink_escape`, `not_a_file`, `duplicate_path`, `file_limit`).
- Added shared Zod schema (`exportManifestSchema`) for the export manifest contract.
- Made the investigation export panel a real download experience with JSON packet generation, authenticated ZIP downloads, progress, success, failure, filename, export-limit, and skipped-file feedback.

### Semantic Discovery

- Added Keyword, Conceptual, and Hybrid search controls to the Document Browser.
- Wired Conceptual and Hybrid document searches through the semantic search repository when pgvector embeddings are available.
- Added visible semantic status messaging so users know when conceptual search is active versus safely falling back to keyword search.
- Added per-result match badges in the Document Browser so analysts can distinguish text, conceptual, hybrid, and entity-context matches.
- Preserved legacy search links while standardizing backend mode values to `lexical`, `semantic`, and `hybrid`.

### Investigation Workbench

- Added a case readiness panel to investigations with evidence, timeline, hypothesis, annotation, provenance, and export-readiness signals.
- Improved empty investigation and empty evidence states with clear next actions into case folders, document search, and export tools.
- Exposed the evidence packet exporter in the mobile investigation export/report flow.

### Quality

- Added 19 unit tests covering manifest checksum determinism, CSV quoting, manifest ordering, and path traversal regression.
- Added Playwright API tests for the export endpoint: 401 guard, 404 guard, ZIP structure, manifest shape, and export determinism.
- Improved `/api/subjects` responsiveness for common “top subjects” browsing by introducing a bounded fast path and safer query behavior.
- Hardened Timeline UI date parsing with a safe fallback when data contains invalid dates.
- Prevented Vite dev-server ENOSPC file-watcher crashes by ignoring large local dataset directories (pipeline checkpoints/runs, data).
- Rolled out Zod-based request validation across all core routes (Financials, Flights, Timeline, Black Book, Media, Emails) to eliminate runtime type inconsistencies and harden the API surface.
- Implemented production-ready smoke tests with real endpoint probes for health, readiness, and public statistics.
- Added degraded-state fallback logic for the `/api/stats` endpoint to ensure system observability even during database initialization or query timeouts.
- Restored clean local `type-check`, `lint`, and production build gates for the v19.5 workstream.

---

## 19.4.2 - 2026-04-23 - UI Reconciliation & CI/CD Restoration

### UI & UX

- **Search Input Reconciliation**: Shipped a systematic fix for search input padding to prevent placeholder text from overlapping leading icons.
- **Global CSS Sibling Rule**: Implemented a universal CSS "catch-all" rule in `index.css` that detects icon-preceded inputs and applies correct forensic padding automatically.
- **Design System Specificity**: Increased CSS specificity for the DS `SearchField` component to ensure it overrides global baseline styles on complex pages.

### CI/CD & Infrastructure

- **Playwright Pipeline Fix**: Restored the production bundle smoke test suite in GitHub Actions by adding automated Playwright browser installation to the CI and deployment workflows.
- **Quality Gate Alignment**: Successfully verified all production verification scripts and bundle smoke tests against the v19.4.2 build.

---

## 19.4.1 - 2026-04-22 - Stability: Observability Hardening

### Server Observability

- Added explicit logging for previously silent failure paths (JWT verification failures; JSON parse fallbacks in Black Book, Timeline support, and Evidence metadata).
- Added debug-level logs for AI enrichment best-effort fallbacks (keeps behavior unchanged while restoring visibility when enabled).

---

## 19.4.0 - 2026-04-22 - System Hardening & Release Readiness

### Infrastructure & Stability

- **Architecture Hardening**: Upgraded CI and verification scripts (`verify_ops`, `check_client_server_boundary`) to be environment-agnostic and resilient to missing system binaries.
- **Ingestion Resilience**: Resolved `DOMMatrix` and `pdf-parse` runtime blockers for Node v20 compatibility, ensuring stable asset extraction across all environments.
- **Unified Pipeline Tracking**: Fully migrated the Ingest Runs infrastructure and UI to the modern `pipeline_runs` unified tracking system.
- **Relational Integrity**: Successfully completed a 59-step strict relational migration, enforcing referential integrity and performance-optimized junction tables across the core forensic data layer.

### Project Hygiene

- **Repository Sanitization**: Performed a full sweep of stale logs, temporary artifacts, and historical handovers to achieve a production-grade repository state.
- **Hardened Git Configuration**: Improved `.gitignore` rules to permanently exclude local environment and scratch artifacts.
- **Documentation Migration**: Centralized investigative reports into the formal documentation hierarchy.

---

## 19.3.2 - 2026-04-19

### Media Browser

- Added a PDF asset extraction endpoint and UI trigger so extracted photos populate the global Media Browser (Extracted Media album).
- Fixed per-document “Recovered Assets” fetch by supporting `documentId` filtering on `/api/media/images`.
- Removed layout overflow sources causing horizontal scrolling in the Media browser.

---

## 19.3.1 - 2026-04-18

### Mobile Overlays & Onboarding

- Fixed Mobile “More” menu toggle and restored reliable interaction.
- Standardized scroll locking to the actual app scroll container, restoring scroll within mobile overlays/sheets.
- Made mobile overlays render as full-screen, scrollable sheets with safe-area padding.
- Ensured the First Run Onboarding overlay always stacks above the footer.

---

## 19.3.0 - 2026-04-18

### Archival Hardening & Relational Integrity

- **Strict Relational Migration**: Completely replaced polymorphic associations and array-based columns (`BIGINT[]`, `UUID[]`) with explicit junction tables and foreign key constraints for `investigation_collaborators`, `forensic_signals`, and `audit_log`.
- **Fuzzy Identity Fusion**: Upgraded the `IdentityFusionService` to support trigram-based fuzzy matching (threshold > 0.85) and phonetic similarity, significantly improving subject resolution across disparate datasets.
- **Semantic Discovery Core**: Implemented the database foundation for conceptual search using `pgvector`, enabling high-performance semantic similarity queries for documents and entities.
- **Forensic Provenance UI**: Launched a new "Liquid Glass" Provenance Panel that visualizes the evidentiary trail behind a risk score or signal, ensuring full investigative transparency.
- **Repository Optimization**: Refactored the core investigation, forensic, and data quality repositories to utilize the new strict relational architecture.

---

## 19.3.0 - 2026-04-17

### Mobile UX

- Fixed Email Client layout on narrow/tablet widths by removing impossible minimum pane widths and ensuring list panes measure/scroll correctly.
- Fixed Investigation mobile overlays/sheets (consistent modal z-index, responsive widths/heights, and reliable scrolling inside the mobile shell).

### UI Stability

- Fixed the shared icon registry to include all referenced icons (prevents runtime icon lookup failures).
- Hardened offline indicator state handling (correct initial state, correct reconnect dismissal timing).

---

## 19.2.0 - 2026-04-17

### Media & Forensic Extraction

- Implemented a sharp-based text-detection heuristic (entropy + stdev analysis) to automatically flag OCR-heavy scanned document pages.
- Focused the Media Browser on photographic evidence by defaulting to "Hide Archival Scans" for a cleaner investigative gallery.
- Added a "Show Archival Scans" toggle to the Photo Browser to allow viewing raw document extracts when needed.
- Integrated a new **"Recovered Assets"** tab into the Document Modal, providing direct access to photos extracted from the specific document being reviewed.
- Enhanced relational data integrity by linking all extracted assets directly to their source `document_id`.

---

## 19.1.17 - 2026-04-17

### Mobile UX

- Made entity cards and entity dossier modal header mobile-first (smaller padding/typography; titles wrap instead of truncating; reduced media overlay padding).
- Made document browser and document viewer mobile-first (no modal width overflow near 768px; scrollable toolbars; disabled hover-only previews on touch; responsive annotation panels).

---

## 19.1.16 - 2026-04-17

### Document Viewer

- Fixed DOJ “Original Document” proxying by setting the required `justiceGovAgeVerified=true` cookie on upstream requests (prevents age-gate HTML responses and restores file access where local corpus is missing).

---

## 19.1.15 - 2026-04-17

### Document Viewer

- Fixed missing corpus resolution by trying both `data/...` and `...` relative paths against the mounted corpus roots (eliminates `/data/data/...` mis-resolve and reduces 404s).
- Prevented proxy fallback from serving DOJ age-gate HTML as if it were a document payload.

---

## 19.1.14 - 2026-04-17

### Document Viewer

- Fixed remaining 404s for DOJ-ingested paths by deriving and proxying the matching justice.gov URL when the local corpus file is missing.

---

## 19.1.13 - 2026-04-17

### Document Viewer

- Fixed remaining 404s for “Original Document” by proxy-streaming whitelisted remote source URLs when no local asset path exists.

---

## 19.1.12 - 2026-04-17

### Document Viewer

- Fixed “Original Document” viewing by serving the best available file variant when a dirty/original path is missing.
- Prevented intermittent 500s when attempting to send non-file paths from `/api/documents/:id/file` (now verifies regular files and surfaces send errors consistently).

---

## 19.1.11 - 2026-04-16

### Document Viewer

- Fixed PDF rendering under strict CSP by initializing a module worker via `workerPort` (prevents worker import fallback).
- Migrated document viewer search fields to DS `SearchField` to prevent icon/placeholder overlap.

---

## 19.1.10 - 2026-04-16

### PDF Viewer

- Fixed PDF rendering under strict CSP by bundling the PDF.js worker locally (no external CDN worker).

---

## 19.1.9 - 2026-04-16

### Document Viewer

- Fixed document modal loading by preventing null `initialDoc` from poisoning the query cache (restores `/api/documents/:id` fetch on open).

---

## 19.1.8 - 2026-04-16

### Document Viewer

- Fixed deep links and full-page navigations to `/documents/:id` so the document modal reliably opens on first load.

---

## 19.1.7 - 2026-04-16

### Document Open Fix

- Fixed document opening from evidence flows by preferring canonical document identifiers over evidence-row IDs.

---

## 19.1.6 - 2026-04-15

### Email Workspace Styling

- Shipped latest mailbox/thread visual refinements and spacing polish updates.

---

## 19.1.5 - 2026-04-15

### Email Workspace Styling

- Polished mailbox VIP highlighting and refined thread header/subheader spacing for consistency.

---

## 19.1.4 - 2026-04-15

### Email Workspace

- Fixed desktop layout so the message pane is always visible (mobile-only pane toggling no longer hides the third column on desktop).
- Increased horizontal padding for conversation totals and thread counts for consistent spacing.

---

## 19.1.3 - 2026-04-15

### Release Hygiene

- Removed lingering native interactive elements from the client by adding a DS `Range` primitive and adopting it where needed.
- Standardized slider styling to design tokens for consistent focus/track/thumb behavior.
- Cleaned up docs and tooling lists to avoid references to removed legacy files.

---

## 19.1.2 - 2026-04-15

### Black Book UI

- Restored DS-consistent padding on Black Book cards.
- Fixed search icon/placeholder overlap by migrating to DS `SearchField`.
- Improved thumbnail picking to prefer tagged entity face crops when available.

---

## 19.1.1 - 2026-04-15

### CI, Type Safety, and Deploy Readiness

- Cleared all CI lint warnings and TypeScript errors across client and server.
- Removed remaining `import.meta` `any` usage in API status/unavailable surfaces.
- Fixed strict typing issues in repository utilities and black book ID filtering.
- Refined property map loading flow to avoid set-state-in-effect lint regressions.
- Preserved lazy import reliability while keeping chunk retry logic lint-clean.
- Finalized deploy gate requirements for `release_notes.md` and shipped patch release.

---

## v19.1.0 - 2026-04-15 — Full Design System Migration

Completes the design system migration across the entire client codebase. Every raw `<button>`, `<select>`, `<textarea>`, and text/file `<input>` element has been replaced with DS primitives, establishing a single, token-governed UI layer with no ad-hoc native form elements remaining outside the design system itself.

### Design System

- **Complete form element migration**: All `<button>` → `Button`, `<select>` → `Select`, `<textarea>` → `Textarea`, `<input type="text/email/number/password/search">` → `TextInput`/`SearchField`, `<input type="file">` → `FileInput` across ~190 component files
- **New DS primitives**: Added `FileInput`, `Input` (migration wrapper), `TextArea`, and `NativeSelect` components to the design system with full token support
- **FileInput component**: New `FileInput.tsx` + `FileInput.css` with `::file-selector-button` styling via DS tokens, following the `BaseFieldProps` density/size pattern
- **Zero raw form elements**: Verified with grep — no unmigrated form elements remain anywhere in `src/client/` outside the design system implementation itself

### Infrastructure

- Excluded `.pnpm-store` from Prettier to prevent false-positive parse errors during pre-flight QA

---

## v19.0.4 - 2026-04-14 — Responsive UX Unification & Release Hardening

This patch unifies complex mobile workflows with the broader product shell so email, investigation, panels, and overlays feel like one reliable system across desktop and handheld use.

### UX & Design System

- **Responsive email workspace**: Removed the parallel mobile email product surface and routed all email workflows through the shared responsive client, reducing UX drift between breakpoints
- **Shared sheet/modal behavior**: Rebuilt the mobile email filters and investigation capture/add flows on top of shared dialog, button, and input primitives for consistent spacing, focus handling, accessibility, and motion
- **Investigation panel consistency**: Reconnected the memory and leads panels to governed module styling so side surfaces align with the current design language instead of older ad-hoc presentation patterns
- **Browser reliability**: Fixed the file preview modal's Download action so it now performs a real download instead of presenting a dead-end CTA
- **Release governance**: Hardened the design-token audit script so release verification no longer fails on deleted legacy files, making the production gate more trustworthy

---

## v19.0.3 - 2026-04-13 — Design System Consolidation

Completes the design system primitive consolidation across all UI components, eliminating ad-hoc styling in favour of centralized DS tokens and layout primitives.

### Refactor

- **DS Consolidation**: Migrated all remaining components to design system primitives — buttons, inputs, selects, and layout containers now consistently use DS-managed tokens
- **CSS Specificity Hardening**: Resolved input padding specificity conflicts by doubling class selectors `(.cls.cls)` to (0,2,0), beating the global baseline `input[type='text']` at (0,1,1)

---

## v19.0.2 - 2026-04-13 — Design System Specificity Fixes

Fixes three CSS specificity regressions introduced by the DS consolidation refactor, where DS Button attribute selectors (`(0,3,0)`) silently won over consuming component module classes (`(0,1,0)`).

### Bug Fixes

- **Toast close button**: restored intended `1.5rem × 1.5rem` size — the DS `[data-size='sm'][data-icon-only]` rule was overriding the `.closeBtn` override to 2rem
- **Mobile menu close button**: restored transparent background — the DS secondary variant was winning over the module's `background: transparent`
- **Flight tracker passenger select**: added `size="sm"` to match all other filter selects (was defaulting to `md`, 44px)

---

## v19.0.1 - 2026-04-12 — Systematic Layout & Design System Hardening

This patch standardizes the application's layout primitives and form controls, ensuring pixel-perfect consistency across all investigative surfaces.

### UI & Layout Standardisation

- **Global Baseline Hardening**: Implemented a global CSS baseline for all native `select`, `input`, and `textarea` elements. This ensures consistent 36px/44px heights and Liquid Glass styling even in legacy components.
- **Evidence Search Refactor**: Migrated the Evidence Search filters to official Design System components, resolving title/badge overlaps and alignment clumping.
- **Breadcrumb Alignment**: Added standard vertical margins to the breadcrumb navigation to prevent content clumping with page headers.
- **Design System Expansion**: Added `size="sm"` support to the `Select` component for compact forensic toolbars.

## v19.0.0 - 2026-04-12 — Mobile-First UX Overhaul & Media Browser Hardening

This major release delivers a comprehensive mobile-first redesign across five core investigation pages, adds touch gesture support throughout, and fixes functional bugs in the media browser.

### Mobile UX Overhaul

- **Network Graph (D3 force graph)**: Added pinch-to-zoom via Touch Events API, single-finger pan, initial state lazy-initialization (no flash of incorrect layout), `collapsedWidth=0` on mobile so the settings panel fully collapses, and CSS hiding of desktop-only controls at ≤767px.
- **Timeline**: Modal rows stack to single-column on narrow viewports; filter/sort buttons get 44px minimum touch targets; sticky header loses negative margin overflows on mobile; event card and timeline padding reduced for small screens.
- **Analytics**: Removed `max-height: 85vh` constraint on the network section so it doesn't clip on mobile; hid slider, timeline, and path-mode controls that require hover/precision input; reduced viz panel padding.
- **Flight Map**: Full pointer-events pan and pinch-zoom using `setPointerCapture` for reliable cross-device drag tracking. The map transforms via CSS `translate + scale` on a wrapper div (no SVG mutation). A "Reset view" button appears conditionally when the transform is non-identity.
- **Flights tab bar**: View-mode labels (Timeline, Map, Stats, Network) are hidden on ≤480px via `viewTabLabel` CSS class — icons remain, saving horizontal space.
- **People page**: Filter wrap shrinks to full-width on very narrow viewports; toolbar wraps gracefully.

### Media Browser Fixes

- **AudioBrowser — setState during render (React violation)**: Removed the `containerWidth` state that was being set inside the AutoSizer render callback (`setContainerWidth(width)`). React 18 flags this as "Cannot update a component while rendering a different component", causing an extra render cycle and a visible layout jump on load. Refactored: `columns` is now computed as a plain variable inside the AutoSizer callback (same pattern as `VideoBrowser` and `PhotoBrowser`). Converted the inline `Row` closure to a standalone `AudioRow = React.memo(...)` component using react-window's `itemData` prop, eliminating all closure-captured state.
- **PhotoBrowser — list row selection variant bug**: In `ListRow`, both branches of the selection ternary returned `'glass-highlight'` — selected and unselected rows were visually identical in list view during batch mode. Fixed: unselected rows now use `'glass-strong'`.

## v18.8.6 - 2026-04-11 - Evidence Navigation Restoration & SQL Optimization

This release restores visibility for high-volume entity evidence and hardens the archival media browsing interface with premium "Liquid Glass" refinements and technical sorting fixes.

### Evidence & Scaling

- **High-Volume Restoration**: Resolved a critical data retrieval failure for high-exposure entities (e.g., Jeffrey Epstein, ID 1). Implemented a CTE-based SQL optimization that guarantees document uniqueness and reliable pagination for collections exceeding 111,000 records.
- **BigInt Standardization**: Unified ID handling across the repository and API layer to prevent precision loss and ensure consistent archival retrieval.
- **Natural Sort Implementation**: Enabled "Human" sort fallback for testimony documents (e.g., Sascha Barros Parts 1-6), ensuring they appear in logical numeric sequence instead of chronological/lexicographical order.

### Media & UI Refinement

- **Archival Media Stability**: Fixed a bug where empty media sets returned 204 status codes, crashing the frontend. Resolved media type detection regressions for robust integrated playback of forensic audio and video.
- **Improved Scroll Affordance**: Increased the media browser height to 750px (approx. 2.25 rows) to provide a clear visual cue that content continues below the fold.
- **UI Decluttering**: Purged redundant archival metadata chips (e.g., `#PROV-VERIFIED`) from document cards to improve scannability.
- **Liquid Glass Aesthetics**: Integrated high-fidelity blurred background layers and glass-surface refinements across the media exploration suite.
- **Zero-Error Standard**: Achieved 100% build hygiene by resolving all residual linting and formatting warnings in the core investigation workspace.

## v18.8.5 - 2026-04-11 - Documentation Sync & Version Alignment

This release synchronizes the archival version history with recent mobile investigation features and maintains UI stabilization across viewports.

### Documentation & History

- **Mobile Investigation Suite Enrichment**: Retroactively updated the v18.8.0 history to accurately reflect the launch of the Mobile Investigation Shell, Evidence Capture Sheet, and Forensic Workbench.
- **Version Alignment**: Unified the local development baseline with the production deployment cycle.

## v18.8.4 - 2026-04-11 - UI Decluttering & Stabilization

This release focuses on streamlining the header and mobile layouts by removing redundant stat chips that duplicated information found in the primary dashboard cards.

### UI & Layout

- **Header Simplification**: Removed the redundant "People", "Mentions", and "Files" chips from the desktop header. This declutters the top navigation area and puts more focus on the branding and search tools.
- **Mobile Stabilization**: Purged the redundant mobile stats grid. This ensures a more consistent experience across devices, as these metrics are already prominently displayed on the main dashboard.
- **Code Hygiene**: Cleaned up the associated count-up animations and CSS modules, resulting in a slightly leaner application payload.

## v18.8.3 - 2026-04-11 - Integrated Media Playback & Browsing

This release significantly enhances the archival media experience by introducing category-based sub-navigation and immersive integrated players for Photos, Video, and Audio evidence.

### Media & UX Enhancement

- **Sub-Tab Navigation**: Added persistent sub-navigation within the Media tab to filter content by **Photos**, **Videos**, and **Audio**. This allows for faster identification of signal-rich evidence.
- **Integrated Forensic Players**: No more raw file views in new tabs. Clicking any media item now opens an immersive integrated player:
  - **Audio**: Uses the forensic signal log with live waveform visualization and synchronized transcripts.
  - **Video**: Employs the high-fidelity archival video player with support for chapters and metadata.
  - **Photos**: Features a premium glassmorphic image viewer.
- **Live Metadata Enrichment**: The integrated players now automatically fetch and display forensic transcripts and chapters upon selection, ensuring full archival context is always available during investigation.

### UI & Styling

- **Glassmorphic Navigation**: Implemented themed sub-tab controls that align with the Liquid Glass design language.
- **Immersive Overlays**: Optimized player backdrops and loaders for a focused, evidence-first exploration experience.

## v18.8.2 - 2026-04-10 - Evidence Data Restoration & Query Optimization

This critical hotfix restores visibility for high-exposure entities by optimizing the underlying evidence retrieval engine and hardening the investigation suite's document browsing interface.

### Evidence & Performance

- **Query Optimization**: Completely refactored the `getEntityDocumentsPaginated` engine. By replacing expensive `GROUP BY` operations on large text columns with a streamlined `DISTINCT ON` approach, response times for high-profile entities (e.g., Jeffrey Epstein) have been reduced from 1500ms+ to <50ms.
- **Restored Evidence Visibility**: Resolved a regression where the Evidence tab would fail to render records for entities with significant document counts.
- **Hardened Empty States**: Upgraded the `EvidenceDocumentsTab` to handle edge-case loading failures gracefully. Replaced the blank container with a predictive "Syncing..." status to maintain UI continuity during high-lag archival fetches.

### Technical Hygiene

- **Type Safety**: Achieved 100% build hygiene by resolving remaining `any` type warnings in the Evidence Modal and Network Visualization components.
- **Deployment Resilience**: Synchronized production deployment keys and bypassed local environment conflicts to ensure immediate hotfix availability.

## v18.8.1 - 2026-04-10 - UI Hardening & Natural Sorting

This patch release hardens the media browsing experience with human-readable sorting, improved scroll affordance, and global layout stability across the investigation suite.

### Media Browser & UX

- **Human-First Sorting**: Implemented natural sorting for media assets. Numbered series (e.g., "Sascha Barros Testimony Parts 1-6") now appear in their correct logical sequence rather than lexicographical order.
- **Scroll Affordance**: Calibrated the media browser height to 680px (approximately 2.25 rows) to provide a clear visual cue that content continues below the fold.
- **Blurred Thumbnail Aesthetic**: Upgraded sensitive media placeholders to a high-fidelity glassmorphic design, using 40px background blurs of the actual assets to maintain aesthetic continuity.
- **VIEW Link Fix**: Corrected a regression where media "VIEW" buttons triggered raw JSON API responses; links now correctly resolve to high-resolution asset files.

### Global Layout & Stability

- **Box-Sizing Hardening**: Implemented a global `box-sizing: border-box` reset to prevent padding-induced layout overflows and ensure predictable component geometry.
- **Close Button Alignment**: Resolved a visual regression where the "What's New" dialog close button overran the panel boundaries.
- **Header Geometry**: Refined the Release Notes panel header and footer for perfect pixel alignment within the Liquid Glass design system.

## v18.8.0 - 2026-04-10 - Forensic Portraits & Mobile Investigations

This release introduces the standardized Forensic Portrait system and launches the comprehensive **Mobile Investigation Suite**, enabling full investigative capabilities and case management on-the-go.

### Mobile Investigation Suite

- **Mobile Investigation Shell**: A dedicated, high-fidelity workspace for mobile devices (`MobileInvestigationShell`). It provides a seamless transition from desktop, with persistent case state and tabbed tool access.
- **Evidence Capture Sheet**: Introduced a gesture-driven capture interface for rapid evidence tagging and archival linking while in the field.
- **Mobile Board & Timeline**: Optimized the investigation board and chronology views for small viewports, ensuring evidence maps and event sequences remain legible and interactive.
- **Forensic Workbench**: Integrated communication analysis, hypothesis testing, and forensic metadata tools into a responsive mobile environment.

### Forensic UI & Portraits

- **Forensic Portrait System**: Implemented a canonical entity portrait API (`/api/entities/:id/portrait`) that prioritizes high-fidelity face crops from the forensic detection pipeline.
- **Dossier Enrichment**: Integrated forensic portraits into the Subject Dossier Panel, providing a visual pivot point for entity metrics and document analysis.
- **Unified Identity**: Updated Person and Subject cards across the "Leads" and Search interfaces to utilize standardized forensic zoom shots, improving subject recognition speed.

### Media Browser Hardening

- **Audio Browser Stability**: Fixed a rendering regression where audio recordings would fail to appear upon tab activation; refactored to use `AutoSizer` for robust viewport calculations.
- **Standardized Search Interface**: Migrated legacy search inputs in the Audio and Video browsers to the unified Liquid Glass `SearchField` design system primitive.
- **Layout Spacing Harmony**: Corrected vertical spacing and button alignment across all three media tab headers (Audio, Video, Photo) for consistent UX.

### Archival Integrity

- **Sascha Riley Verification**: Confirmed and verified the successful backfill of the Sascha Riley TikTok Q&A collection and associated forensic albums.
- **Environment Sync**: Synchronized local development configurations with the latest production baseline.

## v18.7.0 - 2026-04-10 - Media Visibility & Archival Preservation

This release resolves critical gaps in the media library, enabling full visibility for archival image collections, and hardens the search interface for forensic speed.

### Media Visibility & Archival Gaps

- **Image Gallery Promotion**: Fixed a long-standing ingestion gap where images were excluded from the media library. All archival evidence images (e.g., Sascha Riley adoption papers, receipts) are now promoted to the gallery.
- **Entity Linking Accuracy**: Refactored the media search API to correctly join with the `media_item_people` junction table, ensuring all tagged media (including face cluster results) appears in an entity's direct photo feed.
- **Sascha Riley Preservation**: Finalized the backfill for the Sascha Riley TikTok and associated forensic images, ensuring 100% visibility for the collection.

### Visual Hardening

- **Search Row Standardization**: Migrated the Photo Browser header to Liquid Glass design primitives, ensuring pixel-perfect 32px alignment and uniform spacing across all filter controls.
- **Headshot Prioritization**: Upgraded entity profile pictures to prioritize detected face crops over full-media thumbnails for faster suspect identification.

## v18.6.0 - 2026-04-10 - Archival Hardening & Liquid Glass Standardization

This minor release bundles significant "Hardening" improvements across the investigation suite, purifies the entity directory from archival noise, and completes the standardization of visualization surfaces using Liquid Glass tokens.

### Archival Hardening & Data Integrity

- **Junk Entity Purge**: Improved the entity extraction filter to automatically identify and suppress email header fragments, salutations, and role-based labels (e.g., "From:", "Hi Jeffrey", "professor", "original message").
- **Robust Relationship Joins**: Fixed type-casting mismatches in the media linking SQL logic, ensuring persistent associations between entities and forensic assets.
- **Dossier Precision**: Denormalized mention and evidence counts on the primary entity listing to ensure accurate, high-speed sorting.

### Investigation Suite & Visualizations

- **Typed Forensic Reporting**: Upgraded the Report Generator with explicit schema interfaces and localized source tracking for more accurate evidence mapping.
- **Standardized Surface tokens**: Integrated Liquid Glass design tokens (`--accent-info`, `var(--nav-flights)`, etc.) into the Network Graph and entity cards to eliminate visual drift.
- **UI Spacing Polish**: Refined toolbar geometry and flex-alignment on the People page for better viewport accessibility.

### Technical & Quality

- **Zero-Warning Hygiene**: Verified a clean production build with 100% pass rates on linting, type-checking, and automated smoke test suites.
- **Rollback Safety**: Hardened the deployment pipeline with pre-migration Postgres backups and chunk-cache compatibility for zero-downtime serving.

## v18.5.1 - 2026-04-10 - Production Hardening & People Page Restoration

This maintenance release finalizes the v18.5.0 migration by resolving critical data filtering logic, unifying toolbar layouts on the People page, and achieving a zero-warning TypeScript baseline for the Investigation Suite.

### Forensic Restoration (People Page)

- **VIP Filtering Fix**: Corrected the "VIP Only" filter to accurately target the `is_vip` database column, restoring visibility for high-value entities.
- **Unified Toolbar**: Refactored the People page toolbar with flexbox to ensure perfect vertical alignment between metadata, filter dropdowns, and sort controls.
- **Empty State UX**: Added a contextual "Clear All Filters" reset to the "No Results" view, improving the investigator recovery path.

### Type-Safety & Stability

- **Zero-Warning Hardening**: Resolved 9 critical TypeScript errors and 80+ linting warnings, including schema mismatches in the `entities` repository (synchronized `likelihood_score` → `risk_level`).
- **Infrastructure Sync**: Synchronized `pnpm` versioning between GitHub Actions and `package.json` to ensure stable CI/CD pipeline runs.
- **Liquid Glass Alignment**: Hardened toolbar geometry with `!important` tokens to prevent design system overrides and standardized icon baselines.

## v18.5.0 - 2026-04-10 - Iconic Typography & Forensic Restoration

This major release elevates the archive's visual identity with a high-impact **"Iconic & Bombastic"** typographic system, restores critical analytical tools, and achieves a zero-error production baseline for the "Liquid Glass" architecture.

### User-Facing Changes

- **Iconic Typography**: Integrated **Space Grotesk** and **Outfit** as the primary display fonts, delivering a modern, high-contrast intelligence aesthetic.
- **Bombastic Headlines**: Introduced massive scaling and tight tracking for case headers, ensuring the investigation workspace feels definitive and high-stakes.
- **Symbolic Metadata**: Updated HUD and forensic labels with wide-tracked uppercase mono variants for enhanced scanability.
- **Investigation Restoration**: The **Signal Intelligence** (Analytics) tab is now fully functional, featuring a live Network Visualization engine for evidence mapping.
- **Import Forensic Records**: Restored the "Import Data" modal and portal, enabling high-speed JSON/PDF migration flows directly from the workspace.

### Technical & Stability

- **Zero-Error Certification**: Cleared all remaining TypeScript and linting regressions, achieving an absolute zero-error status for production build and deployment.
- **Design System Alignment**: Standardized all `Flex`, `Box`, and `Surface` component props to match the strict Liquid Glass governance baseline.
- **Production Build**: Verified the production bundle generation pipeline with a 100% pass rate.

## v18.4.0 - 2026-04-06 - Media Browser Stability & Sascha Album Release

This minor release fixes the media browser tab chrome, hardens image and video thumbnail handling, and promotes the Sascha TikTok into its own browsable video album while restoring a clean lint, typecheck, and formatting baseline across the repository.

### Media Browser

- **Tab Chrome Cleanup**: Removed the stray white divider under the media browser tabs for a cleaner gallery header.
- **Thumbnail Reliability**: Corrected media route MIME handling so thumbnails are served with their real file types instead of inheriting the source media MIME.
- **Video Memory Stability**: Stopped video thumbnail fallbacks from serving full video files to image tags and tightened client video teardown to release timers and media resources when switching items.

### Sascha TikTok Album

- **Dedicated Video Album**: Created and backfilled a standalone `Sascha Riley TikTok Q&A` video album so the TikTok appears as its own media collection in the browser.
- **Future Ingest Support**: Updated the ingestion pipeline to create and sync media album entries for audio and video documents automatically, including the Sascha TikTok source collection naming.

### Release Quality

- **Repo Cleanliness**: Verified the repository is passing ESLint, Prettier, and TypeScript checks with the current release state.

## v18.3.4 - 2026-04-03 - Liquid Glass Stabilization

This maintenance release achieves a 100% clean, zero-warning codebase for the "Liquid Glass" architecture, ensuring full compatibility with the React Compiler and strengthening core type safety.

### Architecture & Type Safety

- **Zero-Warning Compliance**: Resolved all residual `any` type warnings and manual memoization failures across the entire repository.
- **Hook Optimization**: Standardized `useCallback` dependency arrays in `VideoPlayer.tsx` and `App.tsx` to satisfy strict React Compiler requirements.
- **Interface Hardening**: Replaced all `any` casts with concrete interfaces (`ReportEntity`, `ReportSection`, etc.) in `ForensicReportGenerator.tsx` and `EvidenceAnnotation.tsx`.
- **Script Stabilization**: Modernized all utility and ingestion scripts with typed error handling and removed legacy `@ts-ignore` suppressions.

### Release Quality

- **Production Health**: Verified with a complete audit of the Postgres storage engine and automated smoke tests.
- **UI Performance**: Eliminated layout flicker and state-sync regressions in the Document modal and global search popover.

## v18.3.3 - 2026-04-02 - Subject Dossier Patch

This patch fixes the Subject Dossier Panel (Investigator view) being clipped by the site header and adds Escape key support for easier dismissal.

### Bug Fixes

- **Subject Dossier**: Fixed `z-index` layering (`z-40` → `var(--z-modal)`) to correctly overlay the global header.
- **Accessibility**: Added Escape key support to the investigation dossiers using `useModalFocusTrap`.

## v18.3.2 - 2026-04-02 - UI Layering & Accessibility Hotfix

This hotfix ensures all overlays and modals correctly appear above the site header and adds global "Escape" key support for dismissing dialogs.

### UI / UX

- **Layering Fix**: Standardised `z-index` scale; overlays (search, date pickers, modals) now consistently cover the sticky header.
- **Escape Dismissal**: Added keyboard support to `DocumentModal`, `EvidenceModal`, `MobileMenu`, and global search popovers.
- **Standardised Tokens**: Refactored hardcoded z-indices to use theme variables (`--z-header`, `--z-dropdown`, etc.).

## v18.3.1 - 2026-04-02 - Performance & Visibility Hotfix

This patch resolves "archived" investigations not appearing on the site and optimizes subject listing performance on the production database.

### Bug Fixes

- Fixed status mapping mismatch (now handles `active` status correctly)
- Populated missing `uuid` field for existing investigations
- Optimized subject listing from **1.3s** to **<50ms** by denormalizing mention/evidence counts

### Performance

- Added indexes on `investigations(owner_id, status)` and `investigations(updated_at)`
- Added index on `investigation_leads(investigation_id)`
- Refreshed Postgres statistics on 1.3M+ record tables

## v18.3.0 - 2026-04-02 - Investigator-Grade Case Management

This release formalizes the investigation system into a professional-grade case management platform, with the Vladislav Doronin investigation as the inaugural litmus test.

### What's New for Users

**Leads Tracker**

- New **Leads** panel in the investigation workspace for tracking open investigative threads
- Status workflow: `open → pursued → resolved` (or `dead end`) with one-click cycling
- Priority levels: `critical / high / medium / low` with colour-coded badges
- EFTA document cross-references link directly to source DOJ records
- Leads auto-populated on report import

**Subject Dossier Panel**

- New **Subject** panel for entity-centric investigation views
- Shows Red Flag Index score, mention count, known aliases, and linked documents
- Pin any entity as a primary subject of the investigation
- Search the full entity database directly from the panel

**Import Report (Universal Ingestor)**

- New **Import Report** button and modal in the investigation workspace header
- Paste any standardised Markdown report to auto-populate: evidence (EFTA resolution), timeline events, hypotheses, and leads
- Idempotent — safe to re-import updated reports without creating duplicates
- CLI: `npx tsx scripts/ingest-investigation.ts <file.md>`
- API: `POST /api/investigations/import-report`

**Vladislav Doronin Investigation**

- Fully formalised investigation now live in the archive
- 11 DOJ source documents linked, 23 timeline events populated
- Thesis: Doronin as the Epstein–Trump Russian bridge, via Capital Group, Aman Resorts, and shared Kremlin-adjacent networks

### Technical

- New `investigation_leads` table with full CRUD API (`GET/POST/PATCH/DELETE /api/investigations/:id/leads`)
- `InvestigationIngestorService` — universal Markdown parser with EFTA auto-resolution
- `docs/investigation-report-format.md` — canonical specification for investigation reports

## v18.2.1 - 2026-04-01 - Hotfix: Restore Tailwind CSS

This patch restores Tailwind CSS which was accidentally removed in the Autumn cleanup commit.

### Bug Fixes

- Restored `tailwind.config.js` and `postcss.config.js`
- Updated `index.css` to use Tailwind 4's `@import "tailwindcss"` syntax
- Installed `@tailwindcss/postcss` and `@tailwindcss/vite` packages

## v18.2.0 - 2026-04-01 - Pipeline Intelligence & Telemetry

This release adds comprehensive telemetry to the intelligence pipeline, fixes critical attachment extraction bugs, and implements entity blacklist enforcement during ingestion.

### What's New for Users

**Pipeline Telemetry**

- Real-time metrics collection for entity extraction including total mentions, unique entities, and entities by type
- Blocked entity tracking to monitor junk entity filtering effectiveness
- Credentials and contacts extracted count displayed in pipeline summary
- Live status file enriched with full metrics for monitoring dashboards

**Blacklist Enforcement**

- Integrated `ENTITY_BLACKLIST_PATTERNS` and `ENTITY_PARTIAL_BLOCKLIST` into the intelligence pipeline
- Entities matching blocklist patterns are now filtered during extraction, not after
- Blocked entity counts tracked for quality monitoring

**Attachment Pipeline Fixes**

- Email attachments are now properly extracted and stored during ingestion
- Attachments are recursively processed as separate documents with proper parent linkage
- Attachment directory organization using SHA256 hashing for deduplication
- `data/attachments/{sha256-hash}/` structure enables duplicate detection

### Bug Fixes

- Fixed attachment extraction never running due to `_attachments` never being assigned
- Fixed attachment directories using `undefined` as path due to missing `_emailSha256` assignment
- Fixed multiple catch blocks silently ignoring errors without any logging

### Under the Hood

- Added `PipelineAudit` class for comprehensive error aggregation
- Error categorization enables targeted troubleshooting (overlay_inference, email_metadata_parse, etc.)
- pHash failure tracking for image quality monitoring
- All catch blocks now record errors to the audit log

## v18.1.1 - 2026-03-31 - Network Graph Fixes & UI Polish

This patch release restores network graph edge visibility, fixes data mapping in the Evidence modal, and improves the Document Browser layout for better mobile and desktop consistency.

### What's New for Users

**Network Graph Improvements**

- **Edge Visibility**: Restored connection lines between entities in the Network tab that were previously missing due to a data mapping error.
- **Dynamic Lineweights**: Connection lines now feature variable thickness based on relationship strength (1px to 3.5px), providing immediate visual feedback on the significance of links.
- **Improved Contrast**: Boosted edge opacity and refined colors for better legibility against the dark "Liquid Glass" background.

**UI & Layout Polish**

- **Document Browser Padding**: Added balanced horizontal margins to the Document Browser, fixing a regression where text was clipped or too close to the viewport edges on both mobile and desktop.
- **Evidence Overview Responsive Grid**: Standardized the statistical metrics grid in the Evidence Overview tab to a responsive 4-column layout on desktop, resolving a 1x1 stacking issue.
- **Media Tab Grid**: Optimized the Media tab's responsive grid breakpoints to ensure a professional 3-4 column layout triggers correctly on desktop displays.
- **Virtualized List Calculation**: Fixed a height calculation issue in the Evidence modal content area, ensuring that virtualized lists (Evidence tab) correctly render their items by providing a stable flex container.

### Bug Fixes

- Fixed a data mapping mismatch where relationships were provided with `source`/`target` keys instead of the required `sourceId`/`targetId` for graph rendering.
- Corrected an `items-center` CSS typo in `EvidenceModal.module.css`.

## v18.1.0 - 2026-03-30 - Document Provenance, Search Fixes & Liquid Glass Completion

This release ships document provenance tracking, fixes search correctness issues, and completes the Liquid Glass CSS Module migration across the remaining UI components.

### What's New for Users

**Document Provenance**

- Each document now exposes a **Provenance Panel** showing source collection, credibility score, OCR engine and quality score, acquisition method, source system, and source release.
- A **lineage view** surfaces the full event history for a document — every ingest, enrichment, and correction step is now visible in the Evidence modal.
- Historical records have been backfilled with provenance data via a migration and backfill pass.
- Entity name search is now significantly faster thanks to a new trigram index (`044_entities_trigram_index`).

**Global Search**

- Search results now feature color-coded category badges with improved density and legibility.
- Sort and filter controls have been refactored for more consistent behavior across result types.

**Visual Polish (Liquid Glass completion)**

- `About`, `Analytics`, `MemoryDashboard`, `FAQPage`, `DataQualityDashboard`, `SearchFilters`, `SortFilter`, `Footer`, `MobileMenu`, `BatchToolbar`, `AddToInvestigation`, `TagSelector`, `LoadingPill`, `ErrorBoundary`, `ToastProvider`, `AlbumSidebar`, `MediaBrowserLayout`, `SensitiveWarningBanner`, `DegradedBanner`, and `LegalPage` are now fully migrated to CSS Modules.
- Z-index scale and danger/warning colour tokens added to the design token system.
- `AddToInvestigation` now uses React state for toast notifications instead of direct DOM manipulation.
- `BatchToolbar` now uses React refs instead of `querySelector` for element targeting.

### Bug Fixes

- Fixed search repository type errors and non-uniform return structures that caused CI failures and potential runtime inconsistencies in search results.
- Fixed provenance migration rollback: the `down` function now correctly drops all added columns.
- Fixed `MemoryDashboard` using a hard-coded `ring-green-500` class instead of the CSS variable equivalent.

### Under the Hood

- CSS Module ratchet extended to 24 governed files — raw Tailwind utilities in migrated components will now fail CI.
- `documentProvenanceService` added alongside a new `/api/documents/:id/lineage` endpoint.
- `dataQualityRepository` updated with provenance-aware data quality checks.
- Search repository refactored to localise types and enforce strict return structure, resolving namespace resolution failures in CI.

---

## v18.0.0 - 2026-03-28 - Liquid Glass UI Overhaul & Routing Stability

This major release delivers the "Liquid Glass" design system, standardizing the application's aesthetic across all core modules while significantly improving navigation stability and interface performance.

### What's New for Users

**Liquid Glass Design System**

- **Standardized Surfaces**: All panels, cards, and control clusters now utilize the high-performance `.surface-glass` utility, providing a deep, consistent depth effect with optimized backdrop-blur rendering.
- **Enhanced Visualization**: The Network Analysis graph and Case Folder views have been restyled for better legibility and a more premium, professional aesthetic.
- **Improved Density**: Refined spacing and visual hierarchy across all search and browsing interfaces (Documents, Evidence, Media).

**Navigation & Stability**

- **SPA Routing Fixes**: The global Footer and main navigation paths have been fully migrated to React Router components, eliminating full-browser reloads and preserving application state during browsing.
- **Search Precision**: Document and evidence search inputs now feature improved focus states and more consistent behavior across the dashboard.

### Under the Hood

- Standardized UI tokens integrated into `src/client/index.css` to eliminate CSS drift.
- Pre-flight routing and UI synchronization tests added to the Playwright suite.
- Clean-up of 50+ instances of legacy Tailwind glass utility classes.

---

## v17.2.0 - 2026-03-23 - Flights, Properties, Evidence UI & Pipeline Hardening

This release ships three new first-class UI slices, a full `any`-free TypeScript pass, a correctness fix for entity sort ordering, and significant pipeline and server resilience improvements.

### What's New for Users

**Flights explorer**

- New `/flights` section with a full flight tracker, map view, timeline view, network graph, stats header, and detail panel.
- Flight cards surface passenger manifests, tail numbers, origin/destination airports, and date ranges.

**Properties browser**

- New `/properties` section with browse, analytics, and associates views.
- Property cards link to associated entities and surface ownership and visit history.

**Evidence search improvements**

- Evidence results now render with a dedicated card layout including document snippets, filter controls, and a result card with provenance and redaction indicators.
- Evidence filters support type, date range, and entity scoping.

**Legal page**

- New `/legal` route with terms and privacy content, accessible from the footer.

**Routing overhaul**

- App shell migrated to nested `<Routes>` / `<Route>` with `useMatch`-based active tab detection, replacing the previous manual pathname comparison.
- Flights, Properties, Evidence, and Legal routes are now first-class lazy-loaded entries.

### Bug Fixes

- Fixed entity sort-by-mentions using a stale denormalized `entities.mentions` column instead of a live count from `entity_mentions`. All sort paths (mentions, red_flag, risk, document_count, recent tiebreakers) now use correlated subqueries against the live table.
- Fixed document sort: date/title/size/red_flag sort paths now use a dynamic `ORDER BY` clause with correct column expressions and parameter binding, replacing a broken `CASE`-based approach that silently fell through to the default.
- Fixed `purgeCache` → `purgeCacheByPattern` call site in the app server after the cache middleware API changed.

### Under the Hood

- Complete `any`-free TypeScript pass across the entire codebase — zero `any` casts, zero TS errors.
- Shared API types extracted to `src/client/types/api.ts`; inline interface duplication removed from `App.tsx` and other consumers.
- Sentry integration added (`src/server/services/sentry.ts`); `initSentry()` called at app startup, `sentryErrorHandler` wired into the Express error chain.
- AI enrichment and pipeline timeouts are now configurable via environment variables (`EXO_DISCOVERY_TIMEOUT_MS`, `AI_REQUEST_TIMEOUT_MS`, `PIPELINE_DOC_TIMEOUT_MS`, `PIPELINE_STALL_TIMEOUT_MS`, etc.) with safe defaults.
- Pipeline watchdog added with configurable stall detection, per-service recovery commands, and cooldown logic.
- VIP entity lookup now degrades gracefully on Postgres statement timeout, returning a cached result rather than propagating the error.
- CORS dev origins expanded to include ports 4173 and 5173 for Vite preview and dev server compatibility.
- `deepCamelKeys` middleware removed from the app server (was already handled at the route/mapper layer).
- Documents trigram index migration added (`043_documents_trigram_index.sql`) for faster full-text search.
- Test hygiene checker and junk entity consolidation script added to the scripts directory.
- Design token strict baseline updated.

---

## v17.1.1 - 2026-03-23 - Dossier UX & Navigation Polish

This patch tightens a few high-visibility UI and data issues that showed up immediately after the 17.1.0 rollout.

### What's New for Users

**Cleaner dossier browsing**

- Entity dossier navigation now stays aligned with the page content width instead of shrinking around its labels.
- The entity profile modal now loads evidence and linked media more reliably, including fallback handling when the primary evidence feed is sparse or inconsistent.

**More legible relationship views**

- Network views now render larger nodes with persistent labels, which makes the relationship canvas easier to scan without constant hovering or zooming.

**Softer interface treatment**

- Several hard white card borders in the dossier and network UI were replaced with a softer glass outline that matches the search field treatment more closely.

---

## v17.1.0 - 2026-03-23 - Stability, Investigations & Production Confidence

This release packages the user-facing work that landed after v17.0.0 into a single minor update. It focuses on making the archive more reliable in daily use while keeping the new design system and platform hardening intact.

### What's New for Users

**More resilient analytics and visual exploration**

- Analytics views now share a typed interaction context, which makes cross-panel selection and filtering more consistent across treemap, network, and enhanced analytics experiences.
- Visualization surfaces now fail more gracefully: route maps, timelines, entity graphs, and related interactive views show contained fallback states instead of breaking the page when a malformed record appears.

**Stronger investigation and evidence workflows**

- Investigation exports and related integrity checks were tightened so exported evidence and timeline data stay aligned with the typed app model.
- Document and evidence browsing benefited from a broader strict-typing pass, reducing edge-case UI failures when records contain sparse or uneven metadata.

**Better production reliability**

- Production quality gates now cover database migration readiness, stricter SQL/query parity checks, and broader client token-compliance scanning before deploys proceed.
- Post-deploy verification was refined so the Epstein deployment path validates the correct public properties while still supporting full cross-site health checks for the wider site network.

### Under the Hood

- End-to-end strict typing was extended across both client and server codepaths, including route handlers, repositories, DTO mappers, visualizations, and shared context plumbing.
- CI and production workflows now run Postgres migrations before the unified quality gate, reducing false negatives and making local and remote verification paths match more closely.
- Public-site verification scripts now support targeted suites as well as full-network checks, making it safer to verify deploy health across all managed sites.

---

## v17.0.0 - 2026-03-20 - Design Overhaul, Data Quality & Platform Hardening

This release completes a full cycle of platform improvements begun in v16.0. The archive looks and performs substantially differently from where it started — new visual identity, a cleaner people directory, faster search, improved sharing, and a significantly more robust backend.

### What's New for Users

**Redesigned visual identity**

- New typography: IBM Plex Sans for UI text, DM Serif Display for editorial headings, IBM Plex Mono for code and identifiers.
- Archival amber accent (`#d4a84b`) replaces the previous cyan throughout — tab indicators, search, focus states, card titles on hover.
- Solid, opaque surfaces replace the glass-morphism aesthetic: darker, cleaner, faster to render.
- Risk scale simplified to three visual bands (critical/high → deep red, medium → goldenrod, low → green) for faster at-a-glance reading.
- Sharper border radii and tighter header height give the interface more density without feeling cramped.

**Cleaner people directory**

- Removed 1,658 phantom entities that were being extracted from document phrasing rather than real people — salutations ("Dear Donald Trump"), legal role prefixes ("Defendant Ghislaine…"), possessive role descriptions ("Jeffrey Epstein's Housekeeper"), and video link text ("Watch Jeffrey Epstein"). The people directory now surfaces actual individuals.
- Ingest pipeline updated to block these patterns from re-entering the database on future document processing runs.

**Improved sharing & discovery**

- Media item and album deep links now generate correct Open Graph preview images and titles when shared on social platforms or messaging apps.
- New high-intent landing pages for search engine discovery: `/epstein-documents`, `/epstein-people`, `/epstein-media`, `/epstein-timeline`, `/epstein-flights`, `/the-epstein-files`.

**Session continuity**

- Refreshing the page no longer logs you out. The app now silently restores your session from the refresh cookie without requiring a manual re-login.

**Investigation workspace**

- New investigations are now created under your own user account rather than a hardcoded placeholder account.

### Under the Hood

- All API responses standardised to camelCase — eliminates a long-running inconsistency between routes.
- Evidence search loads associated people in a single batch query instead of one query per result.
- Token refresh is now atomic (transaction + row lock), preventing concurrent tab refreshes from creating duplicate live tokens.
- Removed unauthenticated static file handler for `/data`; all document access now routes through the audited path-traversal-protected handler.
- Full structured logging via `pino` across all server code; zero `console.log` calls remaining in production paths.
- Zero TypeScript errors, zero ESLint errors. Clean Vite build.

---

## v16.9.0 - 2026-03-19 - Production Readiness Hardening

### Security

- Removed hardcoded `JWT_REFRESH_SECRET` from PM2 ecosystem config; all secrets now loaded exclusively from the remote `.env`.
- Untracked `.env.production` and `.env.audit` from Git; broadened `.gitignore` to blanket-exclude `.env.*` except `.env.example`.
- Added `CORS_ORIGIN` to the `env_production` PM2 block to prevent empty-origin misconfiguration.

### Observability

- Added `pino-http` structured access logging for all HTTP requests (health probes excluded).
- Migrated 120+ `console.error/warn/log` calls across server code to the structured `pino` logger.
- Global error handler now emits structured JSON logs with request context, PG metadata, and pool stats.

### Reliability

- Added `process.on('unhandledRejection')` and `process.on('uncaughtException')` safety nets in the server entry point.
- Graceful shutdown now force-closes lingering HTTP connections after an 8-second grace period, preventing stale requests from blocking deploys.
- Added `process.send('ready')` for PM2 `wait_ready` integration.
- API response cache is now automatically purged after any successful write operation.

### Deployment

- Added `pg_dump -Fc` pre-migration backup step to the deploy pipeline.
- Rollback procedure updated from legacy SQLite restore to Postgres `pg_restore --clean --if-exists`.

### Database

- Ran pending schema sync migration (entities.needs_review, entities.manually_reviewed, evidence.original_file_path, articles.link unique index, investigation_evidence unique constraint).
- Ran `red_flag_score` column migration.

### Verification

- Zero TypeScript compiler errors and zero ESLint errors across the full codebase.

## v16.8.0 - 2026-03-19 - Error Fixes, Security Hardening & Deployment Refresh

### Bug Fixes

- Fixed malformed imports in `relationshipsRepository`, `emails-optimized`, and `graphRoutes` that caused ESLint parsing failures
- Added `unhandledRejection` and `uncaughtException` safety nets to the server entry point

### Security

- Removed hardcoded `JWT_REFRESH_SECRET` from `ecosystem.config.cjs`; secrets must now live in the remote `.env` file
- Tightened `.gitignore` to blanket-exclude all `.env.*` variants except `.env.example`

### Deployment

- Upgraded deploy rollback path from legacy SQLite to Postgres `pg_dump`/`pg_restore`
- Added pre-migration `pg_dump` backup step to the deploy pipeline
- Added `CORS_ORIGIN` to the production PM2 env block

### Verification

- Confirmed zero TypeScript compiler errors and zero ESLint errors across the full codebase
- Confirmed clean Vite production build (3,248 modules, no warnings)

## v16.7.0 - 2026-03-19 - UI Polish & Design System Cleanup

### UI / UX

- Reduced header height from ~72px to ~55px (tighter padding, smaller stat numbers)
- Fixed nav labels truncating: "Investigate" → "Cases", "Black Book" → "Blackbook"
- Removed broken tooltip on Subjects nav tab (was clipped by overflow-hidden container)
- Eliminated toast storm on server-down: removed two background-API error toasts that stacked on load

### Design System

- Added missing CSS tokens: `--glass-border-highlight`, `--bg-elevated`, `--border-subtle`, `--type-xs`
- Fixed `BaseCard` malformed Tailwind class (`hover:shadow-[var(--shadow-[...])]` → `hover:shadow-[var(--glass-shadow)]`)
- Fixed `BaseCard` undefined token: `--accent-primary` → `--accent`
- Replaced hardcoded `text-[10px]`/`text-[9px]` in `PersonCard` with `text-[var(--type-xs)]`
- Replaced hardcoded px values in DocumentCard styling with design tokens
- Replaced 4-level ternary toast class logic with clean CSS utility classes (`.toast-success`, `.toast-error`, etc.)

## 16.6.0 - 2026-03-17 - Humanistic Design Refactor

### Visual Design

- Replaced ambient radial gradient blobs on the page body with a clean flat dark background (`#0a0a0b`).
- Swapped Inter for **IBM Plex Sans** (body/UI) and added **DM Serif Display** as a display typeface for editorial contexts; IBM Plex Mono replaces JetBrains Mono.
- Replaced cyan accent (`#33a8ff`) with archival amber (`#d4a84b`) across tab indicators, search button, focus outlines, and card hover titles.
- Domain accents desaturated: docs → deep editorial red, emails → steel-blue, investigations → measured purple, evidence → teal.
- Risk scale collapsed from 6 saturated colours to 3 visual bands: deep red (critical/high), dark goldenrod (medium), forest green (low/minimal).
- Border radii sharpened: `8/12/16px` → `4/6/8px`.

### Glass-morphism Removal

- `.glass-panel`, `.glass-card`, `.glass-surface` converted to opaque solid surfaces (`#15151a`); backdrop-filter and `--glass-shine` pseudo-element removed.
- Card and control hover states no longer apply `translateY` lift.
- Document cards: solid background, no blur, no lift on hover; `.document-card::before` radial glow and `.preview-glow` deleted.
- Blur preserved only on justified overlay elements: sticky header, dropdowns, header search pill.

### Footer

- Brand name gradient clip-text replaced with DM Serif Display plain white.
- Column headings (`Mission`, `Support`, `Network`) changed from uppercase+icon to a quiet `border-l` label style.
- Status indicator pulsing animation removed.

### Tabs

- Tab labels: uppercase + heavy tracking removed; `font-weight: 500`, `text-transform: none`, `letter-spacing: 0.02em`.
- Tab indicator glow (`box-shadow`) removed.

### Card Component

- Decorative gradient icon wrapper removed; icon rendered bare with `shrink-0` positioning.

## 16.5.0 - 2026-03-16 - API camelCase Standardisation & Risk Score Backfill

### API Contract

- All `/api` responses now return camelCase keys unconditionally. A global `deepCamelKeys` middleware on the Express router recursively transforms every response object before it is sent, eliminating the previous mixed state where some routes returned snake_case fields and others returned camelCase.
- Removed dual-field outputs (`evidence_types` + `evidenceTypes`, `red_flag_rating` + `redFlagRating`, etc.) from all entity and investigation DTO mappers.
- All shared DTOs (`src/shared/dto/`), Zod schemas (`src/shared/schemas/`), and the root `Person` / `SubjectCardDTO` interfaces (`src/types.ts`) updated to camelCase-only field names.
- Client components, hooks, services, and utilities updated across 50+ files to read camelCase properties exclusively.

### Risk Score Backfill

- Ran `scripts/recalculate_entity_risk.ts` to recompute risk scores for all 532,791 entities using the current `entityRisk-v1` algorithm; anchor score 250, Jeffrey Epstein normalised to 100/100.

### Bug Fixes

- Fixed `PersonCard` showing 0/5 risk rating: `EvidenceModal` was reading `entity.redFlagRating` but the mapper was emitting `red_flag_rating`; resolved by the global middleware.
- Fixed `GraphService.normalizeNode` reading stale `primary_role`, `top_photo_id`, `photo_url` properties; updated to `primaryRole`, `topPhotoId`.
- Fixed `InvestigationWorkspace` entity category fallback reading `entity.primary_role` instead of `entity.primaryRole`.

## 16.4.0 - 2026-03-15 - Security, Reliability & Pipeline Observability

### Security

- Removed unauthenticated `express.static('/data', ...)` handler; `/data/*` URLs now route through the same audited, path-traversal-protected handler as `/files/*`, preserving all document browser and download functionality.
- Token rotation endpoint (`POST /api/auth/refresh`) now uses a `BEGIN/COMMIT` transaction with `SELECT ... FOR UPDATE`, eliminating the race condition where concurrent refresh requests could produce two live tokens for the same session.
- Update schemas in investigations routes no longer use `.passthrough()`; unknown fields are stripped at validation time, preventing callers from injecting arbitrary DB columns via `updateInvestigation`, `updateTimelineEvent`, `updateHypothesis`, and `addEvidence`.
- `getCriticalTableCounts` now validates table names against an explicit allowlist before interpolating into SQL.
- User IDs now generated with `crypto.randomUUID()` instead of `Date.now()`, eliminating creation-timestamp disclosure and collision risk under concurrent admin requests.

### Reliability

- `recordWebVitals` call in vitals route is now fire-and-forget with an explicit `.catch()` logger; DB errors no longer become unhandled promise rejections on the hot vitals path.
- `createAlbumArchive` now registers an `archive.on('error', ...)` handler to cleanly destroy the response stream on mid-archive filesystem errors.
- People page fallback query path now runs the main entity query, count query, max-connectivity, and VIP lookup in a single `Promise.all`, reducing sequential DB round-trips from 4 to 1 parallel batch.

### Auth / UX

- `AuthContext` now attempts `POST /api/auth/refresh` on page reload when `/api/auth/me` returns no user, restoring session state from the refresh cookie without requiring a manual re-login.
- `InvestigationsContext` now uses the authenticated user's ID (from `AuthContext`) instead of the hardcoded `'1'` when creating investigations and populating the team lead field.

### Pipeline Observability

- AI Enrichment progress bar in the Übersicht desktop widget now displays real-time throughput (docs/s) and an ETA derived from elapsed time since `enrichStartedAt`, replacing the stale ingest-rate approximation.
- `unified_pipeline.ts` writes `enrichStartedAt` timestamp to `live_status.json` at the beginning of each enrichment run so the rate calculation survives widget and pipeline restarts.
- `get_stats.sh` passes `enrichStartedAt`, `enrichProcessed`, and `enrichTotal` from the status JSON through to the widget's merged output.

## 16.3.1 - 2026-03-12 - Server-Side Media Share Metadata

### Search & Sharing

- Added server-side Open Graph/Twitter meta rendering for `/media` deep links with `id`, `photoId`, or `albumId` query parameters.
- Media item links now return bot-visible OG tags and canonical URLs without requiring JavaScript execution.
- Album share links now attempt to use the first image in the selected album as the OG preview image.
- Preserved SPA fallback behavior if metadata enrichment fails, with safe no-cache headers for share endpoints.

## 16.3.0 - 2026-03-12 - SEO Intent Pages + Rich Metadata

### Search Engine Visibility

- Added high-intent landing routes for search discovery: `/the-epstein-files`, `/epstein-documents`, `/epstein-people`, `/epstein-media`, `/epstein-timeline`, and `/epstein-flights`.
- Added static prerendered HTML counterparts under `public/` for crawler-first indexing on those intent pages.
- Extended app SEO metadata with per-route title/description/keywords/canonical controls and route-specific structured data (`CollectionPage`, `Dataset`, `NewsArticle` where relevant).
- Added stronger internal linking from homepage fallback and footer to intent pages and high-value sections.
- Expanded sitemap coverage to include all new intent landing URLs for faster discovery across search engines.
- Added media share metadata behavior so media deep links and album links resolve OG images/canonical URLs with item/album-specific context.

## 16.2.1 - 2026-03-12 - SEO Crawlability Hardening

### Search Engine Visibility

- Added real `robots.txt` and `sitemap.xml` artifacts to the production build output so crawlers can discover and index core archive routes.
- Added default canonical URL, standard description meta tag, robots directives, Open Graph image alt text, and JSON-LD website metadata to the HTML shell.
- Added crawlable fallback HTML content and section links in the initial `#root` markup so non-JS and low-JS crawlers see meaningful page content.
- Enhanced runtime SEO tags in the `SEO` component with canonical normalization, robots directives, and JSON-LD page metadata.

## 16.2.0 - 2026-03-12 - Search Performance & Investigation Reliability

### Improvements

- Evidence search now loads associated people significantly faster — entity relationships are fetched in a single batch query instead of one per result
- Adding media or documents to an investigation is now atomic — if anything fails mid-operation, no partial records are left behind
- Sensitive content preference now resets when you close the browser tab, rather than persisting across sessions
- Fixed the analytics timeline chart returning 500 errors — column alias ordering bug in the underlying query

## 16.1.0 - 2026-03-12 - Database Reliability & Schema Sync

### Improvements

- Sentence discovery operations are now atomic — boilerplate and document sentence inserts commit together or not at all
- Database session settings now apply correctly on pool connection — previously some SET commands were silently dropped
- Pipeline mode validation now exits with a clear error on invalid arguments instead of proceeding with unexpected behavior
- Applied 3 schema migrations: file assets, document pages, and boilerplate phrases tables

## 16.0.2 - 2026-03-10 - Sascha Riley Entity + Media Linking

### Entities & Media

- **Canonical Profile Alignment:** Normalized Sascha profile handling so `Sascha Riley`/`Sasha Riley` aliases resolve consistently in ingestion and entity lookups.
- **Testimony Media Linking:** Linked all six Sascha testimony audio assets plus album cover image to the canonical `Sascha Riley` entity in media relations.
- **People Tag Reliability:** Added explicit `media_item_people` associations for testimony assets so they surface correctly in entity/media views and people filters.

## 16.0.1 - 2026-03-10 - Face Cluster Entity Linking

### Face Gallery

- **Entity Linking:** Face clusters can now be linked to canonical entities via an autocomplete search in the Face Gallery detail view.
- **Auto-tagging:** Linking a cluster automatically upserts all photos in that cluster into `media_item_people`, making them immediately discoverable via the PhotoBrowser "People" filter.
- **Link Badge:** Gallery cards show a cyan link indicator when a cluster is associated with an entity.
- **Unlink:** One-click unlink removes the entity association from a cluster.
- **Photo Count Toast:** Confirmation toast on link shows how many photos were tagged.

### Database

- Migration `1753600000000_face_cluster_entity_link`: adds `entity_id` FK column and index to `face_clusters`.

## 16.0.0 - 2026-03-10 - Full Ingestion Milestone

### Milestone

- **100% Ingestion Reached:** The tracked DOJ and media corpus has reached full ingestion coverage.
- **Phase Transition:** The pipeline focus now shifts from ingestion throughput to intelligence analysis, OCR quality reruns, and graph/entity refinement.

### About Page

- **Milestone Messaging:** Replaced "ingestion ongoing" copy with completion-aware language tied to live pipeline totals.
- **Status Banner Upgrade:** Ingestion dashboard now flips to a "Milestone Reached" state once aggregate target coverage is complete.
- **ETA Behavior Update:** ETA/throughput panel is hidden once ingestion completes and replaced with post-ingest intelligence-phase status messaging.
- **Roadmap Framing:** "Built for Future Releases" section now reflects a fully ingested baseline with ongoing intelligence work.

## 15.10.3 - 2026-03-10 - Enrichment Backfill Mode Stabilization

### Ingestion Pipeline

- **Backfill Mode Added:** `scripts/ingest_pipeline.ts` now supports `enrich-only` mode to enrich completed documents without touching queue leases.
- **Safe Pagination Fix:** Backfill iteration now uses `id > lastId` keyset pagination (not mutable `OFFSET`) to avoid skipping records while updates are applied.
- **Bounded Concurrency:** Processing now runs in fixed-size chunks with `Promise.allSettled`, keeping concurrency predictable and resilient to per-document failures.

## 15.10.2 - 2026-03-10 - Ingestion AI Text Cleanup Inclusion

### Ingestion Pipeline

- **Parallel AI Post-Processing:** The queue now runs wildcard-repair, OCR cleanup, and summary generation in one pass for ingested document text.
- **Conditional Metadata Update:** `metadata_json.ai_summary` is only written when summary output exists, while content fields are only updated when text actually changed.

### AI Enrichment

- **Deterministic Decode Pre-Pass:** Added HTML entity, numeric entity, unicode mojibake, ligature, and invisible-character normalization before MIME wildcard repair.
- **Chunked OCR Cleaner:** Added bounded chunk-level OCR cleanup (`max 5` chunks) with strict guardrails to reject unstable LLM output lengths.

## 15.10.1 - 2026-03-10 - Modal Header + File Route + API Contract Stabilization

### Document Modal UX

- **Find Input Spacing Fix:** Increased left input padding so `Find in record...` no longer overlaps the search icon.
- **Header Right Alignment:** Reduced right header padding so the close control sits closer to the modal edge.

### Original Document Reliability

- **Email File Route Hardening:** `/api/documents/:id/file` now ignores URL-like pseudo-paths and resolves only valid local file candidates.
- **Email Fallback Delivery:** When no local file exists for email records, the route returns an inline RFC822 `.eml` payload built from metadata/content instead of failing with invalid-path errors.

### API Stability

- **Subjects Timeout Fallback:** `/api/subjects` now falls back to a lighter query path on Postgres statement timeout, preventing 503s from heavy aggregation paths.
- **Audit Logging Compatibility:** `audit_log` writes now auto-detect legacy/modern schemas and never fail request paths.
- **Evidence DTO Normalization:** `/api/evidence/:id` now returns canonical document-detail fields required by shared DTO contracts.
- **Graph DTO Type Fix:** `/api/graph/global` now returns numeric `connectionCount` values (and numeric `risk`/`community`) for schema compliance.

## 15.10.0 - 2026-03-09 - Ingestion Snapshot + Document Browser Stabilization

### Pipeline Snapshot

- **Ingestion State Captured:** Added runtime snapshot at `backups/ingestion_snapshots/ingestion_snapshot_20260309_220536.json` with ingest run status, queue phase, current file, and unlock/crash indicators.
- **Dataset Totals Captured:** Snapshot includes current Postgres totals at capture time: 1,425,126 documents and 4,278,383 entity mentions.

### UI Reliability

- **Document Browser Build Fixes:** Resolved TypeScript and lint blockers in document browser list/header/filter integration so production build and deploy gates pass again.
- **List Rendering Cleanup:** Removed stale imports/state wiring that was causing CI-style no-unused-local failures during release build.

## 15.9.2 - 2026-03-08 - Pipeline Resume

### Infrastructure

- **Pipeline Tracking Tables:** Added `pipeline_runs` and `pipeline_steps` tables (migration 1753500000000) so the ingestion pipeline can resume on production after 20-day idle gap.

## 15.9.1 - 2026-03-08 - Civ-Style Mentions Board + About Status Accuracy

### Visualizations

- **Top Mentioned Individuals Rebuilt:** Replaced the prior bar chart with a Civ VI-style ranked scoreboard UI (rank badge, mentions meter, risk tier chip) for faster scanability.
- **Non-Junk Person Enforcement:** Leaderboard now hard-filters to person-like entities only and excludes junk/suppressed rows via `isJunkEntity`, `junk_tier`, and `junk_flag`.

### Content Accuracy

- **About Page Ingestion Language Updated:** Removed outdated “Data Sets 9–12 complete” wording and replaced with live-progress framing.
- **Live Status Summary:** About page now derives ingestion summary text from the runtime `pipeline_status.datasets` payload, so headline status tracks real ingest state.

## 15.9.0 - 2026-03-07 - Pipeline Snapshot + Analytics Fixes

### Data Integrity

- **Document Type Chart Fixed:** Rebuilt `mv_docs_by_type` materialized view using `file_type` (was silently referencing renamed column `mime_type`, freezing all documents as "Other").
- **Extracted Date Backfill:** 225,440 documents now carry historical `extracted_date` values derived from YYYYMMDD filename prefixes and RFC 2822 email `Date:` headers — timeline now shows accurate 1952–2024 document distribution instead of all-2026 ingestion dates.
- **Total Documents Stat Card:** Stat now reads from live `totalCounts.documents` query rather than stale `mv_redaction_stats`, eliminating the "0 documents" display bug.
- **Top Entities De-Junked:** Entity count display fixed (BigInt string concatenation → numeric add); stricter SQL filters (word-count ≤ 3, mentions ≥ 2, expanded NOT ILIKE patterns) remove construction/OCR artifacts like "Dumpster Hauls Provided" from rankings.

### Pipeline Status

- **Ingestion Progress:** 286,638 / 1,425,126 documents (20.1%) have extracted content. DOJ Data Set 9 is 42.7% processed; DS10 is actively ingesting (2.4%); DS11 queued.
- **Enrichment:** 532,374 entities extracted; 1,675,020 relationships mapped.

## 15.8.0 - 2026-03-06 - Analytics Data Integrity + Map/Chart Reliability

### Analytics Data Quality

- **Top Mentioned Individuals De-Junked:** Replaced the prior top-entities aggregation path with stricter person-only, non-junk, non-quarantined server filtering and canonical-name consolidation so OCR/UI artifact entities no longer dominate rankings.
- **Risk Distribution Fallbacks Fixed:** Classic analytics now correctly derives risk buckets from `redFlagDistribution` / `likelihoodDistribution` when `riskByType` is absent, preventing empty risk charts.
- **Tree Map Data Source Corrected:** Interactive entity treemap now falls back to `topEntities` when `topConnectedEntities` is unavailable, eliminating empty map states in classic analytics.

### Timeline + Type Visuals

- **Document Distribution Readability:** Timeline bars now aggregate to yearly buckets (1980–2026 window) with stable year ticks, making the expected historical span visible instead of being visually dominated by ingestion-month spikes.
- **Document Type Normalization:** Enhanced analytics document types are grouped into meaningful categories (`PDF`, `Email`, `Image`, `Video`, `Audio`, `Text`, `Other`) before rendering, so the chart surface no longer presents as a single undifferentiated total.
- **Top Mentioned Chart Alignment:** Increased Y-axis label space and tick anchoring in the horizontal bar chart to fix label/bar misalignment and overflow.

### Geospatial Reliability

- **Map No-Data Fallback:** When entity geocoordinates are unavailable, the interactive map now falls back to real flight-airport coordinates from `/api/flights/airports` instead of rendering zero locations.
- **World-Zoom Constraint:** The interactive map now enforces world bounds and minimum zoom at full-world scale, preventing zoom-out beyond a 1:1 world frame.

## 15.7.0 - 2026-03-06 - Degraded Mode Stability + 503 Read Availability

### Runtime Stability

- **Degraded Mode Provider Wiring:** Added `DegradedModeProvider` to the client root tree so `useDegradedMode` consumers (including the degraded banner) no longer throw runtime context errors.
- **Crash Loop Resolved:** Eliminated the `useDegradedMode must be used within DegradedModeProvider` production failure path surfaced through `ScopedErrorBoundary`.

### Availability Under Load

- **Load Shedding Policy Adjustment:** Updated server-side `toobusy` handling to prioritize shedding mutating traffic first while keeping public read requests (`GET/HEAD/OPTIONS`) available.
- **503 Handling Improvement:** Mutating `/api/*` requests now receive structured JSON `503` responses during overload, while read/UI traffic remains serviceable.

### Data Surface Reliability

- **Black Book Filter Safety:** Stopped sending `letter=ALL` as a literal API filter from the Black Book UI.
- **About/Stats Fetch Hardening:** Switched About page aggregate fetches to JSON-validated `Promise.allSettled` handling so one failing endpoint no longer zeros all displayed metrics.
- **Document Detail Schema Fallback:** Hardened `/api/documents/:id` text derivation to support both `document_pages.extracted_text` and legacy `document_pages.content`, with `document_sentences` fallback, preventing 500s on mixed production schemas.

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
