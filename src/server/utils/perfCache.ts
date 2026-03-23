import { Request, Response, NextFunction } from 'express';

// Simple deterministic object stringifier
function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return '{' + keys.map((k) => `${k}:${stableStringify(rec[k])}`).join(',') + '}';
}

class LRUCache {
  private cache = new Map<string, { expiry: number; data: string }>();

  constructor(private maxEntries: number = 1000) {}

  get(key: string): string | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position to maintain LRU order
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }

  set(key: string, data: string, ttlSeconds: number) {
    if (this.cache.size >= this.maxEntries) {
      // Smallest entry is the oldest
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      expiry: Date.now() + ttlSeconds * 1000,
      data,
    });
  }
}

const cache = new LRUCache();

export const cacheResponse = (ttlSeconds: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.method}:${req.path}:${stableStringify(req.query)}`;
    const cachedData = cache.get(key);

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
        cache.set(key, body, ttlSeconds);
      }
      return originalSend.call(this, body);
    };

    next();
  };
};
