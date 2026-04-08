import { Search, Info, Filter, ChevronUp, ChevronDown, Flag, X } from 'lucide-react';
import FormField from '../common/FormField';
import Tooltip from '../common/Tooltip';
import ProgressBar from '../common/ProgressBar';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { Grid } from '../../design-system/components/layout/Grid';
import { LqText } from '../../design-system/components/typography/Text';
import type { SpaceValue } from '../../design-system/lib/resolveSpace';
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

export function EvidenceFilters({
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
  showFilters,
  onShowFiltersToggle,
  loading,
  loadingProgress,
  loadingProgressValue,
  allEvidenceTypes,
  filterOptions,
  resultCount,
}: EvidenceFiltersProps) {
  return (
    <Surface variant="glass" className={styles.container}>
      <Flex align="center" gap={8} className={styles.searchHeader}>
        <Search className="text-[var(--accent)]" size={24} />
        <LqText variant="h2" weight="bold">
          Evidence Search
        </LqText>
      </Flex>

      <Flex align="start" gap={8} className={styles.infoRow}>
        <Info size={16} className={styles.infoIcon} />
        <LqText variant="small">
          Search across all documents, entities, and evidence to find connections and patterns.
        </LqText>
      </Flex>

      {loading && (
        <Surface variant="glass" className={styles.loadingPanel}>
          <Box className={styles.loadingInner}>
            <LqText color="accent" variant="small" className={styles.loadingLabel}>
              {loadingProgress}
            </LqText>
            <ProgressBar
              value={loadingProgressValue}
              max={100}
              showPercentage={true}
              color="primary"
              size="md"
              label="Search progress"
            />
            <LqText variant="xs" color="muted" className={styles.loadingSubLabel}>
              Searching subjects and documents...
            </LqText>
          </Box>
        </Surface>
      )}

      <FormField
        label={
          <Flex align="center" gap={8}>
            <LqText variant="small" weight="medium">
              Search
            </LqText>
            <Tooltip content="Search by names, contexts, or evidence">
              <Info size={14} className={styles.tooltipIcon} />
            </Tooltip>
          </Flex>
        }
        id="search-query"
      >
        <Box className={styles.searchInputWrapper}>
          <input
            type="text"
            id="search-query"
            placeholder="Search names, contexts, or evidence..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className={styles.searchInput}
            aria-label="Search for evidence by names, contexts, or keywords"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchTermChange('')}
              className={styles.clearBtn}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <Search size={18} className={styles.searchIconLeft} aria-hidden="true" />
        </Box>
      </FormField>

      <Box className={styles.mobileFilterToggle}>
        <button onClick={onShowFiltersToggle} className={styles.mobileFilterBtn}>
          <Flex align="center" gap={8}>
            <Filter size={16} />
            <LqText weight="medium">Filters</LqText>
          </Flex>
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </Box>

      <Box className={showFilters ? styles.filtersGrid : styles.filtersGridHidden}>
        <Grid cols={{ base: 1, md: 2, lg: 3, xl: 6 }} gap={16 as SpaceValue}>
          <FormField
            label={
              <Flex align="center" gap={8}>
                <LqText variant="small" weight="medium">
                  Risk Level
                </LqText>
                <Tooltip content="Filter results by subject risk assessment.">
                  <Info size={14} className={styles.tooltipIcon} />
                </Tooltip>
              </Flex>
            }
            id="risk-level"
          >
            <select
              id="risk-level"
              value={selectedRiskLevel}
              onChange={(e) => onRiskLevelChange(e.target.value)}
              disabled={loading}
              className={styles.select}
            >
              {filterOptions.riskLevels.map((level) => (
                <option key={level.value} value={level.value} className={styles.selectOption}>
                  {level.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              <Flex align="center" gap={8}>
                <LqText variant="small" weight="medium">
                  Evidence Type
                </LqText>
                <Tooltip content="Evidence types categorize the nature of documents.">
                  <Info size={14} className={styles.tooltipIcon} />
                </Tooltip>
              </Flex>
            }
            id="evidence-type"
          >
            <select
              id="evidence-type"
              value={selectedEvidenceType}
              onChange={(e) => onEvidenceTypeChange(e.target.value)}
              disabled={loading}
              className={styles.select}
            >
              <option value="ALL" className={styles.selectOption}>
                All Types
              </option>
              {allEvidenceTypes.map((type) => (
                <option key={type} value={type} className={styles.selectOption}>
                  {type.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              <Flex align="center" gap={8}>
                <LqText variant="small" weight="medium">
                  Min Red Flag
                </LqText>
                <Tooltip content="Set minimum severity threshold.">
                  <Info size={14} className={styles.tooltipIcon} />
                </Tooltip>
              </Flex>
            }
            id="min-rating"
          >
            <select
              id="min-rating"
              value={minRedFlagRating}
              onChange={(e) => onMinRedFlagRatingChange(Number(e.target.value))}
              disabled={loading}
              className={styles.select}
            >
              {filterOptions.redFlagRatings.map((rating) => (
                <option key={rating.value} value={rating.value} className={styles.selectOption}>
                  {rating.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              <Flex align="center" gap={8}>
                <LqText variant="small" weight="medium">
                  Max Red Flag
                </LqText>
                <Tooltip content="Set maximum severity threshold.">
                  <Info size={14} className={styles.tooltipIcon} />
                </Tooltip>
              </Flex>
            }
            id="max-rating"
          >
            <select
              id="max-rating"
              value={maxRedFlagRating}
              onChange={(e) => onMaxRedFlagRatingChange(Number(e.target.value))}
              disabled={loading}
              className={styles.select}
            >
              {filterOptions.redFlagRatings.map((rating) => (
                <option key={rating.value} value={rating.value} className={styles.selectOption}>
                  {rating.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              <Flex align="center" gap={8}>
                <LqText variant="small" weight="medium">
                  Sort By
                </LqText>
                <Tooltip content="Order results by selected criteria.">
                  <Info size={14} className={styles.tooltipIcon} />
                </Tooltip>
              </Flex>
            }
            id="sort-by"
          >
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              disabled={loading}
              className={styles.select}
            >
              {filterOptions.sortByOptions.map((option) => (
                <option key={option.value} value={option.value} className={styles.selectOption}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              <Flex align="center" gap={8}>
                <LqText variant="small" weight="medium">
                  Red Flag Only
                </LqText>
                <Tooltip content="Show only flagged results.">
                  <Info size={14} className={styles.tooltipIcon} />
                </Tooltip>
              </Flex>
            }
            id="red-flag-only"
          >
            <Flex align="center" gap={8} className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="red-flag-only"
                checked={showRedFlagOnly}
                onChange={(e) => onShowRedFlagOnlyChange(e.target.checked)}
                disabled={loading}
                className={styles.checkbox}
              />
              <Flag size={16} className={styles.flagIcon} />
            </Flex>
          </FormField>
        </Grid>
      </Box>

      <Flex justify="between" align="center" className={styles.footer}>
        <LqText variant="xs" color="muted">
          {resultCount} results found
        </LqText>
        <LqText variant="xs" color="muted">
          Range: {minRedFlagRating} - {maxRedFlagRating}
        </LqText>
      </Flex>
    </Surface>
  );
}
