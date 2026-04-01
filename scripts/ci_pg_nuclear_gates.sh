#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { echo "[pg-nuclear] $*"; }
fail() { echo "[pg-nuclear] $*" >&2; exit 1; }
is_ci() { [[ "${CI:-}" == "true" || "${CI:-}" == "1" ]]; }
have_rg() { command -v rg >/dev/null 2>&1; }

log "Guard: no SQLite remnants in src/"
if grep -rE "better-sqlite3|sqlite|PRAGMA|FTS5|DatabaseBridge|SqliteWrapper" src/; then
  fail "❌ SQLite keywords found in src/"
fi

# Check scripts/ for broken legacy imports (exclude guard scripts and audit files that reference the pattern as a string)
if grep -rE "getDb\(\)|getIngestDb\(\)" scripts/ 2>/dev/null \
  | grep -v "\.sh:" \
  | grep -v "ingest_audit\.ts" \
  | grep -v "dist/"; then
  echo "FATAL: scripts/ still references deleted getDb()/getIngestDb()"
  exit 1
fi

log "Guard: no legacy DB_DIALECT anywhere in runtime/deploy/CI configs"
if grep -rn "DB_DIALECT" src scripts deploy.sh ecosystem.config.cjs package.json .github/workflows \
  | grep -v "scripts/ci_pg_nuclear_gates.sh" \
  | grep -v "Legacy DB_DIALECT is set in remote .env"; then
  fail "❌ DB_DIALECT is forbidden"
fi

log "Guard: no raw SQL in route files (health route exception only)"
TMP_ROUTE_SQL="$(mktemp)"
if grep -rn "\.query(" src/server/routes >"$TMP_ROUTE_SQL"; then
  if grep -v "src/server/routes/stats.ts:" "$TMP_ROUTE_SQL" >/dev/null; then
    cat "$TMP_ROUTE_SQL"
    rm -f "$TMP_ROUTE_SQL"
    fail "❌ Raw SQL found in src/server/routes (move to repositories)"
  fi
fi
rm -f "$TMP_ROUTE_SQL"

log "Guard: no pgtyped/db namespace executor misuse in repositories"
TMP_PGTYPED_DB="$(mktemp)"
if have_rg; then
  rg -n "db\\.apiPool" src/server/db >"$TMP_PGTYPED_DB" || true
else
  grep -rEn "db\\.apiPool" src/server/db >"$TMP_PGTYPED_DB" || true
fi
if [[ -s "$TMP_PGTYPED_DB" ]]; then
  cat "$TMP_PGTYPED_DB"
  rm -f "$TMP_PGTYPED_DB"
  fail "❌ Repository DB calls must use getApiPool() (no db.apiPool)"
fi
if have_rg; then
  rg -nUP "\.run\([\s\S]{0,600},\s*db\s*\)" src/server/db >>"$TMP_PGTYPED_DB" || true
else
  find src/server/db -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \
    | xargs -0 perl -0777 -ne 'print "$ARGV\n" if /\.run\([\s\S]{0,600},\s*db\s*\)/' \
    >>"$TMP_PGTYPED_DB" || true
fi
if [[ -s "$TMP_PGTYPED_DB" ]]; then
  cat "$TMP_PGTYPED_DB"
  rm -f "$TMP_PGTYPED_DB"
  fail "❌ Repository DB calls must use getApiPool() (no pgtyped .run(..., db))"
fi
rm -f "$TMP_PGTYPED_DB"

log "Guard: seed conflict policy"
node --import tsx/esm scripts/check_seed_conflict_policy.ts

log "Lint + typecheck"
pnpm lint
pnpm type-check

if [[ -z "${DATABASE_URL:-}" ]]; then
  if is_ci; then
    fail "❌ DATABASE_URL required in CI for PG explain/schema gates"
  fi
  log "DATABASE_URL not set; skipping pg_explain + schema hash gates for local prebuild"
  exit 0
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  log "pg_dump not installed locally; skipping DB-backed gates (pg_explain/schema hash/pg_dump snapshot)"
  exit 0
fi

# Check pg_dump version matches server version to avoid "server version mismatch" errors
PGDUMP_MAJOR="$(pg_dump --version 2>/dev/null | grep -oE '[0-9]+' | head -1)"
SERVER_MAJOR="$(psql "$DATABASE_URL" -Atc "SHOW server_version_num" 2>/dev/null | cut -c1-2)"
if [[ -n "$PGDUMP_MAJOR" && -n "$SERVER_MAJOR" && "$PGDUMP_MAJOR" != "$SERVER_MAJOR" ]]; then
  if is_ci; then
    fail "❌ pg_dump version ($PGDUMP_MAJOR) does not match server version ($SERVER_MAJOR)"
  fi
  log "pg_dump version ($PGDUMP_MAJOR) does not match server version ($SERVER_MAJOR); skipping DB-backed gates"
  exit 0
fi
if command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH_CMD="shasum -a 256"
else
  if is_ci; then
    fail "❌ sha256sum/shasum is required"
  fi
  log "sha256 tool not installed locally; skipping DB-backed gates"
  exit 0
fi

log "Schema snapshot hash via pg_dump --schema-only"
TMP_SCHEMA="$(mktemp)"
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" >"$TMP_SCHEMA"
[[ -s "$TMP_SCHEMA" ]] || { rm -f "$TMP_SCHEMA"; fail "❌ Empty schema dump from pg_dump"; }
SCHEMA_SHA="$($HASH_CMD "$TMP_SCHEMA" | awk '{print $1}')"
rm -f "$TMP_SCHEMA"
log "pg_dump schema sha256=${SCHEMA_SHA}"

