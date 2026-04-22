import * as React from 'react';
import { cn } from '../../../utils/cn';
import './Range.css';

export type RangeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Range = React.forwardRef<HTMLInputElement, RangeProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} type="range" className={cn('ds-range', className)} {...props} />
  ),
);

Range.displayName = 'Range';
