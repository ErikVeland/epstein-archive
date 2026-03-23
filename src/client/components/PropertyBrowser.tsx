import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from './common/Icon';
import { GlassButton } from './ui/GlassButton';
import { PropertyBrowseView } from './properties/PropertyBrowseView';
import { PropertyAssociatesView } from './properties/PropertyAssociatesView';
import { PropertyAnalyticsView } from './properties/PropertyAnalyticsView';
import { PropertyStatsHeader } from './properties/PropertyStatsHeader';
import { PropertyBrowserStyles } from './properties/PropertyBrowserStyles';
import type { Property, PropertyStats, ValueDistribution, TopOwner } from './properties/types';

export type { Property, PropertyStats, ValueDistribution, TopOwner };

type ViewMode = 'browse' | 'associates' | 'analytics';

export function PropertyBrowser(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [minValue, setMinValue] = useState('');
  const [showAssociatesOnly, setShowAssociatesOnly] = useState(false);
  const [page, setPage] = useState(1);

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery<PropertyStats | null>({
    queryKey: ['properties-stats'],
    queryFn: async () => {
      const statsRes = await fetch('/api/properties/stats');
      const contentType = statsRes.headers.get('content-type');
      if (!statsRes.ok || !contentType?.includes('application/json')) {
        return null;
      }
      const statsData = (await statsRes.json()) as PropertyStats;
      if (!statsData || !statsData.totalProperties) {
        return null;
      }
      return statsData;
    },
  });

  const propertyTypes = useMemo(() => stats?.propertyTypes ?? [], [stats]);

  const { data: valueDistribution = [] } = useQuery<ValueDistribution[]>({
    queryKey: ['properties-value-distribution'],
    queryFn: async () => {
      const distRes = await fetch('/api/properties/value-distribution');
      return distRes.ok ? ((await distRes.json()) as ValueDistribution[]) : [];
    },
    enabled: Boolean(stats),
  });

  const { data: topOwners = [] } = useQuery<TopOwner[]>({
    queryKey: ['properties-top-owners'],
    queryFn: async () => {
      const ownersRes = await fetch('/api/properties/top-owners');
      return ownersRes.ok ? ((await ownersRes.json()) as TopOwner[]) : [];
    },
    enabled: Boolean(stats),
  });

  const { data: knownAssociates = [] } = useQuery<Property[]>({
    queryKey: ['properties-known-associates'],
    queryFn: async () => {
      const associatesRes = await fetch('/api/properties/known-associates');
      return associatesRes.ok ? ((await associatesRes.json()) as Property[]) : [];
    },
    enabled: Boolean(stats),
  });

  const { data: propertiesPayload, isLoading: propertiesLoading } = useQuery<{
    properties: Property[];
    totalPages: number;
  }>({
    queryKey: ['properties-list', searchTerm, propertyType, minValue, showAssociatesOnly, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (propertyType) params.append('type', propertyType);
      if (minValue) params.append('minValue', minValue);
      if (showAssociatesOnly) params.append('associatesOnly', 'true');
      params.append('page', page.toString());
      params.append('limit', '50');
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      return {
        properties: (data.properties || []) as Property[],
        totalPages: Number(data.totalPages || 1),
      };
    },
    enabled: Boolean(stats),
    placeholderData: (previousData) => previousData,
  });

  const properties = propertiesPayload?.properties ?? [];
  const totalPages = propertiesPayload?.totalPages ?? 1;
  const loading = statsLoading || propertiesLoading;

  if (statsLoading) {
    return (
      <div className="property-browser">
        <PropertyBrowserStyles />
        <div className="flex flex-col items-center justify-center py-[var(--space-16)] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mb-[var(--space-4)]" />
          <p className="text-[var(--text-muted)]">Loading property records...</p>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="property-browser">
        <PropertyBrowserStyles />
        <div className="property-header">
          <h1>
            <Icon name="Building" size="lg" />
            Palm Beach Property Records
          </h1>
          <p className="subtitle">Explore properties from Palm Beach County public records</p>
        </div>
        <div className="flex flex-col items-center justify-center py-[var(--space-16)] text-center">
          <div className="w-24 h-24 bg-[color:color-mix(in_srgb,var(--accent-danger)_20%,transparent)] rounded-full flex items-center justify-center mb-[var(--space-6)]">
            <Icon name="AlertCircle" size="xl" className="text-[var(--accent-danger)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-[var(--space-3)]">
            Property Data Unavailable
          </h2>
          <p className="text-[var(--text-muted)] max-w-md">
            The property records could not be loaded. This may be a temporary issue — try refreshing
            the page.
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="property-browser">
        <PropertyBrowserStyles />
        <div className="property-header">
          <h1>
            <Icon name="Building" size="lg" />
            Palm Beach Property Records
          </h1>
          <p className="subtitle">Explore properties from Palm Beach County public records</p>
        </div>
        <div className="flex flex-col items-center justify-center py-[var(--space-16)] text-center">
          <div className="w-24 h-24 bg-[color:color-mix(in_srgb,var(--text-muted)_12%,transparent)] rounded-full flex items-center justify-center mb-[var(--space-6)]">
            <Icon name="Building" size="xl" className="text-[var(--text-muted)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-[var(--space-3)]">
            No Property Records
          </h2>
          <p className="text-[var(--text-muted)] max-w-md">
            No Palm Beach County property records have been loaded yet. Run the property ingestion
            pipeline to populate this section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="property-browser">
      <PropertyBrowserStyles />
      <PropertyStatsHeader stats={stats} />

      {/* View Tabs */}
      <div className="view-tabs">
        <GlassButton
          variant={viewMode === 'browse' ? 'primary' : 'ghost'}
          size="sm"
          className={`tab ${viewMode === 'browse' ? 'active' : ''}`}
          onClick={() => setViewMode('browse')}
        >
          <Icon name="Grid" size="sm" />
          Browse Properties
        </GlassButton>
        <GlassButton
          variant={viewMode === 'associates' ? 'primary' : 'ghost'}
          size="sm"
          className={`tab ${viewMode === 'associates' ? 'active' : ''}`}
          onClick={() => setViewMode('associates')}
        >
          <Icon name="AlertTriangle" size="sm" />
          Known Associates ({knownAssociates.length})
        </GlassButton>
        <GlassButton
          variant={viewMode === 'analytics' ? 'primary' : 'ghost'}
          size="sm"
          className={`tab ${viewMode === 'analytics' ? 'active' : ''}`}
          onClick={() => setViewMode('analytics')}
        >
          <Icon name="BarChart3" size="sm" />
          Analytics
        </GlassButton>
      </div>

      {/* Content */}
      <div className="browser-content">
        {viewMode === 'browse' && (
          <PropertyBrowseView
            properties={properties}
            loading={loading}
            propertyTypes={propertyTypes}
            searchTerm={searchTerm}
            propertyType={propertyType}
            minValue={minValue}
            showAssociatesOnly={showAssociatesOnly}
            page={page}
            totalPages={totalPages}
            viewMode={viewMode}
            onSearchChange={setSearchTerm}
            onPropertyTypeChange={setPropertyType}
            onMinValueChange={setMinValue}
            onShowAssociatesOnlyChange={setShowAssociatesOnly}
            onPageChange={setPage}
            onViewModeChange={setViewMode}
          />
        )}
        {viewMode === 'associates' && <PropertyAssociatesView knownAssociates={knownAssociates} />}
        {viewMode === 'analytics' && (
          <PropertyAnalyticsView
            stats={stats}
            valueDistribution={valueDistribution}
            topOwners={topOwners}
            propertyTypes={propertyTypes}
          />
        )}
      </div>
    </div>
  );
}

export default PropertyBrowser;
