import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'src/client');
const exceptionPath = path.join(rootDir, 'scripts/design-system-exceptions.json');

const rules = {
  deprecatedUiImports: /from\s+['"][^'"]*components\/ui(?:\/[^'"]+)?['"]/g,
  bannedPresentationClasses:
    /\b(surface-glass(?:-card|-header|-strong)?|glass-panel|app-header-glass|modal-header|control)\b/g,
  rawInteractiveElements: /<(button|input|select|textarea)\b/g,
  presentationalInlineStyles:
    /style\s*=\s*\{\{[^}]*\b(background|border|padding|margin|color|boxShadow|display|alignItems|justifyContent|textAlign|overflow)\b[^}]*\}\}/g,
  hardcodedColors: /#[0-9a-fA-F]{3,8}|rgba?\(|hsl\(/g,
};

function shouldIgnoreRule(relPath: string, rule: keyof typeof rules): boolean {
  // Design-system primitives intentionally wrap native controls; the audit is meant to
  // identify feature/product usage of raw elements, not the primitive implementations.
  if (
    rule === 'rawInteractiveElements' &&
    relPath.startsWith('src/client/design-system/components/')
  ) {
    return true;
  }
  return false;
}

type ExceptionRule =
  | 'deprecated-ui-import'
  | 'banned-presentation-class'
  | 'raw-interactive-element'
  | 'presentational-inline-style'
  | 'hardcoded-color';

interface ExceptionEntry {
  rule: ExceptionRule;
  pattern: string;
  owner: string;
  reason: string;
  expiresOn: string;
}

const exceptions: ExceptionEntry[] = fs.existsSync(exceptionPath)
  ? (JSON.parse(fs.readFileSync(exceptionPath, 'utf8')) as ExceptionEntry[])
  : [];

const exceptionRuleByAuditRule: Record<keyof typeof rules, ExceptionRule> = {
  deprecatedUiImports: 'deprecated-ui-import',
  bannedPresentationClasses: 'banned-presentation-class',
  rawInteractiveElements: 'raw-interactive-element',
  presentationalInlineStyles: 'presentational-inline-style',
  hardcodedColors: 'hardcoded-color',
};

function isExcepted(relPath: string, auditRule: keyof typeof rules): boolean {
  const exceptionRule = exceptionRuleByAuditRule[auditRule];
  return exceptions.some(
    (entry) => entry.rule === exceptionRule && relPath.includes(entry.pattern),
  );
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

const files = walk(clientDir);
const summary = Object.fromEntries(
  Object.keys(rules).map((rule) => [rule, { count: 0, files: [] as string[] }]),
) as Record<string, { count: number; files: string[] }>;

for (const filePath of files) {
  const relPath = path.relative(rootDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const [rule, pattern] of Object.entries(rules)) {
    if (shouldIgnoreRule(relPath, rule as keyof typeof rules)) continue;
    pattern.lastIndex = 0;
    if (pattern.test(content) && !isExcepted(relPath, rule as keyof typeof rules)) {
      summary[rule].count += 1;
      summary[rule].files.push(relPath);
    }
  }
}

console.log(JSON.stringify(summary, null, 2));
