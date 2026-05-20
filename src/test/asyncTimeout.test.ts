import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTimeoutFallback, withTimeoutReject } from '../server/utils/asyncTimeout.js';

describe('withTimeoutFallback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the original value when the promise resolves before the timeout', async () => {
    await expect(
      withTimeoutFallback(Promise.resolve('ok'), 'fallback', { timeoutMs: 1000 }),
    ).resolves.toBe('ok');
  });

  it('returns the fallback and invokes the timeout callback after the deadline', async () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    const result = withTimeoutFallback(new Promise<string>(() => {}), 'fallback', {
      timeoutMs: 1000,
      onTimeout,
    });

    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBe('fallback');
    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it('propagates rejection from the original promise', async () => {
    await expect(
      withTimeoutFallback(Promise.reject(new Error('boom')), 'fallback', { timeoutMs: 1000 }),
    ).rejects.toThrow('boom');
  });

  it('rejects and runs timeout recovery after the deadline', async () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn().mockResolvedValue(undefined);

    const result = expect(
      withTimeoutReject(new Promise<string>(() => {}), {
        timeoutMs: 1000,
        timeoutMessage: 'timed out',
        onTimeout,
      }),
    ).rejects.toThrow('timed out');

    await vi.advanceTimersByTimeAsync(1000);

    await result;
    expect(onTimeout).toHaveBeenCalledOnce();
  });
});
