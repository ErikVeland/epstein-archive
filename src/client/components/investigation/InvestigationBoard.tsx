import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Icon from '@client/components/common/Icon';
import { EvidenceItem, Hypothesis } from '@client/types/investigation';
import { apiClient } from '@client/services/apiClient';
import { DocumentModal } from '../documents/DocumentModal';
import { BoardOnboarding } from './BoardOnboarding';
import { useInvestigationBoard } from '@client/domains/investigations';

// UI Library
import styles from './InvestigationBoard.module.css';
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  LqText,
  Skeleton,
  Stack,
  Surface,
  Textarea,
} from '@client/design-system/lib';
const css = <T,>(style: T) => style;

interface InvestigationBoardProps {
  investigationId: string;
}

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

interface HypothesisWithLinks extends Hypothesis {
  evidenceLinks?: Array<{
    id: string;
    evidenceId: string;
    evidence_title: string;
    relevance: string;
  }>;
}

interface CreateHypothesisResponse {
  id: string | number;
  title: string;
  description?: string;
  status: string;
}

export const InvestigationBoard: React.FC<InvestigationBoardProps> = ({ investigationId }) => {
  const {
    hypotheses,
    setHypotheses,
    evidence,
    notebook,
    setNotebook,
    evidenceTotal,
    loadingShell,
    hasLoadedDetails,
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

  const evidenceRef = useRef<HTMLDivElement | null>(null);
  const hypothesesRef = useRef<HTMLDivElement | null>(null);

  const evidenceVirtual = useVirtualWindow(evidence.length, 88);
  const hypothesesVirtual = useVirtualWindow(hypotheses.length, 134);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('board_onboarding_seen', 'true');
  };

  useEffect(() => {
    const node = evidenceRef.current;
    if (!node) return;
    const onScroll = () => evidenceVirtual.setScrollTop(node.scrollTop);
    evidenceVirtual.setContainerHeight(node.clientHeight || 520);
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [evidenceVirtual]);

  useEffect(() => {
    const node = hypothesesRef.current;
    if (!node) return;
    const onScroll = () => hypothesesVirtual.setScrollTop(node.scrollTop);
    hypothesesVirtual.setContainerHeight(node.clientHeight || 520);
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [hypothesesVirtual]);

  const displayedHypotheses = useMemo(
    () => hypotheses.slice(hypothesesVirtual.startIndex, hypothesesVirtual.endIndex),
    [hypotheses, hypothesesVirtual],
  );
  const displayedEvidence = useMemo(
    () => evidence.slice(evidenceVirtual.startIndex, evidenceVirtual.endIndex),
    [evidence, evidenceVirtual],
  );

  const handleCreateHypothesis = async () => {
    if (!newHypothesisTitle.trim()) return;
    try {
      const created = await apiClient.post<CreateHypothesisResponse>(
        `/investigations/${investigationId}/hypotheses`,
        {
          title: newHypothesisTitle,
          description: newHypothesisDesc,
          status: 'draft',
        },
      );
      setHypotheses((prev: Hypothesis[]) => [
        {
          id: String(created.id),
          investigationId,
          title: created.title,
          description: created.description || '',
          status: (created.status || 'proposed') as Hypothesis['status'],
          evidence: [],
          evidenceIds: [],
          timelineEventIds: [],
          confidence: 0,
          createdBy: '',
          createdAt: new Date(),
          relatedHypotheses: [],
        },
        ...prev,
      ]);
      setShowHypothesisModal(false);
      setNewHypothesisTitle('');
      setNewHypothesisDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDropOnHypothesis = async (hypothesisId: string) => {
    if (!draggedEvidence) return;
    try {
      await apiClient.post(
        `/investigations/${investigationId}/hypotheses/${hypothesisId}/evidence`,
        { evidenceId: draggedEvidence.id, relevance: 'supporting' },
      );
      setHypotheses((prev: Hypothesis[]) =>
        prev.map((h: Hypothesis) =>
          String(h.id) === String(hypothesisId)
            ? ({
                ...h,
                evidenceIds: [...(h.evidenceIds || []), draggedEvidence.id],
              } as Hypothesis)
            : h,
        ),
      );
    } catch (err) {
      console.error(err);
    }
    setDraggedEvidence(null);
  };

  return (
    <Box
      fullHeight
      flex
      direction="column"
      bgcolor="var(--lq-surface-1)"
      className={styles.autoGen149}
    >
      {/* HUD Header */}
      <Surface variant="glass" p="lg" className={styles.autoGen150}>
        <Flex justify="between" align="center">
          <Flex align="center" gap="xl">
            <Stack gap="none">
              <Flex align="center" gap="md">
                <Icon name="Layers" size="md" className={styles.autoGen151} />
                <LqText variant="small" weight="bold">
                  Mission Control Board
                </LqText>
              </Flex>
              <LqText
                variant="xs"
                color="muted"
                style={css({ textTransform: 'uppercase' })}
                weight="bold"
              >
                Strategic Evidence Orchestration Layer
              </LqText>
            </Stack>
            <Box className={styles.autoGen152}>
              <Flex gap="md" align="center" className={styles.autoGen153}>
                <Icon name="Activity" size="sm" className={styles.autoGen154} />
                <LqText variant="xs">Connection: Synchronized</LqText>
                <LqText variant="xs" color="muted" ml="md">
                  Payload: {evidenceTotal} Signals Detected
                </LqText>
              </Flex>
            </Box>
          </Flex>
          <Button
            variant="secondary"
            onClick={() => window.open(`/api/investigations/${investigationId}/briefing`, '_blank')}
          >
            <Icon name="Download" size="sm" className={styles.mr2} /> Export Strategic Briefing
          </Button>
        </Flex>
      </Surface>

      <Flex grow className={styles.autoGen155}>
        {/* Column 1: Hypotheses */}
        <Surface variant="glass-highlight" width={400} className={styles.autoGen156}>
          <Stack style={css({ height: '100%' })}>
            <Flex justify="between" align="center" p="lg" className={styles.autoGen157}>
              <Flex align="center" gap="md">
                <Icon name="Target" size="md" className={styles.autoGen158} />
                <LqText variant="xs" weight="bold" style={css({ textTransform: 'uppercase' })}>
                  Theories & Hypotheses
                </LqText>
              </Flex>
              <Button variant="ghost" size="sm" onClick={() => setShowHypothesisModal(true)}>
                <Icon name="Plus" size="sm" />
              </Button>
            </Flex>

            {showHypothesisModal && (
              <Box p="lg" className={styles.autoGen159}>
                <Stack gap="md">
                  <Input
                    style={css({
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                    })}
                    placeholder="Theoretical Designation..."
                    value={newHypothesisTitle}
                    onChange={(e) => setNewHypothesisTitle(e.target.value)}
                    autoFocus
                  />
                  <Textarea
                    placeholder="Narrative description..."
                    rows={2}
                    value={newHypothesisDesc}
                    onChange={(e) => setNewHypothesisDesc(e.target.value)}
                  />
                  <Flex justify="end" gap="sm">
                    <Button variant="ghost" size="sm" onClick={() => setShowHypothesisModal(false)}>
                      Abort
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCreateHypothesis}
                      disabled={!newHypothesisTitle.trim()}
                    >
                      Initialize
                    </Button>
                  </Flex>
                </Stack>
              </Box>
            )}

            <Box grow ref={hypothesesRef} className={styles.autoGen160}>
              {loadingShell ? (
                <Stack gap="md">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height={120} />
                  ))}
                </Stack>
              ) : hypotheses.length === 0 ? (
                <Stack align="center" justify="center" p="xxxl" gap="md">
                  <Icon name="Search" size="xl" className={styles.autoGen161} />
                  <LqText variant="xs" color="muted" style={css({ textAlign: 'center' })}>
                    No active theories defined. Initialize a hypothesis to begin correlation.
                  </LqText>
                </Stack>
              ) : (
                <Stack gap="md">
                  {hypothesesVirtual.topSpacer > 0 && (
                    <Box style={css({ height: hypothesesVirtual.topSpacer })} />
                  )}
                  {displayedHypotheses.map((h: HypothesisWithLinks) => (
                    <Surface
                      key={h.id}
                      variant="glass"
                      p="md"
                      className={styles.autoGen162}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropOnHypothesis(String(h.id))}
                    >
                      <Stack gap="xs">
                        <Flex justify="between">
                          <LqText variant="small" weight="bold">
                            {h.title}
                          </LqText>
                          <Badge
                            variant={h.status === 'confirmed' ? 'success' : 'accent'}
                            label={h.status.toUpperCase()}
                            size="sm"
                          />
                        </Flex>
                        <LqText variant="xs" color="muted">
                          {h.description}
                        </LqText>
                        <Flex justify="between" mt="sm" pt="sm" className={styles.autoGen163}>
                          <LqText variant="xs" weight="bold">
                            {h.evidenceLinks?.length || 0} Signals Linked
                          </LqText>
                          <Icon name="FileSignature" size="xs" className={styles.autoGen164} />
                        </Flex>
                      </Stack>
                    </Surface>
                  ))}
                  {hypothesesVirtual.bottomSpacer > 0 && (
                    <Box style={css({ height: hypothesesVirtual.bottomSpacer })} />
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </Surface>

        {/* Column 2: Evidence Pool */}
        <Surface variant="glass-highlight" width={400} className={styles.autoGen165}>
          <Stack style={css({ height: '100%' })}>
            <Flex justify="between" align="center" p="lg" className={styles.autoGen166}>
              <Flex align="center" gap="md">
                <Icon name="FileText" size="md" className={styles.autoGen167} />
                <LqText variant="xs" weight="bold" style={css({ textTransform: 'uppercase' })}>
                  Evidence Matrix
                </LqText>
              </Flex>
              <LqText variant="xs" color="muted" weight="bold">
                {evidence.length} / {evidenceTotal}
              </LqText>
            </Flex>

            <Box grow ref={evidenceRef} className={styles.autoGen168}>
              {loadingShell ? (
                <Stack gap="md">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={80} />
                  ))}
                </Stack>
              ) : evidence.length === 0 ? (
                <Stack align="center" justify="center" p="xxxl" gap="md">
                  <Icon name="FileText" size="xl" className={styles.autoGen169} />
                  <LqText variant="xs" color="muted" style={css({ textAlign: 'center' })}>
                    Storage buffer clear. Add signals from the database to populate.
                  </LqText>
                </Stack>
              ) : (
                <Stack gap="sm">
                  {evidenceVirtual.topSpacer > 0 && (
                    <Box style={css({ height: evidenceVirtual.topSpacer })} />
                  )}
                  {displayedEvidence.map((e) => (
                    <Surface
                      key={e.id}
                      variant="glass"
                      p="md"
                      draggable
                      className={styles.autoGen170}
                      onDragStart={(ev) => {
                        setDraggedEvidence(e);
                        ev.dataTransfer.setData('application/json', JSON.stringify(e));
                      }}
                      onClick={() => setViewingEvidence(e)}
                    >
                      <Flex gap="md" align="center">
                        <Icon name="GripVertical" size="sm" className={styles.autoGen171} />
                        <Stack gap="none" style={css({ flex: 1 })}>
                          <LqText variant="xs" weight="bold">
                            {e.title}
                          </LqText>
                          <LqText variant="xs" color="muted">
                            {e.description}
                          </LqText>
                          <Box mt="xs">
                            <Badge variant="glass" label={e.type.toUpperCase()} size="sm" />
                          </Box>
                        </Stack>
                      </Flex>
                    </Surface>
                  ))}
                  {evidenceVirtual.bottomSpacer > 0 && (
                    <Box style={css({ height: evidenceVirtual.bottomSpacer })} />
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </Surface>

        {/* Column 3: Case Narrative */}
        <Surface variant="glass-highlight" grow className={styles.autoGen172}>
          <Stack style={css({ height: '100%' })}>
            <Flex align="center" gap="md" p="lg" className={styles.autoGen173}>
              <Icon name="BookOpen" size="md" className={styles.autoGen174} />
              <LqText variant="xs" weight="bold" style={css({ textTransform: 'uppercase' })}>
                Strategic Workspace Narrative
              </LqText>
            </Flex>

            <Box
              grow
              className={styles.autoGen175}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async () => {
                if (!draggedEvidence) return;
                const updated = [...notebook, Number(draggedEvidence.id)];
                await apiClient.updateInvestigationNotebook(investigationId, { order: updated });
                setNotebook(updated);
                setDraggedEvidence(null);
              }}
            >
              {notebook.length === 0 ? (
                <Box className={styles.autoGen176}>
                  <Surface variant="glass" p="xxxl" className={styles.autoGen177}>
                    <Icon name="BookOpen" size="xl" className={styles.autoGen178} />
                    <LqText variant="small" weight="bold">
                      Narrative Sequencer
                    </LqText>
                    <LqText variant="xs" color="muted" mt="sm">
                      Drag evidence signals from the pool to construct a sequential chain of proof
                      for the case briefing.
                    </LqText>
                  </Surface>
                </Box>
              ) : (
                <Stack gap="lg">
                  {notebook.map((id, idx) => {
                    const ev = evidence.find((e) => Number(e.id) === Number(id));
                    return (
                      <Surface
                        key={`${id}-${idx}`}
                        variant="glass"
                        p="lg"
                        className={styles.autoGen179}
                      >
                        <Box className={styles.autoGen180}>{idx + 1}</Box>
                        {ev ? (
                          <Stack gap="xs">
                            <LqText variant="small" weight="bold">
                              {ev.title}
                            </LqText>
                            <LqText variant="xs" color="muted" lineHeight="relaxed">
                              {ev.description}
                            </LqText>
                          </Stack>
                        ) : (
                          <Skeleton height={40} />
                        )}
                      </Surface>
                    );
                  })}
                  {!hasLoadedDetails && (
                    <LqText
                      variant="xs"
                      color="muted"
                      style={css({ textAlign: 'center', padding: 'var(--lq-space-lg) 0' })}
                    >
                      Hydrating high-fidelity signal metrics...
                    </LqText>
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </Surface>
      </Flex>

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
    </Box>
  );
};
