/**
 * PREFETCH MANAGER V2
 *
 * Enhanced with:
 * - TTL + LRU eviction (max 50 entities)
 * - Metrics tracking (hit rate, wasted prefetches)
 * - Memory leak prevention
 */

interface PrefetchRequest {
  entityId: string;
  priority: number;
  timestamp: number;
  controller: AbortController;
}

interface PrefetchMetrics {
  totalPrefetches: number;
  cacheHits: number;
  wastedPrefetches: number; // Prefetched but never used
  evictions: number;
}

interface CachedEntity {
  data: Record<string, unknown>;
  timestamp: number;
  accessed: number; // Last access time for LRU
  prefetched: boolean; // Was this prefetched or fetched normally?
}

interface ConnectionInfo {
  saveData?: boolean;
  effectiveType?: string;
}

class PrefetchManagerV2 {
  private queue: PrefetchRequest[] = [];
  private inFlight = new Map<string, AbortController>();
  private cache = new Map<string, CachedEntity>();

  private readonly MAX_CONCURRENT = 3;
  private readonly MAX_CACHE_SIZE = 50; // LRU limit
  private readonly CACHE_TTL = 60000; // 60s
  private readonly SCROLL_VELOCITY_THRESHOLD = 500; // px/s

  private lastScrollY = 0;
  private lastScrollTime = Date.now();
  private scrollVelocity = 0;

  private enabled = true;

  private metrics: PrefetchMetrics = {
    totalPrefetches: 0,
    cacheHits: 0,
    wastedPrefetches: 0,
    evictions: 0,
  };

  constructor() {
    // Disable on slow connection or Save-Data
    if (typeof navigator !== 'undefined') {
      const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
      if (connection) {
        if (
          connection.saveData ||
          connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g'
        ) {
          this.enabled = false;
        }
      }
    }

    // Track scroll velocity
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
    }

    // Periodic cleanup of expired entries
    setInterval(() => this.cleanupExpired(), 30000); // Every 30s
  }

  private handleScroll = () => {
    const now = Date.now();
    const currentScrollY = window.scrollY;

    const deltaY = Math.abs(currentScrollY - this.lastScrollY);
    const deltaTime = now - this.lastScrollTime;

    this.scrollVelocity = deltaTime > 0 ? (deltaY / deltaTime) * 1000 : 0;

    // Cancel all prefetches if scrolling fast
    if (this.scrollVelocity > this.SCROLL_VELOCITY_THRESHOLD) {
      this.cancelAll();
    }

    this.lastScrollY = currentScrollY;
    this.lastScrollTime = now;
  };

  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [entityId, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        // Track wasted prefetches (prefetched but never accessed)
        if (cached.prefetched && cached.accessed === cached.timestamp) {
          this.metrics.wastedPrefetches++;
        }
        toDelete.push(entityId);
      }
    }

    for (const entityId of toDelete) {
      this.cache.delete(entityId);
      this.metrics.evictions++;
    }
  }

  private evictLRU(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;

    // Find least recently accessed entry
    let oldestEntityId: string | null = null;
    let oldestAccess = Infinity;

    for (const [entityId, cached] of this.cache.entries()) {
      if (cached.accessed < oldestAccess) {
        oldestAccess = cached.accessed;
        oldestEntityId = entityId;
      }
    }

    if (oldestEntityId) {
      const cached = this.cache.get(oldestEntityId)!;
      if (cached.prefetched && cached.accessed === cached.timestamp) {
        this.metrics.wastedPrefetches++;
      }
      this.cache.delete(oldestEntityId);
      this.metrics.evictions++;
    }
  }

  /**
   * Prefetch entity overview DTO (lightweight only)
   */
  async prefetch(entityId: string, priority = 0): Promise<void> {
    if (!this.enabled) return;

    // Check cache
    const cached = this.cache.get(entityId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return; // Already cached
    }

    // Check if already in flight
    if (this.inFlight.has(entityId)) {
      return; // Already prefetching
    }

    // Check if already queued
    if (this.queue.some((r) => r.entityId === entityId)) {
      return; // Already queued
    }

    // Add to queue
    const controller = new AbortController();
    this.queue.push({
      entityId,
      priority,
      timestamp: Date.now(),
      controller,
    });

    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Process queue
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    // Process up to MAX_CONCURRENT requests
    while (this.inFlight.size < this.MAX_CONCURRENT && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      this.inFlight.set(request.entityId, request.controller);
      this.metrics.totalPrefetches++;

      try {
        // Only fetch lean overview DTO (no heavy tabs)
        const response = await fetch(`/api/entities/${request.entityId}`, {
          signal: request.controller.signal,
          headers: {
            'X-Prefetch': 'true', // Server can use this to deprioritize
          },
        });

        if (response.ok) {
          const data = await response.json();
          const now = Date.now();

          // Evict LRU if needed
          this.evictLRU();

          this.cache.set(request.entityId, {
            data,
            timestamp: now,
            accessed: now,
            prefetched: true,
          });
        }
      } catch (error) {
        // Silently fail (prefetch is best-effort)
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.warn(`[PrefetchManager] Failed to prefetch ${request.entityId}:`, error);
        }
      } finally {
        this.inFlight.delete(request.entityId);

        // Continue processing queue
        if (this.queue.length > 0) {
          this.processQueue();
        }
      }
    }
  }

  /**
   * Get cached data if available (marks as accessed for LRU)
   */
  getCached(entityId: string): Record<string, unknown> | null {
    const cached = this.cache.get(entityId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      cached.accessed = Date.now(); // Update LRU
      this.metrics.cacheHits++;
      return cached.data;
    }
    return null;
  }

  /**
   * Cancel all in-flight and queued prefetches
   */
  cancelAll(): void {
    // Cancel in-flight
    for (const controller of this.inFlight.values()) {
      controller.abort();
    }
    this.inFlight.clear();

    // Cancel queued
    for (const request of this.queue) {
      request.controller.abort();
    }
    this.queue = [];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const hitRate =
      this.metrics.totalPrefetches > 0 ? this.metrics.cacheHits / this.metrics.totalPrefetches : 0;

    const wasteRate =
      this.metrics.totalPrefetches > 0
        ? this.metrics.wastedPrefetches / this.metrics.totalPrefetches
        : 0;

    return {
      enabled: this.enabled,
      inFlight: this.inFlight.size,
      queued: this.queue.length,
      cached: this.cache.size,
      scrollVelocity: this.scrollVelocity.toFixed(2),
      totalPrefetches: this.metrics.totalPrefetches,
      cacheHits: this.metrics.cacheHits,
      wastedPrefetches: this.metrics.wastedPrefetches,
      evictions: this.metrics.evictions,
      hitRate: (hitRate * 100).toFixed(1) + '%',
      wasteRate: (wasteRate * 100).toFixed(1) + '%',
    };
  }
}

// Singleton instance
export const prefetchManager = new PrefetchManagerV2();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as Window & { prefetchManager?: PrefetchManagerV2 }).prefetchManager = prefetchManager;
}
