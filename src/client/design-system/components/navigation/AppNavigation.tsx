import * as React from 'react';
import { NavLink } from 'react-router-dom';
import Icon, { type IconName } from '@client/components/common/Icon';
import { cn } from '@client/utils/cn';
import './AppNavigation.css';

export type AppNavTone =
  | 'people'
  | 'investigations'
  | 'documents'
  | 'media'
  | 'emails'
  | 'flights'
  | 'properties'
  | 'blackbook'
  | 'timeline'
  | 'financial'
  | 'analytics'
  | 'about';

export type AppNavDensity = 'normal' | 'compact' | 'icons';

type NativeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className'
>;

export interface ShellActionButtonProps extends NativeButtonProps {
  icon: IconName;
  label: string;
  iconColor?: React.ComponentProps<typeof Icon>['color'];
  iconClassName?: string;
  className?: string;
  labelClassName?: string;
}

export function ShellActionButton({
  icon,
  label,
  iconColor,
  iconClassName,
  className,
  labelClassName,
  type = 'button',
  ...props
}: ShellActionButtonProps) {
  return (
    <button type={type} className={cn('ds-shellActionButton', className)} {...props}>
      <Icon name={icon} size="sm" color={iconColor} className={iconClassName} />
      <span className={cn('ds-shellActionButton__label', labelClassName)}>{label}</span>
    </button>
  );
}

export interface AppSegmentedNavProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: AppNavDensity;
}

export function AppSegmentedNav({
  density = 'normal',
  className,
  children,
  ...props
}: AppSegmentedNavProps) {
  return (
    <div
      className={cn('ds-appSegmentedNav', `ds-appSegmentedNav--${density}`, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AppSegmentedNavItemProps extends NativeButtonProps {
  active?: boolean;
  density?: AppNavDensity;
  icon: IconName;
  label: string;
  tone: AppNavTone;
  className?: string;
  wrapperClassName?: string;
}

export const AppSegmentedNavItem = React.forwardRef<HTMLButtonElement, AppSegmentedNavItemProps>(
  function AppSegmentedNavItem(
    {
      active = false,
      density = 'normal',
      icon,
      label,
      tone,
      className,
      wrapperClassName,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <div className={cn('ds-appSegmentedNav__item', wrapperClassName)}>
        <button
          ref={ref}
          type={type}
          className={cn(
            'ds-appSegmentedNav__control',
            `ds-appSegmentedNav__control--${density}`,
            `ds-appSegmentedNav__control--${tone}`,
            active && 'is-active',
            className,
          )}
          {...props}
        >
          <Icon name={icon} size="sm" />
          <span
            className={cn(
              density === 'icons'
                ? 'ds-appSegmentedNav__label--hidden'
                : 'ds-appSegmentedNav__label',
            )}
          >
            {label}
          </span>
        </button>
      </div>
    );
  },
);

export type BottomNavItem = {
  id: string;
  label: string;
  icon: IconName;
  path?: string;
};

export interface BottomNavProps {
  items: BottomNavItem[];
  activeId?: string;
  ariaLabel?: string;
  className?: string;
  onAction?: (item: BottomNavItem) => void;
}

export function BottomNav({
  items,
  activeId,
  ariaLabel = 'Main navigation',
  className,
  onAction,
}: BottomNavProps) {
  return (
    <nav className={cn('ds-bottomNav', className)} role="navigation" aria-label={ariaLabel}>
      {items.map((item) =>
        item.path ? (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              cn('ds-bottomNav__item', (isActive || activeId === item.id) && 'is-active')
            }
          >
            <Icon name={item.icon} size="sm" className="ds-bottomNav__icon" />
            <span className="ds-bottomNav__label">{item.label}</span>
          </NavLink>
        ) : (
          <button
            key={item.id}
            type="button"
            className={cn('ds-bottomNav__item', activeId === item.id && 'is-active')}
            onClick={() => onAction?.(item)}
          >
            <Icon name={item.icon} size="sm" className="ds-bottomNav__icon" />
            <span className="ds-bottomNav__label">{item.label}</span>
          </button>
        ),
      )}
    </nav>
  );
}
