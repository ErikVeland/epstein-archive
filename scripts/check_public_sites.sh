#!/usr/bin/env bash
set -euo pipefail

TMP_FILES=()
cleanup() {
  if [ "${#TMP_FILES[@]}" -gt 0 ]; then
    rm -f "${TMP_FILES[@]}"
  fi
}
trap cleanup EXIT

log() {
  printf '%s\n' "$1"
}

fail() {
  printf '❌ %s\n' "$1" >&2
  exit 1
}

check_url() {
  local name="$1"
  local url="$2"
  local expected_codes="$3"
  local body_pattern="$4"
  local tmp
  local response
  local status
  local body

  tmp="$(mktemp)"
  TMP_FILES+=("$tmp")

  response="$(curl -k -sS --max-time "${CHECK_TIMEOUT:-15}" -o "$tmp" -w 'HTTP_STATUS:%{http_code}' "$url" || true)"
  status="${response##*HTTP_STATUS:}"
  body="$(cat "$tmp")"

  if ! printf '%s' "$expected_codes" | tr ',' '\n' | grep -qx "$status"; then
    fail "$name returned unexpected status $status for $url"
  fi

  if [ -n "$body_pattern" ] && ! printf '%s' "$body" | grep -Eq "$body_pattern"; then
    fail "$name returned an unexpected body for $url"
  fi

  log "✅ $name OK ($status)"
}

log "Checking public production sites..."

check_url "glasscode.academy gateway" "https://glasscode.academy/health" "200" '^ok$'
check_url "glasscode.academy API" "https://glasscode.academy/api/health" "200" '"status"[[:space:]]*:[[:space:]]*"(ok|healthy)"'
check_url "about.glasscode.academy" "https://about.glasscode.academy/en" "200" '<!DOCTYPE html'
check_url "piday.glasscode.academy" "https://piday.glasscode.academy/" "200" '<!DOCTYPE html'

log "✅ Public production sites verified."
