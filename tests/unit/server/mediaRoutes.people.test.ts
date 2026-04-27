import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const addPersonToItemMock = vi.fn(async () => undefined);

vi.mock('../../../src/server/auth/middleware.js', () => {
  return {
    authenticateRequest: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

vi.mock('../../../src/server/services/MediaService.js', () => {
  return {
    MediaService: class MediaServiceMock {
      // eslint-disable-next-line @typescript-eslint/no-useless-constructor
      constructor(_db: unknown) {}
      addPersonToItem = addPersonToItemMock;
    },
  };
});

// Keep other imports real; we only care about request parsing + wiring to MediaService.

describe('mediaRoutes people tagging payloads', () => {
  beforeEach(() => {
    addPersonToItemMock.mockClear();
  });

  const buildApp = async () => {
    const router = (await import('../../../src/server/routes/mediaRoutes.js')).default;
    const app = express();
    app.use(express.json());
    app.use('/api/media', router);
    // Minimal error handler to surface failures
    app.use(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ error: String(err?.message || err) });
      },
    );
    return app;
  };

  it('accepts canonical payload { personId }', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/media/images/123/people').send({ personId: 456 });
    expect(res.status).toBe(200);
    expect(addPersonToItemMock).toHaveBeenCalledWith(123, 456);
  });

  it('accepts legacy payload { entityId } (backward compatibility)', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/media/images/123/people').send({ entityId: 456 });
    expect(res.status).toBe(200);
    expect(addPersonToItemMock).toHaveBeenCalledWith(123, 456);
  });
});
