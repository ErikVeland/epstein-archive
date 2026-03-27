import FormField from '../common/FormField';
import Tooltip from '../common/Tooltip';
import Icon from '../common/Icon';
import ProgressBar from '../common/ProgressBar';
import { Select } from '../common/Select';
import { FilterBar, StatusBanner } from '@design-system';

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

const filterFieldLabelClass = 'flex items-center gap-2';
const fieldContainerClass = 'min-w-0';
const sharedInfoIcon = <Icon name="Info" size="sm" color="gray" className="cursor-help" />;

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
  const riskLevelOptions = filterOptions.riskLevels.map((level) => ({
    value: level.value,
    label: level.label,
  }));

  const evidenceTypeOptions = [
    { value: 'ALL', label: 'All Types' },
    ...allEvidenceTypes.map((type) => ({
      value: type,
      label: type.replace('_', ' ').toUpperCase(),
    })),
  ];

  const ratingOptions = filterOptions.redFlagRatings.map((rating) => ({
    value: rating.value,
    label: rating.label,
  }));

  const sortOptions = filterOptions.sortByOptions.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  return (
    <FilterBar>
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
        <Icon name="Search" size="lg" />
        Evidence Search
      </h2>

      <div className="mb-4 flex items-start gap-2 text-sm text-[var(--text-muted)]">
        <Icon name="Info" size="sm" className="mt-0.5 shrink-0" />
        <span>
          Search across all documents, entities, and evidence to find connections and patterns
        </span>
      </div>

      {loading && (
        <StatusBanner tone="info" className="mb-6">
          <div className="w-full text-center">
            <div className="mb-3 text-sm text-[var(--accent)]" role="status">
              {loadingProgress}
            </div>
            <ProgressBar
              value={loadingProgressValue}
              max={100}
              showPercentage={true}
              color="primary"
              size="md"
              label="Search progress"
            />
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Searching subjects and documents...
            </div>
          </div>
        </StatusBanner>
      )}

      <FormField
        label={
          <div className={filterFieldLabelClass}>
            Search
            <Tooltip content="Search by names, contexts, or evidence">{sharedInfoIcon}</Tooltip>
          </div>
        }
        id="search-query"
        className={fieldContainerClass}
      >
        <div className="relative">
          <input
            type="text"
            id="search-query"
            placeholder="Search names, contexts, or evidence..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="control w-full justify-start pl-10 pr-10 text-left disabled:opacity-50"
            aria-label="Search for evidence by names, contexts, or keywords"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchTermChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)]"
              title="Clear search"
            >
              <Icon name="X" size="sm" />
            </button>
          )}
          <Icon
            name="Search"
            size="sm"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            color="gray"
            aria-hidden="true"
          />
        </div>
      </FormField>

      <div className="mb-4 md:hidden">
        <button
          onClick={onShowFiltersToggle}
          className="control control-mobile-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Icon name="Filter" size="sm" />
            Filters
          </span>
          <Icon name={showFilters ? 'ChevronUp' : 'ChevronDown'} size="sm" />
        </button>
      </div>

      <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <FormField
            label={
              <div className={filterFieldLabelClass}>
                Risk Level
                <Tooltip content="Filter results by subject risk assessment. Risk levels are determined by algorithmic analysis of evidence connections and document mentions.">
                  {sharedInfoIcon}
                </Tooltip>
              </div>
            }
            id="risk-level"
            className={fieldContainerClass}
          >
            <Select
              id="risk-level"
              value={selectedRiskLevel}
              onChange={(e) => onRiskLevelChange(e.target.value)}
              disabled={loading}
              aria-describedby="risk-level-description"
              options={riskLevelOptions}
            />
            <p id="risk-level-description" className="sr-only">
              Filter search results by risk level
            </p>
          </FormField>

          <FormField
            label={
              <div className={filterFieldLabelClass}>
                Evidence Type
                <Tooltip content="Evidence types categorize the nature of documents and references associated with subjects.">
                  {sharedInfoIcon}
                </Tooltip>
              </div>
            }
            id="evidence-type"
            className={fieldContainerClass}
          >
            <Select
              id="evidence-type"
              value={selectedEvidenceType}
              onChange={(e) => onEvidenceTypeChange(e.target.value)}
              disabled={loading}
              aria-describedby="evidence-type-description"
              options={evidenceTypeOptions}
            />
            <p id="evidence-type-description" className="sr-only">
              Filter search results by evidence type
            </p>
          </FormField>

          <FormField
            label={
              <div className={filterFieldLabelClass}>
                Min Red Flag Rating
                <Tooltip content="Set minimum red flag severity threshold. Red Flag Index measures the strength of evidence connections and potential significance of a subject.">
                  {sharedInfoIcon}
                </Tooltip>
              </div>
            }
            id="min-rating"
            className={fieldContainerClass}
          >
            <Select
              id="min-rating"
              value={minRedFlagRating}
              onChange={(e) => onMinRedFlagRatingChange(Number(e.target.value))}
              disabled={loading}
              aria-describedby="min-rating-description"
              options={ratingOptions}
            />
            <p id="min-rating-description" className="sr-only">
              Filter search results by minimum red flag rating
            </p>
          </FormField>

          <FormField
            label={
              <div className={filterFieldLabelClass}>
                Max Red Flag Rating
                <Tooltip content="Set maximum red flag severity threshold. Red Flag Index measures the strength of evidence connections and potential significance of a subject.">
                  {sharedInfoIcon}
                </Tooltip>
              </div>
            }
            id="max-rating"
            className={fieldContainerClass}
          >
            <Select
              id="max-rating"
              value={maxRedFlagRating}
              onChange={(e) => onMaxRedFlagRatingChange(Number(e.target.value))}
              disabled={loading}
              aria-describedby="max-rating-description"
              options={ratingOptions}
            />
            <p id="max-rating-description" className="sr-only">
              Filter search results by maximum red flag rating
            </p>
          </FormField>

          <FormField
            label={
              <div className={filterFieldLabelClass}>
                Sort By
                <Tooltip content="Order results by selected criteria. Sorting affects how results are ordered, with relevance using algorithmic matching.">
                  {sharedInfoIcon}
                </Tooltip>
              </div>
            }
            id="sort-by"
            className={fieldContainerClass}
          >
            <Select
              id="sort-by"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              disabled={loading}
              aria-describedby="sort-by-description"
              options={sortOptions}
            />
            <p id="sort-by-description" className="sr-only">
              Sort search results by selected criteria
            </p>
          </FormField>

          <FormField
            label={
              <div className={filterFieldLabelClass}>
                Red Flag Only
                <Tooltip content="Show only results with red flags. Filter to show only subjects with flagged evidence.">
                  {sharedInfoIcon}
                </Tooltip>
              </div>
            }
            id="red-flag-only"
            className={fieldContainerClass}
          >
            <label htmlFor="red-flag-only" className="control w-full justify-between px-4">
              <span className="flex items-center gap-2">
                <span className="status-chip tone-danger">Flagged only</span>
                <Icon name="Flag" size="sm" color="danger" aria-hidden="true" />
              </span>
              <input
                type="checkbox"
                id="red-flag-only"
                checked={showRedFlagOnly}
                onChange={(e) => onShowRedFlagOnlyChange(e.target.checked)}
                disabled={loading}
                className="form-checkbox h-4 w-4 rounded border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--accent)] focus:ring-[var(--accent)] disabled:opacity-50"
                aria-label="Show only subjects with red flags"
              />
            </label>
          </FormField>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <div className="status-chip tone-info w-fit">{resultCount} results found</div>
        <div className="text-xs text-[var(--text-muted)]">
          Red Flag Range: {minRedFlagRating} - {maxRedFlagRating}
        </div>
      </div>
    </FilterBar>
  );
}
