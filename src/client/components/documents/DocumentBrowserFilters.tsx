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
  handleExcludedTypeToggle: (fileType: string) => void;
  defaultExcludedTypes: string[];
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
  handleExcludedTypeToggle,
  defaultExcludedTypes,
}) => {
  return (
    <div className="mb-4 space-y-3">
      {/* Category + significance chips row */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="overflow-x-auto pb-1 min-w-0 flex-1">
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
                    if (type === 'photo') {
                      handleFilterChange('includeMedia', true);
                    }
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

        <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
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

      {/* Quick Focus / Presets row */}
      <div className="surface-glass p-3 flex flex-wrap items-center gap-3 border-b-0 rounded-b-none mb-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-2 mr-1">
          Content Focus:
        </span>
        {[
          {
            label: 'Documents Only',
            isActive:
              (localFilters.excludedFileTypes?.length ?? 0) > 0 && !localFilters.includeMedia,
            onClick: () => {
              handleFilterChange('includeMedia', false);
              handleFilterChange('excludedFileTypes', defaultExcludedTypes);
              handleFilterChange('fileType', []);
            },
          },
          {
            label: 'Show Everything',
            isActive:
              (localFilters.excludedFileTypes?.length ?? 0) === 0 && localFilters.includeMedia,
            onClick: () => {
              handleFilterChange('includeMedia', true);
              handleFilterChange('excludedFileTypes', []);
              handleFilterChange('fileType', []);
            },
          },
          {
            label: 'Media Only',
            isActive: localFilters.categories?.includes('photo'),
            onClick: () => {
              handleFilterChange('categories', ['photo']);
              handleFilterChange('includeMedia', true);
              handleFilterChange('excludedFileTypes', []);
            },
          },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={preset.onClick}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              preset.isActive
                ? 'bg-[var(--accent)] text-[var(--text-primary)] shadow-sm'
                : 'bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Desktop inline detailed filters */}
      <div className="surface-glass p-6 mt-0 rounded-t-none">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* File Type Filter */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                File Formats
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('excludedFileTypes', [])}
                  className="text-[10px] text-[var(--accent)] hover:underline"
                >
                  Show All
                </button>
                <button
                  onClick={() =>
                    handleFilterChange(
                      'excludedFileTypes',
                      fileTypeOptions.map((o) => o.value),
                    )
                  }
                  className="text-[10px] text-[var(--text-muted)] hover:underline"
                >
                  Hide All
                </button>
              </div>
            </div>
            {fileTypeOptions.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] italic">
                No file-type facets available.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto scrollbar-thin pr-2">
                {fileTypeOptions.map((option) => {
                  const isVisible = !localFilters.excludedFileTypes?.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center justify-between p-1.5 rounded-[var(--radius-sm)] cursor-pointer group transition-colors ${
                        isVisible
                          ? 'hover:bg-[var(--glass-bg-highlight)]'
                          : 'opacity-50 hover:bg-[var(--glass-bg-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleExcludedTypeToggle(option.value)}
                          className="w-3.5 h-3.5 rounded-[var(--radius-sm)] border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--accent)] focus:ring-[var(--accent)]/20"
                        />
                        <span
                          className={`text-[11px] transition-colors ${
                            isVisible ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {option.label.split(' (')[0]}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {option.label.match(/\((\d+)\)/)?.[1] || ''}
                      </span>
                    </label>
                  );
                })}
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
              <div className="space-y-2">
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

                <label className="flex items-center gap-3 p-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] cursor-pointer hover:bg-[var(--glass-bg-highlight)] transition-colors">
                  <input
                    type="checkbox"
                    checked={localFilters.includeMedia || false}
                    onChange={(e) => handleFilterChange('includeMedia', e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--accent)] focus:ring-[var(--accent)]/20"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-[var(--text-secondary)] leading-none">
                      Include Media Content
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Show photos, videos, and audio (Off by default)
                    </span>
                  </div>
                </label>
              </div>
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
