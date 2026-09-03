import { Request, Response, NextFunction } from 'express';

// Extend Request locally to avoid global type conflicts for now
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    email?: string | null;
  };
}

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { logger } from '../services/Logger.js';
import { cacheService } from '../cache/cacheService.js';

interface JwtPayload {
  id: string | number;
  username?: string;
  role?: string;
  email?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }
  throw new Error('JWT_SECRET environment variable must be set. No insecure fallback allowed.');
}

const getJwtSecret = (): string => {
  return JWT_SECRET;
};

// P-256 SPKI DER public key is 91 bytes (124 base64 chars). Reject anything larger to prevent DoS.
const MAX_GUEST_KEY_BASE64_LEN = 200;

const MAX_GUEST_NONCE_LEN = 128;
const GUEST_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;
const GUEST_SIGNATURE_MAX_FUTURE_SKEW_MS = 60 * 1000;
const verifiedGuestRequests = new WeakMap<Request, NonNullable<AuthRequest['user']>>();

const verifyGuestSignature = (req: Request): AuthRequest['user'] | null => {
  const verified = verifiedGuestRequests.get(req);
  if (verified) return verified;
  const signature = req.headers['x-signature'] as string;
  const publicKeyBase64 = req.headers['x-public-key'] as string;
  const timestampHeader = req.headers['x-guest-timestamp'] as string;
  const nonce = req.headers['x-guest-nonce'] as string;

  if (!signature || !publicKeyBase64) return null;
  if (!timestampHeader || !nonce) return null;
  if (publicKeyBase64.length > MAX_GUEST_KEY_BASE64_LEN) return null;
  if (nonce.length > MAX_GUEST_NONCE_LEN) return null;
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(nonce)) return null;

  const timestampMs = Number(timestampHeader);
  if (!Number.isFinite(timestampMs)) return null;
  const now = Date.now();
  if (timestampMs > now + GUEST_SIGNATURE_MAX_FUTURE_SKEW_MS) return null;
  if (now - timestampMs > GUEST_SIGNATURE_MAX_AGE_MS) return null;

  try {
    const method = req.method.toUpperCase();
    const path = req.originalUrl || req.path;
    const bodyStr = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '';
    const message = `${method}:${path}:${timestampHeader}:${nonce}:${bodyStr}`;

    const keyBuffer = Buffer.from(publicKeyBase64, 'base64');
    const pubKey = crypto.createPublicKey({
      key: keyBuffer,
      format: 'der',
      type: 'spki',
    });

    const isVerified = crypto.verify(
      'sha256',
      Buffer.from(message),
      {
        key: pubKey,
        dsaEncoding: 'ieee-p1363',
      },
      Buffer.from(signature, 'base64'),
    );

    if (!isVerified) return null;

    const fingerprint = crypto.createHash('sha256').update(keyBuffer).digest('hex');

    const replayKey = `guest_sig:${fingerprint}:${nonce}`;
    if (cacheService.get<boolean>('general', replayKey)) return null;
    cacheService.set('general', replayKey, true, Math.ceil(GUEST_SIGNATURE_MAX_AGE_MS / 1000));

    const user = {
      id: `guest:${fingerprint}`,
      username: `Guest ${fingerprint.slice(0, 8)}`,
      role: 'guest',
      email: null,
    };
    verifiedGuestRequests.set(req, user);
    return user;
  } catch (error) {
    logger.warn({ err: error }, '[Auth] Guest signature verification failed');
    return null;
  }
};

// Shared verification helper — uses JWT payload claims directly (no DB round-trip).
// Access tokens have no server-side revocation table, so re-fetching adds latency with no benefit.
const verifyToken = (req: Request): AuthRequest['user'] | null => {
  let token: string | undefined;

  // ACCESS TOKEN should only be in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as JwtPayload;
    if (!decoded?.id) return null;
    return {
      id: String(decoded.id),
      username: String(decoded.username ?? ''),
      role: String(decoded.role ?? 'viewer'),
      email: decoded.email ?? null,
    };
  } catch (error) {
    // Avoid logging bearer tokens; only log the failure mode + request context.
    const requestId = (req as Request & { requestId?: string }).requestId;
    const isProduction = process.env.NODE_ENV === 'production';
    const logPayload = {
      err: error,
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    };
    if (isProduction) {
      logger.warn(logPayload, '[Auth] JWT verification failed');
    } else {
      logger.debug(logPayload, '[Auth] JWT verification failed');
    }
    return null;
  }
};

export const authenticateRequest = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  let user = verifyToken(req);
  if (!user) {
    user = verifyGuestSignature(req);
  }
  if (!user) {
    return res
      .status(401)
      .json({ error: 'Unauthorized', message: 'Missing or invalid authentication credentials' });
  }

  authReq.user = user;
  next();
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  let user = verifyToken(req);
  if (!user) {
    user = verifyGuestSignature(req);
  }
  if (user) {
    authReq.user = user;
  }
  next();
};

export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Admin has access to everything
    if (authReq.user.role === 'admin') {
      return next();
    }

    if (authReq.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Forbidden', message: `Requires ${requiredRole} role` });
    }

    next();
  };
};
