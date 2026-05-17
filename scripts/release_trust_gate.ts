import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

type Finding = {
  file: string;
  line: number;
  message: string;
};

const testFilePatterns = ['tests/**/*.spec.ts', 'src/test/**/*.test.ts'];

const acceptanceMatrix = 'docs/20.0/ACCEPTANCE_MATRIX.md';
const requiredClaimProvenanceFields = [
  'sourceDocumentId',
  'sourceHash',
  'extractionMethod',
  'reviewState',
  'lastVerifiedAt',
  'provenanceStatus',
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function lines(relativePath: string): string[] {
  return read(relativePath).split(/\r?\n/);
}

function addFinding(findings: Finding[], file: string, index: number, message: string) {
  findings.push({ file, line: index + 1, message });
}

function checkAcceptanceMatrix(findings: Finding[]) {
  const matrixLines = lines(acceptanceMatrix);
  matrixLines.forEach((line, index) => {
    if (!line.startsWith('|')) return;
    if (/\|\s*(In Progress|Blocked)\s*\|/.test(line)) {
      addFinding(
        findings,
        acceptanceMatrix,
        index,
        'release workstream is still marked In Progress/Blocked',
      );
    }
  });
}

function checkTestSkips(findings: Finding[]) {
  const specs = globSync(testFilePatterns, {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**'],
  }).sort();

  for (const spec of specs) {
    const specLines = lines(spec);
    specLines.forEach((line, index) => {
      if (!/\b(?:test|it|describe)\.(?:skip|skipIf)\s*\(/.test(line)) return;
      addFinding(findings, spec, index, 'test skip API is forbidden for strict release');
    });
  }
}

function checkClaimProvenanceContract(findings: Finding[]) {
  const schemaFile = 'src/shared/schemas/entityTabs.ts';
  const schema = read(schemaFile);
  for (const field of requiredClaimProvenanceFields) {
    if (!schema.includes(field)) {
      addFinding(findings, schemaFile, 1, `claim triple schema is missing ${field}`);
    }
  }
}

function main() {
  const findings: Finding[] = [];

  checkAcceptanceMatrix(findings);
  checkTestSkips(findings);
  checkClaimProvenanceContract(findings);

  if (findings.length > 0) {
    const details = findings
      .map((finding) => `${finding.file}:${finding.line} ${finding.message}`)
      .join('\n');
    throw new Error(`Release trust gate failed with ${findings.length} finding(s):\n${details}`);
  }

  console.log('[release-trust-gate] OK');
}

main();
