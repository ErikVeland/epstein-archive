import { useState, useCallback, useRef } from 'react';
import { SearchField } from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import styles from './EntityPicker.module.css';

interface EntityOption {
  id: string;
  name: string;
  type: string;
}

interface EntityPickerProps {
  value: EntityOption | null;
  onChange: (entity: EntityOption | null) => void;
  placeholder?: string;
  label?: string;
}

export function EntityPicker({
  value,
  onChange,
  placeholder = 'Search for a person or entity...',
  label,
}: EntityPickerProps) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (value && q !== value.name) onChange(null);
      clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const persons = await apiClient.searchEntities(q, 8);
          const opts: EntityOption[] = persons.map((e) => {
            const raw = e as unknown as Record<string, unknown>;
            return {
              id: String(e.id),
              name: e.name || e.fullName || String(e.id),
              type: typeof raw.entityType === 'string' ? raw.entityType : 'unknown',
            };
          });
          setResults(opts);
          setOpen(opts.length > 0);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 200);
    },
    [value, onChange],
  );

  const select = (opt: EntityOption) => {
    onChange(opt);
    setQuery(opt.name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.inputWrapper}>
        <SearchField
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
        />
        {loading && <span className={styles.spinner} aria-hidden />}
      </div>
      {open && (
        <ul className={styles.dropdown} role="listbox">
          {results.map((opt) => (
            <li
              key={opt.id}
              role="option"
              aria-selected={value?.id === opt.id}
              className={styles.option}
              onMouseDown={(e) => {
                e.preventDefault();
                select(opt);
              }}
            >
              <span className={styles.optionName}>{opt.name}</span>
              <span className={styles.optionType}>{opt.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
