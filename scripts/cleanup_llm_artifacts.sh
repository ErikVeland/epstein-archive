#!/usr/bin/env bash
set -euo pipefail

# Local hygiene cleanup for LLM/agent-generated artifacts.
# Safe to run repeatedly.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf "${ROOT_DIR}/docs/llm_handover" || true
rm -rf "${ROOT_DIR}/docs/explain" || true

# Optional: other common local artifacts that should not linger.
rm -rf "${ROOT_DIR}/.playwright-mcp" || true
rm -rf "${ROOT_DIR}/.pnpm-store" || true

echo "✅ Cleaned LLM/agent local artifacts."
