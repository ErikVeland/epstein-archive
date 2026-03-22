import NodeCache from 'node-cache';
import express from 'express';

// API Response Cache - 5 minute TTL for high-traffic endpoints
export const apiCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60s
  useClones: true, // Clone on get/set — prevents the deepCamelKeys middleware from
  // mutating the cached object in place, which would corrupt all subsequent cache hits
});

// Cache middleware helper
export const cacheMiddleware = (ttl?: number) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Generate cache key from URL + query params
    const cacheKey = req.originalUrl || req.url;

    // Try to get cached response
    const cachedResponse = apiCache.get(cacheKey);
    if (cachedResponse) {
      // Send cached response
      res.set('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Cache the response
      apiCache.set(cacheKey, body, ttl || 300);
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

export const purgeCache = () => {
  apiCache.flushAll();
};

export const purgeCacheByPattern = (pattern: string | RegExp) => {
  const keys = apiCache.keys();
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  let count = 0;
  const batch: string[] = [];

  for (const key of keys) {
    if (regex.test(key)) {
      batch.push(key);
      count++;
    }
  }

  if (batch.length > 0) {
    apiCache.del(batch);
  }
  return count;
};
