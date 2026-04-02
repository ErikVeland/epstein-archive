import { BackupService } from '../src/server/services/BackupService.js';
import { IngestRunsRepository } from '../src/server/db/ingestRunsRepository.js';

async function verifyOps() {
  console.log('--- Phase 4: Ops & Observability Verification ---');

  // 1. Test BackupService
  console.log('\n[1/3] Testing BackupService...');
  try {
    const backupPath = await BackupService.createBackup();
    console.log('✅ Backup created successfully at:', backupPath);
    const backups = BackupService.listBackups();
    console.log('✅ Backup list retrieved:', backups.length, 'backups found.');
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('❌ BackupService test failed:', message);
  }

  // 2. Test IngestRunsRepository
  console.log('\n[2/3] Testing IngestRunsRepository...');
  try {
    const runs = await IngestRunsRepository.getRuns(5);
    console.log('✅ Successfully fetched', runs.length, 'ingest runs.');
    if (runs.length > 0) {
      console.log('Latest Run ID:', runs[0].id, 'Status:', runs[0].status);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('❌ IngestRunsRepository test failed:', message);
  }

  // 3. Test FTS Integrity (Skipped - Handled by Postgres Triggers)
  console.log('\n[3/3] Testing FTS Integrity Check...');
  console.log('ℹ️  Skipping: FTS is now managed by Postgres triggers internally.');

  console.log('\n--- Verification Complete ---');
}

verifyOps().catch(console.error);
