import * as React from 'react';
import { cn } from '../lib';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Surface } from './Surface';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: IconName;
  title: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { className, icon = 'Inbox', title, description, actionLabel, onAction, children, ...props },
    ref,
  ) => (
    <Surface
      ref={ref}
      variant="quiet"
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center gap-[var(--space-4)] rounded-[var(--radius-xl)] px-[var(--space-6)] py-[var(--space-8)] text-center',
        className,
      )}
      {...props}
    >
      <div className="soft-glass-panel rounded-full p-[var(--space-3)]">
        <Icon name={icon} size="lg" color="gray" />
      </div>
      <div className="space-y-[var(--space-2)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {description ? (
          <p className="max-w-md text-sm text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
      {actionLabel && onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Surface>
  ),
);

EmptyState.displayName = 'EmptyState';
