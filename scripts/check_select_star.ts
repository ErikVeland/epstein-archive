/**
 * Detects SELECT * usage in repository files that should use explicit column lists.
 *
 * This is a soft warning - SELECT * is not ideal because:
 * 1. Fetches columns that aren't needed (performance)
 * 2. Schema changes can silently break assumptions
 * 3. Makes DTO contracts less explicit
 *
 * Run: pnpm exec tsx scripts/check_select_star.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const REPO_DIR = join(process.cwd(), 'src', 'server', 'db');

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

      // Skip CTAS (CREATE TABLE AS SELECT) in migrations - these are schema ops
      if (filePath.includes('migrations')) {
        if (trimmed.includes('CREATE TABLE') && trimmed.includes('AS SELECT')) {
          continue;
        }
      }

      // Check for SELECT * (but not SELECT COUNT(*) or other aggregates)
      if (trimmed.startsWith('SELECT') && trimmed.includes('*')) {
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
  console.log('🔍 Checking for SELECT * usage in repositories...\n');

  // Only check production repository files (not migrations)
  const files = [
    ...scanDirectory(REPO_DIR, ['.ts']).filter(
      (f) => !f.includes('migrations') && f.endsWith('Repository.ts'),
    ),
  ];

  const allIssues: SelectStarIssue[] = [];

  for (const file of files) {
    const issues = checkFileForSelectStar(file);
    allIssues.push(...issues);
  }

  if (allIssues.length > 0) {
    console.log('⚠️  Found SELECT * usage in repositories:\n');

    for (const issue of allIssues) {
      console.log(`   ${issue.file}:${issue.line}`);
      console.log(`     └─ ${issue.context}`);
    }

    console.log('\n📝 Recommendations:');
    console.log('   - Replace SELECT * with explicit column list');
    console.log('   - This improves performance and makes DTO contracts explicit');
    console.log('   - Example: SELECT id, name, email FROM users');
    console.log('');

    // Exit with warning but not failure (this is technical debt, not a critical bug)
    process.exit(0);
  } else {
    console.log('✅ No SELECT * usage found in repositories\n');
    process.exit(0);
  }
}

main();
