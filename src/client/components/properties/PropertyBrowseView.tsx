import React from 'react';
import Icon from '../common/Icon';
import { Select } from '../common/Select';
import { GlassButton } from '../ui/GlassButton';
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
  page: number;
  totalPages: number;
  viewMode: ViewMode;
  onSearchChange: (value: string) => void;
  onPropertyTypeChange: (value: string) => void;
  onMinValueChange: (value: string) => void;
  onShowAssociatesOnlyChange: (value: boolean) => void;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function PropertyBrowseView({
  properties,
  loading,
  propertyTypes,
  searchTerm,
  propertyType,
  minValue,
  showAssociatesOnly,
  page,
  totalPages,
  viewMode,
  onSearchChange,
  onPropertyTypeChange,
  onMinValueChange,
  onShowAssociatesOnlyChange,
  onPageChange,
  onViewModeChange,
}: PropertyBrowseViewProps): React.ReactElement {
  return (
    <div className={styles.browser}>
      {/* Filters Bar */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <div className={styles.searchWrapper}>
            <Icon name="Search" className={styles.searchIcon} size="sm" />
            <input
              type="text"
              placeholder="Search properties, owners, addresses..."
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterControls}>
            <Select
              containerClassName={styles.propertyTypeSelect}
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
              containerClassName={styles.minValueSelect}
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

            <div className={styles.checkboxWrapper}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showAssociatesOnly}
                  onChange={(e) => {
                    onShowAssociatesOnlyChange(e.target.checked);
                    onPageChange(1);
                  }}
                  className={styles.checkbox}
                />
                Known Associates Only
              </label>
            </div>

            {/* View Toggle */}
            <div className={styles.viewToggle}>
              <GlassButton
                onClick={() => onViewModeChange('browse')}
                variant={viewMode === 'browse' ? 'primary' : 'ghost'}
                size="sm"
                className={styles.viewToggleButton}
                title="Browse List"
              >
                <Icon name="List" size="sm" />
              </GlassButton>
              <GlassButton
                onClick={() => onViewModeChange('associates')}
                variant={viewMode === 'associates' ? 'primary' : 'ghost'}
                size="sm"
                className={styles.viewToggleButton}
                title="Known Associates"
              >
                <Icon name="Users" size="sm" />
              </GlassButton>
              <GlassButton
                onClick={() => onViewModeChange('analytics')}
                variant={viewMode === 'analytics' ? 'primary' : 'ghost'}
                size="sm"
                className={styles.viewToggleButton}
                title="Analytics"
              >
                <Icon name="BarChart3" size="sm" />
              </GlassButton>
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
            <div className={styles.propertyGrid}>
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className={styles.pageButton}
              >
                <Icon name="ChevronLeft" size="sm" />
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={styles.pageButton}
              >
                <Icon name="ChevronRight" size="sm" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
