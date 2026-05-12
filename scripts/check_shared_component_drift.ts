import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'src/client');

interface DriftRule {
  name: string;
  sharedComponent: string;
  trigger: RegExp;
  requires: RegExp;
  reason: string;
}

const rules: DriftRule[] = [
  {
    name: 'segmented-density-control',
    sharedComponent: 'AnimatedSegmentedControl',
    trigger:
      /\bstyles\.(?:densityToggle|densityToggleGroup|densityButton)\b|className=["'`][^"'`]*\bdensity(?:Toggle|Button)\b/,
    requires: /<AnimatedSegmentedControl\b|import\s+\{\s*AnimatedSegmentedControl\s*\}/,
    reason:
      'Density and highlight-density segmented controls must use the shared AnimatedSegmentedControl primitive.',
  },
  {
    name: 'manual-radio-segmented-control',
    sharedComponent: 'AnimatedSegmentedControl',
    trigger:
      /role=["']radiogroup["'][\s\S]{0,1400}role=["']radio["']|aria-checked=[\s\S]{0,600}onClick=/,
    requires: /<AnimatedSegmentedControl\b/,
    reason:
      'Radio-style segmented controls must use the shared AnimatedSegmentedControl primitive.',
  },
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage'].includes(entry.name)) return [];
      return walk(fullPath);
    }
    return /\.(tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

const violations: string[] = [];

for (const filePath of walk(clientDir)) {
  const relPath = path.relative(rootDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  if (relPath.includes('components/common/AnimatedSegmentedControl.tsx')) continue;

  for (const rule of rules) {
    rule.trigger.lastIndex = 0;
    rule.requires.lastIndex = 0;
    if (rule.trigger.test(content) && !rule.requires.test(content)) {
      violations.push(
        `${relPath}: ${rule.name} drift. Use ${rule.sharedComponent}. ${rule.reason}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error('[shared-component-drift] Found shared component drift:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('[shared-component-drift] OK');
