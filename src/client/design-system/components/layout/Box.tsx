import React, { forwardRef } from 'react';
import { cn } from '../../lib';
import './Box.css';

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  as?: React.ElementType;
}

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({ children, className, as: Component = 'div', ...props }, ref) => {
    return (
      <Component ref={ref} className={cn('lq-box', className)} {...props}>
        {children}
      </Component>
    );
  },
);

Box.displayName = 'Box';
