import React from 'react';
import s from './CircularProgress.module.css';

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

const sizeContainerClass: Record<string, string> = {
  sm: s.sizeSm,
  md: s.sizeMd,
  lg: s.sizeLg,
  xl: s.sizeXl,
};

const sizeTextClass: Record<string, string> = {
  sm: s.textSm,
  md: s.textMd,
  lg: s.textLg,
  xl: s.textXl,
};

const colorClass: Record<string, string> = {
  primary: s.colorPrimary,
  secondary: s.colorSecondary,
  success: s.colorSuccess,
  warning: s.colorWarning,
  danger: s.colorDanger,
};

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showPercentage = false,
  label,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const strokeDashoffset = 100 - percentage;

  return (
    <div className={`${s.root} ${className}`}>
      <div className={`${s.svgWrap} ${sizeContainerClass[size]}`}>
        <svg className={s.svg} viewBox="0 0 100 100">
          {/* Background circle */}
          <circle className={s.track} cx="50" cy="50" r="45" fill="none" strokeWidth="8" />
          {/* Progress circle */}
          <circle
            className={colorClass[color]}
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeDasharray="100"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
          />
        </svg>
        {showPercentage && (
          <div className={`${s.percentageOverlay} ${sizeTextClass[size]}`}>
            {Math.round(percentage)}%
          </div>
        )}
      </div>
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
};

export default CircularProgress;
