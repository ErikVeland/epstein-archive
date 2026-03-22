import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type {
  ForensicAnalysis,
  ForensicCaseContext,
} from '../components/investigation/ForensicDocumentAnalyzer';

type ForensicMetricRecord = Record<string, any>;

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
  const initialCompareIds = useMemo(
    () => getCompareIdsFromSearch(locationSearch),
    [locationSearch],
  );
  const [analysis, setAnalysis] = useState<ForensicAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<ForensicMetricRecord | null>(null);
  const [summary, setSummary] = useState<ForensicMetricRecord | null>(null);
  const [topJs, setTopJs] = useState<ForensicMetricRecord[]>([]);
  const [topDensity, setTopDensity] = useState<ForensicMetricRecord[]>([]);
  const [topRisk, setTopRisk] = useState<ForensicMetricRecord[]>([]);
  const [compareAId, setCompareAId] = useState(initialCompareIds.compareAId);
  const [compareBId, setCompareBId] = useState(initialCompareIds.compareBId);
  const [compareA, setCompareA] = useState<ForensicMetricRecord | null>(null);
  const [compareB, setCompareB] = useState<ForensicMetricRecord | null>(null);
  const [quickMetrics, setQuickMetrics] = useState<Record<string, ForensicMetricRecord>>({});
  const [activeId, setActiveId] = useState(documentId);
  const [docMeta, setDocMeta] = useState<DocumentMeta>(null);
  const dashboardListsLoadedRef = useRef(false);

  useEffect(() => {
    setActiveId(documentId);
  }, [documentId]);

  useEffect(() => {
    const nextIds = getCompareIdsFromSearch(locationSearch);
    setCompareAId(nextIds.compareAId);
    setCompareBId(nextIds.compareBId);
  }, [locationSearch]);

  useEffect(() => {
    if (!activeId) {
      setDocMeta(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const data = (await apiClient.get<Record<string, any>>(`/evidence/${activeId}`, {
          cacheTtl: 30_000,
          signal: controller.signal,
        })) as Record<string, any>;
        const meta = (data.metadata || {}) as Record<string, any>;
        setDocMeta({
          source_collection: meta.source_collection || data.source_collection,
          source_original_url: meta.source_original_url,
          credibility_score: meta.credibility_score,
          sensitivity_flags: Array.isArray(meta.sensitivity_flags) ? meta.sensitivity_flags : [],
          filePath: data.filePath,
          originalFilePath: data.original_file_path || data.originalFilePath,
          cleanedPath: data.cleanedPath,
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Error fetching document metadata:', error);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [activeId]);

  useEffect(() => {
    if (!(activeTab === 'dashboard' && activeId)) return;

    const controller = new AbortController();

    (async () => {
      try {
        const nextMetrics = await apiClient.get<ForensicMetricRecord>(
          `/forensic/metrics/${activeId}`,
          {
            signal: controller.signal,
          },
        );
        setMetrics(nextMetrics);

        if (!summary) {
          const nextSummary = await apiClient.get<ForensicMetricRecord>(
            '/forensic/metrics-summary',
            {
              signal: controller.signal,
            },
          );
          setSummary(nextSummary);
        }

        if (!dashboardListsLoadedRef.current) {
          const [jsList, densityList, riskList] = await Promise.all([
            apiClient.get<{ data?: ForensicMetricRecord[] }>(
              '/forensic/metrics-list/top?by=js&limit=10',
              {
                signal: controller.signal,
              },
            ),
            apiClient.get<{ data?: ForensicMetricRecord[] }>(
              '/forensic/metrics-list/top?by=density&limit=10',
              {
                signal: controller.signal,
              },
            ),
            apiClient.get<{ data?: ForensicMetricRecord[] }>(
              '/forensic/metrics-list/top?by=risk&limit=10',
              {
                signal: controller.signal,
              },
            ),
          ]);
          if (!controller.signal.aborted) {
            setTopJs(jsList.data || []);
            setTopDensity(densityList.data || []);
            setTopRisk(riskList.data || []);
            dashboardListsLoadedRef.current = true;
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Error fetching forensic dashboard data:', error);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [activeId, activeTab, summary]);

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
      window.history.replaceState(null, '', url);
    } catch {
      // Ignore comparison fetch errors to keep the dashboard responsive.
    }
  }, [compareAId, compareBId]);

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
