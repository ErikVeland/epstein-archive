import React, { Component, ReactNode } from 'react';
import s from './ErrorBoundary.module.css';

import { Button } from '../../design-system/lib';

async function clearClientCaches(): Promise<void> {
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      console.error('ErrorBoundary caught:', error, info);
    } catch {
      // Ignore console errors
    }
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Unexpected error';
      return (
        <div className={s.screen}>
          <div className={s.card}>
            <h1 className={s.heading}>Something went wrong</h1>
            <p className={s.message}>{msg}</p>
            <div className={s.actions}>
              <Button unstyled onClick={() => window.location.reload()} className={s.reloadBtn}>
                Reload
              </Button>
              <Button
                unstyled
                onClick={async () => {
                  await clearClientCaches();
                  const url = new URL(window.location.href);
                  url.searchParams.set('cachebust', Date.now().toString());
                  window.location.replace(url.toString());
                }}
                className={s.clearBtn}
              >
                Clear cache &amp; reload
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
