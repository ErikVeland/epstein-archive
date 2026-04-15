import React, { useMemo, useState } from 'react';
import styles from './DocumentDiffView.module.css';

import { Input } from '../../design-system/lib';

interface DocumentDiffViewProps {
  cleanText: string;
  originalText: string;
}

interface DiffRow {
  line: number;
  clean: string;
  original: string;
  changed: boolean;
}

const normalizeLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const DocumentDiffView: React.FC<DocumentDiffViewProps> = ({ cleanText, originalText }) => {
  const [onlyChanged, setOnlyChanged] = useState(true);

  const rows = useMemo<DiffRow[]>(() => {
    const cleanLines = (cleanText || '').split('\n');
    const originalLines = (originalText || '').split('\n');
    const max = Math.max(cleanLines.length, originalLines.length);
    const next: DiffRow[] = [];

    for (let i = 0; i < max; i += 1) {
      const clean = cleanLines[i] || '';
      const original = originalLines[i] || '';
      const changed = normalizeLine(clean) !== normalizeLine(original);
      next.push({ line: i + 1, clean, original, changed });
    }

    return next;
  }, [cleanText, originalText]);

  const visibleRows = useMemo(() => {
    if (!onlyChanged) return rows;
    return rows.filter((row) => row.changed);
  }, [rows, onlyChanged]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>Diff View</h3>
        <label className={styles.toggleLabel}>
          <Input
            type="checkbox"
            checked={onlyChanged}
            onChange={(event) => setOnlyChanged(event.target.checked)}
          />
          Show changed lines only
        </label>
      </div>

      <div className={styles.columnLabels}>
        <span>Clean Text</span>
        <span>Original OCR</span>
      </div>

      <div className={`surface-quiet ${styles.rows}`}>
        {visibleRows.length === 0 && (
          <div className={styles.emptyState}>No textual differences detected.</div>
        )}
        {visibleRows.map((row) => (
          <div key={row.line} className={styles.row}>
            <div
              className={`${styles.cell} ${styles.cleanCell} ${row.changed ? styles.changedClean : ''}`}
            >
              <div className={styles.lineNumber}>L{row.line}</div>
              <pre className={styles.cleanText}>{row.clean || ' '}</pre>
            </div>
            <div className={`${styles.cell} ${row.changed ? styles.changedOriginal : ''}`}>
              <div className={styles.lineNumber}>L{row.line}</div>
              <pre className={styles.originalText}>{row.original || ' '}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentDiffView;
