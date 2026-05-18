/**
 * Detects SELECT * usage in production query surfaces that should use explicit column lists.
 *
 * SELECT * is blocked because it:
 * 1. Fetches columns that aren't needed (performance)
 * 2. Lets schema changes silently alter API/contracts
 * 3. Makes DTO and generated query contracts implicit
 *
 * Run: pnpm check:select-star
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const CHECK_TARGETS = [
  {
    label: 'server repositories',
    dir: join(process.cwd(), 'src', 'server', 'db'),
    extensions: ['.ts'],
    include: (filePath: string) =>
      !filePath.includes('migrations') && filePath.endsWith('Repository.ts'),
  },
  {
    label: 'package SQL queries',
    dir: join(process.cwd(), 'packages', 'db', 'src', 'queries'),
    extensions: ['.sql'],
    include: () => true,
  },
];

interface SelectStarIssue {
  file: string;
  line: number;
  context: string;
}

function checkFileForSelectStar(filePath: string): SelectStarIssue[] {
  const issues: SelectStarIssue[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (
        !trimmed ||
        trimmed.startsWith('--') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('*')
      ) {
        continue;
      }

      // Skip CTAS (CREATE TABLE AS SELECT) in migrations - these are schema ops
      if (filePath.includes('migrations')) {
        if (trimmed.includes('CREATE TABLE') && trimmed.includes('AS SELECT')) {
          continue;
        }
      }

      // Check for SELECT */alias.* and RETURNING * (but not COUNT(*) or arithmetic).
      const hasSelectStar = /\bSELECT\s+(?:[A-Za-z_][\w]*\.)?\*/i.test(trimmed);
      const hasReturningStar = /\bRETURNING\s+\*/i.test(trimmed);
      if (hasSelectStar || hasReturningStar) {
        // Exclude aggregate functions like COUNT(*), SUM(*), etc.
        if (
          trimmed.includes('COUNT(*)') ||
          trimmed.includes('SUM(*)') ||
          trimmed.includes('AVG(*)') ||
          trimmed.includes('MAX(*)') ||
          trimmed.includes('MIN(*)')
        ) {
          continue;
        }

        // Exclude subqueries like SELECT * FROM (SELECT...)
        if (trimmed.includes('SELECT * FROM (')) {
          continue;
        }

        issues.push({
          file: filePath.replace(process.cwd() + '/', ''),
          line: i + 1,
          context: line.trim().substring(0, 100),
        });
      }
    }
  } catch {
    // Skip files that can't be read
  }

  return issues;
}

function scanDirectory(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .git, migrations (handled separately)
        if (!entry.name.includes('node_modules') && !entry.name.includes('.git')) {
          files.push(...scanDirectory(fullPath, extensions));
        }
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip directories that can't be read
  }

  return files;
}

function main(): void {
  console.log('Checking for SELECT * usage in production query surfaces...\n');

  const files = CHECK_TARGETS.flatMap((target) => {
    if (!existsSync(target.dir)) {
      return [];
    }

    return scanDirectory(target.dir, target.extensions).filter(target.include);
  });

  const allIssues: SelectStarIssue[] = [];

  for (const file of files) {
    const issues = checkFileForSelectStar(file);
    allIssues.push(...issues);
  }

  if (allIssues.length > 0) {
    console.log('Found SELECT * or RETURNING * usage in production query surfaces:\n');

    for (const issue of allIssues) {
      console.log(`   ${issue.file}:${issue.line}`);
      console.log(`     └─ ${issue.context}`);
    }

    console.log('\n📝 Recommendations:');
    console.log('   - Replace SELECT * with explicit column list');
    console.log('   - This improves performance and makes DTO contracts explicit');
    console.log('   - Example: SELECT id, name, email FROM users');
    console.log('');

    process.exit(1);
  } else {
    console.log('No SELECT * usage found in production query surfaces\n');
    process.exit(0);
  }
}

main();
