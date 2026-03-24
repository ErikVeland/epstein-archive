/**
 * Table Viewer Component
 *
 * Displays CSV/TSV data with virtual scrolling
 */

import React, { useMemo } from 'react';
import { Download, Info } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';

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
  // TODO: Use metadata for table formatting hints - see UNUSED_VARIABLES_RECOMMENDATIONS.md
  const { extractedText, metadata: _metadata } = evidence;

  const { headers, rows } = useMemo(() => {
    const lines = extractedText.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const delimiter = extractedText.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter);
    const rows = lines.slice(1).map((line) => line.split(delimiter));

    return { headers, rows };
  }, [extractedText]);

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
      <div
        style={style}
        className="flex border-b border-[var(--glass-border)] hover:bg-[var(--app-bg)]"
      >
        <div className="w-16 flex-shrink-0 px-4 py-3 text-sm text-[var(--text-muted)] border-r">
          {index + 1}
        </div>
        {row.map((cell, cellIndex) => (
          <div
            key={cellIndex}
            className="flex-1 px-4 py-3 text-sm text-[var(--text-primary)] border-r last:border-r-0"
            style={{ minWidth: '150px' }}
          >
            {cell}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Data Table</h3>
          <p className="text-sm text-[var(--text-primary)] mt-1">
            {rows.length.toLocaleString()} rows × {headers.length} columns
          </p>
        </div>

        <button
          onClick={downloadCSV}
          className="flex items-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--text-primary)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] hover:bg-[var(--app-bg)]"
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </button>
      </div>

      {rows.length > 100 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-[var(--radius-lg)] flex items-start">
          <Info className="h-5 w-5 text-[var(--accent)] mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Showing all {rows.length.toLocaleString()} rows using virtual scrolling for performance.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] overflow-hidden">
        {/* Column Headers */}
        <div className="bg-[var(--app-bg)] border-b border-[var(--glass-border)] flex sticky top-0 z-10">
          <div className="w-16 flex-shrink-0 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] border-r">
            #
          </div>
          {headers.map((header, index) => (
            <div
              key={index}
              className="flex-1 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] border-r last:border-r-0"
              style={{ minWidth: '150px' }}
            >
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
