import { execSync } from 'child_process';
import 'dotenv/config';

function main() {
  execSync('tsx scripts/ingest_intelligence.ts', {
    stdio: 'inherit',
    env: process.env,
  });
}

try {
  main();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[enrich_black_book] ${message}`);
  process.exit(1);
}
