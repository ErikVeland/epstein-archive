/**
 * CACHE CORRECTNESS + STAMPEDE CONTROL
 *
 * Enhanced performance cache with:
 * - Revision awareness (ingest_run_id + RULESET_VERSION)
 * - In-flight deduplication (stampede prevention)
 * - Metrics tracking (hit/miss/compute duration)
 */

import NodeCache from 'node-cache';

interface CacheOptions {
  ttl?: number; // seconds
  checkperiod?: number; // seconds
}

interface CacheMetrics {
  hits: number;
  misses: number;
  computeDurations: number[];
  evictions: number;
  size: number;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class PerformanceCacheV2 {
  private cache: NodeCache;
  private cacheVersion: string;
  private inFlight = new Map<string, InFlightRequest<unknown>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    computeDurations: [],
    evictions: 0,
    size: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 60, // 60s default
      checkperiod: options.checkperiod || 120, // 2min cleanup
      useClones: false, // Don't clone objects (faster, but be careful with mutations)
    });

    // Cache version = ingest_run_id + RULESET_VERSION + CLEANER_VERSION
    this.cacheVersion = this.getCacheVersion();

    // Track evictions
    this.cache.on('del', () => {
      this.metrics.evictions++;
      this.metrics.size = this.cache.keys().length;
    });
  }

  private getCacheVersion(): string {
    // In production, these come from environment or database
    const ingestRunId = process.env.LATEST_INGEST_RUN_ID || process.env.INGEST_RUN_ID || 'default';
    const rulesetVersion = process.env.RULESET_VERSION || 'v1';
    const cleanerVersion = process.env.CLEANER_VERSION || 'v1';
    return `${ingestRunId}:${rulesetVersion}:${cleanerVersion}`;
  }

  private makeKey(key: string): string {
    return `${this.cacheVersion}:${key}`;
  }

  /**
   * Get cached value with stampede prevention
   * If cache miss and computation in progress, await same promise
   */
  async getOrCompute<T>(key: string, computeFn: () => Promise<T>, ttl?: number): Promise<T> {
    const fullKey = this.makeKey(key);

    // Check cache first
    const cached = this.cache.get<T>(fullKey);
    if (cached !== undefined) {
      this.metrics.hits++;
      return cached;
    }

    // Check if computation in flight
    const inFlight = this.inFlight.get(fullKey);
    if (inFlight) {
      // Await existing computation (stampede prevention)
      return inFlight.promise;
    }

    // Start new computation
    this.metrics.misses++;
    const startTime = Date.now();

    const promise = computeFn();
    this.inFlight.set(fullKey, { promise, timestamp: startTime });

    try {
      const result = await promise;

      // Track compute duration
      const duration = Date.now() - startTime;
      this.metrics.computeDurations.push(duration);

      // Keep only last 100 durations for stats
      if (this.metrics.computeDurations.length > 100) {
        this.metrics.computeDurations.shift();
      }

      // Cache result
      this.cache.set(fullKey, result, ttl || 0);
      this.metrics.size = this.cache.keys().length;

      return result;
    } finally {
      // Remove from in-flight
      this.inFlight.delete(fullKey);
    }
  }

  /**
   * Get cached value (synchronous)
   */
  get<T>(key: string): T | undefined {
    const cached = this.cache.get<T>(this.makeKey(key));
    if (cached !== undefined) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
    return cached;
  }

  /**
   * Set cached value (synchronous)
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const result = this.cache.set(this.makeKey(key), value, ttl || 0);
    this.metrics.size = this.cache.keys().length;
    return result;
  }

  /**
   * Delete cached value
   */
  del(key: string): number {
    return this.cache.del(this.makeKey(key));
  }

  /**
   * Flush all cache
   */
  flush(): void {
    this.cache.flushAll();
    this.metrics.size = 0;
  }

  /**
   * Purge cache by pattern
   */
  purgeByPattern(pattern: string | RegExp): number {
    const keys = this.cache.keys();
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    const keysToDelete: string[] = [];

    for (const key of keys) {
      if (regex.test(key)) {
        keysToDelete.push(key);
        count++;
      }
    }

    if (keysToDelete.length > 0) {
      this.cache.del(keysToDelete);
      this.metrics.size = this.cache.keys().length;
    }
    return count;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics & {
    hitRate: number;
    avgComputeDuration: number;
    p95ComputeDuration: number;
  } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? this.metrics.hits / total : 0;

    const durations = [...this.metrics.computeDurations].sort((a, b) => a - b);
    const avgComputeDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95ComputeDuration = durations[p95Index] || 0;

    return {
      ...this.metrics,
      hitRate,
      avgComputeDuration,
      p95ComputeDuration,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      computeDurations: [],
      evictions: 0,
      size: this.cache.keys().length,
    };
  }

  /**
   * Cache top entities (homepage)
   */
  async cacheTopEntities<T>(computeFn: () => Promise<T[]>, ttl = 60): Promise<T[]> {
    return this.getOrCompute('top_entities', computeFn, ttl);
  }

  /**
   * Cache entity overview DTO
   */
  async cacheEntityOverview(
    entityId: string,
    computeFn: () => Promise<Record<string, unknown>>,
    ttl = 60,
  ): Promise<Record<string, unknown>> {
    return this.getOrCompute(`entity:${entityId}:overview`, computeFn, ttl);
  }

  /**
   * Cache entity documents (first page)
   */
  async cacheEntityDocuments(
    entityId: string,
    computeFn: () => Promise<Array<Record<string, unknown>>>,
    ttl = 60,
  ): Promise<Array<Record<string, unknown>>> {
    return this.getOrCompute(`entity:${entityId}:documents:page1`, computeFn, ttl);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(
    query: string,
    computeFn: () => Promise<any[]>,
    ttl = 30,
  ): Promise<any[]> {
    const normalizedQuery = query.toLowerCase().trim();
    return this.getOrCompute(`search:${normalizedQuery}`, computeFn, ttl);
  }
}

// Singleton instance
export const performanceCache = new PerformanceCacheV2({
  ttl: 60, // 60s default
  checkperiod: 120, // 2min cleanup
});

// Export class for testing
export { PerformanceCacheV2 };
