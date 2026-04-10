import React from 'react';
import { Info, Filter, Flag, FileText } from 'lucide-react';
import { Surface, Button, Flex, Box, LqText, Grid, cn, SearchField } from '../../design-system/lib';
import ProgressBar from '../common/ProgressBar';
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
  return (
    <Box className={styles.wrapper}>
      <Flex direction="column" align="stretch" gap="md" className={styles.topBar}>
        <Flex justify="between" align="center" gap="md" className={styles.searchRow}>
          <Flex align="center" gap="md">
            <LqText variant="h2" weight="bold">
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
                <Filter size={14} />
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
                  <FileText size={14} />
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
          </Flex>
        </Flex>
      </Flex>

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
        <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="xl">
          <Box>
            <LqText variant="small" weight="bold" color="muted" style={{ marginBottom: '0.5rem' }}>
              Rating Threshold
            </LqText>
            <Flex align="center" gap="sm">
              <select
                value={minRedFlagRating}
                onChange={(e) => onMinRedFlagRatingChange(Number(e.target.value))}
                className={styles.select}
              >
                {filterOptions.redFlagRatings.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <LqText variant="xs" color="muted">
                to
              </LqText>
              <select
                value={maxRedFlagRating}
                onChange={(e) => onMaxRedFlagRatingChange(Number(e.target.value))}
                className={styles.select}
              >
                {filterOptions.redFlagRatings.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Flex>
          </Box>

          <Box>
            <LqText variant="small" weight="bold" color="muted" style={{ marginBottom: '0.5rem' }}>
              Correlation Order
            </LqText>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              className={styles.select}
            >
              {filterOptions.sortByOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Box>

          <Box>
            <LqText variant="small" weight="bold" color="muted" style={{ marginBottom: '0.5rem' }}>
              Intelligence Focus
            </LqText>
            <Button
              variant={showRedFlagOnly ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onShowRedFlagOnlyChange(!showRedFlagOnly)}
            >
              <Flag size={14} />
              {showRedFlagOnly ? 'Flagged Intelligence Only' : 'Include All Observations'}
            </Button>
          </Box>

          <Flex align="end">
            <Button variant="ghost" size="sm" onClick={onShowFiltersToggle}>
              <Info size={14} />
              Forensic Guidelines
            </Button>
          </Flex>
        </Grid>
      </Surface>
    </Box>
  );
};
