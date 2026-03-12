import React from 'react';
import TimelineWithFlights from '../components/TimelineWithFlights';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';

export const TimelinePage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <TimelineWithFlights />
    </ScopedErrorBoundary>
  );
};
