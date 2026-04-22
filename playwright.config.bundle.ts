import { defineConfig, devices } from '@playwright/test';

/**
 * Production bundle smoke test config.
 *
 * Runs against `vite preview` (the built dist/) instead of the dev server.
 * This catches bundle-level errors (TDZ, chunk initialization order, missing dedupe)
 * that are invisible in dev mode because Vite serves modules individually there.
 *
 * Usage:
 *   pnpm test:bundle-smoke        # build + smoke
 *   pnpm test:bundle-smoke:only   # smoke only (reuse existing dist/)
 */

const previewPort = 4175; // distinct from dev (3002) and default preview (4173)

export default defineConfig({
  testDir: './tests',
  testMatch: ['bundle-smoke.spec.ts'],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-bundle',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec vite preview --port ${previewPort} --host 127.0.0.1 --strictPort`,
    port: previewPort,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
