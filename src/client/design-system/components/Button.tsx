import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../lib';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  primary:
    'bg-[var(--accent)] text-[var(--text-primary)] enabled:hover:brightness-110 shadow-[var(--glass-shadow)]',
  secondary:
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--glass-bg)]/70 hover:bg-[var(--glass-bg-strong)]',
  danger: 'tone-danger text-[var(--text-primary)] hover:text-[var(--text-primary)]',
  ghost:
    'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)] shadow-none',
} as const;

const sizeClasses = {
  sm: 'h-9 min-h-9 text-sm',
  md: 'min-h-[var(--control-height)] text-sm',
  lg: 'min-h-[calc(var(--control-height)+4px)] text-base',
} as const;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, variant = 'primary', size = 'md', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(
          'control relative inline-flex select-none items-center justify-center font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
