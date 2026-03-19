import React from 'react';

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
    <div className={`mb-4 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {helpText && (
        <p className="mt-1 text-xs text-[var(--text-muted)]" id={`${id}-description`}>
          {helpText}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-400" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
