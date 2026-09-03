import React from 'react';
import { EnhancedAnalytics } from '@client/components/pages/EnhancedAnalytics';
import { type AnalyticsData } from '@client/components/visualizations/DataVisualization';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import { DegradedBanner } from '@client/components/shared/DegradedBanner';
import { Person } from '@client/types';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Box } from '@client/design-system/components/layout/Box';
import { LqText } from '@client/design-system/components/typography/Text';
import styles from './AnalyticsPage.module.css';

interface AnalyticsPageProps {
  filteredPeople?: Person[];
  analyticsData?: AnalyticsData;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPersonSelect: (person: Person) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = () => {
  return (
    <ScopedErrorBoundary>
      <Flex direction="column" gap={8}>
        <DegradedBanner />
        <Box className={styles.hero}>
          <LqText as="h2" variant="h2" color="accent" className={styles.heroTitle}>
            Evidence explorer
          </LqText>
          <LqText
            as="p"
            variant="body"
            color="muted"
            weight="light"
            className={styles.heroDescription}
          >
            Follow people to their source records. Inspect connections and gaps in archive coverage.
          </LqText>
        </Box>
        <EnhancedAnalytics />
      </Flex>
    </ScopedErrorBoundary>
  );
};
