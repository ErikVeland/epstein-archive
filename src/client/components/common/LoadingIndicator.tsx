import React from 'react';
import s from './LoadingIndicator.module.css';

interface LoadingIndicatorProps {
  isLoading: boolean;
  label?: string;
}

/**
 * A single subtle loading indicator that shows in the top-right corner.
 * Only renders when isLoading is true.
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ isLoading, label }) => {
  if (!isLoading) return null;

  return (
    <div className={s.root} role="status" aria-label={label ?? 'Loading'}>
      <div className={s.spinner} aria-hidden="true" />
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
};

export default LoadingIndicator;
