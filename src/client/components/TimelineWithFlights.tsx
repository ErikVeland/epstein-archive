import React from 'react';
import Timeline from './visualizations/Timeline';

interface TimelineWithFlightsProps {
  className?: string;
}

/**
 * Timeline component wrapper - Flights now accessible via top nav
 */
const TimelineWithFlights: React.FC<TimelineWithFlightsProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-[var(--space-6)] ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-4)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-[var(--space-2)]">
            Investigation Timeline
          </h2>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">
            Chronological sequence of significant events extracted from evidence files.
          </p>
        </div>
      </div>

      {/* Timeline Content */}
      <Timeline />
    </div>
  );
};

export default TimelineWithFlights;
