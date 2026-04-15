import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from './common/Icon';
import { PropertyBrowseView } from './properties/PropertyBrowseView';
import { PropertyAssociatesView } from './properties/PropertyAssociatesView';
import { PropertyAnalyticsView } from './properties/PropertyAnalyticsView';
import { PropertyStatsHeader } from './properties/PropertyStatsHeader';
import { PropertyDetailPanel } from './properties/PropertyDetailPanel';
import { cn } from '@client/utils/cn';
import { Button, EmptyState } from '../design-system/lib';
import type { Property, PropertyStats, ValueDistribution, TopOwner } from './properties/types';
import styles from './PropertyBrowser.module.css';

export type { Property, PropertyStats, ValueDistribution, TopOwner };

type ViewMode = 'browse' | 'associates' | 'analytics';

export function PropertyBrowser(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

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
      <div className={styles.browser}>
        <div className={styles.centeredState}>
          <div className={styles.spinner} />
          <p className={styles.stateText}>Loading property records...</p>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className={styles.browser}>
        <div className={styles.fallbackHeader}>
          <h1 className={styles.fallbackTitle}>
            <Icon name="Building" size="lg" />
            Palm Beach Property Records
          </h1>
          <p className={styles.fallbackSubtitle}>
            Explore properties from Palm Beach County public records
          </p>
        </div>
        <div className={styles.centeredState}>
          <EmptyState
            className={styles.stateCard}
            icon={
              <div className={cn(styles.stateIconCircle, styles.errorCircle)}>
                <Icon name="AlertCircle" size="xl" className={styles.errorIcon} />
              </div>
            }
            title="Property Data Unavailable"
            description="The property records could not be loaded. Ensure the API server is running and the property ingestion pipeline has been run to populate the database."
          />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={styles.browser}>
        <div className={styles.fallbackHeader}>
          <h1 className={styles.fallbackTitle}>
            <Icon name="Building" size="lg" />
            Palm Beach Property Records
          </h1>
          <p className={styles.fallbackSubtitle}>
            Explore properties from Palm Beach County public records
          </p>
        </div>
        <div className={styles.centeredState}>
          <EmptyState
            className={styles.stateCard}
            icon={
              <div className={cn(styles.stateIconCircle, styles.emptyCircle)}>
                <Icon name="Building" size="xl" className={styles.emptyIcon} />
              </div>
            }
            title="No Property Records"
            description="No Palm Beach County property records have been loaded yet. Run the property ingestion pipeline to populate this section."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.browser}>
      <PropertyDetailPanel property={selectedProperty} onClose={() => setSelectedProperty(null)} />
      <PropertyStatsHeader stats={stats} />

      {/* View Tabs */}
      <div className={styles.viewTabs}>
        <Button
          variant={viewMode === 'browse' ? 'primary' : 'ghost'}
          size="sm"
          className={cn(styles.tab, viewMode === 'browse' && styles.tabActive)}
          onClick={() => setViewMode('browse')}
        >
          <Icon name="Grid" size="sm" />
          Browse Properties
        </Button>
        <Button
          variant={viewMode === 'associates' ? 'primary' : 'ghost'}
          size="sm"
          className={cn(styles.tab, viewMode === 'associates' && styles.tabActive)}
          onClick={() => setViewMode('associates')}
        >
          <Icon name="AlertTriangle" size="sm" />
          Known Associates ({knownAssociates.length})
        </Button>
        <Button
          variant={viewMode === 'analytics' ? 'primary' : 'ghost'}
          size="sm"
          className={cn(styles.tab, viewMode === 'analytics' && styles.tabActive)}
          onClick={() => setViewMode('analytics')}
        >
          <Icon name="BarChart3" size="sm" />
          Analytics
        </Button>
      </div>

      {/* Content */}
      <div className={styles.browserContent}>
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
            onSelectProperty={setSelectedProperty}
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
