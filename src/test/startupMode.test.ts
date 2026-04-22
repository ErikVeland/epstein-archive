import { describe, expect, it } from 'vitest';

import { isDegradedModeEnabled, shouldBootInDegradedMode } from '../server/utils/startupMode.js';

describe('startupMode', () => {
  it('boots in degraded mode for local development without a database URL', () => {
    expect(
      shouldBootInDegradedMode({
        NODE_ENV: 'development',
      }),
    ).toBe(true);
  });

  it('does not boot in degraded mode when a database URL is configured', () => {
    expect(
      shouldBootInDegradedMode({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://localhost/example',
      }),
    ).toBe(false);
  });

  it('never enables degraded boot in production', () => {
    expect(
      shouldBootInDegradedMode({
        NODE_ENV: 'production',
      }),
    ).toBe(false);
  });

  it('recognizes an explicit degraded mode flag', () => {
    expect(
      isDegradedModeEnabled({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://localhost/example',
        DEGRADED_MODE: '1',
      }),
    ).toBe(true);
  });
});
