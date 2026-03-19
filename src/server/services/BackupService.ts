import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { spawn } from 'child_process';
import { logger } from './Logger.js';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

export class BackupService {
  private static BACKUP_DIR = path.join(process.cwd(), 'backups');

  private static ensureBackupDir() {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
  }

  static async createBackup(): Promise<string> {
    this.ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(this.BACKUP_DIR, `snapshot-${timestamp}.dump`);
    const zipPath = path.join(this.BACKUP_DIR, `backup-${timestamp}.zip`);

    logger.info(`[BackupService] Starting Postgres backup to ${snapshotPath}...`);

    try {
      await this.runPgDump(snapshotPath);

      logger.info(`[BackupService] Snapshot created. Compressing to ${zipPath}...`);

      await this.compressFile(snapshotPath, zipPath);

      if (fs.existsSync(snapshotPath)) {
        fs.unlinkSync(snapshotPath);
      }

      this.rotateBackups();

      logger.info(`[BackupService] Backup completed: ${zipPath}`);
      return zipPath;
    } catch (error) {
      logger.error({ err: error }, '[BackupService] Backup failed');
      if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
      throw error;
    }
  }

  static listBackups(): BackupInfo[] {
    this.ensureBackupDir();

    return fs
      .readdirSync(this.BACKUP_DIR)
      .filter((file) => file.endsWith('.zip'))
      .map((file) => {
        const stats = fs.statSync(path.join(this.BACKUP_DIR, file));
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private static compressFile(source: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destination);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.file(source, { name: path.basename(source) });
      archive.finalize();
    });
  }

  private static rotateBackups() {
    const backups = this.listBackups();
    if (backups.length > 7) {
      const toDelete = backups.slice(7);
      for (const backup of toDelete) {
        try {
          fs.unlinkSync(path.join(this.BACKUP_DIR, backup.filename));
          logger.info(`[BackupService] Rotated old backup: ${backup.filename}`);
        } catch (e) {
          logger.error({ err: e }, `[BackupService] Failed to rotate backup ${backup.filename}`);
        }
      }
    }
  }

  private static runPgDump(outputPath: string): Promise<void> {
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

    const args = ['-h', host, '-p', port, '-U', user, '-F', 'c', '-f', outputPath, database];

    return new Promise((resolve, reject) => {
      const child = spawn('pg_dump', args, { env });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });
    });
  }
}
