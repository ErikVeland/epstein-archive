import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../utils/cn';
import './TextInput.css';

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

function FieldChrome({
  id,
  label,
  hint,
  message,
  invalid,
  rootClassName,
  labelClassName,
  children,
}: BaseFieldProps & { id?: string; children: React.ReactNode }) {
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
      {children}
      {message ? (
        <p className="ds-inputMessage" data-tone={messageTone}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseFieldProps {}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
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
  ) => (
    <FieldChrome
      id={id}
      label={label}
      hint={hint}
      message={message}
      invalid={invalid}
      rootClassName={rootClassName}
      labelClassName={labelClassName}
    >
      <input
        ref={ref}
        id={id}
        data-invalid={invalid || undefined}
        data-density={density}
        className={cn('ds-inputField', className)}
        {...props}
      />
    </FieldChrome>
  ),
);

TextInput.displayName = 'TextInput';

export interface SearchFieldProps extends TextInputProps {
  iconLabel?: string;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      className,
      iconLabel = 'Search',
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
  ) => (
    <FieldChrome
      id={id}
      label={label}
      hint={hint}
      message={message}
      invalid={invalid}
      rootClassName={rootClassName}
      labelClassName={labelClassName}
    >
      <div className="ds-inputSearchShell">
        <Search aria-hidden="true" className="ds-inputSearchIcon" size={16} />
        <input
          ref={ref}
          id={id}
          aria-label={props['aria-label'] ?? iconLabel}
          data-invalid={invalid || undefined}
          data-density={density}
          className={cn('ds-inputField', 'ds-inputSearchField', className)}
          {...props}
        />
      </div>
    </FieldChrome>
  ),
);

SearchField.displayName = 'SearchField';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
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
  ) => (
    <FieldChrome
      id={id}
      label={label}
      hint={hint}
      message={message}
      invalid={invalid}
      rootClassName={rootClassName}
      labelClassName={labelClassName}
    >
      <textarea
        ref={ref}
        id={id}
        data-invalid={invalid || undefined}
        data-density={density}
        className={cn('ds-inputField', 'ds-inputTextarea', className)}
        {...props}
      />
    </FieldChrome>
  ),
);

Textarea.displayName = 'Textarea';
