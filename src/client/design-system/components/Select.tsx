import * as React from 'react';
import { cn, Select as RadixSelect, defineVariants } from '../lib';
import { Icon } from './Icon';
import './Select.css';

const selectTriggerVariants = defineVariants({
  base: 'select-trigger',
  variants: {
    variant: {
      default: '',
      error: 'error',
    },
  },
  defaults: {
    variant: 'default',
  },
});

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends
    Omit<
      React.ComponentPropsWithoutRef<typeof RadixSelect.Root>,
      'dir' | 'value' | 'defaultValue' | 'onValueChange'
    >,
    Omit<
      React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>,
      'dir' | 'form' | 'defaultValue' | 'value' | 'onChange'
    > {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  containerClassName?: string;
  variant?: 'default' | 'error';
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: { target: { value: string }; currentTarget: { value: string } }) => void;
  onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<React.ElementRef<typeof RadixSelect.Trigger>, SelectProps>(
  (
    {
      label,
      options,
      placeholder = 'Select an option...',
      error,
      className,
      containerClassName,
      variant,
      value,
      defaultValue,
      onChange,
      onValueChange,
      ...props
    },
    ref,
  ) => {
    const normalizedValue = value === undefined || value === null ? undefined : String(value);
    const normalizedDefaultValue =
      defaultValue === undefined || defaultValue === null ? undefined : String(defaultValue);

    const handleValueChange = React.useCallback(
      (nextValue: string) => {
        onValueChange?.(nextValue);
        onChange?.({
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        });
      },
      [onChange, onValueChange],
    );

    return (
      <div className={cn('select-container', containerClassName)}>
        {label && <label className="select-label">{label}</label>}
        <RadixSelect.Root
          {...props}
          value={normalizedValue}
          defaultValue={normalizedDefaultValue}
          onValueChange={handleValueChange}
        >
          <RadixSelect.Trigger
            ref={ref}
            className={cn(selectTriggerVariants({ variant: error ? 'error' : variant }), className)}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon className="select-icon">
              <Icon name="ChevronDown" size="sm" ariaHidden={true} />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content className="select-content">
              <RadixSelect.ScrollUpButton className="select-scroll-button">
                <Icon name="ChevronUp" size="sm" />
              </RadixSelect.ScrollUpButton>
              <RadixSelect.Viewport className="select-viewport">
                {options.map((option) => (
                  <RadixSelect.Item
                    key={String(option.value)}
                    value={String(option.value)}
                    disabled={option.disabled}
                    className="select-item"
                  >
                    <span className="select-item-indicator">
                      <RadixSelect.ItemIndicator>
                        <Icon name="Check" size="sm" />
                      </RadixSelect.ItemIndicator>
                    </span>
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
              <RadixSelect.ScrollDownButton className="select-scroll-button">
                <Icon name="ChevronDown" size="sm" />
              </RadixSelect.ScrollDownButton>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
        {error && <span className="select-error-message">{error}</span>}
      </div>
    );
  },
);

Select.displayName = 'Select';
