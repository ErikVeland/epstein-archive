#!/usr/bin/env bash
set -euo pipefail

NEW_USER="${NEW_USER:-svc_epstein}"
NEW_HOME="/home/${NEW_USER}"
ACADEMY_SRC="${ACADEMY_SRC:-/srv/academy}"
ABOUT_SRC="${ABOUT_SRC:-/var/www/about-glasscode-academy}"
ACADEMY_DST="${ACADEMY_DST:-${NEW_HOME}/services/academy}"
ABOUT_DST="${ABOUT_DST:-${NEW_HOME}/services/about-glasscode-academy}"

log() {
  printf '%s\n' "$1"
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "Run as root" >&2
    exit 1
  fi
}

copy_tree() {
  mkdir -p "${NEW_HOME}/services"
  rsync -a "${ACADEMY_SRC}/" "${ACADEMY_DST}/"
  rsync -a "${ABOUT_SRC}/" "${ABOUT_DST}/"
  chown -R ${NEW_USER}:${NEW_USER} "${NEW_HOME}/services"
}

stop_old_services() {
  runuser -l deploy -c 'pm2 stop glass-academy >/dev/null 2>&1 || true; pm2 delete glass-academy >/dev/null 2>&1 || true; pm2 save --force >/dev/null 2>&1 || true'
  pkill -u deploy -f 'next-server \(v15\.3\.5\)' || true
  pkill -u deploy -f 'next-server \(v16\.0\.6\)' || true
  pkill -u deploy -f '/usr/bin/node server.js' || true
  sleep 3
}

verify_services() {
  curl -fsS http://127.0.0.1:3000/health >/dev/null
  curl -fsS http://127.0.0.1:8080/health >/dev/null
  curl -fsS http://127.0.0.1:3002/en >/dev/null
  curl -k -fsS https://glasscode.academy/health >/dev/null
  curl -k -fsS https://glasscode.academy/api/health >/dev/null
  curl -k -fsS https://about.glasscode.academy/en >/dev/null
  curl -k -fsS https://piday.glasscode.academy/ >/dev/null
}

start_new_services() {
  runuser -l ${NEW_USER} -c "pm2 delete glasscode-frontend >/dev/null 2>&1 || true; pm2 delete glasscode-api >/dev/null 2>&1 || true; pm2 delete about-glasscode >/dev/null 2>&1 || true"
  runuser -l ${NEW_USER} -c "cd ${ACADEMY_DST}/glasscode/frontend && PORT=3000 NODE_ENV=production pm2 start npm --name glasscode-frontend -- run start:next"
  runuser -l ${NEW_USER} -c "cd ${ACADEMY_DST}/apps/api && PORT=8080 NODE_ENV=production pm2 start node --name glasscode-api -- server.js"
  runuser -l ${NEW_USER} -c "cd ${ABOUT_DST}/glass-academy && PORT=3002 NODE_ENV=production pm2 start npm --name about-glasscode -- run start -- --port 3002"
  runuser -l ${NEW_USER} -c "pm2 save --force"
}

require_root
copy_tree
stop_old_services
start_new_services
sleep 5
verify_services
log 'Glasscode services migrated successfully.'
