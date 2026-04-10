import React, { useMemo, useState } from 'react';
import { Investigation, EvidenceItem } from '../../types/investigation';
import { apiClient } from '../../services/apiClient';
import {
  Activity,
  Clock,
  Users,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Filter,
  ArrowRight,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';

// UI Library
import { Surface, Button, Flex, Box, Stack, LqText, Grid, Badge } from '../../design-system/lib';
import styles from './CommunicationAnalysis.module.css';

interface CommunicationAnalysisProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  onCommunicationPatternDetected?: (patterns: CommunicationPattern[]) => void;
  onOpenCaseFolder?: () => void;
  mobileMode?: boolean;
}

export interface CommunicationPattern {
  id: string;
  type: 'frequency' | 'timing' | 'content' | 'network' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  participants: string[];
  evidenceIds: string[];
  metadata: {
    frequency?: number;
    timeRange?: { start: string; end: string };
    communicationChannels?: string[];
    messageCount?: number;
    responseTime?: number;
    anomalyScore?: number;
    networkDensity?: number;
    threadIds?: string[];
    documentIds?: string[];
    dataCoverage?: string;
  };
  recommendations: string[];
}

type PatternFilterType = 'all' | 'frequency' | 'timing' | 'content' | 'network' | 'anomaly';

export const CommunicationAnalysis: React.FC<CommunicationAnalysisProps> = ({
  investigation,
  evidence,
  onCommunicationPatternDetected,
  mobileMode,
}) => {
  const [communicationPatterns, setCommunicationPatterns] = useState<CommunicationPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<CommunicationPattern | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMessage, setAnalysisMessage] = useState('Ready');
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<PatternFilterType>('all');

  useScrollLock(!!selectedPattern);

  const linkedEntityCount = useMemo(
    () =>
      evidence.filter((item) =>
        ['entity', 'person', 'organization'].includes((item.type || '').toString().toLowerCase()),
      ).length,
    [evidence],
  );

  const collectEntityIds = async (): Promise<string[]> => {
    const fromEvidence = evidence
      .filter((item) =>
        ['entity', 'person', 'organization'].includes((item.type || '').toString().toLowerCase()),
      )
      .map((item) => String(item.sourceId || item.id))
      .filter(Boolean);

    try {
      const response = await fetch(`/api/investigations/${investigation.id}/evidence-by-type`);
      if (response.ok) {
        const payload = await response.json();
        const allItems = Array.isArray(payload?.all) ? payload.all : [];
        const fromCaseFolder = allItems
          .filter(
            (item: Record<string, unknown>) =>
              item?.targetType === 'entity' ||
              String(item?.sourcePath || '').startsWith('entity:') ||
              ['entity', 'person', 'organization'].includes(String(item?.type || '').toLowerCase()),
          )
          .map((item: Record<string, unknown>) => {
            if (item?.targetId) return String(item.targetId);
            const match = String(item?.sourcePath || '').match(/^entity:(\d+)$/);
            return match ? match[1] : null;
          })
          .filter(Boolean);
        return Array.from(new Set([...fromEvidence, ...fromCaseFolder])) as string[];
      }
    } catch {
      /* Fallback */
    }
    return Array.from(new Set(fromEvidence));
  };

  const analyzeCommunications = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setAnalysisMessage('Collecting linked entities');

    const entityIds = await collectEntityIds();
    if (entityIds.length === 0) {
      setCommunicationPatterns([]);
      setAnalysisProgress(100);
      setAnalysisMessage('No linked entities identified');
      setIsAnalyzing(false);
      return;
    }

    interface CommunicationEvent {
      entityId: string;
      documentId: string;
      threadId: string;
      subject: string;
      date: string;
      from: string;
      to: string[];
      cc: string[];
      topic: string;
    }

    const allEvents: CommunicationEvent[] = [];
    for (let i = 0; i < entityIds.length; i++) {
      const entityId = entityIds[i];
      try {
        setAnalysisMessage(`Processing signal for entity ${entityId}`);
        const res = await apiClient.getEntityCommunications(entityId, { limit: 500 });
        const events = ((res.data || []) as Record<string, unknown>[]).map((ev) => ({
          entityId,
          documentId: String(ev.documentId || ev.document_id || ''),
          threadId: String(ev.threadId || ev.thread_id || ''),
          subject: String(ev.subject || ''),
          date: ev.date ? String(ev.date) : '',
          from: String(ev.from || ''),
          to: Array.isArray(ev.to) ? (ev.to as string[]) : [],
          cc: Array.isArray(ev.cc) ? (ev.cc as string[]) : [],
          topic: String(ev.topic || 'misc'),
        }));
        allEvents.push(...events);
      } catch {
        /* Continue */
      }
      setAnalysisProgress(5 + Math.round(((i + 1) / entityIds.length) * 45));
    }

    if (allEvents.length === 0) {
      setCommunicationPatterns([]);
      setAnalysisProgress(100);
      setAnalysisMessage('No communication logs found');
      setIsAnalyzing(false);
      return;
    }

    setAnalysisProgress(70);
    setAnalysisMessage('Deriving latent communication patterns');

    // Frequency & Spike Logic
    const byTopic = new Map<string, number>();
    const byPair = new Map<string, number>();
    const byHour: number[] = Array.from({ length: 24 }, () => 0);
    const byHourBucket = new Map<string, CommunicationEvent[]>();

    allEvents.forEach((ev) => {
      byTopic.set(ev.topic, (byTopic.get(ev.topic) || 0) + 1);
      const participants = Array.from(new Set([ev.from, ...ev.to].filter((v) => v?.trim())));
      if (participants.length >= 2) {
        const [a, b] = participants.slice(0, 2).sort();
        const key = `${a} ↔ ${b}`;
        byPair.set(key, (byPair.get(key) || 0) + 1);
      }
      if (ev.date) {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
          byHour[d.getHours()] += 1;
          const bucket = new Date(d);
          bucket.setMinutes(0, 0, 0);
          const key = bucket.toISOString();
          const existing = byHourBucket.get(key) || [];
          existing.push(ev);
          byHourBucket.set(key, existing);
        }
      }
    });

    const patterns: CommunicationPattern[] = [];
    const total = allEvents.length;

    // Pattern: Topic Dominance
    const sortedTopics = Array.from(byTopic.entries()).sort((a, b) => b[1] - a[1]);
    if (sortedTopics[0]) {
      patterns.push({
        id: 'freq-topic',
        type: 'frequency',
        title: `Dominant Subject-Matter: ${sortedTopics[0][0].replace(/_/g, ' ')}`,
        description: `High-density subject frequency identified in ${sortedTopics[0][1]} signals.`,
        confidence: Math.min(100, Math.round((sortedTopics[0][1] / total) * 100) || 50),
        severity: sortedTopics[0][1] / total > 0.4 ? 'high' : 'medium',
        participants: [],
        evidenceIds: allEvents
          .filter((e) => e.topic === sortedTopics[0][0])
          .map((e) => e.documentId)
          .slice(0, 20),
        metadata: { frequency: sortedTopics[0][1], messageCount: total },
        recommendations: ['Review high-volume threads for covert signaling.'],
      });
    }

    // Pattern: Timing Anomaly
    const lateNight = byHour.slice(0, 6).reduce((a, b) => a + b, 0);
    if (lateNight > 0) {
      patterns.push({
        id: 'time-vampire',
        type: 'timing',
        title: 'Off-hours coordination clusters',
        description: `Detected ${lateNight} signals during off-peak hours (00:00 - 05:59).`,
        confidence: Math.min(100, 60 + lateNight),
        severity: lateNight > 20 ? 'high' : 'medium',
        participants: [],
        evidenceIds: [],
        metadata: { messageCount: lateNight },
        recommendations: ['Check for rapid response times indicating urgent off-hour liaison.'],
      });
    }

    setCommunicationPatterns(patterns);
    setAnalysisProgress(100);
    setAnalysisMessage(`Analysis complete: ${patterns.length} signals`);
    setIsAnalyzing(false);
    setLastRunAt(new Date().toISOString());
    if (onCommunicationPatternDetected) onCommunicationPatternDetected(patterns);
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'frequency':
        return TrendingUp;
      case 'timing':
        return Clock;
      case 'network':
        return Users;
      case 'anomaly':
        return AlertTriangle;
      default:
        return MessageSquare;
    }
  };

  const getSeverityVariant = (
    s: string,
  ): 'danger' | 'warning' | 'accent' | 'neutral' | 'success' => {
    const variants: Record<string, 'danger' | 'warning' | 'accent' | 'neutral' | 'success'> = {
      critical: 'danger',
      high: 'warning',
      medium: 'accent',
      low: 'neutral',
    };
    return variants[s] || 'neutral';
  };

  const openScopedEmailView = (pattern?: CommunicationPattern) => {
    const threadIds = pattern?.metadata.threadIds?.filter((id) => id?.trim()).slice(0, 10) || [];
    const params = new URLSearchParams();
    params.set('investigationId', String(investigation.id));
    if (threadIds.length > 0) params.set('threadIds', threadIds.join(','));
    window.location.assign(`/emails?${params.toString()}`);
  };

  return (
    <Box className={styles.autoGen30} style={{ backgroundColor: 'var(--lq-surface-1)' }}>
      {!mobileMode && (
        <Surface variant="glass" p="xl" className={styles.autoGen31}>
          <Flex justify="between" align="center">
            <Stack gap="none">
              <LqText variant="h2" weight="bold">
                Communication Forensics
              </LqText>
              <Flex align="center" gap="sm">
                <LqText variant="xs" color="muted" weight="bold">
                  SIGNAL INTELLIGENCE • NETWORK ANALYSIS
                </LqText>
                {lastRunAt && (
                  <Badge>{`LAST SCAN: ${new Date(lastRunAt).toLocaleTimeString()}`}</Badge>
                )}
              </Flex>
            </Stack>
            <Button variant="primary" onClick={analyzeCommunications} disabled={isAnalyzing}>
              <Activity className={isAnalyzing ? 'animate-spin-slow' : ''} size={18} />
              {isAnalyzing ? 'Analyzing Network...' : 'Initiate Communication Scan'}
            </Button>
          </Flex>
        </Surface>
      )}

      <Box p="xl">
        {isAnalyzing && (
          <Surface variant="glass-highlight" p="lg" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <Stack gap="md">
              <Flex justify="between">
                <LqText variant="small" weight="bold">
                  {analysisMessage}
                </LqText>
                <LqText variant="small" weight="bold" color="accent">
                  {analysisProgress}%
                </LqText>
              </Flex>
              <Box className={styles.autoGen32}>
                <Box className={styles.autoGen33} style={{ width: `${analysisProgress}%` }} />
              </Box>
            </Stack>
          </Surface>
        )}

        {!isAnalyzing && communicationPatterns.length > 0 && (
          <Stack gap="xl">
            <Surface variant="glass" p="sm">
              <Flex gap="sm" align="center">
                <Filter size={14} className={styles.autoGen34} />
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={{ marginRight: 'var(--space-sm)' }}
                >
                  FILTER SIGMA:
                </LqText>
                {(['all', 'frequency', 'timing', 'network', 'anomaly'] as PatternFilterType[]).map(
                  (t) => (
                    <Button
                      key={t}
                      variant={filterType === t ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType(t)}
                    >
                      {t.toUpperCase()}
                    </Button>
                  ),
                )}
              </Flex>
            </Surface>

            <Grid gap="xl">
              {communicationPatterns
                .filter((p) => filterType === 'all' || p.type === filterType)
                .map((p) => {
                  const IconComp = getPatternIcon(p.type);
                  return (
                    <Surface
                      key={p.id}
                      variant="glass-highlight"
                      p="lg"
                      className={styles.autoGen35}
                      onClick={() => setSelectedPattern(p)}
                    >
                      <Stack gap="md">
                        <Flex justify="between" align="start">
                          <Box p="xs" className={styles.autoGen36}>
                            <IconComp size={18} className={styles.autoGen37} />
                          </Box>
                          <Badge tone={getSeverityVariant(p.severity)}>
                            {p.severity.toUpperCase()}
                          </Badge>
                        </Flex>
                        <Stack gap="xs">
                          <LqText variant="small" weight="bold">
                            {p.title}
                          </LqText>
                          <LqText variant="xs" color="muted">
                            {p.description.slice(0, 100)}
                            {p.description.length > 100 ? '...' : ''}
                          </LqText>
                        </Stack>
                        <Flex justify="between" align="center" pt="sm" className={styles.autoGen38}>
                          <LqText
                            variant="xs"
                            weight="bold"
                            color={p.confidence >= 80 ? 'success' : 'warning'}
                          >
                            {p.confidence}% CONFIDENCE
                          </LqText>
                          <Flex gap="xs">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openScopedEmailView(p);
                              }}
                            >
                              <ExternalLink size={10} /> Inspect
                            </Button>
                          </Flex>
                        </Flex>
                      </Stack>
                    </Surface>
                  );
                })}
            </Grid>
          </Stack>
        )}

        {!isAnalyzing && communicationPatterns.length === 0 && (
          <Surface variant="glass" p="lg">
            <Stack align="center" gap="lg">
              <MessageSquare size={48} className={styles.autoGen39} />
              <Stack gap="xs">
                <LqText variant="h3" weight="bold">
                  No Latent Patterns Detected
                </LqText>
                <LqText variant="xs" color="muted">
                  {linkedEntityCount > 0
                    ? 'Start a forensic scan to identify network spikes and covert channels.'
                    : 'Requires linked entities or email records to perform network analysis.'}
                </LqText>
              </Stack>
              <Button
                variant="primary"
                onClick={analyzeCommunications}
                disabled={linkedEntityCount === 0}
              >
                Start Analysis
              </Button>
            </Stack>
          </Surface>
        )}
      </Box>

      {/* Detail Overlay */}
      {selectedPattern && (
        <Box className={styles.autoGen40} onClick={() => setSelectedPattern(null)}>
          <Surface
            variant="panel"
            style={{ width: 600, padding: 'var(--spacing-xxl)' }}
            className={styles.autoGen41}
            onClick={(e) => e.stopPropagation()}
          >
            <Stack gap="xl">
              <Flex justify="between" align="start">
                <Stack gap="none">
                  <LqText variant="h3" weight="bold">
                    {selectedPattern.title}
                  </LqText>
                  <Badge
                    tone={getSeverityVariant(selectedPattern.severity)}
                  >{`${selectedPattern.severity.toUpperCase()} PRIORITY`}</Badge>
                </Stack>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPattern(null)}>
                  <XCircle size={18} />
                </Button>
              </Flex>

              <Stack gap="sm">
                <LqText variant="xs" weight="bold" color="muted">
                  BEHAVIORAL HYPOTHESIS
                </LqText>
                <Surface variant="glass" p="md">
                  <LqText variant="small">{selectedPattern.description}</LqText>
                </Surface>
              </Stack>

              <Grid cols={2} gap="md">
                <Surface variant="glass" p="md">
                  <LqText variant="xs" weight="bold" color="muted">
                    PARTICIPANTS
                  </LqText>
                  <Flex wrap="wrap" gap="xs" mt="sm">
                    {selectedPattern.participants.length > 0 ? (
                      selectedPattern.participants.map((p, i) => (
                        <Badge key={i} tone="accent">
                          {p}
                        </Badge>
                      ))
                    ) : (
                      <LqText variant="xs" color="muted">
                        No direct identifiers
                      </LqText>
                    )}
                  </Flex>
                </Surface>
                <Surface variant="glass" p="md">
                  <LqText variant="xs" weight="bold" color="muted">
                    OPERATIONAL INTELLIGENCE
                  </LqText>
                  <ul
                    style={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    {selectedPattern.recommendations.map((r, i) => (
                      <li key={i} className={styles.autoGen42}>
                        <ArrowRight size={10} className={styles.autoGen43} />
                        <LqText variant="xs">{r}</LqText>
                      </li>
                    ))}
                  </ul>
                </Surface>
              </Grid>

              <Flex gap="md">
                <Button variant="primary" onClick={() => setSelectedPattern(null)}>
                  Dismiss Analysis
                </Button>
                <Button variant="secondary" onClick={() => openScopedEmailView(selectedPattern)}>
                  Open Scoped View
                </Button>
              </Flex>
            </Stack>
          </Surface>
        </Box>
      )}
    </Box>
  );
};
