import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'knip-baseline.txt');

const normalize = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.startsWith('Unused dependencies ('))
    .filter((line) => !line.startsWith('Unused devDependencies ('))
    .filter((line) => !line.startsWith('Unused files ('))
    .sort();

if (!fs.existsSync(baselinePath)) {
  console.error(
    '[knip-baseline] Missing knip-baseline.txt. Generate it from reviewed output first.',
  );
  process.exit(1);
}

const result = spawnSync('pnpm', ['exec', 'knip', '--production', '--reporter', 'compact'], {
  cwd: root,
  encoding: 'utf8',
});

if (result.error) {
  console.error(`[knip-baseline] Failed to run knip: ${result.error.message}`);
  process.exit(1);
}

const currentOutput = `${result.stdout || ''}${result.stderr || ''}`.trim();
const baseline = new Set(normalize(fs.readFileSync(baselinePath, 'utf8')));
const current = normalize(currentOutput);
const additions = current.filter((line) => !baseline.has(line));

if (additions.length > 0) {
  console.error('[knip-baseline] New unused-code/dependency findings detected:');
  for (const line of additions) console.error(`  ${line}`);
  console.error('');
  console.error('Fix the new finding or intentionally update knip-baseline.txt after review.');
  process.exit(1);
}

console.log(`[knip-baseline] OK (${current.length} current findings covered by baseline)`);
