import React from 'react';
import { Flex } from '../layout/Flex';
import Icon from '@client/components/common/Icon';
import styles from './AppleHIGComponents.module.css';

interface HIGSettingsGroupProps {
  children: React.ReactNode;
}

export const HIGSettingsGroup: React.FC<HIGSettingsGroupProps> = ({ children }) => {
  return <div className={styles.appleSettingsGroup}>{children}</div>;
};

interface HIGSettingsRowProps {
  label: string;
  value: React.ReactNode;
  isMono?: boolean;
}

export const HIGSettingsRow: React.FC<HIGSettingsRowProps> = ({ label, value, isMono = false }) => {
  return (
    <div className={styles.appleRow}>
      <span className={styles.appleLabel}>{label}</span>
      <span className={isMono ? styles.appleValueMono : styles.appleValue}>{value}</span>
    </div>
  );
};

interface HIGStackRowProps {
  icon: string;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

export const HIGStackRow: React.FC<HIGStackRowProps> = ({
  icon,
  title = '',
  subtitle = '',
  onClick,
  isActive = false,
  className = '',
}) => {
  const content = (
    <Flex align="center" gap="sm">
      <div className={styles.iconBadge}>
        <Icon name={icon as Parameters<typeof Icon>[0]['name']} size="xs" />
      </div>
      <Flex direction="column" align="start" className={styles.textContainer}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowSubtitle}>{subtitle}</span>
      </Flex>
    </Flex>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${styles.rowButton} ${isActive ? styles.rowButtonActive : styles.rowButtonDefault} ${className}`}
      >
        {content}
      </button>
    );
  }

  return <div className={`${styles.rowStatic} ${className}`}>{content}</div>;
};
