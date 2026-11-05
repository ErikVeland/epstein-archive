import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../server/revisionManager.js', () => ({ getRevisionTokenAsync: async () => 'synthetic' }));
import { apiCache, cacheResponse } from '../server/middleware/cache.js';

afterEach(() => apiCache.flushAll());

async function withServer(run: (base: string) => Promise<void>) {
  const app = express();
  for (const name of ['alpha', 'beta']) {
    const router = express.Router();
    router.get('/', cacheResponse(300), (req, res) =>
      res.json({ name, viewer: req.headers.authorization || 'public' }),
    );
    app.use(`/api/${name}`, router);
  }
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('shared response cache', () => {
  it('keeps mounted routes in separate cache entries', async () => {
    await withServer(async (base) => {
      expect(await (await fetch(`${base}/api/alpha`)).json()).toHaveProperty('name', 'alpha');
      expect(await (await fetch(`${base}/api/beta`)).json()).toHaveProperty('name', 'beta');
    });
  });
  it('does not reuse responses between signed-in viewers or public requests', async () => {
    await withServer(async (base) => {
      for (const viewer of ['Bearer synthetic-a', 'Bearer synthetic-b', '']) {
        const response = await fetch(`${base}/api/alpha`, {
          headers: viewer ? { Authorization: viewer } : {},
        });
        expect(await response.json()).toHaveProperty('viewer', viewer || 'public');
      }
    });
  });
});
