import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  API_FAILURES_BEFORE_DOWN,
  API_HEALTH_POLL_INTERVAL_MS,
  API_HEALTH_TIMEOUT_MS,
  API_LIVENESS_PATH,
} from './apiStatusConfig';

type ApiStatus = 'checking' | 'up' | 'down';

interface ApiStatusState {
  status: ApiStatus;
  errorMessage?: string;
  lastCheckedAt?: number;
  recheck: () => Promise<void>;
}

const ApiStatusContext = createContext<ApiStatusState | null>(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3012/api';
const IS_DEV = Boolean(import.meta.env.DEV);

async function pingApiHealth(timeoutMs = API_HEALTH_TIMEOUT_MS): Promise<void> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_LIVENESS_PATH, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`API health check failed (${res.status})`);
    }
  } finally {
    window.clearTimeout(t);
  }
}

export const ApiStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | undefined>(undefined);
  const statusRef = useRef<ApiStatus>('checking');
  const consecutiveFailuresRef = useRef(0);
  const inFlightCheckRef = useRef<Promise<void> | null>(null);

  const recheck = useCallback(async () => {
    if (inFlightCheckRef.current) {
      return inFlightCheckRef.current;
    }

    const checkPromise = (async () => {
      try {
        await pingApiHealth();
        consecutiveFailuresRef.current = 0;
        statusRef.current = 'up';
        setStatus((current) => (current === 'up' ? current : 'up'));
        setErrorMessage(undefined);
      } catch (err) {
        consecutiveFailuresRef.current += 1;
        const shouldMarkDown =
          statusRef.current !== 'up' || consecutiveFailuresRef.current >= API_FAILURES_BEFORE_DOWN;

        if (shouldMarkDown) {
          const base = err instanceof Error ? err.message : String(err);
          statusRef.current = 'down';
          setStatus((current) => (current === 'down' ? current : 'down'));
          setErrorMessage(() => {
            if (IS_DEV) {
              return `${base}. The API does not appear reachable. In dev, run "pnpm server" (default ${API_URL}).`;
            }
            return 'The service is temporarily unavailable. Please try again in a moment.';
          });
        }
      } finally {
        setLastCheckedAt(Date.now());
      }
    })();

    inFlightCheckRef.current = checkPromise;
    try {
      await checkPromise;
    } finally {
      if (inFlightCheckRef.current === checkPromise) {
        inFlightCheckRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void recheck();
    // Re-check periodically so the UI self-recovers once the API is started.
    const id = window.setInterval(() => void recheck(), API_HEALTH_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [recheck]);

  const value = useMemo<ApiStatusState>(
    () => ({ status, errorMessage, lastCheckedAt, recheck }),
    [status, errorMessage, lastCheckedAt, recheck],
  );

  return <ApiStatusContext.Provider value={value}>{children}</ApiStatusContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useApiStatus(): ApiStatusState {
  const ctx = useContext(ApiStatusContext);
  if (!ctx) throw new Error('useApiStatus must be used within ApiStatusProvider');
  return ctx;
}
