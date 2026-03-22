import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      requestStartedAt?: number;
      _startTime?: number;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-Id', reqId);
  req.requestId = reqId;
  const startedAt = Date.now();
  req.requestStartedAt = startedAt;
  req._startTime = startedAt;
  requestContext.run({ requestId: reqId }, () => {
    next();
  });
}
