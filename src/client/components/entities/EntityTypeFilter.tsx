import React, { useState, useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import { getEntityTypeIcon } from '../../utils/entityTypeIcons';
import styles from './EntityTypeFilter.module.css';

interface EntityTypeOption {
  value: string;
  label: string;
}

interface EntityTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const EntityTypeFilter: React.FC<EntityTypeFilterProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: EntityTypeOption[] = [
    { value: 'all', label: 'All Types (VIP First)' },
    { value: 'vip_only', label: 'VIP Only' },
    { value: 'Person', label: 'Person' },
    { value: 'Organization', label: 'Organization' },
    { value: 'Location', label: 'Location' },
    { value: 'Document', label: 'Document' },
  ];

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
    <div
      className={[
        styles.wrapper,
        isOpen ? styles.wrapperOpen : styles.wrapperClosed,
        className,
      ].join(' ')}
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`control ${styles.triggerButton}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className={styles.triggerContent}>
          {getEntityTypeIcon(selectedOption.value, 'sm')}
          <span className={styles.triggerLabel}>{selectedOption.label}</span>
        </div>
        <Icon name="ChevronDown" size="sm" />
      </button>

      {isOpen && (
        <div className={`dropdown-surface ${styles.dropdown}`}>
          <ul role="listbox" className={styles.list}>
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={[
                  styles.optionItem,
                  option.value === value ? styles.optionSelected : styles.optionUnselected,
                ].join(' ')}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {getEntityTypeIcon(option.value, 'sm')}
                <span>{option.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EntityTypeFilter;
