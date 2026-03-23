/**
 * Simple In-Memory Cache for Database Queries
 *
 * Caches frequently accessed data with TTL expiration.
 * Used for dashboard statistics, entity counts, and other hot queries.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private inFlight: Map<string, Promise<unknown>> = new Map();
  private defaultTTL: number; // milliseconds

  constructor(defaultTTLSeconds: number = 60) {
    this.defaultTTL = defaultTTLSeconds * 1000;

    // Periodic cleanup of expired entries (every 5 minutes)
    const timer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    // Allow Node.js to exit cleanly even if the cache is still running
    if (typeof timer.unref === 'function') timer.unref();
  }

  /**
   * Get cached value or compute and cache it (synchronous compute only)
   */
  getOrSet<T>(key: string, compute: () => T, ttlSeconds?: number): T {
    const existing = this.get<T>(key);
    if (existing !== undefined) {
      return existing;
    }

    const value = compute();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Get cached value or compute and cache it (async compute with thundering-herd protection)
   * Concurrent callers sharing the same key will await the same in-flight Promise.
   */
  async getOrSetAsync<T>(key: string, compute: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const existing = this.get<T>(key);
    if (existing !== undefined) return existing;

    const inFlight = this.inFlight.get(key) as Promise<T> | undefined;
    if (inFlight) return inFlight;

    const promise = compute()
      .then((value) => {
        this.set(key, value, ttlSeconds);
        this.inFlight.delete(key);
        return value;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        throw err;
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Get cached value (returns undefined if expired or missing)
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set cached value with optional custom TTL
   */
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Invalidate specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance with 60 second default TTL
export const queryCache = new QueryCache(60);

// Cache key generators for common queries
export const CacheKeys = {
  statistics: () => 'stats:global',
  entityCount: () => 'count:entities',
  documentCount: () => 'count:documents',
  forensicSummary: () => 'forensic:summary',
  entityById: (id: string | number) => `entity:${id}`,
  investigationList: (userId?: string) =>
    userId ? `investigations:list:${userId}` : 'investigations:list',
} as const;
