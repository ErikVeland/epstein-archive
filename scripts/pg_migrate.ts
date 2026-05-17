import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const command = `npx node-pg-migrate --migrations-dir "${MIGRATIONS_DIR}" --no-check-order up`;
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Postgres migrations completed successfully.');
  } catch (err) {
    console.error('❌ Postgres migration failed:', err);
    process.exit(1);
  }
}

runMigrations().catch(console.error);
