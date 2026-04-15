import React, { useState } from 'react';
import { BarChart3, Target, Clock, DollarSign, Users, MapPin, Activity } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { CloseButton } from './common/CloseButton';
import styles from './PatternRecognitionAI.module.css';

import { Button } from '../design-system/lib';

interface PatternRecognitionAIProps {
  onPatternDetected?: (patterns: DetectedPattern[]) => void;
}

export interface DetectedPattern {
  id: string;
  type: 'temporal' | 'financial' | 'communication' | 'behavioral' | 'geographic' | 'network';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidenceIds: string[];
  timelineEventIds: string[];
  entities: string[];
  metadata: {
    frequency?: number;
    timeRange?: { start: string; end: string };
    locations?: string[];
    financialAmounts?: number[];
    communicationFrequency?: number;
    networkDensity?: number;
    anomalyScore?: number;
  };
  recommendations: string[];
}

export const PatternRecognitionAI: React.FC<PatternRecognitionAIProps> = ({
  onPatternDetected,
}) => {
  const [detectedPatterns, setDetectedPatterns] = useState<DetectedPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const analyzePatterns = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(5);

    try {
      // 1) Fetch core stats and financial transactions
      const [statsRes, transactionsRes] = await Promise.all([
        fetch('/api/stats')
          .then((r) => r.json())
          .catch(() => ({})),
        fetch('/api/financial/transactions')
          .then((r) => r.json())
          .catch(() => []),
      ]);

      const stats = statsRes || {};
      const transactions = Array.isArray(transactionsRes) ? transactionsRes : [];

      // 2) Fetch top entities and relationships via apiClient
      const entitiesRes = await apiClient.getEntities({ sortBy: 'risk', sortOrder: 'desc' }, 1, 10);
      const topEntities = Array.isArray(entitiesRes.data) ? entitiesRes.data : [];

      setAnalysisProgress(40);

      let relationshipPatterns: DetectedPattern[] = [];
      if (topEntities.length > 0) {
        const primary = topEntities[0];
        try {
          const relRes = await fetch(
            `/api/relationships?entityId=${primary.id}&includeBreakdown=true&minConfidence=0.3`,
          );
          const relJson = (await relRes.json().catch(() => ({}))) as {
            relationships?: Array<{
              proximity_score?: number;
              target_name?: string;
              target_id?: string;
            }>;
          };
          const rels = Array.isArray(relJson?.relationships) ? relJson.relationships : [];

          if (rels.length > 0) {
            const highProximity = rels.filter((r) => (r.proximity_score || 0) >= 0.6);
            const avgDensity =
              rels.reduce((sum, r) => sum + (r.proximity_score || 0), 0) / (rels.length || 1);

            relationshipPatterns = [
              {
                id: 'network-density',
                type: 'network',
                title: 'Concentrated high-risk relationship cluster',
                description:
                  'Entity relationship graph shows a dense cluster of medium-to-high confidence links around top-risk entities.',
                confidence: Math.min(100, Math.round(avgDensity * 100) || 75),
                severity: avgDensity > 0.75 ? 'critical' : avgDensity > 0.5 ? 'high' : 'medium',
                evidenceIds: [],
                timelineEventIds: [],
                entities: [
                  String(primary.fullName || primary.name || primary.id),
                  ...highProximity
                    .slice(0, 5)
                    .map((r) => String(r.target_name || r.target_id || 'unknown')),
                ],
                metadata: {
                  networkDensity: avgDensity,
                  anomalyScore: avgDensity * 10,
                  communicationFrequency: 0,
                },
                recommendations: [
                  'Review all evidence supporting high-proximity relationships.',
                  'Cross-reference these entities with financial and communication patterns.',
                ],
              },
            ];
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to load relationship patterns', err);
        }
      }

      setAnalysisProgress(65);

      // 3) Temporal and financial patterns from real transactions
      interface Transaction {
        amount?: number | string;
        risk_level?: string;
        date?: string;
        id?: string;
        tx_id?: string;
        from_entity?: string;
        to_entity?: string;
      }
      const typedTransactions = transactions as Transaction[];
      const totalAmount = typedTransactions.reduce(
        (sum: number, t: Transaction) => sum + (Number(t.amount) || 0),
        0,
      );
      const highRiskTx = typedTransactions.filter((t: Transaction) =>
        ['high', 'critical'].includes(String(t.risk_level || '').toLowerCase()),
      );

      const byMonth = new Map<string, number>();
      for (const tx of typedTransactions) {
        const d = tx.date ? new Date(tx.date) : null;
        if (!d || Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth.set(key, (byMonth.get(key) || 0) + (Number(tx.amount) || 0));
      }
      const spikes = Array.from(byMonth.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const financialPatterns: DetectedPattern[] = [];

      if (transactions.length > 0) {
        financialPatterns.push({
          id: 'financial-high-risk',
          type: 'financial',
          title: 'High-risk financial transaction cluster',
          description: `Identified ${highRiskTx.length} high-risk transactions out of ${transactions.length} total, with aggregate volume ${totalAmount.toLocaleString(
            'en-US',
            {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            },
          )}.`,
          confidence:
            transactions.length > 0
              ? Math.min(100, 60 + Math.round((highRiskTx.length / transactions.length) * 40))
              : 60,
          severity:
            highRiskTx.length > 50
              ? 'critical'
              : highRiskTx.length > 10
                ? 'high'
                : highRiskTx.length > 0
                  ? 'medium'
                  : 'low',
          evidenceIds: highRiskTx
            .slice(0, 50)
            .map((t: Transaction) => String(t.id || t.tx_id || '')),
          timelineEventIds: [],
          entities: Array.from(
            new Set(
              highRiskTx
                .map((t: Transaction) => [t.from_entity, t.to_entity])
                .flat()
                .filter(Boolean)
                .map(String),
            ),
          ).slice(0, 10),
          metadata: {
            financialAmounts: spikes.map(([, v]) => v),
            timeRange: {
              start: spikes[spikes.length - 1]?.[0] || '',
              end: spikes[0]?.[0] || '',
            },
            anomalyScore: spikes.length > 0 ? 6 + Math.min(4, spikes.length) : 5,
          },
          recommendations: [
            'Prioritize forensic review of all high-risk transactions.',
            'Cross-link these transfers with entity risk scores and communication events.',
          ],
        });
      }

      // 4) Temporal pattern from document & entity counts
      const totalEntities = stats?.totalEntities || 0;
      const totalDocuments = stats?.totalDocuments || 0;

      const temporalPattern: DetectedPattern | null =
        totalDocuments && totalEntities
          ? {
              id: 'temporal-intensity',
              type: 'temporal',
              title: 'Intense investigative activity period',
              description:
                'Overall document and entity volumes indicate periods of intense activity that likely correspond to key investigative windows.',
              confidence: 80,
              severity: totalDocuments > 10000 ? 'high' : 'medium',
              evidenceIds: [],
              timelineEventIds: [],
              entities: [],
              metadata: {
                frequency: totalDocuments,
                anomalyScore: totalDocuments > 15000 ? 8 : 6,
              },
              recommendations: [
                'Overlay document creation dates with known timeline events to pinpoint surges.',
              ],
            }
          : null;

      const patterns: DetectedPattern[] = [
        ...relationshipPatterns,
        ...financialPatterns,
        ...(temporalPattern ? [temporalPattern] : []),
      ];

      setDetectedPatterns(patterns);
      setAnalysisProgress(100);
      setIsAnalyzing(false);

      if (onPatternDetected) {
        onPatternDetected(patterns);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Pattern analysis failed', err);
      setDetectedPatterns([]);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const getPatternIcon = (type: DetectedPattern['type']) => {
    const icons = {
      temporal: Clock,
      financial: DollarSign,
      communication: Activity,
      behavioral: Users,
      geographic: MapPin,
      network: Target,
    };
    return icons[type];
  };

  const getSeverityColor = (severity: DetectedPattern['severity']) => {
    const colors = {
      low: styles.severityLow,
      medium: styles.severityMedium,
      high: styles.severityHigh,
      critical: styles.severityCritical,
    };
    return colors[severity];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return styles.confidenceHigh;
    if (confidence >= 70) return styles.confidenceMedium;
    return styles.confidenceLow;
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title}>AI Pattern Recognition</h2>
            <p className={styles.subtitle}>
              Advanced AI analysis to detect suspicious patterns and anomalies
            </p>
          </div>
          <Button
            unstyled
            onClick={analyzePatterns}
            disabled={isAnalyzing}
            className={`${styles.primaryButton} ${isAnalyzing ? styles.primaryButtonDisabled : ''}`}
          >
            <BarChart3 className={styles.buttonIcon} />
            {isAnalyzing ? 'Analyzing...' : 'Start Pattern Analysis'}
          </Button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Analyzing patterns across evidence...</span>
            <span className={styles.progressValue}>{analysisProgress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${analysisProgress}%` }} />
          </div>
        </div>
      )}

      {/* Pattern Results */}
      {!isAnalyzing && detectedPatterns.length > 0 && (
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h3 className={styles.sectionTitle}>Detected Patterns ({detectedPatterns.length})</h3>
            <p className={styles.sectionBody}>
              AI has identified {detectedPatterns.length} suspicious patterns with varying
              confidence levels
            </p>
          </div>

          <div className={styles.patternList}>
            {detectedPatterns.map((pattern) => {
              const Icon = getPatternIcon(pattern.type);
              return (
                <div
                  key={pattern.id}
                  className={`${styles.patternCard} ${
                    selectedPattern?.id === pattern.id ? styles.patternCardSelected : ''
                  }`}
                  onClick={() => setSelectedPattern(pattern)}
                >
                  <div className={styles.patternRow}>
                    <div className={styles.patternInfo}>
                      <div
                        className={`${styles.patternIconWrap} ${getSeverityColor(pattern.severity)}`}
                      >
                        <Icon className={styles.patternIcon} />
                      </div>
                      <div className={styles.patternInfoBody}>
                        <div className={styles.patternMeta}>
                          <h4 className={styles.patternName}>{pattern.title}</h4>
                          <div className={styles.patternBadges}>
                            <span
                              className={`${styles.confidence} ${getConfidenceColor(pattern.confidence)}`}
                            >
                              {pattern.confidence}% confidence
                            </span>
                            <span
                              className={`${styles.severityBadge} ${getSeverityColor(pattern.severity)}`}
                            >
                              {pattern.severity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <p className={styles.patternDescription}>{pattern.description}</p>
                        <div className={styles.patternStats}>
                          <span>Type: {pattern.type}</span>
                          <span>Entities: {pattern.entities.length}</span>
                          <span>Evidence: {pattern.evidenceIds.length} items</span>
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
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{selectedPattern.title}</h3>
                <div className={styles.modalBadgeRow}>
                  <span
                    className={`${styles.severityBadge} ${getSeverityColor(selectedPattern.severity)}`}
                  >
                    {selectedPattern.severity.toUpperCase()}
                  </span>
                  <span
                    className={`${styles.confidence} ${getConfidenceColor(selectedPattern.confidence)}`}
                  >
                    {selectedPattern.confidence}% confidence
                  </span>
                </div>
              </div>
              <CloseButton
                onClick={() => setSelectedPattern(null)}
                size="sm"
                label="Close pattern details"
                className={styles.closeButton}
              />
            </div>

            <div className={styles.modalContent}>
              <div>
                <h4 className={styles.fieldTitle}>Description</h4>
                <p className={styles.fieldText}>{selectedPattern.description}</p>
              </div>

              <div>
                <h4 className={styles.fieldTitle}>Involved Entities</h4>
                <div className={styles.chipRow}>
                  {selectedPattern.entities.map((entity, index) => (
                    <span key={index} className={styles.chip}>
                      {entity}
                    </span>
                  ))}
                </div>
              </div>

              {selectedPattern.metadata.timeRange && (
                <div>
                  <h4 className={styles.fieldTitle}>Time Range</h4>
                  <p className={styles.fieldText}>
                    {selectedPattern.metadata.timeRange.start} to{' '}
                    {selectedPattern.metadata.timeRange.end}
                  </p>
                </div>
              )}

              {selectedPattern.metadata.locations &&
                selectedPattern.metadata.locations.length > 0 && (
                  <div>
                    <h4 className={styles.fieldTitle}>Locations</h4>
                    <div className={styles.chipRow}>
                      {selectedPattern.metadata.locations.map((location, index) => (
                        <span key={index} className={`${styles.chip} ${styles.locationChip}`}>
                          {location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <h4 className={styles.fieldTitle}>Investigation Recommendations</h4>
                <ul className={styles.recommendations}>
                  {selectedPattern.recommendations.map((recommendation, index) => (
                    <li key={index} className={styles.recommendation}>
                      <span className={styles.recommendationDot}></span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                unstyled
                onClick={() => setSelectedPattern(null)}
                className={styles.secondaryButton}
              >
                Close
              </Button>
              <Button unstyled className={styles.primaryButton}>
                Add to Investigation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && detectedPatterns.length === 0 && (
        <div className={styles.emptyState}>
          <BarChart3 className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No patterns detected yet</h3>
          <p className={styles.emptyBody}>
            Start pattern analysis to identify suspicious activities, behavioral patterns, and
            anomalies in your evidence.
          </p>
          <Button unstyled onClick={analyzePatterns} className={styles.primaryButton}>
            Start Pattern Analysis
          </Button>
        </div>
      )}
    </div>
  );
};
