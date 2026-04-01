import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const ENFORCED_FILES = [
  'src/client/pages/PeoplePage.tsx',
  'src/client/components/entities/SubjectCardV2.tsx',
  'src/client/components/pages/StatsDisplay.tsx',
  'src/client/components/common/EvidenceModal.tsx',
  'src/client/components/documents/DocumentModal.tsx',
  'src/client/components/evidence/DocumentViewer.tsx',
  'src/client/components/email/EmailClient.tsx',
  'src/client/components/ReleaseNotesPanel.tsx',
  'src/client/components/pages/AboutPage.tsx',
  'src/client/components/documents/DocumentContentRenderer.tsx',
  'src/client/components/documents/DocumentBrowser.tsx',
];

const emojiRegex = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE0F}]/gu;
const rawColorRegex = /#[0-9a-fA-F]{3,8}|\brgba?\(|\bhsla?\(/g;
const radiusClassRegex = /rounded-(none|sm|md|lg|xl|2xl|3xl)\b/g;

interface Violation {
  file: string;
  type: 'emoji' | 'raw-color' | 'radius-class';
  match: string;
  index: number;
  severity: 'error' | 'warn';
}

function scanFile(filePath: string): Violation[] {
  const fullPath = join(ROOT, filePath);
  if (!existsSync(fullPath)) {
    console.warn(`Warning: File not found: ${filePath}`);
    return [];
  }
  const content = readFileSync(fullPath, 'utf-8');
  const violations: Violation[] = [];

  for (const match of content.matchAll(emojiRegex)) {
    violations.push({
      file: filePath,
      type: 'emoji',
      match: match[0],
      index: match.index ?? 0,
      severity: 'error',
    });
  }

  for (const match of content.matchAll(rawColorRegex)) {
    violations.push({
      file: filePath,
      type: 'raw-color',
      match: match[0],
      index: match.index ?? 0,
      severity: 'error',
    });
  }

  for (const match of content.matchAll(radiusClassRegex)) {
    violations.push({
      file: filePath,
      type: 'radius-class',
      match: match[0],
      index: match.index ?? 0,
      severity: 'warn',
    });
  }

  return violations;
}

function main() {
  const violations = ENFORCED_FILES.flatMap(scanFile);
  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warn');

  console.log('\nDesign Token Compliance Report');
  console.log('='.repeat(40));
  console.log(`Scanned files: ${ENFORCED_FILES.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (errors.length > 0 || warnings.length > 0) {
    console.log('\nFindings:');
    for (const v of violations.slice(0, 200)) {
      console.log(`- [${v.severity}] ${v.file} :: ${v.type} :: ${v.match}`);
    }
  }

  if (errors.length > 0) {
    console.error('\nToken compliance failed: fix error-level findings.');
    process.exit(1);
  }

  console.log('\nToken compliance passed (warning-level findings may remain).');
}

main();
