import React from 'react';
import FlightTracker from '../components/FlightTracker';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';

export const FlightsPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
        <FlightTracker />
      </div>
    </ScopedErrorBoundary>
  );
};
