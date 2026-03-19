import React, { useMemo, useState } from 'react';

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Diff View</h3>
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={onlyChanged}
            onChange={(event) => setOnlyChanged(event.target.checked)}
          />
          Show changed lines only
        </label>
      </div>

      <div className="grid grid-cols-2 text-xs text-[var(--text-muted)] px-3">
        <span>Clean Text</span>
        <span>Original OCR</span>
      </div>

      <div className="surface-quiet divide-y divide-slate-800/80">
        {visibleRows.length === 0 && (
          <div className="p-4 text-sm text-[var(--text-muted)]">
            No textual differences detected.
          </div>
        )}
        {visibleRows.map((row) => (
          <div key={row.line} className="grid grid-cols-2 gap-0 text-sm">
            <div
              className={`p-3 border-r border-[var(--glass-border)] ${row.changed ? 'bg-emerald-900/10' : ''}`}
            >
              <div className="text-[10px] text-[var(--text-muted)] mb-1">L{row.line}</div>
              <pre className="whitespace-pre-wrap font-sans text-[var(--text-primary)] leading-relaxed">
                {row.clean || ' '}
              </pre>
            </div>
            <div className={`p-3 ${row.changed ? 'bg-rose-900/10' : ''}`}>
              <div className="text-[10px] text-[var(--text-muted)] mb-1">L{row.line}</div>
              <pre className="whitespace-pre-wrap font-sans text-[var(--text-secondary)] leading-relaxed">
                {row.original || ' '}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentDiffView;
