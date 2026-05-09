# Wave 1 — Surface Existing Intelligence

**Date:** 2026-05-10  
**Status:** Approved  
**Scope:** Four features that expose already-extracted intelligence through new UI surfaces. No new pipelines. Minimal new backend.

---

## 1. Connection Dossier

### What it is

A full-page view at `/connections` that shows every documented signal linking two entities: shared flights, communications, financial connections, network path, document co-occurrences, and corroborated claims. Entry point from entity profiles via a "Find connection to…" button that pre-fills the source.

### Route

`/connections?a=:entityId&b=:entityId`

Both params are optional. With zero params: two empty pickers. With `?a=` only: source pre-filled, waiting for target. With both: dossier loads immediately.

### Page structure

**Sticky header**

- Source entity autocomplete picker (re-uses existing entity search)
- ↔ swap button (swaps A and B in URL)
- Target entity autocomplete picker
- "Export" button (print-to-PDF via `window.print()`, scoped CSS for print layout)

**Summary bar** (appears when both entities selected)

- Six count pills: Flights · Communications · Financial · Documents · Path (N hops) · Claims
- If all counts are zero: "No documented connection found" state with suggestion to try the network graph

**Evidence sections** (scrolling, each independently collapsible)

Each section follows the same pattern:

- Section header: icon + label + count badge + collapse toggle
- Preview: 3–5 items inline
- "Show all N →" link that expands inline (no navigation)
- Empty state if count is zero (section still shown, collapsed by default)

**Section order** (fixed — sections with zero results collapse automatically, making populated sections visually prominent):

1. **Shared Flights** — flights where both entity IDs appear on the manifest. Columns: date, route (origin → destination), tail number, other passengers (chips, max 5). Each row links to `/flights/:id`.

2. **Communications** — emails where both entities appear in from/to/cc. Grouped by thread. Shows: date, subject, direction arrow (A→B, B→A, or via intermediary), thread size. Links to email thread view.

3. **Network Path** — visual hop chain: `[Entity A] —[rel type]→ [Intermediary] —[rel type]→ [Entity B]`. Each node is clickable (links to entity profile). Each edge shows relationship type and links to `/api/graph/edges/:source/:target/explain`. If path > 4 hops: show first 2 and last 2 with "…N intermediaries" in between.

4. **Corroborated Claims** — claim triples where both entities appear (subject or object). Each claim: claim text + "N documents" badge. Expandable source list shows document title + link. Sorted by document count descending.

5. **Financial Connections** — shared financial transactions. Columns: date, amount, description, direction. Links to `/financial/:id`.

6. **Document Co-occurrence** — documents mentioning both entities. Shows: title, evidence type badge, date, word count, relevance snippet. Links to document detail.

### Backend additions

**New route:** `GET /api/connections?a=:entityId&b=:entityId`

Returns a single `ConnectionDossierDto` with all six signal types. Runs queries in parallel via `Promise.all`. Response is cached for 5 minutes (same TTL as entity analytics).

**New repository methods:**

- `getSharedFlights(entityAId, entityBId)` in `flightsRepository.ts` — join on `flight_manifest` WHERE entity appears for both IDs on the same flight
- `getSharedDocuments(entityAId, entityBId)` in `documentsRepository.ts` — documents tagged with both entity IDs via `document_entities` join table
- `getSharedClaims(entityAId, entityBId)` in `claimTriplesRepository.ts` — triples WHERE `subject_entity_id IN (a,b) AND object_entity_id IN (a,b)`, OR triples referencing either entity sorted by document co-occurrence count
- `getSharedCommunications(entityAId, entityBId)` in `communicationsRepository.ts` — email threads where both entity IDs appear across from/to/cc fields

Existing endpoints reused unchanged:

- `GET /api/graph/paths?sourceId=:a&targetId=:b` — network path
- `GET /api/entities/:id/analytics/connections` — signal scores for the summary bar

**New DTO:** `src/shared/dto/connections.ts`

