import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();

const SCAN_DIRS = ['src', 'packages', 'scripts', 'tests'];

const SKIP_PARTS = new Set(['node_modules', 'dist', 'build', '.git', '__generated__', 'coverage']);

const SKIP_PATH_INCLUDES = [
  'src/server/db/postgres/migrations/',
  'scripts/check_forbidden_schema_identifiers.ts',
];

const FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|sql)$/;

const checks: Array<{ name: string; pattern: RegExp }> = [
  {
    name: 'legacy original_file_path/originalFilePath alias',
    pattern: /\boriginal_file_path\b|\boriginalFilePath\b/,
  },
  {
    name: 'legacy entities.type column reference',
    pattern:
      /\bINSERT\s+INTO\s+entities\s*\([^)]*\btype\b|\bON\s+CONFLICT\s*\([^)]*\btype\b|\bWHERE\s+full_name\s*=\s*\$[0-9]+\s+AND\s+type\s*=/i,
  },
  {
    name: 'legacy investigation evidence_id column',
    pattern:
      /\binvestigation_evidence\b[\s\S]{0,160}\bevidence_id\b|\bhypothesis_evidence\b[\s\S]{0,160}\bevidence_id\b/i,
  },
  {
    name: 'retired public table SQL reference',
    pattern:
      /\b(?:FROM|JOIN|INSERT\s+INTO|UPDATE|DELETE\s+FROM|REFERENCES)\s+(?:public\.)?(?:evidence|relations|collections|document_collections|entity_merge_candidates|evidence_types|entity_evidence_types|media_assets|evidence_entity|mentions|resolution_candidates|timeline_events)\b/i,
  },
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    if (SKIP_PARTS.has(entry)) continue;

    const full = join(dir, entry);
    const rel = relative(ROOT, full).replaceAll('\\', '/');
    if (SKIP_PATH_INCLUDES.some((skip) => rel.includes(skip))) continue;

    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walk(full));
    } else if (FILE_RE.test(entry)) {
      files.push(full);
    }
  }

  return files;
}

const failures: string[] = [];

for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  for (const file of walk(abs)) {
    const rel = relative(ROOT, file).replaceAll('\\', '/');
    const text = readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    for (const check of checks) {
      if (check.name === 'retired public table SQL reference' && rel.startsWith('src/client/')) {
        continue;
      }
      const match = check.pattern.exec(text);
      if (!match) continue;

      const before = text.slice(0, match.index);
      const line = before.split('\n').length;
      failures.push(`${rel}:${line} ${check.name}`);
    }
  }
}

if (failures.length > 0) {
  console.error('[forbidden-schema-identifiers] Retired schema names were reintroduced:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('[forbidden-schema-identifiers] No retired schema identifiers found.');
