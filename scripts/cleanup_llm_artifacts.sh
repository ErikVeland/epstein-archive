#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Remove session output. Preserve dependencies, configuration, evidence, and worktrees.
for artifact in docs/llm_handover docs/explain docs/superpowers .superpowers .playwright-mcp; do
  rm -rf -- "${ROOT_DIR}/${artifact}"
done

printf '%s\n' 'Removed local session artifacts.'
