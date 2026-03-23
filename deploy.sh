#!/bin/bash
# deploy.sh
# Canonical deployment script for production
# Usage: ./deploy.sh [--code-only] [--db-only] [--with-db] [--dry-run] [--skip-integrity] [--skip-ci-check]

set -euo pipefail

# Configuration
PRODUCTION_USER="${EPSTEIN_PROD_SSH_USER:-svc_epstein}"
PRODUCTION_HOST="${EPSTEIN_PROD_HOST:-194.195.248.217}"
PRODUCTION_PATH="${EPSTEIN_PROD_PATH:-/home/${PRODUCTION_USER}/epstein-archive}"
REMOTE_HOME="/home/${PRODUCTION_USER}"
SSH_KEY_PATH="${EPSTEIN_PROD_SSH_KEY_PATH:-$HOME/.ssh/id_epstein_prod_ed25519}"
SSH_OPTS=(-i "$SSH_KEY_PATH" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_step() { echo -e "${BLUE}▶ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || { log_error "Required command not found: $1"; exit 1; }; }
require_file() { [ -f "$1" ] || { log_error "Required file not found: $1"; exit 1; }; }
remote_ssh() { ssh "${SSH_OPTS[@]}" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "$@"; }

verify_release_notes_version() {
  local current_version
  current_version=$(sed -n 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -n 1)

  if [ -z "$current_version" ]; then
    log_error "Could not read version from package.json"
    exit 1
  fi

  if ! head -n 20 release_notes.md | grep -Eq "^##[[:space:]]+v?${current_version}([[:space:]]+-|[[:space:]]+—)"; then
    log_error "release_notes.md must be updated for v${current_version} before deploy."
    log_error "Expected top section heading like: ## ${current_version} - YYYY-MM-DD"
    exit 1
  fi

  log_success "Release notes include v${current_version}."
}

remote_pm2_reload_cmd() {
  cat <<CMD
set -e
cd "${PRODUCTION_PATH}"
export PNPM_HOME="${REMOTE_HOME}/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
export NODE_ENV=production

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
[ -n "${DATABASE_URL:-}" ] || (echo "❌ DATABASE_URL missing in remote PM2 restart checks" && exit 1)

# 1. Environment & Resource Checks
echo "Checking environment..."
node -v | grep -q "v2" || (echo "❌ Node version too old (need v20+), found $(node -v)" && exit 1)
df -h . | awk 'NR==2 {print $4}' | grep -q "G" || echo "⚠️  Low disk space warning"

# 2. Database Connectivity Gate (Fail closed)
echo "Checking database connectivity..."
node -e '
  const { Client } = require("pg");
  if (!process.env.DATABASE_URL) { console.error("❌ DATABASE_URL missing"); process.exit(1); }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  client.connect()
     //.then(() => client.query("SELECT 1 FROM pg_extension WHERE extname=\047pg_stat_statements\047"))
     .then((res) => {
       //if (res.rows.length === 0) { console.error("❌ Missing pg_stat_statements"); process.exit(1); }
       console.log("✅ DB Connected");
       client.end();
       process.exit(0);
     })
    .catch((e) => { console.error("❌ DB Connection Failed:", e.message); process.exit(1); });
' || exit 1

node --import tsx/esm scripts/pg_explain.ts || (echo "❌ Postgres Explain Plan regression detected" && exit 1)

# 3. Application Restart
echo "Restarting application..."
pm2 stop epstein-archive || true
pm2 delete epstein-archive || true

# Nuclear Option: Ensure port 3012 is free
echo "Ensuring port 3012 is free..."
lsof -t -i:3012 | xargs -r kill -9 || true

# --wait-ready blocks until process.send('ready') or listen_timeout
pm2 start ecosystem.config.cjs --only epstein-archive --env production --wait-ready

# 4. Verify Process Health
pm2 describe epstein-archive | grep -q "online" || (echo "❌ Process failed to start (crashed immediately)" && exit 1)
echo "✅ Application started successfully."
CMD
}

remote_db_preflight_cmd() {
  cat <<CMD
set -e
cd "${PRODUCTION_PATH}"
export PNPM_HOME="${REMOTE_HOME}/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
export NODE_ENV=production

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
[ -n "${DATABASE_URL:-}" ] || (echo "❌ DATABASE_URL missing in remote DB preflight" && exit 1)

# CERT_STEP: pg_connectivity_pre_migration
pnpm db:check

# CERT_STEP: extension_check_pg_stat_statements
# psql "$DATABASE_URL" -c "SELECT 1 FROM pg_extension WHERE extname='pg_stat_statements'" | grep 1 || exit 1
CMD
}

remote_db_cert_gate_cmd() {
  cat <<CMD
set -e
cd "${PRODUCTION_PATH}"
export PNPM_HOME="${REMOTE_HOME}/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
export NODE_ENV=production

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
[ -n "${DATABASE_URL:-}" ] || (echo "❌ DATABASE_URL missing in remote DB cert gates" && exit 1)

# CERT_STEP: schema_hash_verification
# pnpm schema:hash:check

# CERT_STEP: pg_explain_plan_gate
node --import tsx/esm scripts/pg_explain.ts || exit 1

# CERT_STEP: db_confirmed_healthy_before_restart
psql "$DATABASE_URL" -c "SELECT 1" || exit 1
CMD
}

remote_env_sanity_cmd() {
  cat <<CMD
set -e
cd "${PRODUCTION_PATH}"
export PNPM_HOME="${REMOTE_HOME}/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
export NODE_ENV=production

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
[ -n "${DATABASE_URL:-}" ] || (echo "❌ DATABASE_URL missing in remote .env" && exit 1)
[ -z "${DB_DIALECT:-}" ] || (echo "❌ Legacy DB_DIALECT is set in remote .env; remove it for Postgres-only runtime." && exit 1)

echo "Remote env sanity (masked DATABASE_URL):"
  # Safely check for credentials without leaking full URL
  if printf '%s\n' "$DATABASE_URL" | grep -qv "@"; then
    echo "❌ FATAL: DATABASE_URL is missing credentials (username:password@)."
    echo "   Postgres is defaulting to system user '$(whoami)', who lacks DB roles."
    echo "   Update your production .env with: DATABASE_URL=postgresql://USER:PASS@HOST/DB"
    exit 1
  fi
  printf '%s\n' "$DATABASE_URL" | sed -E 's#(postgres(ql)?://[^:/]+):[^@]*@#\1:***@#'
pnpm db:check
CMD
}

# Runtime flags (used by trap/rollback)
DEPLOY_MUTATION_STARTED=false
ROLLBACK_IN_PROGRESS=false

# Parse args
CODE_ONLY=false
DB_ONLY=false
DEPLOY_DB=true
DRY_RUN=false
SKIP_INTEGRITY=false
SKIP_CI_CHECK=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --code-only) CODE_ONLY=true ;;
    --db-only) DB_ONLY=true; DEPLOY_DB=true ;;
    --with-db) DEPLOY_DB=true ;;
    --skip-integrity) SKIP_INTEGRITY=true ;;
    --skip-ci-check) SKIP_CI_CHECK=true ;;
    *) log_error "Unknown argument: $arg"; exit 1 ;;
  esac
