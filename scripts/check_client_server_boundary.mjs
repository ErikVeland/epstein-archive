import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const rawFiles = execSync('rg --files src/client', { cwd: repoRoot, encoding: 'utf8' })
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

function checkDesignSystemBoundary(file, spec) {
  const isComponentFile = file.startsWith('src/client/components/');
  const isDesignSystemFile = file.startsWith('src/client/design-system/');

  if (isComponentFile) {
    if (
      spec === '@client/index.css' ||
      spec.endsWith('/index.css') ||
      spec === '../../index.css' ||
      spec === '../index.css'
    ) {
      return 'Components must not import index.css directly.';
    }

    if (
      spec.includes('styles/designSystem') ||
      spec.includes('tailwind.config') ||
      (spec.includes('design-system/') && !spec.startsWith('@design-system'))
    ) {
      return 'Components must consume the design system through @design-system imports only.';
    }
  }

  if (isDesignSystemFile) {
    if (spec.startsWith('@client/components/')) {
      return 'Design-system modules may not import from src/client/components.';
    }

    if (spec.startsWith('.')) {
      const resolvedSpec = normalize(join(dirname(file), spec));
      if (
        resolvedSpec.startsWith('src/client/components/') &&
        !resolvedSpec.startsWith('src/client/design-system/components/')
      ) {
        return 'Design-system modules may not import from src/client/components.';
      }
    }

    if (spec.includes('/src/client/components/')) {
      return 'Design-system modules may not import from src/client/components.';
    }
  }

  return null;
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
    const designSystemViolation = checkDesignSystemBoundary(file, spec);
    if (designSystemViolation) {
      violations.push({ file, spec, reason: designSystemViolation });
    }
  }
}

if (violations.length > 0) {
  console.error('Client/server boundary violations found:');
  for (const v of violations) {
    console.error(` - ${v.file}: ${v.spec}${v.reason ? ` (${v.reason})` : ''}`);
  }
  process.exit(1);
}

console.log(`Boundary check passed (${rawFiles.length} client files).`);
