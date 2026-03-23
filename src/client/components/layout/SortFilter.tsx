import React, { useState, useRef, useEffect } from 'react';
import Icon from '../common/Icon';

interface SortOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SortFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
  className?: string;
}

const SortFilter: React.FC<SortFilterProps> = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <div className={`relative ${isOpen ? 'z-[1200]' : 'z-10'} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        data-testid="sort-filter"
        className="control px-3 text-sm flex items-center gap-2 justify-between w-full min-w-[140px]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption.icon}
          <span>{selectedOption.label}</span>
        </div>
        <Icon name="ChevronDown" size="sm" />
      </button>

      {isOpen && (
        <div className="absolute z-[1210] mt-1 w-full min-w-[160px] right-0 md:left-0 md:right-auto dropdown-surface p-1">
          <ul role="listbox" className="py-1">
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`px-3 h-10 text-sm cursor-pointer flex items-center gap-2 rounded-[var(--radius-sm)] hover:bg-[var(--glass-bg-highlight)]/55 ${
                  option.value === value
                    ? 'bg-[var(--glass-bg-highlight)]/65 text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.icon}
                <span>{option.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SortFilter;
