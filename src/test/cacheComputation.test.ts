import { describe, expect, it, vi } from 'vitest';
import { CacheService } from '../server/cache/cacheService.js';
import { waitForAll, runConcurrent } from '../server/utils/asyncWork.js';

describe('cached calculations', () => {
  it('keeps concurrent task results in input order', async () => {
    const result = await runConcurrent(
      [
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'first';
        },
        async () => 42,
      ],
      2,
    );
    expect(result).toEqual(['first', 42]);
  });

  it('rejects a task limit that would leave work undispatched', async () => {
    await expect(runConcurrent([async () => 1], 0)).rejects.toThrow(
      'Concurrency must be a positive integer.',
    );
  });

  it('can share a degraded result without caching it', async () => {
    const cache = new CacheService();
    const compute = vi
      .fn<() => Promise<{ degraded: boolean }>>()
      .mockResolvedValueOnce({ degraded: true })
      .mockResolvedValueOnce({ degraded: false });
    await cache.getOrCompute('query', 'synthetic', compute, 60, (value) => !value.degraded);
    expect(
      await cache.getOrCompute('query', 'synthetic', compute, 60, (value) => !value.degraded),
    ).toEqual({ degraded: false });
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed calculation pending until its other work settles', async () => {
    const cache = new CacheService();
    let finish!: () => void;
    const failure = new Error('Synthetic calculation failure');
    const compute = vi.fn(() =>
      waitForAll([
        Promise.reject(failure),
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
      ]),
    );
    const first = cache
      .getOrCompute('query', 'synthetic', compute)
      .catch((error: unknown) => error);
    await new Promise((resolve) => setImmediate(resolve));
    const second = cache
      .getOrCompute('query', 'synthetic', compute)
      .catch((error: unknown) => error);
    expect(compute).toHaveBeenCalledTimes(1);
    finish();
    expect(await first).toBe(failure);
    expect(await second).toBe(failure);
  });
});
