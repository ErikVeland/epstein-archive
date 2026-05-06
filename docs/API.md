# REST API Documentation

The Epstein Archive exposes a REST API under the `/api` prefix. All endpoints return JSON unless the route serves a binary file stream.

> **Source of truth:** Route definitions live in `src/server/routes/` and `src/server/auth/routes.ts`. All request/response shapes are validated with Zod schemas in `src/server/middleware/validate.ts` and mapped through DTO mappers in `src/server/mappers/`.

---

## Base URL

| Environment | URL                                                             |
| ----------- | --------------------------------------------------------------- |
| Production  | `https://epstein.academy/api`                                   |
| Development | `http://localhost:3000/api` (port controlled by `PORT` env var) |

---

## Authentication

### Token type

All protected endpoints use **JWT Bearer tokens** in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Refresh tokens (7 days) are stored in an `HttpOnly` cookie at path `/api/auth` and are rotated on each use.

### Guards

| Guard                  | Behaviour                                                        |
| ---------------------- | ---------------------------------------------------------------- |
| `authenticateRequest`  | Requires a valid JWT. Returns `401` if missing or expired.       |
| `requireRole('admin')` | Additionally requires the `admin` role. Returns `403` otherwise. |
| `optionalAuthenticate` | Attaches `req.user` if a valid token is present; never rejects.  |

Role hierarchy (highest to lowest): `admin` → `investigator` → `viewer`.

Routes without a guard annotation below are **public** (read-only access with no token required).

---

## Error Responses

All error responses follow a consistent shape:

```json
{ "error": "Human-readable message" }
```

For 422 / validation failures (Zod), the error may include a `details` array. The global 404 for unknown API routes returns:

```json
{ "error": { "code": "NOT_FOUND", "message": "API route not found: GET /api/unknown" } }
```

### HTTP Status Codes

| Code | Meaning                                           |
| ---- | ------------------------------------------------- |
| 200  | Success                                           |
| 201  | Created                                           |
| 204  | No Content (e.g. vitals POST)                     |
| 307  | Temporary Redirect (legacy alias routes)          |
| 400  | Bad Request (validation or missing param)         |
| 401  | Unauthorized — token missing, expired, or invalid |
| 403  | Forbidden — insufficient role                     |
| 404  | Resource not found                                |
| 429  | Too Many Requests (rate limited)                  |
| 503  | Service Unavailable (server too busy or DB down)  |

---

## Rate Limiting

Rate-limit headers follow the `RateLimit-*` standard. A `Retry-After` header is included on 429 responses.

| Scope                                                   | Limit   | Window        |
| ------------------------------------------------------- | ------- | ------------- |
| General API (global)                                    | 100 req | 1 min per IP  |
| `GET /api/analytics/enhanced`                           | 10 req  | 1 min per IP  |
| `GET /api/graph/global`                                 | 10 req  | 1 min per IP  |
| `GET /api/map/entities`                                 | 20 req  | 1 min per IP  |
| `POST /api/documents/:id/annotations`                   | 20 req  | 15 min per IP |
| `POST /api/vitals`                                      | 60 req  | 1 min per IP  |
| `GET /api/downloads/release/:id`                        | 5 req   | 1 min per IP  |
| Auth endpoints (`/api/auth/login`, `/api/auth/refresh`) | 10 req  | 15 min per IP |

---

## 1. Authentication — `/api/auth`

### `POST /api/auth/login`

Authenticate with username and password. Returns a short-lived access token and sets a `HttpOnly` refresh cookie.

**Body:**

```json
{ "username": "string", "password": "string" }
```

**Response:**

```json
{
  "success": true,
  "accessToken": "<jwt>",
  "user": { "id": "uuid", "username": "...", "role": "admin|investigator|viewer", "email": "..." }
}
```

---

### `POST /api/auth/refresh`

Exchange a valid refresh cookie for a new access token. The old refresh token is revoked; a new one is set in the cookie (token rotation).

**Response:** `{ "success": true, "accessToken": "<jwt>" }`

---

### `POST /api/auth/logout`

Revoke the current refresh token and clear the cookie.

**Response:** `{ "success": true }`

---

### `GET /api/auth/me`

Return the currently authenticated user, or `{ "user": null }` if not authenticated (uses `optionalAuthenticate`).

---

### `POST /api/auth/change-password`

🔒 Requires auth.

**Body:** `{ "currentPassword": "string", "newPassword": "string (min 8 chars)" }`

---

## 2. Entities — `/api/entities` & `/api/subjects`

### `GET /api/subjects`

Optimised subject-card listing for the People browse page.

**Query Params:**

| Param             | Type               | Default | Notes                                                                           |
| ----------------- | ------------------ | ------- | ------------------------------------------------------------------------------- |
| `page`            | number             | 1       |                                                                                 |
| `limit`           | number             | 24      | max 100                                                                         |
| `search`          | string             | —       | Name search                                                                     |
| `role`            | string             | —       | Filter by role                                                                  |
| `entityType`      | string             | —       | Filter by entity type                                                           |
| `likelihoodScore` | string \| string[] | —       | `HIGH`, `MEDIUM`, `LOW`                                                         |
| `sortBy`          | string             | `risk`  | `red_flag`, `risk`, `mentions`, `name`, `recent`, `relevance`, `document-count` |
| `sortOrder`       | string             | `desc`  | `asc`, `desc`                                                                   |

**Response:** `SubjectsListResponse` — paginated list of subject card objects.

---

### `GET /api/entities`

Full entity listing with extended filters.

**Query Params:** Same as `/subjects` plus:

| Param                                 | Notes                       |
| ------------------------------------- | --------------------------- |
| `type`                                | Entity type filter          |
| `minRedFlagIndex` / `maxRedFlagIndex` | Numeric risk index range    |
| `likelihood`                          | Alias for `likelihoodScore` |

---

### `GET /api/entities/all`

