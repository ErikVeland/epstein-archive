import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from './MobileToolScreen.module.css';

const SWIPE_DISMISS_THRESHOLD = 80;
const HINT_KEY = 'mobile-tool-hint-seen';

interface MobileToolScreenProps {
  toolName: string;
  onBack: () => void;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

export function MobileToolScreen({
  toolName,
  onBack,
  actionLabel,
  onAction,
  children,
}: MobileToolScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(HINT_KEY);
    if (!seen) {
      setShowHint(true);
    }
  }, []);

  const dismissHint = useCallback(() => {
    localStorage.setItem(HINT_KEY, '1');
    setShowHint(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const el = rootRef.current;
    if (!el) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      el.style.setProperty('--swipe-y', `${deltaY}px`);
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (deltaY >= SWIPE_DISMISS_THRESHOLD) {
        el.style.removeProperty('--swipe-y');
        onBack();
      } else {
        el.style.removeProperty('--swipe-y');
      }
    },
    [onBack],
  );

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">
          <ChevronLeft size={20} />
          Back
        </button>
        <span className={styles.breadcrumb}>
          <span className={styles.toolName}>{toolName}</span>
        </span>
        {actionLabel && onAction && (
          <button className={styles.actionBtn} onClick={onAction} type="button">
            {actionLabel}
          </button>
        )}
      </div>

      <div className={styles.content}>{children}</div>

      {showHint && (
        <div className={styles.hint} onClick={dismissHint}>
          Swipe down to dismiss
        </div>
      )}
    </div>
  );
}
