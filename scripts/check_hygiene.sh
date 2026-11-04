#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Read the index once. Staged deletions are absent from this list.
forbidden_pattern='^(data/|docs/(llm_handover|explain|superpowers)/|\.(superpowers|kiro|playwright-mcp|pnpm-store|claude|codex|chuck|trae|tmp)/|scratch/|src/(server/scratch|client/hooks/scratch)/)|(^|/)(\.DS_Store|[^/]+\.tsbuildinfo)$|^(build_output|build_output_lint|errors|full_lint|lint|lint_output|tsc_errors|tsc_output(_v[0-9]+)?|hashes_dump|redaction_dump)\.(txt|json|csv)$'
violations=()
while IFS= read -r -d '' file; do
  if [[ "$file" =~ $forbidden_pattern ]] ||
    [[ "$file" == public/data/* && "$file" != public/data/dashboard_snapshot.json ]]; then
    violations+=("$file")
  fi
done < <(git ls-files --cached -z)

if (( ${#violations[@]} > 0 )); then
  echo 'Repository hygiene failed. Remove these local artifacts from Git tracking:'
  printf '  %s\n' "${violations[@]}"
  exit 1
fi

retired_paths=(
  'src/server/performanceCache.ts'
  'src/server/utils/perfCache.ts'
  'src/client/services/OptimizedDataService.ts'
  'src/client/services/optimizedDataLoader.ts'
  'src/server/pipeline/workerPool.ts'
  'src/server/pipeline/workerConfig.ts'
  'src/server/services/JobManager.ts'
  'src/server/scratch'
  'src/client/hooks/scratch'
  'scratch'
)
for file in "${retired_paths[@]}"; do
  if [[ -e "$file" ]]; then
    echo "Repository hygiene failed. Retired path exists: $file"
    exit 1
  fi
done

if rg -n 'performanceCache|utils/perfCache|OptimizedDataService|optimizedDataLoader|server/pipeline/workerPool|server/pipeline/workerConfig|services/JobManager' \
  src scripts packages --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.mjs' 2>/dev/null; then
  echo 'Repository hygiene failed. Replace retired imports with the canonical cache, API client, or queue modules.'
  exit 1
fi

echo 'Repository hygiene passed.'
