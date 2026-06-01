/**
 * Table Viewer Component
 *
 * Displays CSV/TSV data with virtual scrolling
 */

import React, { useMemo } from 'react';
import Icon from '@client/components/common/Icon';
import { FixedSizeList as List } from 'react-window';
import styles from './TableViewer.module.css';

import { Button } from '@client/design-system/lib';

interface TableViewerProps {
  evidence: {
    extractedText: string;
    metadata: {
      columnHeaders?: string;
      rowCount?: number;
    };
  };
}

export function TableViewer({ evidence }: TableViewerProps) {
  const { extractedText, metadata } = evidence;

  const { headers, rows } = useMemo(() => {
    const lines = extractedText.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const delimiter = extractedText.includes('\t') ? '\t' : ',';

    // Prefer server-provided column headers from enrichment metadata (pipe-separated).
    // This is more reliable than parsing the first line, which may contain OCR noise.
    const metaHeaders =
      metadata?.columnHeaders
        ?.split('|')
        .map((h) => h.trim())
        .filter(Boolean) ?? [];

    const headers = metaHeaders.length > 0 ? metaHeaders : lines[0].split(delimiter);
    // When metadata headers are used the first line is still a data row, not a header row.
    const dataLines = metaHeaders.length > 0 ? lines : lines.slice(1);
    const rows = dataLines.map((line) => line.split(delimiter));

    return { headers, rows };
  }, [extractedText, metadata]);

  const downloadCSV = () => {
    const blob = new Blob([extractedText], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evidence-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = rows[index];
    return (
      <div style={style} className={styles.row}>
        <div className={styles.indexCell}>{index + 1}</div>
        {row.map((cell, cellIndex) => (
          <div key={cellIndex} className={styles.cell}>
            {cell}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Data Table</h3>
          <p className={styles.subtitle}>
            {rows.length.toLocaleString()} rows × {headers.length} columns
          </p>
        </div>

        <Button unstyled onClick={downloadCSV} className={styles.downloadButton}>
          <Icon name="Download" className={styles.downloadIcon} />
          Download CSV
        </Button>
      </div>

      {rows.length > 100 && (
        <div className={styles.notice}>
          <Icon name="Info" className={styles.noticeIcon} />
          <p className={styles.noticeText}>
            Showing all {rows.length.toLocaleString()} rows using virtual scrolling for performance.
          </p>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableShell}>
        {/* Column Headers */}
        <div className={styles.headerRow}>
          <div className={`${styles.indexCell} ${styles.indexHeaderCell}`}>#</div>
          {headers.map((header, index) => (
            <div key={index} className={`${styles.cell} ${styles.headerCell}`}>
              {header}
            </div>
          ))}
        </div>

        {/* Rows with Virtual Scrolling */}
        {rows.length > 0 && (
          <List
            height={Math.min(600, rows.length * 48)}
            itemCount={rows.length}
            itemSize={48}
            width="100%"
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  );
}
