import React from 'react';
import { EnhancedAnalytics } from '../components/pages/EnhancedAnalytics';
import {
  DataVisualization,
  type AnalyticsData,
} from '../components/visualizations/DataVisualization';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';
import { useAbortableRequest } from '../hooks/useAbortableRequest';
import { DegradedBanner } from '../components/shared/DegradedBanner';
import { Person } from '../types';
import { AnalyticsProvider } from '../contexts/AnalyticsContext';

interface AnalyticsPageProps {
  filteredPeople?: Person[];
  analyticsData?: AnalyticsData;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPersonSelect: (person: Person) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  filteredPeople = [],
  analyticsData,
  loading,
  error,
  onRetry,
  onPersonSelect,
}) => {
  const { abortAll } = useAbortableRequest();

  React.useEffect(() => {
    return () => abortAll();
  }, [abortAll]);

  React.useEffect(() => {
    abortAll();
  }, [filteredPeople, abortAll]);

  const contextValue = React.useMemo(
    () => ({
      filteredPeople,
      analyticsData,
      loading,
      error,
      onRetry,
      onPersonSelect,
    }),
    [filteredPeople, analyticsData, loading, error, onRetry, onPersonSelect],
  );

  return (
    <AnalyticsProvider value={contextValue}>
      <ScopedErrorBoundary>
        <div className="space-y-8">
          <DegradedBanner />
          <div className="mb-12">
            <h2 className="text-[2.5rem] leading-none font-display font-light tracking-tight text-[var(--accent)] mb-3">
              Enhanced Analytics
            </h2>
            <p className="text-lg text-[var(--text-muted)] font-light tracking-wide">
              Interactive visualizations of the Epstein Investigation dataset
            </p>
          </div>
          <EnhancedAnalytics />

          <div className="p-8 mt-12 mb-8 bg-[var(--glass-bg)]/30 backdrop-blur-xl rounded-[var(--radius-2xl)] shadow-[var(--glass-shadow-soft)] border border-[var(--glass-border)]/50">
            <h3 className="text-2xl font-display font-light text-[var(--accent)] mb-8 flex items-center gap-3">
              Classic Analytics
            </h3>
            <DataVisualization />
          </div>
        </div>
      </ScopedErrorBoundary>
    </AnalyticsProvider>
  );
};
