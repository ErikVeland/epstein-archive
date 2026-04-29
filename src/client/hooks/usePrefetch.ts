/**
 * React hooks for safe prefetching using PrefetchManager
 */

import { useEffect, useRef } from 'react';
import { prefetchManager } from '@client/utils/prefetchManager';

interface PrefetchOptions {
  enabled?: boolean;
  delay?: number;
  priority?: number;
}

/**
 * Prefetch entity data on hover
 */
export function usePrefetchEntity(entityId: string | null, options: PrefetchOptions = {}) {
  const { enabled = true, delay = 200, priority = 0 } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();

  const prefetch = () => {
    if (!enabled || !entityId) return;

    timeoutRef.current = setTimeout(() => {
      prefetchManager.prefetch(entityId, priority);
    }, delay);
  };

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => cancel();
  }, []);

  return { prefetch, cancel };
}

/**
 * Prefetch entities when they enter the viewport
 */
export function usePrefetchOnViewport(
  ref: React.RefObject<HTMLElement>,
  entityId: string | null,
  options: PrefetchOptions = {},
) {
  const { enabled = true, priority = -1 } = options; // Lower priority for viewport prefetch

  useEffect(() => {
    if (!enabled || !entityId || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Use requestIdleCallback for low-priority prefetch
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                prefetchManager.prefetch(entityId, priority);
              });
            } else {
              setTimeout(() => {
                prefetchManager.prefetch(entityId, priority);
              }, 100);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Prefetch when within 50px of viewport
      },
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, entityId, enabled, priority]);
}
