import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import styles from './GlassButton.module.css';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantClass: Record<NonNullable<GlassButtonProps['variant']>, string> = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
  danger: styles.variantDanger,
  ghost: styles.variantGhost,
};

const sizeClass: Record<NonNullable<GlassButtonProps['size']>, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={`${styles.btn} ${variantClass[variant]} ${sizeClass[size]} ${className}`}
        {...props}
      >
        <span className={styles.inner}>{props.children}</span>
      </Comp>
    );
  },
);
GlassButton.displayName = 'GlassButton';
