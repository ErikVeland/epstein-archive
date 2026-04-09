import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import styles from './HighlightNavigationControls.module.css';

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
      <button
        onClick={onPrev}
        disabled={totalHighlights === 0}
        className={styles.button}
        title="Previous highlight (Ctrl/Cmd + Shift + G)"
        aria-label="Previous highlight"
      >
        <ChevronUp className={styles.icon} />
      </button>
      <button
        onClick={onNext}
        disabled={totalHighlights === 0}
        className={styles.button}
        title="Next highlight (Ctrl/Cmd + G)"
        aria-label="Next highlight"
      >
        <ChevronDown className={styles.icon} />
      </button>
    </div>
  );
};
