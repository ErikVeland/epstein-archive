import React from 'react';
import TimelineWithFlights from '@client/components/TimelineWithFlights';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';

export const TimelinePage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <TimelineWithFlights />
    </ScopedErrorBoundary>
  );
};
