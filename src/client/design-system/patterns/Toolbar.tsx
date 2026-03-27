import * as React from 'react';
import { cn } from '../lib';
import { Surface } from '../components/Surface';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollOnMobile?: boolean;
}

export const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, scrollOnMobile = true, ...props }, ref) => (
    <Surface
      ref={ref}
      variant="default"
      data-slot="toolbar"
      className={cn(
        scrollOnMobile
          ? 'control-scroll-row-mobile flex items-center gap-[var(--space-2)] p-[var(--space-2)] sm:flex sm:flex-wrap sm:overflow-visible'
          : 'flex flex-wrap items-center gap-[var(--space-2)] p-[var(--space-2)]',
        className,
      )}
      {...props}
    />
  ),
);

Toolbar.displayName = 'Toolbar';
