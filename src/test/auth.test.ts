import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

process.env.JWT_SECRET = 'test-secret-for-auth-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-auth-tests';

const mockQuery = vi.fn();

vi.mock('../server/db/connection.js', () => ({
  getApiPool: () => ({
    query: mockQuery,
  }),
}));

describe('Auth Routes - Invitation and Passkeys', () => {
  let app: express.Express;
  let adminToken: string;
  let investigatorToken: string;

  beforeAll(async () => {
    // Dynamically import auth routes to prevent ES module hoisting from running before process.env is set
    const { default: authRoutes } = await import('../server/auth/routes.js');

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);

    // Generate valid tokens for request simulation
    adminToken = jwt.sign(
      { id: '1', username: 'admin_user', role: 'admin' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256' },
    );
    investigatorToken = jwt.sign(
      { id: '2', username: 'investigator_user', role: 'investigator' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256' },
    );
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('POST /api/auth/invite', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/auth/invite')
        .send({ email: 'new@example.com', username: 'new_investigator' });

      expect(response.status).toBe(401);
    });

    it('rejects non-admin role requests', async () => {
      const response = await request(app)
        .post('/api/auth/invite')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({ email: 'new@example.com', username: 'new_investigator' });

      expect(response.status).toBe(403);
    });

    it('creates an invite token successfully for admin', async () => {
      const response = await request(app)
        .post('/api/auth/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'new@example.com', username: 'new_investigator' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.inviteUrl).toContain('/verify-invite?token=');

      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET!) as JwtPayload;
      expect(decoded.email).toBe('new@example.com');
      expect(decoded.username).toBe('new_investigator');
      expect(decoded.role).toBe('investigator');
      expect(decoded.type).toBe('invite');
    });
  });

  describe('POST /api/auth/verify-invite', () => {
    it('creates a new user and issues session tokens when user does not exist', async () => {
      const inviteToken = jwt.sign(
        { email: 'new@example.com', username: 'new_user', role: 'investigator', type: 'invite' },
        process.env.JWT_SECRET!,
      );

      // 1. SELECT query checks if user exists -> returns empty rows
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 2. INSERT query inserts new user -> returns new user details
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'new-uuid', username: 'new_user', email: 'new@example.com', role: 'investigator' },
        ],
      });
      // 3. INSERT query adds refresh token -> mock success
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 4. UPDATE query updates last login -> mock success
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/verify-invite')
        .send({ token: inviteToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user).toEqual({
        id: 'new-uuid',
        username: 'new_user',
        email: 'new@example.com',
        role: 'investigator',
      });
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('logs in an existing user without inserting a duplicate record', async () => {
      const inviteToken = jwt.sign(
        { email: 'new@example.com', username: 'new_user', role: 'investigator', type: 'invite' },
        process.env.JWT_SECRET!,
      );

      // 1. SELECT query checks if user exists -> returns existing user
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'existing-id',
            username: 'new_user',
            email: 'new@example.com',
            role: 'investigator',
          },
        ],
      });
      // 2. INSERT query adds refresh token -> mock success
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 3. UPDATE query updates last login -> mock success
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/verify-invite')
        .send({ token: inviteToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe('existing-id');
    });
  });

  describe('WebAuthn Passkey Handshake (Register & Login)', () => {
    it('performs WebAuthn Passkey Registration successfully', async () => {
      // 1. Get Options
      const optionsResponse = await request(app)
        .post('/api/auth/webauthn/register/options')
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(optionsResponse.status).toBe(200);
      const { challenge, userId } = optionsResponse.body;
      expect(challenge).toBeDefined();
      expect(userId).toBe('2');

      // 2. Mock browser-side keypair generation and signing
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
      const spkiDer = publicKey.export({ format: 'der', type: 'spki' });
      const spkiBase64 = spkiDer.toString('base64');

      const signature = crypto.sign('sha256', Buffer.from(challenge), {
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      });
      const signatureBase64 = signature.toString('base64');

      // mock db query for inserting passkey
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // 3. Verify Registration
      const verifyResponse = await request(app)
        .post('/api/auth/webauthn/register/verify')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          credentialId: 'test-cred-id-123',
          publicKey: spkiBase64,
          signature: signatureBase64,
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
    });

    it('performs WebAuthn Passkey Login successfully', async () => {
      // Setup mock data for user and their saved credentials
      const username = 'investigator_user';
      const userId = '2';
      const credentialId = 'test-cred-id-123';

      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
      const spkiDer = publicKey.export({ format: 'der', type: 'spki' });
      const spkiBase64 = spkiDer.toString('base64');

      // 1. Options: mock finding the user and matching credentials in DB
      mockQuery.mockResolvedValueOnce({ rows: [{ id: userId, username, role: 'investigator' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ credential_id: credentialId }] });

      const optionsResponse = await request(app)
        .post('/api/auth/webauthn/login/options')
        .send({ username });

      expect(optionsResponse.status).toBe(200);
      const { challenge, credentials } = optionsResponse.body;
      expect(challenge).toBeDefined();
      expect(credentials).toContainEqual({ id: credentialId });

      // 2. Sign challenge locally using test private key
      const signature = crypto.sign('sha256', Buffer.from(challenge), {
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      });
      const signatureBase64 = signature.toString('base64');

      // 3. Verify Login
      // DB mocks for verification
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: userId, username, email: 'investigator@example.com', role: 'investigator' }],
      }); // user find
      mockQuery.mockResolvedValueOnce({ rows: [{ public_key: spkiBase64, counter: 5 }] }); // passkey find
      mockQuery.mockResolvedValueOnce({ rows: [] }); // update counter
      mockQuery.mockResolvedValueOnce({ rows: [] }); // insert refresh token
      mockQuery.mockResolvedValueOnce({ rows: [] }); // update last login

      const verifyResponse = await request(app).post('/api/auth/webauthn/login/verify').send({
        username,
        credentialId,
        signature: signatureBase64,
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.accessToken).toBeDefined();
      expect(verifyResponse.body.user.id).toBe(userId);
    });
  });
});
