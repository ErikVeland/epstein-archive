import React, { createContext, useContext } from 'react';
import type { Person } from '../types';
import type { AnalyticsData as GlobalAnalyticsData } from '../components/visualizations/DataVisualization';

export interface AnalyticsContextValue {
  filteredPeople: Person[];
  analyticsData?: GlobalAnalyticsData;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPersonSelect: (person: Person) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

export const AnalyticsProvider: React.FC<{
  value: AnalyticsContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};
