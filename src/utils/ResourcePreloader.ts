/**
 * ResourcePreloader Utility
 *
 * Provides methods to pre-fetch data and assets to improve perceived performance.
 */

type PreloadPriority = 'high' | 'low';

interface PreloadOptions {
  priority?: PreloadPriority;
  timeout?: number;
}

class ResourcePreloader {
  private preloadedUrls = new Set<string>();
  private cache = new Map<string, unknown>();

  /**
   * Pre-fetches a JSON resource and caches it
   */
  async prefetchJson(url: string, _options: PreloadOptions = {}) {
    if (this.preloadedUrls.has(url)) return;

    this.preloadedUrls.add(url);

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        this.cache.set(url, data);
        console.log(`[Preloader] Prefetched JSON: ${url}`);
      }
    } catch (error) {
      console.warn(`[Preloader] Failed to prefetch JSON: ${url}`, error);
      this.preloadedUrls.delete(url);
    }
  }

  /**
   * Pre-fetches an image by creating a hidden Image object
   */
  prefetchImage(url: string) {
    if (this.preloadedUrls.has(url)) return;

    this.preloadedUrls.add(url);

    const img = new Image();
    img.src = url;
    img.onload = () => console.log(`[Preloader] Prefetched Image: ${url}`);
    img.onerror = () => this.preloadedUrls.delete(url);
  }

  /**
   * Gets a cached resource if available
   */
  getCached(url: string) {
    return this.cache.get(url);
  }

  /**
   * Clears the cache
   */
  clearCache() {
    this.cache.clear();
    this.preloadedUrls.clear();
  }
}

export const preloader = new ResourcePreloader();
export default preloader;