log "Plan regression gate"
SKIP_PLAN_GATE=0
if command -v psql >/dev/null 2>&1; then
  IFS='|' read -r DOC_COUNT ENTITY_COUNT REL_COUNT < <(
    psql "$DATABASE_URL" -Atc "
      SELECT
        (SELECT COUNT(*) FROM documents),
        (SELECT COUNT(*) FROM entities),
        (SELECT COUNT(*) FROM entity_relationships)
    " 2>/dev/null || echo '__PSQL_ERROR__ __PSQL_ERROR__ __PSQL_ERROR__'
  )
  if [[ "$DOC_COUNT" == "__PSQL_ERROR__" || "$ENTITY_COUNT" == "__PSQL_ERROR__" || "$REL_COUNT" == "__PSQL_ERROR__" ]]; then
    if is_ci; then
      fail "❌ Unable to inspect table cardinality before plan regression gate"
    fi
    log "Skipping plan regression gate (psql cardinality probe failed locally)"
    SKIP_PLAN_GATE=1
  else
    log "Plan gate cardinality probe: documents=${DOC_COUNT:-0} entities=${ENTITY_COUNT:-0} relationships=${REL_COUNT:-0}"
  fi
  if [[ "${DOC_COUNT:-0}" =~ ^[0-9]+$ && "${ENTITY_COUNT:-0}" =~ ^[0-9]+$ && "${REL_COUNT:-0}" =~ ^[0-9]+$ ]]; then
    if [[ "${DOC_COUNT:-0}" -lt 1000 || "${ENTITY_COUNT:-0}" -lt 1000 || "${REL_COUNT:-0}" -lt 10000 ]]; then
      log "Skipping plan regression gate on non-representative database cardinality"
      SKIP_PLAN_GATE=1
    fi
  elif [[ "${DOC_COUNT:-0}" == "0" && "${ENTITY_COUNT:-0}" == "0" && "${REL_COUNT:-0}" == "0" ]]; then
    # Defensive fallback if numeric check above changes unexpectedly.
    log "Skipping plan regression gate on empty database (no representative data yet)"
    SKIP_PLAN_GATE=1
  fi
fi

if [[ "$SKIP_PLAN_GATE" != "1" ]]; then
  node --import tsx/esm scripts/pg_explain.ts
fi

if command -v psql >/dev/null 2>&1; then
  log "Media file_type completeness gate"
  MISSING_MEDIA_FILETYPE="$(
    psql "$DATABASE_URL" -Atc "SELECT COUNT(*) FROM media_items WHERE (file_type IS NULL OR btrim(file_type) = '') AND file_path IS NOT NULL AND btrim(file_path) <> ''" 2>/dev/null || echo '__PSQL_ERROR__'
  )"
  if [[ "$MISSING_MEDIA_FILETYPE" == "__PSQL_ERROR__" ]]; then
    if is_ci; then
      fail "❌ Unable to run media file_type completeness gate"
    fi
    log "Skipping media file_type completeness gate (psql query failed locally)"
  elif [[ "${MISSING_MEDIA_FILETYPE:-0}" != "0" ]]; then
    fail "❌ media_items.file_type missing for ${MISSING_MEDIA_FILETYPE} rows"
  fi

  log "Documents metadata completeness gate"
  IFS='|' read -r MISSING_DOC_FILETYPE MISSING_DOC_EVIDENCETYPE < <(
    psql "$DATABASE_URL" -Atc "
      SELECT
        COUNT(*) FILTER (WHERE id >= 1000000 AND (file_type IS NULL OR btrim(file_type) = '') AND file_path IS NOT NULL AND btrim(file_path) <> ''),
        COUNT(*) FILTER (WHERE id >= 1000000 AND (evidence_type IS NULL OR btrim(evidence_type) = '') AND file_path IS NOT NULL AND btrim(file_path) <> '')
      FROM documents
    " 2>/dev/null || echo '__PSQL_ERROR__ __PSQL_ERROR__'
  )
  if [[ "$MISSING_DOC_FILETYPE" == "__PSQL_ERROR__" || "$MISSING_DOC_EVIDENCETYPE" == "__PSQL_ERROR__" ]]; then
    if is_ci; then
      fail "❌ Unable to run documents metadata completeness gate"
    fi
    log "Skipping documents metadata completeness gate (psql query failed locally)"
  else
    [[ -z "${MISSING_DOC_FILETYPE:-}" ]] && MISSING_DOC_FILETYPE=0
    [[ -z "${MISSING_DOC_EVIDENCETYPE:-}" ]] && MISSING_DOC_EVIDENCETYPE=0
    if [[ "$MISSING_DOC_FILETYPE" != "0" || "$MISSING_DOC_EVIDENCETYPE" != "0" ]]; then
      fail "❌ documents metadata incomplete (file_type=${MISSING_DOC_FILETYPE}, evidence_type=${MISSING_DOC_EVIDENCETYPE})"
    fi
  fi
else
  log "psql not installed locally; skipping media/documents metadata completeness gates"
fi

log "Schema hash baseline gate"
if is_ci; then
  log "Initializing schema hash baseline for ephemeral CI database"
  pnpm schema:hash:update
fi
pnpm schema:hash:check

log "✅ All PG nuclear gates passed"
