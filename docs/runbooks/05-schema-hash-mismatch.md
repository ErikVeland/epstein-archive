# Runbook: database connection or schema hash failure

Use PostgreSQL 16 for local verification and CI. The recorded schema hash comes from that supported version.

## Check the connection

1. Check the host, port, and database in `DATABASE_URL` without sharing its credentials.
2. Confirm that the configured PostgreSQL instance is running.
3. Check its server version.

   ```bash
   psql "$DATABASE_URL" -Atc 'SHOW server_version;'
   ```

4. If the connection fails, correct the service or connection settings before changing the schema.

A different local database can have an older schema. Do not change the hash to match an unrelated instance.
For Homebrew installations, check `brew services list`. Restart a stale PostgreSQL 16 service with `brew services restart postgresql@16`.
Ensure its configured port matches `DATABASE_URL`, especially when PostgreSQL 15 also runs locally.

## Apply committed migrations

1. Back up an existing database before applying migrations.
2. Run the committed migrations against the intended local database.

   ```bash
   pnpm db:migrate:pg
   ```

3. Verify the schema hash.

   ```bash
   pnpm schema:hash:check
   ```

4. If the hash differs, compare the migration ledger and schema with a fresh PostgreSQL 16 database.

   ```bash
   psql "$DATABASE_URL" -c 'SELECT name, run_on FROM pgmigrations ORDER BY id;'
   ```

Migration files are in `src/server/db/postgres/migrations/`. The expected hash is in `docs/schema.hash`.
The hash covers columns, indexes, and materialised views. PostgreSQL major versions can produce different definitions for the same migration history.

## Record an intended schema change

1. Add or review the migration that defines the change.
2. Apply it to the intended local verification database.
3. Update the hash.

   ```bash
   pnpm schema:hash:update
   ```

4. Verify the hash and full quality gate.
5. Commit the migration and `docs/schema.hash` together.

Do not update the hash merely to make an unexpected mismatch pass.
For unintended drift, preserve a backup and repair the schema through a reviewed migration.

## Verify the full gate

Export the intended `DATABASE_URL` in the current shell, then run:

```bash
CI=true CI_STRICT_DB_GATES=1 CI_STRICT_E2E=1 bash scripts/quality_gate.sh
```

The gate requires a reachable database, the expected schema, and installed browser dependencies.
Keep schema checks enabled. CI, production, and deployment certification forbid the schema-check bypass.
