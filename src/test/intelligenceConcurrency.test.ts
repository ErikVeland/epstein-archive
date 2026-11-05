import { afterEach, describe, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../server/db/connection.js', () => ({ getApiPool: () => ({ query }) }));
import { intelligenceRepository } from '../server/db/intelligenceRepository.js';

afterEach(() => query.mockReset());

describe('intelligence dashboard database load', () => {
  it('keeps at most four queries active during a cold calculation', async () => {
    let active = 0;
    let peak = 0;
    query.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return { rows: [] };
    });
    await intelligenceRepository.getFullReview();
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('computes the high-risk preview and its exact total with one query', async () => {
    query.mockResolvedValue({ rows: [] });
    await intelligenceRepository.getFullReview();
    expect(
      query.mock.calls.filter(([sql]) => String(sql).includes("e.risk_level = 'HIGH'")),
    ).toHaveLength(1);
  });

  it('settles active queries before a failed calculation releases its retry', async () => {
    let active = 0;
    let peak = 0;
    let paused = true;
    let failNext = true;
    const finishes: Array<() => void> = [];
    const failure = new Error('Synthetic dashboard failure');
    query.mockImplementation(async (sql: string) => {
      active += 1;
      peak = Math.max(peak, active);
      try {
        if (sql.includes("e.risk_level = 'HIGH'") && failNext) {
          failNext = false;
          throw failure;
        }
        if (paused) await new Promise<void>((resolve) => finishes.push(resolve));
        else await new Promise((resolve) => setTimeout(resolve, 5));
        return { rows: [] };
      } finally {
        active -= 1;
      }
    });
    let settled = false;
    const pending = intelligenceRepository
      .getFullReview()
      .then(
        () => null,
        (error: unknown) => error,
      )
      .then((result) => {
        settled = true;
        return result;
      });
    await new Promise((resolve) => setImmediate(resolve));
    const settledEarly = settled;
    paused = false;
    finishes.forEach((finish) => finish());
    expect(await pending).toBe(failure);
    await intelligenceRepository.getFullReview();
    expect(settledEarly).toBe(false);
    expect(peak).toBeLessThanOrEqual(4);
  });
});