Lightweight entity list for dropdowns and autocomplete (up to `limit`, max 10 000).

**Query Params:** `limit` (default 1000)

---

### `GET /api/entities/search`

Quick entity name search.

**Query Params:** `q` (search term), `limit` (default 20, max 100)

**Response:** `{ "results": [ EntityListItem ] }`

---

### `GET /api/entities/batch/portraits`

Batch portrait URL resolution (up to 100 IDs, comma-separated).

**Query Params:** `ids` — comma-separated entity IDs

**Response:** `{ "items": [{ "entityId": "1", "url": "/api/entities/1/portrait" | null }] }`

---

### `GET /api/entities/:id`

Full entity detail including bio, photos, risk metadata, and Black Book entries.

**Response shape (key fields):**

```json
{
  "id": 1,
  "fullName": "Jeffrey Epstein",
  "primaryRole": "Financier",
  "redFlagRating": 5,
  "mentions": 111000,
  "documentCount": 51200,
  "likelihoodLevel": "HIGH",
  "bio": "...",
  "photos": [],
  "blackBookEntry": []
}
```

---

### `GET /api/entities/:id/portrait`

Serve the entity's profile photo directly (binary response, `Content-Type` derived from file extension).

---

### `GET /api/entities/:id/evidence`

All mention-evidence records for the entity.

---

### `GET /api/entities/:id/relations`

Relation evidence for the entity (subject/object predicates with supporting document spans).

**Response:** `{ "relations": [ RelationEvidence ] }`

---

### `GET /api/entities/:id/analytics/graph`

Entity relationship graph slice (depth configurable via `?depth=2`, max 4).

Alias: `GET /api/entities/:id/graph` (legacy)

---

### `GET /api/entities/:id/documents`

Documents mentioning this entity.

**Query Params:** `page`, `limit` (max 200), `search`, `source`, `sort`

**Response:** `{ "data": [], "total": N, "page": N, "limit": N }`

---

### `GET /api/entities/:id/investigations`

Investigations that involve this entity.

---

### `GET /api/entities/:id/media`

Media items featuring this entity. Responses include `ETag` / `Cache-Control` headers for efficient caching.

---

### `GET /api/entities/:id/photo`

Serve the entity's preferred photo file (with face-crop preference).

---

### `GET /api/entities/:id/claims`

Knowledge graph claims (triples) where this entity is subject or object.

---

### `GET /api/entities/:id/flights`

Flights associated with this entity.

**Response:** `{ "flights": [ FlightRecord ] }`

---

### `GET /api/entities/:id/transactions`

Financial transactions involving this entity.

---

### `GET /api/entities/:id/properties`

Properties owned by or associated with this entity.

**Response:** `{ "properties": [ Property ] }`

---

## 3. Documents — `/api/documents`

### `GET /api/documents`

List documents with pagination and filtering. Supports lexical, semantic, and hybrid search modes when `search` is provided.

**Query Params:**

| Param                       | Type       | Notes                                     |
| --------------------------- | ---------- | ----------------------------------------- |
| `page`                      | number     | default 1                                 |
| `limit`                     | number     | default 50                                |
| `search`                    | string     | Full-text search                          |
| `mode`                      | string     | `lexical` (default), `semantic`, `hybrid` |
| `fileType`                  | string     | Filter by file extension                  |
| `evidenceType`              | string     | Filter by evidence category               |
| `source`                    | string     | Filter by source collection               |
| `startDate` / `endDate`     | ISO date   | Date range                                |
| `hasFailedRedactions`       | boolean    |                                           |
| `minRedFlag` / `maxRedFlag` | number     | Risk score range                          |
| `sortBy`                    | string     | Sort field                                |
| `sortOrder`                 | string     | `asc` / `desc`                            |
| `collectionId`              | string     |                                           |
| `includeMedia`              | boolean    | Include media items in results            |
| `excludedFileTypes`         | CSV string | Comma-separated types to exclude          |

**Response includes `searchMeta`** when a search mode is specified, reporting `requestedMode`, `effectiveMode`, and `semanticAvailable`.

---

### `GET /api/documents/:id`

Full document metadata including OCR text preview, page count, mention count, and source provenance.

---

### `GET /api/documents/:id/pages`

Paginated document pages with OCR text.

---

### `GET /api/documents/:id/lineage`

Document provenance / chain of custody.

---

### `GET /api/documents/:id/annotations`

Annotations on this document (highlights, notes).

---

### `POST /api/documents/:id/annotations`

Add an annotation. Rate-limited to **20 requests per 15 minutes** per IP (no auth required, fingerprinted by IP + User-Agent).

**Body:**

```json
{
  "type": "string",
  "selectedText": "string",
  "note": "string",
  "start": 0,
  "end": 100,
  "contextBefore": "string",
  "contextAfter": "string"
}
```

---

### `GET /api/documents/:id/redactions`

Redacted region spans with page, text, and bounding box.

**Response:** `{ "hasFailedRedactions": bool, "count": N, "redactions": [{ "page", "text", "bbox" }] }`

---

### `GET /api/documents/:id/file`

Stream the original document file (PDF, image, or EML). Supports HTTP Range requests for video/large files. The `?variant=` query param selects among `dirty`, `original`, and `cleaned` path variants.

---

### `GET /api/documents/:id/related`

Related documents based on shared entities and topics.

**Query Params:** `limit`

---

### `GET /api/documents/:id/claims`

Claims (knowledge graph triples) extracted from this document.

---

## 4. Investigations — `/api/investigations`

All **listing** and **reading** routes are public. Mutation routes require authentication; deletion and update additionally require **admin role or ownership**.

### `GET /api/investigations`

List investigations with optional filtering.

**Query Params:** `status`, `ownerId`, `page`, `limit`

**Response:** `{ "data": [ InvestigationListItem ], "total": N }`

---

### `GET /api/investigations/by-title`

