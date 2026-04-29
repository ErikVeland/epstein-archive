import { useCallback, useEffect, useState } from 'react';
import type { EvidenceItem, Hypothesis } from '@client/types/investigation';
import { investigationsApi } from '../investigations.api';
import { normalizeEvidencePage } from '../investigations.model';
import { PerformanceMonitor } from '@client/utils/performanceMonitor';

const PAGE_SIZE = 120;
const ensureArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

type RequestIdleCallbackFn = (cb: () => void, opts?: { timeout: number }) => number;

const invokeIdle = (cb: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window.requestIdleCallback as RequestIdleCallbackFn)(cb, { timeout: 300 });
    return;
  }
  setTimeout(cb, 0);
};

export const useInvestigationBoard = (investigationId: string) => {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [notebook, setNotebook] = useState<number[]>([]);
  const [evidenceTotal, setEvidenceTotal] = useState(0);
  const [loadingShell, setLoadingShell] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [hasLoadedDetails, setHasLoadedDetails] = useState(false);
  const [isLoadingMoreEvidence, setIsLoadingMoreEvidence] = useState(false);
  const [evidenceOffset, setEvidenceOffset] = useState(0);

  const normalizeBoardEvidence = useCallback(
    (row: Record<string, unknown>): EvidenceItem => ({
      id: String(row.id),
      title: String(row.title || 'Untitled evidence'),
      description: String(row.description || ''),
      type: ((row.type as string) || 'document') as EvidenceItem['type'],
      sourceId: String(row.source_id || row.sourceId || row.id || ''),
      source: String(row.sourcePath || row.source || ''),
      relevance: ((row.relevance as string) || 'medium') as EvidenceItem['relevance'],
      credibility: 'verified',
      extractedAt: new Date((row.extractedAt as string) || Date.now()),
      extractedBy: String(row.extractedBy || 'system'),
    }),
    [],
  );

  const loadEvidencePage = useCallback(
    async (offset: number, reset = false) => {
      setIsLoadingMoreEvidence(true);
      try {
        const page = await investigationsApi.getEvidencePage(investigationId, {
          limit: PAGE_SIZE,
          offset,
        });
        const normalizedPage = normalizeEvidencePage(page);
        setEvidence((prev) => (reset ? normalizedPage.data : [...prev, ...normalizedPage.data]));
        setEvidenceOffset(offset + normalizedPage.data.length);
        setEvidenceTotal(Number(normalizedPage.total || normalizedPage.data.length));
      } finally {
        setIsLoadingMoreEvidence(false);
      }
    },
    [investigationId],
  );

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      PerformanceMonitor.mark('investigation-board-fetch-start');
      setLoadingShell(true);
      setHasLoadedDetails(false);
      setEvidence([]);
      setEvidenceOffset(0);

      try {
        const snapshot = (await investigationsApi.getBoard(investigationId, {
          evidenceLimit: 80,
          hypothesisLimit: 24,
        })) as Record<string, unknown>;
        if (!mounted) return;

        const previewEvidence = ensureArray<Record<string, unknown>>(snapshot?.evidencePreview).map(
          normalizeBoardEvidence,
        );
        const previewHypotheses = ensureArray<Record<string, unknown>>(
          snapshot?.hypothesesPreview,
        ).map((h) => ({
          id: String(h.id),
          investigationId,
          title: String(h.title || 'Untitled hypothesis'),
          description: String(h.description || ''),
          status: String(h.status || 'proposed'),
          evidence: [],
          confidence: Number(h.confidence || 0),
          createdBy: 'system',
          createdAt: new Date(),
          relatedHypotheses: [],
        }));

        setHypotheses(previewHypotheses as Hypothesis[]);
        setEvidence(previewEvidence as EvidenceItem[]);
        setEvidenceOffset(previewEvidence.length);
        setEvidenceTotal(Number(snapshot?.evidenceCount || previewEvidence.length));
        setNotebook(ensureArray<number>(snapshot?.notebookOrder || []));

        PerformanceMonitor.mark('investigation-board-shell-visible');
        PerformanceMonitor.measure(
          'investigation-board-shell-visible-duration',
          'investigation-board-fetch-start',
          'investigation-board-shell-visible',
        );
      } finally {
        if (mounted) setLoadingShell(false);
      }

      invokeIdle(async () => {
        if (!mounted) return;
        setLoadingDetails(true);
        PerformanceMonitor.mark('investigation-board-hydration-start');
        try {
          const [hypRes, nbRes] = await Promise.all([
            investigationsApi.getHypotheses(investigationId),
            investigationsApi.getNotebook(investigationId),
          ]);

          if (!mounted) return;

          const fullHypotheses = ensureArray<Record<string, unknown>>(hypRes).map((h) => ({
            ...h,
            id: String(h.id),
            investigationId,
            evidence: ensureArray(h.evidence),
            relatedHypotheses: ensureArray(h.relatedHypotheses),
            createdAt: new Date((h.created_at as string | number) || Date.now()),
            createdBy: String(h.created_by || 'system'),
            confidence: Number(h.confidence || 0),
            status: String(h.status || 'proposed'),
          }));

          setHypotheses(fullHypotheses as Hypothesis[]);
          if (Array.isArray(nbRes?.order)) setNotebook(nbRes.order);

          await loadEvidencePage(0, true);

          PerformanceMonitor.mark('investigation-board-hydration-end');
          PerformanceMonitor.measure(
            'investigation-board-hydration-duration',
            'investigation-board-hydration-start',
            'investigation-board-hydration-end',
          );
          setHasLoadedDetails(true);
        } catch (error) {
          console.error('Failed to hydrate investigation board details', error);
        } finally {
          if (mounted) setLoadingDetails(false);
        }
      });
    };

    void hydrate();
    return () => {
      mounted = false;
    };
  }, [investigationId, loadEvidencePage, normalizeBoardEvidence]);

  return {
    hypotheses,
    setHypotheses,
    evidence,
    notebook,
    setNotebook,
    evidenceTotal,
    loadingShell,
    loadingDetails,
    hasLoadedDetails,
    isLoadingMoreEvidence,
    evidenceOffset,
    loadEvidencePage,
  };
};
