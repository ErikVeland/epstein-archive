import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mediaRepository } from '../server/db/mediaRepository.js';

vi.mock('../server/db/connection.js', () => ({
  getApiPool: () => ({ query: async () => ({ rows: [{ canonical_id: '42' }] }) }),
}));

describe('entity media response state', async () => {
  const { default: routes } = await import('../server/routes/entityEvidenceRoutes.js');
  const app = express().use('/api/entities', routes);
  afterEach(() => vi.restoreAllMocks());

  it('returns an empty list only for a completed empty query', async () => {
    vi.spyOn(mediaRepository, 'getMediaItems').mockResolvedValue([]);
    const response = await request(app).get('/api/entities/42/media');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns a retryable failure instead of claiming that timed-out media is absent', async () => {
    vi.spyOn(mediaRepository, 'getMediaItems').mockImplementation(
      () => new Promise(() => undefined),
    );
    const response = await request(app).get('/api/entities/42/media');
    expect(response.status).toBe(503);
    expect(response.headers['retry-after']).toBe('5');
    expect(response.body.error.code).toBe('ENTITY_MEDIA_TIMEOUT');
  }, 10_000);
});
