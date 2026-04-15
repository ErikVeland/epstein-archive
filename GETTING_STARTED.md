# Getting Started with Epstein Archive

Welcome! This guide will help you get up and running with the Epstein Archive project, whether you want to explore with sample data or ingest the full dataset.

## 🚀 Scenario A: Quick Start (Sample Data)

Perfect for developers who want to contribute to the UI or explore the codebase without downloading terabytes of data.

### 1. Setup Environment

```bash
# Clone the repo
git clone <repo-url>
cd epstein-archive

# Install dependencies
pnpm install
```

### 2. Use the Sample Database

We include a lightweight `sample.db` (whitelisted in git) containing:

- ~50 Documents (Selected for high entity density)
- ~130 Entities
- ~250 Mentions

To use it, update your `.env` file (or `start.sh`) to point to the sample:

```bash
# .env.local
DB_PATH=./sample.db
```

### 3. Start the App

```bash
pnpm dev
# App will run at http://localhost:5173
```

You can regenerate the sample database anytime (requires a full `epstein-archive.db` source):

```bash
npx tsx scripts/create_sample_db.ts
```

---

## 🏗️ Scenario B: Full Ingestion (Real Data)

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

The `ingest_pipeline.ts` script handles OCR, text extraction, hashing, and entity discovery.

```bash
# Run the core pipeline (processes 'data/ingest')
npx tsx scripts/ingest_pipeline.ts

# Run the intelligence layer (entity linking & scoring)
npx tsx scripts/ingest_intelligence.ts
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
