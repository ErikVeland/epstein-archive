import * as React from 'react';
import { cn } from '../lib';
import { Icon } from './Icon';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeMap = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
} as const;

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', label = 'Loading', ...props }, ref) => (
    <div
      ref={ref}
      data-slot="spinner"
      className={cn(
        'inline-flex items-center gap-[var(--space-2)] text-[var(--text-muted)]',
        className,
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      <Icon name="Loader2" size={sizeMap[size]} className="animate-spin" ariaHidden={true} />
      <span className="text-sm">{label}</span>
    </div>
  ),
);

Spinner.displayName = 'Spinner';
