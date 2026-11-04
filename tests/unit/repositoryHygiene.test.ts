import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const fixtures: string[] = [];
const scripts = path.resolve('scripts');

function fixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'archive-hygiene-'));
  fixtures.push(root);
  mkdirSync(path.join(root, 'scripts'));
  for (const script of ['check_hygiene.sh', 'cleanup_llm_artifacts.sh']) {
    writeFileSync(path.join(root, 'scripts', script), readFileSync(path.join(scripts, script)));
  }
  execFileSync('git', ['init', '--quiet', root]);
  return root;
}

function add(root: string, file: string): void {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), 'fixture\n');
  execFileSync('git', ['add', '--', file], { cwd: root });
}

function run(root: string, script: string) {
  return spawnSync('bash', [path.join(root, 'scripts', script)], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('repository hygiene', () => {
  it('rejects tracked session files and corpus files, including paths with spaces', () => {
    for (const file of [
      '.superpowers/session notes.md',
      '.kiro/specs/tasks.md',
      'data/text/a.txt',
      'public/data/people.json',
    ]) {
      const root = fixture();
      add(root, file);
      const result = run(root, 'check_hygiene.sh');
      expect(result.status, file).toBe(1);
      expect(result.stdout).toContain(file);
    }
  });

  it('rejects a staged artifact even when its working copy has been deleted', () => {
    const root = fixture();
    add(root, '.claude/session.md');
    rmSync(path.join(root, '.claude/session.md'));
    expect(run(root, 'check_hygiene.sh').status).toBe(1);
  });

  it('allows removal of a forbidden file from the index while keeping its local copy', () => {
    const root = fixture();
    add(root, 'docs/llm_handover/session.md');
    execFileSync('git', ['rm', '--cached', '--quiet', 'docs/llm_handover/session.md'], {
      cwd: root,
    });
    expect(run(root, 'check_hygiene.sh').status).toBe(0);
  });

  it('preserves the dependency store and local configuration during cleanup', () => {
    const root = fixture();
    for (const file of [
      '.pnpm-store/keep',
      '.claude/settings.json',
      '.env',
      'data/text/source.txt',
    ]) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), 'keep\n');
    }
    mkdirSync(path.join(root, 'docs/llm_handover'), { recursive: true });
    writeFileSync(path.join(root, 'docs/llm_handover/session.md'), 'remove\n');
    expect(run(root, 'cleanup_llm_artifacts.sh').status).toBe(0);
    for (const file of [
      '.pnpm-store/keep',
      '.claude/settings.json',
      '.env',
      'data/text/source.txt',
    ]) {
      expect(readFileSync(path.join(root, file), 'utf8')).toBe('keep\n');
    }
    expect(existsSync(path.join(root, 'docs/llm_handover/session.md'))).toBe(false);
    expect(run(root, 'cleanup_llm_artifacts.sh').status).toBe(0);
  });
});
