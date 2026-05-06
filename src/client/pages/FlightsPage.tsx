import React from 'react';
import FlightTracker from '@client/components/FlightTracker';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import { Surface } from '@client/design-system/lib';
import styles from './FlightsPage.module.css';

export const FlightsPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <Surface variant="panel" className={styles.root}>
        <FlightTracker />
      </Surface>
    </ScopedErrorBoundary>
  );
};
