#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${EPSTEIN_PM2_APP_NAME:-epstein-archive}"
CANDIDATE_NAME="${APP_NAME}-cluster-candidate"
PRODUCTION_PATH="${EPSTEIN_PRODUCTION_PATH:-/home/svc_epstein/epstein-archive}"
PUBLIC_ORIGIN="${EPSTEIN_PUBLIC_ORIGIN:-https://epstein.academy}"
LIVE_PORT="${EPSTEIN_LIVE_PORT:-3012}"
CANARY_PORT="${EPSTEIN_CANARY_PORT:-3013}"
NGINX_SITE="${EPSTEIN_NGINX_SITE:-/etc/nginx/sites-enabled/epstein-archive}"
PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"

export PNPM_HOME
export PATH="$PNPM_HOME:$PATH"
export NODE_ENV=production
export CI=true

log() {
  printf '▶ %s\n' "$*"
}

fail() {
  printf '❌ %s\n' "$*" >&2
  exit 1
}

cd "$PRODUCTION_PATH"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

pm2_mode() {
  pm2 jlist | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => input += chunk);
    process.stdin.on("end", () => {
      const app = JSON.parse(input).find((process) => process.name === process.env.APP_NAME);
      process.stdout.write(app?.pm2_env?.exec_mode || "missing");
    });
  '
}

verify() {
  local url="$1"
  DEPLOY_VERIFY_URL="$url" pnpm verify:live-cutover
}

route_nginx_to_port() {
  local from_port="$1"
  local to_port="$2"

  sudo -n test -f "$NGINX_SITE" || fail "Nginx site not found: $NGINX_SITE"
  sudo -n cp "$NGINX_SITE" "${NGINX_SITE}.pre-cluster-cutover"
  sudo -n perl -0pi -e "s/127\\.0\\.0\\.1:${from_port}/127.0.0.1:${to_port}/g" "$NGINX_SITE"
  sudo -n nginx -t
  sudo -n systemctl reload nginx
}

restore_nginx() {
  if sudo -n test -f "${NGINX_SITE}.pre-cluster-cutover"; then
    sudo -n cp "${NGINX_SITE}.pre-cluster-cutover" "$NGINX_SITE"
    sudo -n nginx -t
    sudo -n systemctl reload nginx
  fi
}

rollback() {
  local status=$?
  if [ "$status" -eq 0 ]; then
    return
  fi

  echo "⚠️ PM2 cluster cutover failed. Restoring Nginx route and leaving any healthy candidate online for inspection." >&2
  restore_nginx || true
  if ! pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    PORT="$LIVE_PORT" RAW_CORPUS_BASE_PATH="./data" pm2 start ecosystem.config.cjs --only "$APP_NAME" --env production --wait-ready || true
  fi
  exit "$status"
}
trap rollback EXIT

export APP_NAME
CURRENT_MODE="$(pm2_mode)"
if [ "$CURRENT_MODE" = "cluster_mode" ]; then
  log "$APP_NAME is already in cluster mode."
  verify "http://127.0.0.1:${LIVE_PORT}"
  verify "$PUBLIC_ORIGIN"
  exit 0
fi

[ "$CURRENT_MODE" = "fork_mode" ] || fail "$APP_NAME is not in a migratable state (mode=$CURRENT_MODE)"
sudo -n true >/dev/null || fail "Passwordless sudo is required for zero-interruption Nginx routing."

log "Verifying current public route before PM2 mode migration..."
verify "$PUBLIC_ORIGIN"

log "Starting cluster candidate on ${CANARY_PORT}..."
pm2 delete "$CANDIDATE_NAME" >/dev/null 2>&1 || true
PORT="$CANARY_PORT" RAW_CORPUS_BASE_PATH="./data" pm2 start dist/server.js \
  --name "$CANDIDATE_NAME" \
  -i 2 \
  --wait-ready \
  --time \
  --update-env
verify "http://127.0.0.1:${CANARY_PORT}"

log "Routing Nginx to verified cluster candidate..."
route_nginx_to_port "$LIVE_PORT" "$CANARY_PORT"
verify "$PUBLIC_ORIGIN"

log "Recreating ${APP_NAME} in cluster mode on ${LIVE_PORT} while public traffic stays on candidate..."
pm2 delete "$APP_NAME"
PORT="$LIVE_PORT" RAW_CORPUS_BASE_PATH="./data" pm2 start ecosystem.config.cjs \
  --only "$APP_NAME" \
  --env production \
  --wait-ready \
  --update-env
verify "http://127.0.0.1:${LIVE_PORT}"

export APP_NAME
NEW_MODE="$(pm2_mode)"
[ "$NEW_MODE" = "cluster_mode" ] || fail "$APP_NAME restarted but did not enter cluster mode (mode=$NEW_MODE)"

log "Routing Nginx back to ${APP_NAME} on ${LIVE_PORT}..."
route_nginx_to_port "$CANARY_PORT" "$LIVE_PORT"
verify "$PUBLIC_ORIGIN"

log "Cleaning up cluster candidate..."
pm2 delete "$CANDIDATE_NAME" >/dev/null 2>&1 || true
pm2 save >/dev/null
sudo -n rm -f "${NGINX_SITE}.pre-cluster-cutover"

trap - EXIT
log "PM2 cluster cutover complete."
