import React from 'react';
import { AlertTriangle, WifiOff, Database, FileText, RefreshCw, Home } from 'lucide-react';
import s from './TailoredErrorFallback.module.css';

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
          icon: <WifiOff size={24} style={{ color: 'var(--accent-warning)' }} />,
          title: 'Network Connection Lost',
          message: 'Unable to connect to the server. Please check your internet connection.',
          nextSteps: 'Verify your network connection and try again.',
          showRetry: true,
          showHome: true,
        };
      case 'database':
        return {
          icon: <Database size={24} style={{ color: 'var(--accent-danger)' }} />,
          title: 'Database Unavailable',
          message: 'The database is temporarily unavailable. Our team has been notified.',
          nextSteps: 'Please try again in a few minutes.',
          showRetry: true,
          showHome: true,
        };
      case 'document':
        return {
          icon: <FileText size={24} style={{ color: 'var(--accent)' }} />,
          title: 'Document Not Found',
          message: 'The requested document could not be found or is unavailable.',
          nextSteps: 'Try selecting a different document or check back later.',
          showRetry: false,
          showHome: true,
        };
      default:
        return {
          icon: <AlertTriangle size={24} style={{ color: 'var(--accent-warning)' }} />,
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
    <div className={s.root}>
      <div className={s.header}>
        {icon}
        <h3 className={s.title}>{title}</h3>
      </div>

      <p className={s.message}>{message}</p>
      <p className={s.nextSteps}>{nextSteps}</p>

      <div className={s.actions}>
        {showRetry && onRetry && (
          <button onClick={onRetry} className={s.retryBtn}>
            <RefreshCw size={16} />
            Try Again
          </button>
        )}

        {showHome && onGoHome && (
          <button onClick={onGoHome} className={s.homeBtn}>
            <Home size={16} />
            Home
          </button>
        )}
      </div>
    </div>
  );
};
