import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

async function pingApiHealth(timeoutMs = 8000): Promise<void> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/health/ready', {
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

  const recheck = useCallback(async () => {
    setStatus('checking');
    setErrorMessage(undefined);
    try {
      await pingApiHealth();
      setStatus('up');
    } catch (err) {
      const base = err instanceof Error ? err.message : String(err);
      setStatus('down');
      setErrorMessage(() => {
        if (IS_DEV) {
          return `${base}. The API does not appear reachable. In dev, run "pnpm server" (default ${API_URL}).`;
        }
        return 'The service is temporarily unavailable. Please try again in a moment.';
      });
    } finally {
      setLastCheckedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    void recheck();
    // Re-check periodically so the UI self-recovers once the API is started.
    const id = window.setInterval(() => void recheck(), 15_000);
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
