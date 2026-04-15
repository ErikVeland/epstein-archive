import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../lib';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  /** Deprecated compatibility prop. DS button styling is always applied. */
  unstyled?: boolean;
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost'
    | 'glass'
    | 'accent-solid'
    | 'glass-highlight';
  size?: 'sm' | 'md' | 'lg';
  grow?: boolean;
  loading?: boolean;
  /** Square icon-only button — removes padding and enforces equal width/height */
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      className,
      unstyled: _unstyled = false,
      variant = 'primary',
      size = 'md',
      grow,
      iconOnly,
      style,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        data-icon-only={iconOnly || undefined}
        className={cn('ds-btn', className)}
        style={grow ? { flexGrow: 1, ...style } : style}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