Find investigation by exact title.

**Query Params:** `title` (required)

---

### `POST /api/investigations`

🔒 Requires auth. Create a new investigation.

**Body:** `{ "title": "string (required)", "description": "string" }`

**Response:** `201 Created` — investigation object.

---

### `GET /api/investigations/:id`

Single investigation by numeric ID or UUID.

---

### `GET /api/investigations/:id/stats`

Counts of entities, documents, and evidence items linked to this investigation.

---

### `PUT /api/investigations/:id`

🔒 Requires auth (admin or owner). Update title, description, or status.

**Body:** `{ "title"?, "description"?, "status"? }`

---

### `DELETE /api/investigations/:id`

🔒 Requires auth (admin or owner).

---

### Timeline Events

| Method   | Path                            | Auth | Notes                                                  |
| -------- | ------------------------------- | ---- | ------------------------------------------------------ |
| `GET`    | `/:id/timeline-events`          | —    |                                                        |
| `POST`   | `/:id/timeline-events`          | 🔒   | Body: `{ title, description, event_date, event_type }` |
| `PATCH`  | `/:id/timeline-events/:eventId` | 🔒   | Partial update                                         |
| `DELETE` | `/:id/timeline-events/:eventId` | 🔒   |                                                        |

---

### Evidence

| Method | Path                              | Auth | Notes                                       |
| ------ | --------------------------------- | ---- | ------------------------------------------- |
| `GET`  | `/:id/evidence`                   | —    | Query params: `limit`, `offset`             |
| `POST` | `/:id/evidence`                   | 🔒   | Adds evidence item to investigation         |
| `GET`  | `/:id/evidence-by-type`           | —    | Evidence grouped by type                    |
| `GET`  | `/:id/analytics/evidence-summary` | —    | Evidence summary statistics                 |
| `GET`  | `/:id/evidence-summary`           | —    | Legacy alias for analytics/evidence-summary |

---

### Evidence Annotations

| Method   | Path                                                  | Auth | Notes                                                                 |
| -------- | ----------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| `GET`    | `/:id/evidence/:evidenceId/annotations`               | —    |                                                                       |
| `POST`   | `/:id/evidence/:evidenceId/annotations`               | 🔒   | Body: `{ type, content, color, startOffset?, endOffset?, metadata? }` |
| `PUT`    | `/:id/evidence/:evidenceId/annotations/:annotationId` | 🔒   |                                                                       |
| `DELETE` | `/:id/evidence/:evidenceId/annotations/:annotationId` | 🔒   |                                                                       |

---

### Hypotheses

| Method   | Path                                          | Auth | Notes                             |
| -------- | --------------------------------------------- | ---- | --------------------------------- |
| `GET`    | `/:id/hypotheses`                             | —    |                                   |
| `POST`   | `/:id/hypotheses`                             | 🔒   | Body: `{ title, description }`    |
| `PUT`    | `/:id/hypotheses/:hypId`                      | 🔒   |                                   |
| `DELETE` | `/:id/hypotheses/:hypId`                      | 🔒   |                                   |
| `POST`   | `/:id/hypotheses/:hypId/evidence`             | 🔒   | Body: `{ evidenceId, relevance }` |
| `DELETE` | `/:id/hypotheses/:hypId/evidence/:evidenceId` | 🔒   |                                   |

---

### Investigative Leads

| Method   | Path                 | Auth | Notes                                                                                                 |
| -------- | -------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| `GET`    | `/:id/leads`         | —    | Query params: `status`                                                                                |
| `POST`   | `/:id/leads`         | 🔒   | Body: `{ title, description, status, priority, source_document_id?, source_efta_ref?, assigned_to? }` |
| `PATCH`  | `/:id/leads/:leadId` | 🔒   | Partial update                                                                                        |
| `DELETE` | `/:id/leads/:leadId` | 🔒   |                                                                                                       |

---

### Notebook & Board

| Method | Path            | Auth | Notes                                                            |
| ------ | --------------- | ---- | ---------------------------------------------------------------- |
| `GET`  | `/:id/notebook` | 🔒   | Investigation notebook state                                     |
| `PUT`  | `/:id/notebook` | 🔒   | Body: `{ order, annotations }`                                   |
| `GET`  | `/:id/board`    | 🔒   | Board snapshot; query params: `evidenceLimit`, `hypothesisLimit` |
| `GET`  | `/:id/activity` | —    | Activity feed; query param: `limit`                              |
| `GET`  | `/:id/briefing` | 🔒   | Generates Markdown briefing document                             |

---

### Export

| Method | Path                  | Auth | Notes                                                                            |
| ------ | --------------------- | ---- | -------------------------------------------------------------------------------- |
| `GET`  | `/:id/export/zip`     | 🔒   | Binary ZIP stream. Response header `x-export-skipped-files` lists omitted files. |
| `GET`  | `/:id/export/preview` | 🔒   | Dry-run preview of ZIP contents — no file is created.                            |

---

## 5. Investigation Evidence (Session API) — `/api/investigations`

These routes are mounted on the same `/api/investigations` prefix but handle session-level evidence management.

| Method   | Path                                        | Auth | Notes                                                                    |
| -------- | ------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| `GET`    | `/evidence/:entityId`                       | —    | Evidence summary for an entity                                           |
| `POST`   | `/add-evidence`                             | 🔒   | Body: `{ investigationId, evidenceId, notes?, relevance? }`              |
| `POST`   | `/add-media`                                | 🔒   | Body: `{ investigationId, mediaItemId, notes?, relevance? }`             |
| `POST`   | `/add-snippet`                              | 🔒   | Body: `{ investigationId, documentId, snippetText, notes?, relevance? }` |
| `GET`    | `/:investigationId/evidence-summary`        | —    | Legacy alias                                                             |
| `DELETE` | `/remove-evidence/:investigationEvidenceId` | 🔒   |                                                                          |

---