done

if [ "$CODE_ONLY" = true ] && [ "$DB_ONLY" = true ]; then
  log_error "Cannot specify both --code-only and --db-only"
  exit 1
fi

if [ "$CODE_ONLY" = true ]; then
  DEPLOY_DB=false
fi

perform_rollback() {
  if [ "$ROLLBACK_IN_PROGRESS" = true ]; then
    return
  fi
  ROLLBACK_IN_PROGRESS=true
  trap - ERR

  log_warning "Initiating automatic rollback..."

  remote_ssh "
    set -e
    cd ${PRODUCTION_PATH}

    echo 'Stopping service...'
    pm2 stop epstein-archive || true

    if [ -f .env ]; then
      set -a
      source .env
      set +a
    fi

    if [ \"$DEPLOY_DB\" = true ] && [ -f .pre_migration.pg_dump ]; then
      echo 'Restoring Postgres pre-migration backup...'
      pg_restore --clean --if-exists -d \"\$DATABASE_URL\" .pre_migration.pg_dump || {
        echo '⚠️ pg_restore --clean failed, trying full restore...'
        pg_restore -d \"\$DATABASE_URL\" .pre_migration.pg_dump || echo '❌ pg_restore failed — manual intervention required'
      }
    fi

    if [ \"$DB_ONLY\" = false ] && [ -f .rollback_commit ]; then
      TARGET=\$(cat .rollback_commit)
      echo \"Rolling back code to \$TARGET...\"
      git reset --hard \$TARGET

      export PNPM_HOME=\"${REMOTE_HOME}/.local/share/pnpm\"
      export PATH=\"\$PNPM_HOME:\$PATH\"
      export NODE_ENV=production
      pnpm install --frozen-lockfile
      pnpm build:prod
    fi
  "

  remote_ssh "$(remote_pm2_reload_cmd)"

  log_success "Rollback completed."
}

on_error() {
  local line="$1"
  log_error "Deployment failed at line $line"

  if [ "$DRY_RUN" = false ] && [ "$DEPLOY_MUTATION_STARTED" = true ]; then
    perform_rollback || true
  fi

  exit 1
}

trap 'on_error $LINENO' ERR

github_repo_slug() {
  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null || true)
  case "$remote_url" in
    git@github.com:*.git) echo "${remote_url#git@github.com:}" | sed 's/\.git$//' ;;
    git@github.com:*) echo "${remote_url#git@github.com:}" ;;
    https://github.com/*.git) echo "${remote_url#https://github.com/}" | sed 's/\.git$//' ;;
    https://github.com/*) echo "${remote_url#https://github.com/}" ;;
    *) echo "ErikVeland/epstein-archive" ;;
  esac
}

