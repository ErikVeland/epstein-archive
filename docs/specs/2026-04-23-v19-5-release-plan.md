# v19.5 Release Plan — Intelligence Workbench & Evidence Export Hardening

**Date:** 2026-04-23  
**Target Version:** 19.5.0  
**Status:** Draft  
**Release Type:** Minor release  
**Primary Outcome:** Turn the now-stable post-ingest archive into a stronger investigator workflow, with evidence packets, semantic discovery, and intelligence review surfaces that are trustworthy enough for external legal/journalistic review.

---

## Context

Version `19.4.2` restored CI/CD confidence and closed the latest UI reconciliation issues. The recent release arc has focused on mobile stability, document/media reliability, relational hardening, pipeline tracking, and production gate restoration.

The next minor release should avoid another broad patch sweep. The platform has already reached the ingestion-complete milestone, and the documented product direction is now intelligence analysis, OCR quality reruns, graph/entity refinement, and defensible evidence export.

## Release Thesis

**v19.5.0 should make the archive feel like a complete investigative workbench.**

The release should help an analyst move from discovery to an auditable evidence packet:

1. Search conceptually across documents/entities.
2. Add relevant material to an investigation.
3. Review provenance, confidence, and gaps.
4. Export a deterministic packet with integrity metadata.
5. Verify the packet through tests and deployment gates.

---

## Goals

- Make evidence packet export a first-class, tested product feature rather than a UI promise.
- Activate the existing semantic-search foundation in a safe, degradable way.
- Add a post-ingest intelligence review surface that highlights weak evidence, review queues, extraction quality, and entity-resolution confidence.
- Tighten investigation workspace flows around evidence, hypotheses, timeline, and export.
- Maintain production stability through bundle smoke tests, API contract coverage, and design-system compliance.

## Non-Goals

- No wholesale redesign of the app shell.
- No new ingestion pipeline rewrite.
- No unbounded AI agent workflow that can mutate evidence without explicit review.
- No mandatory pgvector dependency in environments where the extension is unavailable.
- No release that weakens provenance, redaction, or sensitive-content controls.

---

## Workstream 1: Evidence Packet Export

### Current State

- `EvidencePacketExporter` presents JSON/ZIP export options, but delegates the actual work through `onExport`.
- `/api/investigations/:id/export/zip` already creates a ZIP bundle with `investigation.json`, `evidence.json`, and capped local files.
- `investigationExportIntegrity.ts` already builds deterministic metadata, markdown headers, CSV output, and timeline JSON.
- `exportIntegrity.test.ts` already covers deterministic client/shared formatting behavior.

### Target State

Evidence packet export should produce a reviewable, deterministic bundle with explicit provenance, scope, and integrity metadata.

### Deliverables

- Add a server-side `manifest.json` to ZIP exports containing:
  - investigation id/title/status
  - generated timestamp
  - application version or commit SHA when available
  - evidence ids in deterministic order
  - included files and skipped files
  - checksum algorithm and checksum
  - export limits applied
- Add `evidence.csv` to ZIP exports for reviewer-friendly spreadsheet inspection.
- Add `timeline.json` when investigation timeline data exists.
- Add `annotations.json` or `annotations.md` when evidence annotations exist.
- Add `README.md` inside the ZIP explaining packet structure and verification fields.
- Make JSON export a real browser action, not just an option label.
- Show export progress, success, and failure states in `EvidencePacketExporter`.
- Surface skipped files clearly: missing files, path outside data root, unreadable files, size cap reached.
- Ensure ZIP path handling stays constrained to `DATA_ROOT`.

### Acceptance Criteria

- Exporting ZIP from the investigation workspace downloads a bundle with manifest, evidence metadata, and all eligible files.
- Two exports of the same investigation have stable evidence ordering and stable file inventory ordering.
- The manifest explicitly identifies non-deterministic fields such as generated timestamp.
- Missing/unreadable files do not fail the entire export unless metadata cannot be generated.
- Auth remains required for export endpoints.
- Export UI does not claim cryptographic guarantees that are not actually implemented server-side.

### Tests

- Unit test manifest construction and checksum ordering.
- API test `/api/investigations/:id/export/zip` response headers and archive contents.
- Regression test path traversal and null-byte cleanup behavior.
- Playwright smoke test that the export panel renders and triggers a download route.

---

## Workstream 2: Semantic Discovery

### Current State

