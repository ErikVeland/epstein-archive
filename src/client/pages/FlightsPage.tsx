import React from 'react';
import FlightTracker from '../components/FlightTracker';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';
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
