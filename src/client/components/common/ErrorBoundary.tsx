import { Component, ReactNode } from 'react';

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

  componentDidCatch(error: Error, info: any) {
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
        <div className="min-h-screen bg-gray-950 text-[var(--text-primary)] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6 shadow-[var(--glass-shadow)]">
            <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-4">{msg}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-[var(--text-primary)] rounded-[var(--radius-lg)]"
              >
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
                className="px-3 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)]"
              >
                Clear cache & reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
