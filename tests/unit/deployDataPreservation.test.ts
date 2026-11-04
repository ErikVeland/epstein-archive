import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const fixtures: string[] = [];
const deploySource = readFileSync('deploy.sh', 'utf8');

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'archive-release-'));
  fixtures.push(root);
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.name', 'Test');
  git(root, 'config', 'user.email', 'test@example.invalid');
  mkdirSync(path.join(root, 'data'));
  writeFileSync(path.join(root, 'data/evidence.txt'), 'original evidence\n');
  writeFileSync(path.join(root, 'old-code.txt'), 'old\n');
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'Initial code and tracked data');
  const previous = git(root, 'rev-parse', 'HEAD');
  git(root, 'rm', '--quiet', '--cached', 'data/evidence.txt');
  git(root, 'rm', '--quiet', 'old-code.txt');
  writeFileSync(path.join(root, '.gitignore'), '/data\n');
  writeFileSync(path.join(root, 'new-code.txt'), 'new\n');
  git(root, 'add', '.');
  git(root, 'commit', '--quiet', '-m', 'Keep evidence outside Git');
  const current = git(root, 'rev-parse', 'HEAD');
  git(root, 'reset', '--hard', previous);
  writeFileSync(path.join(root, 'data/evidence.txt'), 'new local evidence\n');
  writeFileSync(path.join(root, 'data/untracked.txt'), 'local extraction\n');
  return { root, previous, current };
}

function checkout(root: string, target: string) {
  const definition = deploySource.match(/reset_code_preserving_data\(\) \{[\s\S]*?\n\}/)?.[0];
  expect(definition, 'the deployment must preserve local corpus files').toBeDefined();
  return spawnSync('bash', ['-c', `${definition}\nreset_code_preserving_data "$1"`, '--', target], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('release checkout', () => {
  it('preserves modified evidence when deploying and rolling back across corpus untracking', () => {
    const { root, previous, current } = fixture();
    for (const target of [current, previous, current]) {
      expect(checkout(root, target).status).toBe(0);
      git(root, 'clean', '-fd', '-e', 'data/');
      expect(git(root, 'rev-parse', 'HEAD')).toBe(target);
      expect(readFileSync(path.join(root, 'data/evidence.txt'), 'utf8')).toBe(
        'new local evidence\n',
      );
      expect(readFileSync(path.join(root, 'data/untracked.txt'), 'utf8')).toBe(
        'local extraction\n',
      );
    }
    expect(readFileSync(path.join(root, 'new-code.txt'), 'utf8')).toBe('new\n');
    expect(git(root, 'status', '--porcelain')).toBe('');
  });

  it('preserves a corpus symlink through checkout and deployment cleanup', () => {
    const { root, current } = fixture();
    const evidence = mkdtempSync(path.join(tmpdir(), 'archive-evidence-'));
    fixtures.push(evidence);
    writeFileSync(path.join(evidence, 'source.txt'), 'external evidence\n');
    rmSync(path.join(root, 'data'), { recursive: true });
    symlinkSync(evidence, path.join(root, 'data'));
    expect(checkout(root, current).status).toBe(0);
    const cleanCommand = deploySource.match(/^\s*git clean[^\n]+/m)?.[0];
    if (!cleanCommand) throw new Error('Deployment cleanup command is missing');
    expect(spawnSync('bash', ['-c', cleanCommand], { cwd: root }).status).toBe(0);
    expect(readFileSync(path.join(root, 'data/source.txt'), 'utf8')).toBe('external evidence\n');
    expect(git(root, 'status', '--porcelain')).toBe('');
  });

  it('leaves the checkout and evidence intact when the target does not exist', () => {
    const { root, previous } = fixture();
    expect(checkout(root, 'missing-release').status).not.toBe(0);
    expect(git(root, 'rev-parse', 'HEAD')).toBe(previous);
    expect(readFileSync(path.join(root, 'old-code.txt'), 'utf8')).toBe('old\n');
    expect(readFileSync(path.join(root, 'data/evidence.txt'), 'utf8')).toBe('new local evidence\n');
  });
});
