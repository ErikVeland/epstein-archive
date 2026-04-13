import { Button, SearchField, Select, TextInput } from '../../../design-system/lib';
import { SheetDialog } from '../../common/SheetDialog';
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
    <SheetDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Search & Filters"
      description="Refine the same email workspace using shared mobile sheet controls."
      bodyClassName={styles.body}
      footer={
        <>
          <Button variant="secondary" size="md" grow onClick={onClear} type="button">
            Clear All
          </Button>
          <Button variant="primary" size="md" grow onClick={onClose} type="button">
            Apply Filters
          </Button>
        </>
      }
    >
      <SearchField
        label="Search"
        placeholder="Keywords in subject or body…"
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <TextInput
        label="From"
        placeholder="sender@domain.com or name…"
        value={fromFilter}
        onChange={(e) => onFromChange(e.target.value)}
      />

      <TextInput
        label="To"
        placeholder="recipient@domain.com or name…"
        value={toFilter}
        onChange={(e) => onToChange(e.target.value)}
      />

      <div className={styles.dateRow}>
        <TextInput
          label="Date From"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
        <TextInput
          label="Date To"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </div>

      <div className={styles.sectionLabel}>Tab</div>
      <div className={styles.chipRow}>
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? 'primary' : 'glass'}
            size="sm"
            className={styles.chipButton}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className={styles.sectionLabel}>Quick Filters</div>
      <div className={styles.chipRow}>
        <Button
          type="button"
          variant={hasAttachmentsOnly ? 'primary' : 'glass'}
          size="sm"
          className={styles.chipButton}
          onClick={() => onHasAttachmentsChange(!hasAttachmentsOnly)}
        >
          Has Attachments
        </Button>
      </div>

      <Select
        label="Minimum Risk"
        value={minRisk}
        onChange={(e) => onMinRiskChange(Number(e.target.value))}
        aria-label="Minimum risk level"
        options={[
          { value: 0, label: 'Any' },
          { value: 1, label: '≥ 1 (Minimal)' },
          { value: 2, label: '≥ 2 (Low)' },
          { value: 3, label: '≥ 3 (Medium)' },
          { value: 4, label: '≥ 4 (High)' },
          { value: 5, label: '≥ 5 (Critical)' },
        ]}
      />
    </SheetDialog>
  );
}
