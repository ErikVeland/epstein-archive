import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: number | string;
  height?: number | string;
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({
  className,
  width,
  height,
  variant = 'rect',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded',
        variant === 'circle' ? 'rounded-full' : 'rounded-md',
        className,
      )}
      style={{
        backgroundColor: 'var(--lq-surface-3)',
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100%'),
        ...style,
      }}
      {...props}
    />
  );
}
