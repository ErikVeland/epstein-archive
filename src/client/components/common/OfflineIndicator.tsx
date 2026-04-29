import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@client/design-system/lib';
import Icon from '../common/Icon';
import styles from './OfflineIndicator.module.css';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (isOnline && !wasOffline) return null;

  return createPortal(
    <div
      className={cn(styles.indicator, !isOnline ? styles.offline : styles.reconnecting, className)}
      role="status"
      aria-live="polite"
    >
      <Icon name={isOnline ? 'Wifi' : 'WifiOff'} size="sm" className={styles.icon} />
      <span className={styles.message}>
        {!isOnline ? 'You are offline. Some features may be unavailable.' : 'Reconnecting...'}
      </span>
    </div>,
    document.body,
  );
}
