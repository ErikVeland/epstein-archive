import React from 'react';
import Icon from '@client/components/common/Icon';
import { Flex, Button, LqText, Surface } from '@client/design-system/lib';
import styles from './MobileStackHeader.module.css';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface MobileStackHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onClose?: () => void;
  actions?: React.ReactNode;
  /** Optional breadcrumb trail shown above the title, replacing the "Forensic Intelligence" eyebrow */
  breadcrumbItems?: BreadcrumbItem[];
}

/**
 * MobileStackHeader
 *
 * Standardized header for mobile-first full-screen views.
 * Replaces floating modal headers with a persistent, non-transparent
 * navigation anchor.
 */
export const MobileStackHeader: React.FC<MobileStackHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onClose,
  actions,
  breadcrumbItems,
}) => {
  return (
    <Surface variant="glass-strong" className={styles.root}>
      <Flex align="center" justify="between" className={styles.content}>
        <Flex align="center" gap="sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className={styles.backButton}
            aria-label="Go back"
          >
            <Icon name="ChevronLeft" size="md" />
          </Button>
          <div className={styles.titleStack}>
            {breadcrumbItems && breadcrumbItems.length > 0 ? (
              <nav aria-label="Breadcrumb" className={styles.breadcrumbTrail}>
                {breadcrumbItems.map((item, i) => (
                  <span key={i} className={styles.breadcrumbItem}>
                    {i > 0 && (
                      <span className={styles.breadcrumbSep} aria-hidden>
                        ›
                      </span>
                    )}
                    {item.onClick ? (
                      <button
                        type="button"
                        onClick={item.onClick}
                        className={styles.breadcrumbLink}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span className={styles.breadcrumbCurrent}>{item.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            ) : (
              <LqText variant="xs" weight="bold" color="accent" className={styles.eyebrow}>
                Forensic Intelligence
              </LqText>
            )}
            <LqText variant="small" weight="bold" className={styles.title}>
              {title}
            </LqText>
            {subtitle && (
              <LqText variant="xs" color="muted" className={styles.subtitle}>
                {subtitle}
              </LqText>
            )}
          </div>
        </Flex>

        <Flex align="center" gap="xs">
          {actions}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close"
            >
              <Icon name="X" size="md" />
            </Button>
          )}
        </Flex>
      </Flex>
    </Surface>
  );
};
