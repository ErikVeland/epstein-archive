import React from 'react';
import { Tabs, TabItem } from '../common/Tabs';
import styles from './ViewerShell.module.css';

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
  bodyRef?: React.RefObject<HTMLDivElement | null>;
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
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <header className={[styles.header, headerClassName].filter(Boolean).join(' ')}>
        <div className={styles.headerContent}>{header}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>

      {tabs && activeTab && onTabChange ? (
        <div className={[styles.tabs, tabsClassName].filter(Boolean).join(' ')}>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} variant="viewer" />
        </div>
      ) : null}

      <div
        ref={bodyRef}
        className={[
          styles.body,
          bodyScrollable ? `${styles.bodyScrollable} custom-scrollbar` : styles.bodyStatic,
          bodyClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid={bodyTestId}
      >
        {children}
      </div>
    </div>
  );
};

export default ViewerShell;
