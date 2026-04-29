import React from 'react';
import Icon from '@client/components/common/Icon';
import styles from './HighlightNavigationControls.module.css';

import { Button } from '@client/design-system/lib';

interface HighlightNavigationControlsProps {
  currentHighlightIndex: number;
  totalHighlights: number;
  onNext: () => void;
  onPrev: () => void;
  className?: string;
}

/**
 * Navigation controls for jumping between search highlights
 * CTO Priority: HIGH #5
 */
export const HighlightNavigationControls: React.FC<HighlightNavigationControlsProps> = ({
  currentHighlightIndex,
  totalHighlights,
  onNext,
  onPrev,
  className = '',
}) => {
  if (totalHighlights === 0) return null;

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <span className={styles.counter}>
        {currentHighlightIndex} / {totalHighlights}
      </span>
      <Button
        unstyled
        onClick={onPrev}
        disabled={totalHighlights === 0}
        className={styles.button}
        title="Previous highlight (Ctrl/Cmd + Shift + G)"
        aria-label="Previous highlight"
      >
        <Icon name="ChevronUp" className={styles.icon} />
      </Button>
      <Button
        unstyled
        onClick={onNext}
        disabled={totalHighlights === 0}
        className={styles.button}
        title="Next highlight (Ctrl/Cmd + G)"
        aria-label="Next highlight"
      >
        <Icon name="ChevronDown" className={styles.icon} />
      </Button>
    </div>
  );
};
