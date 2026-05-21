import React, { useState, useRef, useCallback } from 'react';
import Icon from '@client/components/common/Icon';
import styles from './MobileToolScreen.module.css';

import { Button } from '@client/design-system/lib';

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
  const [showHint, setShowHint] = useState<boolean>(() => localStorage.getItem(HINT_KEY) === null);

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
        <Button unstyled className={styles.backBtn} onClick={onBack} type="button">
          <Icon name="ChevronLeft" size="md" />
          Back
        </Button>
        <span className={styles.breadcrumb}>
          <span className={styles.toolName}>{toolName}</span>
        </span>
        {actionLabel && onAction && (
          <Button unstyled className={styles.actionBtn} onClick={onAction} type="button">
            {actionLabel}
          </Button>
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
