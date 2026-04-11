import { X } from 'lucide-react';
import styles from './MobileEmailFilterSheet.module.css';

interface MobileEmailFilterSheetProps {
  searchInput: string;
  fromFilter: string;
  toFilter: string;
  dateFrom: string;
  dateTo: string;
  hasAttachmentsOnly: boolean;
  minRisk: number;
  activeTab: 'all' | 'primary' | 'updates' | 'promotions';
  onSearchChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onHasAttachmentsChange: (value: boolean) => void;
  onMinRiskChange: (value: number) => void;
  onTabChange: (tab: 'all' | 'primary' | 'updates' | 'promotions') => void;
  onClear: () => void;
  onClose: () => void;
}

const TABS: Array<{ id: 'all' | 'primary' | 'updates' | 'promotions'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'primary', label: 'Primary' },
  { id: 'updates', label: 'Updates' },
  { id: 'promotions', label: 'Promotions' },
];

export function MobileEmailFilterSheet({
  searchInput,
  fromFilter,
  toFilter,
  dateFrom,
  dateTo,
  hasAttachmentsOnly,
  minRisk,
  activeTab,
  onSearchChange,
  onFromChange,
  onToChange,
  onDateFromChange,
  onDateToChange,
  onHasAttachmentsChange,
  onMinRiskChange,
  onTabChange,
  onClear,
  onClose,
}: MobileEmailFilterSheetProps) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.titleRow}>
          <span className={styles.title}>Search &amp; Filters</span>
          <button className={styles.clearBtn} onClick={onClear} type="button">
            Clear all
          </button>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Search</span>
            <input
              className={styles.textInput}
              placeholder="Keywords in subject or body"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>From</span>
            <input
              className={styles.textInput}
              placeholder="sender@domain.com or name"
              value={fromFilter}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>To</span>
            <input
              className={styles.textInput}
              placeholder="recipient@domain.com or name"
              value={toFilter}
              onChange={(e) => onToChange(e.target.value)}
            />
          </label>

          <div className={styles.dateRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Date from</span>
              <input
                className={styles.dateInput}
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Date to</span>
              <input
                className={styles.dateInput}
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.sectionLabel}>Tab</div>
          <div className={styles.chipRow}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.chip} ${activeTab === tab.id ? styles.chipActive : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.sectionLabel}>Quick filters</div>
          <div className={styles.chipRow}>
            <button
              type="button"
              className={`${styles.chip} ${hasAttachmentsOnly ? styles.chipActive : ''}`}
              onClick={() => onHasAttachmentsChange(!hasAttachmentsOnly)}
            >
              Has attachments
            </button>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Min risk</span>
            <select
              className={styles.select}
              value={minRisk}
              onChange={(e) => onMinRiskChange(Number(e.target.value))}
              aria-label="Minimum risk level"
            >
              <option value={0}>Any</option>
              <option value={1}>≥ 1 (Minimal)</option>
              <option value={2}>≥ 2 (Low)</option>
              <option value={3}>≥ 3 (Medium)</option>
              <option value={4}>≥ 4 (High)</option>
              <option value={5}>≥ 5 (Critical)</option>
            </select>
          </label>
        </div>

        <div className={styles.footer}>
          <button className={styles.applyBtn} onClick={onClose} type="button">
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
