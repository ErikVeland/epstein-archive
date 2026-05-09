import React from 'react';
import { Button } from '@client/design-system/lib';
import { cn } from '@client/utils/cn';
import Icon, { type IconName } from './Icon';
import styles from './AnimatedSegmentedControl.module.css';

export interface AnimatedSegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface AnimatedSegmentedControlProps<T extends string> {
  options: AnimatedSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
  minItemWidth?: string;
  fullWidth?: boolean;
  compact?: boolean;
}

export function AnimatedSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  itemClassName,
  minItemWidth = '3.25rem',
  fullWidth = false,
  compact = false,
}: AnimatedSegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      className={cn(
        styles.root,
        fullWidth && styles.fullWidth,
        compact && styles.compact,
        className,
      )}
      style={
        {
          '--segment-count': options.length,
          '--segment-active-index': activeIndex,
          '--segment-min-width': minItemWidth,
        } as React.CSSProperties
      }
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <span className={styles.blob} aria-hidden="true" />
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <Button
            key={option.value}
            unstyled
            type="button"
            className={cn(styles.item, isSelected && styles.itemSelected, itemClassName)}
            onClick={() => onChange(option.value)}
            role="radio"
            aria-checked={isSelected}
          >
            {option.icon && <Icon name={option.icon} size="sm" className={styles.icon} />}
            <span className={styles.label}>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
