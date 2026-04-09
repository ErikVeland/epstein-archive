import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib';
import './Select.css';

export interface DesignSystemSelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  message?: React.ReactNode;
  invalid?: boolean;
  options: DesignSystemSelectOption[];
  rootClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, message, invalid, options, rootClassName, id, ...props }, ref) => (
    <div className={cn('ds-selectRoot', rootClassName)}>
      {(label || hint) && (
        <div className="ds-selectLabelRow">
          {label ? (
            <label className="ds-selectLabel" htmlFor={id}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {hint ? <p className="ds-selectHint">{hint}</p> : null}
        </div>
      )}
      <div className="ds-selectControl">
        <select
          ref={ref}
          id={id}
          data-invalid={invalid || undefined}
          className={cn('ds-selectField', className)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="ds-selectIcon" size={16} />
      </div>
      {message ? (
        <p className="ds-selectMessage" data-tone={invalid ? 'critical' : 'muted'}>
          {message}
        </p>
      ) : null}
    </div>
  ),
);

Select.displayName = 'Select';
