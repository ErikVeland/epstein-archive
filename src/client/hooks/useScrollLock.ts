import { useEffect } from 'react';

let lockCount = 0;
let previousTargetOverflow = '';
let previousTargetPaddingRight = '';
let previousTargetOverscrollBehavior = '';
let previousHtmlOverscrollBehavior = '';
let lockedScrollTop = 0;
let lockedTarget: HTMLElement | null = null;

/**
 * Hook to lock body scroll when a modal is open.
 * Handles multiple nested modals correctly by maintaining a lock count (conceptually,
 * though simplistic implementation usually suffices for this app).
 *
 * Also adds padding to body to prevent layout shift from scrollbar disappearance.
 */
export const useScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    lockCount += 1;
    if (lockCount === 1) {
      lockedTarget =
        (document.querySelector('[data-scroll-lock-root="true"]') as HTMLElement | null) ??
        (document.scrollingElement as HTMLElement | null) ??
        document.documentElement;

      lockedScrollTop = lockedTarget.scrollTop;
      previousTargetOverflow = lockedTarget.style.overflow;
      previousTargetPaddingRight = lockedTarget.style.paddingRight;
      previousTargetOverscrollBehavior = lockedTarget.style.overscrollBehavior;
      previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;

      const scrollbarWidth = lockedTarget.offsetWidth - lockedTarget.clientWidth;
      if (scrollbarWidth > 0) {
        lockedTarget.style.paddingRight = `${scrollbarWidth}px`;
      }
      lockedTarget.style.overflow = 'hidden';
      lockedTarget.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        if (lockedTarget) {
          lockedTarget.style.overflow = previousTargetOverflow;
          lockedTarget.style.paddingRight = previousTargetPaddingRight;
          lockedTarget.style.overscrollBehavior = previousTargetOverscrollBehavior;
          lockedTarget.scrollTop = lockedScrollTop;
        }
        document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
        lockedTarget = null;
      }
    };
  }, [isOpen]);
};
