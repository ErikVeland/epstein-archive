import * as React from 'react';
import { cn } from '../../../utils/cn';
import './FileInput.css';

type Density = 'compact' | 'default' | 'comfortable';

interface BaseFieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  message?: React.ReactNode;
  invalid?: boolean;
  density?: Density;
  rootClassName?: string;
  labelClassName?: string;
}

export interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>, BaseFieldProps {}

export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      className,
      label,
      hint,
      message,
      invalid,
      density = 'default',
      rootClassName,
      labelClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const messageTone = invalid ? 'critical' : 'muted';

    return (
      <div className={cn('ds-inputRoot', rootClassName)}>
        {(label || hint) && (
          <div className="ds-inputLabelRow">
            {label ? (
              <label className={cn('ds-inputLabel', labelClassName)} htmlFor={id}>
                {label}
              </label>
            ) : (
              <span />
            )}
            {hint ? <p className="ds-inputHint">{hint}</p> : null}
          </div>
        )}
        <input
          ref={ref}
          type="file"
          id={id}
          data-invalid={invalid || undefined}
          data-density={density}
          className={cn('ds-fileInput', className)}
          {...props}
        />
        {message ? (
          <p className="ds-inputMessage" data-tone={messageTone}>
            {message}
          </p>
        ) : null}
      </div>
    );
  },
);

FileInput.displayName = 'FileInput';
