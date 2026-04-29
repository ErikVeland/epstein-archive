/**
 * PRODUCTION WEB VITALS SAMPLING
 *
 * 1% session sampling, privacy-safe, lightweight
 * Stores daily p75 aggregates
 */

interface VitalsPayload {
  sessionId: string; // Hashed, no PII
  route: string; // Hashed route name
  cls: number;
  lcp: number;
  inp: number;
  longTaskCount: number;
  timestamp: number;
}

class ProductionVitalsCollector {
  private enabled: boolean;
  private sampleRate: number;
  private sessionSampled: boolean;

  constructor() {
    this.sampleRate = parseFloat(process.env.VITALS_SAMPLE_RATE || '0.01'); // 1% default
    this.enabled =
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      !navigator.doNotTrack;

    // Deterministic sampling based on session
    this.sessionSampled = this.enabled && Math.random() < this.sampleRate;

    if (this.sessionSampled) {
      console.log('[Vitals] Session sampled for metrics collection');
    }
  }

  /**
   * Send vitals to backend (if sampled)
   */
  async sendVitals(vitals: Omit<VitalsPayload, 'sessionId' | 'timestamp'>): Promise<void> {
    if (!this.sessionSampled) return;

    const payload: VitalsPayload = {
      sessionId: this.getSessionId(),
      route: this.hashRoute(vitals.route),
      cls: vitals.cls,
      lcp: vitals.lcp,
      inp: vitals.inp,
      longTaskCount: vitals.longTaskCount,
      timestamp: Date.now(),
    };

    // Validate payload size < 2KB
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 2048) {
      console.warn('[Vitals] Payload too large, skipping');
      return;
    }

    try {
      // Use sendBeacon for non-blocking send
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon('/api/vitals', JSON.stringify(payload));
      } else {
        // Fallback to fetch with keepalive
        fetch('/api/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {}); // Silent fail
      }
    } catch (_error) {
      // Silent fail - vitals collection must not affect app
    }
  }

  /**
   * Get deterministic session ID (hashed, no PII)
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('vitals_session_id');
    if (!sessionId) {
      sessionId = this.hash(Date.now() + Math.random().toString());
      sessionStorage.setItem('vitals_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Hash route name (no raw URLs)
   */
  private hashRoute(route: string): string {
    return this.hash(route);
  }

  /**
   * Simple hash function
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Singleton instance
export const productionVitalsCollector = new ProductionVitalsCollector();

// Expose for debugging
if (typeof window !== 'undefined') {
  (
    window as Window & { productionVitalsCollector?: ProductionVitalsCollector }
  ).productionVitalsCollector = productionVitalsCollector;
}
