import * as React from 'react';
import { cn } from '../lib';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { Surface } from '../components/Surface';
import './MediaBrowserShell.css';

export type MediaBrowserShellProps = React.HTMLAttributes<HTMLDivElement>;

export const MediaBrowserShell = React.forwardRef<HTMLDivElement, MediaBrowserShellProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="media-browser-shell"
      className={cn('media-browser-shell', className)}
      {...props}
    />
  ),
);

MediaBrowserShell.displayName = 'MediaBrowserShell';

export const MediaBrowserHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="media-browser-header"
    className={cn('media-browser-header', className)}
    {...props}
  />
));

MediaBrowserHeader.displayName = 'MediaBrowserHeader';

export const MediaBrowserToolbar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="media-browser-toolbar"
    className={cn('media-browser-toolbar', className)}
    {...props}
  />
));

MediaBrowserToolbar.displayName = 'MediaBrowserToolbar';

export const MediaBrowserMobileTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    data-slot="media-browser-mobile-trigger"
    className={cn('control media-browser-trigger', className)}
    {...props}
  />
));

MediaBrowserMobileTrigger.displayName = 'MediaBrowserMobileTrigger';

export const MediaBrowserTriggerLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="media-browser-trigger-label"
    className={cn('media-browser-trigger-label', className)}
    {...props}
  />
));

MediaBrowserTriggerLabel.displayName = 'MediaBrowserTriggerLabel';

export const MediaBrowserDropdown = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="media-browser-dropdown"
    className={cn('media-browser-dropdown dropdown-surface', className)}
    {...props}
  />
));

MediaBrowserDropdown.displayName = 'MediaBrowserDropdown';

export const MediaBrowserDropdownItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ className, active = false, ...props }, ref) => (
  <button
    ref={ref}
    data-slot="media-browser-dropdown-item"
    data-active={active ? 'true' : 'false'}
    className={cn('media-browser-dropdown-item', active && 'is-active', className)}
    {...props}
  />
));

MediaBrowserDropdownItem.displayName = 'MediaBrowserDropdownItem';

export const MediaBrowserSidebar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <aside
      ref={ref}
      data-slot="media-browser-sidebar"
      className={cn('media-browser-sidebar', className)}
      {...props}
    />
  ),
);

MediaBrowserSidebar.displayName = 'MediaBrowserSidebar';

export const MediaBrowserSidebarTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="media-browser-sidebar-title"
    className={cn('media-browser-sidebar-title', className)}
    {...props}
  />
));

MediaBrowserSidebarTitle.displayName = 'MediaBrowserSidebarTitle';

export const MediaBrowserSidebarItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ className, active = false, ...props }, ref) => (
  <button
    ref={ref}
    data-slot="media-browser-sidebar-item"
    data-active={active ? 'true' : 'false'}
    className={cn('media-browser-sidebar-item', active && 'is-active', className)}
    {...props}
  />
));

MediaBrowserSidebarItem.displayName = 'MediaBrowserSidebarItem';

export const MediaBrowserCount = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="media-browser-count"
    className={cn('media-browser-count', className)}
    {...props}
  />
));

MediaBrowserCount.displayName = 'MediaBrowserCount';

export const MediaBrowserSearch = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="media-browser-search"
    className={cn('media-browser-search', className)}
    {...props}
  />
));

MediaBrowserSearch.displayName = 'MediaBrowserSearch';

export const MediaBrowserSearchInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    data-slot="media-browser-search-input"
    className={cn('control media-browser-search-input', className)}
    {...props}
  />
));

MediaBrowserSearchInput.displayName = 'MediaBrowserSearchInput';

export const MediaBrowserStatus = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="media-browser-status"
    className={cn('media-browser-status', className)}
    {...props}
  />
));

MediaBrowserStatus.displayName = 'MediaBrowserStatus';

export const MediaBrowserPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Surface
    ref={ref}
    variant="elevated"
    data-slot="media-browser-panel"
    className={cn('media-browser-panel', className)}
    {...props}
  />
));

MediaBrowserPanel.displayName = 'MediaBrowserPanel';

export function MediaBrowserEmptyState({
  title,
  description,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentProps<typeof Icon>['name'];
}) {
  return <EmptyState title={title} description={description} icon={icon ?? 'Inbox'} />;
}
