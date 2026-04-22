import { useState, useEffect } from 'react';

/**
 * Returns true when the primary pointing device is coarse (finger/stylus).
 * More accurate than a viewport-width check for tooltips — a 1024px iPad
 * with touch input should not show hover-dependent tooltips.
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isTouch;
}
