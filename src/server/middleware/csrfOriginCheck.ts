import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/Logger.js';

/**
 * Defense-in-depth Origin check for cookie-mutating auth routes.
 *
 * Primary CSRF mitigation is sameSite: 'strict' on the refreshToken cookie.
 * This middleware provides a second independent layer by validating the Origin
 * (or Referer) header on requests to /api/auth.
 *
 * Policy:
 * - Skip entirely in test mode so existing tests are unaffected.
 * - If no Origin/Referer header is present, allow through (curl, server-to-server).
 * - If Origin/Referer is present, the parsed host must match req.hostname or APP_URL.
 * - Otherwise reject with 403.
 */
export function validateOrigin(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const originHeader = req.headers['origin'] ?? req.headers['referer'];

  // No origin header — allow (non-browser clients, server-to-server, curl).
  if (!originHeader) {
    next();
    return;
  }

  let originHost: string | null = null;
  try {
    originHost = new URL(originHeader).hostname;
  } catch {
    // Malformed Origin/Referer — reject.
    logger.warn(
      { origin: originHeader, path: req.path },
      'CSRF origin check: malformed Origin header — rejected',
    );
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  // Build the set of allowed hosts.
  const allowedHosts = new Set<string>();
  allowedHosts.add(req.hostname);

  if (process.env.APP_URL) {
    try {
      allowedHosts.add(new URL(process.env.APP_URL).hostname);
    } catch {
      // APP_URL is misconfigured — log but don't crash; req.hostname still applies.
      logger.warn({ appUrl: process.env.APP_URL }, 'CSRF origin check: could not parse APP_URL');
    }
  }

  if (allowedHosts.has(originHost)) {
    next();
    return;
  }

  logger.warn(
    { originHost, hostname: req.hostname, path: req.path },
    'CSRF origin check: origin mismatch — rejected',
  );
  res.status(403).json({ error: 'Forbidden' });
}
