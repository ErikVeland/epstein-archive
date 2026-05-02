import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const apiPort = Number(process.env.PW_API_PORT || 3312);
const webPort = Number(process.env.PW_WEB_PORT || 4173);
const localBaseUrl = `http://127.0.0.1:${webPort}`;
const localApiBaseUrl = `http://127.0.0.1:${apiPort}`;
const useProductionBaseUrl = process.env.PW_USE_PROD_BASE_URL === '1';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['query-count.test.ts', 'epstein-archive.spec.ts', 'unit/**', 'bundle-smoke.spec.ts'],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: useProductionBaseUrl
      ? 'https://epstein.academy'
      : process.env.PW_BASE_URL || localBaseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  /* Run your local dev server before starting the tests */
  webServer: useProductionBaseUrl
    ? []
    : [
        {
          command: `NODE_ENV=development VITE_API_URL=${localApiBaseUrl}/api pnpm exec vite --port ${webPort} --host 127.0.0.1 --strictPort`,
          port: webPort,
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
        {
          command: `NODE_ENV=development PORT=${apiPort} API_POOL_MAX=50 DISABLE_PG_SHED=1 SUBJECT_AGGREGATE_ENRICHMENT_LIMIT=0 npx -y tsx@latest src/server.ts`,
          url: `${localApiBaseUrl}/api/health`,
          reuseExistingServer: false,
          timeout: 120 * 1000,
        },
      ],
});
