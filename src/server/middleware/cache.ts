import type { Request, Response, NextFunction } from 'express';
import { cacheService } from '../cache/cacheService.js';
import { getRevisionTokenAsync } from '../revisionManager.js';
import { withTimeoutFallback } from '../utils/asyncTimeout.js';

export const apiCache = {
  get: <T>(key: string): T | undefined => cacheService.get<T>('http', key),
  set: <T>(key: string, value: T, ttl?: number): boolean =>
    cacheService.set('http', key, value, ttl),
  del: (keys: string | string[]): number =>
    Array.isArray(keys)
      ? keys.reduce((count, key) => count + cacheService.del('http', key), 0)
      : cacheService.del('http', keys),
  keys: (): string[] => cacheService.keys('http'),
  flushAll: (): void => cacheService.flush('http'),
};

export function cacheMiddleware(ttl?: number) {
  return cacheResponse(ttl ?? 300);
}

// Deterministic JSON response cache for GET routes that need query-order-stable
// keys, with one owner for HTTP cache invalidation.
function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;

  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return `{${keys.map((key) => `${key}:${stableStringify(rec[key])}`).join(',')}}`;
}

export const cacheResponse = (ttlSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const revision = await withTimeoutFallback(getRevisionTokenAsync(), 'no-rev', {
      timeoutMs: 250,
    }).catch(() => 'no-rev');
    const cacheKey = `${revision}:${req.method}:${req.path}:${stableStringify(req.query)}`;
    const cachedData = apiCache.get<string>(cacheKey);

    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Revision', revision);
      res.setHeader('Content-Type', 'application/json');
      return res.send(cachedData);
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Cache-Revision', revision);

    const originalSend = res.send.bind(res);
    res.send = function (body: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(cacheKey, body, ttlSeconds);
      }
      return originalSend(body);
    };

    next();
  };
};

export const purgeCache = () => {
  apiCache.flushAll();
};

export const purgeCacheByPattern = (pattern: string | RegExp) => {
  return cacheService.purgeByPattern('http', pattern);
};
