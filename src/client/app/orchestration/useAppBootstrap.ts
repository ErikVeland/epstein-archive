import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GlobalStatsPayload } from '@client/types/api';
import { apiClient } from '@client/services/apiClient';
import type { DataStats } from '../AppRoutes';

export function useAppBootstrap(params: { apiEnabled: boolean; pathname: string }) {
  const showsPeople = /^\/(?:people\/?|entity\/[^/]+\/?)?$/.test(params.pathname);
  const { data: globalStatsData } = useQuery<GlobalStatsPayload>({
    queryKey: ['globalStats'],
    queryFn: async () => (await apiClient.getStats()) as GlobalStatsPayload,
    staleTime: 5 * 60_000,
    enabled: params.apiEnabled && showsPeople,
  });

  const dataStats: DataStats = useMemo(() => {
    if (!globalStatsData) {
      return {
        totalPeople: 0,
        totalMentions: 0,
        totalFiles: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
      };
    }
    const likelihoodDistribution = Array.isArray(globalStatsData.likelihoodDistribution)
      ? globalStatsData.likelihoodDistribution
      : [];
    const highRisk =
      likelihoodDistribution.find(
        (bucket: { level: string; count: number }) => bucket.level === 'HIGH',
      )?.count || 0;
    const mediumRisk =
      likelihoodDistribution.find(
        (bucket: { level: string; count: number }) => bucket.level === 'MEDIUM',
      )?.count || 0;
    const lowRisk =
      likelihoodDistribution.find(
        (bucket: { level: string; count: number }) => bucket.level === 'LOW',
      )?.count || 0;
    const newStats = {
      totalPeople: globalStatsData.totalEntities,
      totalMentions: globalStatsData.totalMentions,
      totalFiles: globalStatsData.totalDocuments,
      highRisk,
      mediumRisk,
      lowRisk,
    };
    return newStats;
  }, [globalStatsData]);

  return { dataStats };
}
