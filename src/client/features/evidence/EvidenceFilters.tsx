import React, { useState } from 'react';
import Icon from '@client/components/common/Icon';
import {
  Surface,
  Button,
  Flex,
  Box,
  LqText,
  Grid,
  cn,
  SearchField,
  Select,
  Stack,
} from '@client/design-system/lib';
import ProgressBar from '@client/components/common/ProgressBar';
import { MobileEvidenceFilterSheet } from './MobileEvidenceFilterSheet';
import styles from './EvidenceFilters.module.css';

type SortBy = 'relevance' | 'mentions' | 'redflag_asc' | 'redflag_desc' | 'name';

interface FilterOptions {
  riskLevels: { value: string; label: string }[];
  redFlagRatings: { value: number; label: string }[];
  sortByOptions: { value: string; label: string }[];
}

interface EvidenceFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedRiskLevel: string;
  onRiskLevelChange: (value: string) => void;
  selectedEvidenceType: string;
  onEvidenceTypeChange: (value: string) => void;
  minRedFlagRating: number;
  onMinRedFlagRatingChange: (value: number) => void;
  maxRedFlagRating: number;
  onMaxRedFlagRatingChange: (value: number) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  showRedFlagOnly: boolean;
  onShowRedFlagOnlyChange: (value: boolean) => void;
  showFilters: boolean;
  onShowFiltersToggle: () => void;
  loading: boolean;
  loadingProgress: string;
  loadingProgressValue: number;
  allEvidenceTypes: string[];
  filterOptions: FilterOptions;
  resultCount: number;
}

