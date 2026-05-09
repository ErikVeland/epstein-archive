# CI Guardrails

Automated checks to prevent future schema/code drift. Each guardrail addresses a specific category of drift found in this audit. These are designed to fail fast in CI, not block development.

---

## G1 — Schema Hash Check (Already Implemented — Strengthen)

**Current state:** `pnpm schema:hash:check` exists. Run manually; not enforced in prebuild.

**Improvement:** Add to `prebuild:prod` gate so production builds fail if schema is out of sync with code expectations.

```json
// package.json — add to prebuild:prod
"prebuild:prod": "pnpm schema:hash:check && pnpm type-check && pnpm lint && ..."
```

**What this catches:** Any schema change that wasn't paired with a code update. When the hash drifts, the build fails before deployment.

**Implementation notes:**

- `pnpm schema:hash:update` must be run after any intentional schema change and committed in the same PR as the migration
- The hash file should be committed to git — it is the contract between DB state and code state

---

## G2 — Import Boundary Check (Fix Environment Issue)

**Current state:** `pnpm check:boundaries` exists but silently passes in some shell environments because `rg` is not in `/bin/sh` PATH. This means the boundary check is a false pass in CI.

**Fix:** Update the boundary check script to use `grep -r` as a fallback, or add `rg` to the CI environment explicitly.

```bash
# scripts/check-boundaries.sh — add fallback
if command -v rg &> /dev/null; then
  rg --type ts "$@"
else
  grep -r --include="*.ts" "$@"
fi
```

**What this catches:** `src/client` files importing from `src/server` (cross-boundary leaks that can expose server secrets to browser bundles).

---

## G3 — Dead Import Detection

**Current state:** No automated check. The 6 dead mapper files and 5 dead repository files were found only by manual `grep` analysis.

**Add this script:** `scripts/ci/check-dead-exports.ts`

```typescript
// Run: pnpm check:dead-exports
// Fails if any file in the dead-list is imported anywhere
const CONFIRMED_DEAD_FILES = [
  'src/server/mappers/analyticsDtoMapper.ts',
  'src/server/mappers/flightsDtoMapper.ts',
  'src/server/mappers/graphDtoMapper.ts',
  'src/server/mappers/mediaDtoMapper.ts',
  'src/server/mappers/propertiesDtoMapper.ts',
  'src/server/mappers/relationshipsDtoMapper.ts',
];

// For each file in CONFIRMED_DEAD_FILES, grep for imports.
// If any import is found, print the importing file and fail.
// If no imports are found, the file should be deleted — fail and prompt deletion.
```

**Simpler approach (no script):** Add the dead files to an `.eslintrc` rule that flags them as "should not exist" using a custom lint rule or the `no-restricted-imports` rule for each dead path.

---

## G4 — Migration Dry-Run in CI

**Current state:** Migrations run manually via `pnpm db:migrate:pg`. No CI check verifies that pending migrations apply cleanly.

**Add this check:** Before running integration tests in CI, apply any pending migrations to the test database and verify the exit code.

```bash
# In CI test pipeline (after test DB setup):
NODE_ENV=test pnpm db:migrate:pg
if [ $? -ne 0 ]; then
  echo "Migration dry-run failed — migration is broken"
  exit 1
fi
```

**What this catches:** Migrations that have syntax errors, reference non-existent tables/columns, or conflict with current schema — caught before they reach production.

---

## G5 — DTO Contract Tests (Already Implemented — Expand Coverage)

**Current state:** `pnpm test:contracts` exists. Contract tests cover some routes but coverage gaps exist (see `raw-frontend-contracts.md`).

**Gaps to fill:**

| Route                 | Current status   | Action                                                         |
| --------------------- | ---------------- | -------------------------------------------------------------- |
| `GET /api/flights`    | Not in contracts | Add contract test                                              |
| `GET /api/properties` | Not in contracts | Add contract test                                              |
| `GET /api/black-book` | Not in contracts | Add contract test                                              |
| `GET /api/timeline`   | Not in contracts | Add contract test                                              |
| `GET /api/stats`      | Partial          | Fix `pipeline_status` snake_case vs `pipelineStatus` camelCase |

**Template for adding a contract test:**

```typescript
// tests/api-dto-contract.spec.ts — add to existing test file
test('GET /api/flights returns expected shape', async ({ request }) => {
  const res = await request.get('/api/flights?limit=1');
  expect(res.status()).toBe(200);
  const data = await res.json();
  // Validate against FlightItemDto — once DTO camelCase is fixed
  expect(data).toMatchSchema(FlightItemDtoSchema);
});
```

**What this catches:** API responses that silently change shape (column drops, renames, type changes) — before frontend consumers break.

---

