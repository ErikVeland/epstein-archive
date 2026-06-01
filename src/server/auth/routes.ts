import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getApiPool } from '../db/connection.js';
import { authenticateRequest, optionalAuthenticate, requireRole } from './middleware.js';
import { logger } from '../services/Logger.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { cacheService } from '../cache/cacheService.js';
import { validateOrigin } from '../middleware/csrfOriginCheck.js';

const router = express.Router();

// Defense-in-depth Origin check on all cookie-mutating auth routes.
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    validateOrigin(req, res, next);
  } else {
    next();
  }
});

const JWT_ACCESS_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    logger.fatal('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in production.');
    process.exit(1);
  }
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set. No insecure fallback allowed.');
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type TokenUser = { id: number | string; username?: string; role?: string };
type AuthenticatedRequest = express.Request & {
  user?: { id: string; username: string; role: string };
};

const webauthnChallenges = new Map<string, string>();

const createChallenge = (): string => crypto.randomBytes(32).toString('base64url');

const verifyP256Signature = (
  publicKeyBase64: string,
  challenge: string,
  signatureBase64: string,
) => {
  const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyBase64, 'base64'),
    format: 'der',
    type: 'spki',
  });

  return crypto.verify(
    'sha256',
    Buffer.from(challenge),
    {
      key: publicKey,
      dsaEncoding: 'ieee-p1363',
    },
    Buffer.from(signatureBase64, 'base64'),
  );
};

// Helper to generate tokens
const generateAccessToken = (user: TokenUser) => {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_ACCESS_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });
};