export const EvidenceFilters: React.FC<EvidenceFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  selectedRiskLevel,
  onRiskLevelChange,
  selectedEvidenceType,
  onEvidenceTypeChange,
  minRedFlagRating,
  onMinRedFlagRatingChange,
  maxRedFlagRating,
  onMaxRedFlagRatingChange,
  sortBy,
  onSortByChange,
  showRedFlagOnly,
  onShowRedFlagOnlyChange,
  showFilters: _showFilters,
  onShowFiltersToggle,
  loading,
  loadingProgress,
  loadingProgressValue,
  allEvidenceTypes,
  filterOptions,
  resultCount,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Count active non-default advanced filters for the badge
  const activeAdvancedCount =
    (minRedFlagRating !== 0 ? 1 : 0) +
    (maxRedFlagRating !== 5 ? 1 : 0) +
    (sortBy !== 'relevance' ? 1 : 0) +
    (showRedFlagOnly ? 1 : 0);

  const handleReset = () => {
    onMinRedFlagRatingChange(0);
    onMaxRedFlagRatingChange(5);
    onSortByChange('relevance');
    onShowRedFlagOnlyChange(false);
  };

  return (
    <Box className={styles.wrapper}>
      <Flex direction="column" align="stretch" gap="md" className={styles.topBar}>
        <Flex justify="between" align="center" gap="lg" className={styles.searchRow}>
          <Flex align="center" gap="md" className={styles.titleWrapper}>
            <LqText variant="h2" weight="bold" className={styles.title}>
              Evidence Search
            </LqText>
            <Surface variant="glass-highlight" className={styles.resultBadge}>
              <LqText variant="xs" weight="bold" color="accent">
                {resultCount} SIGNALS DETECTED
              </LqText>
            </Surface>
          </Flex>

          <SearchField
            placeholder="Query forensic archive..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            rootClassName={styles.searchField}
            density="compact"
          />
        </Flex>

        <Flex justify="between" align="center" className={styles.stripRow}>
          <Box className={styles.categoryScroll}>
            <Flex align="center" gap="xs" className={styles.categoryStrip}>
              <Button
                variant={selectedEvidenceType === 'ALL' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onEvidenceTypeChange('ALL')}
                className={styles.stripBtn}
              >
                <Icon name="Filter" size="sm" />
                All Evidence
              </Button>
              {allEvidenceTypes.slice(0, 6).map((type) => (
                <Button
                  key={type}
                  variant={selectedEvidenceType === type ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => onEvidenceTypeChange(type)}
                  className={styles.stripBtn}
                >
                  <Icon name="FileText" size="sm" />
                  {type.replace('_', ' ')}
                </Button>
              ))}
            </Flex>
          </Box>

          <Flex align="center" gap="sm" className={styles.riskStrip}>
            {filterOptions.riskLevels.map((level) => (
              <Button
                key={level.value}
                variant={selectedRiskLevel === level.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onRiskLevelChange(level.value)}
                className={styles.riskTab}
              >
                <Box
                  className={cn(
                    styles.riskDot,
                    level.value === 'HIGH'
                      ? styles.riskDotHigh
                      : level.value === 'MEDIUM'
                        ? styles.riskDotMed
                        : level.value === 'LOW'
                          ? styles.riskDotLow
                          : styles.riskDotAll,
                  )}
                />
                <LqText variant="xs" weight="medium">
                  {level.label}
                </LqText>
              </Button>
            ))}
            <Button
              variant={activeAdvancedCount > 0 ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSheetOpen(true)}
              className={cn(styles.riskTab, styles.filtersTrigger)}
              aria-label="Open advanced filters"
            >
              <Icon name="SlidersHorizontal" size="sm" />
              {activeAdvancedCount > 0 && (
                <Box className={styles.filtersBadge}>{activeAdvancedCount}</Box>
              )}
            </Button>
          </Flex>
        </Flex>
      </Flex>

      <MobileEvidenceFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        minRedFlagRating={minRedFlagRating}
        onMinRedFlagRatingChange={onMinRedFlagRatingChange}
        maxRedFlagRating={maxRedFlagRating}
        onMaxRedFlagRatingChange={onMaxRedFlagRatingChange}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
        showRedFlagOnly={showRedFlagOnly}
        onShowRedFlagOnlyChange={onShowRedFlagOnlyChange}
        filterOptions={filterOptions}
        onReset={handleReset}
      />

      {loading && (
        <Surface variant="glass" className={styles.loadingPanel} p="md">
          <Flex direction="column" gap="sm">
            <Flex justify="between" align="center">
              <LqText variant="xs" weight="bold" color="accent">
                {loadingProgress}
              </LqText>
              <LqText variant="xs" color="muted">
                {loadingProgressValue}%
              </LqText>
            </Flex>
            <ProgressBar value={loadingProgressValue} max={100} size="sm" color="primary" />
          </Flex>
        </Surface>
      )}

      <Surface variant="glass" className={styles.detailsPanel}>
        <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="xl" align="end">
          <Stack gap="xs">
            <LqText variant="small" weight="bold" color="muted">
              Rating Threshold
            </LqText>
            <Flex align="center" gap="sm">
              <Select
                size="sm"
                value={minRedFlagRating}
                onChange={(e) => onMinRedFlagRatingChange(Number(e.target.value))}
                options={filterOptions.redFlagRatings.map((r) => ({
                  value: r.value,
                  label: r.label,
                }))}
              />
              <LqText variant="xs" color="muted" className={styles.separatorText}>
                to
              </LqText>
              <Select
                size="sm"
                value={maxRedFlagRating}
                onChange={(e) => onMaxRedFlagRatingChange(Number(e.target.value))}
                options={filterOptions.redFlagRatings.map((r) => ({
                  value: r.value,
                  label: r.label,
                }))}
              />
            </Flex>
          </Stack>

          <Stack gap="xs">
            <LqText variant="small" weight="bold" color="muted">
              Correlation Order
            </LqText>
            <Select
              size="sm"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              options={filterOptions.sortByOptions}
            />
          </Stack>

          <Stack gap="xs">
            <LqText variant="small" weight="bold" color="muted">
              Intelligence Focus
            </LqText>
            <Button
              variant={showRedFlagOnly ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onShowRedFlagOnlyChange(!showRedFlagOnly)}
              className={styles.fullWidthBtn}
            >
              <Icon name="Flag" size="sm" />
              {showRedFlagOnly ? 'Flagged Intelligence Only' : 'Include All Observations'}
            </Button>
          </Stack>

          <Flex justify="end">
            <Button variant="ghost" size="sm" onClick={onShowFiltersToggle}>
              <Icon name="Info" size="sm" />
              Forensic Guidelines
            </Button>
          </Flex>
        </Grid>
      </Surface>
    </Box>
  );
};
