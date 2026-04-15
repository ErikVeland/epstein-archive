import React from 'react';
import { Folder, Scale, Mail, ScrollText, Image as ImageIcon, Landmark } from 'lucide-react';
import { BrowseFilters } from '../../types/documents';
import { DOJ_TRANCHE_OPTIONS } from './documentTrancheOptions';
import styles from './DocumentBrowserFilters.module.css';
import {
  Box,
  Button,
  Flex,
  Input,
  LqText,
  NativeSelect,
  Surface,
  cn,
} from '../../design-system/lib';
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
  const cx = (...classNames: Array<string | false | null | undefined>) =>
    classNames.filter(Boolean).join(' ');

  return (
    <Box className={styles.wrapper}>
      <Flex direction="column" align="stretch" justify="between" gap="md" className={styles.topBar}>
        <Box className={styles.categoryScroll}>
          <Flex align="center" className={styles.categoryStrip}>
            {/* Category tabs */}
            {[
              { type: 'all', label: 'All', icon: <Folder size={14} /> },
              { type: 'legal', label: 'Legal', icon: <Scale size={14} /> },
              { type: 'email', label: 'Email', icon: <Mail size={14} /> },
              { type: 'deposition', label: 'Deposition', icon: <ScrollText size={14} /> },
              { type: 'photo', label: 'Photo', icon: <ImageIcon size={14} /> },
              { type: 'financial', label: 'Financial', icon: <Landmark size={14} /> },
            ].map(({ type, label, icon }) => {
              const isActive =
                (type === 'all' &&
                  (!localFilters.categories || localFilters.categories.length === 0)) ||
                localFilters.categories?.includes(type);
              return (
                <Button
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
                  variant={isActive ? 'primary' : 'ghost'}
                  size="sm"
                  className={styles.categoryTab}
                >
                  {icon}
                  {label}
                </Button>
              );
            })}
          </Flex>
        </Box>

        <Flex wrap="wrap" align="center" gap="sm" className={styles.rightControls}>
          {selectedTranche !== 'all' && (
            <Surface variant="glass-highlight" className={styles.trancheBadge}>
              <LqText variant="xs" weight="medium">
                Tranche:{' '}
                {DOJ_TRANCHE_OPTIONS.find((entry) => entry.value === selectedTranche)?.label}
              </LqText>
            </Surface>
          )}
          <Flex align="center" className={styles.riskStrip}>
            <Button
              onClick={() => {
                const isActive =
                  localFilters.redFlagLevel?.min === 4 && localFilters.redFlagLevel?.max === 5;
                handleRedFlagLevelChange(isActive ? 0 : 4, isActive ? 5 : 5);
              }}
              variant={
                localFilters.redFlagLevel?.min === 4 && localFilters.redFlagLevel?.max === 5
                  ? 'primary'
                  : 'ghost'
              }
              size="sm"
              className={styles.riskTab}
            >
              <Box className={cn(styles.riskDot, styles.riskDotHigh)} />
              <LqText variant="xs">High Significance</LqText>
            </Button>
            <Button
              onClick={() => {
                const isActive =
                  localFilters.redFlagLevel?.min === 2 && localFilters.redFlagLevel?.max === 3;
                handleRedFlagLevelChange(isActive ? 0 : 2, isActive ? 5 : 3);
              }}
              variant={
                localFilters.redFlagLevel?.min === 2 && localFilters.redFlagLevel?.max === 3
                  ? 'primary'
                  : 'ghost'
              }
              size="sm"
              className={styles.riskTab}
            >
              <Box className={cn(styles.riskDot, styles.riskDotMed)} />
              <LqText variant="xs">Medium</LqText>
            </Button>
            <Button
              onClick={() => {
                const isActive =
                  localFilters.redFlagLevel?.min === 0 && localFilters.redFlagLevel?.max === 1;
                handleRedFlagLevelChange(isActive ? 0 : 0, isActive ? 5 : 1);
              }}
              variant={
                localFilters.redFlagLevel?.min === 0 && localFilters.redFlagLevel?.max === 1
                  ? 'primary'
                  : 'ghost'
              }
              size="sm"
              className={styles.riskTab}
            >
              <Box className={cn(styles.riskDot, styles.riskDotLow)} />
              <LqText variant="xs">Low Risk</LqText>
            </Button>
          </Flex>
        </Flex>
      </Flex>

      {/* Quick Focus / Presets row */}
      <Surface variant="glass" className={styles.presetsSurface}>
        <Flex align="center" gap="sm" wrap="wrap">
          <LqText variant="xs" weight="bold" color="muted" className={styles.presetsLabel}>
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
            <Button
              key={preset.label}
              onClick={preset.onClick}
              variant={preset.isActive ? 'primary' : 'ghost'}
              size="sm"
              className={styles.presetBtn}
            >
              {preset.label}
            </Button>
          ))}
        </Flex>
      </Surface>

      {/* Desktop inline detailed filters */}
      <Surface variant="glass" className={styles.detailsPanel}>
        <Box className={styles.detailGrid}>
          {/* File Type Filter */}
          <Box>
            <Flex align="center" justify="between" className={styles.fileTypeHeader}>
              <LqText variant="xs" weight="bold" color="muted" className={styles.sectionLabel}>
                File Formats
              </LqText>
              <Flex gap="sm">
                <Button
                  onClick={() => handleFilterChange('excludedFileTypes', [])}
                  variant="ghost"
                  size="sm"
                  className={styles.linkAccent}
                >
                  Show All
                </Button>
                <Button
                  onClick={() =>
                    handleFilterChange(
                      'excludedFileTypes',
                      fileTypeOptions.map((o) => o.value),
                    )
                  }
                  variant="ghost"
                  size="sm"
                  className={styles.linkMuted}
                >
                  Hide All
                </Button>
              </Flex>
            </Flex>
            {fileTypeOptions.length === 0 ? (
              <LqText variant="xs" color="muted" className={styles.emptyStateText}>
                No file-type facets available.
              </LqText>
            ) : (
              <Box className={styles.fileTypeList}>
                {fileTypeOptions.map((option) => {
                  const isVisible = !localFilters.excludedFileTypes?.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cx(
                        styles.fileTypeRow,
                        isVisible ? styles.fileTypeRowVisible : styles.fileTypeRowHidden,
                      )}
                    >
                      <Flex align="center" gap="sm">
                        <Input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleExcludedTypeToggle(option.value)}
                          className={styles.checkbox}
                        />
                        <LqText
                          variant="xs"
                          color={isVisible ? 'secondary' : 'muted'}
                          className={styles.fileTypeLabel}
                        >
                          {option.label.split(' (')[0]}
                        </LqText>
                      </Flex>
                      <LqText variant="xs" color="muted" className={styles.fileTypeCount}>
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
            <LqText variant="xs" weight="bold" color="muted" className={styles.sectionLabel}>
              Archive Source
            </LqText>
            {sourceOptions.length === 0 ? (
              <LqText variant="xs" color="muted" className={styles.emptyStateText}>
                No source facets available.
              </LqText>
            ) : (
              <NativeSelect
                multiple
                value={localFilters.source || []}
                onChange={(e) =>
                  handleFilterChange(
                    'source',
                    Array.from(e.target.selectedOptions, (opt) => opt.value),
                  )
                }
                className={styles.sourceSelect}
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Box>

          {/* Date range */}
          <Box>
            <LqText variant="xs" weight="bold" color="muted" className={styles.sectionLabel}>
              Temporal Window
            </LqText>
            <Box className={styles.dateStack}>
              <Box className={styles.dateInputWrapper}>
                <Input
                  type="date"
                  value={localFilters.dateRange?.start || ''}
                  onChange={(e) =>
                    handleFilterChange('dateRange', {
                      ...(localFilters.dateRange || {}),
                      start: e.target.value,
                    })
                  }
                  className={styles.dateInput}
                />
                <Box as="span" className={styles.dateInputFloatLabel}>
                  From
                </Box>
              </Box>
              <Box className={styles.dateInputWrapper}>
                <Input
                  type="date"
                  value={localFilters.dateRange?.end || ''}
                  onChange={(e) =>
                    handleFilterChange('dateRange', {
                      ...(localFilters.dateRange || {}),
                      end: e.target.value,
                    })
                  }
                  className={styles.dateInput}
                />
                <Box as="span" className={styles.dateInputFloatLabel}>
                  To
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Reliability & Collections */}
          <Box className={styles.reliabilityStack}>
            <Box>
              <LqText variant="xs" weight="bold" color="muted" className={styles.sectionLabel}>
                Trust & Integrity
              </LqText>
              <Box className={styles.checkboxGroup}>
                <Surface as="label" variant="glass" className={styles.checkboxLabel}>
                  <Input
                    type="checkbox"
                    checked={hideLowCredibility}
                    onChange={(e) => setHideLowCredibility(e.target.checked)}
                    className={styles.checkboxControl}
                  />
                  <LqText variant="xs" color="secondary">
                    Exclude low-reliability items
                  </LqText>
                </Surface>

                <Surface as="label" variant="glass" className={styles.checkboxLabelStart}>
                  <Input
                    type="checkbox"
                    checked={localFilters.includeMedia || false}
                    onChange={(e) => handleFilterChange('includeMedia', e.target.checked)}
                    className={styles.checkboxControlTop}
                  />
                  <Flex direction="column" gap="none">
                    <LqText variant="xs" color="secondary">
                      Include Media Content
                    </LqText>
                    <LqText variant="xs" color="muted" className={styles.mediaSubtext}>
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
                  className={styles.collectionsSectionLabel}
                >
                  Logical Collections
                </LqText>
                <NativeSelect
                  className={styles.collectionsSelect}
                  value={localFilters.collectionId || ''}
                  onChange={(e) => handleFilterChange('collectionId', e.target.value || undefined)}
                >
                  <option value="">All Documents</option>
                  {availableCollections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </NativeSelect>
              </Box>
            )}
          </Box>
        </Box>
      </Surface>
    </Box>
  );
};
