import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { statsRepository } from '../server/db/statsRepository.js';
import { cacheService } from '../server/cache/cacheService.js';
vi.mock('../server/revisionManager.js', () => ({ getRevisionTokenAsync: async () => 'synthetic' }));

describe('public statistics calculations', async () => {
  vi.stubEnv('JWT_SECRET', 'statistics-regression-test');
  const { default: routes } = await import('../server/routes/stats.js');
  const app = express().use('/api/stats', routes);
  const healthy = {
    totalEntities: 20,
    totalDocuments: 30,
    collectionStats: { data: [], degraded: false },
  };
  const degraded = { ...healthy, collectionStats: { data: [], degraded: true } };
  type Statistics = Awaited<ReturnType<typeof statsRepository.getStatistics>>;
  afterEach(() => {
    vi.restoreAllMocks();
    cacheService.flush();
  });

  it('shares public calculations across concurrent viewer sessions', async () => {
    let finish!: (value: Statistics) => void;
    const calculate = vi.spyOn(statsRepository, 'getStatistics').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const responses = Promise.all(
      ['one', 'two', 'three'].map((viewer) =>
        request(app).get('/api/stats').set('Cookie', `viewer=${viewer}`),
      ),
    );
    await vi.waitFor(() => expect(calculate).toHaveBeenCalled());
    const calls = calculate.mock.calls.length;
    finish(healthy as Statistics);
    const values = await responses;
    expect(calls).toBe(1);
    expect(values.every((value) => value.body.totalDocuments === 30)).toBe(true);
  });

  it('saves the complete result after an HTTP deadline', async () => {
    let finish!: (value: Statistics) => void;
    const calculate = vi.spyOn(statsRepository, 'getStatistics').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.spyOn(statsRepository, 'getMinimumStatistics').mockResolvedValue(
      degraded as Awaited<ReturnType<typeof statsRepository.getMinimumStatistics>>,
    );
    const fallback = await request(app).get('/api/stats').set('Cookie', 'viewer=one');
    expect(fallback.body._meta.degraded).toBe(true);
    finish(healthy as Statistics);
    await new Promise((resolve) => setImmediate(resolve));
    const retry = await request(app).get('/api/stats').set('Cookie', 'viewer=two');
    expect(retry.body._meta.degraded).toBe(false);
    expect(calculate).toHaveBeenCalledTimes(1);
  }, 10000);

  it('does not retain degraded aggregate results as healthy statistics', async () => {
    const calculate = vi
      .spyOn(statsRepository, 'getStatistics')
      .mockResolvedValueOnce(degraded as Statistics)
      .mockResolvedValueOnce(healthy as Statistics);
    const first = await request(app).get('/api/stats').set('Cookie', 'viewer=one');
    const second = await request(app).get('/api/stats').set('Cookie', 'viewer=two');
    expect(first.body._meta.degraded).toBe(true);
    expect(second.body._meta.degraded).toBe(false);
    expect(calculate).toHaveBeenCalledTimes(2);
  });
});
