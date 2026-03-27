import * as React from 'react';
import { cn, Tabs as RadixTabs, defineVariants } from '../lib';
import './Tabs.css';

const tabsVariants = defineVariants({
  base: 'tabs-container',
  variants: {
    variant: {
      default: '',
      compact: 'compact',
      viewer: 'viewer',
    },
  },
  defaults: {
    variant: 'default',
  },
});

const tabTriggerVariants = defineVariants({
  base: 'tab-item',
  variants: {
    variant: {
      default: '',
      compact: '', // Handled by parent .compact class in CSS
      viewer: '', // Handled by parent .viewer class in CSS
    },
  },
  defaults: {
    variant: 'default',
  },
});

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps extends Omit<
  React.ComponentPropsWithoutRef<typeof RadixTabs.Root>,
  'value' | 'onValueChange' | 'onChange'
> {
  tabs: TabItem[];
  activeTab?: string;
  onChange?: (key: string) => void;
  variant?: 'default' | 'compact' | 'viewer';
}

export const Tabs = React.forwardRef<React.ElementRef<typeof RadixTabs.Root>, TabsProps>(
  ({ tabs, activeTab, onChange, variant = 'default', className, ...props }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({});
    const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

    React.useEffect(() => {
      if (variant === 'compact' || variant === 'viewer' || !activeTab) {
        setIndicatorStyle({ opacity: 0 });
        return;
      }

      const activeTabElement = tabRefs.current[activeTab];
      if (activeTabElement && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const tabRect = activeTabElement.getBoundingClientRect();

        setIndicatorStyle({
          width: `${tabRect.width}px`,
          transform: `translateX(${tabRect.left - containerRect.left}px)`,
          opacity: 1,
        });

        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }, [activeTab, tabs, variant]);

    return (
      <RadixTabs.Root
        ref={ref}
        value={activeTab}
        onValueChange={onChange}
        className={cn(tabsVariants({ variant }), className)}
        {...props}
      >
        <RadixTabs.List ref={containerRef} className="tabs-list">
          {tabs.map((tab) => (
            <RadixTabs.Trigger
              key={tab.key}
              value={tab.key}
              ref={(el) => (tabRefs.current[tab.key] = el)}
              className={cn(tabTriggerVariants({ variant }), activeTab === tab.key && 'active')}
              data-testid={`tab-${tab.key}`}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && <span className="tab-badge">{tab.count}</span>}
            </RadixTabs.Trigger>
          ))}
          {variant === 'default' && (
            <div className="tab-indicator" style={indicatorStyle} aria-hidden="true" />
          )}
        </RadixTabs.List>
      </RadixTabs.Root>
    );
  },
);

Tabs.displayName = 'Tabs';
