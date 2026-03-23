import React from 'react';
import { Tabs, TabItem } from '../common/Tabs';

interface ViewerShellProps {
  header: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  tabsClassName?: string;
  bodyClassName?: string;
  bodyRef?: React.RefObject<HTMLDivElement>;
  bodyTestId?: string;
  bodyScrollable?: boolean;
}

export const ViewerShell: React.FC<ViewerShellProps> = ({
  header,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
  className = '',
  headerClassName = '',
  tabsClassName = '',
  bodyClassName = '',
  bodyRef,
  bodyTestId,
  bodyScrollable = true,
}) => {
  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      <header
        className={`shrink-0 flex items-center justify-between gap-[var(--space-6)] border-b border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)] bg-[var(--glass-bg-strong)]/20 ${headerClassName}`}
      >
        <div className="min-w-0 flex-1">{header}</div>
        {actions ? (
          <div className="shrink-0 flex items-center gap-[var(--space-3)] pr-[var(--space-4)] md:pr-[var(--space-8)]">
            {actions}
          </div>
        ) : null}
      </header>

      {tabs && activeTab && onTabChange ? (
        <div
          className={`shrink-0 border-b border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)] bg-[var(--glass-bg-strong)]/10 ${tabsClassName}`}
        >
          <Tabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} variant="viewer" />
        </div>
      ) : null}

      <div
        ref={bodyRef}
        className={`flex-1 min-h-0 overflow-x-hidden ${bodyScrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'} ${bodyClassName}`}
        data-testid={bodyTestId}
      >
        {children}
      </div>
    </div>
  );
};

export default ViewerShell;
