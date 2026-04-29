import React from 'react';
import Icon from '@client/components/common/Icon';
import { Button } from '@client/design-system/lib';
import { cn } from '@client/utils/cn';
import styles from './FloatingReadingControls.module.css';

interface FloatingReadingControlsProps {
  activeMode: 'pdf' | 'clean' | 'ocr';
  onChange: (mode: 'pdf' | 'clean' | 'ocr') => void;
  isVisible: boolean;
  hasText: boolean;
}

export const FloatingReadingControls: React.FC<FloatingReadingControlsProps> = ({
  activeMode,
  onChange,
  isVisible,
  hasText,
}) => {
  if (!hasText) return null;

  return (
    <div className={cn(styles.floatingContainer, isVisible && styles.visible)}>
      <div className={styles.pill}>
        <Button
          unstyled
          className={cn(styles.pillButton, activeMode === 'pdf' && styles.active)}
          onClick={() => onChange('pdf')}
        >
          <Icon name="FileText" size="sm" />
          <span>PDF</span>
        </Button>
        <div className={styles.divider} />
        <Button
          unstyled
          className={cn(styles.pillButton, activeMode === 'clean' && styles.active)}
          onClick={() => onChange('clean')}
        >
          <Icon name="Type" size="sm" />
          <span>Clean</span>
        </Button>
        <div className={styles.divider} />
        <Button
          unstyled
          className={cn(styles.pillButton, activeMode === 'ocr' && styles.active)}
          onClick={() => onChange('ocr')}
        >
          <Icon name="ScanText" size="sm" />
          <span>Raw</span>
        </Button>
      </div>
    </div>
  );
};
