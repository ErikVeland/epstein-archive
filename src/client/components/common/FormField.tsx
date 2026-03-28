import React from 'react';
import s from './FormField.module.css';
import { cn } from '../../utils/cn';

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
    <div className={cn(s.root, className)}>
      <label htmlFor={id} className={s.label}>
        {label}
        {required && <span className={s.required}>*</span>}
      </label>
      {children}
      {helpText && (
        <p className={s.helper} id={`${id}-description`}>
          {helpText}
        </p>
      )}
      {error && (
        <p className={s.error} id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
