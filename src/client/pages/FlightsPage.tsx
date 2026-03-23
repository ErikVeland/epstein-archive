import React from 'react';
import FlightTracker from '../components/FlightTracker';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';

export const FlightsPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <div className="surface-glass-card p-[var(--space-6)] min-h-[500px]">
        <FlightTracker />
      </div>
    </ScopedErrorBoundary>
  );
};
