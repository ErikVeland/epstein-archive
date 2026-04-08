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
import { Surface } from '../design-system/components/surfaces/Surface';
import { Flex } from '../design-system/components/layout/Flex';
import { Box } from '../design-system/components/layout/Box';
import { LqText } from '../design-system/components/typography/Text';
import styles from './AnalyticsPage.module.css';

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
        <Flex direction="column" gap={8}>
          <DegradedBanner />
          <Box className={styles.hero}>
            <LqText as="h2" variant="h2" color="accent" className={styles.heroTitle}>
              Enhanced Analytics
            </LqText>
            <LqText
              as="p"
              variant="body"
              color="muted"
              weight="light"
              className={styles.heroDescription}
            >
              Interactive visualizations of the Epstein Investigation dataset
            </LqText>
          </Box>
          <EnhancedAnalytics />

          <Surface variant="glass" className={styles.classicSection}>
            <Flex align="center" gap={3} className={styles.classicHeader}>
              <LqText as="h3" variant="h3" color="accent">
                Classic Analytics
              </LqText>
            </Flex>
            <DataVisualization />
          </Surface>
        </Flex>
      </ScopedErrorBoundary>
    </AnalyticsProvider>
  );
};
