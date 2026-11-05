import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { intelligenceRepository } from '../server/db/intelligenceRepository.js';
import { cacheService } from '../server/cache/cacheService.js';
import { intelligenceRoutes } from '../server/routes/intelligenceRoutes.js';

const data = {
  weakProvenanceDocs: [],
  lowOcrDocs: [],
  fuzzyEntityAliases: [],
  thinHighRiskEntities: [],
  unlinkedClaims: [],
  reviewableFinancialItems: [],
  counts: {
    weakProvenanceDocs: 2,
    lowOcrDocs: 0,
    fuzzyEntityAliases: 0,
    thinHighRiskEntities: 0,
    unlinkedClaims: 0,
    reviewableFinancialItems: 0,
  },
};
const app = express().use('/api/intelligence', intelligenceRoutes);
afterEach(() => {
  vi.restoreAllMocks();
  cacheService.flush();
});

describe('intelligence dashboard computation', () => {
  it('shares work between simultaneous requests', async () => {
    let finish!: (value: typeof data) => void;
    const fetchReview = vi.spyOn(intelligenceRepository, 'getFullReview').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const responses = Promise.all([
      request(app).get('/api/intelligence/review'),
      request(app).get('/api/intelligence/review'),
    ]);
    await vi.waitFor(() => expect(fetchReview).toHaveBeenCalled());
    expect(fetchReview).toHaveBeenCalledTimes(1);
    finish(data);
    expect((await responses).map((response) => response.body.counts.weakProvenanceDocs)).toEqual([
      2, 2,
    ]);
  });

  it('reports a timeout honestly and retains the eventual successful result', async () => {
    let finish!: (value: typeof data) => void;
    const fetchReview = vi.spyOn(intelligenceRepository, 'getFullReview').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const timedOut = await request(app).get('/api/intelligence/review');
    expect(timedOut.status).toBe(503);
    expect(timedOut.headers['retry-after']).toBe('5');
    finish(data);
    await new Promise((resolve) => setImmediate(resolve));
    const retry = await request(app).get('/api/intelligence/review');
    expect(retry.status).toBe(200);
    expect(retry.body.counts.weakProvenanceDocs).toBe(2);
    expect(fetchReview).toHaveBeenCalledTimes(1);
  }, 10_000);
});
