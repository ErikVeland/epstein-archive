import { Request, Response, NextFunction } from 'express';

// Extend Request locally to avoid global type conflicts for now
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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.error('CRITICAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}
// Fallback only for development
const ACTUAL_SECRET = JWT_SECRET || 'dev-secret-do-not-use-in-prod';

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
    const decoded = jwt.verify(token, ACTUAL_SECRET) as any;
    if (!decoded?.id) return null;
    return {
      id: String(decoded.id),
      username: String(decoded.username ?? ''),
      role: String(decoded.role ?? 'viewer'),
      email: decoded.email ?? null,
    };
  } catch (_error) {
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
