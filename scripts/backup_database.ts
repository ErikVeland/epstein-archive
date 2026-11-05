import 'dotenv/config';
import { BackupService } from '../src/server/services/BackupService.js';

try {
  const backupPath = await BackupService.createBackup();
  console.log(`Database backup completed: ${backupPath}`);
} catch {
  process.exitCode = 1;
}
