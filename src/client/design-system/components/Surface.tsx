import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../lib';
import { surfaceVariants } from '../tokens';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  variant?: keyof typeof surfaceVariants;
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ asChild = false, className, variant = 'default', ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';

    return (
      <Comp
        ref={ref}
        data-slot="surface"
        data-variant={variant}
        className={cn(surfaceVariants[variant], className)}
        {...props}
      />
    );
  },
);

Surface.displayName = 'Surface';
