import { createContext, useContext } from 'react';
import type { Person } from '@client/types';
import type { AnalyticsData as GlobalAnalyticsData } from '@client/components/visualizations/DataVisualization';

export interface AnalyticsContextValue {
  filteredPeople: Person[];
  analyticsData?: GlobalAnalyticsData;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPersonSelect: (person: Person) => void;
}

export const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
