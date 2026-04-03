import React, { Profiler, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Target, FileText, BookOpen, GripVertical, Plus } from 'lucide-react';
import { EvidenceItem, Hypothesis } from '../../types/investigation';
import { apiClient } from '../../services/apiClient';
import { PerformanceMonitor } from '../../utils/performanceMonitor';
import { DocumentModal } from '../documents/DocumentModal';
import { BoardOnboarding } from './BoardOnboarding';
import { useInvestigationBoard } from '../../domains/investigations';

interface InvestigationBoardProps {
  investigationId: string;
}

interface HypothesisEvidenceLink {
  id: string;
  evidenceId: string;
  evidence_title?: string;
  relevance: string;
}

type HypothesisWithLinks = Hypothesis & {
  evidenceLinks?: HypothesisEvidenceLink[];
};

const useVirtualWindow = (itemCount: number, rowHeight: number, overscan = 6) => {
  const [containerHeight, setContainerHeight] = useState(520);
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    topSpacer: startIndex * rowHeight,
    bottomSpacer: Math.max(0, (itemCount - endIndex) * rowHeight),
    setContainerHeight,
    setScrollTop,
  };
};

export const InvestigationBoard: React.FC<InvestigationBoardProps> = ({ investigationId }) => {
  const {
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
  } = useInvestigationBoard(investigationId);

  const [draggedEvidence, setDraggedEvidence] = useState<EvidenceItem | null>(null);
  const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);
  const [showHypothesisModal, setShowHypothesisModal] = useState(false);
  const [newHypothesisTitle, setNewHypothesisTitle] = useState('');
  const [newHypothesisDesc, setNewHypothesisDesc] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    const seen = localStorage.getItem('board_onboarding_seen');
    const investigationOnboardingSeen =
      localStorage.getItem('hasSeenInvestigationOnboarding') === 'true';
    return !seen && investigationOnboardingSeen;
  });

  const evidenceContainerRef = useRef<HTMLDivElement | null>(null);
  const hypothesesContainerRef = useRef<HTMLDivElement | null>(null);

  const evidenceVirtual = useVirtualWindow(evidence.length, 88);
  const hypothesesVirtual = useVirtualWindow(hypotheses.length, 134);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('board_onboarding_seen', 'true');
  };

  useEffect(() => {
    const node = evidenceContainerRef.current;
    if (!node) return;
    const onScroll = () => evidenceVirtual.setScrollTop(node.scrollTop);
    evidenceVirtual.setContainerHeight(node.clientHeight || 520);
    onScroll();
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [evidenceVirtual]);

  useEffect(() => {
    const node = hypothesesContainerRef.current;
    if (!node) return;
    const onScroll = () => hypothesesVirtual.setScrollTop(node.scrollTop);
    hypothesesVirtual.setContainerHeight(node.clientHeight || 520);
    onScroll();
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [hypothesesVirtual]);

  const displayedHypotheses = useMemo(
    () => hypotheses.slice(hypothesesVirtual.startIndex, hypothesesVirtual.endIndex),
    [hypotheses, hypothesesVirtual.endIndex, hypothesesVirtual.startIndex],
  );

  const displayedEvidence = useMemo(
    () => evidence.slice(evidenceVirtual.startIndex, evidenceVirtual.endIndex),
    [evidence, evidenceVirtual.endIndex, evidenceVirtual.startIndex],
  );

  const handleCreateHypothesis = async () => {
    if (!newHypothesisTitle.trim()) return;

    try {
      const created = await apiClient.post<{
        id: string | number;
        title: string;
        description?: string;
        status?: Hypothesis['status'];
      }>(`/investigations/${investigationId}/hypotheses`, {
        title: newHypothesisTitle,
        description: newHypothesisDesc,
        status: 'draft',
      });

      setHypotheses((prev: Hypothesis[]) => [
        {
          id: String(created.id),
          investigationId,
          title: created.title,
          description: created.description || '',
          status: created.status || 'proposed',
          evidence: [],
          confidence: 0,
          createdBy: 'current-user',
          createdAt: new Date(),
          relatedHypotheses: [],
        } as Hypothesis,
        ...prev,
      ]);
      setShowHypothesisModal(false);
      setNewHypothesisTitle('');
      setNewHypothesisDesc('');
    } catch (err) {
      console.error('Failed to create hypothesis', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: EvidenceItem) => {
    setDraggedEvidence(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropOnHypothesis = async (e: React.DragEvent, hypothesisId: string) => {
    e.preventDefault();
    if (!draggedEvidence) return;

    try {
      await apiClient.post(
        `/investigations/${investigationId}/hypotheses/${hypothesisId}/evidence`,
        {
          evidenceId: draggedEvidence.id,
          relevance: 'supporting',
        },
      );

      setHypotheses((prev: Hypothesis[]) =>
        prev.map((hypothesis: HypothesisWithLinks) => {
          if (String(hypothesis.id) !== String(hypothesisId)) return hypothesis;
          return {
            ...hypothesis,
            evidenceLinks: [
              ...(hypothesis.evidenceLinks || []),
              {
                id: `temp-${Date.now()}`,
                evidenceId: draggedEvidence.id,
                evidence_title: draggedEvidence.title,
                relevance: 'supporting',
              },
            ],
          };
        }),
      );
    } catch (err) {
      console.error('Failed to link evidence', err);
    }
    setDraggedEvidence(null);
  };

  const handleDropOnNotebook = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedEvidence) return;
    const evidenceId = Number(draggedEvidence.id);
    if (!Number.isFinite(evidenceId)) return;

    try {
      const newOrder = [...notebook, evidenceId];
      await apiClient.updateInvestigationNotebook(investigationId, { order: newOrder });
      setNotebook(newOrder);
    } catch (err) {
      console.error('Failed to update notebook', err);
    }
    setDraggedEvidence(null);
  };

  const onBoardRender = (
    _id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
  ): void => {
    const normalizedPhase: 'mount' | 'update' = phase === 'mount' ? 'mount' : 'update';
    PerformanceMonitor.logRender('InvestigationBoard', actualDuration, normalizedPhase);
  };

  return (
    <Profiler id="InvestigationBoard" onRender={onBoardRender}>
      <div className="flex h-full bg-[var(--glass-bg)] overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => window.open(`/api/investigations/${investigationId}/briefing`, '_blank')}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] hover:bg-indigo-700 text-[var(--text-primary)] text-sm rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)] transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export Briefing
          </button>
        </div>

        <div className="w-1/3 border-r border-[var(--glass-border)] flex flex-col min-w-[300px]">
          <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-[var(--text-primary)]">Hypotheses</h3>
            </div>
            <button
              onClick={() => setShowHypothesisModal(true)}
              className="p-1 hover:bg-[var(--glass-bg)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showHypothesisModal && (
            <div className="p-4 bg-[var(--glass-bg)]/50 border-b border-[var(--glass-border)] animate-in slide-in-from-top-2">
              <input
                type="text"
                placeholder="Theory title..."
                className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] mb-2 focus:ring-2 focus:ring-purple-500 outline-none"
                value={newHypothesisTitle}
                onChange={(e) => setNewHypothesisTitle(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="Description..."
                className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] mb-2 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                rows={2}
                value={newHypothesisDesc}
                onChange={(e) => setNewHypothesisDesc(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowHypothesisModal(false)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHypothesis}
                  disabled={!newHypothesisTitle.trim()}
                  className="bg-purple-600 hover:bg-purple-500 text-[var(--text-primary)] text-xs px-3 py-1 rounded disabled:opacity-50"
                >
                  Add Theory
                </button>
              </div>
            </div>
          )}

          <div
            ref={hypothesesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--glass-bg-strong)]/20"
          >
            {loadingShell && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`hyp-skeleton-${i}`}
                    className="h-28 rounded-[var(--radius-lg)] bg-[var(--glass-bg)]/70 border border-[var(--glass-border)] animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loadingShell && hypotheses.length > 0 && (
              <>
                {hypothesesVirtual.topSpacer > 0 && (
                  <div style={{ height: hypothesesVirtual.topSpacer }} />
                )}
                {displayedHypotheses.map((hypothesis: HypothesisWithLinks) => (
                  <div
                    key={hypothesis.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnHypothesis(e, String(hypothesis.id))}
                    className="p-4 rounded-[var(--radius-lg)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-purple-500/50 transition-colors group"
                  >
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">
                      {hypothesis.title}
                    </h4>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                      {hypothesis.description}
                    </p>
                    <div className="mt-3 text-xs text-[var(--text-muted)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span>{hypothesis.evidenceLinks?.length || 0} Evidence</span>
                        <span
                          className={`px-2 py-0.5 rounded-full ${hypothesis.status === 'confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-[var(--glass-bg-highlight)]'}`}
                        >
                          {hypothesis.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {hypothesesVirtual.bottomSpacer > 0 && (
                  <div style={{ height: hypothesesVirtual.bottomSpacer }} />
                )}
              </>
            )}

            {!loadingShell && hypotheses.length === 0 && (
              <div className="text-center p-8 text-[var(--text-muted)] border-2 border-dashed border-[var(--glass-border)] rounded-[var(--radius-lg)] flex flex-col items-center gap-2">
                <Target className="w-8 h-8 text-[var(--text-primary)] mb-2" />
                <p className="font-medium text-[var(--text-muted)]">No hypotheses yet</p>
                <p className="text-sm">Click the + button above to define a theory to test.</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3 border-r border-[var(--glass-border)] flex flex-col min-w-[300px] bg-[var(--glass-bg)]">
          <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Evidence Pool</h3>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {evidence.length}/{evidenceTotal} loaded
            </div>
          </div>
          <div ref={evidenceContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingShell && (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`ev-skeleton-${i}`}
                    className="h-20 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loadingShell && evidence.length > 0 && (
              <>
                {evidenceVirtual.topSpacer > 0 && (
                  <div style={{ height: evidenceVirtual.topSpacer }} />
                )}
                {displayedEvidence.map((e) => (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={(ev) => handleDragStart(ev, e)}
                    onClick={() => setViewingEvidence(e)}
                    className="p-3 rounded bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] hover:border-[var(--accent)]/50 cursor-grab active:cursor-grabbing flex items-start gap-3 group hover:bg-[var(--glass-bg)]/50 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-[var(--text-primary)] mt-1" />
                    <div>
                      <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {e.title}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-1">
                        {e.description}
                      </p>
                      <span className="inline-block mt-2 px-1.5 py-0.5 bg-[var(--glass-bg)] rounded text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        {e.type}
                      </span>
                    </div>
                  </div>
                ))}
                {evidenceVirtual.bottomSpacer > 0 && (
                  <div style={{ height: evidenceVirtual.bottomSpacer }} />
                )}
              </>
            )}

            {!loadingShell && evidence.length === 0 && (
              <div className="text-center p-8 text-[var(--text-muted)] flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-[var(--text-primary)] mb-2" />
                <p className="font-medium text-[var(--text-muted)]">Evidence Pool is empty</p>
                <p className="text-sm max-w-[200px]">
                  Browse documents or entities and click "Add to Investigation" to collect them
                  here.
                </p>
              </div>
            )}

            {!loadingShell && evidence.length < evidenceTotal && (
              <button
                onClick={() => loadEvidencePage(evidenceOffset, false)}
                disabled={isLoadingMoreEvidence}
                className="w-full py-2 rounded-md border border-[var(--glass-border)] text-sm text-[var(--text-primary)] hover:bg-[var(--glass-bg)] disabled:opacity-60"
              >
                {isLoadingMoreEvidence ? 'Loading more evidence...' : 'Load more evidence'}
              </button>
            )}
          </div>
        </div>

        <div className="w-1/3 flex flex-col min-w-[300px]">
          <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-[var(--text-primary)]">Case Narrative</h3>
            </div>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4 bg-[var(--glass-bg-strong)]/20"
            onDragOver={handleDragOver}
            onDrop={handleDropOnNotebook}
          >
            <div className="min-h-[200px] p-4 border-2 border-dashed border-[var(--glass-border)] rounded-[var(--radius-lg)] flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-[var(--glass-bg)]/30 transition-colors">
              {notebook.length === 0 && (
                <span className="mb-2">Drag evidence here to build your case</span>
              )}

              <div className="w-full space-y-2 mt-4">
                {notebook.map((itemId, idx) => {
                  const ev = evidence.find((entry) => Number(entry.id) === Number(itemId));
                  return (
                    <div
                      key={`${itemId}-${idx}`}
                      className="p-3 bg-[var(--glass-bg)] rounded border border-[var(--glass-border)] flex flex-col gap-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[var(--text-muted)] font-mono text-xs mt-0.5">
                          {idx + 1}.
                        </span>
                        {ev ? (
                          <div>
                            <h4 className="text-sm font-medium text-[var(--text-primary)]">
                              {ev.title}
                            </h4>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                              {ev.description}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--text-muted)]">
                            Loading item {itemId}...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {(loadingDetails || !hasLoadedDetails) && (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Hydrating full board details...
              </p>
            )}
          </div>
        </div>

        {viewingEvidence && (
          <DocumentModal id={String(viewingEvidence.id)} onClose={() => setViewingEvidence(null)} />
        )}

        <AnimatePresence>
          {showOnboarding && (
            <BoardOnboarding
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </Profiler>
  );
};
