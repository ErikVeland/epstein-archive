import { Request, Response, NextFunction } from 'express';
import { getApiPool } from '../db/connection.js';
import { logger } from '../services/Logger.js';

const SATURATION_RATIO = 0.9; // shed when 90%+ of pool is occupied
const WAITING_THRESHOLD = Math.max(1, Number(process.env.PG_SHED_WAITING_THRESHOLD ?? 3) || 3);

function isBypassPath(pathname: string): boolean {
  return (
    pathname === '/api/_meta/db' ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/stats/health')
  );
}

export function pgSaturationShed(req: Request, res: Response, next: NextFunction) {
  if (process.env.DISABLE_PG_SHED === '1' || process.env.DISABLE_PG_SHED === 'true') {
    return next();
  }
  if (isBypassPath(req.path || req.originalUrl || '')) {
    return next();
  }

  let pool: ReturnType<typeof getApiPool> | null = null;
  try {
    pool = getApiPool();
  } catch {
    return next();
  }

  const occupied = pool.totalCount - pool.idleCount;
  const configuredMax =
    Number((pool as unknown as { options?: { max?: number } }).options?.max) ||
    Number(process.env.API_POOL_MAX || 18) ||
    18;
  const ratio = configuredMax > 0 ? occupied / configuredMax : 0;

  // Shed only when queueing is sustained or near-exhaustion; brief single waiters are transient.
  if (pool.waitingCount >= WAITING_THRESHOLD || ratio >= SATURATION_RATIO) {
    const retryAfter = pool.waitingCount > 5 ? '10' : '5';
    logger.warn(
      `[PG SHED] requestId=${req.requestId || 'no-req-id'} ${req.method} ${req.originalUrl} ` +
        `occupied=${occupied}, waiting=${pool.waitingCount}, ratio=${ratio.toFixed(2)}, max=${configuredMax}`,
    );
    res.set('Retry-After', retryAfter);
    res.set('X-PG-Pool-Waiting', String(pool.waitingCount));
    return res.status(503).json({
      error: 'Database pool saturated. Please retry shortly.',
      retryAfter: parseInt(retryAfter),
    });
  }

  next();
}
