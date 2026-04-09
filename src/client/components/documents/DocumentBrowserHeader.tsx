import React from 'react';
import { X, LayoutGrid, List as ListIcon, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { Box, Button, Flex, LqText, SearchField, Select } from '../../design-system/lib';
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
          <SearchField
            placeholder="Search by name, document ID, phrase, or source…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchInput}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="document_browser_search"
            aria-label="Search documents"
          />
          {searchInput && (
            <Button
              type="button"
              onClick={() => setSearchInput('')}
              variant="ghost"
              size="sm"
              className={styles.clearBtn}
              title="Clear search"
            >
              <X className={styles.actionIcon} />
            </Button>
          )}
        </Box>

        <Flex align="center" gap="sm" className={styles.toolbar}>
          <Select
            value={selectedTranche}
            onChange={(e) => applyTrancheFilter(e.target.value)}
            className={styles.selectControl}
            aria-label="Filter by tranche"
            options={DOJ_TRANCHE_OPTIONS}
          />
          <Select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'relevance' | 'date' | 'red_flag' | 'fileType' | 'size')
            }
            className={styles.selectControl}
            aria-label="Sort field"
            options={[
              { value: 'red_flag', label: 'Risk' },
              { value: 'date', label: 'Date' },
              { value: 'title', label: 'Title' },
              { value: 'size', label: 'Size' },
            ]}
          />
          <Button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className={styles.btnControl}
            variant="secondary"
            size="sm"
          >
            {sortOrder === 'desc' ? 'Desc' : 'Asc'}
          </Button>
          <Select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={styles.selectControl}
            aria-label="Results per page"
            options={[
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
            ]}
          />
          <Button
            type="button"
            onClick={() => setDensityMode(densityMode === 'compact' ? 'comfortable' : 'compact')}
            className={styles.btnControl}
            variant="secondary"
            size="sm"
            aria-label="Toggle density mode"
          >
            {densityMode === 'compact' ? 'Compact' : 'Comfortable'}
          </Button>
          <Button
            type="button"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className={styles.btnControlGap}
            variant="secondary"
            size="sm"
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
          </Button>
          <Button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={styles.btnFilterGap}
            variant="secondary"
            size="sm"
          >
            <Filter className={styles.actionIcon} />
            Filters
            {showFilters ? (
              <ChevronDown className={styles.smallIcon} />
            ) : (
              <ChevronRight className={styles.smallIcon} />
            )}
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};
