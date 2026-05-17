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

import jwt from 'jsonwebtoken';
import { logger } from '../services/Logger.js';

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

  const user = verifyToken(req);
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
  const user = verifyToken(req);
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
