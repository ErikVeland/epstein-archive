import * as React from 'react';
import { defineVariants } from '../lib';
import './Badge.css';

const badgeVariants = defineVariants({
  base: 'badge',
  variants: {
    tone: {
      accent: 'tone-accent',
      info: 'tone-info',
      success: 'tone-success',
      warning: 'tone-warning',
      danger: 'tone-danger',
      muted: 'tone-muted',
      neutral: 'tone-neutral',
    },
    size: {
      sm: 'size-sm',
      md: 'size-md',
      lg: 'size-lg',
    },
    risk: {
      critical: 'risk-critical',
      high: 'risk-high',
      medium: 'risk-medium',
      low: 'risk-low',
      minimal: 'risk-minimal',
      unknown: 'risk-unknown',
    },
    nav: {
      docs: 'nav-docs',
      emails: 'nav-emails',
      media: 'nav-media',
      people: 'nav-people',
      investigations: 'nav-investigations',
    },
  },
  defaults: {
    size: 'md',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'muted' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  risk?: 'critical' | 'high' | 'medium' | 'low' | 'minimal' | 'unknown';
  nav?: 'docs' | 'emails' | 'media' | 'people' | 'investigations';
  count?: number;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, risk, nav, count, children, ...props }, ref) => {
    const classes = badgeVariants({ tone, size, risk, nav }, className);

    return (
      <span ref={ref} className={classes} {...props}>
        {count !== undefined ? (
          <span className="badge-content">
            {children}
            <span className="badge-count">({count})</span>
          </span>
        ) : (
          children
        )}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