```ts
export interface ConnectionDossierDto {
  entityA: { id: string; name: string; type: string };
  entityB: { id: string; name: string; type: string };
  signals: {
    flights: SharedFlightDto[];
    communications: SharedCommunicationDto[];
    path: {
      hops: number;
      nodes: { id: string; name: string }[];
      edges: { source: string; target: string; type: string }[];
    } | null;
    claims: SharedClaimDto[];
    financial: SharedFinancialDto[];
    documents: SharedDocumentDto[];
  };
  summary: {
    flightCount: number;
    communicationCount: number;
    pathHops: number | null;
    claimCount: number;
    financialCount: number;
    documentCount: number;
  };
}
```

### Frontend files

| File                                                               | Purpose                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `src/client/pages/ConnectionDossierPage.tsx`                       | Page component, reads URL params, orchestrates data fetching |
| `src/client/components/connections/EntityPicker.tsx`               | Autocomplete entity search, controlled, supports pre-fill    |
| `src/client/components/connections/DossierSection.tsx`             | Reusable collapsible section wrapper with count badge        |
| `src/client/components/connections/FlightEvidenceList.tsx`         | Renders shared flights list                                  |
| `src/client/components/connections/PathVisualization.tsx`          | Renders hop chain with edge labels                           |
| `src/client/components/connections/ClaimsEvidenceList.tsx`         | Renders corroborated claims with expandable sources          |
| `src/client/components/connections/CommunicationsEvidenceList.tsx` | Renders shared email threads                                 |
| `src/client/components/connections/DocumentEvidenceList.tsx`       | Renders co-occurring documents                               |

**Entity profile entry point:** Add "Find connection to…" button to the entity profile action bar (existing component). On click: navigate to `/connections?a=:entityId`.

**App.tsx:** Add lazy route `/connections` → `ConnectionDossierPage`.

**apiClient.ts:** Add `getConnectionDossier(entityAId: string, entityBId: string): Promise<ConnectionDossierDto>`.

### URL behavior

- Both pickers are controlled by URL params (`?a=` and `?b=`). Selecting an entity updates the URL without page reload (React Router `useSearchParams`). This makes dossiers bookmarkable and shareable.
- Swap button: `setSearchParams({ a: b, b: a })`.

### Error handling

- If either entity ID from URL params is not found: show "Entity not found" inline, keep other picker filled.
- If a signal type query fails: show that section's error state independently. Other sections still load.
- Empty path (no connection within 7 hops): show "No network path found within 7 hops" in the Path section.

### Print/export

`window.print()` with a `@media print` stylesheet that hides navigation, expands all collapsed sections, and formats the dossier as a clean document. No PDF generation server-side needed.

---

## 2. Cross-Document Corroboration View

### What it is

A "Corroboration" tab on entity profile pages that shows every extracted claim involving that entity, grouped by how many independent documents support it. Turns 713K isolated triples into an evidence strength ranking.

### Where it lives

New tab within the existing entity profile tab system (alongside Documents, Timeline, Connections, etc.).

### Tab content

**Sort options:** "Most corroborated" (default) | "Most recent" | "Highest confidence"

**Claim card:**

- Claim text (subject → predicate → object, rendered as sentence)
- Corroboration badge: "7 documents" (colored by strength: 1=gray, 2-3=yellow, 4+=green)
- Expandable source list: document title + evidence type + date + link
- Verification status badge (Verified / Unverified / Rejected) with verify/reject actions for users with `role === 'admin'`

**New backend query:** `getCorroboratedClaimsByEntity(entityId, options)` in `claimTriplesRepository.ts`

```sql
SELECT
  predicate,
  object_text,
  object_entity_id,
  COUNT(DISTINCT document_id) as document_count,
  AVG(confidence) as avg_confidence,
  array_agg(DISTINCT document_id) as document_ids
FROM claim_triples
WHERE subject_entity_id = $1 OR object_entity_id = $1
GROUP BY predicate, object_text, object_entity_id
ORDER BY document_count DESC
LIMIT $2 OFFSET $3
```

**New DTO:** `CorroboratedClaimDto` added to `src/shared/dto/claims.ts`.

**New API endpoint:** `GET /api/entities/:id/claims/corroborated?limit=20&offset=0`

