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
import styles from './DocumentBrowserHeader.module.css';

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
      className={`${styles.header} ${isHeaderCondensed ? styles.headerCondensed : styles.headerDefault}`}
    >
      <Flex align="center" justify="between" gap="md" className={styles.titleRow}>
        <Box className={styles.titleBlock}>
          <LqText variant={isHeaderCondensed ? 'h3' : 'h1'} weight="bold">
            Document Browser
          </LqText>
          {!isHeaderCondensed && (
            <LqText variant="xs" color="secondary" className={styles.subtitle}>
              High-signal evidence previews, risk context, and fast navigation at scale
            </LqText>
          )}
        </Box>
        <LqText variant="xs" color="muted" className={styles.countLabel}>
          {isFetching ? 'Updating results: ' : ''}
          Showing {filteredCount} of {totalDocuments.toLocaleString()}
        </LqText>
      </Flex>

      <Box className={styles.controlsGrid}>
        <Box className={styles.searchWrapper}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, document ID, phrase, or source…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`control ${styles.searchInput}`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="document_browser_search"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className={styles.clearBtn}
              title="Clear search"
            >
              <X className={styles.actionIcon} />
            </button>
          )}
        </Box>

        <Flex align="center" gap="sm" className={styles.toolbar}>
          <select
            value={selectedTranche}
            onChange={(e) => applyTrancheFilter(e.target.value)}
            className={`control ${styles.selectControl}`}
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
            className={`control ${styles.selectControl}`}
            aria-label="Sort field"
          >
            <option value="red_flag">Risk</option>
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="size">Size</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className={`control ${styles.btnControl}`}
          >
            {sortOrder === 'desc' ? 'Desc' : 'Asc'}
          </button>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={`control ${styles.selectControl}`}
            aria-label="Results per page"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button
            onClick={() => setDensityMode(densityMode === 'compact' ? 'comfortable' : 'compact')}
            className={`control ${styles.btnControl}`}
            aria-label="Toggle density mode"
          >
            {densityMode === 'compact' ? 'Compact' : 'Comfortable'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className={`control ${styles.btnControlGap}`}
            aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? (
              <LayoutGrid className={styles.actionIcon} />
            ) : (
              <ListIcon className={styles.actionIcon} />
            )}
            <LqText variant="xs" weight="semibold" className={styles.viewToggleLabel}>
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </LqText>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`control ${styles.btnFilterGap}`}
          >
            <Filter className={styles.actionIcon} />
            Filters
            {showFilters ? (
              <ChevronDown className={styles.smallIcon} />
            ) : (
              <ChevronRight className={styles.smallIcon} />
            )}
          </button>
        </Flex>
      </Box>
    </Box>
  );
};
