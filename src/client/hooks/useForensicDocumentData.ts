import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@client/services/apiClient';
import type {
  ForensicAnalysis,
  ForensicCaseContext,
} from '@client/components/investigation/ForensicDocumentAnalyzer';

import { ForensicMetricRecord, ForensicSummary } from '@client/types/forensics';

type DocumentMeta = {
  source_collection?: string;
  source_original_url?: string;
  credibility_score?: number;
  sensitivity_flags?: string[];
  filePath?: string;
  originalFilePath?: string;
  cleanedPath?: string;
} | null;

interface UseForensicDocumentDataOptions {
  documentId: string;
  activeTab: 'dashboard' | 'entities' | 'patterns' | 'anomalies' | 'metadata';
  caseContext?: ForensicCaseContext;
  onAnalysisComplete?: (analysis: ForensicAnalysis) => void;
  locationSearch: string;
}

const getCompareIdsFromSearch = (locationSearch: string) => {
  try {
    const params = new URLSearchParams(locationSearch);
    return {
      compareAId: params.get('compareA') || '',
      compareBId: params.get('compareB') || '',
    };
  } catch (error) {
    console.error('Error parsing forensic URL parameters:', error);
    return { compareAId: '', compareBId: '' };
  }
};

export function useForensicDocumentData({
  documentId,
  activeTab,
  caseContext,
  onAnalysisComplete,
  locationSearch,
}: UseForensicDocumentDataOptions) {
  const navigate = useNavigate();
  const initialCompareIds = useMemo(
    () => getCompareIdsFromSearch(locationSearch),
    [locationSearch],
  );
  const [analysis, setAnalysis] = useState<ForensicAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [compareAId, setCompareAId] = useState(initialCompareIds.compareAId);
  const [compareBId, setCompareBId] = useState(initialCompareIds.compareBId);
  const [compareA, setCompareA] = useState<ForensicMetricRecord | null>(null);
  const [compareB, setCompareB] = useState<ForensicMetricRecord | null>(null);
  const [quickMetrics, setQuickMetrics] = useState<Record<string, ForensicMetricRecord>>({});
  const [activeId, setActiveId] = useState(documentId);

  useEffect(() => {
    setActiveId(documentId);
  }, [documentId]);

  useEffect(() => {
    const nextIds = getCompareIdsFromSearch(locationSearch);
    setCompareAId(nextIds.compareAId);
    setCompareBId(nextIds.compareBId);
  }, [locationSearch]);

  // Fetch document metadata via useQuery
  const { data: docMeta = null } = useQuery<DocumentMeta>({
    queryKey: ['forensic-doc-meta', activeId],
    queryFn: async ({ signal }) => {
      if (!activeId) return null;
      const data = (await apiClient.get<Record<string, unknown>>(`/evidence/${activeId}`, {
        cacheTtl: 30_000,
        signal,
      })) as Record<string, unknown>;
      const meta = (data.metadata || {}) as Record<string, unknown>;
      return {
        source_collection:
          typeof meta.source_collection === 'string'
            ? meta.source_collection
            : typeof data.source_collection === 'string'
              ? data.source_collection
              : undefined,
        source_original_url:
          typeof meta.source_original_url === 'string' ? meta.source_original_url : undefined,
        credibility_score:
          typeof meta.credibility_score === 'number' ? meta.credibility_score : undefined,
        sensitivity_flags: Array.isArray(meta.sensitivity_flags)
          ? (meta.sensitivity_flags as string[])
          : [],
        filePath: typeof data.filePath === 'string' ? data.filePath : undefined,
        originalFilePath:
          typeof data.original_file_path === 'string'
            ? data.original_file_path
            : typeof data.originalFilePath === 'string'
              ? data.originalFilePath
              : undefined,
        cleanedPath: typeof data.cleanedPath === 'string' ? data.cleanedPath : undefined,
      };
    },
    enabled: Boolean(activeId),
    staleTime: 30_000,
  });

  // Fetch forensic metrics for the current document via useQuery
  const { data: metrics = null } = useQuery<ForensicMetricRecord | null>({
    queryKey: ['forensic-metrics', activeId],
    queryFn: ({ signal }) =>
      apiClient.get<ForensicMetricRecord>(`/forensic/metrics/${activeId}`, { signal }),
    enabled: activeTab === 'dashboard' && Boolean(activeId),
    staleTime: 30_000,
  });

  // Fetch the global metrics summary via useQuery
  const { data: summary = null } = useQuery<ForensicSummary | null>({
    queryKey: ['forensic-metrics-summary'],
    queryFn: ({ signal }) =>
      apiClient.get<ForensicSummary>('/forensic/metrics-summary', { signal }),
    enabled: activeTab === 'dashboard',
    staleTime: 60_000,
  });

  // Fetch top lists (JS, density, risk) via useQuery
  const { data: topListsData } = useQuery<{
    topJs: ForensicMetricRecord[];
    topDensity: ForensicMetricRecord[];
    topRisk: ForensicMetricRecord[];
  }>({
    queryKey: ['forensic-top-lists'],
    queryFn: async ({ signal }) => {
      const [jsList, densityList, riskList] = await Promise.all([
        apiClient.get<{ data?: ForensicMetricRecord[] }>(
          '/forensic/metrics-list/top?by=js&limit=10',
          { signal },
        ),
        apiClient.get<{ data?: ForensicMetricRecord[] }>(
          '/forensic/metrics-list/top?by=density&limit=10',
          { signal },
        ),
        apiClient.get<{ data?: ForensicMetricRecord[] }>(
          '/forensic/metrics-list/top?by=risk&limit=10',
          { signal },
        ),
      ]);
      return {
        topJs: jsList.data || [],
        topDensity: densityList.data || [],
        topRisk: riskList.data || [],
      };
    },
    enabled: activeTab === 'dashboard',
    staleTime: 60_000,
  });

  const topJs = topListsData?.topJs ?? [];
  const topDensity = topListsData?.topDensity ?? [];
  const topRisk = topListsData?.topRisk ?? [];

  const loadQuickMetric = useCallback(
    async (metricId: string) => {
      if (!metricId) return;
      if (quickMetrics[metricId]) return;
      try {
        const data = await apiClient.get<ForensicMetricRecord>(`/forensic/metrics/${metricId}`, {
          cacheTtl: 60_000,
        });
        setQuickMetrics((prev) => (prev[metricId] ? prev : { ...prev, [metricId]: data }));
      } catch {
        // Hover previews are opportunistic.
      }
    },
    [quickMetrics],
  );

  const loadComparison = useCallback(async () => {
    try {
      const [left, right] = await Promise.all([
        compareAId
          ? apiClient.get<ForensicMetricRecord>(`/forensic/metrics/${compareAId}`, {
              cacheTtl: 60_000,
            })
          : Promise.resolve(null),
        compareBId
          ? apiClient.get<ForensicMetricRecord>(`/forensic/metrics/${compareBId}`, {
              cacheTtl: 60_000,
            })
          : Promise.resolve(null),
      ]);
      setCompareA(left);
      setCompareB(right);

      const params = new URLSearchParams(window.location.search);
      if (compareAId) params.set('compareA', compareAId);
      else params.delete('compareA');
      if (compareBId) params.set('compareB', compareBId);
      else params.delete('compareB');
      const query = params.toString();
      const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (url === currentUrl) return;
      navigate(url, { replace: true });
    } catch {
      // Ignore comparison fetch errors to keep the dashboard responsive.
    }
  }, [compareAId, compareBId, navigate]);

  const startForensicAnalysis = useCallback(async () => {
    if (!documentId) return;
    setIsAnalyzing(true);
    try {
      const params = new URLSearchParams();
      if (caseContext?.caseId) params.set('caseId', caseContext.caseId);
      if (caseContext?.keyEntities?.length) {
        params.set('keyEntities', caseContext.keyEntities.join(','));
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.post<ForensicAnalysis>(
        `/forensic/analyze/${documentId}${query}`,
      );
      setAnalysis(data);
      onAnalysisComplete?.(data);
    } catch (error) {
      console.error('Forensic analysis failed', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [caseContext, documentId, onAnalysisComplete]);

  return {
    activeId,
    analysis,
    compareA,
    compareAId,
    compareB,
    compareBId,
    docMeta,
    isAnalyzing,
    loadComparison,
    loadQuickMetric,
    metrics,
    quickMetrics,
    setActiveId,
    setCompareAId,
    setCompareBId,
    startForensicAnalysis,
    summary,
    topDensity,
    topJs,
    topRisk,
  };
}