## 6. Evidence — `/api/evidence`

### `POST /api/evidence/upload`

🔒 Requires auth. Upload a document file (PDF, DOCX, TXT, CSV, image). Max 50 MB. File signature validation is enforced server-side.

**Request:** `multipart/form-data` with field `file` plus optional `title` and `description`.

**Response:** `201 { "success": true, "documentId": N }`

---

### `GET /api/evidence/search`

Search across all evidence items.

**Query Params:** `q`, `limit` (default 20, max 100), `mode` (`lexical` | `semantic` | `hybrid`)

**Response includes `_meta`** with `mode`, `semanticAvailable`, `degraded`, and `degradedReason`.

---

### `GET /api/evidence/types`

List all evidence types and their counts.

---

### `GET /api/evidence/:id`

Full evidence record including OCR text, entity mentions, provenance, and file metadata.

---

### `GET /api/evidence/:id/metrics`

Heuristic quality metrics (OCR score, provenance score). **Not forensically valid** — see disclaimer in response.

---

### `GET /api/evidence/:id/custody`

Chain of custody events for the evidence item.

---

### `POST /api/evidence/:id/analyze`

🔒 Requires admin. Trigger document signal analysis. Computes heuristic `documentSignalScore` from OCR quality, source provenance, and red-flag rating. Result is **not a forensic authenticity score**.

---

## 7. Search — `/api/search`

### `GET /api/search`

Unified search across entities, documents, media, investigations, and articles.

**Query Params:**

| Param                             | Notes                                                       |
| --------------------------------- | ----------------------------------------------------------- |
| `q` / `query`                     | Search term (min 2 chars; returns empty results if omitted) |
| `limit`                           | default 20, max 100                                         |
| `mode`                            | `lexical` (default), `semantic`, `hybrid`, `web`, `prefix`  |
| `evidenceType`                    | Filter by evidence category                                 |
| `sourceType`                      | Filter by source type                                       |
| `mediaType`                       | `image`, `video`, `audio`                                   |
| `entityType`                      | Filter by entity type                                       |
| `reviewState`                     | `unreviewed`, `verified`, `rejected`, `deferred`            |
| `redFlagBand`                     | `low`, `medium`, `high`                                     |
| `confidenceMin` / `confidenceMax` | Confidence score range 0–1                                  |
| `dateFrom` / `dateTo`             | ISO date range                                              |

**Response:**

```json
{
  "entities": [],
  "documents": [],
  "investigations": [],
  "articles": [],
  "media": [],
  "didYouMean": []
}
```

---

## 8. Media — `/api/media`

### `GET /api/media/batch-avatars`

Batch avatar URL resolution (max 50 IDs).

**Query Params:** `ids` — comma-separated entity IDs

**Response:** `{ "items": [{ "entityId": "1", "url": "/api/media/images/:id/thumbnail", "etag": "..." }] }`

---

### `GET /api/media/albums`

List all photo albums. Cached 5 minutes.

---

### `GET /api/media/stats`

Media library statistics. Cached 2 minutes.

---

### `GET /api/media/tags`

All image tags. Cached 2 minutes.

---

### `GET /api/media/images`

Browse images with pagination and filtering.

**Query Params:**

| Param                                        | Notes                                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `page`, `limit`                              | Pagination (default 24)                                                                  |
| `albumId`, `tagId`, `personId`, `documentId` | Relational filters                                                                       |
| `sortField`                                  | `date_added` (default), `date_taken`, `filename`, `file_size`, `title`, `date`, `rating` |
| `sortOrder`                                  | `asc` / `desc`                                                                           |
| `slim`                                       | boolean — Return slim payload (omit heavy fields)                                        |
| `verificationStatus`                         | `verified`, `unverified`, `rejected`                                                     |
| `minRedFlagRating`                           | 0–5                                                                                      |
| `hasPeople`                                  | boolean — Only images with identified people                                             |
| `search`                                     | Search by title / transcript text                                                        |
| `excludeTextScans`                           | boolean — Hide document scan images                                                      |

**Response header:** `X-Total-Count` with total record count.

---

### `GET /api/media/images/:id/thumbnail`

Serve image thumbnail (binary).

---

### `GET /api/media/images/:id/file`

Serve full-resolution image (binary). Alias: `GET /api/media/images/:id/raw`

---

### `GET /api/media/images/:id/tags`

Tags applied to an image.

---

### `GET /api/media/images/:id/people`

People identified in an image.

---

### `PUT /api/media/images/:id`

🔒 Requires admin. Update image metadata.

**Body:** `{ "title"?, "description"?, "redFlagRating"? }`

---

### `PUT /api/media/images/:id/rotate`

🔒 Requires admin. Rotate image in-place.

**Body:** `{ "direction": "left" | "right" }`

---

### Tag & People Management (all require admin)

| Method   | Path                           | Notes                                       |
| -------- | ------------------------------ | ------------------------------------------- |
| `POST`   | `/images/:id/tags`             | Body: `{ tagId }`                           |
| `DELETE` | `/images/:id/tags/:tagId`      |                                             |
| `POST`   | `/images/:id/people`           | Body: `{ personId }` (or legacy `entityId`) |
| `DELETE` | `/images/:id/people/:personId` |                                             |

---

### Batch Operations (all require admin)

| Method | Path                     | Body                              | Notes                      |
| ------ | ------------------------ | --------------------------------- | -------------------------- |
| `POST` | `/images/batch/rotate`   | `{ imageIds, direction }`         |                            |
| `POST` | `/images/batch/rate`     | `{ imageIds, rating }`            |                            |
| `POST` | `/images/batch/metadata` | `{ imageIds, updates }`           |                            |
| `POST` | `/images/batch/tags`     | `{ imageIds, tagIds, action }`    | `action`: `add` / `remove` |
| `POST` | `/images/batch/people`   | `{ imageIds, personIds, action }` |                            |

---

