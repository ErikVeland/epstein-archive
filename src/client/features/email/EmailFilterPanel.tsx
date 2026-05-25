import React from 'react';
import styles from './EmailClient.module.css';
import { Button, Select, TextInput } from '@client/design-system/lib';

const minRiskOptions = [
  { value: 0, label: 'Any' },
  { value: 1, label: '≥ 1' },
  { value: 2, label: '≥ 2' },
  { value: 3, label: '≥ 3' },
  { value: 4, label: '≥ 4' },
];

interface EmailFilterPanelProps {
  fromFilter: string;
  toFilter: string;
  dateFrom: string;
  dateTo: string;
  hasAttachmentsOnly: boolean;
  minRisk: number;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onAttachmentToggle: () => void;
  onMinRiskChange: (v: number) => void;
}

export const EmailFilterPanel: React.FC<EmailFilterPanelProps> = ({
  fromFilter,
  toFilter,
  dateFrom,
  dateTo,
  hasAttachmentsOnly,
  minRisk,
  onFromChange,
  onToChange,
  onDateFromChange,
  onDateToChange,
  onAttachmentToggle,
  onMinRiskChange,
}) => {
  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterGrid}>
        <div className={styles.filterLead}>
          Refine by sender, recipient, date, attachments, and risk.
        </div>
        <div className={styles.filterFormGrid}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>From</span>
            <TextInput
              value={fromFilter}
              onChange={(event) => onFromChange(event.target.value)}
              placeholder="sender@domain.com or name"
              aria-label="From"
              density="compact"
              className={styles.filterTextInput}
            />
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>To</span>
            <TextInput
              value={toFilter}
              onChange={(event) => onToChange(event.target.value)}
              placeholder="recipient@domain.com or name"
              aria-label="To"
              density="compact"
              className={styles.filterTextInput}
            />
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Date From</span>
            <TextInput
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              type="date"
              aria-label="Date from"
              density="compact"
              className={styles.filterDateInput}
            />
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Date To</span>
            <TextInput
              value={dateTo}
              onChange={(event) => onDateToChange(event.target.value)}
              type="date"
              aria-label="Date to"
              density="compact"
              className={styles.filterDateInput}
            />
          </label>
        </div>

        <div className={styles.filterQuickRow}>
          <span className={styles.quickLabel}>Quick Toggles</span>
          <Button
            onClick={onAttachmentToggle}
            type="button"
            variant="ghost"
            size="sm"
            className={`${styles.toggleChip} ${
              hasAttachmentsOnly ? styles.toggleChipActive : styles.toggleChipInactive
            }`}
          >
            Has attachments
          </Button>
          <div className={styles.riskPicker}>
            <span className={styles.riskLabel}>Min Risk</span>
            <Select
              value={minRisk}
              onChange={(event) => onMinRiskChange(Number(event.target.value))}
              options={minRiskOptions}
              size="sm"
              className={styles.riskSelect}
              aria-label="Minimum risk"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