**New component:** `src/client/components/entity/CorroborationTab.tsx`

---

## 3. Unredaction UI

### What it is

Two surfaces for the existing `RedactionResolver` service:

1. **Inline tooltips** in DocumentViewer — `[Redacted]` spans become interactive, hovering shows resolver output (category, confidence, candidates).
2. **Dedicated `/redactions` page** — the route already exists as a stub. Implement it as a research tool: browse all redactions across the corpus, filter by category/confidence, mark resolutions as reviewed.

### Inline tooltips (DocumentViewer)

When rendering document text, detect redaction patterns (`\[.*?\]` matching known redaction syntax). Wrap each in a `<RedactionSpan>` component that:

- Renders with a subtle underline + amber color to indicate it's interactive
- On hover: shows a tooltip with RedactionResolver output
  - Category badge (name / location / date / other)
  - Confidence level (high / medium / low) with color coding
  - Candidate list (up to 3 items)
- On click: opens a side panel with full resolver detail + link to the `/redactions` page entry for that redaction

New backend endpoint: `POST /api/redactions/resolve` — accepts `{ text: string, context: string }`, runs `RedactionResolver.resolve()`, returns result. Cached by text+context hash.

### `/redactions` page

Replaces the current stub. Layout:

- **Filter bar:** Category (all / name / location / date / other), Confidence (all / high / medium / low), Resolution status (all / unreviewed / reviewed)
- **Redaction list:** Each entry shows: source document (linked), redacted text, category, confidence, top candidate, review status
- **Detail panel** (right side): full resolver output, document context (surrounding 200 chars), mark as reviewed / flag as incorrect

**New repository:** `src/server/db/redactionsRepository.ts` — queries the `document_redactions` table. The implementation step must first check the schema; if the table does not exist, create a migration before implementing the repository.

**Schema addition:** migration creates `document_redactions`: `id uuid PK, document_id uuid FK, redacted_text text, context_text text, resolved_category text, resolved_candidates jsonb, confidence text CHECK IN ('high','medium','low'), reviewed_by uuid FK users, reviewed_at timestamptz`.

---

## 4. Semantic Search Status

### What it is

Two small additions that tell researchers whether semantic search is available and how complete the embedding coverage is:

1. **Inline status in GlobalSearch** — when "Semantic" or "Hybrid" mode is selected, show a status badge below the mode selector.
2. **Embeddings status card in AdminDashboard** — shows document and entity embedding coverage with a progress bar.

### GlobalSearch status badge

Uses the `semanticCapability` field already returned in `SearchResponsePayload`. On first load (before any search), call `GET /api/search/capability` to get capability state.

States:

- **Available** (green): "Semantic search active — N documents embedded"
- **Partial** (amber): "Semantic search active — N of M documents embedded (X%)"
- **Unavailable** (red): "Semantic unavailable — falling back to keyword search" + tooltip with reason

Capability endpoint already exists in the semantic capability module. Wire it to a new `GET /api/search/capability` route if not already exposed.

### AdminDashboard embedding card

New card in the existing admin dashboard grid:

- Title: "Embedding Coverage"
- Two progress bars: Documents (N / total) and Entities (N / total)
- Status: "Ollama running" / "Exo cluster connected" / "No embedding provider"
- "Run embedding job" button — links to admin documentation with Ollama setup instructions; no automated trigger in scope for Wave 1

---

## Implementation order

1. Connection Dossier (largest, highest investigative value)
2. Cross-Document Corroboration (depends on Connection Dossier patterns, shares components)
3. Unredaction UI (independent, self-contained)
4. Semantic Search Status (smallest, 2–3 hours)

---

## Shared conventions

- All new pages follow the existing lazy-load pattern in `App.tsx` (`React.lazy()` + `Suspense`)
- All new API routes follow the repository pattern — no direct pool queries in route handlers
- DTOs live in `src/shared/dto/`, validated by Zod schemas in `src/shared/schemas/`
- All new routes registered in the existing Express router structure in `src/server/routes/`
- Error states use the existing `ErrorBoundary` pattern
- Loading states use the existing `LoadingIndicator` component