### Video

| Method | Path                   | Notes                    |
| ------ | ---------------------- | ------------------------ |
| `GET`  | `/video`               | List videos (paginated)  |
| `GET`  | `/video/:id`           | Video metadata           |
| `GET`  | `/video/:id/file`      | Stream video (binary)    |
| `GET`  | `/video/:id/thumbnail` | Video thumbnail (binary) |

---

### Audio

| Method | Path                   | Notes                        |
| ------ | ---------------------- | ---------------------------- |
| `GET`  | `/audio`               | List audio items (paginated) |
| `GET`  | `/audio/:id`           | Audio metadata               |
| `GET`  | `/audio/:id/file`      | Stream audio (binary)        |
| `GET`  | `/audio/:id/thumbnail` | Audio thumbnail (binary)     |

---

### Other Media Endpoints

| Method | Path                  | Notes                                              |
| ------ | --------------------- | -------------------------------------------------- |
| `POST` | `/images/extract/:id` | 🔒 Admin — Extract embedded images from a document |
| `GET`  | `/pdf`                | Serve PDF by path; query param: `filePath`         |

---

## 9. Flights — `/api/flights`

### `GET /api/flights`

List flight records.

**Query Params:** `page`, `limit` (max 500), `startDate`, `endDate`, `passenger`, `airport`

---

### `GET /api/flights/stats`

Aggregated flight statistics.

---

### `GET /api/flights/airports`

Airport coordinates for map visualisation.

---

### `GET /api/flights/passengers`

Unique passenger name list.

---

### `GET /api/flights/co-occurrences`

Pairs of passengers who shared flights together.

**Query Params:** `minFlights` (default 2), `limit` (max 200)

**Response items:** `{ passenger1, passenger2, entity_id_1, entity_id_2, flights_together, first_flight, last_flight }`

---

### `GET /api/flights/:id`

Single flight record including passenger manifest.

---

## 10. Timeline — `/api/timeline`

### `GET /api/timeline`

Global timeline events (from pipeline extractions).

**Query Params:** `startDate`, `endDate` (ISO date)

---

### `GET /api/timeline/:id/support`

Supporting documents and metadata for a specific timeline event.

---

## 11. Emails — `/api/emails`

### `GET /api/emails/mailboxes`

List mailboxes (per-entity inboxes and the aggregated "All Inboxes" view).

**Query Params:** `showSuppressedJunk` (boolean)

**Response includes a `revisionKey`** reflecting the current ingest run and ruleset version.

---

### `GET /api/emails/threads`

Cursor-paginated list of email threads.

**Query Params:**

| Param                | Notes                                |
| -------------------- | ------------------------------------ |
| `mailboxId`          | `all` (default) or `entity:<id>`     |
| `q`                  | Full-text search                     |
| `from`, `to`         | Sender/recipient filter              |
| `dateFrom`, `dateTo` | Date range                           |
| `hasAttachments`     | boolean                              |
| `minRisk`            | 0–5 risk threshold                   |
| `tab`                | Category tab                         |
| `limit`              | default 50                           |
| `cursor`             | Opaque cursor from previous response |
| `showSuppressedJunk` | boolean                              |

**Response:**

```json
{
  "data": [{ "threadId", "subject", "participants", "lastMessageAt", "snippet", "messageCount", "hasAttachments", "linkedEntities", "risk", "ladder", "confidence" }],
  "meta": { "total", "limit", "hasMore", "nextCursor" }
}
```

---

### `GET /api/emails/threads/:threadId`

Full thread with all message headers and linked entities.

---

### `GET /api/emails/messages/:messageId/body`

Message body (HTML or plain text, cleaned).

**Query Params:** `showQuoted` (boolean — include quoted text)

**Response includes:** `extractedLinks`, `extractedEntities`, `mimeWarnings`, `parseStatus`, `ingestRunId`, `sourceFile`

---

### `GET /api/emails/messages/:messageId/raw`

Raw email source (EML).

---

### `GET /api/emails/search`

Search across email messages.

**Query Params:** `q`, `scope`, `mailboxId`, `limit`

---

### `GET /api/emails/categories`

Email category/folder counts.

---

### `GET /api/emails/known-senders`

Static list of known entity senders.

---

### `GET /api/emails/:id/entities`

Entities extracted from the email body.

**Response:** `{ "entities": [] }`

---

### Legacy Aliases

| Path                          | Redirects to                                                |
| ----------------------------- | ----------------------------------------------------------- |
| `GET /api/emails/thread/:id`  | `GET /api/emails/threads/:id` (307)                         |
| `GET /api/emails/message/:id` | `GET /api/emails/messages/:id/body` (307)                   |
| `GET /api/emails`             | `GET /api/emails/threads` (307) with forwarded query params |

---

## 12. Analytics — `/api/analytics`

### `GET /api/analytics/enhanced`

Enhanced analytics from materialised views (O(1) response). Rate-limited to **10 req/min**. Cached 60 seconds, `Cache-Control: public, max-age=300`.

**Response includes:**

```json
{
  "documentsByType": [],
  "timelineData": [],
  "topConnectedEntities": [],
  "entityTypeDistribution": [],
  "riskByType": [],
  "redactionStats": {},
  "topRelationships": [],
  "totalCounts": { "entities", "documents", "evidenceFiles", "relationships" },
  "reconciliation": { "unclassifiedCount", "unknownDateCount" },
  "generatedAt": "ISO date"
}
```

`GET /api/analytics` redirects (307) to `/api/analytics/enhanced`.

---

### `GET /api/analytics/correlations`

🔒 Requires auth. Cross-source correlation analysis combining entity relationships, financial transactions, and communications.

---

### Reconciliation (admin only)

| Method | Path               | Notes                                         |
| ------ | ------------------ | --------------------------------------------- |
| `POST` | `/reconcile/junk`  | Trigger background junk entity reconciliation |
| `POST` | `/reconcile/reset` | Reset all junk flags                          |

