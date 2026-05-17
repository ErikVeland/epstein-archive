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
  '^(build_output|build_output_lint|errors|full_lint|lint|lint_output|tsc_errors|tsc_output(_v[0-9]+)?|hashes_dump|redaction_dump)\.(txt|json|csv)$'
)

staged="$(git diff --cached --name-only)"
tracked="$(git ls-files | while IFS= read -r file; do [[ -e "${file}" ]] && echo "${file}"; done)"

scan_input="${staged}"
if [[ -n "${tracked}" ]]; then
  scan_input="${scan_input}"$'\n'"${tracked}"
fi

violations=()
while IFS= read -r file; do
  [[ -z "${file}" ]] && continue
  for pat in "${forbidden_patterns[@]}"; do
    if [[ "${file}" =~ ${pat} ]]; then
      violations+=("${file}")
      break
    fi
  done
done <<< "${scan_input}"

if (( ${#violations[@]} > 0 )); then
  echo "❌ Repo hygiene check failed: local-only/generated artifacts are tracked or staged:"
  printf '%s\n' "${violations[@]}" | sort -u | while IFS= read -r v; do
    echo "  - ${v}"
  done
  echo ""
  echo "Fix:"
  echo "  1) Unstage them: git restore --staged <path>"
  echo "  2) Remove them locally: pnpm run hygiene:clean"
  exit 1
fi

exit 0