- Migration `1754400000002_semantic_search_foundation.js` conditionally adds pgvector columns and HNSW indexes.
- Existing search is lexical/full-text plus entity fallback similarity.
- There is no clear user-facing semantic-search mode yet.

### Target State

Users can perform conceptual discovery without losing the reliability of lexical search.

### Deliverables

- Add a server capability check for semantic search availability:
  - pgvector extension exists
  - embedding columns exist
  - at least one searchable row has an embedding
- Add `/api/evidence/search` or a dedicated route option for `mode=semantic|hybrid|lexical`.
- Implement hybrid results that preserve lexical matches and append/rerank semantic candidates when embeddings are available.
- Add a clear UI toggle/chip:
  - `Keyword`
  - `Conceptual`
  - `Hybrid`
- Add a degraded-mode empty state when semantic search is not available:
  - explain that keyword search is still active
  - do not show errors for missing pgvector
- Add result labels explaining why an item matched:
  - title/text match
  - entity alias match
  - conceptual similarity
  - high-risk related entity

### Acceptance Criteria

- Search works in all environments, including those without pgvector.
- Semantic mode never returns unlabelled or unexplained results.
- Hybrid mode does not hide strong lexical matches.
- Search latency remains bounded by existing API limits.
- The UI clearly distinguishes conceptual matches from direct text matches.

### Tests

- Repository tests for semantic capability detection.
- API tests for lexical fallback when pgvector is unavailable.
- API tests for result shape in `hybrid` mode.
- Playwright route/UI sync coverage for the new search mode controls.

---

## Workstream 3: Post-Ingest Intelligence Dashboard

### Current State

- The app has data quality, review queue, analytics, extraction, and pipeline services.
- Ingestion is complete, but intelligence quality work is scattered across pages/scripts.

### Target State

Analysts get one clear place to answer: what needs review next?

### Deliverables

- Add an Intelligence Review section to the existing dashboard surface or create a focused panel under analytics/admin.
- Show high-signal queues:
  - documents with weak/shallow provenance
  - documents with low OCR confidence or OCR-heavy scan flags
  - entities with fuzzy/alias resolution uncertainty
  - high-risk entities with thin supporting evidence
  - extracted claims with missing source links
  - financial/timeline extraction items needing review
- Add drill-through links into the relevant document/entity/evidence views.
- Add a small “release readiness” widget:
  - export tests passing
  - semantic availability
  - provenance coverage
  - pending review counts

### Acceptance Criteria

- Dashboard avoids vanity metrics and prioritizes actionable review queues.
- Every queue item has a next action or drill-through link.
- Counts are bounded and paginated; no expensive unbounded dashboard queries.
- Dashboard degrades gracefully when optional extraction tables are empty.

### Tests

- Repository/API tests for bounded query limits.
- UI smoke test for empty state and populated state.
- Query-count guard for dashboard endpoint if feasible.

---

## Workstream 4: Investigation Workspace Flow

### Current State

- The documented analyst workflow is scope initialization, entity collation, evidence marshalling, algorithmic review, and report generation.
- The codebase already has investigation workspace, notebook, communications analysis, forensic tools, hypotheses, activity, and export components.

### Target State

The investigation workspace should guide analysts through the full loop without forcing them to remember where each tool lives.

### Deliverables

- Add a compact “case readiness” rail or panel:
  - evidence count
  - timeline event count
  - hypotheses count
  - unresolved annotations
  - export readiness status
- Add “Add to packet” or “Included in packet” affordances where evidence is reviewed.
- Add a pre-export checklist:
  - evidence selected
  - provenance present
  - annotations reviewed
  - timeline included or intentionally excluded
  - sensitive content warning acknowledged
- Improve empty states for new investigations so the next action is obvious.
- Ensure mobile investigation shell can reach export/report tools cleanly.

### Acceptance Criteria

- A user can start with an investigation and understand what is missing before export.
- Export readiness does not block exports unnecessarily, but flags risks clearly.
- Mobile users can find the export/report path through the More drawer.
- Existing desktop investigation tabs remain intact.

### Tests

- Playwright golden path: open investigation, view evidence, open export panel.
- Route/UI sync test for investigation export/report path.
- Component tests for readiness state calculation.

---

## Workstream 5: Release Hardening

### Deliverables

