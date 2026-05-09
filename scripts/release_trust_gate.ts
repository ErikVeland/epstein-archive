import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

type Finding = {
  file: string;
  line: number;
  message: string;
};

const criticalSpecs = [
  'tests/api-dto-contract.spec.ts',
  'tests/data-integrity-audit.spec.ts',
  'tests/golden-path.spec.ts',
  'tests/investigation-export.spec.ts',
  'tests/route-ui-sync.spec.ts',
];

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

function checkCriticalSpecSkips(findings: Finding[]) {
  for (const spec of criticalSpecs) {
    const specLines = lines(spec);
    specLines.forEach((line, index) => {
      if (!/\btest\.skip\s*\(/.test(line)) return;
      const previous = specLines[index - 1] || '';
      const current = line;
      if (previous.includes('@release-skip-ok') || current.includes('@release-skip-ok')) return;
      addFinding(
        findings,
        spec,
        index,
        'release-critical test has an unannotated skip; use a deterministic fixture or document an explicit release exception',
      );
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
  checkCriticalSpecSkips(findings);
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
