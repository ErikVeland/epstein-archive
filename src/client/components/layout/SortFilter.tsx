import React, { useState, useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../design-system/lib';
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
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            data-testid="sort-filter"
            className={s.trigger}
            variant="secondary"
            size="sm"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <div className={s.triggerInner}>
              {selectedOption.icon}
              <span>{selectedOption.label}</span>
            </div>
            <Icon name="ChevronDown" size="sm" />
          </Button>
        </DropdownMenuTrigger>

        {isOpen && (
          <DropdownMenuContent className={s.dropdown} align="start">
            {options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`${s.option} ${option.value === value ? s.optionSelected : ''}`}
                onSelect={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.icon}
                <span>{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  );
};

export default SortFilter;
