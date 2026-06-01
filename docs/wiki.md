# Architecture Wiki — Epstein Archive

## Overview

The Epstein Archive is an investigative research platform for analyzing documents,
entities, and relationships from the Epstein Files corpus. It is a full-stack
monolith: React 19 SPA frontend, Express.js API server, PostgreSQL 16+ database.

## System Architecture

### 1. Data Ingestion Pipeline

The `scripts/` directory contains the ETL logic.

- **`scripts/unified_pipeline.ts`** — canonical entry point; parses PDFs, CSV
  flight logs, and JSON dumps into normalized PostgreSQL rows.
- **Enrichment** — pipeline steps extract entities, assign confidence scores,
  and flag VIPs. An optional agentic stage (`scripts/ingest_intelligence.ts`)
  applies LLM-based contextual repair and entity linking.

### 2. Client Application

- **Framework**: React 19 / Vite (no SSR).
- **Design System**: CSS Modules + governed design-system primitives in
  `src/client/design-system/`. Tailwind CSS is **not used**; do not add it.
- **State**: React context (`AuthContext`, `FilterContext`,
  `InvestigationsContext`, `SensitiveSettingsContext`).
- **Component Architecture**:
  - Investigation Workspace (`src/client/components/investigation/`)
  - Evidence, Entity, Document, Email, Media surfaces
  - Shared design-system primitives (`Box`, `Surface`, `Button`, `LqText`, etc.)

### 3. Database (PostgreSQL 16+)

All schema is managed via migrations in `src/server/db/postgres/migrations/`.
The active database is **PostgreSQL only**.

Core tables: `investigations`, `entities`, `documents`, `communications`,
`investigation_evidence`, `entity_mentions`, `claims`, `review_queue`.

The `@epstein/db` workspace package provides pgtyped-generated strongly-typed
SQL queries.

### 4. API Server

Express.js routes in `src/server/routes/`. Each route domain has one file.
DTOs and Zod validation schemas live in `src/shared/schemas/` and
`src/server/mappers/`. All responses are validated against Zod schemas before
being sent (`sendValidated()` pattern).

## Three DB Pool Strategy

| Pool                   | Function                         | Use for                             |
| ---------------------- | -------------------------------- | ----------------------------------- |
| `getApiPool()`         | Read-only queries, short timeout | Route handlers, analysis scripts    |
| `getIngestPool()`      | Heavy workloads, 8 connections   | Ingest pipeline scripts             |
| `getMaintenancePool()` | Long timeouts, 256MB work_mem    | Backfill, repair, migration scripts |

## URL and Deep Link Strategy

Every major surface encodes its state in the URL so that links are shareable
and bookmarkable. The canonical URL shapes are:

| Surface                 | URL shape                                                       |
| ----------------------- | --------------------------------------------------------------- |
| Investigation workspace | `/investigations/:uuid?tab=<tab>&evidenceId=<id>`               |
| Entity dossier          | `/entity/:id?tab=<tab>`                                         |
| Document modal          | `?docId=<id>&page=<n>`                                          |
| Search                  | `/?q=<query>&type=<type>&sort=<sort>&order=<order>&risk=<risk>` |

URL state is managed via React Router `useSearchParams`. Direct access to
`window.location.search` is **not allowed** in React components — use the
`useSearchParam` hook from `src/client/hooks/useSearchParam.ts`.
