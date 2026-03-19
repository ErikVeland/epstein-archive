import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

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
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-[var(--text-muted)] font-mono mr-2">
        {currentHighlightIndex} / {totalHighlights}
      </span>
      <button
        onClick={onPrev}
        disabled={totalHighlights === 0}
        className="p-1.5 rounded hover:bg-[var(--glass-bg-highlight)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Previous highlight (Ctrl/Cmd + Shift + G)"
        aria-label="Previous highlight"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <button
        onClick={onNext}
        disabled={totalHighlights === 0}
        className="p-1.5 rounded hover:bg-[var(--glass-bg-highlight)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Next highlight (Ctrl/Cmd + G)"
        aria-label="Next highlight"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
};
