#!/bin/bash
# Root-run helper to migrate production from the old deploy user to a fresh user.
# Usage:
#   sudo NEW_USER=svc_epstein APP_DIR=/home/svc_epstein/epstein-archive bash scripts/migrate_prod_user.sh

set -euo pipefail

OLD_USER="${OLD_USER:-deploy}"
NEW_USER="${NEW_USER:-svc_epstein}"
NEW_HOME="${NEW_HOME:-/home/${NEW_USER}}"
APP_DIR="${APP_DIR:-${NEW_HOME}/epstein-archive}"
OLD_APP_DIR="${OLD_APP_DIR:-/home/${OLD_USER}/epstein-archive}"
PM2_DUMP_SRC="${PM2_DUMP_SRC:-/home/${OLD_USER}/.pm2/dump.pm2}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root." >&2
  exit 1
fi

if ! id "$OLD_USER" >/dev/null 2>&1; then
  echo "Missing old user: $OLD_USER" >&2
  exit 1
fi

if [ ! -d "$OLD_APP_DIR" ]; then
  echo "Missing app dir: $OLD_APP_DIR" >&2
  exit 1
fi

if ! id "$NEW_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$NEW_USER"
fi

install -d -m 700 -o "$NEW_USER" -g "$NEW_USER" "${NEW_HOME}/.ssh"
install -d -m 755 -o "$NEW_USER" -g "$NEW_USER" "$APP_DIR"

rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".env.pre-rotate-20260322" \
  "${OLD_APP_DIR}/" "${APP_DIR}/"

if [ -f "${OLD_APP_DIR}/.env" ]; then
  install -m 600 -o "$NEW_USER" -g "$NEW_USER" "${OLD_APP_DIR}/.env" "${APP_DIR}/.env"
fi

if [ -f "$PM2_DUMP_SRC" ]; then
  install -d -m 755 -o "$NEW_USER" -g "$NEW_USER" "${NEW_HOME}/.pm2"
  cp "$PM2_DUMP_SRC" "${NEW_HOME}/.pm2/dump.pm2"
  chown -R "$NEW_USER:$NEW_USER" "${NEW_HOME}/.pm2"
fi

chown -R "$NEW_USER:$NEW_USER" "$APP_DIR"
chmod 750 "$NEW_HOME"

cat <<EOF
Migration scaffold complete.

Next steps:
1. Install the new authorized key into ${NEW_HOME}/.ssh/authorized_keys
2. As ${NEW_USER}, start PM2 from ${APP_DIR}
3. Update deploy env on your workstation:
   export EPSTEIN_PROD_SSH_USER=${NEW_USER}
   export EPSTEIN_PROD_PATH=${APP_DIR}
4. Validate health, then lock or remove ${OLD_USER}
EOF
