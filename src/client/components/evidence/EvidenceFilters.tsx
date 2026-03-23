import FormField from '../common/FormField';
import Tooltip from '../common/Tooltip';
import Icon from '../common/Icon';
import ProgressBar from '../common/ProgressBar';

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
    <div className="bg-gradient-to-r from-[var(--glass-bg)] to-[var(--glass-bg-strong)] p-6 rounded-[var(--radius-xl)] border border-[var(--glass-border)]">
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Icon name="Search" size="lg" />
        Evidence Search
      </h2>

      {/* Microcopy for Evidence Search */}
      <div className="text-sm text-[var(--text-muted)] mb-4 flex items-start gap-2">
        <Icon name="Info" size="sm" className="mt-0.5 flex-shrink-0" />
        <span>
          Search across all documents, entities, and evidence to find connections and patterns
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mb-6 p-4 bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
          <div className="text-center">
            <div className="text-[var(--accent)] text-sm mb-3" role="status">
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
            <div className="text-xs text-[var(--text-muted)] mt-2">
              Searching subjects and documents...
            </div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <FormField
        label={
          <div className="flex items-center gap-2">
            Search
            <Tooltip content="Search by names, contexts, or evidence">
              <Icon name="Info" size="sm" color="gray" className="cursor-help" />
            </Tooltip>
          </div>
        }
        id="search-query"
      >
        <div className="relative">
          <input
            type="text"
            id="search-query"
            placeholder="Search names, contexts, or evidence..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full pl-10 pr-10 h-10 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 form-input"
            aria-label="Search for evidence by names, contexts, or keywords"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchTermChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-[var(--glass-bg-highlight)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Clear search"
            >
              <Icon name="X" size="sm" />
            </button>
          )}
          <Icon
            name="Search"
            size="sm"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
            color="gray"
            aria-hidden="true"
          />
        </div>
      </FormField>

      {/* Filters - Collapsible on mobile */}
      <div className="md:hidden mb-4">
        <button
          onClick={onShowFiltersToggle}
          className="w-full flex items-center justify-between px-4 py-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)]"
        >
          <span className="flex items-center gap-2">
            <Icon name="Filter" size="sm" />
            Filters
          </span>
          <Icon name={showFilters ? 'ChevronUp' : 'ChevronDown'} size="sm" />
        </button>
      </div>

      {/* Filters Grid - Hidden on mobile unless expanded */}
      <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <FormField
            label={
              <div className="flex items-center gap-2">
                Risk Level
                <Tooltip content="Filter results by subject risk assessment. Risk levels are determined by algorithmic analysis of evidence connections and document mentions.">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
            }
            id="risk-level"
          >
            <div className="relative">
              <select
                id="risk-level"
                value={selectedRiskLevel}
                onChange={(e) => onRiskLevelChange(e.target.value)}
                disabled={loading}
                aria-describedby="risk-level-description"
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 h-10 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 form-select"
              >
                {filterOptions.riskLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <p id="risk-level-description" className="sr-only">
              Filter search results by risk level
            </p>
          </FormField>

          <FormField
            label={
              <div className="flex items-center gap-2">
                Evidence Type
                <Tooltip content="Evidence types categorize the nature of documents and references associated with subjects.">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
            }
            id="evidence-type"
          >
            <select
              id="evidence-type"
              value={selectedEvidenceType}
              onChange={(e) => onEvidenceTypeChange(e.target.value)}
              disabled={loading}
              aria-describedby="evidence-type-description"
              className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 h-10 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 form-select"
            >
              <option value="ALL">All Types</option>
              {allEvidenceTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
            <p id="evidence-type-description" className="sr-only">
              Filter search results by evidence type
            </p>
          </FormField>

          <FormField
            label={
              <div className="flex items-center gap-2">
                Min Red Flag Rating
                <Tooltip content="Set minimum red flag severity threshold. Red Flag Index measures the strength of evidence connections and potential significance of a subject.">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
            }
            id="min-rating"
          >
            <div className="relative">
              <select
                id="min-rating"
                value={minRedFlagRating}
                onChange={(e) => onMinRedFlagRatingChange(Number(e.target.value))}
                disabled={loading}
                aria-describedby="min-rating-description"
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 h-10 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 form-select"
              >
                {filterOptions.redFlagRatings.map((rating) => (
                  <option key={rating.value} value={rating.value}>
                    {rating.label}
                  </option>
                ))}
              </select>
            </div>
            <p id="min-rating-description" className="sr-only">
              Filter search results by minimum red flag rating
            </p>
          </FormField>

          <FormField
            label={
              <div className="flex items-center gap-2">
                Max Red Flag Rating
                <Tooltip content="Set maximum red flag severity threshold. Red Flag Index measures the strength of evidence connections and potential significance of a subject.">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
            }
            id="max-rating"
          >
            <div className="relative">
              <select
                id="max-rating"
                value={maxRedFlagRating}
                onChange={(e) => onMaxRedFlagRatingChange(Number(e.target.value))}
                disabled={loading}
                aria-describedby="max-rating-description"
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 h-10 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 form-select"
              >
                {filterOptions.redFlagRatings.map((rating) => (
                  <option key={rating.value} value={rating.value}>
                    {rating.label}
                  </option>
                ))}
              </select>
            </div>
            <p id="max-rating-description" className="sr-only">
              Filter search results by maximum red flag rating
            </p>
          </FormField>

          <FormField
            label={
              <div className="flex items-center gap-2">
                Sort By
                <Tooltip content="Order results by selected criteria. Sorting affects how results are ordered, with relevance using algorithmic matching.">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
            }
            id="sort-by"
          >
            <div className="relative">
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortBy)}
                disabled={loading}
                aria-describedby="sort-by-description"
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 h-10 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50 form-select"
              >
                {filterOptions.sortByOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p id="sort-by-description" className="sr-only">
              Sort search results by selected criteria
            </p>
          </FormField>

          <FormField
            label={
              <div className="flex items-center gap-2">
                Red Flag Only
                <Tooltip content="Show only results with red flags. Filter to show only subjects with flagged evidence.">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
            }
            id="red-flag-only"
          >
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="red-flag-only"
                checked={showRedFlagOnly}
                onChange={(e) => onShowRedFlagOnlyChange(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-[var(--accent)] bg-[var(--glass-bg)] border-[var(--glass-border)] rounded focus:ring-[var(--accent)] disabled:opacity-50 form-checkbox"
                aria-label="Show only subjects with red flags"
              />
              <Icon name="Flag" size="sm" color="danger" aria-hidden="true" />
            </div>
          </FormField>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-[var(--text-muted)]">{resultCount} results found</div>
        <div className="text-xs text-[var(--text-muted)]">
          Red Flag Range: {minRedFlagRating} - {maxRedFlagRating}
        </div>
      </div>
    </div>
  );
}
