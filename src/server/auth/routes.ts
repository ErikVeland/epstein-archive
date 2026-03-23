import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getApiPool } from '../db/connection.js';
import { authenticateRequest, optionalAuthenticate } from './middleware.js';
import { logger } from '../services/Logger.js';

import rateLimit from 'express-rate-limit';

const router = express.Router();
const JWT_ACCESS_SECRET = process.env.JWT_SECRET || 'dev-access-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    logger.fatal('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in production.');
    process.exit(1);
  }
} else if (
  JWT_ACCESS_SECRET === 'dev-access-secret' ||
  JWT_REFRESH_SECRET === 'dev-refresh-secret'
) {
  const mode = process.env.NODE_ENV || 'development';
  logger.warn(`Using fallback JWT secret(s) in ${mode} mode`);
}

// Rate limiter for login/refresh: 5 attempts per 15 mins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Slightly more for refresh retries
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
});

type TokenUser = { id: number | string; username?: string; role?: string };
type AuthenticatedRequest = express.Request & {
  user?: { id: number; username: string; role: string };
};

// Helper to generate tokens
const generateAccessToken = (user: TokenUser) => {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
};

const generateRefreshToken = (user: TokenUser) => {
  return jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
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

// POST /api/auth/refresh
router.post('/refresh', authLimiter, async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: number };
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
  const { password_hash: _hash, ...userInfo } = req.user;
  res.json({ user: userInfo });
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
    const pool = getApiPool();
    const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [
      req.user.id,
    ]);
    const user = rows[0];

    const currentPasswordValid = user?.password_hash
      ? await bcrypt.compare(currentPassword, user.password_hash)
      : false;
    if (!user || !currentPasswordValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true });
  } catch (e) {
    logger.error({ err: e }, 'Password change error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
