import React from 'react';
import { cn } from '../../lib';
import './Surface.css';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'glass-strong' | 'glass-highlight' | 'solid' | 'panel';
  accent?: 'amber' | 'cyan' | 'purple' | 'rose' | 'emerald';
  children?: React.ReactNode;
  as?: React.ElementType;
}

export const Surface: React.FC<SurfaceProps> = ({
  variant = 'glass',
  accent,
  children,
  className,
  as: Component = 'div',
  ...props
}) => {
  return (
    <Component
      className={cn(
        'lq-surface',
        `lq-surface--${variant}`,
        accent && `lq-surface--accent-${accent}`,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};
