import React, { Component, ReactNode } from 'react';
import s from './ErrorBoundary.module.css';

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
              <button onClick={() => window.location.reload()} className={s.reloadBtn}>
                Reload
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch {
                    // Ignore localStorage errors
                  }
                  window.location.reload();
                }}
                className={s.clearBtn}
              >
                Clear cache &amp; reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
