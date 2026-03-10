# Thread: User-Facing Changes Since v12

1/26
Since v12, The Epstein Files shipped a full rebuild of data, intelligence, and UX. Here’s the complete user-facing changelog thread from v12.0.0 to v16.0.0.

2/26
v12.0.0 (DOJ Archive Consolidation)

- Integrated DOJ datasets 10, 11, 12.
- Unified DOJ discovery structure for cross-referencing.
- Added Financial Transaction Mapper.
- Added multi-source entity correlation across the archive.

3/26
v13.0.0 (Forensic Transparency & Credibility)

- Launched Evidence Ladder so “Direct” claims are document-backed.
- Added explicit AI inference watermarking.
- Added integrity/credibility verification suite.
- Expanded deep-health checks and automated backup/restore drills.

4/26
v14.0.0 (Temporal Investigation & Forensic Determinism)

- Added timeline-based graph filtering.
- Added provenance metadata in evidence drawer.
- Visualized Direct vs Inferred relationship edges.
- Refreshed UI with liquid-glass system and cleaner global navigation/search.

5/26
v14.5.0 (Forensic Analytics & Network Intelligence)

- Released global entity map for large-scale location intelligence.
- Upgraded network graph (semantic zoom + VIP face integration).
- Improved OCR/noise filtering for cleaner analytics/search.
- Restored missing Black Book/property/flight datasets.
- Backfilled email metadata from raw .eml files.

6/26
v15.0.0 (Production Hardening & PostgreSQL Migration)

- Completed SQLite -> PostgreSQL migration.
- Added strict pooling + deep health checks + schema verification.
- Enforced stronger RBAC boundaries.
- Added secure case ZIP export endpoint.

7/26
v15.3.0 (Subject Integrity & Performance)

- Fixed subject alias merging to prevent mention undercounting.
- Added startup fallback so app still boots during partial API failures.
- Opened public read access on media browsing endpoints.
- Added stale-bundle auto-reload to prevent chunk load crashes.

8/26
v15.4.2 (Timeline Accuracy & Evidence Backing)

- Timeline API now returns richer evidence counts.
- Canonicalized duplicate timeline milestones.
- Added timeline date-range filtering.
- Fixed person-vs-role inference misclassification.
- Improved ranking precedence for real named individuals.
- Stabilized public rate limiting and restored avatar fallbacks.

9/26
v15.4.3

- Fixed document viewer crash when entities were missing expected name fields.
- Hardened mixed-schema entity rendering in related chips/panels.

10/26
v15.4.4

- Evidence cards became full-row clickable to open in-app viewer.
- Added keyboard activation (Enter/Space) for accessibility.

11/26
v15.4.5

- Cleaned entity header UI by removing oversized inferred badge.
- Improved profile photo resolution fallback chain.

12/26
v15.4.6

- Fixed non-PDF assets hanging on “Downloading PDF...”.
- Unified asset fallback behavior across dirty/cleaned/original routing.

13/26
v15.4.7

- Removed dirty/cleaned/original toggle from PDF view.
- Simplified to canonical single-asset behavior.

14/26
v15.4.8

- Unified document browser to always use modern DocumentModal.
- Removed legacy embedded viewer path and mismatched controls.

15/26
v15.5.0 (Unified Modern Viewer + Gmail-style Email Workspace)

- Fully removed old viewer architecture.
- Consolidated tabs and grouped OCR modes into one Text Analysis workspace.
- Defaulted intelligence rail to collapsed for cleaner first-read.
- Reworked email workspace with filter drawer + body-first layout.

16/26
v15.6.0 (Public Read / Admin Write + Security Hardening)

- Kept read surface public; enforced admin-only writes.
- Tightened auth route restrictions.
- Redacted sensitive error logging output.
- Strengthened audit chain with request-id correlation.
- Hardened uploads and refresh-token rotation plumbing.
- Improved search/prefix safety and document detail resilience.

17/26
v15.7.0 (Degraded Mode Stability + 503 Read Availability)

- Fixed degraded-mode provider crash loop.
- Updated overload policy to preserve read traffic under load.
- Standardized structured 503 responses for mutating requests.
- Hardened About/stats fallback behavior.
- Improved mixed-schema text fallback in document details.

18/26
v15.8.0 (Analytics Reliability)

- De-junked top-mentioned entities.
- Fixed risk chart fallback logic.
- Corrected treemap data sourcing.
- Improved timeline chart readability.
- Normalized document-type grouping.
- Added map no-data fallback + world zoom constraints.

19/26
v15.9.0 (Pipeline Snapshot + Analytics Fixes)

- Fixed document-type matview source column issue.
- Backfilled extracted_date from filenames/email headers.
- Corrected total documents stat source.
- Further de-junked top entities and fixed BigInt count bug.
- Published ingestion/enrichment progress snapshot.

20/26
v15.9.1

- Rebuilt Top Mentioned into Civ-style ranked board.
- Enforced stricter non-junk person-only filtering.
- Updated About page status to be live-data driven.

21/26
v15.9.2

- Added pipeline tracking tables to support production resume after idle gaps.

22/26
v15.10.0

- Captured ingestion runtime snapshot + dataset totals.
- Stabilized document browser build/list integration.

23/26
v15.10.1

- Fixed document modal “Find in record” spacing + header alignment.
- Hardened original-document file route handling.
- Added email .eml fallback delivery when local files are absent.
- Added subjects timeout fallback; normalized evidence/graph DTO contracts.

24/26
v15.10.2 + v15.10.3

- Added deterministic decode and AI OCR cleanup pipeline stages.
- Added safer summary/content conditional writes.
- Added enrich-only backfill mode.
- Fixed backfill pagination/concurrency for stable large runs.

25/26
v16.0.0 (Full Ingestion Milestone)

- Reached 100% ingestion of tracked DOJ + media corpus.
- Shifted active phase to intelligence analysis and quality reruns.
- Updated About page to milestone-aware messaging.
- Dashboard now switches to “Milestone Reached” and hides ETA post-completion.

26/26
Current state:

- Fully ingested corpus baseline.
- Ongoing intelligence enrichment, OCR quality reruns, entity normalization, and graph refinement.
- Platform is in a stronger, more reliable place than at v12 across search, media, viewer UX, analytics, and operations.
