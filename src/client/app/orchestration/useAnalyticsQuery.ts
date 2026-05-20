import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GlobalStatsPayload } from '@client/types/api';
import { apiClient } from '@client/services/apiClient';

export function useAnalyticsQuery(params: {
  apiEnabled: boolean;
  activeTab: string;
  filters: unknown;
}) {
  const query = useQuery<GlobalStatsPayload>({
    queryKey: ['analyticsStats', params.filters],
    queryFn: async () => {
      const stats = (await apiClient.getStats(
        params.filters as unknown as { timeRange?: string[]; limit?: number },
      )) as GlobalStatsPayload;
      return stats;
    },
    enabled: params.apiEnabled && params.activeTab === 'analytics',
    staleTime: 60_000,
  });

  const analyticsError = useMemo(() => {
    const err = query.error;
    return err instanceof Error
      ? err.message
      : err != null
        ? 'Failed to load analytics data'
        : null;
  }, [query.error]);

  return {
    analyticsData: query.data,
    analyticsLoading: query.isFetching,
    analyticsError,
    refetchAnalytics: query.refetch,
  };
}
