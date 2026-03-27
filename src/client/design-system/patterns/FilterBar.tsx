import * as React from 'react';
import { cn } from '../lib';
import { Surface } from '../components/Surface';

export type FilterBarProps = React.HTMLAttributes<HTMLDivElement>;

export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ className, ...props }, ref) => (
    <Surface
      ref={ref}
      variant="default"
      data-slot="filter-bar"
      className={cn(
        'flex flex-col gap-[var(--space-4)] rounded-[var(--radius-xl)] p-[var(--space-4)] md:p-[var(--space-6)]',
        className,
      )}
      {...props}
    />
  ),
);

FilterBar.displayName = 'FilterBar';
