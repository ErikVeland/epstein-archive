import { useCallback, useEffect, useRef } from 'react';

type ListScrollArgs = { scrollOffset?: number; scrollTop?: number };

/**
 * Saves and restores the scroll offset for a react-window virtualised list
 * using sessionStorage. The key should be unique per list instance (e.g. the
 * route path). Scroll position is written on every scroll event and read on
 * mount so back-navigation returns the user to the same position.
 *
 * Usage:
 *   const { initialScrollOffset, onScroll } = useListScrollRestoration('/flights');
 *   <FixedSizeList initialScrollOffset={initialScrollOffset} onScroll={onScroll} ... />
 */
export function useListScrollRestoration(key: string): {
  initialScrollOffset: number;
  onScroll: (props: ListScrollArgs) => void;
} {
  const storageKey = `scroll-offset:${key}`;
  const latestOffset = useRef(0);

  const initialScrollOffset = (() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved !== null ? Number(saved) : 0;
    } catch {
      return 0;
    }
  })();

  const onScroll = useCallback(
    ({ scrollOffset, scrollTop }: ListScrollArgs) => {
      const nextOffset = scrollOffset ?? scrollTop ?? 0;
      latestOffset.current = nextOffset;
      try {
        sessionStorage.setItem(storageKey, String(nextOffset));
      } catch {
        // sessionStorage unavailable — silently skip
      }
    },
    [storageKey],
  );

  // Clear saved position when the component unmounts cleanly
  // (e.g. filter change resets the list). Only clear if the user
  // navigated forward; on back-nav the component re-mounts and
  // we want to keep the saved position.
  useEffect(() => {
    return () => {
      // Keep the last written value — restoration reads from sessionStorage
      // on next mount. This is a no-op teardown.
    };
  }, []);

  return { initialScrollOffset, onScroll };
}
