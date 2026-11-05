import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupService } from '../server/services/BackupService.js';

describe('completed backup discovery', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'epstein-backups-'));
    vi.stubEnv('POSTGRES_BACKUP_DIR', directory);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  });

  it('uses the configured shared directory and ignores incomplete or unrelated files', () => {
    writeFileSync(path.join(directory, 'backup-2026-11-05.zip'), 'completed synthetic archive');
    writeFileSync(path.join(directory, 'backup-2026-11-06.zip.partial'), 'in progress');
    writeFileSync(path.join(directory, 'backup-empty.zip'), '');
    writeFileSync(path.join(directory, 'unrelated.zip'), 'unrelated');
    mkdirSync(path.join(directory, 'backup-directory.zip'));
    expect(BackupService.listBackups()).toEqual([
      { filename: 'backup-2026-11-05.zip', size: 27, createdAt: expect.any(String) },
    ]);
  });
});
