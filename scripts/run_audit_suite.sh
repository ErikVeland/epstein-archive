#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f ".env.audit" ]; then
  echo "[FATAL] Missing .env.audit in repo root."
  echo "Create it from the template and set DATABASE_URL + API_BASE_URL."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source ./.env.audit
set +a

if [ -z "${DATABASE_URL:-}" ] || [ -z "${API_BASE_URL:-}" ]; then
  echo "[FATAL] .env.audit must define DATABASE_URL and API_BASE_URL"
  exit 1
fi

redact_url() {
  local url="$1"
  if [[ "$url" =~ ^([^:]+://[^:/?#]+):([^@]+)@(.+)$ ]]; then
    printf '%s:***@%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[3]}"
  else
    printf '%s\n' "$url"
  fi
}

declare -a STEPS=()
declare -a STATUSES=()
OVERALL=0

run_step() {
  local label="$1"
  shift
  STEPS+=("$label")
  echo
  echo "==> $label"
  if "$@"; then
    STATUSES+=("PASS")
  else
    STATUSES+=("FAIL")
    OVERALL=1
  fi
}

export DATABASE_URL API_BASE_URL

echo "Audit suite environment"
echo "  DATABASE_URL=$(redact_url "$DATABASE_URL")"
echo "  API_BASE_URL=$API_BASE_URL"

run_step "Type Check" pnpm type-check
run_step "Lint" pnpm lint
run_step "PG System Audit" node --import tsx/esm scripts/pg_system_audit.ts
run_step "PG Explain Plan Gate" node --import tsx/esm scripts/pg_explain.ts
run_step "Ingest Audit" node --import tsx/esm scripts/ingest_audit.ts
run_step "Stress Check" node --import tsx/esm scripts/stress_check.ts

echo
echo "--------------------------------------"
echo "POSTGRES HARDENING CERTIFICATION"
echo "--------------------------------------"
for i in "${!STEPS[@]}"; do
  printf '%-24s %s\n' "${STEPS[$i]}:" "${STATUSES[$i]}"
done
echo "Overall readiness: $([ "$OVERALL" -eq 0 ] && echo CERTIFIED || echo BLOCKED)"

exit "$OVERALL"
