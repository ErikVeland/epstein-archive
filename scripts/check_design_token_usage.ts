import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const enforcedFiles = [
  'src/client/components/common/FormField.tsx',
  'src/client/components/common/Select.tsx',
  'src/client/components/common/SourceBadge.tsx',
  'src/client/components/common/Card.tsx',
  'src/client/components/common/BaseCard.tsx',
  'src/client/components/common/CloseButton.tsx',
].map((filePath) => path.join(rootDir, filePath));
const classPattern =
  /\b(?:bg|text|border|from|to|via|ring)-(?:slate|gray|red|orange|amber|yellow|green|emerald|teal|cyan|blue|indigo|violet|purple|pink)-\d{2,3}\b/g;

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

  if (violations.length) {
    throw new Error(
      `Design token guard failed. Replace hardcoded palette classes with token classes. Violations: ${violations.join(', ')}`,
    );
  }

  console.log('[design-token-usage] OK');
}

main();
