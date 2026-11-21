import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'child_process';
import { logger } from './Logger.js';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

export class BackupService {
  private static get BACKUP_DIR(): string {
    return process.env.POSTGRES_BACKUP_DIR || path.join(process.cwd(), 'backups');
  }

  private static ensureBackupDir() {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
  }

  static async createBackup(): Promise<string> {
    this.ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipPath = path.join(this.BACKUP_DIR, `backup-${timestamp}.zip`);
    const partialPath = `${zipPath}.partial`;

    logger.info(`[BackupService] Starting Postgres backup to ${zipPath}...`);

    try {
      await this.writeBackup(partialPath, `snapshot-${timestamp}.dump`);
      fs.renameSync(partialPath, zipPath);

      this.rotateBackups();

      logger.info(`[BackupService] Backup completed: ${zipPath}`);
      return zipPath;
    } catch (error) {
      logger.error({ err: error }, '[BackupService] Backup failed');
      if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath);
      throw error;
    }
  }

  static listBackups(): BackupInfo[] {
    this.ensureBackupDir();

    return fs
      .readdirSync(this.BACKUP_DIR)
      .filter((file) => file.startsWith('backup-') && file.endsWith('.zip'))
      .map((file) => {
        const stats = fs.statSync(path.join(this.BACKUP_DIR, file));
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
          isFile: stats.isFile(),
        };
      })
      .filter((backup) => backup.isFile && backup.size > 0)
      .map(({ filename, size, createdAt }) => ({ filename, size, createdAt }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private static rotateBackups() {
    for (const backup of this.listBackups().slice(2)) {
      try {
        fs.unlinkSync(path.join(this.BACKUP_DIR, backup.filename));
        logger.info(`[BackupService] Rotated old backup: ${backup.filename}`);
      } catch (e) {
        logger.error({ err: e }, `[BackupService] Failed to rotate backup ${backup.filename}`);
      }
    }
  }

  private static async writeBackup(destination: string, entryName: string): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is required for Postgres backup');
    }

    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, '');
    const host = parsed.hostname || 'localhost';
    const port = parsed.port || '5432';
    const user = decodeURIComponent(parsed.username || '');

    const env = { ...process.env };
    if (parsed.password) {
      env.PGPASSWORD = decodeURIComponent(parsed.password);
    }

    const args = ['-h', host, '-p', port, '-U', user, '-F', 'c', database];

    const child = spawn('pg_dump', args, { env, stdio: ['ignore', 'pipe', 'inherit'] });
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(destination, { mode: 0o600 });
    const written = pipeline(archive, output);
    const dumped = new Promise<void>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`pg_dump exited with code ${code}`));
      });
    });

    try {
      archive.append(child.stdout, { name: entryName });
      await Promise.all([dumped, written, archive.finalize()]);
    } catch (error) {
      child.kill();
      child.stdout.destroy();
      archive.destroy();
      output.destroy();
      await Promise.allSettled([dumped, written]);
      throw error;
    }
  }
}
