import { cacheService } from '../cache/cacheService.js';

class QueryCache {
  getOrSet<T>(key: string, compute: () => T, ttlSeconds?: number): T {
    const existing = this.get<T>(key);
    if (existing !== undefined) return existing;
    const value = compute();
    this.set(key, value, ttlSeconds);
    return value;
  }

  async getOrSetAsync<T>(key: string, compute: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    return cacheService.getOrCompute('query', key, compute, ttlSeconds);
  }

  get<T>(key: string): T | undefined {
    return cacheService.get<T>('query', key);
  }

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    cacheService.set('query', key, data, ttlSeconds);
  }

  invalidate(key: string): void {
    cacheService.del('query', key);
  }

  invalidatePrefix(prefix: string): void {
    cacheService.purgeByPattern('query', new RegExp(`^${prefix}`));
  }

  clear(): void {
    cacheService.flush('query');
  }

  stats(): { size: number; keys: string[] } {
    const { size, keys } = cacheService.stats('query');
    return { size, keys };
  }
}

export const queryCache = new QueryCache();

export const CacheKeys = {
  statistics: () => 'stats:global',
  entityCount: () => 'count:entities',
  documentCount: () => 'count:documents',
  forensicSummary: () => 'forensic:summary',
  entityById: (id: string | number) => `entity:${id}`,
  investigationList: (userId?: string) =>
    userId ? `investigations:list:${userId}` : 'investigations:list',
} as const;
