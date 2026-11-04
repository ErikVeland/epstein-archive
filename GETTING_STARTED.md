# Getting started

## Install

Use Node.js 20.19 or later, pnpm, and PostgreSQL 16 or Docker.

1. Install dependencies.

   ```bash
   pnpm install --frozen-lockfile
   ```

2. Copy the environment template.

   ```bash
   cp .env.example .env
   ```

3. Set `DATABASE_URL` in `.env`. For the Docker database, use:

   ```dotenv
   DATABASE_URL=postgresql://epstein:epstein@localhost:5432/epstein_archive
   ```

4. Start the Docker database, run migrations, and create the minimal seed.

   ```bash
   pnpm local:setup
   ```

   For an existing database, run `pnpm db:migrate:pg` and `pnpm seed:minimal` instead.

5. Start the API.

   ```bash
   pnpm server
   ```

6. In a second terminal, start the frontend.

   ```bash
   pnpm dev
   ```

7. Open <http://localhost:3002>.

The API listens on port 3012. `pnpm dev` starts only the frontend.
Without `DATABASE_URL`, the API can run in degraded development mode. Data views remain unavailable until a database is configured.

## Verify the local stack

```bash
pnpm test:unit
pnpm local:smoke
pnpm exec playwright test tests/local-stack-smoke.spec.ts --project=chromium --workers=1
```

Unit tests run without the full corpus. Integration and browser tests require their database, service, or fixture dependencies.

## Add evidence

Evidence is managed outside Git. The `data/` directory stores source files, OCR text, extracted media, and optional face models.
Existing local files remain available after repository cleanup. A fresh clone contains application code, not the corpus.

1. Create the data directories.

   ```bash
   pnpm seed:structure
   ```

2. Place source files under `data/ingest/`.

3. Run ingestion.

   ```bash
   pnpm pipeline:ingest
   ```

4. Run enrichment when the required providers are configured.

   ```bash
   pnpm ingest:intelligence
   ```

For optional face recognition, download the models with `pnpm exec tsx scripts/download_face_models.ts`.
See [Pipeline operations](scripts/README.md) for stage controls and [Pipeline architecture](docs/native-corpus-pipeline.md) for storage and provenance rules.

## Keep the repository clean

```bash
pnpm check:hygiene
pnpm check:unused
pnpm hygiene:clean
```

The hygiene check rejects tracked evidence and agent session output. The cleanup command removes session output while preserving dependencies, configuration, evidence, and worktrees.

Builds, logs, test reports, local environment files, and generated data are ignored. `public/data/dashboard_snapshot.json` is retained because the client uses it as a fallback.

Run `pnpm precheck` before submitting changes. Use `/tmp` for temporary investigation scripts and reports.

## Troubleshoot

- If the frontend cannot reach the API, confirm that `pnpm server` is running on port 3012.
- If images are missing, check the source files and generated thumbnails under `data/`.
- If native dependencies fail after a machine change, reinstall dependencies with pnpm.
- If a production build fails a schema check, follow the [schema runbook](docs/runbooks/05-schema-hash-mismatch.md).
