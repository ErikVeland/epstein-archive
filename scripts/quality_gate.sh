#!/usr/bin/env bash
set -euo pipefail

export CI="${CI:-1}"
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
pnpm check:design-tokens

echo "▶ Running unit tests"
pnpm test:unit

echo "▶ Building production artifacts"
pnpm build:prod

echo "✅ Quality gate passed"
