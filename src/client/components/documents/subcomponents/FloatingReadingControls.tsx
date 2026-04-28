import React from 'react';
import { FileText, Type, ScanText } from 'lucide-react';
import { Button } from '../../../design-system/lib';
import { cn } from '../../../utils/cn';
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
          <FileText size={16} />
          <span>PDF</span>
        </Button>
        <div className={styles.divider} />
        <Button
          unstyled
          className={cn(styles.pillButton, activeMode === 'clean' && styles.active)}
          onClick={() => onChange('clean')}
        >
          <Type size={16} />
          <span>Clean</span>
        </Button>
        <div className={styles.divider} />
        <Button
          unstyled
          className={cn(styles.pillButton, activeMode === 'ocr' && styles.active)}
          onClick={() => onChange('ocr')}
        >
          <ScanText size={16} />
          <span>Raw</span>
        </Button>
      </div>
    </div>
  );
};
