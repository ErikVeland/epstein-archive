import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { Button, Input, NativeSelect } from '@client/design-system/lib';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import { MobileToolScreen } from '../investigation/mobile/MobileToolScreen';
import { useIsTouch } from '@client/hooks/useIsTouch';

import '@client/components/FlightTracker.css';
import styles from './FlightTracker.module.css';

import { FlightTimelineView } from './FlightTimelineView';
import { FlightMapView } from './FlightMapView';
import { FlightStatsView } from './FlightStatsView';
import { FlightNetworkView } from './FlightNetworkView';

// Re-export shared types so sub-components can import from the orchestrator if desired
export type { Flight, FlightStats, AirportCoords, CoOccurrence, ViewMode } from './types';
import type { Flight, FlightStats, AirportCoords, CoOccurrence, ViewMode } from './types';

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const VIEW_LABELS: Record<Exclude<ViewMode, 'timeline'>, string> = {
  map: 'Route Map',
  stats: 'Statistics',
  network: 'Passenger Network',
};

export const FlightTracker: React.FC = () => {
  const isTouch = useIsTouch();
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedPassenger, setSelectedPassenger] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const {
    data: flightsPayload,
    isLoading: flightsLoading,
    isError: flightsIsError,
    error: flightsError,
  } = useQuery<{ flights: Flight[] }>({
    queryKey: ['flights-list', selectedPassenger, dateRange.start, dateRange.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPassenger) params.append('passenger', selectedPassenger);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      params.append('limit', '100');
      const flightsRes = await fetch(`/api/flights?${params}`);
      if (!flightsRes.ok) {
        throw new Error(`Failed to load flights: ${flightsRes.status}`);
      }
      const flightsData = await flightsRes.json();
      return { flights: (flightsData.flights || []) as Flight[] };
    },
    placeholderData: (previousData) => previousData,
  });

  const { data: stats = null } = useQuery<FlightStats | null>({
    queryKey: ['flights-stats'],
    queryFn: async () => {
      const statsRes = await fetch('/api/flights/stats');
      if (!statsRes.ok) {
        throw new Error(`Failed to load flight stats: ${statsRes.status}`);
      }
      return (await statsRes.json()) as FlightStats;
    },
  });

  const { data: airports = {} } = useQuery<AirportCoords>({
    queryKey: ['flights-airports'],
    queryFn: async () => {
      const airportsRes = await fetch('/api/flights/airports');
      if (!airportsRes.ok) {
        throw new Error(`Failed to load airports: ${airportsRes.status}`);
      }
      return (await airportsRes.json()) as AirportCoords;
    },
  });

  const { data: passengers = [] } = useQuery<{ name: string; flight_count: number }[]>({
    queryKey: ['flights-passengers'],
    queryFn: async () => {
      const passengersRes = await fetch('/api/flights/passengers');
      if (!passengersRes.ok) {
        throw new Error(`Failed to load passengers: ${passengersRes.status}`);
      }
      const passengersData = await passengersRes.json();
      return Array.isArray(passengersData)
        ? passengersData
        : ((passengersData.passengers || []) as { name: string; flight_count: number }[]);
    },
  });

  const { data: coOccurrences = [], isLoading: networkLoading } = useQuery<CoOccurrence[]>({
    queryKey: ['flights-co-occurrences'],
    queryFn: async () => {
      const res = await fetch('/api/flights/co-occurrences?minFlights=2&limit=100');
      const data = await res.json();
      return (data || []) as CoOccurrence[];
    },
    enabled: viewMode === 'network',
  });

  const flights = flightsPayload?.flights || [];
  const loading = flightsLoading;

  if (loading) {
    return (
      <div className="flight-tracker loading-state">
        <div className="loading-spinner">
          <div className="radar-sweep" />
          <span>Loading Flight Data...</span>
        </div>
      </div>
    );
  }

  if (flightsIsError) {
    return (
      <div className="flight-tracker">
        <div className={styles.errorFallback}>
          <p className={styles.errorFallbackTitle}>Flights data unavailable</p>
          <p>{flightsError instanceof Error ? flightsError.message : 'Unknown error'}</p>
          <p className={styles.errorFallbackHint}>
            If you’re running locally, confirm your API is reachable (Vite proxies /api to
            VITE_API_URL).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flight-tracker">
      <div className="tracker-header">
        <div className="header-left">
          <h1>
            <Icon name="Navigation" size="lg" />
            Flight Tracker
          </h1>
          <p className="subtitle">Tracking flights on N908JE "Lolita Express"</p>
        </div>

        <div className="header-stats">
          <div className="mini-stat">
            <span className="value">{stats?.totalFlights || 0}</span>
            <span className="label">Flights</span>
          </div>
          <div className="mini-stat">
            <span className="value">{stats?.uniquePassengers || 0}</span>
            <span className="label">Passengers</span>
          </div>
          <div className="mini-stat">
            <span className="value">{Object.keys(airports).length}</span>
            <span className="label">Airports</span>
          </div>
        </div>
      </div>

      <div className="tracker-controls">
        <div className="view-toggle">
          <Button
            unstyled
            variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
            size="sm"
            className={viewMode === 'timeline' ? 'active' : ''}
            onClick={() => setViewMode('timeline')}
          >
            <Icon name="List" size="sm" />
            <span className={styles.viewTabLabel}>Timeline</span>
          </Button>
          <Button
            unstyled
            variant={viewMode === 'map' ? 'primary' : 'ghost'}
            size="sm"
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => setViewMode('map')}
          >
            <Icon name="Globe" size="sm" />
            <span className={styles.viewTabLabel}>Map</span>
          </Button>
          <Button
            unstyled
            variant={viewMode === 'stats' ? 'primary' : 'ghost'}
            size="sm"
            className={viewMode === 'stats' ? 'active' : ''}
            onClick={() => setViewMode('stats')}
          >
            <Icon name="BarChart3" size="sm" />
            <span className={styles.viewTabLabel}>Stats</span>
          </Button>
          <Button
            unstyled
            variant={viewMode === 'network' ? 'primary' : 'ghost'}
            size="sm"
            className={viewMode === 'network' ? 'active' : ''}
            onClick={() => setViewMode('network')}
          >
            <Icon name="Users" size="sm" />
            <span className={styles.viewTabLabel}>Network</span>
          </Button>
        </div>

        <div className="filters">
          <div className={styles.filterRow}>
            <NativeSelect
              unstyled
              className="passenger-filter"
              value={selectedPassenger}
              onChange={(e) => setSelectedPassenger(e.target.value)}
            >
              <option value="">All Passengers</option>
              {passengers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.flight_count})
                </option>
              ))}
            </NativeSelect>

            <div className={styles.dateRangeWrapper}>
              <Icon name="Calendar" size="sm" className={styles.dateSeparator} />
              <Input
                unstyled
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="date-filter"
                placeholder="Start Date"
              />
              <span className={styles.dateSeparator}>-</span>
              <Input
                unstyled
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="date-filter"
                placeholder="End Date"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="tracker-content">
        <ScopedErrorBoundary
          fallback={
            <div className={styles.errorFallback}>
              <p className={styles.errorFallbackTitle}>Visualization Error</p>
              <p>
                A rendering error occurred in this view. The data might be malformed or incomplete.
              </p>
            </div>
          }
        >
          {/* On desktop: only the active view renders */}
          {!isTouch && viewMode === 'timeline' && (
            <FlightTimelineView flights={flights} formatDate={formatDate} />
          )}
          {!isTouch && viewMode === 'map' && (
            <FlightMapView flights={flights} airports={airports} stats={stats} />
          )}
          {!isTouch && viewMode === 'stats' && <FlightStatsView stats={stats} />}
          {!isTouch && viewMode === 'network' && (
            <FlightNetworkView coOccurrences={coOccurrences} networkLoading={networkLoading} />
          )}

          {/* On touch: timeline is always the base; secondary views open as MobileToolScreen */}
          {isTouch && <FlightTimelineView flights={flights} formatDate={formatDate} />}
          {isTouch && viewMode !== 'timeline' && (
            <MobileToolScreen
              toolName={VIEW_LABELS[viewMode as Exclude<ViewMode, 'timeline'>]}
              onBack={() => setViewMode('timeline')}
            >
              {viewMode === 'map' && (
                <FlightMapView flights={flights} airports={airports} stats={stats} />
              )}
              {viewMode === 'stats' && <FlightStatsView stats={stats} />}
              {viewMode === 'network' && (
                <FlightNetworkView coOccurrences={coOccurrences} networkLoading={networkLoading} />
              )}
            </MobileToolScreen>
          )}
        </ScopedErrorBoundary>
      </div>
    </div>
  );
};

export default FlightTracker;
