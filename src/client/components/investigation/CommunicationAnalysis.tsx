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
  Mail,
  Phone,
} from 'lucide-react';
import { useToasts } from '../common/useToasts';
import { CloseButton } from '../common/CloseButton';

interface CommunicationAnalysisProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  onCommunicationPatternDetected?: (patterns: CommunicationPattern[]) => void;
  onOpenCaseFolder?: () => void;
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
  onOpenCaseFolder,
}) => {
  const { addToast } = useToasts();
  const [communicationPatterns, setCommunicationPatterns] = useState<CommunicationPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<CommunicationPattern | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMessage, setAnalysisMessage] = useState('Ready');
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<PatternFilterType>('all');

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
            const sourcePath = String(item?.sourcePath || '');
            const match = sourcePath.match(/^entity:(\d+)$/);
            return match ? match[1] : null;
          })
          .filter(Boolean);
        return Array.from(new Set([...fromEvidence, ...fromCaseFolder])) as string[];
      }
    } catch (_error) {
      // Fallback to current evidence only
    }

    return Array.from(new Set(fromEvidence));
  };

  const analyzeCommunications = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setAnalysisMessage('Collecting linked entities');

    // 1. Collect unique entity IDs from investigation evidence
    const entityIds = await collectEntityIds();

    if (entityIds.length === 0) {
      setCommunicationPatterns([]);
      setAnalysisProgress(100);
      setAnalysisMessage('No linked entities found for this investigation');
      setIsAnalyzing(false);
      if (onCommunicationPatternDetected) onCommunicationPatternDetected([]);
      return;
    }

    // 2. Fetch communications per entity using the real API
    const allEvents: Array<{
      entityId: string;
      documentId: string;
      threadId: string;
      subject: string;
      date: string;
      from: string;
      to: string[];
      cc: string[];
      topic: string;
    }> = [];

    for (let i = 0; i < entityIds.length; i++) {
      const entityId = entityIds[i];
      try {
        setAnalysisMessage(`Loading communications for entity ${entityId}`);
        const res = await apiClient.getEntityCommunications(entityId, {
          limit: 500,
        });
        const events = (res.data || []).map((e: unknown) => {
          const ev = e as Record<string, unknown>;
          return {
            entityId,
            documentId: String(ev.documentId || ev.document_id || ''),
            threadId: String(ev.threadId || ev.thread_id || ''),
            subject: String(ev.subject || ''),
            date: ev.date ? String(ev.date) : '',
            from: String(ev.from || ''),
            to: Array.isArray(ev.to) ? (ev.to as string[]) : [],
            cc: Array.isArray(ev.cc) ? (ev.cc as string[]) : [],
            topic: String(ev.topic || 'misc'),
          };
        });
        allEvents.push(...events);
      } catch (err) {
        // If one entity fails, continue with others
        // eslint-disable-next-line no-console
        console.warn('Failed to load communications for entity', entityId, err);
      }
      setAnalysisProgress(5 + Math.round(((i + 1) / entityIds.length) * 45));
    }

    if (allEvents.length === 0) {
      setCommunicationPatterns([]);
      setAnalysisProgress(100);
      setAnalysisMessage('No communication records were found for linked entities');
      setIsAnalyzing(false);
      if (onCommunicationPatternDetected) onCommunicationPatternDetected([]);
      return;
    }

    // 3. Aggregate patterns from real events
    const byTopic = new Map<string, number>();
    const byPair = new Map<string, number>();
    const byHour: number[] = Array.from({ length: 24 }, () => 0);
    const byHourBucket = new Map<string, typeof allEvents>();

    for (const ev of allEvents) {
      const topic = ev.topic || 'misc';
      byTopic.set(topic, (byTopic.get(topic) || 0) + 1);

      const participants = Array.from(
        new Set([ev.from, ...ev.to].filter((v) => typeof v === 'string' && v.trim().length > 0)),
      );
      if (participants.length >= 2) {
        const [a, b] = participants.slice(0, 2).sort();
        const key = `${a} ↔ ${b}`;
        byPair.set(key, (byPair.get(key) || 0) + 1);
      }

      if (ev.date) {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            byHour[h] += 1;
          }
          const bucket = new Date(d);
          bucket.setMinutes(0, 0, 0);
          const bucketKey = bucket.toISOString();
          const existing = byHourBucket.get(bucketKey) || [];
          existing.push(ev);
          byHourBucket.set(bucketKey, existing);
        }
      }
    }

    setAnalysisProgress(70);
    setAnalysisMessage('Deriving communication patterns');

    const totalMessages = allEvents.length;

    // Top topic frequency pattern
    const sortedTopics = Array.from(byTopic.entries()).sort((a, b) => b[1] - a[1]);
    const topTopic = sortedTopics[0];

    // Late-night spike: 0-5h
    const lateNightCount = byHour.slice(0, 6).reduce((a, b) => a + b, 0);

    // Top communication pair
    const sortedPairs = Array.from(byPair.entries()).sort((a, b) => b[1] - a[1]);
    const topPair = sortedPairs[0];

    const patterns: CommunicationPattern[] = [];

    if (topTopic) {
      patterns.push({
        id: 'frequency-topic',
        type: 'frequency',
        title: `Dominant Topic: ${topTopic[0].replace('_', ' ')}`,
        description: `Most common email topic in this investigation is “${topTopic[0].replace(
          '_',
          ' ',
        )}” with ${topTopic[1]} messages.`,
        confidence: Math.min(100, Math.round((topTopic[1] / totalMessages) * 100) || 50),
        severity:
          topTopic[1] / totalMessages > 0.4
            ? 'high'
            : topTopic[1] / totalMessages > 0.2
              ? 'medium'
              : 'low',
        participants: [],
        evidenceIds: allEvents
          .filter((e) => e.topic === topTopic[0])
          .map((e) => e.documentId)
          .slice(0, 50),
        metadata: {
          frequency: topTopic[1],
          messageCount: totalMessages,
          communicationChannels: ['email'],
          threadIds: allEvents
            .filter((e) => e.topic === topTopic[0] && e.threadId)
            .map((e) => e.threadId)
            .filter(Boolean)
            .slice(0, 20),
          documentIds: allEvents
            .filter((e) => e.topic === topTopic[0] && e.documentId)
            .map((e) => e.documentId)
            .filter(Boolean)
            .slice(0, 20),
        },
        recommendations: [
          'Review all high-volume threads for this topic.',
          'Cross-reference with investigation timeline and key entities.',
        ],
      });
    }

    if (lateNightCount > 0) {
      patterns.push({
        id: 'timing-late-night',
        type: 'timing',
        title: 'Late-night communication clusters',
        description: `Detected ${lateNightCount} messages sent between 00:00 and 05:59, which may indicate covert or off-hours coordination.`,
        confidence: Math.min(100, 60 + lateNightCount),
        severity: lateNightCount > 50 ? 'high' : lateNightCount > 10 ? 'medium' : 'low',
        participants: [],
        evidenceIds: allEvents
          .filter((e) => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return !isNaN(d.getTime()) && d.getHours() < 6;
          })
          .map((e) => e.documentId)
          .slice(0, 50),
        metadata: {
          timeRange: {
            start: '',
            end: '',
          },
          communicationChannels: ['email'],
          threadIds: allEvents
            .filter((e) => {
              if (!e.date) return false;
              const d = new Date(e.date);
              return !isNaN(d.getTime()) && d.getHours() < 6;
            })
            .map((e) => e.threadId)
            .filter(Boolean)
            .slice(0, 20),
          documentIds: allEvents
            .filter((e) => {
              if (!e.date) return false;
              const d = new Date(e.date);
              return !isNaN(d.getTime()) && d.getHours() < 6;
            })
            .map((e) => e.documentId)
            .filter(Boolean)
            .slice(0, 20),
        },
        recommendations: ['Inspect these threads for sensitive coordination or escalation.'],
      });
    }

    if (topPair) {
      patterns.push({
        id: 'network-top-pair',
        type: 'network',
        title: `Central communication pair: ${topPair[0]}`,
        description: `The pair ${topPair[0]} appears in ${topPair[1]} messages, suggesting a central communication link within this investigation.`,
        confidence: Math.min(100, 70 + topPair[1]),
        severity: topPair[1] > 40 ? 'critical' : topPair[1] > 15 ? 'high' : 'medium',
        participants: topPair[0].split(' ↔ ').filter(Boolean),
        evidenceIds: [],
        metadata: {
          communicationChannels: ['email'],
          messageCount: topPair[1],
          threadIds: allEvents
            .filter((e) => {
              const participants = Array.from(
                new Set([e.from, ...e.to].filter((v) => v && v.trim().length > 0)),
              )
                .slice(0, 2)
                .sort()
                .join(' ↔ ');
              return participants === topPair[0];
            })
            .map((e) => e.threadId)
            .filter(Boolean)
            .slice(0, 20),
          documentIds: allEvents
            .filter((e) => {
              const participants = Array.from(
                new Set([e.from, ...e.to].filter((v) => v && v.trim().length > 0)),
              )
                .slice(0, 2)
                .sort()
                .join(' ↔ ');
              return participants === topPair[0];
            })
            .map((e) => e.documentId)
            .filter(Boolean)
            .slice(0, 20),
        },
        recommendations: [
          'Map all threads involving this pair of participants.',
          'Cross-reference with relationship graph and entity risk levels.',
        ],
      });
    }

    const bucketEntries = Array.from(byHourBucket.entries()).map(([bucket, eventsInBucket]) => ({
      bucket,
      count: eventsInBucket.length,
      events: eventsInBucket,
    }));
    if (bucketEntries.length >= 3) {
      const counts = bucketEntries.map((entry) => entry.count);
      const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      const variance =
        counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) /
        Math.max(1, counts.length);
      const stdDev = Math.sqrt(variance);
      const topBucket = bucketEntries.sort((a, b) => b.count - a.count)[0];
      const threshold = mean + stdDev * 2;
      if (topBucket && topBucket.count >= Math.max(5, Math.ceil(threshold))) {
        const threads = topBucket.events.map((ev) => ev.threadId).filter(Boolean);
        const docs = topBucket.events.map((ev) => ev.documentId).filter(Boolean);
        patterns.push({
          id: 'anomaly-volume-spike',
          type: 'anomaly',
          title: 'Time-window communication spike',
          description: `An unusual burst of ${topBucket.count} messages occurred around ${new Date(topBucket.bucket).toLocaleString()} (baseline ${mean.toFixed(1)} per hour).`,
          confidence: Math.min(
            98,
            Math.max(70, Math.round((topBucket.count / Math.max(1, threshold)) * 80)),
          ),
          severity: topBucket.count > threshold * 1.8 ? 'critical' : 'high',
          participants: Array.from(
            new Set(
              topBucket.events
                .flatMap((ev) => [ev.from, ...ev.to])
                .filter((value) => typeof value === 'string' && value.trim().length > 0),
            ),
          ).slice(0, 8),
          evidenceIds: docs.slice(0, 50),
          metadata: {
            anomalyScore: Math.round((topBucket.count / Math.max(1, threshold)) * 100) / 100,
            communicationChannels: ['email'],
            threadIds: threads.slice(0, 20),
            documentIds: docs.slice(0, 20),
            dataCoverage: `${bucketEntries.length} hourly buckets`,
          },
          recommendations: [
            'Open the spike hour messages and review escalation cues.',
            'Link critical threads to case folder with provenance for audit trail.',
          ],
        });
      }
    }

    setCommunicationPatterns(patterns);
    setAnalysisProgress(100);
    setAnalysisMessage(`Completed. ${patterns.length} patterns detected`);
    setIsAnalyzing(false);
    setLastRunAt(new Date().toISOString());

    if (onCommunicationPatternDetected) {
      onCommunicationPatternDetected(patterns);
    }
  };

  const getPatternIcon = (type: CommunicationPattern['type']) => {
    const icons = {
      frequency: TrendingUp,
      timing: Clock,
      content: MessageSquare,
      network: Users,
      anomaly: AlertTriangle,
    };
    return icons[type];
  };

  const getCommunicationIcon = (channel: string) => {
    const icons = {
      email: Mail,
      phone: Phone,
      text: MessageSquare,
      meeting: Users,
    };
    return icons[channel as keyof typeof icons] || MessageSquare;
  };

  const getSeverityColor = (severity: CommunicationPattern['severity']) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[severity];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredPatterns =
    filterType === 'all'
      ? communicationPatterns
      : communicationPatterns.filter((pattern) => pattern.type === filterType);

  const openScopedEmailView = (pattern?: CommunicationPattern) => {
    const threadIds =
      pattern?.metadata.threadIds?.filter((id) => id && id.trim().length > 0).slice(0, 12) || [];
    const params = new URLSearchParams();
    params.set('investigationId', String(investigation.id));
    if (threadIds.length > 0) params.set('threadIds', threadIds.join(','));
    window.location.assign(`/emails?${params.toString()}`);
  };

  const addPatternEvidenceToCase = async (pattern: CommunicationPattern) => {
    const docId = pattern.metadata.documentIds?.[0] || pattern.evidenceIds?.[0] || null;
    const threadId = pattern.metadata.threadIds?.[0] || null;
    const sourcePath = threadId ? `email-thread:${threadId}` : docId ? `email:${docId}` : null;
    if (!sourcePath) {
      addToast({ text: 'No source message available to add for this pattern.', type: 'warning' });
      return;
    }
    try {
      const response = await fetch(`/api/investigations/${investigation.id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Communications signal: ${pattern.title}`,
          description: `${pattern.description}\n\nDerived from communication analysis for investigation ${investigation.id}.`,
          type: 'email',
          source_path: sourcePath,
          relevance:
            pattern.severity === 'critical' || pattern.severity === 'high' ? 'high' : 'medium',
          notes: `Provenance: communications pattern ${pattern.id}, confidence ${pattern.confidence}%`,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to add pattern evidence');
      }
      addToast({ text: 'Pattern evidence added to case folder.', type: 'success' });
      window.dispatchEvent(new CustomEvent('investigation-item-added'));
    } catch (_error) {
      addToast({ text: 'Failed to add pattern evidence to case folder.', type: 'error' });
    }
  };

  return (
    <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)]">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Communication Forensics
            </h2>
            <p className="text-sm text-[var(--text-primary)] mt-1">
              Analyze communication patterns, timing, and network effects
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Uses linked investigation entities and their communication records.
            </p>
            {lastRunAt && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Last run: {new Date(lastRunAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={analyzeCommunications}
            disabled={isAnalyzing}
            className="flex items-center px-4 py-2 bg-red-600 text-[var(--text-primary)] rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Activity className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Start Communication Analysis'}
          </button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-900">{analysisMessage}</span>
            <span className="text-sm text-red-700">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-red-200 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {!isAnalyzing && communicationPatterns.length > 0 && (
        <div className="px-6 py-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Filter by type:</span>
            <div className="flex gap-2">
              {(['all', 'frequency', 'timing', 'content', 'network', 'anomaly'] as const).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      filterType === type
                        ? 'bg-red-100 text-red-700'
                        : 'bg-[var(--app-bg)] text-[var(--text-primary)] hover:bg-[var(--app-bg)]'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pattern Results */}
      {!isAnalyzing && filteredPatterns.length > 0 && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Detected Communication Patterns ({filteredPatterns.length})
            </h3>
            <p className="text-sm text-[var(--text-primary)]">
              Analysis identified {communicationPatterns.length} suspicious communication patterns
              {filterType !== 'all' && ` (${filteredPatterns.length} matching current filter)`}
            </p>
          </div>

          <div className="grid gap-4">
            {filteredPatterns.map((pattern) => {
              const Icon = getPatternIcon(pattern.type);
              return (
                <div
                  key={pattern.id}
                  className={`border rounded-[var(--radius-lg)] p-4 cursor-pointer transition-all hover:shadow-[var(--glass-shadow)] ${
                    selectedPattern?.id === pattern.id ? 'ring-2 ring-red-500' : ''
                  }`}
                  onClick={() => setSelectedPattern(pattern)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <div
                        className={`p-2 rounded-[var(--radius-lg)] ${getSeverityColor(pattern.severity)} mr-3`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-[var(--text-primary)]">
                            {pattern.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${getConfidenceColor(pattern.confidence)}`}
                            >
                              {pattern.confidence}% confidence
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(pattern.severity)}`}
                            >
                              {pattern.severity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--text-primary)] mb-2">
                          {pattern.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <span>Type: {pattern.type}</span>
                          <span>Participants: {pattern.participants.length}</span>
                          <span>Evidence: {pattern.evidenceIds.length} items</span>
                          {pattern.metadata.communicationChannels && (
                            <span>Channels: {pattern.metadata.communicationChannels.length}</span>
                          )}
                          {pattern.metadata.threadIds && pattern.metadata.threadIds.length > 0 && (
                            <span>Threads: {pattern.metadata.threadIds.length}</span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openScopedEmailView(pattern);
                            }}
                            className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                          >
                            Open underlying emails
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addPatternEvidenceToCase(pattern);
                            }}
                            className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          >
                            Add signal to case folder
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pattern Detail Modal */}
      {selectedPattern && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[var(--radius-lg)] p-6 w-full max-w-2xl max-h-96 overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-[var(--text-primary)]">
                  {selectedPattern.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedPattern.severity)}`}
                  >
                    {selectedPattern.severity.toUpperCase()}
                  </span>
                  <span
                    className={`text-sm font-medium ${getConfidenceColor(selectedPattern.confidence)}`}
                  >
                    {selectedPattern.confidence}% confidence
                  </span>
                </div>
              </div>
              <CloseButton
                onClick={() => setSelectedPattern(null)}
                size="sm"
                label="Close communication pattern details"
                className="border-[var(--glass-border)] bg-transparent text-[var(--text-muted)] hover:bg-[var(--app-bg)] hover:text-[var(--text-primary)]"
              />
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">Description</h4>
                <p className="text-sm text-[var(--text-primary)]">{selectedPattern.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                  Participants
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPattern.participants.map((participant, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-[var(--app-bg)] text-[var(--text-primary)] text-xs rounded"
                    >
                      {participant}
                    </span>
                  ))}
                </div>
              </div>

              {selectedPattern.metadata.timeRange && (
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                    Time Range
                  </h4>
                  <p className="text-sm text-[var(--text-primary)]">
                    {selectedPattern.metadata.timeRange.start} to{' '}
                    {selectedPattern.metadata.timeRange.end}
                  </p>
                </div>
              )}

              {selectedPattern.metadata.communicationChannels &&
                selectedPattern.metadata.communicationChannels.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      Communication Channels
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPattern.metadata.communicationChannels.map((channel, index) => {
                        const ChannelIcon = getCommunicationIcon(channel.toLowerCase());
                        return (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1"
                          >
                            <ChannelIcon className="w-3 h-3" />
                            {channel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                  Investigation Recommendations
                </h4>
                <ul className="space-y-1">
                  {selectedPattern.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-[var(--text-primary)] flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 mr-2 flex-shrink-0"></span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                  Underlying sources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedPattern.metadata.threadIds || []).slice(0, 8).map((threadId) => (
                    <button
                      key={threadId}
                      onClick={() =>
                        window.location.assign(`/emails?threadId=${encodeURIComponent(threadId)}`)
                      }
                      className="px-2 py-1 bg-[var(--app-bg)] text-[var(--text-primary)] text-xs rounded hover:bg-[var(--app-bg)]"
                    >
                      Thread {threadId}
                    </button>
                  ))}
                  {(selectedPattern.metadata.documentIds || []).slice(0, 8).map((docId) => (
                    <button
                      key={docId}
                      onClick={() =>
                        window.location.assign(`/emails?id=${encodeURIComponent(docId)}`)
                      }
                      className="px-2 py-1 bg-[var(--app-bg)] text-[var(--text-primary)] text-xs rounded hover:bg-[var(--app-bg)]"
                    >
                      Message {docId}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedPattern(null)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--app-bg)] rounded-md hover:bg-[var(--app-bg)] transition-colors"
              >
                Close
              </button>
              {onOpenCaseFolder && (
                <button
                  onClick={() => {
                    setSelectedPattern(null);
                    onOpenCaseFolder();
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Review in Case Folder
                </button>
              )}
              <button
                onClick={() => addPatternEvidenceToCase(selectedPattern)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
              >
                Add Signal to Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && communicationPatterns.length === 0 && (
        <div className="p-12 text-center">
          <Activity className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
            No communication patterns detected yet
          </h3>
          <p className="text-sm text-[var(--text-primary)] mb-4">
            {linkedEntityCount > 0
              ? 'Start communication analysis to identify timing spikes, network density patterns, and high-signal threads.'
              : 'Needs input: link at least one entity or email evidence item to this case before communication signals can be derived.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={analyzeCommunications}
              disabled={linkedEntityCount === 0}
              className="px-4 py-2 bg-red-600 text-[var(--text-primary)] text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              Start Communication Analysis
            </button>
            <button
              onClick={() => openScopedEmailView()}
              className="px-4 py-2 bg-blue-100 text-blue-800 text-sm rounded-md hover:bg-blue-200 transition-colors"
            >
              Open case-scoped email view
            </button>
            {onOpenCaseFolder && (
              <button
                onClick={onOpenCaseFolder}
                className="px-4 py-2 bg-[var(--app-bg)] text-[var(--text-primary)] text-sm rounded-md hover:bg-[var(--app-bg)] transition-colors"
              >
                Open Case Folder
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
