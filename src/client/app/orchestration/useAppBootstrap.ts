import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GlobalStatsPayload } from '@client/types/api';
import type { Person } from '@client/types';
import { apiClient } from '@client/services/apiClient';
import type { DataStats } from '../AppRoutes';

export function useAppBootstrap(params: { apiEnabled: boolean }) {
  const { isLoading: isInitializing } = useQuery<boolean>({
    queryKey: ['initDataService'],
    queryFn: async () => {
      const result = await apiClient.getEntities({}, 1);
      const normalized = (result.data || []).map((person: Person) => ({
        ...person,
        redFlagRating: person.redFlagRating ?? 0,
        name: person.name ?? person.fullName,
        files: person.files ?? person.documentCount ?? 0,
        likelihoodScore:
          person.likelihoodScore ??
          person.likelihoodLevel ??
          ((person.redFlagRating ?? 0) >= 4
            ? 'HIGH'
            : (person.redFlagRating ?? 0) >= 2
              ? 'MEDIUM'
              : 'LOW'),
      }));
      try {
        sessionStorage.setItem('epstein_archive_people_page1_v13_14_1', JSON.stringify(normalized));
      } catch (err) {
        console.error('Error caching people data:', err);
      }
      return true;
    },
    staleTime: Infinity,
    retry: false,
    enabled: params.apiEnabled,
  });

  const { data: globalStatsData } = useQuery<GlobalStatsPayload>({
    queryKey: ['globalStats'],
    queryFn: async () => (await apiClient.getStats()) as GlobalStatsPayload,
    staleTime: 5 * 60_000,
    enabled: params.apiEnabled,
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
    try {
      sessionStorage.setItem('epstein_archive_stats_v13_14_1', JSON.stringify(newStats));
    } catch (err) {
      void err;
    }
    return newStats;
  }, [globalStatsData]);

  const loadingProgress = isInitializing ? 'Loading subjects...' : 'Ready';

  return {
    isInitializing,
    dataStats,
    loadingProgress,
  };
}
