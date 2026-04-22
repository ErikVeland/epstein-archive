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

## 🚀 Quick Start

### Prerequisites

- Node.js v20+
- PostgreSQL 15+
- pnpm

### Installation

```bash
# Clone and install
git clone <repo-url>
cd epstein-archive
pnpm install

# Local development can boot without Postgres and will run in a degraded mode
# so the frontend shell and API process still start for local UI work.
NODE_ENV=development pnpm dev

# For full local backend data access, ensure PostgreSQL is running and DATABASE_URL is set
pnpm db:migrate:pg

# Start development server
pnpm dev
```

### Testing

```bash
# Unit Tests (Vitest)
pnpm test:unit

# Local frontend + backend smoke
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
./deploy.sh
```

## 📂 Project Structure

```
epstein-archive/
├── src/
│   ├── components/         # React UI components
│   ├── pages/              # Application pages (AdminDashboard, etc.)
│   ├── services/           # Frontend API services
│   ├── server/             # Express backend & API routes
│   └── scripts/            # Type-safe utility scripts
├── scripts/                # Shell and maintenance scripts
├── docs/                   # Documentation
├── data/                   # Raw media and OCR data (gitignored)
└── public/                 # Static assets
```

## ⚖️ License

This project is for research and educational purposes only.
