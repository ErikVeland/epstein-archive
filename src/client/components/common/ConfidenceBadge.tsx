import React from 'react';
import s from './ConfidenceBadge.module.css';

export interface ConfidenceBadgeProps {
  confidence: number; // 0-1
  showPercentage?: boolean;
  showIcon?: boolean;
  className?: string;
}

const getVariant = (confidence: number): string => {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  if (confidence >= 0.4) return 'low';
  return 'very-low';
};

const variantLabels: Record<string, { label: string; icon: string }> = {
  high: { label: 'High confidence', icon: '✓' },
  medium: { label: 'Medium confidence', icon: '—' },
  low: { label: 'Low confidence', icon: '⚠' },
  'very-low': { label: 'Very low confidence', icon: '✗' },
};

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  showPercentage = true,
  showIcon = true,
  className = '',
}) => {
  const variant = getVariant(confidence);
  const config = variantLabels[variant];
  const percentage = Math.round(confidence * 100);

  return (
    <span
      className={`${s.root} ${s[variant]} ${className}`}
      title={`Extraction confidence: ${percentage}%`}
      role="status"
      aria-label={`${config.label}, ${percentage}%`}
    >
      {showIcon && <span className={s.icon}>{config.icon}</span>}
      {showPercentage && <span className={s.percentage}>{percentage}%</span>}
    </span>
  );
};
