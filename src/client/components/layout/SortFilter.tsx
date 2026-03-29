import React, { useState, useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import s from './SortFilter.module.css';

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
    <div className={`${s.root} ${isOpen ? s.rootOpen : ''} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        data-testid="sort-filter"
        className={`control ${s.trigger}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className={s.triggerInner}>
          {selectedOption.icon}
          <span>{selectedOption.label}</span>
        </div>
        <Icon name="ChevronDown" size="sm" />
      </button>

      {isOpen && (
        <div className={`${s.dropdown} dropdown-surface`}>
          <ul role="listbox" className={s.list}>
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`${s.option} ${option.value === value ? s.optionSelected : ''}`}
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
