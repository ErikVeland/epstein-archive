import React from 'react';
import Icon from '../common/Icon';
import { Select } from '../common/Select';
import { GlassButton } from '../ui/GlassButton';
import { PropertyCard } from './PropertyCard';
import type { Property, PropertyStats } from './types';

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
    <div className="property-browse">
      {/* Filters Bar */}
      <div className="bg-[var(--glass-bg)]/50 p-4 border-b border-[var(--glass-border)] backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size="sm"
            />
            <input
              type="text"
              placeholder="Search properties, owners, addresses..."
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
              className="w-full bg-[var(--glass-bg-strong)]/50 border border-[var(--glass-border)] rounded-[var(--radius-lg)] pl-10 pr-4 py-2 text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Select
              containerClassName="min-w-[180px]"
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
              containerClassName="min-w-[160px]"
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

            <div className="flex items-center gap-2 bg-[var(--glass-bg-strong)]/50 border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-secondary)] select-none">
                <input
                  type="checkbox"
                  checked={showAssociatesOnly}
                  onChange={(e) => {
                    onShowAssociatesOnlyChange(e.target.checked);
                    onPageChange(1);
                  }}
                  className="w-4 h-4 rounded border-[var(--glass-border)] text-[var(--accent)] focus:ring-[var(--accent)]/50 bg-[var(--glass-bg)]"
                />
                Known Associates Only
              </label>
            </div>

            {/* View Toggle */}
            <div className="flex bg-[var(--glass-bg-strong)]/50 rounded-[var(--radius-lg)] p-1 border border-[var(--glass-border)]">
              <GlassButton
                onClick={() => onViewModeChange('browse')}
                variant={viewMode === 'browse' ? 'primary' : 'ghost'}
                size="sm"
                className="!px-2 !py-2"
                title="Browse List"
              >
                <Icon name="List" size="sm" />
              </GlassButton>
              <GlassButton
                onClick={() => onViewModeChange('associates')}
                variant={viewMode === 'associates' ? 'primary' : 'ghost'}
                size="sm"
                className="!px-2 !py-2"
                title="Known Associates"
              >
                <Icon name="Users" size="sm" />
              </GlassButton>
              <GlassButton
                onClick={() => onViewModeChange('analytics')}
                variant={viewMode === 'analytics' ? 'primary' : 'ghost'}
                size="sm"
                className="!px-2 !py-2"
                title="Analytics"
              >
                <Icon name="BarChart3" size="sm" />
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      {/* Property List */}
      <div className="property-list-section">
        {loading ? (
          <div className="loading-state">
            <Icon name="Loader2" className="spin" size="sm" /> Loading properties...
          </div>
        ) : (
          <>
            <div className="property-grid">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="page-btn"
              >
                <Icon name="ChevronLeft" size="sm" />
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="page-btn"
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
