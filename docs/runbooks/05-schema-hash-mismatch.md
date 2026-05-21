# Runbook: Schema Hash Mismatch

**Severity:** P1
**Detection:** `pnpm schema:hash:check` fails in CI/deploy, or `SCHEMA_HASH_MISMATCH` alert

## Immediate Triage

1. **Determine what changed**

   ```bash
   # Current schema hash
   pnpm schema:hash:check
   # Stored baseline
   cat config/schema-hash.txt
   ```

2. **Identify unexpected schema drift**

   ```sql
   -- Compare schema against expected baseline
   SELECT schemaname, tablename, tableowner, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables
   WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
   ```

3. **Block deploy until resolved**
   - The prebuild gate will fail closed — this is by design
   - Do NOT force-skip the hash check unless the change is intentional

## Intended Schema Change

If the schema change was intentional:

1. **Update the hash baseline**

   ```bash
   pnpm schema:hash:update
   ```

2. **Commit the updated hash**

   ```bash
   git add config/schema-hash.txt
   git commit -m "chore: update schema hash for <migration description>"
   ```

3. **Verify migration is in version control**
   ```bash
   ls src/server/db/migrations/ | tail -5
   ```

## Unintended Schema Drift

If the drift is unexpected:

1. **Find the migration that caused it**

   ```bash
   git diff HEAD~5 -- src/server/db/migrations/
   ```

2. **Rollback the migration**

   ```sql
   -- Check the rollback notes in the migration file
   -- Example:
   DROP TABLE IF EXISTS accidentally_created_table;
   ```

3. **Recheck hash**
   ```bash
   pnpm schema:hash:check
   ```

## Emergency Deploy Bypass

If you need to deploy urgently and the hash mismatch is understood:

1. Set `SKIP_SCHEMA_HASH_CHECK=1` in the deploy environment
2. Deploy
3. Fix the schema mismatch immediately after

This bypass is tracked in deploy audit logs.

## Post-Mortem

- Ensure every migration has rollback notes
- Add migration review checklist item: "schema hash update not forgotten"
- Consider making schema changes in a separate deploy from app changes
