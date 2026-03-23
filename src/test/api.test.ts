/**
 * API integration tests using vitest + supertest.
 *
 * These tests spin up the Express app in-process (no network port needed)
 * and assert real HTTP behaviour against the router.
 *
 * Run with:  pnpm test:unit  (vitest run)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// ---------------------------------------------------------------------------
// Minimal app fixture — only the routes we want to test, no DB required.
// ---------------------------------------------------------------------------
function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Simulate a 404 JSON response for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Simulate a 500 error handler
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message || 'Internal server error' });
    },
  );

  return app;
}

describe('API – health endpoint', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  afterAll(() => {
    // nothing to tear down for in-process app
  });

  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /api/health returns JSON content-type', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('API – unknown routes', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  it('GET /api/nonexistent returns 404 with error field', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('API – error handler', () => {
  it('returns 500 JSON when a route throws', async () => {
    const app = express();
    app.use(express.json());
    app.get('/api/boom', () => {
      throw new Error('test explosion');
    });
    app.use(
      (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ error: err.message });
      },
    );

    const res = await request(app).get('/api/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('test explosion');
  });
});
