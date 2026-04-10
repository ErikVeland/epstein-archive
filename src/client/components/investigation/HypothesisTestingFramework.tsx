import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Target,
  Plus,
  Trash2,
  Link,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw,
  TrendingUp,
  History,
} from 'lucide-react';
import { EvidenceItem } from '../../types/investigation';

// UI Library
import styles from './HypothesisTestingFramework.module.css';
import {
  Surface,
  Button,
  Flex,
  Box,
  Stack,
  LqText,
  Grid,
  cn,
  Badge,
} from '../../design-system/lib';

// Extended Hypothesis type with additional fields for testing
interface Hypothesis {
  id: string;
  investigationId?: string;
  title: string;
  description: string;
  status: 'draft' | 'testing' | 'supported' | 'refuted' | 'revised';
  evidenceLinks: EvidenceLink[];
  revisions: HypothesisRevision[];
  confidence?: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  evidence?: unknown[];
  relatedHypotheses?: unknown[];
}

interface EvidenceLink {
  id: string;
  evidenceId: string;
  hypothesisId: string;
  relevance: 'supporting' | 'contradicting' | 'neutral';
  weight: number; // 1-10
  notes: string;
  createdAt: Date;
}

interface HypothesisRevision {
  id: string;
  hypothesisId: string;
  title: string;
  description: string;
  confidence: number;
  reason: string;
  createdAt: Date;
  createdBy: string;
}

interface HypothesisTestingFrameworkProps {
  investigationId: string;
  initialHypothesis?: string;
  evidenceItems: EvidenceItem[];
  onHypothesesUpdate: (hypotheses: Hypothesis[]) => void;
}

const parseDate = (value: unknown): Date =>
  typeof value === 'string' || typeof value === 'number' || value instanceof Date
    ? new Date(value)
    : new Date();

interface RawHypothesis {
  id: number | string;
  title: string;
  description?: string;
  status?: string;
  confidence?: number;
  created_at?: string;
  updated_at?: string;
}

