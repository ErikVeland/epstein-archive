import React from 'react';
import styles from './SignificanceBadge.module.css';

interface SignificanceBadgeProps {
  score: number; // raw score (0–100+ range)
  maxScore?: number; // normalise against this; defaults to 100
  className?: string;
  showLabel?: boolean;
}

const tier = (normalised: number): 'critical' | 'high' | 'medium' | 'low' => {
  if (normalised >= 0.8) return 'critical';
  if (normalised >= 0.5) return 'high';
  if (normalised >= 0.2) return 'medium';
  return 'low';
};

export const SignificanceBadge: React.FC<SignificanceBadgeProps> = ({
  score,
  maxScore = 100,
  className,
  showLabel = false,
}) => {
  const normalised = Math.min(score / Math.max(maxScore, 1), 1);
  const t = tier(normalised);
  const display = Math.round(normalised * 100);

  return (
    <span
      className={`${styles.badge} ${styles[t]} ${className ?? ''}`}
      title={`Significance: ${display}/100`}
    >
      {showLabel && <span className={styles.label}>sig </span>}
      {display}
    </span>
  );
};
