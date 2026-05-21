#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="full"
if [[ "${1:-}" == "--staged" ]]; then
  MODE="staged"
elif [[ "${1:-}" == "--full" || -z "${1:-}" ]]; then
  MODE="full"
else
  echo "Usage: $0 [--full|--staged]" >&2
  exit 2
fi

log() { echo "[precheck] $*"; }
fail() { echo "[precheck] $*" >&2; exit 1; }

run() {
  log "$1"
  shift
  "$@"
}

staged_files() {
  git diff --cached --name-only --diff-filter=ACMR
}

has_staged_match() {
  local pattern="$1"
  staged_files | grep -Eq "$pattern"
}

require_clean_index_metadata() {
  if git diff --name-only --diff-filter=U | grep -q .; then
    fail "unmerged files are present; resolve conflicts before running gates"
  fi
}

verify_package_manager() {
  local declared actual expected
  declared="$(node -e "console.log(require('./package.json').packageManager || '')")"
  expected="${declared%%@*}"
  actual="$(node -e "console.log(process.env.npm_config_user_agent || '')")"

  if [[ "$expected" == "pnpm" && "$actual" != pnpm/* ]]; then
    fail "use pnpm for repo scripts; package.json declares ${declared}"
  fi
}

run_full_prechecks() {
  require_clean_index_metadata
  verify_package_manager

  run "repo hygiene" pnpm run check:hygiene
  run "client/server boundary" pnpm run check:boundaries
  run "select-star checks" pnpm run check:select-star
  run "migration seed-conflict policy" pnpm run check:seed-conflict-policy
  run "test hygiene" pnpm run check:test-hygiene
  run "deploy certification" pnpm run check:deploy-certify
  run "knip baseline" pnpm run check:knip-baseline
  run "strict design-token policy" pnpm run check:design-tokens:strict
  run "design-system audit baseline" pnpm run check:design-system-audit
  run "shared component drift" pnpm run check:shared-component-drift
}

run_staged_prechecks() {
  require_clean_index_metadata
  verify_package_manager

  run "staged repo hygiene" pnpm run check:hygiene

  if has_staged_match '^src/client/'; then
    run "client/server boundary" pnpm run check:boundaries
  else
    log "client/server boundary skipped (no staged client files)"
  fi

  if has_staged_match '^src/server/|^packages/|\.sql$|^scripts/check_select_star\.ts$|^package\.json$'; then
    run "select-star checks" pnpm run check:select-star
  else
    log "select-star checks skipped (no staged query/server files)"
  fi

  if has_staged_match '(^|/)migrations/.*\.(js|sql)$'; then
    run "migration seed-conflict policy" pnpm run check:seed-conflict-policy
  else
    log "migration seed-conflict policy skipped (no staged migrations)"
  fi

  if has_staged_match '(^src/test/|^tests/).*\.(test|spec)\.ts$'; then
    run "test hygiene" pnpm run check:test-hygiene
  else
    log "test hygiene skipped (no staged unit test files)"
  fi

  if has_staged_match '^deploy\.sh$|^ecosystem\.config\.cjs$|^scripts/deploy_certify\.ts$|^scripts/ci_pg_nuclear_gates\.sh$|^\.github/workflows/deploy-production\.yml$|^\.husky/pre-push$|^\.env\.deploy\.example$'; then
    run "deploy certification" pnpm run check:deploy-certify
  else
    log "deploy certification skipped (no staged deploy files)"
  fi

  if has_staged_match '^src/|^scripts/|^packages/|^package\.json$|^knip\.json$|^knip-baseline\.txt$'; then
    run "knip baseline" pnpm run check:knip-baseline
  else
    log "knip baseline skipped (no staged code/dependency files)"
  fi

  local design_pattern='^src/client/App\.tsx$|^src/client/components/common/(FormField|SourceBadge|Card|BaseCard|CloseButton|ProgressBar|Skeleton|Tabs|BatchToolbar|FormLayout)\.tsx$|^src/client/components/ui/Glass|^src/client/design-system/'
  if has_staged_match "$design_pattern"; then
    run "strict design-token policy" pnpm run check:design-tokens:strict
    run "design-system audit baseline" pnpm run check:design-system-audit
  else
    log "strict design-token policy skipped (no staged governed UI files)"
  fi

  if has_staged_match '^src/client/.*\.(ts|tsx|css)$|^scripts/check_shared_component_drift\.ts$'; then
    run "shared component drift" pnpm run check:shared-component-drift
  else
    log "shared component drift skipped (no staged client files)"
  fi
}

if [[ "$MODE" == "staged" ]]; then
  run_staged_prechecks
else
  run_full_prechecks
fi

log "strict pre-checks passed"
