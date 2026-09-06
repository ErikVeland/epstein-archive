import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getEntityById } = vi.hoisted(() => ({ getEntityById: vi.fn() }));

vi.mock('../server/db/entitiesRepository.js', () => ({
  entitiesRepository: { getEntityById },
}));
vi.mock('../server/db/mediaRepository.js', () => ({ mediaRepository: {} }));
vi.mock('../server/routes/subjectsRoutes.js', () => ({
  subjectsRouter: express.Router(),
}));

const { default: entitiesRoutes } = await import('../server/routes/entitiesRoutes.js');

const buildApp = () => {
  const app = express();
  app.use('/api/entities', entitiesRoutes);
  app.use(
    (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: error.message });
    },
  );
  return app;
};

describe('entity detail responses', () => {
  beforeEach(() => {
    getEntityById.mockReset();
  });

  it('preserves the real profile when loading takes more than five seconds', async () => {
    getEntityById.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                id: '3',
                fullName: 'Fixture Entity',
                mentions: 42,
                bio: 'Fixture biography',
              }),
            5100,
          ),
        ),
    );
    const response = await request(buildApp()).get('/api/entities/3');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: '3',
      fullName: 'Fixture Entity',
      mentions: 42,
      bio: 'Fixture biography',
    });
  }, 10000);

  it('returns 404 for a missing entity', async () => {
    getEntityById.mockResolvedValue(null);
    const response = await request(buildApp()).get('/api/entities/3');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Entity not found' });
  });

  it('reports a query failure instead of a successful empty profile', async () => {
    getEntityById.mockRejectedValue(new Error('Entity lookup failed'));
    const response = await request(buildApp()).get('/api/entities/3');
    expect(response.status).toBe(500);
    expect(response.body).not.toHaveProperty('fullName');
  });
});
