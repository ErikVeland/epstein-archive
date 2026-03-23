import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'src/client');
const enforcedFiles = [
  'src/client/components/common/FormField.tsx',
  'src/client/components/common/Select.tsx',
  'src/client/components/common/SourceBadge.tsx',
  'src/client/components/common/Card.tsx',
  'src/client/components/common/BaseCard.tsx',
  'src/client/components/common/CloseButton.tsx',
].map((filePath) => path.join(rootDir, filePath));
const forbiddenArbitraryUtilities = [
  /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-x|space-y)-\[(?:\d+|\d+\.\d+)(?:px|rem)\]/g,
  /\brounded-\[(?:\d+|\d+\.\d+)(?:px|rem)\]/g,
];
const classPattern =
  /\b(?:bg|text|border|from|to|via|ring)-(?:slate|gray|red|orange|amber|yellow|green|emerald|teal|cyan|blue|indigo|violet|purple|pink)-\d{2,3}\b/g;

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  const violations: string[] = [];
  for (const filePath of enforcedFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    classPattern.lastIndex = 0;
    if (classPattern.test(content)) {
      const rel = path.relative(rootDir, filePath);
      violations.push(rel);
    }
  }
  const arbitraryViolations: string[] = [];
  for (const filePath of walk(clientDir)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenArbitraryUtilities) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        arbitraryViolations.push(path.relative(rootDir, filePath));
        break;
      }
    }
  }
  const configPath = path.join(rootDir, 'tailwind.config.js');
  const configContent = fs.readFileSync(configPath, 'utf8');
  const configRequirements = [
    'tokenizedPaletteFamilies',
    '--twc-',
    'var(--space-',
    'var(--radius-',
    'var(--shadow-',
  ];
  const missingConfigRequirements = configRequirements.filter(
    (requirement) => !configContent.includes(requirement),
  );

  if (violations.length || arbitraryViolations.length || missingConfigRequirements.length) {
    const parts: string[] = [];
    if (violations.length) {
      parts.push(`Hardcoded palette classes in governed primitives: ${violations.join(', ')}`);
    }
    if (arbitraryViolations.length) {
      parts.push(`Arbitrary px/rem utility usage found: ${arbitraryViolations.join(', ')}`);
    }
    if (missingConfigRequirements.length) {
      parts.push(`Tailwind token wiring missing: ${missingConfigRequirements.join(', ')}`);
    }
    throw new Error(`Design token guard failed. ${parts.join(' | ')}`);
  }

  console.log('[design-token-usage] OK');
}

main();
