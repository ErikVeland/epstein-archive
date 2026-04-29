import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box } from '@client/design-system/lib';
import AutoSizer from '../common/AutoSizer';
import { FlightCard } from './FlightCard';
import { EmptyCorpus } from '../common/EmptyCorpus';
import { useListScrollRestoration } from '@client/hooks/useListScrollRestoration';
import type { Flight } from './types';
import styles from './FlightTimelineView.module.css';

interface FlightTimelineViewProps {
  flights: Flight[];
  formatDate: (dateStr: string) => string;
}

export const FlightTimelineView: React.FC<FlightTimelineViewProps> = ({ flights, formatDate }) => {
  const { initialScrollOffset, onScroll } = useListScrollRestoration('/flights');

  return (
    <Box className={styles.container}>
      {flights.length === 0 ? (
        <EmptyCorpus
          icon="Navigation"
          title="No Flight Records"
          body="Flight logs for the Epstein aircraft are imported from the source manifest during ingestion. No records have been loaded yet — run the flights ingestion pipeline to populate this view."
        />
      ) : (
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List
              height={height ?? 600}
              itemCount={flights.length}
              itemSize={window.innerWidth <= 1024 ? 240 : 200}
              width={width ?? '100%'}
              initialScrollOffset={initialScrollOffset}
              onScroll={onScroll}
            >
              {({ index, style }) => {
                const flight = flights[index];
                return (
                  <Box style={style} className={styles.itemWrapper}>
                    <FlightCard flight={flight} formatDate={formatDate} />
                  </Box>
                );
              }}
            </List>
          )}
        </AutoSizer>
      )}
    </Box>
  );
};