const generateRefreshToken = (user: TokenUser) => {
  return jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
};

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const pool = getApiPool();
    const { rows } = await pool.query(
      `
        SELECT id, username, email, role, password_hash, created_at, last_login_at
        FROM users
        WHERE username = $1
      `,
      [username],
    );
    const user = rows[0];

    const passwordValid = user?.password_hash
      ? await bcrypt.compare(password, user.password_hash)
      : false;
    if (!user || !passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
    await pool.query(
      `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, refreshTokenHash, refreshExpiresAt],
    );

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id],
    );

    // Set Refresh Token in Secure Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/api/auth',
    });

    // Return access token and sanitized user info
    const { password_hash: _hash, ...userInfo } = user;
    res.json({
      success: true,
      accessToken,
      user: userInfo,
    });
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/guest
router.post('/guest', async (_req, res) => {
  try {
    const guestUser = {
      id: 'guest',
      username: 'Guest Researcher',
      role: 'guest',
    };
    const accessToken = generateAccessToken(guestUser);
    res.json({
      success: true,
      accessToken,
      user: guestUser,
    });
  } catch (error) {
    logger.error({ err: error }, 'Guest login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NOTE: The canonical POST /invite route (admin-only, rate-limited, 24h TTL) is
// defined below alongside the other authenticated admin routes.

router.post('/verify-invite', async (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'Invite token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as {
      email?: string;
      username?: string;
      role?: string;
      type?: string;
    };

    if (decoded.type !== 'invite' || !decoded.email || !decoded.username) {
      return res.status(401).json({ error: 'Invalid invite token' });
    }

    const pool = getApiPool();
    const existing = await pool.query(
      'SELECT id, username, email, role FROM users WHERE username = $1 OR email = $2 LIMIT 1',
      [decoded.username, decoded.email],
    );

    let user = existing.rows[0];
    if (!user) {
      const inserted = await pool.query(
        `INSERT INTO users (username, email, role)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, role`,
        [decoded.username, decoded.email, decoded.role || 'investigator'],
      );
      user = inserted.rows[0];
      logger.info(
        { userId: user.id, username: user.username },
        'New investigator registered via invite',
      );
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, hashToken(refreshToken), new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString()],
    );
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id],
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/api/auth',
    });

    res.json({ success: true, accessToken, user });
  } catch (error) {
    logger.warn({ err: error }, 'Invite verification failed');
    res.status(401).json({ error: 'Invalid invite token' });
  }
});

router.post('/webauthn/register/options', authenticateRequest, (req: AuthenticatedRequest, res) => {
  const userId = String(req.user?.id);
  const challenge = createChallenge();
  webauthnChallenges.set(`register:${userId}`, challenge);
  res.json({ challenge, userId });
});

router.post(
  '/webauthn/register/verify',
  authenticateRequest,
  async (req: AuthenticatedRequest, res) => {
    const userId = String(req.user?.id);
    const { credentialId, publicKey, signature } = req.body || {};
    const challenge = webauthnChallenges.get(`register:${userId}`);

    if (!credentialId || !publicKey || !signature || !challenge) {
      return res.status(400).json({ error: 'Invalid passkey registration payload' });
    }

    try {
      if (!verifyP256Signature(publicKey, challenge, signature)) {
        return res.status(401).json({ error: 'Invalid passkey signature' });
      }

      await getApiPool().query(
        `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
       VALUES ($1, $2, $3, 0)`,
        [userId, credentialId, publicKey],
      );
      webauthnChallenges.delete(`register:${userId}`);
      logger.info({ userId, credentialId }, 'WebAuthn passkey registered successfully');
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Passkey registration failed');
      res.status(400).json({ error: 'Passkey registration failed' });
    }
  },
);

router.post('/webauthn/login/options', async (req, res) => {
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  const pool = getApiPool();
  const userRows = await pool.query('SELECT id, username, role FROM users WHERE username = $1', [
    username,
  ]);
  const user = userRows.rows[0];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const credentialRows = await pool.query(
    'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1',
    [user.id],
  );
  const challenge = createChallenge();
  webauthnChallenges.set(`login:${username}`, challenge);

  res.json({
    challenge,
    userId: String(user.id),
    credentials: credentialRows.rows.map((row) => ({ id: row.credential_id })),
  });
});

router.post('/webauthn/login/verify', async (req, res) => {
  const { username, credentialId, signature } = req.body || {};
  const challenge = username ? webauthnChallenges.get(`login:${username}`) : null;
  if (!username || !credentialId || !signature || !challenge) {
    return res.status(400).json({ error: 'Invalid passkey login payload' });
  }

  try {
    const pool = getApiPool();
    const userRows = await pool.query(
      'SELECT id, username, email, role FROM users WHERE username = $1',
      [username],
    );
    const user = userRows.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const credentialRows = await pool.query(
      'SELECT public_key, counter FROM webauthn_credentials WHERE user_id = $1 AND credential_id = $2',
      [user.id, credentialId],
    );
    const credential = credentialRows.rows[0];
    if (!credential) {
      return res.status(404).json({ error: 'Passkey not found' });
    }

    if (!verifyP256Signature(credential.public_key, challenge, signature)) {
      return res.status(401).json({ error: 'Invalid passkey signature' });
    }

    await pool.query(
      'UPDATE webauthn_credentials SET counter = counter + 1, last_used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND credential_id = $2',
      [user.id, credentialId],
    );
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, hashToken(refreshToken), new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString()],
    );
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id],
    );
    webauthnChallenges.delete(`login:${username}`);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/api/auth',
    });
    res.json({ success: true, accessToken, user });
  } catch (error) {
    logger.error({ err: error }, 'Passkey login failed');
    res.status(400).json({ error: 'Passkey login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', authRateLimiter, async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as {
      id: number;
    };
    const pool = getApiPool();
    const refreshTokenHash = hashToken(refreshToken);

    // Use a transaction with SELECT FOR UPDATE to prevent concurrent refresh races
    // where two requests both pass the validity check before either revoke commits.
    const client = await pool.connect();
    let accessToken: string;
    let nextRefreshToken: string;
    try {
      await client.query('BEGIN');

      const activeRefreshRows = await client.query(
        `
          SELECT id, user_id
          FROM refresh_tokens
          WHERE token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
          LIMIT 1
          FOR UPDATE
        `,
        [refreshTokenHash],
      );
      const activeRefresh = activeRefreshRows.rows[0];
      if (!activeRefresh || String(activeRefresh.user_id) !== String(decoded.id)) {
        await client.query('ROLLBACK');
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const { rows } = await client.query(
        `
          SELECT id, username, email, role
          FROM users
          WHERE id = $1
        `,
        [decoded.id],
      );
      const user = rows[0];
      if (!user) {
        await client.query('ROLLBACK');
        return res.status(401).json({ error: 'User not found' });
      }

      accessToken = generateAccessToken(user);
      nextRefreshToken = generateRefreshToken(user);
      const nextRefreshTokenHash = hashToken(nextRefreshToken);
      const nextRefreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();

      await client.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = NOW(), last_used_at = NOW()
          WHERE id = $1
        `,
        [activeRefresh.id],
      );
      await client.query(
        `
          INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
        `,
        [user.id, nextRefreshTokenHash, nextRefreshExpiresAt],
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.cookie('refreshToken', nextRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/api/auth',
    });

    res.json({ success: true, accessToken });
  } catch (_error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const pool = getApiPool();
      await pool.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = NOW(), last_used_at = NOW()
          WHERE token_hash = $1
            AND revoked_at IS NULL
        `,
        [hashToken(refreshToken)],
      );
    } catch (error) {
      logger.error({ err: error }, 'Logout token revoke error');
    }
  }
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', optionalAuthenticate, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  res.json({ user: req.user });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateRequest, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
    return res.status(400).json({ error: 'Current password is required' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const authenticatedUser = req.user;
    const pool = getApiPool();
    const { rows } = await pool.query<{ id: number | string; password_hash: string | null }>(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [authenticatedUser.id],
    );
    const user = rows[0];

    const currentPasswordValid = user?.password_hash
      ? await bcrypt.compare(currentPassword, user.password_hash)
      : false;
    if (!user || !currentPasswordValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      newHash,
      authenticatedUser.id,
    ]);

    res.json({ success: true });
  } catch (e) {
    logger.error({ err: e }, 'Password change error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/invite (Admin only)
router.post(
  '/invite',
  authRateLimiter,
  authenticateRequest,
  requireRole('admin'),
  async (req, res) => {
    const { email, username } = req.body;

    if (!email || !username) {
      return res.status(400).json({ error: 'Email and username are required' });
    }

    try {
      const inviteToken = jwt.sign(
        {
          email,
          username,
          role: 'investigator',
          type: 'invite',
        },
        JWT_ACCESS_SECRET,
        { expiresIn: '24h' },
      );

      res.json({
        success: true,
        token: inviteToken,
        inviteUrl: `/verify-invite?token=${inviteToken}`,
      });
    } catch (error) {
      logger.error({ err: error }, 'Invite generation error');
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// POST /api/auth/verify-invite (Public)
router.post('/verify-invite', authRateLimiter, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Invitation token is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as {
      email: string;
      username: string;
      role: string;
      type: string;
    };

    if (decoded.type !== 'invite') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const pool = getApiPool();
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id, username, email, role FROM users WHERE username = $1 OR email = $2',
      [decoded.username, decoded.email],
    );

    let user = existing.rows[0];

    if (!user) {
      const userId = crypto.randomUUID();
      const insertResult = await pool.query(
        `
          INSERT INTO users (id, username, email, role, password_hash)
          VALUES ($1, $2, $3, $4, NULL)
          RETURNING id, username, email, role
        `,
        [userId, decoded.username, decoded.email, decoded.role],
      );
      user = insertResult.rows[0];
      logger.info(
        { userId: user.id, username: user.username },
        'New investigator registered via invite',
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
    await pool.query(
      `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, refreshTokenHash, refreshExpiresAt],
    );

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id],
    );

    // Set Refresh Token Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/api/auth',
    });

    res.json({
      success: true,
      accessToken,
      user,
    });
  } catch (error) {
    logger.error({ err: error }, 'Invite verification error');
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid or expired invitation token' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/webauthn/register/options (Authenticated)
router.post('/webauthn/register/options', authenticateRequest, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const challenge = crypto.randomBytes(32).toString('hex');
    const cacheKey = `webauthn:register:challenge:${authReq.user.id}`;
    cacheService.set('general', cacheKey, challenge, 120);

    res.json({
      success: true,
      challenge,
      userId: authReq.user.id,
      username: authReq.user.username,
    });
  } catch (error) {
    logger.error({ err: error }, 'WebAuthn register options error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/webauthn/register/verify (Authenticated)
router.post('/webauthn/register/verify', authenticateRequest, async (req, res) => {
  const { credentialId, publicKey, signature } = req.body;

  if (!credentialId || !publicKey || !signature) {
    return res.status(400).json({ error: 'Missing registration credentials' });
  }

  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const cacheKey = `webauthn:register:challenge:${authReq.user.id}`;
    const challenge = cacheService.get<string>('general', cacheKey);
    if (!challenge) {
      return res.status(400).json({ error: 'Registration challenge expired or invalid' });
    }
    cacheService.del('general', cacheKey);

    // Cryptographically verify signature under browser's public key (ECDSA P-256 SPKI DER format)
    const keyBuffer = Buffer.from(publicKey, 'base64');
    const pubKey = crypto.createPublicKey({
      key: keyBuffer,
      format: 'der',
      type: 'spki',
    });

    const isVerified = crypto.verify(
      'sha256',
      Buffer.from(challenge),
      {
        key: pubKey,
        dsaEncoding: 'ieee-p1363',
      },
      Buffer.from(signature, 'base64'),
    );

    if (!isVerified) {
      return res.status(400).json({ error: 'Biometric passkey signature verification failed' });
    }

    const pool = getApiPool();
    await pool.query(
      `
        INSERT INTO user_passkeys (user_id, credential_id, public_key, counter)
        VALUES ($1, $2, $3, 0)
      `,
      [authReq.user.id, credentialId, publicKey],
    );

    logger.info(
      { userId: authReq.user.id, credentialId },
      'WebAuthn passkey registered successfully',
    );
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'WebAuthn register verification error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/webauthn/login/options (Public)
router.post('/webauthn/login/options', authRateLimiter, async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const pool = getApiPool();
    const userResult = await pool.query(
      'SELECT id, username, role FROM users WHERE username = $1',
      [username],
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passkeyResult = await pool.query(
      'SELECT credential_id FROM user_passkeys WHERE user_id = $1',
      [user.id],
    );

    if (passkeyResult.rows.length === 0) {
      return res.status(400).json({ error: 'No passkeys registered for this user' });
    }

    const challenge = crypto.randomBytes(32).toString('hex');
    const cacheKey = `webauthn:login:challenge:${user.id}`;
    cacheService.set('general', cacheKey, challenge, 120);

    res.json({
      success: true,
      challenge,
      userId: user.id,
      credentials: passkeyResult.rows.map((row) => ({ id: row.credential_id })),
    });
  } catch (error) {
    logger.error({ err: error }, 'WebAuthn login options error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/webauthn/login/verify (Public)
router.post('/webauthn/login/verify', authRateLimiter, async (req, res) => {
  const { username, credentialId, signature } = req.body;

  if (!username || !credentialId || !signature) {
    return res.status(400).json({ error: 'Missing login credentials or signature' });
  }

  try {
    const pool = getApiPool();
    const userResult = await pool.query(
      'SELECT id, username, email, role FROM users WHERE username = $1',
      [username],
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cacheKey = `webauthn:login:challenge:${user.id}`;
    const challenge = cacheService.get<string>('general', cacheKey);
    if (!challenge) {
      return res.status(400).json({ error: 'Login challenge expired or invalid' });
    }
    cacheService.del('general', cacheKey);

    const passkeyResult = await pool.query(
      'SELECT public_key, counter FROM user_passkeys WHERE credential_id = $1 AND user_id = $2',
      [credentialId, user.id],
    );
    const passkey = passkeyResult.rows[0];

    if (!passkey) {
      return res.status(400).json({ error: 'Invalid or unregistered credential ID' });
    }

    const keyBuffer = Buffer.from(passkey.public_key, 'base64');
    const pubKey = crypto.createPublicKey({
      key: keyBuffer,
      format: 'der',
      type: 'spki',
    });

    const isVerified = crypto.verify(
      'sha256',
      Buffer.from(challenge),
      {
        key: pubKey,
        dsaEncoding: 'ieee-p1363',
      },
      Buffer.from(signature, 'base64'),
    );

    if (!isVerified) {
      return res.status(401).json({ error: 'Cryptographic challenge verification failed' });
    }

    // Update login counter if applicable, generate tokens
    await pool.query('UPDATE user_passkeys SET counter = counter + 1 WHERE credential_id = $1', [
      credentialId,
    ]);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
    await pool.query(
      `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, refreshTokenHash, refreshExpiresAt],
    );

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id],
    );

    // Set Refresh Token in Secure Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/api/auth',
    });

    res.json({
      success: true,
      accessToken,
      user,
    });
  } catch (error) {
    logger.error({ err: error }, 'WebAuthn login verification error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
