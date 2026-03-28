import React from 'react';
import s from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const trackSizeMap = {
  sm: s.trackSm,
  md: s.trackMd,
  lg: s.trackLg,
} as const;

const fillColorMap = {
  primary: s.fillPrimary,
  secondary: s.fillSecondary,
  success: s.fillSuccess,
  warning: s.fillWarning,
  danger: s.fillDanger,
} as const;

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`${s.root} ${className}`}>
      {label && (
        <div className={s.header}>
          <span className={s.label}>{label}</span>
          {showPercentage && <span className={s.percentage}>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        className={`${s.track} ${trackSizeMap[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div className={`${s.fill} ${fillColorMap[color]}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default ProgressBar;
