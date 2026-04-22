# Getting Started with Epstein Archive

Welcome! This guide will help you get up and running with the Epstein Archive project for local development and ingestion.

## 🚀 Quick Start (UI + API)

Perfect for developers who want to contribute to the UI, run the API locally, and iterate quickly. The app can run without any ingested corpus data (it will show empty states until you ingest).

### 1. Setup

```bash
# Clone the repo
git clone <repo-url>
cd epstein-archive

# Install dependencies
pnpm install
```

### 2. Configure Environment

```bash
# .env.local
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/epstein_archive
```

If you are only working on frontend shell behavior or wiring, you can omit `DATABASE_URL`.
The API will start in degraded development mode so the local UI and health endpoints still boot.

### 3. Migrate + Start

```bash
pnpm db:migrate:pg
pnpm dev
# App will run at http://localhost:5173
```

For a quick local stack smoke test that boots both services together:

```bash
pnpm exec playwright test tests/local-stack-smoke.spec.ts --project=chromium --workers=1
```

---

## 🏗️ Ingestion (Real Data)

For researchers or server admins setting up a full instance.

### Prerequisites

- **Storage:** 300GB+ SSD (recommended for full corpus + DB)
- **RAM:** 8GB+ (16GB recommended)
- **CPU:** 4+ Cores (for OCR/Tesseract)

### 1. Data Structure

The ingestion scripts expect raw data to be organized in the `data/` directory.

```
data/
  ingest/           # Drop new PDF/Email folders here
    DOJ_VOL_1/
    DOJ_VOL_2/
  media/            # Extracted/Processed media
  thumbnails/       # Generated thumbnails
```

### 2. Run the Pipeline

The pipeline handles OCR, text extraction, hashing, and entity discovery.

```bash
# Run the core pipeline (processes 'data/ingest')
pnpm pipeline:ingest

# Run the intelligence layer (entity linking & scoring)
pnpm ingest:intelligence
```

**Note:** This process can take **days** for the full multi-terabyte corpus.

- Logs are written to `ingestion_log.txt` (if piped) or stdout.
- The pipeline is idempotent; restarting it continues where it left off.

### 3. Monitor Progress

You can check progress via the terminal or by querying the database:

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM documents;"
```

---

## 🛠️ Common Tasks

### Database Management

- **Backup:** `pg_dump "$DATABASE_URL" > epstein-archive.pg.sql`
- **Reset:** drop/recreate schema and re-run migrations (`pnpm db:migrate:pg`)

### Troubleshooting

- **Missing Images?** Ensure `data/thumbnails` is populated and permissions are correct.
- **Node Errors?** Make sure you're using Node v20.19+ (`node -v`).
