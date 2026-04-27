import { spawnSync } from 'node:child_process';

/**
 * Run bundle-smoke Playwright tests.
 *
 * In strict CI (GitHub Actions or CI_STRICT_E2E=1), this fails closed.
 * In non-strict environments, it will gracefully skip when the host machine
 * cannot run browsers (missing shared libs) to avoid false-negative failures.
 */

const isStrict = process.env.GITHUB_ACTIONS === 'true' || process.env.CI_STRICT_E2E === '1';

const result = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', '--config', 'playwright.config.bundle.ts'],
  {
    stdio: 'pipe',
    encoding: 'utf-8',
    env: process.env,
  },
);

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');

if (result.status === 0) {
  process.exit(0);
}

const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
const isMissingDeps =
  combined.includes('Host system is missing dependencies to run browsers') ||
  combined.includes('Please run the following command to download new browsers') ||
  combined.includes("Executable doesn't exist at");

if (!isStrict && isMissingDeps) {
  // eslint-disable-next-line no-console
  console.warn(
    '[bundle-smoke] Skipping: Playwright browsers/deps not available in this environment.',
  );
  process.exit(0);
}

process.exit(result.status ?? 1);