---

## 13. Advanced Analytics — `/api/advanced-analytics`

All endpoints require authentication.

| Endpoint                     | Notes                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| `GET /patterns`              | Detect patterns; optional `?search=`                       |
| `GET /timeline`              | Timeline reconstruction; optional `?entityId=`, `?search=` |
| `GET /anomalies`             | Anomaly detection                                          |
| `GET /risk-assessment`       | Risk assessments; optional `?entityId=`                    |
| `GET /relationships`         | Relationship map; optional `?entityId=`, `?depth=2`        |
| `GET /predictive-insights`   | AI-powered insights                                        |
| `GET /cross-reference`       | Cross-reference validation; requires `?search=`            |
| `GET /investigation-summary` | Investigative task summary                                 |

### Visualisations

| Endpoint                                  | Notes                                  |
| ----------------------------------------- | -------------------------------------- |
| `GET /visualization/relationship-graph`   | optional `?entityId=`, `?maxNodes=100` |
| `GET /visualization/geospatial`           |                                        |
| `GET /visualization/timeline`             | optional `?search=`                    |
| `GET /visualization/network-analysis`     |                                        |
| `GET /visualization/interactive-map`      |                                        |
| `GET /visualization/connection-inference` | requires `?entityId=`                  |

### Predictive

| Endpoint                                | Notes                 |
| --------------------------------------- | --------------------- |
| `GET /predictive/patterns`              |                       |
| `GET /predictive/patterns/:entityId`    |                       |
| `GET /predictive/risk-assessment`       |                       |
| `GET /predictive/connection-inferences` | optional `?entityId=` |
| `GET /predictive/risk-dashboard`        |                       |
| `GET /predictive/insights`              | optional `?search=`   |

---

## 14. Statistics & Health — `/api/stats`

### `GET /api/stats`

Public high-level archive statistics. Cached **5 minutes**.

**Response:**

```json
{
  "totalEntities": 86000,
  "totalDocuments": 51000,
  "totalMentions": 1600000,
  "documentsWithMetadata": 48000,
  "entitiesWithDocuments": 72000,
  "likelihoodDistribution": [{ "level": "HIGH", "count": 5000 }]
}
```

---

### Health Checks

| Endpoint                      | Auth | Notes                                                                           |
| ----------------------------- | ---- | ------------------------------------------------------------------------------- |
| `GET /api/stats/health`       | —    | Basic: DB ping + entity/doc counts                                              |
| `GET /api/stats/health/ready` | —    | Readiness probe with optional `?soft=1`                                         |
| `GET /api/stats/health/deep`  | —    | Comprehensive: tables, query, memory, DB size, backups                          |
| `GET /api/health/ready`       | —    | App-level readiness (DB + pool saturation check); `?soft=1` for richer response |
| `GET /api/_meta/db`           | —    | DB dialect, version, timeout settings, pool metrics                             |
| `GET /api/stats/meta/db`      | 🔒   | Same as `_meta/db` but auth-gated                                               |

---

### Ingestion & Pipeline (admin only)

| Method | Path                       | Notes                                |
| ------ | -------------------------- | ------------------------------------ | -------- | ---------------------------------- |
| `POST` | `/stats/pipeline/control`  | Body: `{ runId, signal: "pause"      | "resume" | "stop" }`                          |
| `POST` | `/stats/ingestion/process` | Body: `{ action: "start"             | "stop"   | "restart" }` — manages PM2 process |
| `GET`  | `/stats/ingestion/status`  | PM2 process info + pipeline progress |

---

### Backups & Ingest Runs (admin only)

| Method | Path                     | Notes                         |
| ------ | ------------------------ | ----------------------------- |
| `GET`  | `/stats/backups`         | List backup snapshots         |
| `POST` | `/stats/backups/trigger` | Trigger a new backup          |
| `GET`  | `/stats/ingest-runs`     | Last 20 ingestion run records |

---

## 15. Status & Backfill — `/api/status`

| Endpoint                   | Notes                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| `GET /api/status/archive`  | Archive status (validated against `archiveStatusSchema`)         |
| `GET /api/status/backfill` | Pipeline backfill progress from checkpoint file + live DB counts |

---

## 16. Relationships — `/api/relationships`

### `GET /api/relationships`

Entity relationship list.

**Query Params:** `entityId` (required), `limit` (default 50, max 200), `minWeight`

**Response:** `{ "relationships": [{ "entity_id", "related_entity_id", "related_entity_name", "relationship_type", "strength", "confidence", "weight" }] }`

---

## 17. Graph — `/api/graph`

`GET /api/graph` redirects (307) to `/api/graph/global`.

### `GET /api/graph/global`

Global relationship graph. Rate-limited to **10 req/min**.

**Query Params:**

| Param                  | Notes                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `limit`                | Max nodes (default 150)                                                                       |
| `minRisk`              | Minimum risk score (default 0)                                                                |
| `mode`                 | `cluster` (community view), `path` (requires `sourceId` + `targetId`), or omit for full graph |
| `startDate`, `endDate` | Date-filtered edge window                                                                     |
| `sourceId`, `targetId` | Required when `mode=path`                                                                     |

**Response:**

```json
{
  "nodes": [{ "id", "label", "type", "risk", "connectionCount", "community" }],
  "edges": [{ "id", "source", "target", "type", "weight", "confidence", "classification" }]
}
```

---

### `GET /api/graph/edge-evidence`

Evidence documents supporting a graph edge.

**Query Params:** `sourceId` (required), `targetId` (required)

**Response:** `{ "documents": [], "relationship": {} | null }`

---

## 18. Map — `/api/map`

### `GET /api/map/entities`

Top 500 entities with valid geospatial coordinates, sorted by mentions and risk. Rate-limited to **20 req/min**. Cached 60 seconds.

**Query Params:** `minRisk` (default 0)

