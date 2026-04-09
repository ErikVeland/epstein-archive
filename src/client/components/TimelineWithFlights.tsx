import React from 'react';
import Timeline from './visualizations/Timeline';
import styles from './TimelineWithFlights.module.css';

interface TimelineWithFlightsProps {
  className?: string;
}

/**
 * Timeline component wrapper - Flights now accessible via top nav
 */
const TimelineWithFlights: React.FC<TimelineWithFlightsProps> = ({ className = '' }) => {
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Investigation Timeline</h2>
          <p className={styles.subtitle}>
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
