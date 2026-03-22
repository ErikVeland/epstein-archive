import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'src/server/db/postgres/migrations');
const migrationCutoff = 1754000000000;
const forbiddenPattern = /ON CONFLICT\s*\(id\)\s*DO NOTHING/gi;
const policyExemptFiles = new Set(['1754000000000_reconcile_restore_seed_conflicts.js']);

function listMigrationFiles(): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b));
}

function migrationTimestamp(fileName: string): number {
  const prefix = fileName.split('_')[0];
  const value = Number(prefix);
  return Number.isFinite(value) ? value : 0;
}

function main() {
  const violations: string[] = [];
  for (const fileName of listMigrationFiles()) {
    if (policyExemptFiles.has(fileName)) continue;
    const ts = migrationTimestamp(fileName);
    if (ts < migrationCutoff) continue;
    const fullPath = path.join(migrationsDir, fileName);
    const content = fs.readFileSync(fullPath, 'utf8');
    forbiddenPattern.lastIndex = 0;
    if (forbiddenPattern.test(content)) {
      violations.push(fileName);
    }
  }

  if (violations.length) {
    throw new Error(
      [
        'Seed conflict policy violation detected.',
        'Do not use ON CONFLICT (id) DO NOTHING in migrations created after the reconcile cutoff.',
        `Violating files: ${violations.join(', ')}`,
      ].join(' '),
    );
  }

  console.log('[seed-conflict-policy] OK');
}

main();
