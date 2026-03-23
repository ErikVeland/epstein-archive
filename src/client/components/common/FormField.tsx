import React from 'react';
import { semanticTokens, spacingTokens } from '../../styles/designSystem';

interface FormFieldProps {
  label: React.ReactNode;
  id: string;
  children: React.ReactNode;
  error?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  children,
  error,
  helpText,
  required = false,
  className = '',
}) => {
  return (
    <div className={`${spacingTokens.fieldGap} ${className}`}>
      <label
        htmlFor={id}
        className={`block text-sm font-medium ${semanticTokens.fieldLabel} ${spacingTokens.labelGap}`}
      >
        {label}
        {required && <span className={`${semanticTokens.required} ml-[var(--space-1)]`}>*</span>}
      </label>
      {children}
      {helpText && (
        <p
          className={`${spacingTokens.helperGap} text-xs ${semanticTokens.helperText}`}
          id={`${id}-description`}
        >
          {helpText}
        </p>
      )}
      {error && (
        <p
          className={`${spacingTokens.helperGap} text-xs ${semanticTokens.errorText}`}
          id={`${id}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
