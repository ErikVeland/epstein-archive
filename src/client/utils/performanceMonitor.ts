/**
 * Performance Monitoring Utility
 *
 * Lightweight performance markers for tracking:
 * - API response times
 * - JSON payload sizes
 * - Component render durations
 * - Time-to-first-card
 * - Time-to-modal-visible
 */

export interface PerformanceMetrics {
  apiCalls: APICallMetric[];
  renders: RenderMetric[];
  marks: PerformanceMark[];
  measures: PerformanceMeasure[];
}

export interface APICallMetric {
  endpoint: string;
  duration: number;
  payloadSize: number;
  timestamp: number;
  status?: number;
}

export interface RenderMetric {
  component: string;
  duration: number;
  timestamp: number;
  phase?: 'mount' | 'update';
}

class PerformanceMonitorClass {
  private apiCalls: APICallMetric[] = [];
  private renders: RenderMetric[] = [];
  private enabled: boolean;
  private maxEntries = 100; // Keep last 100 entries

  constructor() {
    // Enable in development or when explicitly enabled
    this.enabled = import.meta.env.DEV || localStorage.getItem('perf_monitor') === 'true';
  }

  /**
   * Create a performance mark
   */
  mark(label: string): void {
    if (!this.enabled) return;
    performance.mark(label);
  }

  /**
   * Measure duration between two marks
   */
  measure(label: string, startMark: string, endMark?: string): PerformanceMeasure | null {
    if (!this.enabled) return null;

    try {
      if (endMark) {
        performance.measure(label, startMark, endMark);
      } else {
        performance.measure(label, startMark);
      }

      const entries = performance.getEntriesByName(label, 'measure');
      return entries[entries.length - 1] as PerformanceMeasure;
    } catch (e) {
      console.warn(`Performance measure failed: ${label}`, e);
      return null;
    }
  }

  /**
   * Log API call metrics
   */
  logAPICall(endpoint: string, duration: number, payloadSize: number, status?: number): void {
    if (!this.enabled) return;

    const metric: APICallMetric = {
      endpoint,
      duration,
      payloadSize,
      timestamp: Date.now(),
      status,
    };

    this.apiCalls.push(metric);

    // Keep only last N entries
    if (this.apiCalls.length > this.maxEntries) {
      this.apiCalls.shift();
    }

    // Log slow API calls
    if (duration > 1000) {
      console.warn(`🐌 Slow API call: ${endpoint} took ${duration.toFixed(0)}ms`);
    }

    // Log large payloads
    if (payloadSize > 500000) {
      // 500KB
      console.warn(`📦 Large payload: ${endpoint} returned ${(payloadSize / 1024).toFixed(0)}KB`);
    }
  }

  /**
   * Log component render metrics
   */
  logRender(component: string, duration: number, phase?: 'mount' | 'update'): void {
    if (!this.enabled) return;

    const metric: RenderMetric = {
      component,
      duration,
      timestamp: Date.now(),
      phase,
    };

    this.renders.push(metric);

    // Keep only last N entries
    if (this.renders.length > this.maxEntries) {
      this.renders.shift();
    }

    // Log slow renders
    if (duration > 16) {
      // > 1 frame at 60fps
      console.warn(`🎨 Slow render: ${component} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      apiCalls: [...this.apiCalls],
      renders: [...this.renders],
      marks: performance.getEntriesByType('mark') as PerformanceMark[],
      measures: performance.getEntriesByType('measure') as PerformanceMeasure[],
    };
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    apiCalls: { count: number; avgDuration: number; p95Duration: number; avgPayloadSize: number };
    renders: { count: number; avgDuration: number; p95Duration: number };
  } {
    const apiDurations = this.apiCalls.map((c) => c.duration).sort((a, b) => a - b);
    const apiPayloads = this.apiCalls.map((c) => c.payloadSize);
    const renderDurations = this.renders.map((r) => r.duration).sort((a, b) => a - b);

    const p95Index = (arr: number[]) => Math.floor(arr.length * 0.95);
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      apiCalls: {
        count: this.apiCalls.length,
        avgDuration: avg(apiDurations),
        p95Duration: apiDurations[p95Index(apiDurations)] || 0,
        avgPayloadSize: avg(apiPayloads),
      },
      renders: {
        count: this.renders.length,
        avgDuration: avg(renderDurations),
        p95Duration: renderDurations[p95Index(renderDurations)] || 0,
      },
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.apiCalls = [];
    this.renders = [];
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('perf_monitor', enabled ? 'true' : 'false');
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    if (!this.enabled) return;

    const summary = this.getSummary();

    if (import.meta.env.DEV) {
      console.group('📊 Performance Summary');
      console.info('API Calls:', {
        count: summary.apiCalls.count,
        avgDuration: `${summary.apiCalls.avgDuration.toFixed(0)}ms`,
        p95Duration: `${summary.apiCalls.p95Duration.toFixed(0)}ms`,
        avgPayloadSize: `${(summary.apiCalls.avgPayloadSize / 1024).toFixed(0)}KB`,
      });
      console.info('Renders:', {
        count: summary.renders.count,
        avgDuration: `${summary.renders.avgDuration.toFixed(2)}ms`,
        p95Duration: `${summary.renders.p95Duration.toFixed(2)}ms`,
      });
      console.groupEnd();
    }
  }
}

// Singleton instance
export const PerformanceMonitor = new PerformanceMonitorClass();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as Window & { PerformanceMonitor?: PerformanceMonitorClass }).PerformanceMonitor =
    PerformanceMonitor;
}
