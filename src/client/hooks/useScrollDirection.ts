import { useState, useEffect } from 'react';

export function useScrollDirection(scrollRef: React.RefObject<HTMLElement>) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isScrolledToTop, setIsScrolledToTop] = useState(true);

  useEffect(() => {
    let lastScrollY = scrollRef.current?.scrollTop || 0;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = scrollRef.current?.scrollTop || 0;

      setIsScrolledToTop(scrollY < 10);

      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    const element = scrollRef.current;
    if (element) {
      element.addEventListener('scroll', onScroll);
      // Initial check
      setIsScrolledToTop(element.scrollTop < 10);
    }

    return () => {
      if (element) {
        element.removeEventListener('scroll', onScroll);
      }
    };
  }, [scrollRef]);

  return { scrollDirection, isScrolledToTop };
}
