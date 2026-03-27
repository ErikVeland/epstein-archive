import React from 'react';
import { Folder, Scale, Mail, ScrollText, Image as ImageIcon, Landmark } from 'lucide-react';
import { BrowseFilters } from '../../types/documents';
import { DOJ_TRANCHE_OPTIONS } from './documentTrancheOptions';

interface DocumentBrowserFiltersProps {
  localFilters: BrowseFilters;
  handleFilterChange: (key: keyof BrowseFilters, value: BrowseFilters[keyof BrowseFilters]) => void;
  handleRedFlagLevelChange: (min: number, max: number) => void;
  selectedTranche: string;
  fileTypeOptions: Array<{ value: string; label: string }>;
  sourceOptions: Array<{ value: string; label: string }>;
  availableCollections: Array<{ id: string; name: string }>;
  hideLowCredibility: boolean;
  setHideLowCredibility: (value: boolean) => void;
  handleFileTypeToggle: (fileType: string) => void;
}

export const DocumentBrowserFilters: React.FC<DocumentBrowserFiltersProps> = ({
  localFilters,
  handleFilterChange,
  handleRedFlagLevelChange,
  selectedTranche,
  fileTypeOptions,
  sourceOptions,
  availableCollections,
  hideLowCredibility,
  setHideLowCredibility,
  handleFileTypeToggle,
}) => {
  return (
    <div className="mb-4 space-y-3">
      {/* Category + significance chips row */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="control-scroll-row min-w-0 flex-1">
          <div className="inline-flex min-w-max items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] overflow-hidden divide-x divide-[var(--glass-border)]">
            {[
              { type: 'all', label: 'All', icon: <Folder className="w-3.5 h-3.5" /> },
              { type: 'legal', label: 'Legal', icon: <Scale className="w-3.5 h-3.5" /> },
              { type: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
              {
                type: 'deposition',
                label: 'Deposition',
                icon: <ScrollText className="w-3.5 h-3.5" />,
              },
              { type: 'photo', label: 'Photo', icon: <ImageIcon className="w-3.5 h-3.5" /> },
              {
                type: 'financial',
                label: 'Financial',
                icon: <Landmark className="w-3.5 h-3.5" />,
              },
            ].map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => {
                  if (type === 'all') {
                    handleFilterChange('categories', []);
                  } else {
                    handleFilterChange('categories', [type]);
                  }
                }}
                className={`inline-flex items-center gap-2 h-11 px-4 text-sm font-medium transition-colors shrink-0 ${
                  (type === 'all' &&
                    (!localFilters.categories || localFilters.categories.length === 0)) ||
                  localFilters.categories?.includes(type)
                    ? 'bg-[var(--accent)]/90 text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="control-scroll-row md:flex-wrap md:justify-end md:overflow-visible md:pb-0 md:shrink-0">
          {selectedTranche !== 'all' && (
            <span className="px-3 py-1.5 rounded-full text-sm bg-[var(--accent)]/20 text-[var(--text-primary)] border border-[var(--accent)]/40">
              Tranche: {DOJ_TRANCHE_OPTIONS.find((entry) => entry.value === selectedTranche)?.label}
            </span>
          )}
          <div className="inline-flex min-w-max items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] overflow-hidden divide-x divide-[var(--glass-border)]">
            <button
              onClick={() => {
                const isActive =
                  localFilters.redFlagLevel?.min === 4 && localFilters.redFlagLevel?.max === 5;
                handleRedFlagLevelChange(isActive ? 0 : 4, isActive ? 5 : 5);
              }}
              className={`inline-flex items-center gap-2 h-11 px-4 text-sm font-medium transition-colors shrink-0 ${
                localFilters.redFlagLevel?.min === 4 && localFilters.redFlagLevel?.max === 5
                  ? 'bg-red-500/20 text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  localFilters.redFlagLevel?.min === 4 && localFilters.redFlagLevel?.max === 5
                    ? 'bg-red-400'
                    : 'bg-red-600'
                }`}
              ></div>
              <span>High Significance</span>
            </button>
            <button
              onClick={() => {
                const isActive =
                  localFilters.redFlagLevel?.min === 2 && localFilters.redFlagLevel?.max === 3;
                handleRedFlagLevelChange(isActive ? 0 : 2, isActive ? 5 : 3);
              }}
              className={`inline-flex items-center gap-2 h-11 px-4 text-sm font-medium transition-colors shrink-0 ${
                localFilters.redFlagLevel?.min === 2 && localFilters.redFlagLevel?.max === 3
                  ? 'bg-amber-500/20 text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  localFilters.redFlagLevel?.min === 2 && localFilters.redFlagLevel?.max === 3
                    ? 'bg-amber-400'
                    : 'bg-amber-600'
                }`}
              ></div>
              <span>Medium</span>
            </button>
            <button
              onClick={() => {
                const isActive =
                  localFilters.redFlagLevel?.min === 0 && localFilters.redFlagLevel?.max === 1;
                handleRedFlagLevelChange(isActive ? 0 : 0, isActive ? 5 : 1);
              }}
              className={`inline-flex items-center gap-2 h-11 px-4 text-sm font-medium transition-colors shrink-0 ${
                localFilters.redFlagLevel?.min === 0 && localFilters.redFlagLevel?.max === 1
                  ? 'bg-emerald-500/20 text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  localFilters.redFlagLevel?.min === 0 && localFilters.redFlagLevel?.max === 1
                    ? 'bg-emerald-400'
                    : 'bg-emerald-600'
                }`}
              ></div>
              <span>Low Risk</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop inline detailed filters */}
      <div className="glass-panel p-6 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* File Type Filter */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">
              File Formats
            </label>
            {fileTypeOptions.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] italic">
                No file-type facets available.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {fileTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={localFilters.fileType?.includes(option.value) || false}
                      onChange={() => handleFileTypeToggle(option.value)}
                      className="w-4 h-4 rounded-[var(--radius-sm)] border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--accent)] focus:ring-[var(--accent)]/20"
                    />
                    <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Archive Source
            </label>
            {sourceOptions.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] italic">
                No source facets available.
              </div>
            ) : (
              <select
                multiple
                value={localFilters.source || []}
                onChange={(e) =>
                  handleFilterChange(
                    'source',
                    Array.from(e.target.selectedOptions, (opt) => opt.value),
                  )
                }
                className="w-full h-32 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] p-2 text-xs text-[var(--text-secondary)] focus:ring-1 focus:ring-[var(--accent)]/50 outline-none scrollbar-thin"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="py-1 px-1">
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">
              Temporal Window
            </label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="date"
                  value={localFilters.dateRange?.start || ''}
                  onChange={(e) =>
                    handleFilterChange('dateRange', {
                      ...(localFilters.dateRange || {}),
                      start: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]/50"
                />
                <span className="absolute -top-2 left-2 px-1 bg-[var(--glass-bg-strong)] text-[10px] text-[var(--text-muted)]">
                  From
                </span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={localFilters.dateRange?.end || ''}
                  onChange={(e) =>
                    handleFilterChange('dateRange', {
                      ...(localFilters.dateRange || {}),
                      end: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]/50"
                />
                <span className="absolute -top-2 left-2 px-1 bg-[var(--glass-bg-strong)] text-[10px] text-[var(--text-muted)]">
                  To
                </span>
              </div>
            </div>
          </div>

          {/* Reliability & Collections */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">
                Trust & Integrity
              </label>
              <label className="flex items-center gap-3 p-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] cursor-pointer hover:bg-[var(--glass-bg-highlight)] transition-colors">
                <input
                  type="checkbox"
                  checked={hideLowCredibility}
                  onChange={(e) => setHideLowCredibility(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--accent)] focus:ring-[var(--accent)]/20"
                />
                <span className="text-xs text-[var(--text-secondary)]">
                  Exclude low-reliability items
                </span>
              </label>
            </div>

            {availableCollections?.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Logical Collections
                </label>
                <select
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] p-2 text-xs text-[var(--text-secondary)] outline-none"
                  value={localFilters.collectionId || ''}
                  onChange={(e) => handleFilterChange('collectionId', e.target.value || undefined)}
                >
                  <option value="">All Documents</option>
                  {availableCollections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
