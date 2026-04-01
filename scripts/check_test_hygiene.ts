import path from 'path';
import { fileURLToPath } from 'url';

import { globSync } from 'glob';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tsconfigPath = path.join(rootDir, 'tsconfig.json');
const testPatterns = [
  'src/test/**/*.test.ts',
  'tests/unit/**/*.test.ts',
  'tests/query-count.test.ts',
];

function loadCompilerOptions(): ts.CompilerOptions {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  }

  const parsed = ts.parseJsonConfigFileContent(
    {
      compilerOptions: configFile.config.compilerOptions,
      include: [],
      exclude: ['node_modules', 'dist'],
    },
    ts.sys,
    rootDir,
    undefined,
    tsconfigPath,
  );

  return {
    ...parsed.options,
    noEmit: true,
    types: ['node'],
  };
}

function collectTestFiles(): string[] {
  return globSync(testPatterns, {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
  })
    .map((filePath) => path.resolve(filePath))
    .sort();
}

function hasVitestImport(sourceFile: ts.SourceFile): boolean {
  return sourceFile.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'vitest',
  );
}

function callName(node: ts.CallExpression): string | null {
  const { expression } = node;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const left = ts.isIdentifier(expression.expression) ? expression.expression.text : null;
    if (!left) return null;
    return `${left}.${expression.name.text}`;
  }
  return null;
}

function validateTestShape(sourceFile: ts.SourceFile): string[] {
  let hasSuite = false;
  let hasCase = false;
  const violations: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const name = callName(node);
      if (name === 'describe') hasSuite = true;
      if (name === 'it' || name === 'test') hasCase = true;
      if (
        name === 'describe.skip' ||
        name === 'describe.only' ||
        name === 'it.skip' ||
        name === 'it.only' ||
        name === 'test.skip' ||
        name === 'test.only'
      ) {
        violations.push(`focused/skipped test API is forbidden (${name})`);
      }
    }

    if (ts.isIdentifier(node) && ['xdescribe', 'xit', 'xtest'].includes(node.text)) {
      violations.push(`disabled test alias is forbidden (${node.text})`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (!hasVitestImport(sourceFile)) {
    violations.push('must import test APIs explicitly from "vitest"');
  }
  if (!hasSuite && !hasCase) {
    violations.push('must define at least one describe/it/test call');
  }

  return violations;
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (!diagnostic.file || diagnostic.start == null) return message;
  const relativePath = path.relative(rootDir, diagnostic.file.fileName);
  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${relativePath}:${line + 1}:${character + 1} ${message}`;
}

function main() {
  const testFiles = collectTestFiles();
  if (testFiles.length === 0) {
    throw new Error('No test files matched the hygiene guard');
  }

  const compilerOptions = loadCompilerOptions();
  const program = ts.createProgram({
    rootNames: testFiles,
    options: compilerOptions,
  });

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) =>
        !diagnostic.file || testFiles.includes(path.resolve(diagnostic.file.fileName)),
    );

  const shapeViolations: string[] = [];
  for (const testFile of testFiles) {
    const sourceFile = program.getSourceFile(testFile);
    if (!sourceFile) {
      shapeViolations.push(`${path.relative(rootDir, testFile)}: could not read source file`);
      continue;
    }

    const fileViolations = validateTestShape(sourceFile);
    for (const violation of fileViolations) {
      shapeViolations.push(`${path.relative(rootDir, testFile)}: ${violation}`);
    }
  }

  if (diagnostics.length || shapeViolations.length) {
    const parts: string[] = [];
    if (diagnostics.length) {
      parts.push(diagnostics.map(formatDiagnostic).join('\n'));
    }
    if (shapeViolations.length) {
      parts.push(shapeViolations.join('\n'));
    }
    throw new Error(parts.join('\n'));
  }

  console.log(`[test-hygiene] OK (${testFiles.length} files)`);
}

main();
