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
    <Surface variant="glass" className="p-6">
      <Flex align="center" gap={8} className="mb-4">
        <Search className="text-[var(--accent)]" size={24} />
        <LqText variant="h2" weight="bold">
          Evidence Search
        </LqText>
      </Flex>

      <Flex align="start" gap={8} className="mb-6 opacity-70">
        <Info size={16} className="mt-1 flex-shrink-0" />
        <LqText variant="small">
          Search across all documents, entities, and evidence to find connections and patterns.
        </LqText>
      </Flex>

      {loading && (
        <Surface variant="glass" className="mb-6 p-4 border-[var(--accent)]/20">
          <Box className="text-center">
            <LqText color="accent" variant="small" className="mb-3">
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
            <LqText variant="xs" color="muted" className="mt-2 text-center">
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
              <Info size={14} className="text-white/40 cursor-help" />
            </Tooltip>
          </Flex>
        }
        id="search-query"
      >
        <Box className="relative">
          <input
            type="text"
            id="search-query"
            placeholder="Search names, contexts, or evidence..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full pl-10 pr-10 h-10 bg-white/5 border border-white/10 rounded-[var(--radius-lg)] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 transition-all"
            aria-label="Search for evidence by names, contexts, or keywords"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchTermChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
            aria-hidden="true"
          />
        </Box>
      </FormField>

      <Box className="md:hidden mt-4">
        <button
          onClick={onShowFiltersToggle}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-[var(--radius-lg)] text-white"
        >
          <Flex align="center" gap={8}>
            <Filter size={16} />
            <LqText weight="medium">Filters</LqText>
          </Flex>
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </Box>

      <Box className={`${showFilters ? 'block' : 'hidden'} md:block mt-6`}>
        <Grid cols={{ base: 1, md: 2, lg: 3, xl: 6 }} gap={16 as SpaceValue}>
          <FormField
            label={
              <Flex align="center" gap={8}>
                <LqText variant="small" weight="medium">
                  Risk Level
                </LqText>
                <Tooltip content="Filter results by subject risk assessment.">
                  <Info size={14} className="text-white/40 cursor-help" />
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
              className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-lg)] px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 transition-all"
            >
              {filterOptions.riskLevels.map((level) => (
                <option key={level.value} value={level.value} className="bg-[#1a1a1a]">
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
                  <Info size={14} className="text-white/40 cursor-help" />
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
              className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-lg)] px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 transition-all"
            >
              <option value="ALL" className="bg-[#1a1a1a]">
                All Types
              </option>
              {allEvidenceTypes.map((type) => (
                <option key={type} value={type} className="bg-[#1a1a1a]">
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
                  <Info size={14} className="text-white/40 cursor-help" />
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
              className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-lg)] px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 transition-all"
            >
              {filterOptions.redFlagRatings.map((rating) => (
                <option key={rating.value} value={rating.value} className="bg-[#1a1a1a]">
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
                  <Info size={14} className="text-white/40 cursor-help" />
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
              className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-lg)] px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 transition-all"
            >
              {filterOptions.redFlagRatings.map((rating) => (
                <option key={rating.value} value={rating.value} className="bg-[#1a1a1a]">
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
                  <Info size={14} className="text-white/40 cursor-help" />
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
              className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-lg)] px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 transition-all"
            >
              {filterOptions.sortByOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#1a1a1a]">
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
                  <Info size={14} className="text-white/40 cursor-help" />
                </Tooltip>
              </Flex>
            }
            id="red-flag-only"
          >
            <Flex align="center" gap={8} className="h-10">
              <input
                type="checkbox"
                id="red-flag-only"
                checked={showRedFlagOnly}
                onChange={(e) => onShowRedFlagOnlyChange(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)] transition-all cursor-pointer"
              />
              <Flag size={16} className="text-red-500" />
            </Flex>
          </FormField>
        </Grid>
      </Box>

      <Flex justify="between" align="center" className="mt-6 pt-4 border-t border-white/10">
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
