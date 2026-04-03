import React from 'react';
import { Folder, Scale, Mail, ScrollText, Image as ImageIcon, Landmark } from 'lucide-react';
import { BrowseFilters } from '../../types/documents';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';
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
    <Box className="mb-4 space-y-3">
      <Flex
        direction="column"
        align="stretch"
        justify="between"
        gap="md"
        className="md:flex-row md:items-center"
      >
        <Box className="overflow-x-auto pb-1 min-w-0 flex-1">
          <Flex
            align="center"
            className="inline-flex min-w-max rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] overflow-hidden divide-x divide-[var(--glass-border)]"
          >
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
          </Flex>
        </Box>

        <Flex wrap="wrap" align="center" gap="sm" className="md:justify-end md:shrink-0">
          {selectedTranche !== 'all' && (
            <Surface
              variant="glass-highlight"
              className="px-3 py-1.5 rounded-full border border-[var(--accent)]/40"
            >
              <LqText variant="xs" weight="medium">
                Tranche:{' '}
                {DOJ_TRANCHE_OPTIONS.find((entry) => entry.value === selectedTranche)?.label}
              </LqText>
            </Surface>
          )}
          <Flex
            align="center"
            className="inline-flex min-w-max rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] overflow-hidden divide-x divide-[var(--glass-border)]"
          >
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
              <Box
                className={`w-2 h-2 rounded-full ${
                  localFilters.redFlagLevel?.min === 4 && localFilters.redFlagLevel?.max === 5
                    ? 'bg-red-400'
                    : 'bg-red-600'
                }`}
              />
              <LqText variant="xs">High Significance</LqText>
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
              <Box
                className={`w-2 h-2 rounded-full ${
                  localFilters.redFlagLevel?.min === 2 && localFilters.redFlagLevel?.max === 3
                    ? 'bg-amber-400'
                    : 'bg-amber-600'
                }`}
              />
              <LqText variant="xs">Medium</LqText>
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
              <Box
                className={`w-2 h-2 rounded-full ${
                  localFilters.redFlagLevel?.min === 0 && localFilters.redFlagLevel?.max === 1
                    ? 'bg-emerald-400'
                    : 'bg-emerald-600'
                }`}
              />
              <LqText variant="xs">Low Risk</LqText>
            </button>
          </Flex>
        </Flex>
      </Flex>

      {/* Quick Focus / Presets row */}
      <Surface variant="glass" className="p-3 border-b-0 rounded-b-none mb-0">
        <Flex align="center" gap="sm" wrap="wrap">
          <LqText
            variant="xs"
            weight="bold"
            color="muted"
            className="uppercase tracking-wider ml-2 mr-1"
          >
            Content Focus:
          </LqText>
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
        </Flex>
      </Surface>

      {/* Desktop inline detailed filters */}
      <Surface variant="glass" className="p-6 mt-0 rounded-t-none">
        <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* File Type Filter */}
          <Box>
            <Flex align="center" justify="between" className="mb-4">
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                className="uppercase tracking-widest"
              >
                File Formats
              </LqText>
              <Flex gap="sm">
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
              </Flex>
            </Flex>
            {fileTypeOptions.length === 0 ? (
              <LqText variant="xs" color="muted" className="italic">
                No file-type facets available.
              </LqText>
            ) : (
              <Box className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto scrollbar-thin pr-2">
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
                      <Flex align="center" gap="sm">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleExcludedTypeToggle(option.value)}
                          className="w-3.5 h-3.5 rounded-[var(--radius-sm)] border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--accent)] focus:ring-[var(--accent)]/20"
                        />
                        <LqText
                          variant="xs"
                          color={isVisible ? 'secondary' : 'muted'}
                          className="transition-colors"
                        >
                          {option.label.split(' (')[0]}
                        </LqText>
                      </Flex>
                      <LqText variant="xs" color="muted" className="font-mono">
                        {option.label.match(/\((\d+)\)/)?.[1] || ''}
                      </LqText>
                    </label>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Source Filter */}
          <Box>
            <LqText
              variant="xs"
              weight="bold"
              color="muted"
              className="uppercase tracking-widest mb-4 block"
            >
              Archive Source
            </LqText>
            {sourceOptions.length === 0 ? (
              <LqText variant="xs" color="muted" className="italic">
                No source facets available.
              </LqText>
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
          </Box>

          {/* Date range */}
          <Box>
            <LqText
              variant="xs"
              weight="bold"
              color="muted"
              className="uppercase tracking-widest mb-4 block"
            >
              Temporal Window
            </LqText>
            <Box className="space-y-3">
              <Box className="relative">
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
                <Box
                  as="span"
                  className="absolute -top-2 left-2 px-1 bg-[var(--glass-bg-strong)] text-[10px] text-[var(--text-muted)]"
                >
                  From
                </Box>
              </Box>
              <Box className="relative">
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
                <Box
                  as="span"
                  className="absolute -top-2 left-2 px-1 bg-[var(--glass-bg-strong)] text-[10px] text-[var(--text-muted)]"
                >
                  To
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Reliability & Collections */}
          <Box className="space-y-6">
            <Box>
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                className="uppercase tracking-widest mb-4 block"
              >
                Trust & Integrity
              </LqText>
              <Box className="space-y-2">
                <Surface
                  as="label"
                  variant="glass"
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--glass-bg-highlight)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={hideLowCredibility}
                    onChange={(e) => setHideLowCredibility(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--accent)] focus:ring-[var(--accent)]/20"
                  />
                  <LqText variant="xs" color="secondary">
                    Exclude low-reliability items
                  </LqText>
                </Surface>

                <Surface
                  as="label"
                  variant="glass"
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--glass-bg-highlight)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.includeMedia || false}
                    onChange={(e) => handleFilterChange('includeMedia', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--accent)] focus:ring-[var(--accent)]/20"
                  />
                  <Flex direction="column" gap="none">
                    <LqText variant="xs" color="secondary">
                      Include Media Content
                    </LqText>
                    <LqText variant="xs" color="muted" className="text-[10px] leading-tight">
                      Show photos, videos, and audio (Off by default)
                    </LqText>
                  </Flex>
                </Surface>
              </Box>
            </Box>

            {availableCollections?.length > 0 && (
              <Box>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  className="uppercase tracking-widest mb-2 block"
                >
                  Logical Collections
                </LqText>
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
              </Box>
            )}
          </Box>
        </Box>
      </Surface>
    </Box>
  );
};
