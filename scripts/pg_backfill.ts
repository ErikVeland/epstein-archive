import { execSync } from 'child_process';
import 'dotenv/config';

function main() {
  execSync('tsx scripts/unified_pipeline.ts --mode backfill', {
    stdio: 'inherit',
    env: process.env,
  });
}

try {
  main();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[pg_backfill] ${message}`);
  process.exit(1);
}
