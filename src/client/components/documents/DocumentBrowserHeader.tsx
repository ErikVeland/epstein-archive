import React from 'react';
import {
  Search,
  X,
  LayoutGrid,
  List as ListIcon,
  Filter,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { DOJ_TRANCHE_OPTIONS } from './documentTrancheOptions';

interface DocumentBrowserHeaderProps {
  isHeaderCondensed: boolean;
  searchInput: string;
  setSearchInput: (value: string) => void;
  selectedTranche: string;
  applyTrancheFilter: (value: string) => void;
  sortBy: string;
  setSortBy: (value: 'relevance' | 'date' | 'red_flag' | 'fileType' | 'size') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
  setCurrentPage: (value: number) => void;
  densityMode: 'compact' | 'comfortable';
  setDensityMode: (value: 'compact' | 'comfortable') => void;
  viewMode: 'grid' | 'list';
  setViewMode: (value: 'grid' | 'list') => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  isFetching: boolean;
  filteredCount: number;
  totalDocuments: number;
}

export const DocumentBrowserHeader: React.FC<DocumentBrowserHeaderProps> = ({
  isHeaderCondensed,
  searchInput,
  setSearchInput,
  selectedTranche,
  applyTrancheFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  densityMode,
  setDensityMode,
  viewMode,
  setViewMode,
  showFilters,
  setShowFilters,
  isFetching,
  filteredCount,
  totalDocuments,
}) => {
  return (
    <div
      className={`sticky top-0 z-30 transition-all ${
        isHeaderCondensed ? 'py-2 mb-3' : 'py-3 mb-4'
      }`}
    >
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1
            className={`font-bold text-[var(--text-primary)] ${isHeaderCondensed ? 'text-lg' : 'text-2xl'}`}
          >
            Document Browser
          </h1>
          {!isHeaderCondensed && (
            <p className="text-sm text-[var(--text-secondary)]">
              High-signal evidence previews, risk context, and fast navigation at scale
            </p>
          )}
        </div>
        <div className="text-xs text-[var(--text-muted)] sm:shrink-0">
          {isFetching ? 'Updating results: ' : ''}
          Showing {filteredCount} of {totalDocuments.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-2 xl:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, document ID, phrase, or source…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="control w-full h-11 pl-10 pr-10 text-sm bg-[var(--glass-bg-strong)] border-[var(--glass-border)] focus:outline-none focus:border-[var(--accent)]"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="document_browser_search"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--glass-bg-highlight)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="control-scroll-row-mobile xl:flex xl:flex-wrap xl:items-center xl:justify-end xl:overflow-visible xl:pb-0">
          <select
            value={selectedTranche}
            onChange={(e) => applyTrancheFilter(e.target.value)}
            className="control h-11 min-w-[9.5rem] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-md)] text-sm leading-none"
            aria-label="Filter by tranche"
            title="Filter documents by tranche/source collection"
          >
            {DOJ_TRANCHE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'relevance' | 'date' | 'red_flag' | 'fileType' | 'size')
            }
            className="control h-11 min-w-[7rem] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-md)] text-sm leading-none"
            aria-label="Sort field"
          >
            <option value="red_flag">Risk</option>
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="size">Size</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="control h-11 min-w-[5.5rem] text-sm"
          >
            {sortOrder === 'desc' ? 'Desc' : 'Asc'}
          </button>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="control h-11 min-w-[5.5rem] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-md)] text-sm leading-none"
            aria-label="Results per page"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button
            onClick={() => setDensityMode(densityMode === 'compact' ? 'comfortable' : 'compact')}
            className="control h-11 min-w-[9rem] text-sm"
            aria-label="Toggle density mode"
          >
            {densityMode === 'compact' ? 'Compact' : 'Comfortable'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="control h-11 min-w-[7rem] text-sm"
            aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <ListIcon className="w-4 h-4" />
            )}
            <span className="text-xs uppercase tracking-wider font-semibold">
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="control h-11 min-w-[7.5rem] text-sm"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
