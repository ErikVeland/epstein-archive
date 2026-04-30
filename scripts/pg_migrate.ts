import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { reconcileHistoricalMigrationLedger } from '../src/server/db/migrator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'server', 'db', 'postgres', 'migrations');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  console.log('🚀 Running Postgres migrations...');

  try {
    await reconcileHistoricalMigrationLedger();

    // Self-healing: If investigation_leads exists but migration isn't recorded, record it.
    // This handles cases where a previous failed run created the table but didn't commit the ledger entry.
    const pool = (await import('../src/server/db/connection.js')).getApiPool();
    const leadsTable = await pool.query(
      "SELECT to_regclass('public.investigation_leads') as exists",
    );
    if (leadsTable.rows[0]?.exists) {
      await pool.query(
        "INSERT INTO pgmigrations (name, run_on) VALUES ('1754200000000_investigation_leads', NOW()) ON CONFLICT (name) DO NOTHING",
      );
      console.log('🩹 Reconciled investigation_leads migration entry.');
    }

    const command = `npx node-pg-migrate --migrations-dir "${MIGRATIONS_DIR}" --database-url "${connectionString}" up`;
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Postgres migrations completed successfully.');
  } catch (err) {
    console.error('❌ Postgres migration failed:', err);
    process.exit(1);
  }
}

runMigrations().catch(console.error);
