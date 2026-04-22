import * as React from 'react';
import { cn } from '../../../utils/cn';
import { Surface } from '../surfaces/Surface';
import './EmptyState.css';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  padded?: boolean;
}

export function EmptyState({
  className,
  title,
  description,
  icon,
  actions,
  padded = true,
  ...props
}: EmptyStateProps) {
  return (
    <Surface
      variant="glass"
      p={padded ? 8 : undefined}
      className={cn('ds-emptyState', className)}
      {...props}
    >
      {icon ? <div className="ds-emptyStateIcon">{icon}</div> : null}
      <h3 className="ds-emptyStateTitle">{title}</h3>
      {description ? <p className="ds-emptyStateBody">{description}</p> : null}
      {actions}
    </Surface>
  );
}
