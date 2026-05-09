#!/bin/bash
set -euo pipefail

ACTION="${1:-}"
DB="postgresql://epstein:epstein@localhost:5435/epstein_archive"

REPO_DIR="${EPSTEIN_REPO_DIR:-}"
if [ -z "$REPO_DIR" ]; then
  if [ -d "/Volumes/Media/Epstein Files/epstein-archive" ]; then
    REPO_DIR="/Volumes/Media/Epstein Files/epstein-archive"
  else
    REPO_DIR="/Users/veland/Downloads/Epstein Files/epstein-archive"
  fi
fi

if [ -x "/opt/homebrew/opt/postgresql@16/bin/psql" ]; then
  PSQL="/opt/homebrew/opt/postgresql@16/bin/psql"
elif [ -x "/usr/local/Cellar/postgresql@16/16.10/bin/psql" ]; then
  PSQL="/usr/local/Cellar/postgresql@16/16.10/bin/psql"
elif command -v psql >/dev/null 2>&1; then
  PSQL="$(command -v psql)"
else
  PSQL=""
fi

if [ -x "/opt/homebrew/bin/pm2" ]; then
  PM2="/opt/homebrew/bin/pm2"
elif [ -x "/usr/local/bin/pm2" ]; then
  PM2="/usr/local/bin/pm2"
elif command -v pm2 >/dev/null 2>&1; then
  PM2="$(command -v pm2)"
else
  PM2=""
fi

try_run_id() {
  if [ -z "$PSQL" ]; then
    echo ""
    return 0
  fi
  RUN_ID=$(
    "$PSQL" "$DB" -tAc "SELECT id FROM pipeline_runs WHERE status IN ('running','paused') ORDER BY started_at DESC LIMIT 1;" 2>/dev/null ||
      true
  )
  echo "$RUN_ID" | tr -d '[:space:]'
}

need_run_id() {
  RUN_ID=$(try_run_id)
  if [ -z "$RUN_ID" ]; then
    echo "no active run" >&2
    exit 1
  fi
  echo "$RUN_ID"
}

case "$ACTION" in
  start)
    if [ -z "$PM2" ]; then
      echo "pm2 not found" >&2
      exit 1
    fi
    "$PM2" start "$REPO_DIR/ecosystem.config.cjs" --only unified-pipeline --update-env
    ;;
  stop)
    RUN_ID=$(try_run_id)
    if [ -n "$RUN_ID" ] && [ -n "$PSQL" ]; then
      "$PSQL" "$DB" -tAc "UPDATE pipeline_runs SET control_signal='stop' WHERE id=$RUN_ID;" >/dev/null
    fi
    if [ -n "$PM2" ]; then
      "$PM2" stop unified-pipeline || true
    fi
    ;;
  pause)
    RUN_ID=$(need_run_id)
    "$PSQL" "$DB" -tAc "UPDATE pipeline_runs SET control_signal='pause' WHERE id=$RUN_ID;" >/dev/null
    ;;
  resume)
    RUN_ID=$(need_run_id)
    "$PSQL" "$DB" -tAc "UPDATE pipeline_runs SET control_signal='resume' WHERE id=$RUN_ID;" >/dev/null
    ;;
  *)
    echo "usage: control.sh {start|stop|pause|resume}" >&2
    exit 2
    ;;
esac
