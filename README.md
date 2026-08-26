<p align="center">
  <img src="logo.png" alt="Epstein Archive" width="400">
</p>

<h1 align="center">Epstein Archive</h1>

<p align="center">
  <strong>A comprehensive investigative research platform</strong> for analyzing and cross-referencing documents, entities, and relationships from the Epstein Files corpus.
</p>

<p align="center">
  <a href="https://epstein.academy"><img src="https://img.shields.io/badge/🌐_LIVE_SITE-epstein.academy-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsaW5lIHgxPSIyIiB5MT0iMTIiIHgyPSIyMiIgeTI9IjEyIj48L2xpbmU+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTAgMTUuMyAxNS4zIDAgMCAxLTQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTAgMTUuMyAxNS4zIDAgMCAxIDQtMTB6Ij48L3BhdGg+PC9zdmc+" alt="Live Site"></a>
</p>

---

## Why This Exists

The Epstein Files are public record — but raw document dumps are effectively inaccessible to most people. Tens of thousands of PDFs, flight logs, emails, and court filings exist as disconnected files with no way to ask questions across them.

This platform makes the corpus usable. It processes, indexes, and links the documents so that a journalist can search for a name and immediately see every document, flight, and relationship associated with that person — with full source traceability back to the original filing.

The goal is accountability through access. Every engineering decision here serves that purpose.

---

## New Here? Start with These

- **[Getting Started](GETTING_STARTED.md)** — local setup in under 10 minutes
- **[Investigation Guide](INVESTIGATION_GUIDE.md)** — how the core workspace feature works
- **[Architecture Wiki](docs/wiki.md)** — system design and patterns
- **[Evidence Hypertext Architecture](docs/evidence-hypertext-architecture.md)** — passage-level evidence, citations, correlations, and casebooks
- **[Coding Standards](CODING_STANDARDS.md)** — rules that apply to every contributor
- **[My Onboarding Notes](docs/MY_ONBOARDING.md)** — a living doc for things that aren't obvious

---

## 🚀 Quick Start

### Prerequisites

- Node.js v20+
- PostgreSQL 16+ (or Docker)
- pnpm

### Installation

```bash
# Clone and install
git clone <repo-url>
cd epstein-archive
pnpm install

# Option A (Recommended): start Postgres with Docker, migrate, and seed a minimal dataset
pnpm local:setup

# Option B: without Postgres (degraded mode)
NODE_ENV=development pnpm dev

# Full local backend data access (DB-present)
pnpm dev
```

### Testing

```bash
# Unit Tests (Vitest)
pnpm test:unit

# One-command local stack smoke (DB + migrate + seed + API readiness + smoke endpoints)
pnpm local:smoke

# Local frontend + backend smoke (Playwright)
pnpm exec playwright test tests/local-stack-smoke.spec.ts --project=chromium --workers=1

# End-to-End Tests (Playwright)
pnpm test:e2e
```

### Production Build

```bash
# Build for production
pnpm build:prod

# Start production server
pnpm start
```

## ✨ Features

- [x] **86,000+ Entities** with relationship mapping and risk scoring
- [x] **51,000+ Documents** with full-text search and integrated PDF viewing
- [x] **500+ Verified Media Files** (Photos, Videos, Audio)
- [x] **Interactive Visualization**: Force-directed network graphs, timelines, and geospatial maps
- [x] **Forensic Tools**: Chain of custody tracking, red flag index, and hypothesis testing
- [x] **Admin Dashboard**: User management, audit logs, and system health monitoring

## 📚 Documentation

- [**Wiki & Architecture**](docs/wiki.md) - Core system architecture and logic
- [**User Guide**](docs/wiki-user-guide.md) - End-user manual
- [**API Reference**](docs/API.md) - REST API endpoints
- [**Data Governance**](docs/data-governance-standards.md) - Standards for data integrity and privacy
- [**User Journey**](docs/user-journey-mapping.md) - UX analysis
- [**Technical Reference**](docs/technical-reference.md) - Deep dive for developers

## 🛠️ Deployment

The project includes a robust deployment script `deploy.sh` that handles:

1.  **Verification**: Checks schema integrity and configuration.
2.  **Backup**: Creates remote backups of code and database.
3.  **Deployment**: Uploads, installs dependencies, and restarts services.
4.  **Health Check**: Verifies critical endpoints post-deployment.

```bash
# Deploy to production
cp .env.deploy.example .env.deploy.local
./deploy.sh --with-db
```

Production runtime secrets still live only on the server in the remote `.env`
file. Local deploy connection settings belong in `.env.deploy.local`, which is
ignored by git; `.env.deploy.example` is the tracked non-secret contract.

## 📂 Project Structure

```
epstein-archive/
├── src/
│   ├── client/             # React SPA (Vite)
│   ├── server/             # Express API + DB access
│   └── shared/             # Shared DTOs/schemas/utilities
├── scripts/                # Shell and maintenance scripts
├── docs/                   # Documentation
├── data/                   # Raw media and OCR data (gitignored)
└── public/                 # Static assets
```

## ⚖️ License

This project is for research and educational purposes only.
