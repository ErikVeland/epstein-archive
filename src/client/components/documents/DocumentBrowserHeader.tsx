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
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';
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
    <Box
      className={`sticky top-0 z-30 transition-all ${
        isHeaderCondensed
          ? 'py-2 mb-3 bg-[var(--glass-bg-strong)]/80 backdrop-blur-md'
          : 'py-3 mb-4'
      }`}
    >
      <Flex align="center" justify="between" gap="md" className="mb-2">
        <Box className="min-w-0">
          <LqText variant={isHeaderCondensed ? 'h3' : 'h1'} weight="bold" className="leading-tight">
            Document Browser
          </LqText>
          {!isHeaderCondensed && (
            <LqText variant="xs" color="secondary" className="mt-1">
              High-signal evidence previews, risk context, and fast navigation at scale
            </LqText>
          )}
        </Box>
        <LqText variant="xs" color="muted" className="shrink-0">
          {isFetching ? 'Updating results: ' : ''}
          Showing {filteredCount} of {totalDocuments.toLocaleString()}
        </LqText>
      </Flex>

      <Box className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-2 xl:items-center">
        <Box className="relative flex-1">
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
        </Box>

        <Flex align="center" gap="sm" className="flex-wrap xl:justify-end">
          <select
            value={selectedTranche}
            onChange={(e) => applyTrancheFilter(e.target.value)}
            className="control h-11 px-3 text-sm leading-none bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-md)]"
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
            className="control h-11 px-3 text-sm leading-none bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-md)]"
            aria-label="Sort field"
          >
            <option value="red_flag">Risk</option>
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="size">Size</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="control h-11 px-3 text-sm inline-flex items-center justify-center"
          >
            {sortOrder === 'desc' ? 'Desc' : 'Asc'}
          </button>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="control h-11 px-3 text-sm leading-none bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-md)]"
            aria-label="Results per page"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button
            onClick={() => setDensityMode(densityMode === 'compact' ? 'comfortable' : 'compact')}
            className="control h-11 px-3 text-sm inline-flex items-center justify-center"
            aria-label="Toggle density mode"
          >
            {densityMode === 'compact' ? 'Compact' : 'Comfortable'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="control h-11 px-3 inline-flex items-center gap-2 text-sm"
            aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <ListIcon className="w-4 h-4" />
            )}
            <LqText variant="xs" weight="semibold" className="uppercase tracking-wider">
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </LqText>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="control h-11 px-3 text-sm inline-flex items-center gap-1.5"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </Flex>
      </Box>
    </Box>
  );
};
