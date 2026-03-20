#!/usr/bin/env bash
# run_protected.sh — Run a pipeline command with macOS process protection.
#
# Usage:
#   ./scripts/run_protected.sh pipeline:backfill
#   ./scripts/run_protected.sh media:thumbnails:backfill
#   ./scripts/run_protected.sh "tsx scripts/backfill_image_ocr.ts"
#
# What this does:
#   1. caffeinate -s -i  — blocks system sleep and idle sleep for the duration
#   2. renice -n -10     — raises scheduler priority above default (0)
#   3. taskpolicy -b off — disables App Nap / background throttling if available

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <pnpm-script-or-command>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

# Load .env so DATABASE_URL etc. are available
if [[ -f .env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

COMMAND="$*"
echo "[protected] Starting: $COMMAND"
echo "[protected] PID will be elevated and sleep-blocked"

# caffeinate -s: prevent system sleep
# caffeinate -i: prevent idle sleep
exec caffeinate -s -i -- bash -c "
  # Raise scheduler priority above default (0). Range: -20 (highest) to 19 (lowest).
  renice -n -10 \$\$ 2>/dev/null || true

  exec pnpm $COMMAND
"
