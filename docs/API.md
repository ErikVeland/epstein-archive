# Epstein Archive API Documentation

## Overview

The Epstein Archive API provides access to the document corpus, entity graph, and investigation tools.

**Base URL**: `/api`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

- **Header**: `Authorization: Bearer <token>`
- **Login**: `POST /api/auth/login`
- **Access**: Read-only routes may be public; mutation routes require authentication.

## Endpoints

### 📂 Evidence & Documents

#### Upload Document

`POST /api/evidence/upload`
Upload a new document to the archive.

- **Body**: `multipart/form-data` with `file` field.
- **Restrictions**: Max 50MB. Allowed: PDF, TXT, DOCX, JPG, PNG.
- **Returns**: `{ success: true, documentId: 123 }`

#### Search Evidence

`GET /api/evidence/search?query=...`
Full-text search across documents and entities.

- **Params**: `query`, `limit`, `page`, `redFlagMin`, `redFlagMax`.

#### Get Forensic Metrics

`GET /api/evidence/:id/metrics`
Retrieve forensic analysis scores (authenticity, readability).

#### Trigger Analysis

`POST /api/evidence/:id/analyze`
Trigger server-side forensic analysis.

### 🕵️‍♂️ Investigations

#### Create Investigation

`POST /api/investigations`
Create a new investigation case.

#### Add Evidence to Case

`POST /api/investigations/add-evidence`
Link an existing document to an investigation.

### 👥 Entities

#### Get Entity

`GET /api/entities/:id`
Get detailed entity profile, including stats and role.

#### Create Entity

`POST /api/entities`
Manually create a new Person/Organization.

#### Update Entity

`PATCH /api/entities/:id`
Update entity metadata.

### 🔗 Relationships

#### Get Graph

`GET /api/graph`
Get network graph data (nodes/edges).

## Architecture

- **Server**: Node.js + Express
- **Database**: Postgres 16 (Production)
- **Search**: Postgres Full Text Search (tsvector)
- **ORM**: Raw SQL via `pg` (Repository Pattern)

## Development

- **Start Server**: `npm run server`
- **Run Migrations**: `npm run migrate`
- **Backfill Mentions**: `npm run backfill`