## G6 — TypeScript Strict Mode for Shared DTOs

**Current state:** TS strict mode is inconsistently applied. DTOs in `src/shared/dto/` use camelCase types but several API routes return snake_case, causing implicit `any` casts in consuming code.

**Add:** Enforce `strict: true` in `tsconfig.json` for `src/shared/` specifically, and run `pnpm type-check` in `prebuild:prod` (it already runs but ensure it covers shared).

**What this catches:** Type holes where a DTO says `entityType: string` but the API returns `entity_type: string` — the mismatch becomes a compile error instead of a runtime surprise.

---

## G7 — Row Count Regression Check

**Current state:** None. The 0-row dead tables were only discovered by manual audit.

**Add this script:** `scripts/ci/check-dead-tables.ts`

```typescript
// Fails if any known-dead table accumulates rows unexpectedly
// Run manually or in nightly CI
const SHOULD_BE_EMPTY = ['mentions', 'media_assets', 'evidence_entity', 'resolution_candidates'];

for (const table of SHOULD_BE_EMPTY) {
  const { rows } = await pool.query(`SELECT count(*) FROM ${table}`);
  if (parseInt(rows[0].count) > 0) {
    console.error(`ALERT: Dead table '${table}' now has ${rows[0].count} rows`);
    process.exit(1);
  }
}
```

**Run frequency:** Nightly cron or post-deploy smoke check (not in hot path).

**What this catches:** Ingest pipeline silently writing to a table that was supposed to be dead — before the table is dropped, this confirms it's still safe to drop.

---

## G8 — Duplicate Index Detection

**Current state:** None. The 10 duplicate indexes were found only by manual schema inspection.

**Add this query to the verify script** (`pnpm verify`):

```sql
-- Add to scripts/verify.ts
SELECT
  t.relname AS table_name,
  array_agg(i.relname ORDER BY i.relname) AS duplicate_indexes,
  ix.indkey
FROM pg_index ix
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE t.relkind = 'r'
GROUP BY t.relname, ix.indkey, ix.indpred
HAVING count(*) > 1
ORDER BY t.relname;
```

If this query returns rows, fail with "Duplicate indexes found — run schema cleanup."

**What this catches:** Future agent-generated migrations that accidentally add a second index on a column that already has one.

---

## G9 — Pre-Commit Hook: No Direct DB References in Client

**Current state:** The `check:boundaries` script catches `@server` imports, but not direct `pg` imports or raw SQL strings appearing in client code.

**Add to `.husky/pre-commit`** (if husky is in use) or as a lint rule:

```bash
# Check that no client file imports 'pg' or 'node-postgres' directly
grep -r "from 'pg'" src/client/ && echo "ERROR: Client code imports pg directly" && exit 1
grep -r "require('pg')" src/client/ && echo "ERROR: Client code requires pg directly" && exit 1
```

---

## G10 — Migration Naming Convention Enforcement

**Current state:** Migration files use the timestamp format `<ms_timestamp>_<name>.js` but naming has been inconsistent (some use action verbs, some describe the result state). 34% of migration file names are drift signals.

**Add a lint check** on migration file names in `scripts/ci/check-migration-names.ts`:

```typescript
// Migration names must: start with a number, contain only lowercase + underscores
// and use an action verb prefix: add_, create_, drop_, rename_, fix_, alter_
const VALID_PREFIX = /^\d+_(add|create|drop|rename|fix|alter|update|backfill|remove)_/;

const migrations = fs.readdirSync('src/server/db/postgres/migrations/');
for (const file of migrations) {
  if (!VALID_PREFIX.test(file)) {
    console.error(`Migration '${file}' does not follow naming convention`);
    process.exit(1);
  }
}
```

---

## Summary: Guardrail Priority Matrix

| Guardrail                          | Effort | Value  | When to add               |
| ---------------------------------- | ------ | ------ | ------------------------- |
| G1 — Schema hash in prebuild       | Low    | High   | Now                       |
| G2 — Fix rg PATH in boundary check | Low    | High   | Now                       |
| G5 — Expand contract test coverage | Medium | High   | Before Stage 3 migrations |
| G4 — Migration dry-run in CI       | Medium | High   | Before Stage 3 migrations |
| G6 — TS strict mode for shared     | Medium | Medium | Now                       |
| G7 — Dead table row count check    | Low    | Medium | Before Stage 1 drops      |
| G8 — Duplicate index detection     | Low    | Medium | Now (add to verify)       |
| G3 — Dead export detection         | Medium | Medium | After Stage 0 cleanup     |
| G9 — No pg in client pre-commit    | Low    | Low    | Now                       |
| G10 — Migration naming lint        | Low    | Low    | Ongoing                   |