- Update `release_notes.md` with `19.5.0 - YYYY-MM-DD - Intelligence Workbench & Evidence Export Hardening`.
- Keep `package.json` version aligned.
- Run:
  - `pnpm type-check`
  - `pnpm lint`
  - `pnpm test:unit`
  - `pnpm test:contracts`
  - `pnpm test:route-sync`
  - `pnpm test:bundle-smoke`
- Maintain strict design-token gate.
- Add any new route DTOs to shared schemas when response contracts become public.
- Verify production deploy script release-note gate passes.

### Acceptance Criteria

- Production build passes.
- Bundle smoke passes.
- No new strict design-token violations.
- No new client/server boundary violations.
- Release notes are accurate and top-aligned with `package.json`.

---

## Suggested Sequence

### Phase 1: Export Core

Implement server-side manifest, CSV, annotations, README, deterministic ordering, and ZIP tests.

**Why first:** This is the strongest release anchor and easiest to define as done.

### Phase 2: Export UI

Wire JSON/ZIP actions into the workspace, add progress/failure states, and add readiness warnings.

**Why second:** It turns the API foundation into user-facing value.

### Phase 3: Semantic Search

Add capability detection, backend mode handling, UI controls, and fallback behavior.

**Why third:** Useful and visible, but should not block export reliability.

### Phase 4: Intelligence Review

Add dashboard queues and drill-through links using existing repositories/services where possible.

**Why fourth:** Builds on semantic/provenance/export state and gives the release a complete “post-ingest intelligence” story.

### Phase 5: Release Gate

Run full QA, update release notes/version, and deploy through the restored production gate.

---

## Risks And Mitigations

- **Risk:** Export claims stronger integrity than implemented.  
  **Mitigation:** Use precise wording: deterministic manifest and checksums; reserve “cryptographic signature” only if signing keys are implemented.

- **Risk:** Semantic search depends on pgvector availability.  
  **Mitigation:** Capability check and keyword fallback are mandatory.

- **Risk:** ZIP exports can become too large.  
  **Mitigation:** Keep size/file caps and include skipped-file reasons in manifest.

- **Risk:** Dashboard queries become expensive on the full corpus.  
  **Mitigation:** Bounded queries, indexes, pagination, and query-count tests where possible.

- **Risk:** Investigation workspace grows more complex.  
  **Mitigation:** Add readiness/checklist affordances without restructuring existing tabs.

---

## Release Checklist

- [ ] ZIP export includes `manifest.json`.
- [ ] ZIP export includes reviewer-friendly `README.md`.
- [ ] ZIP export includes `evidence.json`.
- [ ] ZIP export includes `evidence.csv`.
- [ ] ZIP export includes timeline/annotations when available.
- [x] Export UI supports real JSON and ZIP actions.
- [x] Export UI shows skipped-file and error feedback.
- [x] Semantic search capability detection exists.
- [x] Search UI exposes keyword/conceptual/hybrid modes.
- [x] Semantic search falls back cleanly when unavailable.
- [x] Document search results show why an item matched.
- [x] Intelligence review dashboard has actionable queues.
- [x] Investigation readiness/checklist is visible before export.
- [ ] Contract, route sync, unit, lint, type-check, and bundle smoke tests pass.
- [ ] `package.json` version and `release_notes.md` are aligned.

---

## Proposed Release Notes Draft

```md
## 19.5.0 - YYYY-MM-DD - Intelligence Workbench & Evidence Export Hardening

### Evidence Export

- Promoted evidence packet export into a first-class forensic bundle with manifest metadata, deterministic evidence ordering, reviewer README, CSV evidence index, and explicit skipped-file reporting.
- Hardened ZIP export safety around file caps, size caps, and data-root path constraints.
- Added export readiness feedback in the investigation workspace.

### Semantic Discovery

- Activated hybrid/conceptual search controls backed by the existing pgvector foundation when available.
- Added safe fallback behavior so keyword search remains fully functional when semantic indexes are unavailable.
- Labelled search result match reasons for clearer investigative review.
- Added per-result Document Browser match badges for text, conceptual, hybrid, and entity-context matches.
- Added visible Document Browser status messaging so analysts know whether Conceptual/Hybrid search is using semantic indexes or keyword fallback.

### Intelligence Review

- Added post-ingest review queues for provenance gaps, OCR quality, entity-resolution uncertainty, and thin high-risk evidence.
- Added drill-through paths from intelligence review items into documents, entities, and evidence.

### Quality

- Added export manifest/API coverage and release-gate tests for the v19.5 workflow.
```
