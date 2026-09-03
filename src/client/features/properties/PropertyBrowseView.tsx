import React from 'react';
import Icon from '@client/components/common/Icon';
import { Button, Input, Pagination, SearchField, Select } from '@client/design-system/lib';
import { PropertyCard } from './PropertyCard';
import type { Property, PropertyStats } from './types';
import styles from './PropertyBrowseView.module.css';

type ViewMode = 'browse' | 'associates' | 'analytics';

interface PropertyBrowseViewProps {
  properties: Property[];
  loading: boolean;
  propertyTypes: PropertyStats['propertyTypes'];
  searchTerm: string;
  propertyType: string;
  minValue: string;
  showAssociatesOnly: boolean;
  sortBy: string;
  page: number;
  totalPages: number;
  viewMode: ViewMode;
  onSearchChange: (value: string) => void;
  onPropertyTypeChange: (value: string) => void;
  onMinValueChange: (value: string) => void;
  onShowAssociatesOnlyChange: (value: boolean) => void;
  onSortByChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectProperty: (property: Property) => void;
}

export function PropertyBrowseView({
  properties,
  loading,
  propertyTypes,
  searchTerm,
  propertyType,
  minValue,
  showAssociatesOnly,
  sortBy,
  page,
  totalPages,
  viewMode,
  onSearchChange,
  onPropertyTypeChange,
  onMinValueChange,
  onShowAssociatesOnlyChange,
  onSortByChange,
  onPageChange,
  onViewModeChange,
  onSelectProperty,
}: PropertyBrowseViewProps): React.ReactElement {
  return (
    <div className={styles.browser}>
      {/* Filters Bar */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <div className={styles.searchWrapper}>
            <SearchField
              value={searchTerm}
              aria-label="Search properties, owners, or addresses"
              placeholder="Search properties, owners, addresses..."
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
              rootClassName={styles.searchFieldRoot}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterControls}>
            <Select
              rootClassName={styles.propertyTypeSelect}
              value={propertyType}
              onChange={(e) => {
                onPropertyTypeChange(e.target.value);
                onPageChange(1);
              }}
              options={[
                { value: '', label: 'All Property Types' },
                ...propertyTypes.map((t) => ({ value: t.type, label: t.type })),
              ]}
            />

            <Select
              rootClassName={styles.minValueSelect}
              value={minValue}
              onChange={(e) => {
                onMinValueChange(e.target.value);
                onPageChange(1);
              }}
              options={[
                { value: '', label: 'Min Value: Any' },
                { value: '1000000', label: '$1M+' },
                { value: '5000000', label: '$5M+' },
                { value: '10000000', label: '$10M+' },
                { value: '50000000', label: '$50M+' },
              ]}
            />

            <Select
              rootClassName={styles.sortSelect}
              aria-label="Sort property listings"
              value={sortBy}
              onChange={(event) => {
                onSortByChange(event.target.value);
                onPageChange(1);
              }}
              options={[
                { value: 'relevance', label: 'Investigation relevance' },
                { value: 'value', label: 'Assessed value' },
                { value: 'owner', label: 'Owner name' },
                { value: 'year', label: 'Year built' },
              ]}
            />

            <div className={styles.checkboxWrapper}>
              <label className={styles.checkboxLabel}>
                <Input
                  type="checkbox"
                  checked={showAssociatesOnly}
                  onChange={(e) => {
                    onShowAssociatesOnlyChange(e.target.checked);
                    onPageChange(1);
                  }}
                  className={styles.checkbox}
                />
                Entity-linked owners only
              </label>
            </div>

            {/* View Toggle */}
            <div className={styles.viewToggle}>
              <Button
                onClick={() => onViewModeChange('browse')}
                variant={viewMode === 'browse' ? 'primary' : 'ghost'}
                size="sm"
                className={styles.viewToggleButton}
                title="Property listings"
              >
                <Icon name="List" size="sm" />
              </Button>
              <Button
                onClick={() => onViewModeChange('associates')}
                variant={viewMode === 'associates' ? 'primary' : 'ghost'}
                size="sm"
                className={styles.viewToggleButton}
                title="Known Associates"
              >
                <Icon name="Users" size="sm" />
              </Button>
              <Button
                onClick={() => onViewModeChange('analytics')}
                variant={viewMode === 'analytics' ? 'primary' : 'ghost'}
                size="sm"
                className={styles.viewToggleButton}
                title="Analytics"
              >
                <Icon name="BarChart3" size="sm" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Property List */}
      <div className={styles.listSection}>
        {loading ? (
          <div className={styles.loadingState}>
            <Icon name="Loader2" className={styles.spin} size="sm" /> Loading properties...
          </div>
        ) : (
          <>
            <div className={styles.resultsHeader}>
              <div>
                <span className={styles.resultsEyebrow}>Property catalogue</span>
                <h2 className={styles.resultsTitle}>Public records, presented as listings</h2>
              </div>
              <p className={styles.resultsNote}>
                Values are assessments, not asking prices. Photos appear only when the archive has a
                verified property match.
              </p>
            </div>
            <div className={styles.propertyGrid}>
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} onSelect={onSelectProperty} />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              className={styles.pagination}
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
