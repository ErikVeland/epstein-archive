import { useEffect, useMemo } from 'react';

export function usePageScrollRestoration(key: string): void {
  const storageKey = useMemo(() => `page-scroll:${key}`, [key]);

  useEffect(() => {
    let frame = 0;

    const restoreScroll = () => {
      try {
        const saved = sessionStorage.getItem(storageKey);
        const top = saved !== null ? Number(saved) : 0;
        window.scrollTo({ top: Number.isFinite(top) ? top : 0, behavior: 'auto' });
      } catch {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    };

    frame = window.requestAnimationFrame(restoreScroll);

    const persistScroll = () => {
      try {
        sessionStorage.setItem(storageKey, String(window.scrollY || window.pageYOffset || 0));
      } catch {
        // sessionStorage unavailable — silently skip
      }
    };

    window.addEventListener('scroll', persistScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      persistScroll();
      window.removeEventListener('scroll', persistScroll);
    };
  }, [storageKey]);
}
