import React from 'react';
import { ChevronDown } from 'lucide-react';
import { semanticTokens } from '../../styles/designSystem';

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
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          className={`
            w-full appearance-none bg-[var(--glass-bg)] border border-[var(--glass-border)] 
            text-[var(--text-primary)] text-sm rounded-[var(--radius-md)] pl-3 pr-10 py-2.5 
            focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]
            hover:bg-[var(--glass-bg-strong)] hover:border-[var(--glass-border-highlight)] transition-all cursor-pointer
            ${error ? semanticTokens.errorBorder : ''}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
          <ChevronDown size={16} strokeWidth={2.5} />
        </div>
      </div>
      {error && <span className={`text-xs ${semanticTokens.errorText} ml-1`}>{error}</span>}
    </div>
  );
};
