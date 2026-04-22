import { useCallback, useRef } from 'react';
import type React from 'react';

interface LongPressOptions {
  /** Hold duration in ms before long-press fires (default: 500) */
  delay?: number;
  /** Max pointer movement in px before the gesture is cancelled (default: 8) */
  moveThreshold?: number;
}

/**
 * Detects long-press gestures via pointer events. Works for both touch and mouse.
 *
 * Spread the returned handlers onto the target element. Call `consumeClick()`
 * at the start of any `onClick` handler to suppress the tap that browsers fire
 * after a long-press release.
 *
 * Usage:
 *   const { consumeClick, onContextMenu, ...lpHandlers } = useLongPress(() => setOpen(true));
 *   <div {...lpHandlers} onContextMenu={onContextMenu} onClick={() => { if (consumeClick()) return; ... }} />
 */
export function useLongPress(
  onLongPress: () => void,
  { delay = 500, moveThreshold = 8 }: LongPressOptions = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const didFire = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch' && e.button !== 0) return;
      startPos.current = { x: e.clientX, y: e.clientY };
      didFire.current = false;
      timerRef.current = setTimeout(() => {
        didFire.current = true;
        timerRef.current = null;
        onLongPress();
      }, delay);
    },
    [delay, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPos.current) return;
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > moveThreshold || dy > moveThreshold) cancel();
    },
    [moveThreshold, cancel],
  );

  /** Suppress the browser's native context menu when our long-press already fired. */
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (didFire.current) e.preventDefault();
  }, []);

  /**
   * Call at the start of an onClick handler. Returns true (and clears the flag)
   * if the tap followed a long-press, so the handler can early-return and not
   * also navigate.
   */
  const consumeClick = useCallback((): boolean => {
    if (didFire.current) {
      didFire.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu,
    consumeClick,
  };
}
