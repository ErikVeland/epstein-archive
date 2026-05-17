import NodeCache from 'node-cache';

type CacheNamespace = 'http' | 'query' | 'search' | 'email' | 'general';

type CacheMetrics = {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
};

type InFlightRequest<T> = {
  promise: Promise<T>;
  startedAt: number;
};

class CacheService {
  private cache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120,
    useClones: false,
  });
  private inFlight = new Map<string, InFlightRequest<unknown>>();
  private metrics = new Map<CacheNamespace, CacheMetrics>();

  private scopedKey(namespace: CacheNamespace, key: string): string {
    return `${namespace}:${key}`;
  }

  private getMetrics(namespace: CacheNamespace): CacheMetrics {
    const existing = this.metrics.get(namespace);
    if (existing) return existing;
    const next = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    this.metrics.set(namespace, next);
    return next;
  }

  get<T>(namespace: CacheNamespace, key: string): T | undefined {
    const metrics = this.getMetrics(namespace);
    const value = this.cache.get<T>(this.scopedKey(namespace, key));
    if (value === undefined) {
      metrics.misses++;
      return undefined;
    }
    metrics.hits++;
    return value;
  }

  set<T>(namespace: CacheNamespace, key: string, value: T, ttlSeconds?: number): boolean {
    const metrics = this.getMetrics(namespace);
    metrics.sets++;
    return this.cache.set(this.scopedKey(namespace, key), value, ttlSeconds || 0);
  }

  del(namespace: CacheNamespace, key: string): number {
    const deleted = this.cache.del(this.scopedKey(namespace, key));
    this.getMetrics(namespace).deletes += deleted;
    return deleted;
  }

  keys(namespace?: CacheNamespace): string[] {
    const keys = this.cache.keys();
    if (!namespace) return keys;
    const prefix = `${namespace}:`;
    return keys.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  }

  flush(namespace?: CacheNamespace): void {
    if (!namespace) {
      this.cache.flushAll();
      this.inFlight.clear();
      return;
    }
    const keys = this.keys(namespace).map((key) => this.scopedKey(namespace, key));
    if (keys.length > 0) this.cache.del(keys);
    const prefix = `${namespace}:`;
    for (const key of this.inFlight.keys()) {
      if (key.startsWith(prefix)) this.inFlight.delete(key);
    }
  }

  purgeByPattern(namespace: CacheNamespace, pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keys = this.keys(namespace).filter((key) => regex.test(key));
    if (keys.length === 0) return 0;
    const deleted = this.cache.del(keys.map((key) => this.scopedKey(namespace, key)));
    this.getMetrics(namespace).deletes += deleted;
    return deleted;
  }

  async getOrCompute<T>(
    namespace: CacheNamespace,
    key: string,
    compute: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cached = this.get<T>(namespace, key);
    if (cached !== undefined) return cached;

    const fullKey = this.scopedKey(namespace, key);
    const existing = this.inFlight.get(fullKey);
    if (existing) return existing.promise as Promise<T>;

    const promise = compute();
    this.inFlight.set(fullKey, { promise: promise as Promise<unknown>, startedAt: Date.now() });
    try {
      const value = await promise;
      this.set(namespace, key, value, ttlSeconds);
      return value;
    } finally {
      this.inFlight.delete(fullKey);
    }
  }

  stats(namespace?: CacheNamespace): { size: number; keys: string[]; metrics?: CacheMetrics } {
    const keys = this.keys(namespace);
    return {
      size: keys.length,
      keys,
      metrics: namespace ? { ...this.getMetrics(namespace) } : undefined,
    };
  }
}

export const cacheService = new CacheService();
