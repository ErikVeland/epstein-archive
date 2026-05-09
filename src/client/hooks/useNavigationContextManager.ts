import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type PageState = {
  scrollPosition: number;
  timestamp: number;
  path: string;
};

const SESSION_KEY_PREFIX = 'nav-context:';
const MAX_STORED_STATES = 50;

const toStorageKey = (path: string): string => `${SESSION_KEY_PREFIX}${path}`;

export const capturePageState = (path: string, scrollPosition: number): void => {
  try {
    const key = toStorageKey(path);
    const state: PageState = {
      scrollPosition,
      timestamp: Date.now(),
      path,
    };

    const existingKeys = Object.keys(sessionStorage).filter((k) =>
      k.startsWith(SESSION_KEY_PREFIX),
    );
    if (existingKeys.length >= MAX_STORED_STATES) {
      const sorted = existingKeys
        .map((k) => ({ key: k, ts: JSON.parse(sessionStorage.getItem(k) ?? '{}').timestamp ?? 0 }))
        .sort((a, b) => a.ts - b.ts);
      const toRemove = sorted.slice(0, Math.floor(MAX_STORED_STATES * 0.3));
      toRemove.forEach(({ key: k }) => sessionStorage.removeItem(k));
    }

    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable
  }
};

export const getPageState = (path: string): PageState | null => {
  try {
    const key = toStorageKey(path);
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as PageState;
  } catch {
    return null;
  }
};

export const clearPageState = (path: string): void => {
  try {
    sessionStorage.removeItem(toStorageKey(path));
  } catch {
    // sessionStorage unavailable
  }
};

export const useNavigationContextManager = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const capturedRef = useRef<string | null>(null);
  const closeInitiatedRef = useRef(false);

  useEffect(() => {
    if (closeInitiatedRef.current) {
      closeInitiatedRef.current = false;
      return;
    }

    const currentPath = `${location.pathname}${location.search}`;
    if (capturedRef.current === currentPath) return;
    capturedRef.current = currentPath;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    capturePageState(currentPath, scrollY);
  }, [location.pathname, location.search]);

  const closeModal = useCallback(
    (targetPath: string, options?: { replace?: boolean; scrollRestored?: boolean }) => {
      const { replace = true } = options ?? {};
      closeInitiatedRef.current = true;

      if (!options?.scrollRestored) {
        const state = getPageState(targetPath);
        if (state && state.scrollPosition > 0) {
          sessionStorage.setItem('nav-return:scroll', String(state.scrollPosition));
        }
      }

      navigate(targetPath, {
        replace,
        state: { ...location.state, _navReturn: targetPath },
      });
    },
    [navigate, location.state],
  );

  const restoreScroll = useCallback((targetPath: string) => {
    try {
      const state = getPageState(targetPath);
      if (state?.scrollPosition) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: state.scrollPosition, behavior: 'auto' });
        });
      }
      sessionStorage.removeItem('nav-return:scroll');
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  return { closeModal, restoreScroll };
};

export const useNavigationReturn = (onRestored?: () => void) => {
  const location = useLocation();
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    const navReturn = location.state as { _navReturn?: string } | null;
    if (navReturn?._navReturn && !hasRestoredRef.current) {
      hasRestoredRef.current = true;
      const scrollY = sessionStorage.getItem('nav-return:scroll');
      if (scrollY) {
        const scrollPos = Number(scrollY);
        if (Number.isFinite(scrollPos) && scrollPos > 0) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollPos, behavior: 'auto' });
            onRestored?.();
          });
        } else {
          onRestored?.();
        }
        sessionStorage.removeItem('nav-return:scroll');
      } else {
        onRestored?.();
      }
    }
  }, [location.state, onRestored]);
};
