import React from 'react';
import { ChevronDown } from 'lucide-react';

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
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          className={`
            w-full appearance-none bg-slate-900 border border-slate-700 
            text-white text-sm rounded-[var(--radius-md)] pl-3 pr-10 py-2.5 
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
            hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-white">
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-400 transition-colors">
          <ChevronDown size={16} strokeWidth={2.5} />
        </div>
      </div>
      {error && <span className="text-xs text-red-400 ml-1">{error}</span>}
    </div>
  );
};
