import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Icon from '@client/components/common/Icon';
import { EvidenceItem, Hypothesis } from '@client/types/investigation';
import { apiClient } from '@client/services/apiClient';
import { DocumentModal } from '@client/components/documents/DocumentModal';
import { useInvestigationBoard } from '@client/domains/investigations';

// UI Library
import styles from './InvestigationBoard.module.css';
import {
  Badge,
  Box,
  Button,
  Flex,
  LqText,
  Select,
  Skeleton,
  Stack,
  Surface,
  TextInput,
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

  const evidenceRef = useRef<HTMLDivElement | null>(null);
  const hypothesesRef = useRef<HTMLDivElement | null>(null);

  const evidenceVirtual = useVirtualWindow(evidence.length, 88);
  const hypothesesVirtual = useVirtualWindow(hypotheses.length, 134);

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

  const linkEvidenceToHypothesis = async (hypothesisId: string, evidenceItem: EvidenceItem) => {
    try {
      await apiClient.post(
        `/investigations/${investigationId}/hypotheses/${hypothesisId}/evidence`,
        { evidenceId: evidenceItem.id, relevance: 'supporting' },
      );
      setHypotheses((prev: Hypothesis[]) =>
        prev.map((h: Hypothesis) =>
          String(h.id) === String(hypothesisId)
            ? ({
                ...h,
                evidenceIds: [...(h.evidenceIds || []), evidenceItem.id],
              } as Hypothesis)
            : h,
        ),
      );
    } catch (err) {
      console.error(err);
    }
    setDraggedEvidence(null);
  };

  const handleDropOnHypothesis = async (hypothesisId: string) => {
    if (!draggedEvidence) return;
    await linkEvidenceToHypothesis(hypothesisId, draggedEvidence);
  };

  const addEvidenceToNarrative = async (evidenceItem: EvidenceItem) => {
    const evidenceId = Number(evidenceItem.id);
    if (!Number.isFinite(evidenceId)) return;
    const updated = [...notebook.filter((id) => id !== evidenceId), evidenceId];
    await apiClient.updateInvestigationNotebook(investigationId, { order: updated });
    setNotebook(updated);
  };

  const removeEvidenceFromNarrative = async (evidenceId: number) => {
    const updated = notebook.filter((id) => id !== evidenceId);
    await apiClient.updateInvestigationNotebook(investigationId, { order: updated });
    setNotebook(updated);
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
                  Case board
                </LqText>
              </Flex>
              <LqText
                variant="xs"
                color="muted"
                style={css({ textTransform: 'uppercase' })}
                weight="bold"
              >
                Connect evidence to hypotheses and order the case narrative
              </LqText>
            </Stack>
            <Box className={styles.autoGen152}>
              <Flex gap="md" align="center" className={styles.autoGen153}>
                <Icon name="Activity" size="sm" className={styles.autoGen154} />
                <LqText variant="xs">Case data loaded</LqText>
                <LqText variant="xs" color="muted" ml="md">
                  {evidenceTotal} evidence items
                </LqText>
              </Flex>
            </Box>
          </Flex>
          <Button
            variant="secondary"
            onClick={() => window.open(`/api/investigations/${investigationId}/briefing`, '_blank')}
          >
            <Icon name="Download" size="sm" className={styles.mr2} /> Export briefing
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHypothesisModal(true)}
                data-testid="add-hypothesis-btn"
              >
                <Icon name="Plus" size="sm" />
              </Button>
            </Flex>

            {showHypothesisModal && (
              <Box p="lg" className={styles.autoGen159}>
                <Stack gap="md">
                  <TextInput
                    id="board-hypothesis-title"
                    label="Hypothesis title"
                    placeholder="Enter a focused, testable statement"
                    value={newHypothesisTitle}
                    onChange={(e) => setNewHypothesisTitle(e.target.value)}
                    autoFocus
                  />
                  <Textarea
                    id="board-hypothesis-description"
                    label="Context (optional)"
                    placeholder="Explain what would support or contradict it"
                    rows={2}
                    value={newHypothesisDesc}
                    onChange={(e) => setNewHypothesisDesc(e.target.value)}
                  />
                  <Flex justify="end" gap="sm">
                    <Button variant="ghost" size="sm" onClick={() => setShowHypothesisModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCreateHypothesis}
                      disabled={!newHypothesisTitle.trim()}
                    >
                      Add hypothesis
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
                    No hypotheses yet. Add one to start testing the evidence.
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
                  Evidence
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
                    No evidence has been added to this case.
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
                          <Flex gap="sm" mt="sm" wrap="wrap">
                            <Button size="sm" variant="ghost" onClick={() => setViewingEvidence(e)}>
                              Open record
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void addEvidenceToNarrative(e)}
                            >
                              Add to narrative
                            </Button>
                            {hypotheses.length > 0 && (
                              <Select
                                size="sm"
                                aria-label={`Link ${e.title} to a hypothesis`}
                                value=""
                                onChange={(event) => {
                                  if (event.target.value) {
                                    void linkEvidenceToHypothesis(event.target.value, e);
                                  }
                                }}
                                options={[
                                  { value: '', label: 'Link to hypothesis…' },
                                  ...hypotheses.map((hypothesis) => ({
                                    value: String(hypothesis.id),
                                    label: hypothesis.title,
                                  })),
                                ]}
                              />
                            )}
                          </Flex>
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
                Case narrative
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
                      Add evidence from the evidence column to build the case narrative.
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void removeEvidenceFromNarrative(Number(id))}
                            >
                              Remove from narrative
                            </Button>
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
                      Loading full evidence details…
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

      <AnimatePresence></AnimatePresence>
    </Box>
  );
};
