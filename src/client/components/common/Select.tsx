import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import s from './Select.module.css';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  containerClassName = '',
  className = '',
  id,
  name,
  ...props
}) => {
  const selectId = id ?? (name ? `select-${name}` : undefined);

  return (
    <div className={cn(s.root, containerClassName)}>
      {label && (
        <label className={s.label} htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className={s.wrapper}>
        <select id={selectId} className={cn(s.select, error && s.hasError, className)} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={s.chevron}>
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </div>
      {error && <span className={s.errorText}>{error}</span>}
    </div>
  );
};
