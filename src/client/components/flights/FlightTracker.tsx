import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '../common/Icon';
import { Select } from '../common/Select';
import { GlassButton } from '../ui/GlassButton';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';

import '../FlightTracker.css';
import styles from './FlightTracker.module.css';

import { FlightTimelineView } from './FlightTimelineView';
import { FlightMapView } from './FlightMapView';
import { FlightStatsView } from './FlightStatsView';
import { FlightNetworkView } from './FlightNetworkView';
import { FlightDetailPanel } from './FlightDetailPanel';

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

export const FlightTracker: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedPassenger, setSelectedPassenger] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  const { data: flightsPayload, isLoading: flightsLoading } = useQuery<{ flights: Flight[] }>({
    queryKey: ['flights-list', selectedPassenger, dateRange.start, dateRange.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPassenger) params.append('passenger', selectedPassenger);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      params.append('limit', '100');
      const flightsRes = await fetch(`/api/flights?${params}`);
      const flightsData = await flightsRes.json();
      return { flights: (flightsData.flights || []) as Flight[] };
    },
    placeholderData: (previousData) => previousData,
  });

  const { data: stats = null } = useQuery<FlightStats | null>({
    queryKey: ['flights-stats'],
    queryFn: async () => {
      const statsRes = await fetch('/api/flights/stats');
      return (await statsRes.json()) as FlightStats;
    },
  });

  const { data: airports = {} } = useQuery<AirportCoords>({
    queryKey: ['flights-airports'],
    queryFn: async () => {
      const airportsRes = await fetch('/api/flights/airports');
      return (await airportsRes.json()) as AirportCoords;
    },
  });

  const { data: passengers = [] } = useQuery<{ name: string; flight_count: number }[]>({
    queryKey: ['flights-passengers'],
    queryFn: async () => {
      const passengersRes = await fetch('/api/flights/passengers');
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
          <GlassButton
            variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
            size="sm"
            className={viewMode === 'timeline' ? 'active' : ''}
            onClick={() => setViewMode('timeline')}
          >
            <Icon name="List" size="sm" /> Timeline
          </GlassButton>
          <GlassButton
            variant={viewMode === 'map' ? 'primary' : 'ghost'}
            size="sm"
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => setViewMode('map')}
          >
            <Icon name="Globe" size="sm" /> Map
          </GlassButton>
          <GlassButton
            variant={viewMode === 'stats' ? 'primary' : 'ghost'}
            size="sm"
            className={viewMode === 'stats' ? 'active' : ''}
            onClick={() => setViewMode('stats')}
          >
            <Icon name="BarChart3" size="sm" /> Stats
          </GlassButton>
          <GlassButton
            variant={viewMode === 'network' ? 'primary' : 'ghost'}
            size="sm"
            className={viewMode === 'network' ? 'active' : ''}
            onClick={() => setViewMode('network')}
          >
            <Icon name="Users" size="sm" /> Network
          </GlassButton>
        </div>

        <div className="filters">
          <div className={styles.filterRow}>
            <Select
              containerClassName="min-w-[200px]"
              value={selectedPassenger}
              onChange={(e) => setSelectedPassenger(e.target.value)}
              options={[
                { value: '', label: 'All Passengers' },
                ...passengers.map((p) => ({
                  value: p.name,
                  label: `${p.name} (${p.flight_count})`,
                })),
              ]}
            />

            <div className={styles.dateRangeWrapper}>
              <Icon name="Calendar" size="sm" className={styles.dateSeparator} />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className={styles.dateInput}
                placeholder="Start Date"
              />
              <span className={styles.dateSeparator}>-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className={styles.dateInput}
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
          {viewMode === 'timeline' && (
            <FlightTimelineView
              flights={flights}
              onSelectFlight={setSelectedFlight}
              formatDate={formatDate}
            />
          )}
          {viewMode === 'map' && (
            <FlightMapView flights={flights} airports={airports} stats={stats} />
          )}
          {viewMode === 'stats' && <FlightStatsView stats={stats} />}
          {viewMode === 'network' && (
            <FlightNetworkView coOccurrences={coOccurrences} networkLoading={networkLoading} />
          )}
        </ScopedErrorBoundary>
      </div>

      <FlightDetailPanel
        flight={selectedFlight}
        airports={airports}
        onClose={() => setSelectedFlight(null)}
        formatDate={formatDate}
      />
    </div>
  );
};

export default FlightTracker;
