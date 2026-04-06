import React, { Profiler, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Target, FileText, BookOpen, GripVertical, Plus } from 'lucide-react';
import { EvidenceItem, Hypothesis } from '../../types/investigation';
import { apiClient } from '../../services/apiClient';
import { PerformanceMonitor } from '../../utils/performanceMonitor';
import { DocumentModal } from '../documents/DocumentModal';
import { BoardOnboarding } from './BoardOnboarding';
import { useInvestigationBoard } from '../../domains/investigations';
import styles from './InvestigationBoard.module.css';

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
      <div className={styles.boardContainer}>
        <div className={styles.exportButtonWrapper}>
          <button
            onClick={() => window.open(`/api/investigations/${investigationId}/briefing`, '_blank')}
            className={styles.exportButton}
          >
            <FileText size={16} />
            Export Briefing
          </button>
        </div>

        <div className={styles.hypothesesColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.columnHeaderLeft}>
              <Target size={20} className={styles.iconPurple} />
              <h3 className={styles.columnTitle}>Hypotheses</h3>
            </div>
            <button onClick={() => setShowHypothesisModal(true)} className={styles.addColumnButton}>
              <Plus size={16} />
            </button>
          </div>

          {showHypothesisModal && (
            <div className={styles.hypothesisFormWrapper}>
              <input
                type="text"
                placeholder="Theory title..."
                className={styles.formInput}
                value={newHypothesisTitle}
                onChange={(e) => setNewHypothesisTitle(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="Description..."
                className={styles.formTextarea}
                rows={2}
                value={newHypothesisDesc}
                onChange={(e) => setNewHypothesisDesc(e.target.value)}
              />
              <div className={styles.formActions}>
                <button
                  onClick={() => setShowHypothesisModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHypothesis}
                  disabled={!newHypothesisTitle.trim()}
                  className={styles.submitHypothesisButton}
                >
                  Add Theory
                </button>
              </div>
            </div>
          )}

          <div ref={hypothesesContainerRef} className={styles.columnScrollArea}>
            {loadingShell && (
              <div className={styles.skeletonGroup}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`hyp-skeleton-${i}`} className={styles.hypothesisSkeleton} />
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
                    className={styles.hypothesisCard}
                  >
                    <h4 className={styles.hypothesisCardTitle}>{hypothesis.title}</h4>
                    <p className={styles.hypothesisCardDesc}>{hypothesis.description}</p>
                    <div className={styles.hypothesisMeta}>
                      <div className={styles.hypothesisMetaRow}>
                        <span>{hypothesis.evidenceLinks?.length || 0} Evidence</span>
                        <span
                          className={`${styles.hypothesisStatusBadge} ${hypothesis.status === 'confirmed' ? styles.statusConfirmed : styles.statusDefault}`}
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
              <div className={styles.emptyColumnState}>
                <Target size={32} className={styles.emptyColumnIcon} />
                <p className={styles.emptyColumnTitle}>No hypotheses yet</p>
                <p className={styles.emptyColumnSubtext}>
                  Click the + button above to define a theory to test.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.evidenceColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.columnHeaderLeft}>
              <FileText size={20} style={{ color: 'var(--accent)' }} />
              <h3 className={styles.columnTitle}>Evidence Pool</h3>
            </div>
            <div className={styles.evidenceCount}>
              {evidence.length}/{evidenceTotal} loaded
            </div>
          </div>
          <div ref={evidenceContainerRef} className={styles.columnScrollArea}>
            {loadingShell && (
              <div className={styles.skeletonGroup}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`ev-skeleton-${i}`} className={styles.evidenceSkeleton} />
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
                    className={styles.evidenceCard}
                  >
                    <GripVertical
                      size={16}
                      style={{ color: 'var(--text-primary)', marginTop: '0.25rem' }}
                    />
                    <div>
                      <h4 className={styles.evidenceCardTitle}>{e.title}</h4>
                      <p className={styles.evidenceCardDesc}>{e.description}</p>
                      <span className={styles.evidenceTypeBadge}>{e.type}</span>
                    </div>
                  </div>
                ))}
                {evidenceVirtual.bottomSpacer > 0 && (
                  <div style={{ height: evidenceVirtual.bottomSpacer }} />
                )}
              </>
            )}

            {!loadingShell && evidence.length === 0 && (
              <div className={styles.emptyEvidenceState}>
                <FileText
                  size={32}
                  style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}
                />
                <p className={styles.emptyColumnTitle}>Evidence Pool is empty</p>
                <p className={`${styles.emptyColumnSubtext} ${styles.emptyEvidenceMaxWidth}`}>
                  Browse documents or entities and click "Add to Investigation" to collect them
                  here.
                </p>
              </div>
            )}

            {!loadingShell && evidence.length < evidenceTotal && (
              <button
                onClick={() => loadEvidencePage(evidenceOffset, false)}
                disabled={isLoadingMoreEvidence}
                className={styles.loadMoreButton}
              >
                {isLoadingMoreEvidence ? 'Loading more evidence...' : 'Load more evidence'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.narrativeColumn}>
          <div className={styles.columnHeader}>
            <div className={styles.columnHeaderLeft}>
              <BookOpen size={20} className={styles.iconAmber} />
              <h3 className={styles.columnTitle}>Case Narrative</h3>
            </div>
          </div>
          <div
            className={styles.narrativeScrollArea}
            onDragOver={handleDragOver}
            onDrop={handleDropOnNotebook}
          >
            <div className={styles.narrativeDropZone}>
              {notebook.length === 0 && (
                <span className={styles.narrativeDropPrompt}>
                  Drag evidence here to build your case
                </span>
              )}

              <div className={styles.notebookItems}>
                {notebook.map((itemId, idx) => {
                  const ev = evidence.find((entry) => Number(entry.id) === Number(itemId));
                  return (
                    <div key={`${itemId}-${idx}`} className={styles.notebookItem}>
                      <div className={styles.notebookItemHeader}>
                        <span className={styles.notebookItemIndex}>{idx + 1}.</span>
                        {ev ? (
                          <div>
                            <h4 className={styles.notebookItemTitle}>{ev.title}</h4>
                            <p className={styles.notebookItemDesc}>{ev.description}</p>
                          </div>
                        ) : (
                          <span className={styles.notebookItemPlaceholder}>
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
              <p className={styles.hydratingText}>Hydrating full board details...</p>
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
