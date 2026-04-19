import { useEffect, useCallback, useRef } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

export function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  options: SwipeOptions = {},
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefault = false,
  } = options;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEnded = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEnded.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (preventDefault && e.cancelable) {
        e.preventDefault();
      }
    },
    [preventDefault],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchEnded.current) return;
      touchEnded.current = true;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }
      } else {
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }
    },
    [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);
}

export function usePullToRefresh(onRefresh: () => void, threshold = 80) {
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);
  const isRefreshing = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing.current) return;

      currentY.current = e.touches[0].clientY;
      const delta = currentY.current - startY.current;

      if (delta > 0 && window.scrollY === 0) {
        document.body.style.setProperty(
          '--pull-indicator',
          `${Math.min(delta, threshold * 1.5)}px`,
        );
      }
    },
    [threshold],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current || isRefreshing.current) {
      isPulling.current = false;
      return;
    }

    const delta = currentY.current - startY.current;
    if (delta > threshold) {
      isRefreshing.current = true;
      onRefresh();
      setTimeout(() => {
        isRefreshing.current = false;
        document.body.style.removeProperty('--pull-indicator');
      }, 1000);
    }

    document.body.style.removeProperty('--pull-indicator');
    isPulling.current = false;
  }, [threshold, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}
