import React from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from '../common/AutoSizer';
import { FlightCard } from './FlightCard';
import type { Flight } from './types';
import styles from './FlightTimelineView.module.css';

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
  <div className={styles.container}>
    {flights.length === 0 ? (
      <div className={styles.noFlights}>No flights found</div>
    ) : (
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <List
            height={height ?? 600}
            itemCount={flights.length}
            itemSize={window.innerWidth <= 1024 ? 240 : 130}
            width={width ?? '100%'}
          >
            {({ index, style }) => {
              const flight = flights[index];
              return (
                // style prop required by react-window for virtual positioning
                <div style={style} className={styles.itemWrapper}>
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
