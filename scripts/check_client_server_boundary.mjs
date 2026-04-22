import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const rawFiles = execSync('find src/client -type f', { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));

const importRegex = /(?:import\s+[^'"`]*?from\s+|import\s*\(\s*)['"`]([^'"`]+)['"`]/g;
const violations = [];

function isForbidden(spec) {
  if (spec.startsWith('@server/')) return true;
  if (/^(\.\.\/)+server\//.test(spec)) return true;
  if (/^\.\/server\//.test(spec)) return true;
  if (spec.includes('/src/server/')) return true;
  return false;
}

for (const file of rawFiles) {
  const abs = join(repoRoot, file);
  const content = readFileSync(abs, 'utf8');
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const spec = match[1];
    if (isForbidden(spec)) {
      violations.push({ file, spec });
    }
  }
}

if (violations.length > 0) {
  console.error('Client/server boundary violations found:');
  for (const v of violations) {
    console.error(` - ${v.file}: ${v.spec}`);
  }
  process.exit(1);
}

console.log(`Boundary check passed (${rawFiles.length} client files).`);
