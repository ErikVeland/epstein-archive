import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const { interactiveQuery, maintenanceQuery } = vi.hoisted(() => ({
  interactiveQuery: vi.fn(),
  maintenanceQuery: vi.fn(),
}));
vi.mock('../server/db/connection.js', () => ({
  getApiPool: () => ({
    query: interactiveQuery,
    connect: async () => ({ query: async () => ({ rows: [] }), release: () => undefined }),
  }),
  getMaintenancePool: () => ({
    query: maintenanceQuery,
    connect: async () => {
      throw new Error('Synthetic aggregate failure');
    },
  }),
}));
import { statsRepository } from '../server/db/statsRepository.js';
import { cacheService } from '../server/cache/cacheService.js';

afterEach(() => {
  vi.restoreAllMocks();
  cacheService.flush();
  interactiveQuery.mockReset();
  maintenanceQuery.mockReset();
});

describe('statistics pool isolation', () => {
  it('keeps pending corpus aggregates out of interactive connections', async () => {
    const finishes: Array<() => void> = [];
    let active = 0;
    let peak = 0;
    let paused = true;
    interactiveQuery.mockResolvedValue({ rows: [] });
    maintenanceQuery.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      if (paused) await new Promise<void>((resolve) => finishes.push(resolve));
      active -= 1;
      return { rows: [] };
    });
    vi.spyOn(statsRepository, 'getCachedPipelineProgress').mockResolvedValue({});
    const pending = statsRepository.getStatistics();
    await new Promise((resolve) => setImmediate(resolve));
    const interactiveCallsWhilePending = interactiveQuery.mock.calls.length;
    paused = false;
    finishes.forEach((finish) => finish());
    await pending;
    expect(interactiveCallsWhilePending).toBe(0);
    expect(maintenanceQuery).toHaveBeenCalled();
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('shares internal minimum totals with an overlapping HTTP timeout', async () => {
    vi.stubEnv('JWT_SECRET', 'statistics-pool-regression-test');
    const { default: routes } = await import('../server/routes/stats.js');
    const app = express().use('/api/stats', routes);
    const finishes: Array<() => void> = [];
    maintenanceQuery.mockResolvedValue({ rows: [] });
    let paused = true;
    interactiveQuery.mockImplementation(async () => {
      if (paused) await new Promise<void>((resolve) => finishes.push(resolve));
      return { rows: [] };
    });
    vi.spyOn(statsRepository, 'getCachedPipelineProgress').mockResolvedValue({});
    const pending = Promise.resolve(
      request(app).get('/api/stats').set('Cookie', 'viewer=synthetic'),
    );
    await vi.waitFor(() => expect(interactiveQuery).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 5100));
    paused = false;
    finishes.forEach((finish) => finish());
    const response = await pending;
    expect(response.body._meta.degraded).toBe(true);
    expect(interactiveQuery).toHaveBeenCalledTimes(6);
  }, 10000);
});
