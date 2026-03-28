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
    <div className={s.root}>
      <div className={s.spinner} />
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
};

export default LoadingIndicator;