**Response header:** `X-Map-Debug-Count`

---

## 19. Financial — `/api/financial`

### `GET /api/financial/transactions/:id`

Single transaction details (public).

---

### `GET /api/financial/transactions`

🔒 Requires auth. List financial transactions.

**Query Params:** `limit`

---

### `GET /api/financial/stats`

🔒 Requires auth. Financial summary statistics.

---

## 20. Properties — `/api/properties`

### `GET /api/properties`

List properties with pagination and filtering.

**Query Params:** `page`, `limit` (max 500), `search` (owner name), `minValue`, `maxValue`, `type` (property use), `associatesOnly` (boolean), `sortBy` (`value` | `owner` | `year`), `sortOrder`

---

### `GET /api/properties/stats`

Property statistics.

---

### `GET /api/properties/value-distribution`

Value distribution histogram.

---

### `GET /api/properties/top-owners`

Top property owners by total value.

**Query Params:** `limit` (default 20, max 100)

---

### `GET /api/properties/known-associates`

Properties linked to known associates.

---

### `GET /api/properties/:id`

Single property record.

---

## 21. Black Book — `/api/black-book`

### `GET /api/black-book`

Browse Jeffrey Epstein's address book entries.

**Query Params:** `letter` (A–Z or `ALL`), `search`, `hasPhone`, `hasEmail`, `hasAddress`, `category` (`original` | `contact` | `credential`), `limit` (max 10 000)

**Response:** `{ "data": [], "total": N, "page": 1, "pageSize": N, "totalPages": 1 }`

---

### `GET /api/black-book/review`

Entries awaiting name disambiguation review, plus review statistics.

---

### `POST /api/black-book/review/:id`

🔒 Requires admin. Submit a review decision.

**Body:** `{ "correctedName": "string", "action": "approve" | "skip" | "delete" }`

---

## 22. Claims — `/api/claims`

### `GET /api/claims/:id`

Single knowledge graph claim (triple: subject → predicate → object).

---

### `POST /api/claims/:id/verify`

🔒 Requires admin. Verify or reject a claim.

**Body:** `{ "status": 1 | 2, "rejectionReason"? }` — `1` = verified, `2` = rejected.

---

## 23. Intelligence — `/api/intelligence`

### `GET /api/intelligence/review`

All post-ingest quality queue summaries and counts. Cached **5 minutes**.

---

### `GET /api/intelligence/readiness`

Release readiness state: semantic search availability, provenance coverage, pending review counts. Cached **2 minutes**.

---

## 24. Review Queue — `/api/review`

All endpoints require **admin role**.

### `GET /api/review/mentions/queue`

High-signal unverified entity mentions for review.

**Query Params:** `limit` (default 20, max 100)

---

### `POST /api/review/mentions/:id/verify`

Verify an entity mention.

**Body:** `{ "verified_by"? }`

---

### `POST /api/review/mentions/:id/reject`

Reject an entity mention.

**Body:** `{ "rejection_reason": "string (required)", "verified_by"? }`

---

### `GET /api/review/claims/queue`

Unverified claims for review.

**Query Params:** `limit` (default 20, max 100)

---

### `POST /api/review/claims/:id/verify` / `POST /api/review/claims/:id/reject`

Same schema as the mention verify/reject routes.

---

### `POST /api/review/bulk`

🔒 Admin. Bulk review up to 100 items in a single request.

**Body:**

```json
{
  "items": [{ "type": "mention" | "claim", "id": N, "decision": "accept" | "reject" | "defer" | "insufficient_evidence", "reason"? }],
  "reviewed_by"?
}
```

---

### `POST /api/review/flag`

🔒 Requires auth. Flag any item for manual review.

**Body:** `{ "targetType": "entity" | "document" | "claim" | "evidence", "targetId": "string|number", "reason": "string", "note"? }`

**Response:** `201 { "success": true, "flagId": N, "status": "pending_review" }`

---

## 25. Forensic — `/api/forensic`

### `GET /api/forensic/metrics-summary`

🔒 Requires auth. Aggregated forensic metrics summary.

---

## 26. Face Clusters — `/api/faces`

All endpoints require **admin role**.

| Method  | Path            | Notes                                                                       |
| ------- | --------------- | --------------------------------------------------------------------------- |
| `GET`   | `/clusters`     | List all face clusters                                                      |
| `GET`   | `/clusters/:id` | Single cluster with face list                                               |
| `PATCH` | `/clusters/:id` | Body: `{ name?, is_hidden?, entity_id? }` — rename, hide, or link to entity |
| `GET`   | `/assets`       | Serve face-crop image; query param: `path`                                  |

---

## 27. Users — `/api/users`

### `GET /api/users`

🔒 Requires admin. List all users.

---

### `GET /api/users/current`

🔒 Requires auth. Current authenticated user.

---

### `POST /api/users`

🔒 Requires admin. Create a new user.

**Body:** `{ "username": "string (min 3)", "password": "string (min 6)", "email"?, "role"?: "admin" | "investigator" | "viewer" }`

**Response:** `201 { "id", "username", "email", "role" }`

---

### `PUT /api/users/:id`

🔒 Requires auth (admin can update any user; users can update their own account).

**Body:** `{ "username"?, "email"?, "role"? (admin only), "password"? }`

---

### `DELETE /api/users/:id`

🔒 Requires admin. Cannot delete your own account.

---

## 28. Admin — `/api/admin`

### `GET /api/admin/revision`

🔒 Requires auth. Canonical dataset revision token.

---

### `GET /api/admin/audit-logs`

🔒 Requires auth. Recent system audit log entries.

**Query Params:** `limit` (default 100)

---

## 29. Data Quality — `/api/data-quality`

| Method | Path           | Auth | Notes                                           |
| ------ | -------------- | ---- | ----------------------------------------------- |
| `GET`  | `/metrics`     | 🔒   | Comprehensive data quality and coverage metrics |
| `GET`  | `/lineage/:id` | 🔒   | Document provenance and lineage                 |