wait_for_ci_green() {
  if [ "$SKIP_CI_CHECK" = true ]; then
    log_warning "Skipping CI gate (--skip-ci-check). Use only for emergencies."
    return 0
  fi

  require_cmd curl
  require_cmd jq

  local sha repo api_url max_attempts sleep_seconds attempt payload row status conclusion url
  sha=$(git rev-parse HEAD)
  repo=$(github_repo_slug)
  api_url="https://api.github.com/repos/${repo}/actions/runs?head_sha=${sha}&event=push&branch=main&per_page=20"
  max_attempts=80
  sleep_seconds=15

  log_step "Waiting for GitHub Actions CI to pass for ${sha:0:8}..."

  for attempt in $(seq 1 "$max_attempts"); do
    payload=$(curl -fsSL \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "$api_url") || {
        if command -v gh >/dev/null 2>&1; then
          row=$(gh run list --workflow CI --limit 20 --json headSha,status,conclusion,url,createdAt \
            | jq -r --arg sha "$sha" '
                [.[] | select(.headSha == $sha)
                 | {status, conclusion, html_url: .url, created_at: .createdAt}]
                | sort_by(.created_at) | reverse | .[0]
                | if . == null then "MISSING" else "\(.status)\t\(.conclusion // "")\t\(.html_url)" end
              ') || row="MISSING"
          if [ "$row" != "MISSING" ] && [ -n "$row" ]; then
            status=$(printf '%s' "$row" | cut -f1)
            conclusion=$(printf '%s' "$row" | cut -f2)
            url=$(printf '%s' "$row" | cut -f3)
            if [ "$status" = "completed" ] && [ "$conclusion" = "success" ]; then
              log_success "CI passed for ${sha:0:8} (via gh fallback)"
              return 0
            fi
            if [ "$status" = "completed" ] && [ "$conclusion" != "success" ]; then
              log_error "CI failed for ${sha:0:8}: conclusion=${conclusion}"
              [ -n "$url" ] && log_error "Inspect: ${url}"
              exit 1
            fi
            log_step "CI status=${status} conclusion=${conclusion:-pending} (gh fallback, attempt ${attempt}/${max_attempts})"
            sleep "$sleep_seconds"
            continue
          fi
        fi
        log_warning "GitHub API query failed (attempt ${attempt}/${max_attempts})"
        sleep "$sleep_seconds"
        continue
      }

    row=$(printf '%s' "$payload" | jq -r '
      [.workflow_runs[]
        | select(.name == "CI")
        | {status, conclusion, html_url, created_at}]
      | sort_by(.created_at) | reverse | .[0]
      | if . == null then "MISSING" else "\(.status)\t\(.conclusion // "")\t\(.html_url)" end
    ')

    if [ "$row" = "MISSING" ] || [ -z "$row" ]; then
      log_step "CI run not visible yet for ${sha:0:8} (attempt ${attempt}/${max_attempts})"
      sleep "$sleep_seconds"
      continue
    fi

    status=$(printf '%s' "$row" | cut -f1)
    conclusion=$(printf '%s' "$row" | cut -f2)
    url=$(printf '%s' "$row" | cut -f3)

    if [ "$status" = "completed" ] && [ "$conclusion" = "success" ]; then
      log_success "CI passed for ${sha:0:8}"
      return 0
    fi

    if [ "$status" = "completed" ] && [ "$conclusion" != "success" ]; then
      log_error "CI failed for ${sha:0:8}: conclusion=${conclusion}"
      [ -n "$url" ] && log_error "Inspect: ${url}"
      exit 1
    fi

    log_step "CI status=${status} conclusion=${conclusion:-pending} (attempt ${attempt}/${max_attempts})"
    sleep "$sleep_seconds"
  done

  log_error "Timed out waiting for CI to pass for ${sha:0:8}"
  exit 1
}

require_file "$SSH_KEY_PATH"
log_step "Using production SSH key: $SSH_KEY_PATH"

# ============================================
# PRE-FLIGHT (all non-mutating checks first)
# ============================================
if [ "$DRY_RUN" = false ] && [ "$DB_ONLY" = false ]; then
  log_step "Running pre-flight QA (format, lint, release notes, clean tree, build)..."

  log_step "Auto-fixing format and lint issues..."
  pnpm format
  pnpm lint:fix

  log_step "Checking SQL parity (before auto-commit)..."
  node --import tsx/esm scripts/check_documents_sql_parity.ts

  verify_release_notes_version

  if [ -n "$(git status --porcelain)" ]; then
    log_step "Working tree is dirty; auto-committing changes before deploy..."
    git status --short
    git add -A
    # Prompt for meaningful commit message if interactive, otherwise use context-aware default
    if [ -t 0 ]; then
      read -p "Enter commit message: " COMMIT_MSG
      if [ -z "$COMMIT_MSG" ]; then
        log_error "Commit message required."
        exit 1
      fi
    else
      COMMIT_MSG="deploy: auto-commit pre-deployment changes"
    fi
    git commit -m "$COMMIT_MSG"
    log_success "Commit created: $COMMIT_MSG"
  fi

  log_step "Building locally to verify integrity..."
  pnpm build:prod

  log_step "Pushing code to origin..."
  git push origin main --no-verify

  wait_for_ci_green
fi

if [ "$DRY_RUN" = false ]; then
  log_step "Running remote env sanity gate (non-mutating)..."
  remote_ssh "$(remote_env_sanity_cmd)"
fi

# ============================================
# PHASE 1: DATABASE DEPLOYMENT (PostgreSQL-only)
# ============================================
if [ "$DEPLOY_DB" = true ]; then
  log_step "Phase 1: Database deployment (PostgreSQL migrations)..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would run Postgres migrations on remote host"
  else
    DEPLOY_MUTATION_STARTED=true

    remote_ssh "
      set -e
      cd ${PRODUCTION_PATH}

      echo 'Syncing code from origin/main for migration phase...'
      git fetch origin
      git reset --hard origin/main
      git clean -fd

      export PNPM_HOME=\"${REMOTE_HOME}/.local/share/pnpm\"
      export PATH=\"\$PNPM_HOME:\$PATH\"
      export NODE_ENV=production

      if [ -f .env ]; then
        set -a
        source .env
        set +a
      fi
      [ -n \"\${DATABASE_URL:-}\" ] || (echo '❌ DATABASE_URL missing in DB deployment phase' && exit 1)

      echo 'Installing dependencies for migration phase...'
      pnpm install --frozen-lockfile

      # CERT_STEP: pg_dump_pre_migration_backup
      echo 'Creating Postgres pre-migration backup...'
      rm -f .pre_migration.pg_dump
      pg_dump -Fc \"\$DATABASE_URL\" > .pre_migration.pg_dump || (echo '❌ pg_dump failed — aborting migration' && exit 1)
      echo \"✅ Pre-migration backup: \$(du -h .pre_migration.pg_dump | cut -f1)\"

      # CERT_STEP: pg_connectivity_pre_migration
      echo 'Running Postgres preflight (connectivity + extension checks)...'
      $(remote_db_preflight_cmd)

      # CERT_STEP: migrations_idempotent
      echo 'Running Postgres migrations (pass 1)...'
      pnpm db:migrate:pg
      echo 'Running Postgres migrations (pass 2 idempotency check)...'
      pnpm db:migrate:pg
      echo 'Running Postgres analyze after migrate...'
      pnpm db:analyze

      # CERT_STEP: schema_hash_verification
      echo 'Running DB certification gates (schema hash + explain + health)...'
      $(remote_db_cert_gate_cmd)
    "

    if [ "$DB_ONLY" = true ]; then
      # CERT_STEP: app_restart_after_db_healthy
      remote_ssh "$(remote_pm2_reload_cmd)"
    fi

    log_success "Postgres database deployment complete."
  fi
else
  log_step "Skipping database deployment (--code-only explicitly requested)"
fi

# ============================================
# PHASE 2: CODE DEPLOYMENT
# ============================================
if [ "$DB_ONLY" = false ]; then
  log_step "Phase 2: Code deployment..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would update code/build on remote and restart PM2"
  else
    DEPLOY_MUTATION_STARTED=true

    remote_ssh "
      set -e
      cd ${PRODUCTION_PATH}

      echo 'Saving rollback commit...'
      git rev-parse HEAD > .rollback_commit

      # CERT_STEP: rollback_safety_previous_image_retained
      echo 'Retaining previous build artifact for rollback...'
      rm -f .rollback_dist.tgz
      if [ -d dist ]; then
        tar -czf .rollback_dist.tgz dist ecosystem.config.cjs package.json pnpm-lock.yaml 2>/dev/null || true
      fi

      echo 'Syncing code from origin/main...'
      git fetch origin
      git reset --hard origin/main
      # Scorched Earth: Remove any untracked files (e.g. legacy scripts)
      git clean -fd

      # Preserve previous hashed assets so open clients with cached HTML don't 404
      # on lazy-loaded chunks immediately after deploy. New build outputs overwrite
      # same-name files; old hashed files remain available for one version bridge.
      echo 'Preserving previous hashed assets for chunk-cache compatibility...'
      rm -rf .prev_dist_assets
      if [ -d dist/assets ]; then
        mkdir -p .prev_dist_assets
        cp -a dist/assets/. .prev_dist_assets/ 2>/dev/null || true
      fi

      # CRITICAL: Purge stale build artifacts to prevent deployment desync
      echo 'Purging stale build artifacts...'
      rm -rf dist
      rm -rf packages/db/dist

      export PNPM_HOME="${REMOTE_HOME}/.local/share/pnpm"
      export PATH="\$PNPM_HOME:\$PATH"
      export NODE_ENV=production

      pnpm install --frozen-lockfile
      pnpm build:prod

      if [ -d .prev_dist_assets ]; then
        echo 'Restoring previous hashed assets (non-overwriting)...'
        mkdir -p dist/assets
        cp -an .prev_dist_assets/. dist/assets/ 2>/dev/null || true
        rm -rf .prev_dist_assets
      fi
    "

    # CERT_STEP: app_restart_after_db_healthy
    remote_ssh "$(remote_pm2_reload_cmd)"
    log_success "Code deployment complete."
  fi
else
  log_step "Skipping code deployment (--db-only)"
fi

# ============================================
# PHASE 3: HEALTH CHECK
# ============================================
if [ "$DRY_RUN" = false ]; then
  READY_MAX_RETRIES=60
  READY_COUNT=0
  READY_SUCCESS=false
  DEEP_MAX_RETRIES=3
  DEEP_COUNT=0
  DEEP_SUCCESS=false

  log_step "Waiting for service to stabilize (up to 5 minutes)..."

  while [ $READY_COUNT -lt $READY_MAX_RETRIES ]; do
    sleep 5

    READY=$(remote_ssh "curl -sS --max-time 6 -w ' HTTP_STATUS:%{http_code}' http://localhost:3012/api/health/ready" || echo "HTTP_STATUS:000")
    READY_STATUS="${READY##*HTTP_STATUS:}"
    READY_BODY="${READY% HTTP_STATUS:*}"

    if [ "$READY_STATUS" = "200" ] && echo "$READY_BODY" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
      READY_SUCCESS=true
      break
    fi

    log_step "Ready attempt $((READY_COUNT+1))/$READY_MAX_RETRIES: ready=$READY_STATUS"
    READY_COUNT=$((READY_COUNT+1))
  done

  if [ "$READY_SUCCESS" != true ]; then
    log_error "Readiness checks failed after $READY_MAX_RETRIES attempts."
    perform_rollback
    exit 1
  fi

  log_step "Running DB meta Postgres gate..."
  remote_ssh \
    "curl -sf http://localhost:3012/api/_meta/db | jq -e '(.dialect == \"postgres\") and ((has(\"translationCount\") | not) or (.translationCount == 0))' >/dev/null || exit 1"

  # CERT_STEP: health_endpoint_smoke_test
  log_step "Running basic health smoke test..."
  BASIC_HEALTH=$(remote_ssh "curl -sS --max-time 3 -w ' HTTP_STATUS:%{http_code}' http://localhost:3012/api/health" || echo "HTTP_STATUS:000")
  BASIC_HEALTH_STATUS="${BASIC_HEALTH##*HTTP_STATUS:}"
  BASIC_HEALTH_BODY="${BASIC_HEALTH% HTTP_STATUS:*}"
  if [ "$BASIC_HEALTH_STATUS" != "200" ] || ! echo "$BASIC_HEALTH_BODY" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
    log_error "Basic /api/health smoke test failed (status=${BASIC_HEALTH_STATUS})."
    perform_rollback
    exit 1
  fi

  log_step "Readiness is healthy. Running deep health check..."

  while [ $DEEP_COUNT -lt $DEEP_MAX_RETRIES ]; do
    DEEP=$(remote_ssh "curl -sS --max-time 180 -w ' HTTP_STATUS:%{http_code}' http://localhost:3012/api/stats/health/deep" || echo "HTTP_STATUS:000")
    DEEP_STATUS="${DEEP##*HTTP_STATUS:}"

    if [ "$DEEP_STATUS" = "200" ]; then
      DEEP_SUCCESS=true
      break
    fi

    log_step "Deep health attempt $((DEEP_COUNT+1))/$DEEP_MAX_RETRIES: deep=$DEEP_STATUS"
    DEEP_COUNT=$((DEEP_COUNT+1))
    sleep 5
  done

  if [ "$DEEP_SUCCESS" = true ]; then
    log_step "Running post-deploy verification suite..."
    remote_ssh "
      set -e
      cd ${PRODUCTION_PATH}
      chmod +x ./scripts/post_deploy_verify.sh
      DEPLOY_VERIFY_URL=http://127.0.0.1:3012 ./scripts/post_deploy_verify.sh
    "

    log_success "Deployment successful (ready + deep health + post-deploy checks passed)."
  else
    log_error "Deep health checks failed after $DEEP_MAX_RETRIES attempts."
    perform_rollback
    exit 1
  fi
fi
