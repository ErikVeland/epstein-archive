import React, { useState } from 'react';
import { BarChart3, Target, Clock, DollarSign, Users, MapPin, Activity } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { CloseButton } from './common/CloseButton';

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
          const relJson = await relRes.json().catch(() => ({}));
          const rels: any[] = Array.isArray(relJson?.relationships) ? relJson.relationships : [];

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
      const totalAmount = transactions.reduce(
        (sum: number, t: any) => sum + (Number(t.amount) || 0),
        0,
      );
      const highRiskTx = transactions.filter((t: any) =>
        ['high', 'critical'].includes(String(t.risk_level || '').toLowerCase()),
      );

      const byMonth = new Map<string, number>();
      for (const tx of transactions) {
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
          evidenceIds: highRiskTx.slice(0, 50).map((t: any) => String(t.id || t.tx_id || '')),
          timelineEventIds: [],
          entities: Array.from(
            new Set(
              highRiskTx
                .map((t: any) => [t.from_entity, t.to_entity])
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

  return (
    <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)]">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              AI Pattern Recognition
            </h2>
            <p className="text-sm text-[var(--text-primary)] mt-1">
              Advanced AI analysis to detect suspicious patterns and anomalies
            </p>
          </div>
          <button
            onClick={analyzePatterns}
            disabled={isAnalyzing}
            className="flex items-center px-4 py-2 bg-purple-600 text-[var(--text-primary)] rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Start Pattern Analysis'}
          </button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-900">
              Analyzing patterns across evidence...
            </span>
            <span className="text-sm text-purple-700">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Pattern Results */}
      {!isAnalyzing && detectedPatterns.length > 0 && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Detected Patterns ({detectedPatterns.length})
            </h3>
            <p className="text-sm text-[var(--text-primary)]">
              AI has identified {detectedPatterns.length} suspicious patterns with varying
              confidence levels
            </p>
          </div>

          <div className="grid gap-4">
            {detectedPatterns.map((pattern) => {
              const Icon = getPatternIcon(pattern.type);
              return (
                <div
                  key={pattern.id}
                  className={`border rounded-[var(--radius-lg)] p-4 cursor-pointer transition-all hover:shadow-[var(--glass-shadow)] ${
                    selectedPattern?.id === pattern.id ? 'ring-2 ring-purple-500' : ''
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
                label="Close pattern details"
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
                  Involved Entities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPattern.entities.map((entity, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-[var(--app-bg)] text-[var(--text-primary)] text-xs rounded"
                    >
                      {entity}
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

              {selectedPattern.metadata.locations &&
                selectedPattern.metadata.locations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      Locations
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPattern.metadata.locations.map((location, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {location}
                        </span>
                      ))}
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
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2 mr-2 flex-shrink-0"></span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedPattern(null)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--app-bg)] rounded-md hover:bg-[var(--app-bg)] transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-purple-600 rounded-md hover:bg-purple-700 transition-colors">
                Add to Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && detectedPatterns.length === 0 && (
        <div className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
            No patterns detected yet
          </h3>
          <p className="text-sm text-[var(--text-primary)] mb-4">
            Start pattern analysis to identify suspicious activities, behavioral patterns, and
            anomalies in your evidence.
          </p>
          <button
            onClick={analyzePatterns}
            className="px-4 py-2 bg-purple-600 text-[var(--text-primary)] text-sm rounded-md hover:bg-purple-700 transition-colors"
          >
            Start Pattern Analysis
          </button>
        </div>
      )}
    </div>
  );
};
