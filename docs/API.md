# REST API Documentation

The Epstein Archive offers programmatic access to underlying investigation data via REST APIs.

## Authentication

Currently, the API endpoints run internal to the client layer or use session-based auth.

## Endpoints

### 1. Investigations

**GET** `/api/investigations`

- Returns a list of active investigations.
- Query Params: `limit` (default 50), `status`.

**GET** `/api/investigations/:id/evidence-by-type`

- Fetches correlated evidence linked to the investigation workspace.
- Payload: `{ all: EvidenceItem[] }`

### 2. Entities

**GET** `/api/entities/:id/communications`

- Retrieves the messaging vectors and timing patterns for an entity.
- Returns arrays of `threadId`, `date`, `subject`, `from`, `to` mapping.

**POST** `/api/entities/ingest`

- Internal ETL endpoint used to merge raw identities and enforce alias mapping.

### 3. Analytics

**GET** `/api/stats`

- High-level ingestion and processing counts (e.g. `documentsWithMetadata`).
