#!/usr/bin/env bash
set -euo pipefail

# Fails the commit if forbidden local-only artifacts are staged.
# This prevents accidental commits even if files are force-added.

forbidden_patterns=(
  '^docs/llm_handover/'
  '^docs/explain/'
  '^docs/superpowers/'
  '^\.playwright-mcp/'
  '^\.pnpm-store/'
  '^\.claude/'
)

staged="$(git diff --cached --name-only)"

if [[ -z "${staged}" ]]; then
  exit 0
fi

violations=()
while IFS= read -r file; do
  for pat in "${forbidden_patterns[@]}"; do
    if [[ "${file}" =~ ${pat} ]]; then
      violations+=("${file}")
      break
    fi
  done
done <<< "${staged}"

if (( ${#violations[@]} > 0 )); then
  echo "❌ Repo hygiene check failed: local-only artifacts are staged for commit:"
  for v in "${violations[@]}"; do
    echo "  - ${v}"
  done
  echo ""
  echo "Fix:"
  echo "  1) Unstage them: git restore --staged <path>"
  echo "  2) Remove them locally: pnpm run hygiene:clean"
  exit 1
fi

exit 0
