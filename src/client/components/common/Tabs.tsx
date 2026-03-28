import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import s from './Tabs.module.css';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'viewer';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'default',
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const variantClassName = {
    default: undefined,
    compact: s.compact,
    viewer: s.viewer,
  }[variant];

  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();

      setIndicatorStyle({
        width: `${tabRect.width}px`,
        transform: `translateX(${tabRect.left - containerRect.left}px)`,
      });

      if (variant !== 'viewer') {
        // Scroll into view only for overflow-style tabs.
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeTab, tabs, variant]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      const nextIndex = (index + 1) % tabs.length;
      onChange(tabs[nextIndex].key);
      tabRefs.current[tabs[nextIndex].key]?.focus();
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      onChange(tabs[prevIndex].key);
      tabRefs.current[tabs[prevIndex].key]?.focus();
    }
  };

  return (
    <div className={cn(s.root, variantClassName, className)} role="tablist" ref={containerRef}>
      {tabs.map((tab, index) => (
        <button
          key={tab.key}
          ref={(el) => (tabRefs.current[tab.key] = el)}
          data-testid={`tab-${tab.key}`}
          className={cn(s.tabItem, activeTab === tab.key && s.tabItemActive)}
          role="tab"
          aria-selected={activeTab === tab.key}
          aria-controls={`panel-${tab.key}`}
          id={`tab-${tab.key}`}
          onClick={() => onChange(tab.key)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          tabIndex={activeTab === tab.key ? 0 : -1}
        >
          {tab.icon && <span className={s.tabIcon}>{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.count !== undefined && <span className={s.tabBadge}>{tab.count}</span>}
        </button>
      ))}
      <div className={s.tabIndicator} style={indicatorStyle} aria-hidden="true" />
    </div>
  );
};
