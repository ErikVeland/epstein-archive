import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    const baseStyles =
      'relative inline-flex items-center justify-center font-sans font-medium transition-all duration-300 ease-[var(--easing-liquid)] rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-surface overflow-hidden select-none disabled:opacity-50 disabled:pointer-events-none';

    const glassBase =
      'before:absolute before:inset-0 before:z-0 before:rounded-md before:pointer-events-none before:bg-[var(--glass-shine)] before:border before:border-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300';

    const variants = {
      primary:
        'bg-accent-primary/90 hover:bg-accent-primary text-text-primary shadow-md shadow-accent-primary/20 backdrop-blur-md',
      secondary:
        'bg-bg-elevated/80 hover:bg-bg-elevated border border-border-subtle text-text-secondary hover:text-text-primary backdrop-blur-md',
      danger:
        'bg-accent-danger/90 hover:bg-accent-danger text-text-primary shadow-md shadow-accent-danger/20 backdrop-blur-md',
      ghost:
        'bg-transparent hover:bg-bg-elevated/50 text-text-secondary hover:text-text-primary border border-transparent',
    };

    const sizes = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-base px-5 py-2',
      lg: 'text-lg px-6 py-3',
    };

    return (
      <Comp
        ref={ref}
        className={`${baseStyles} ${glassBase} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {props.children}
        </span>
      </Comp>
    );
  },
);
GlassButton.displayName = 'GlassButton';
