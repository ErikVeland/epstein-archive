import React from 'react';
import Icon, { type IconName } from './Icon';
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

const variantLabels: Record<string, { label: string; icon: IconName }> = {
  high: { label: 'High confidence', icon: 'Check' },
  medium: { label: 'Medium confidence', icon: 'Circle' },
  low: { label: 'Low confidence', icon: 'AlertTriangle' },
  'very-low': { label: 'Very low confidence', icon: 'AlertCircle' },
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
      {showIcon && <Icon name={config.icon} className={s.icon} />}
      {showPercentage && <span className={s.percentage}>{percentage}%</span>}
    </span>
  );
};
