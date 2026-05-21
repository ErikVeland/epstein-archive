import { describe, expect, it } from 'vitest';
import { WorkerPool } from '../server/queue/index.js';

describe('WorkerPool', () => {
  it('tracks active work and drains completed tasks', async () => {
    const pool = new WorkerPool();
    const completed: number[] = [];

    pool.run(async () => {
      completed.push(1);
    });
    pool.run(async () => {
      completed.push(2);
    });

    expect(pool.size).toBe(2);
    expect(pool.hasCapacity(2)).toBe(false);
    expect(pool.hasCapacity(3)).toBe(true);

    await pool.drain();

    expect(pool.size).toBe(0);
    expect(completed.sort()).toEqual([1, 2]);
  });

  it('waits until capacity is available', async () => {
    const pool = new WorkerPool();
    let release!: () => void;

    pool.run(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const capacity = pool.waitForCapacity(1);
    let resolved = false;
    capacity.then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    release();
    await capacity;

    expect(resolved).toBe(true);
    expect(pool.size).toBe(0);
  });
});
