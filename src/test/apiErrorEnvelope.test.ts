import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { apiErrorEnvelopeMiddleware } from '../server/middleware/apiErrorEnvelope.js';
import { requestIdMiddleware } from '../server/middleware/requestId.js';

const buildApp = () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(apiErrorEnvelopeMiddleware);
  app.get('/api/string-error', (_req, res) => {
    res.status(404).json({ error: 'Missing document' });
  });
  app.get('/api/nested-error', (_req, res) => {
    res.status(400).json({ error: { code: 'bad-input', message: 'Bad input' } });
  });
  app.get('/api/details-error', (_req, res) => {
    res.status(413).json({ error: 'Payload too large', maxBytes: 1024 });
  });
  return app;
};

describe('apiErrorEnvelopeMiddleware', () => {
  it('normalizes legacy string errors', async () => {
    const response = await request(buildApp()).get('/api/string-error');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Missing document',
    });
    expect(response.body.error.requestId).toEqual(expect.any(String));
  });

  it('preserves canonical nested error messages and normalizes codes', async () => {
    const response = await request(buildApp()).get('/api/nested-error');

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'BAD_INPUT',
      message: 'Bad input',
    });
  });

  it('moves legacy extra fields into details', async () => {
    const response = await request(buildApp()).get('/api/details-error');

    expect(response.status).toBe(413);
    expect(response.body.error).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Payload too large',
      details: { maxBytes: 1024 },
    });
  });
});
