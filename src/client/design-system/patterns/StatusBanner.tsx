import * as React from 'react';
import { cn, defineVariants } from '../lib';
import { Icon, type IconName } from '../components/Icon';
import { Surface } from '../components/Surface';

export interface StatusBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: 'info' | 'warning' | 'danger';
  title?: React.ReactNode;
  icon?: IconName;
}

const bannerClass = defineVariants({
  base: 'status-banner',
  variants: {
    tone: {
      info: 'status-banner-info',
      warning: 'status-banner-warning',
      danger: 'status-banner-danger',
    },
  },
  defaults: {
    tone: 'info',
  },
});

const iconByTone: Record<NonNullable<StatusBannerProps['tone']>, IconName> = {
  info: 'Info',
  warning: 'AlertTriangle',
  danger: 'AlertTriangle',
};

export const StatusBanner = React.forwardRef<HTMLDivElement, StatusBannerProps>(
  ({ className, tone = 'info', title, icon, children, ...props }, ref) => (
    <Surface
      ref={ref}
      variant="quiet"
      data-slot="status-banner"
      data-tone={tone}
      className={cn(bannerClass({ tone }), className)}
      {...props}
    >
      <Icon name={icon ?? iconByTone[tone]} size="sm" ariaHidden={true} />
      <div className="min-w-0 flex-1">
        {title ? <div className="mb-[var(--space-1)] font-semibold">{title}</div> : null}
        <div>{children}</div>
      </div>
    </Surface>
  ),
);

StatusBanner.displayName = 'StatusBanner';
