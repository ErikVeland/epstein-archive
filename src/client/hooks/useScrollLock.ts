import { useEffect } from 'react';

let lockCount = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';
let previousHtmlOverflow = '';
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyWidth = '';
let previousBodyTouchAction = '';
let previousHtmlOverscrollBehavior = '';
let lockedScrollY = 0;

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
      const bodyStyle = window.getComputedStyle(document.body);
      const htmlStyle = window.getComputedStyle(document.documentElement);
      lockedScrollY = window.scrollY;
      previousBodyOverflow = bodyStyle.overflow;
      previousBodyPaddingRight = document.body.style.paddingRight;
      previousBodyPosition = document.body.style.position;
      previousBodyTop = document.body.style.top;
      previousBodyWidth = document.body.style.width;
      previousBodyTouchAction = document.body.style.touchAction;
      previousHtmlOverflow = htmlStyle.overflow;
      previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.width = '100%';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.body.style.paddingRight = previousBodyPaddingRight;
        document.body.style.position = previousBodyPosition;
        document.body.style.top = previousBodyTop;
        document.body.style.width = previousBodyWidth;
        document.body.style.touchAction = previousBodyTouchAction;
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
        window.scrollTo(0, lockedScrollY);
      }
    };
  }, [isOpen]);
};
