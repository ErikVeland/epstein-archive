import React from 'react';
import { AlertTriangle, WifiOff, Database, FileText, RefreshCw, Home } from 'lucide-react';

interface TailoredErrorFallbackProps {
  errorType: 'network' | 'database' | 'document' | 'generic';
  onRetry?: () => void;
  onGoHome?: () => void;
}

export const TailoredErrorFallback: React.FC<TailoredErrorFallbackProps> = ({
  errorType,
  onRetry,
  onGoHome,
}) => {
  const getErrorDetails = () => {
    switch (errorType) {
      case 'network':
        return {
          icon: <WifiOff className="h-6 w-6 text-[var(--accent-warning)]" />,
          title: 'Network Connection Lost',
          message: 'Unable to connect to the server. Please check your internet connection.',
          nextSteps: 'Verify your network connection and try again.',
          showRetry: true,
          showHome: true,
        };
      case 'database':
        return {
          icon: <Database className="h-6 w-6 text-[var(--accent-danger)]" />,
          title: 'Database Unavailable',
          message: 'The database is temporarily unavailable. Our team has been notified.',
          nextSteps: 'Please try again in a few minutes.',
          showRetry: true,
          showHome: true,
        };
      case 'document':
        return {
          icon: <FileText className="h-6 w-6 text-[var(--accent)]" />,
          title: 'Document Not Found',
          message: 'The requested document could not be found or is unavailable.',
          nextSteps: 'Try selecting a different document or check back later.',
          showRetry: false,
          showHome: true,
        };
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-[var(--accent-warning)]" />,
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred while loading this content.',
          nextSteps: 'Please try again or return to the home page.',
          showRetry: true,
          showHome: true,
        };
    }
  };

  const { icon, title, message, nextSteps, showRetry, showHome } = getErrorDetails();

  return (
    <div className="p-[var(--space-6)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] max-w-2xl mx-auto">
      <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-3)]">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      <p className="text-sm mb-[var(--space-2)] text-[var(--text-secondary)]">{message}</p>
      <p className="text-xs mb-[var(--space-4)] text-[var(--text-muted)]">{nextSteps}</p>

      <div className="flex gap-[var(--space-3)]">
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-[var(--space-4)] py-[var(--space-2)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded text-[var(--text-primary)] transition-colors flex items-center gap-[var(--space-2)]"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}

        {showHome && onGoHome && (
          <button
            onClick={onGoHome}
            className="px-[var(--space-4)] py-[var(--space-2)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded text-[var(--text-primary)] transition-colors flex items-center gap-[var(--space-2)]"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
        )}
      </div>
    </div>
  );
};
