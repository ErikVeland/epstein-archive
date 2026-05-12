import type { MouseEventHandler, ReactNode } from 'react';
import { Button } from '@client/design-system/lib';
import { cn } from '@client/utils/cn';
import Icon, { type IconName } from './Icon';
import styles from './InteractiveBadge.module.css';

interface InteractiveBadgeProps {
  children: ReactNode;
  icon?: IconName;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ariaExpanded?: boolean;
}

export function InteractiveBadge({
  children,
  icon,
  className,
  onClick,
  ariaExpanded,
}: InteractiveBadgeProps) {
  return (
    <Button
      unstyled
      type="button"
      className={cn(styles.badge, className)}
      onClick={onClick}
      aria-expanded={ariaExpanded}
    >
      {icon && <Icon name={icon} size="xs" className={styles.icon} />}
      {children}
    </Button>
  );
}
