/**
 * WEB VITALS + LONG TASK TRACKING
 *
 * Lightweight performance monitoring for:
 * - CLS (Cumulative Layout Shift)
 * - INP (Interaction to Next Paint)
 * - LCP (Largest Contentful Paint)
 * - Long tasks > 50ms
 *
 * Optional in production, always on in dev
 */

interface WebVitalsMetrics {
  cls: number;
  inp: number;
  lcp: number;
  fid: number;
  longTasks: number[];
}

interface PerformanceThresholds {
  cls: number; // < 0.1 good, < 0.25 needs improvement
  inp: number; // < 200ms good, < 500ms needs improvement
  lcp: number; // < 2500ms good, < 4000ms needs improvement
  longTask: number; // > 50ms
}

type LayoutShiftEntry = PerformanceEntry & { hadRecentInput?: boolean; value?: number };
type EventTimingEntry = PerformanceEntry & { processingStart?: number; processingEnd?: number };

class WebVitalsMonitor {
  private metrics: WebVitalsMetrics = {
    cls: 0,
    inp: 0,
    lcp: 0,
    fid: 0,
    longTasks: [],
  };

  private thresholds: PerformanceThresholds = {
    cls: 0.1,
    inp: 200,
    lcp: 2500,
    longTask: 50,
  };

  private enabled: boolean;

  constructor() {
    this.enabled =
      typeof window !== 'undefined' &&
      (process.env.NODE_ENV === 'development' ||
        localStorage.getItem('webVitalsEnabled') === 'true');

    if (this.enabled) {
      this.init();
    }
  }

  private init(): void {
    // CLS - Cumulative Layout Shift
    this.observeCLS();

    // LCP - Largest Contentful Paint
    this.observeLCP();

    // INP/FID - Interaction responsiveness
    this.observeINP();

    // Long tasks
    this.observeLongTasks();

    // Print summary on page unload (dev only)
    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('beforeunload', () => {
        this.printSummary();
      });
    }
  }

  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as LayoutShiftEntry;
          if (layoutShift.hadRecentInput) continue;
          this.metrics.cls += Number(layoutShift.value || 0);
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (_error) {
      // PerformanceObserver not supported
    }
  }

  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_error) {
      // PerformanceObserver not supported
    }
  }

  private observeINP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Try INP first (newer metric)
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const timing = entry as EventTimingEntry;
          const duration = Number(timing.processingEnd || 0) - Number(timing.processingStart || 0);
          if (duration > this.metrics.inp) {
            this.metrics.inp = duration;
          }
        }
      });

      observer.observe({ type: 'event', buffered: true });
    } catch (_error) {
      // Fall back to FID
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const timing = entry as EventTimingEntry;
            this.metrics.fid = Number(timing.processingStart || 0) - entry.startTime;
          }
        });

        observer.observe({ type: 'first-input', buffered: true });
      } catch (_fallbackError) {
        // Neither supported
      }
    }
  }

  private observeLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration;
          if (duration > this.thresholds.longTask) {
            this.metrics.longTasks.push(duration);

            if (process.env.NODE_ENV === 'development') {
              console.warn(`[WebVitals] Long task detected: ${duration.toFixed(2)}ms`);
            }
          }
        }
      });

      observer.observe({ type: 'longtask', buffered: true });
    } catch (_error) {
      // PerformanceObserver not supported
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebVitalsMetrics & {
    clsRating: 'good' | 'needs-improvement' | 'poor';
    inpRating: 'good' | 'needs-improvement' | 'poor';
    lcpRating: 'good' | 'needs-improvement' | 'poor';
    longTaskCount: number;
    avgLongTask: number;
  } {
    const clsRating =
      this.metrics.cls < 0.1 ? 'good' : this.metrics.cls < 0.25 ? 'needs-improvement' : 'poor';
    const inpRating =
      this.metrics.inp < 200 ? 'good' : this.metrics.inp < 500 ? 'needs-improvement' : 'poor';
    const lcpRating =
      this.metrics.lcp < 2500 ? 'good' : this.metrics.lcp < 4000 ? 'needs-improvement' : 'poor';

    const avgLongTask =
      this.metrics.longTasks.length > 0
        ? this.metrics.longTasks.reduce((sum, d) => sum + d, 0) / this.metrics.longTasks.length
        : 0;

    return {
      ...this.metrics,
      clsRating,
      inpRating,
      lcpRating,
      longTaskCount: this.metrics.longTasks.length,
      avgLongTask,
    };
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    if (!this.enabled) return;

    const metrics = this.getMetrics();

    console.log('\n' + '='.repeat(80));
    console.log('WEB VITALS SUMMARY');
    console.log('='.repeat(80));
    console.log(`CLS: ${metrics.cls.toFixed(3)} (${metrics.clsRating})`);
    console.log(`LCP: ${metrics.lcp.toFixed(0)}ms (${metrics.lcpRating})`);
    console.log(`INP: ${metrics.inp.toFixed(0)}ms (${metrics.inpRating})`);
    console.log(`Long tasks: ${metrics.longTaskCount} (avg: ${metrics.avgLongTask.toFixed(0)}ms)`);
    console.log('='.repeat(80) + '\n');

    // Check thresholds
    const failures: string[] = [];
    if (metrics.clsRating === 'poor') failures.push('CLS');
    if (metrics.lcpRating === 'poor') failures.push('LCP');
    if (metrics.inpRating === 'poor') failures.push('INP');
    if (metrics.longTaskCount > 10) failures.push('Long tasks');

    if (failures.length > 0) {
      console.warn(`Performance issues detected: ${failures.join(', ')}`);
    } else {
      console.log('All Web Vitals within acceptable thresholds');
    }
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('webVitalsEnabled', enabled.toString());
    }
  }
}

// Singleton instance
export const webVitalsMonitor = new WebVitalsMonitor();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as Window & { webVitalsMonitor?: WebVitalsMonitor }).webVitalsMonitor = webVitalsMonitor;
}
