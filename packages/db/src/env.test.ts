import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readEnvStrict } from './env.js';

const VALID_PG_URL = 'postgresql://user:pass@localhost:5432/epstein';

const ENV_KEYS = [
  'DATABASE_URL',
  'NODE_ENV',
  'API_POOL_MAX',
  'INGEST_POOL_MAX',
  'MAINTENANCE_POOL_MAX',
  'CONNECT_TIMEOUT',
] as const;

type SavedEnv = Partial<Record<(typeof ENV_KEYS)[number], string>>;

describe('readEnvStrict', () => {
  let saved: SavedEnv = {};

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]])) as SavedEnv;
    ENV_KEYS.forEach((k) => delete process.env[k]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (saved[k] !== undefined) process.env[k] = saved[k];
      else delete process.env[k];
    });
    vi.restoreAllMocks();
  });

  it('parses a valid env and returns typed values', () => {
    process.env.DATABASE_URL = VALID_PG_URL;
    process.env.NODE_ENV = 'test';
    const env = readEnvStrict();
    expect(env.DATABASE_URL).toBe(VALID_PG_URL);
    expect(env.NODE_ENV).toBe('test');
    expect(typeof env.API_POOL_MAX).toBe('number');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => readEnvStrict()).toThrow('Invalid environment configuration');
  });

  it('throws when DATABASE_URL is not a postgres URL', () => {
    process.env.DATABASE_URL = 'http://not-postgres/db';
    expect(() => readEnvStrict()).toThrow('Invalid environment configuration');
  });

  it('throws when a pool size is not numeric', () => {
    process.env.DATABASE_URL = VALID_PG_URL;
    process.env.API_POOL_MAX = 'not-a-number';
    expect(() => readEnvStrict()).toThrow('Invalid environment configuration');
  });

  it('coerces string pool sizes to numbers', () => {
    process.env.DATABASE_URL = VALID_PG_URL;
    process.env.API_POOL_MAX = '8';
    const env = readEnvStrict();
    expect(env.API_POOL_MAX).toBe(8);
    expect(typeof env.API_POOL_MAX).toBe('number');
  });

  it('applies defaults when optional vars are omitted', () => {
    process.env.DATABASE_URL = VALID_PG_URL;
    const env = readEnvStrict();
    expect(env.API_POOL_MAX).toBe(18);
    expect(env.INGEST_POOL_MAX).toBe(8);
    expect(env.MAINTENANCE_POOL_MAX).toBe(2);
    expect(env.CONNECT_TIMEOUT).toBe(5000);
    expect(env.NODE_ENV).toBe('development');
  });
});
