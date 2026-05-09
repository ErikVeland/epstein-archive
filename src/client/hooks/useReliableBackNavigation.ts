import { useCallback, useEffect, useRef } from 'react';
import {
  useLocation,
  useNavigate,
  useNavigationType,
  type Location,
  type NavigationType,
  type To,
} from 'react-router-dom';

type RouteEntry = {
  key: string;
  path: string;
};

type BackNavigationState = {
  backTo?: To;
};

const MAX_TRACKED_ROUTES = 100;

let routeEntries: RouteEntry[] = [];
let currentRouteIndex = -1;
let lastRecordedSignature: string | null = null;

const toPath = (location: Pick<Location, 'pathname' | 'search' | 'hash'>): string =>
  `${location.pathname}${location.search}${location.hash}`;

const readReturnTargetFromSearch = (search: string): string | null => {
  const params = new URLSearchParams(search);
  const rawTarget = params.get('returnTo') || params.get('backTo');
  if (!rawTarget) return null;

  try {
    const target = decodeURIComponent(rawTarget);
    return target.startsWith('/') && !target.startsWith('//') ? target : null;
  } catch {
    return rawTarget.startsWith('/') && !rawTarget.startsWith('//') ? rawTarget : null;
  }
};

const recordRoute = (
  location: Pick<Location, 'key' | 'pathname' | 'search' | 'hash'>,
  navigationType: NavigationType,
) => {
  const path = toPath(location);
  const key = location.key || 'default';
  const signature = `${navigationType}:${key}:${path}`;

  if (lastRecordedSignature === signature) {
    return;
  }

  lastRecordedSignature = signature;

  if (routeEntries.length === 0) {
    routeEntries = [{ key, path }];
    currentRouteIndex = 0;
    return;
  }

  const existingIndex = routeEntries.findIndex((entry) => entry.key === key);

  if (navigationType === 'POP') {
    if (existingIndex >= 0) {
      currentRouteIndex = existingIndex;
      return;
    }

    routeEntries = [{ key, path }];
    currentRouteIndex = 0;
    return;
  }

  if (navigationType === 'REPLACE') {
    if (existingIndex >= 0) {
      routeEntries[existingIndex] = { key, path };
      currentRouteIndex = existingIndex;
      return;
    }

    if (currentRouteIndex >= 0) {
      routeEntries[currentRouteIndex] = { key, path };
      return;
    }

    routeEntries = [{ key, path }];
    currentRouteIndex = 0;
    return;
  }

  if (existingIndex >= 0) {
    currentRouteIndex = existingIndex;
    return;
  }

  const nextEntries =
    currentRouteIndex >= 0 ? routeEntries.slice(0, currentRouteIndex + 1) : routeEntries.slice();
  nextEntries.push({ key, path });
  routeEntries = nextEntries.slice(-MAX_TRACKED_ROUTES);
  currentRouteIndex = routeEntries.length - 1;
};

const getTrackedPreviousPath = (): string | null => {
  if (currentRouteIndex <= 0) {
    return null;
  }

  return routeEntries[currentRouteIndex - 1]?.path ?? null;
};

export const useTrackRouteHistory = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    recordRoute(
      {
        key: location.key,
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      navigationType,
    );
  }, [location.hash, location.key, location.pathname, location.search, navigationType]);
};

const NAV_RETURN_KEY = 'nav-return:scroll';

const saveScrollPosition = (path: string): void => {
  try {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    if (scrollY > 0) {
      sessionStorage.setItem(
        NAV_RETURN_KEY,
        JSON.stringify({ path, scrollY, timestamp: Date.now() }),
      );
    }
  } catch {
    // sessionStorage unavailable
  }
};

export const useReliableBackNavigation = (defaultFallback: To = '/') => {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) {
      restoredRef.current = false;
      return;
    }
    try {
      const stored = sessionStorage.getItem(NAV_RETURN_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data && typeof data.scrollY === 'number' && data.scrollY > 0) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: data.scrollY, behavior: 'auto' });
          });
        }
      }
    } catch {
      // sessionStorage unavailable or invalid JSON
    }
  }, [location.pathname, location.search]);

  const goBack = useCallback(
    (fallback: To = defaultFallback) => {
      const currentPath = toPath(location);
      const locationState = (location.state as BackNavigationState | null) ?? null;

      const explicitTarget =
        (typeof locationState?.backTo === 'string' ? locationState.backTo : null) ||
        readReturnTargetFromSearch(location.search);

      if (explicitTarget && explicitTarget !== currentPath) {
        saveScrollPosition(currentPath);
        navigate(explicitTarget);
        return;
      }

      const navReturn = locationState as { _navReturn?: string } | null;
      if (navReturn?._navReturn && navReturn._navReturn !== currentPath) {
        saveScrollPosition(currentPath);
        navigate(navReturn._navReturn);
        return;
      }

      const trackedPrevious = getTrackedPreviousPath();
      if (trackedPrevious) {
        saveScrollPosition(currentPath);
        navigate(-1);
        return;
      }

      navigate(fallback, { replace: true });
    },
    [defaultFallback, location, navigate],
  );

  return { goBack };
};

export const useBackLinkState = () => {
  const location = useLocation();

  return {
    backTo: toPath(location),
  } satisfies BackNavigationState;
};
