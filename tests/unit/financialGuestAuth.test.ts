import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import crypto from 'node:crypto';

describe('signed financial reads', () => {
  it('accepts the middleware chain once, but rejects a replayed request', async () => {
    process.env.JWT_SECRET ||= 'financial-test-only-secret';
    const { optionalAuthenticate, authenticateRequest } =
      await import('../../src/server/auth/middleware');
    const app = express();
    app.use(optionalAuthenticate);
    app.get('/api/financial/transactions', authenticateRequest, (_req, res) => res.json([]));
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const timestamp = String(Date.now());
    const nonce = crypto.randomBytes(16).toString('hex');
    const path = '/api/financial/transactions?limit=500&offset=0';
    const signature = crypto
      .sign('sha256', Buffer.from(`GET:${path}:${timestamp}:${nonce}:`), {
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      })
      .toString('base64');
    const headers = {
      'X-Signature': signature,
      'X-Public-Key': publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
      'X-Guest-Timestamp': timestamp,
      'X-Guest-Nonce': nonce,
    };
    expect((await request(app).get(path).set(headers)).status).toBe(200);
    expect((await request(app).get(path).set(headers)).status).toBe(401);
    expect((await request(app).get(path)).status).toBe(401);
  });
});