---

## 30. Investigative Tasks — `/api/tasks`

| Method   | Path                              | Auth     | Notes                                                                                                                           |
| -------- | --------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/`                               | —        | List tasks; query params: `investigationId`, `status`, `priority`, `assignedTo`, `page`, `limit`                                |
| `GET`    | `/:id`                            | —        | Single task                                                                                                                     |
| `POST`   | `/`                               | 🔒       | Create task; body: `{ investigationId, title, description?, priority?, assignedTo?, dueDate?, evidenceIds?, relatedEntities? }` |
| `PUT`    | `/:id`                            | 🔒       | Update task                                                                                                                     |
| `DELETE` | `/:id`                            | 🔒 Admin | Delete task                                                                                                                     |
| `GET`    | `/investigation/:investigationId` | —        | Tasks for an investigation                                                                                                      |
| `GET`    | `/summary/:investigationId`       | —        | Task completion summary                                                                                                         |
| `PATCH`  | `/:id/progress`                   | 🔒       | Body: `{ progress: 0–100 }`                                                                                                     |
| `GET`    | `/urgent/:userId?`                | —        | Urgent tasks for a user                                                                                                         |

---

## 31. Articles — `/api/articles`

### `GET /api/articles`

List archive articles.

**Query Params:** `page`, `limit` (max 100), `search`, `publication`, `sort` (`date` | `redFlag`)

**Response:** `{ "data": [], "pagination": { "page", "limit", "total", "totalPages" } }`

---

### `GET /api/articles/:id`

Single article.

---

## 32. Memory — `/api/memory`

AI agent memory entries. All endpoints require authentication.

| Method   | Path   | Notes                                                                                                              |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `GET`    | `/`    | List entries; query params: `page`, `limit`, `memoryType`, `status`, `q`                                           |
| `POST`   | `/`    | Create entry; body: `{ memoryType, content, contextTags?, importanceScore?, sourceId?, sourceType?, provenance? }` |
| `PUT`    | `/:id` | Update entry                                                                                                       |
| `DELETE` | `/:id` | Returns `204` on success                                                                                           |

`memoryType` values: `declarative`, `episodic`, `working`, `procedural`

---

## 33. Web Vitals — `/api/vitals`

### `POST /api/vitals`

Collect Web Vitals from production clients. Rate-limited to **60 req/min**. Returns `204` (fire-and-forget).

**Body:** `{ sessionId, route, cls, lcp, inp, longTaskCount, timestamp }`

---

### `GET /api/vitals/aggregates`

🔒 Requires admin. Daily p75 aggregates.

**Query Params:** `days` (default 7, max 365)

---

## 34. Utility Endpoints

| Method | Path                        | Notes                                                                     |
| ------ | --------------------------- | ------------------------------------------------------------------------- |
| `GET`  | `/api/resolve/epstein-file` | Resolve a DOJ-style file path to a local document ID; query param: `path` |
| `GET`  | `/sitemap.xml`              | XML sitemap (served before static files)                                  |
| `GET`  | `/api/ready`                | Alias — redirects to `/api/health/ready` (307)                            |

---

## Data Contracts

All API responses are validated against Zod schemas in `src/shared/schemas/` and `src/server/middleware/validate.ts`, and mapped through DTO mappers in `src/server/mappers/`. Contract tests in `tests/api-dto-contract.spec.ts` verify response shapes.

---

## CI Gates

### What runs in CI

The CI workflow (`.github/workflows/ci.yml`) runs on every push/PR to `main`/`master` via `scripts/quality_gate.sh`, which executes:

| Step                 | Command                           | What it covers                                  |
| -------------------- | --------------------------------- | ----------------------------------------------- |
| Format check         | `pnpm format:check`               | Prettier formatting                             |
| Lint                 | `pnpm lint`                       | ESLint (TypeScript + React)                     |
| Type check           | `pnpm type-check`                 | Full `tsc --noEmit`                             |
| Seed conflict policy | `pnpm check:seed-conflict-policy` | Prevents seed data conflicts                    |
| Test hygiene         | `pnpm check:test-hygiene`         | Enforces test organisation rules                |
| Design tokens        | `pnpm check:design-tokens`        | Design system token compliance                  |
| Unit tests           | `pnpm test:unit`                  | Vitest unit test suite (`src/test/`)            |
| DB connectivity      | `pnpm db:check`                   | Verifies `DATABASE_URL` reachability (CI only)  |
| Schema hash          | `pnpm schema:hash:check`          | Detects silent schema drift (CI only)           |
| Production build     | `pnpm build:prod`                 | Full Vite + tsc server build                    |
| Bundle smoke tests   | `pnpm test:bundle-smoke:only`     | Catches TDZ / ReferenceError crashes post-build |

### Performance budget tests

`tests/ci-budgets.spec.ts` enforces hard Playwright-based budgets:

| Budget                           | Limit          |
| -------------------------------- | -------------- |
| API p95 latency                  | < 500 ms       |
| API p99 latency                  | < 1 000 ms     |
| List endpoint payloads           | < 100 KB       |
| No `body_raw` in list responses  | zero tolerance |
| Main JS bundle (gzipped)         | < 500 KB       |
| Console errors during navigation | zero tolerance |
| React key warnings               | zero tolerance |

The test file uses `test.skip(!process.env.CI, ...)` so it only executes when `CI=true` is set. These tests are **not** invoked by `quality_gate.sh` and require the app to be running. Run them with:

```sh
pnpm test:ci-budgets
```

This script is defined in `package.json` as:

```json
"test:ci-budgets": "CI=true playwright test tests/ci-budgets.spec.ts --project=chromium"
```

To wire this into CI, add a step to `.github/workflows/ci.yml` after the server is started that runs `pnpm test:ci-budgets`.
