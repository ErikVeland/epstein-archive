import { useEffect, useState } from 'react';

/**
 * Shared IntersectionObserver hook - creates ONE observer for all images
 * instead of one per image. Massive performance improvement for large grids.
 */

type ObserverCallback = (isIntersecting: boolean) => void;

// Global singleton observer
let globalObserver: IntersectionObserver | null = null;
const observerCallbacks = new Map<Element, ObserverCallback>();

function getGlobalObserver(options: IntersectionObserverInit): IntersectionObserver {
  if (!globalObserver) {
    globalObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const callback = observerCallbacks.get(entry.target);
        if (callback) {
          callback(entry.isIntersecting);
        }
      });
    }, options);
  }
  return globalObserver;
}

export function useSharedIntersectionObserver(
  elementRef: React.RefObject<Element | null>,
  callback: ObserverCallback,
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: '200px' },
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = getGlobalObserver(options);

    const wrappedCallback = (intersecting: boolean) => {
      setIsIntersecting(intersecting);
      callback(intersecting);

      // Unobserve after first intersection to save memory
      if (intersecting) {
        observer.unobserve(element);
        observerCallbacks.delete(element);
      }
    };

    observerCallbacks.set(element, wrappedCallback);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observerCallbacks.delete(element);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options object is destructured into stable primitives
  }, [elementRef, callback, options.threshold, options.rootMargin]);

  return isIntersecting;
}
