import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@client/utils/cn';
import { useResponsive } from '@client/hooks/useResponsive';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { useSwipeGesture } from '@client/hooks/useSwipeGesture';
import styles from './BottomSheet.module.css';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints: _snapPoints = [0.25, 0.5, 0.9],
  className,
}: BottomSheetProps) {
  const { mobile: isMobile } = useResponsive();
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleSwipeDown = useCallback(() => {
    onClose();
  }, [onClose]);

  useSwipeGesture(sheetRef, {
    onSwipeDown: handleSwipeDown,
    threshold: 100,
    preventDefault: false,
  });

  useScrollLock(isOpen);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isMobile) return <>{children}</>;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={onClose}>
          <motion.div
            ref={sheetRef}
            className={cn(styles.sheet, className)}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.handle}>
              <div className={styles.handleBar} />
            </div>
            {title && <h3 className={styles.title}>{title}</h3>}
            <div className={styles.content}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