export const HypothesisTestingFramework: React.FC<HypothesisTestingFrameworkProps> = ({
  investigationId,
  initialHypothesis = '',
  evidenceItems,
  onHypothesesUpdate,
}) => {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [activeHypothesis, setActiveHypothesis] = useState<Hypothesis | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newHypothesis, setNewHypothesis] = useState({ title: '', description: '' });
  const [linkingEvidence, setLinkingEvidence] = useState<{ [key: string]: boolean }>({});
  const [linkData, setLinkData] = useState({
    evidenceId: '',
    relevance: 'supporting' as 'supporting' | 'contradicting' | 'neutral',
    weight: 5,
    notes: '',
  });

  const [hypothesesSeeded, setHypothesesSeeded] = useState(false);

  const { data: fetchedHypotheses } = useQuery({
    queryKey: ['investigation-hypotheses', investigationId],
    queryFn: async () => {
      const response = await fetch(`/api/investigations/${investigationId}/hypotheses`);
      if (!response.ok) return null;
      const data = await response.json();
      return (data || []) as RawHypothesis[];
    },
    enabled: Boolean(investigationId),
  });

  React.useEffect(() => {
    if (hypothesesSeeded || fetchedHypotheses === undefined) return;

    if (fetchedHypotheses && fetchedHypotheses.length > 0) {
      const loaded: Hypothesis[] = fetchedHypotheses.map((h) => ({
        id: `hyp-${h.id}`,
        investigationId,
        title: h.title,
        description: h.description || '',
        status: (h.status || 'proposed') as
          | 'draft'
          | 'testing'
          | 'supported'
          | 'refuted'
          | 'revised',
        confidence: h.confidence || 50,
        createdAt: parseDate(h.created_at),
        updatedAt: parseDate(h.updated_at),
        createdBy: 'System',
        evidenceLinks: [],
        revisions: [],
        evidence: [],
        relatedHypotheses: [],
      }));
      setHypotheses(loaded);
      setActiveHypothesis(loaded[0]);
      onHypothesesUpdate(loaded);
      setHypothesesSeeded(true);
    } else if (initialHypothesis && hypotheses.length === 0) {
      const def: Hypothesis = {
        id: 'hyp-1',
        investigationId,
        title: 'Primary Investigative Theory',
        description: initialHypothesis,
        status: 'testing',
        confidence: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'CurrentUser',
        evidenceLinks: [],
        revisions: [],
        evidence: [],
        relatedHypotheses: [],
      };
      setHypotheses([def]);
      setActiveHypothesis(def);
      onHypothesesUpdate([def]);
      setHypothesesSeeded(true);
    } else {
      setHypothesesSeeded(true);
    }
  }, [
    fetchedHypotheses,
    hypothesesSeeded,
    initialHypothesis,
    investigationId,
    onHypothesesUpdate,
    hypotheses.length,
  ]);

  const createHypothesis = () => {
    if (!newHypothesis.title.trim()) return;
    const hyp: Hypothesis = {
      id: `hyp-${crypto.randomUUID()}`,
      investigationId,
      title: newHypothesis.title,
      description: newHypothesis.description,
      status: 'draft',
      confidence: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'CurrentUser',
      evidenceLinks: [],
      revisions: [],
      evidence: [],
      relatedHypotheses: [],
    };
    const updated = [...hypotheses, hyp];
    setHypotheses(updated);
    setActiveHypothesis(hyp);
    setShowNewForm(false);
    setNewHypothesis({ title: '', description: '' });
    onHypothesesUpdate(updated);
  };

  const updateStatus = (
    id: string,
    status: 'draft' | 'testing' | 'supported' | 'refuted' | 'revised',
  ) => {
    const updated = hypotheses.map((h) =>
      h.id === id ? { ...h, status, updatedAt: new Date() } : h,
    );
    setHypotheses(updated);
    if (activeHypothesis?.id === id)
      setActiveHypothesis({ ...activeHypothesis, status, updatedAt: new Date() });
    onHypothesesUpdate(updated);
  };

  const linkEvidence = (id: string) => {
    if (!linkData.evidenceId) return;
    const link: EvidenceLink = {
      id: `link-${crypto.randomUUID()}`,
      evidenceId: linkData.evidenceId,
      hypothesisId: id,
      relevance: linkData.relevance,
      weight: linkData.weight,
      notes: linkData.notes,
      createdAt: new Date(),
    };
    const updated = hypotheses.map((h) =>
      h.id === id ? { ...h, evidenceLinks: [...h.evidenceLinks, link], updatedAt: new Date() } : h,
    );
    setHypotheses(updated);
    if (activeHypothesis?.id === id)
      setActiveHypothesis({
        ...activeHypothesis,
        evidenceLinks: [...activeHypothesis.evidenceLinks, link],
        updatedAt: new Date(),
      });
    setLinkingEvidence({ ...linkingEvidence, [id]: false });
    setLinkData({ evidenceId: '', relevance: 'supporting', weight: 5, notes: '' });
    onHypothesesUpdate(updated);
  };

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Surface variant="glass" p="xl" className={styles.autoGen132}>
        <Flex justify="between" align="center">
          <Stack gap="none">
            <Flex align="center" gap="md">
              <Target size={24} className={styles.autoGen133} />
              <LqText variant="h1" weight="bold">
                Hypothesis Testing Workbench
              </LqText>
            </Flex>
            <LqText variant="xs" color="muted" weight="bold" style={{ marginTop: 'xs' }}>
              Systematic Theory Analysis • Analytical Confidence Scoring
            </LqText>
          </Stack>
          <Button variant="secondary" size="sm" onClick={() => setShowNewForm(true)}>
            <Plus size={16} /> <span style={{ marginLeft: '0.5rem' }}>Initialize Theory</span>
          </Button>
        </Flex>
      </Surface>

      <Box p="xl">
        <Stack gap="xl">
          {/* New Hypothesis Entry */}
          {showNewForm && (
            <Surface variant="glass-highlight" p="xl" className={styles.autoGen134}>
              <Stack gap="md">
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Draft New Investigative Signal
                </LqText>
                <input
                  style={{
                    width: '100%',
                    background: 'var(--lq-surface-3)',
                    border: '1px solid var(--lq-surface-4)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--lq-text-primary)',
                    outline: 'none',
                  }}
                  placeholder="Theory Designation *"
                  value={newHypothesis.title}
                  onChange={(e) => setNewHypothesis({ ...newHypothesis, title: e.target.value })}
                />
                <textarea
                  style={{
                    width: '100%',
                    background: 'var(--lq-surface-3)',
                    border: '1px solid var(--lq-surface-4)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--lq-text-primary)',
                    outline: 'none',
                    resize: 'none',
                  }}
                  placeholder="Qualitative description of the hypothesis..."
                  rows={3}
                  value={newHypothesis.description}
                  onChange={(e) =>
                    setNewHypothesis({ ...newHypothesis, description: e.target.value })
                  }
                />
                <Flex justify="end" gap="md">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                    Abort
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={createHypothesis}
                    disabled={!newHypothesis.title.trim()}
                  >
                    Establish Hypothesis
                  </Button>
                </Flex>
              </Stack>
            </Surface>
          )}

          {/* Main List */}
          {hypotheses.length === 0 ? (
            <Surface variant="glass" p="xxxl">
              <Stack align="center" gap="lg">
                <Zap size={48} className={styles.autoGen135} />
                <LqText
                  variant="xs"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                  weight="bold"
                >
                  Intelligence Matrix Clear • Define Hypotheses
                </LqText>
              </Stack>
            </Surface>
          ) : (
            <Stack gap="md">
              {hypotheses.map((h) => {
                const isActive = activeHypothesis?.id === h.id;
                return (
                  <Surface
                    key={h.id}
                    variant="glass-highlight"
                    p="lg"
                    className={cn(
                      'border-l-4 transition-all',
                      isActive ? 'border-l-[var(--lq-accent)]' : 'border-l-[var(--lq-surface-3)]',
                    )}
                  >
                    <Stack gap="md">
                      <Flex
                        justify="between"
                        align="start"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setActiveHypothesis(isActive ? null : h)}
                      >
                        <Stack gap="sm" style={{ flex: 1 }}>
                          <Flex align="center" gap="md">
                            <LqText variant="small" weight="bold">
                              {h.title}
                            </LqText>
                            <Badge>{h.status.toUpperCase()}</Badge>
                          </Flex>
                          <LqText
                            variant="xs"
                            color="muted"
                            className={isActive ? '' : 'line-clamp-2'}
                          >
                            {h.description}
                          </LqText>
                        </Stack>
                        <Stack align="end" gap="xs">
                          <Flex align="center" gap="xs">
                            <TrendingUp
                              size={12}
                              className={cn(
                                (h.confidence ?? 0) > 70
                                  ? 'text-[var(--lq-success)]'
                                  : 'text-[var(--lq-accent)]',
                              )}
                            />
                            <LqText variant="xs" weight="bold">
                              {h.confidence ?? 0}% CONF
                            </LqText>
                          </Flex>
                          <Box className={styles.autoGen136}>
                            <Box
                              className={styles.autoGen137}
                              style={{ width: `${h.confidence ?? 0}%` }}
                            />
                          </Box>
                        </Stack>
                      </Flex>

                      {/* Expanded Analysis Workbench */}
                      {isActive && (
                        <Stack gap="xl" mt="lg" pt="xl" className={styles.autoGen138}>
                          <Flex justify="between" align="center">
                            <Flex align="center" gap="sm">
                              <Link size={14} className={styles.autoGen139} />
                              <LqText
                                variant="xs"
                                weight="bold"
                                color="muted"
                                style={{ textTransform: 'uppercase' }}
                              >
                                Evidence Correlation Layer
                              </LqText>
                            </Flex>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setLinkingEvidence({
                                  ...linkingEvidence,
                                  [h.id]: !linkingEvidence[h.id],
                                })
                              }
                            >
                              <Plus size={10} className="mr-1" /> Link Signal
                            </Button>
                          </Flex>

                          {/* Evidence Link Entry */}
                          {linkingEvidence[h.id] && (
                            <Surface variant="glass" p="lg" className={styles.autoGen140}>
                              <Grid cols={2} gap="md">
                                <Stack gap="xs">
                                  <LqText variant="xs" weight="bold">
                                    SELECT EVIDENCE
                                  </LqText>
                                  <select
                                    style={{
                                      width: '100%',
                                      background: 'var(--lq-surface-3)',
                                      border: '1px solid var(--lq-surface-4)',
                                      borderRadius: '0.375rem',
                                      padding: '0.5rem 0.75rem',
                                      fontSize: '0.875rem',
                                      color: 'var(--lq-text-primary)',
                                      outline: 'none',
                                    }}
                                    value={linkData.evidenceId}
                                    onChange={(e) =>
                                      setLinkData({ ...linkData, evidenceId: e.target.value })
                                    }
                                  >
                                    <option value="">Choose item...</option>
                                    {evidenceItems.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.title}
                                      </option>
                                    ))}
                                  </select>
                                </Stack>
                                <Stack gap="xs">
                                  <LqText variant="xs" weight="bold">
                                    SIGNAL RELEVANCE
                                  </LqText>
                                  <select
                                    style={{
                                      width: '100%',
                                      background: 'var(--lq-surface-3)',
                                      border: '1px solid var(--lq-surface-4)',
                                      borderRadius: '0.375rem',
                                      padding: '0.5rem 0.75rem',
                                      fontSize: '0.875rem',
                                      color: 'var(--lq-text-primary)',
                                      outline: 'none',
                                    }}
                                    value={linkData.relevance}
                                    onChange={(e) =>
                                      setLinkData({ ...linkData, relevance: e.target.value as any })
                                    }
                                  >
                                    <option value="supporting">Supporting</option>
                                    <option value="contradicting">Contradicting</option>
                                    <option value="neutral">Neutral</option>
                                  </select>
                                </Stack>
                                <div style={{ gridColumn: 'span 2' }}>
                                  <Stack gap="xs">
                                    <LqText variant="xs" weight="bold">
                                      ANALYTICAL NOTES
                                    </LqText>
                                    <input
                                      style={{
                                        width: '100%',
                                        background: 'var(--lq-surface-3)',
                                        border: '1px solid var(--lq-surface-4)',
                                        borderRadius: '0.375rem',
                                        padding: '0.5rem 0.75rem',
                                        fontSize: '0.875rem',
                                        color: 'var(--lq-text-primary)',
                                        outline: 'none',
                                      }}
                                      value={linkData.notes}
                                      onChange={(e) =>
                                        setLinkData({ ...linkData, notes: e.target.value })
                                      }
                                      placeholder="Why is this evidence relevant?"
                                    />
                                  </Stack>
                                </div>
                              </Grid>
                              <Flex justify="end" gap="sm" mt="md">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setLinkingEvidence({ ...linkingEvidence, [h.id]: false })
                                  }
                                >
                                  Abort
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => linkEvidence(h.id)}
                                >
                                  Establish Correlation
                                </Button>
                              </Flex>
                            </Surface>
                          )}

                          {/* Correlation Stream */}
                          <Stack gap="sm">
                            {h.evidenceLinks.length === 0 ? (
                              <LqText variant="xs" color="muted" align="center" italic>
                                No evidence signals correlated with this theory yet.
                              </LqText>
                            ) : (
                              <Grid cols={2} gap="md">
                                {h.evidenceLinks.map((link) => {
                                  const ev = evidenceItems.find(
                                    (item) => item.id === link.evidenceId,
                                  );
                                  return (
                                    <Surface
                                      key={link.id}
                                      variant="glass-highlight"
                                      p="sm"
                                      className={styles.autoGen141}
                                    >
                                      <Flex gap="sm" align="start">
                                        <Box
                                          className={cn(
                                            'w-1 h-full rounded',
                                            link.relevance === 'supporting'
                                              ? 'bg-[var(--lq-success)]'
                                              : link.relevance === 'contradicting'
                                                ? 'bg-[var(--lq-error)]'
                                                : 'bg-[var(--lq-surface-3)]',
                                          )}
                                        />
                                        <Stack gap="xs" style={{ flex: 1 }}>
                                          <Flex justify="between">
                                            <LqText variant="xs" weight="bold">
                                              {ev?.title || 'Unknown Signal'}
                                            </LqText>
                                            <Badge
                                              tone={
                                                link.relevance === 'supporting'
                                                  ? 'success'
                                                  : link.relevance === 'contradicting'
                                                    ? 'danger'
                                                    : 'neutral'
                                              }
                                              label={link.relevance.toUpperCase()}
                                              size="sm"
                                            />
                                          </Flex>
                                          {link.notes && (
                                            <LqText variant="xs" color="muted">
                                              {link.notes}
                                            </LqText>
                                          )}
                                        </Stack>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={styles.autoGen142}
                                          onClick={() => {}}
                                        >
                                          <Trash2 size={10} />
                                        </Button>
                                      </Flex>
                                    </Surface>
                                  );
                                })}
                              </Grid>
                            )}
                          </Stack>

                          {/* Revision History Section */}
                          {h.revisions.length > 0 && (
                            <Stack gap="sm" mt="sm">
                              <Flex align="center" gap="sm">
                                <History size={14} className={styles.autoGen143} />
                                <LqText
                                  variant="xs"
                                  weight="bold"
                                  color="muted"
                                  style={{ textTransform: 'uppercase' }}
                                >
                                  Revision Chain
                                </LqText>
                              </Flex>
                              <Stack gap="xs">
                                {h.revisions.map((rev) => (
                                  <Surface key={rev.id} variant="glass" p="sm">
                                    <Flex justify="between">
                                      <LqText variant="xs" weight="bold">
                                        {rev.reason}
                                      </LqText>
                                      <LqText variant="xs" color="muted">
                                        {rev.createdAt.toLocaleDateString()}
                                      </LqText>
                                    </Flex>
                                  </Surface>
                                ))}
                              </Stack>
                            </Stack>
                          )}

                          {/* Action Suite */}
                          <Flex gap="md" py="md" className={styles.autoGen144}>
                            <Button
                              variant="ghost"
                              grow
                              onClick={() => updateStatus(h.id, 'supported')}
                              className="hover:text-[var(--lq-success)]"
                            >
                              <CheckCircle2 size={14} className="mr-2" /> Mark Supported
                            </Button>
                            <Button
                              variant="ghost"
                              grow
                              onClick={() => updateStatus(h.id, 'refuted')}
                              className="hover:text-[var(--lq-error)]"
                            >
                              <XCircle size={14} className="mr-2" /> Mark Refuted
                            </Button>
                            <Button
                              variant="ghost"
                              grow
                              onClick={() => updateStatus(h.id, 'testing')}
                            >
                              <RefreshCw size={14} className="mr-2" /> Reset Status
                            </Button>
                          </Flex>
                        </Stack>
                      )}
                    </Stack>
                  </Surface>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
