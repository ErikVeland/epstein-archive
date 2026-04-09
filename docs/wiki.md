# Architecture Wiki - Epstein Archive

## Overview

The Epstein Archive platform serves as an investigative hub for digesting and analyzing large-scale document dumps (primarily DOJ files, court records, and flight logs). It integrates a robust ingestion pipeline, a React-based frontend using the "Liquid Glass" design system, and an SQLite-based data layer.

## System Architecture

### 1. Data Ingestion Pipeline

The `scripts/` directory houses the core ETL (Extract, Transform, Load) logic.

- **Ingestion (`scripts/ingest.ts`)**: Automates the parsing of raw PDFs, CSV flight logs, and JSON dumps into normalized SQLite rows.
- **Enrichment**: Pipeline steps to extract latent entities, assign investigation confidence scores, and flag VIPs (e.g. subject #405628, Vladislav Doronin).

### 2. Client Application

- **Framework**: React / Vite (SSR/SSG pending).
- **Design System**: Liquid Glass (`src/client/design-system/`). We have officially retired Tailwind CSS; all new features must strictly employ CSS Modules and governed UI primitives.
- **Component Architecture**:
  - **Investigation Workspace**: The command center for connecting evidence strings and hypothesis testing.
  - **Evidence Boards**: Visual representation mapping entities and communications.

### 3. Database Schema (SQLite)

- `investigations`: The core model linking evidence and hypotheses.
- `entities`: Extracted actors/subjects. Supports alias mappings (e.g., `dvycit`, `DV`).
- `documents`: Processed DOJ/court records.
- `communications`: Logs extracted from raw sources (thread ID, participants, date).

## Data Density Strategy

We utilize localized subsets (sample databases) for development environments (refer to KI: Epstein Archive Sample Database Generation Strategy) to reduce overhead, mapping full large-scale SQLite files on production (Linode Block Storage).
