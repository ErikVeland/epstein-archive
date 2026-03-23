import React from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from '../common/AutoSizer';
import { FlightCard } from './FlightCard';
import type { Flight } from './types';

interface FlightTimelineViewProps {
  flights: Flight[];
  onSelectFlight: (flight: Flight) => void;
  formatDate: (dateStr: string) => string;
}

export const FlightTimelineView: React.FC<FlightTimelineViewProps> = ({
  flights,
  onSelectFlight,
  formatDate,
}) => (
  <div
    className="flight-timeline-container"
    style={{ flex: 1, minHeight: '600px', height: '100%', width: '100%' }}
  >
    {flights.length === 0 ? (
      <div className="no-flights text-[var(--text-muted)] p-[var(--space-8)] text-center bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)]">
        No flights found
      </div>
    ) : (
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <List
            height={height ?? 600}
            itemCount={flights.length}
            itemSize={window.innerWidth <= 1024 ? 240 : 130}
            width={width ?? '100%'}
            className="flight-timeline-list"
          >
            {({ index, style }) => {
              const flight = flights[index];
              return (
                <div style={{ ...style, paddingBottom: '1rem', paddingRight: '0.5rem' }}>
                  <FlightCard flight={flight} onSelect={onSelectFlight} formatDate={formatDate} />
                </div>
              );
            }}
          </List>
        )}
      </AutoSizer>
    )}
  </div>
);
