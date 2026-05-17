import { Request, Response, NextFunction } from 'express';
import { apiCache } from '../middleware/cache.js';

// Simple deterministic object stringifier
function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return '{' + keys.map((k) => `${k}:${stableStringify(rec[k])}`).join(',') + '}';
}

export const cacheResponse = (ttlSeconds: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.method}:${req.path}:${stableStringify(req.query)}`;
    const cachedData = apiCache.get<string>(key);

    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'application/json');
      return res.send(cachedData);
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept send to cache
    const originalSend = res.send;
    res.send = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(key, body, ttlSeconds);
      }
      return originalSend.call(this, body);
    };

    next();
  };
};
