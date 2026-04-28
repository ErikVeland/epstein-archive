#!/usr/bin/env bash
set -euo pipefail

export CI="${CI:-0}"
export NODE_ENV="${NODE_ENV:-test}"

echo "▶ Installing dependencies"
pnpm install --frozen-lockfile

echo "▶ Checking formatting"
pnpm format:check

echo "▶ Linting"
pnpm lint

echo "▶ Type checking"
pnpm type-check

echo "▶ Enforcing repo integrity gates"
pnpm check:seed-conflict-policy
pnpm check:test-hygiene
pnpm check:design-tokens

echo "▶ Running unit tests"
pnpm test:unit

if [[ "${CI:-}" == "true" || "${CI:-}" == "1" ]]; then
  if [[ -n "${DATABASE_URL:-}" ]]; then
    echo "▶ Verifying DB connectivity"
    pnpm db:check

    echo "▶ Verifying schema hash (prevents silent schema drift)"
    pnpm schema:hash:check
  else
    echo "⚠️  DATABASE_URL not set; skipping data-quality gates"
  fi
fi

echo "▶ Ensuring Playwright dependencies (when required)"
bash scripts/ensure_playwright_deps.sh

echo "▶ Building production artifacts"
pnpm build:prod

echo "▶ Running production bundle smoke tests (catches TDZ / ReferenceError crashes)"
pnpm test:bundle-smoke:only

echo "✅ Quality gate passed"
