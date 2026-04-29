import React from 'react';
import FlightTracker from '@client/components/FlightTracker';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import styles from './FlightsPage.module.css';

export const FlightsPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <div className={`surface-panel ${styles.root}`}>
        <FlightTracker />
      </div>
    </ScopedErrorBoundary>
  );
};
