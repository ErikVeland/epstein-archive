import * as React from 'react';
import { cn } from '../../lib';
import './Badge.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary';
  variant?: string;
  label?: string | number;
  size?: string;
  icon?: React.ComponentType<any>;
  cursor?: string;
}

export function Badge({ className, tone = 'neutral', label, size, ...props }: BadgeProps) {
  return (
    <span className={cn('ds-badge', className)} data-tone={tone} data-size={size} {...props}>
      {label || props.children}
    </span>
  );
}
