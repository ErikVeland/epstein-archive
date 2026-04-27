#!/usr/bin/env bash
set -euo pipefail

# Installs Playwright browsers + OS deps in environments where we run Playwright tests.
# - In GitHub Actions (GITHUB_ACTIONS=true), always install (fail closed).
# - In other environments, only install when CI_STRICT_E2E=1 or FORCE_PLAYWRIGHT_DEPS=1.

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "▶ Installing Playwright (browsers + OS deps) for GitHub Actions"
  pnpm exec playwright install --with-deps chromium
  exit 0
fi

if [[ "${CI_STRICT_E2E:-}" == "1" || "${FORCE_PLAYWRIGHT_DEPS:-}" == "1" ]]; then
  echo "▶ Installing Playwright (browsers + OS deps) (strict mode)"
  pnpm exec playwright install --with-deps chromium
  exit 0
fi

echo "ℹ️  Playwright deps install skipped (not required in this environment)"

