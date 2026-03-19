import React from 'react';
import { EnhancedAnalytics } from '../components/pages/EnhancedAnalytics';
import { DataVisualization } from '../components/visualizations/DataVisualization';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';
import { useAbortableRequest } from '../hooks/useAbortableRequest';
import { DegradedBanner } from '../components/shared/DegradedBanner';

interface AnalyticsPageProps {
  filteredPeople?: any[];
  analyticsData: any;
  loading: boolean;
  error: any;
  onRetry: () => void;
  onPersonSelect: (person: any) => void;
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

  return (
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
        <EnhancedAnalytics
          onEntitySelect={(entityId) => {
            const person = filteredPeople.find((p) => Number(p.id) === entityId);
            if (person) {
              onPersonSelect(person);
            }
          }}
          onTypeFilter={(type) => {
            console.log('Filter by type:', type);
          }}
        />

        <div className="p-8 mt-12 mb-8 bg-[var(--glass-bg)]/30 backdrop-blur-xl rounded-[var(--radius-2xl)] shadow-[var(--glass-shadow-soft)] border border-[var(--glass-border)]/50">
          <h3 className="text-2xl font-display font-light text-[var(--accent)] mb-8 flex items-center gap-3">
            Classic Analytics
          </h3>
          <DataVisualization
            people={filteredPeople}
            analyticsData={analyticsData}
            loading={loading}
            error={error}
            onRetry={onRetry}
            onPersonSelect={onPersonSelect}
          />
        </div>
      </div>
    </ScopedErrorBoundary>
  );
};
