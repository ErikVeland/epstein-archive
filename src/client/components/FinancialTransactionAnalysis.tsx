import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  ArrowRight,
  Filter,
  AlertTriangle,
  MapPin,
  Users,
} from 'lucide-react';
import { CloseButton } from './common/CloseButton';
import styles from './FinancialTransactionAnalysis.module.css';

interface FinancialTransactionAnalysisProps {
  onTransactionPatternDetected?: (patterns: TransactionPattern[]) => void;
}

export interface TransactionPattern {
  id: string;
  type: 'flow' | 'timing' | 'amount' | 'geographic' | 'entity' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entities: string[];
  evidenceIds: string[];
  metadata: {
    totalAmount?: number;
    transactionCount?: number;
    timeRange?: { start: string; end: string };
    locations?: string[];
    averageAmount?: number;
    largestTransaction?: number;
    frequency?: number;
    anomalyScore?: number;
    flowDirection?: 'inflow' | 'outflow' | 'circular';
  };
  recommendations: string[];
}

export const FinancialTransactionAnalysis: React.FC<FinancialTransactionAnalysisProps> = ({
  onTransactionPatternDetected,
}) => {
  const [transactionPatterns, setTransactionPatterns] = useState<TransactionPattern[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<TransactionPattern | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMessage, setAnalysisMessage] = useState<string>('');
  const [filterType, setFilterType] = useState<
    'all' | 'flow' | 'timing' | 'amount' | 'geographic' | 'entity' | 'anomaly'
  >('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'confidence' | 'severity'>('confidence');

  const analyzeTransactions = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisMessage('');

    // Simulate progressive analysis
    const progressSteps = [
      { progress: 12, message: 'Parsing financial documents...' },
      { progress: 25, message: 'Analyzing transaction flows...' },
      { progress: 38, message: 'Detecting timing patterns...' },
      { progress: 51, message: 'Mapping geographic distribution...' },
      { progress: 64, message: 'Identifying entity relationships...' },
      { progress: 77, message: 'Calculating anomaly scores...' },
      { progress: 90, message: 'Cross-referencing with known patterns...' },
      { progress: 100, message: 'Transaction analysis complete!' },
    ];

    for (const step of progressSteps) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAnalysisProgress(step.progress);
    }

    try {
      const response = await fetch('/api/financial/transactions?limit=5000');
      const payload = await response.json();
      const transactions = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.transactions)
          ? payload.transactions
          : [];

      const txAmounts = transactions
        .map((tx: Record<string, unknown>) => Number(tx.amount ?? tx.transaction_amount ?? 0))
        .filter((amount: number) => Number.isFinite(amount) && amount > 0);

      const totalAmount = txAmounts.reduce((sum: number, value: number) => sum + value, 0);
      const largest = txAmounts.reduce((max: number, value: number) => Math.max(max, value), 0);
      const avg = txAmounts.length > 0 ? totalAmount / txAmounts.length : 0;

      const highRisk = transactions.filter((tx: Record<string, unknown>) => {
        const risk = String(tx.risk_level ?? tx.risk ?? '').toLowerCase();
        return risk === 'high' || risk === 'critical';
      });

      const byLocation = new Map<string, number>();
      for (const tx of transactions) {
        const location = String(
          tx.location ?? tx.country ?? tx.origin_country ?? tx.destination_country ?? '',
        ).trim();
        if (!location) continue;
        byLocation.set(location, (byLocation.get(location) || 0) + 1);
      }
      const frequentLocations = [...byLocation.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([location]) => location);

      const derivedPatterns: TransactionPattern[] = [];

      if (transactions.length > 0) {
        derivedPatterns.push({
          id: 'finance-derived-overview',
          type: 'amount',
          title: 'Transaction volume profile',
          description:
            'Derived from ingested financial transactions. Review totals, distribution, and concentration before escalation.',
          confidence: 80,
          severity: highRisk.length > 0 ? 'high' : 'medium',
          entities: [],
          evidenceIds: [],
          metadata: {
            totalAmount,
            transactionCount: transactions.length,
            averageAmount: avg,
            largestTransaction: largest,
          },
          recommendations: [
            'Investigate top-value transactions first.',
            'Cross-check outliers against source documents.',
          ],
        });
      }

      if (frequentLocations.length > 0) {
        derivedPatterns.push({
          id: 'finance-derived-geography',
          type: 'geographic',
          title: 'Transaction location concentration',
          description: 'Most frequent locations computed from live transaction location fields.',
          confidence: 72,
          severity: 'medium',
          entities: [],
          evidenceIds: [],
          metadata: {
            transactionCount: transactions.length,
            locations: frequentLocations,
          },
          recommendations: [
            'Verify jurisdictional risk and banking secrecy exposure.',
            'Correlate location clusters with timeline events.',
          ],
        });
      }

      setTransactionPatterns(derivedPatterns);
      if (derivedPatterns.length === 0) {
        setAnalysisMessage('No transaction records are currently available to analyze.');
      }
      onTransactionPatternDetected?.(derivedPatterns);
    } catch (error) {
      console.error('Failed to analyze transactions from API:', error);
      setTransactionPatterns([]);
      setAnalysisMessage('Financial analysis failed because transaction data could not be loaded.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPatternIcon = (type: TransactionPattern['type']) => {
    const icons = {
      flow: ArrowRight,
      timing: Calendar,
      amount: DollarSign,
      geographic: MapPin,
      entity: Users,
      anomaly: AlertTriangle,
    };
    return icons[type];
  };

  const getSeverityColor = (severity: TransactionPattern['severity']) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPatterns =
    filterType === 'all'
      ? transactionPatterns
      : transactionPatterns.filter((pattern) => pattern.type === filterType);

  const sortedPatterns = [...filteredPatterns].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.confidence - a.confidence;
      case 'severity': {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      case 'amount':
        return (b.metadata.totalAmount || 0) - (a.metadata.totalAmount || 0);
      default:
        return 0;
    }
  });

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title}>Financial Transaction Analysis</h2>
            <p className={styles.subtitle}>
              Analyze financial flows, timing patterns, and transaction anomalies
            </p>
          </div>
          <button
            onClick={analyzeTransactions}
            disabled={isAnalyzing}
            className={`${styles.primaryButton} ${isAnalyzing ? styles.primaryButtonDisabled : ''}`}
          >
            <DollarSign className={styles.buttonIcon} />
            {isAnalyzing ? 'Analyzing...' : 'Start Financial Analysis'}
          </button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>
              Analyzing financial transaction patterns...
            </span>
            <span className={styles.progressValue}>{analysisProgress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${analysisProgress}%` }} />
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      {!isAnalyzing && transactionPatterns.length > 0 && (
        <div className={styles.filterBar}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <Filter className={styles.mutedIcon} />
              <span className={styles.label}>Filter by type:</span>
              <div className={styles.pillRow}>
                {['all', 'flow', 'timing', 'amount', 'geographic', 'entity', 'anomaly'].map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type as typeof filterType)}
                      className={`${styles.filterPill} ${
                        filterType === type ? styles.filterPillActive : styles.filterPillInactive
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className={styles.sortGroup}>
              <span className={styles.label}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className={styles.select}
              >
                <option value="confidence">Confidence</option>
                <option value="severity">Severity</option>
                <option value="amount">Total Amount</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {!isAnalyzing && transactionPatterns.length > 0 && (
        <div className={styles.summaryBar}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>
                {formatCurrency(
                  transactionPatterns.reduce(
                    (sum, pattern) => sum + (pattern.metadata.totalAmount || 0),
                    0,
                  ),
                )}
              </div>
              <div className={styles.summaryLabel}>Total Analyzed</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>
                {transactionPatterns.reduce(
                  (sum, pattern) => sum + (pattern.metadata.transactionCount || 0),
                  0,
                )}
              </div>
              <div className={styles.summaryLabel}>Transactions</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>
                {transactionPatterns.filter((p) => p.severity === 'critical').length}
              </div>
              <div className={styles.summaryLabel}>Critical Patterns</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>
                {Math.round(
                  transactionPatterns.reduce((sum, pattern) => sum + pattern.confidence, 0) /
                    transactionPatterns.length,
                )}
                %
              </div>
              <div className={styles.summaryLabel}>Avg Confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Results */}
      {!isAnalyzing && sortedPatterns.length > 0 && (
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h3 className={styles.sectionTitle}>
              Detected Financial Patterns ({sortedPatterns.length})
            </h3>
            <p className={styles.sectionBody}>
              Analysis identified {transactionPatterns.length} suspicious financial patterns
              {filterType !== 'all' && ` (${sortedPatterns.length} matching current filter)`}
            </p>
          </div>

          <div className={styles.patternList}>
            {sortedPatterns.map((pattern) => {
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
                      <div className={styles.patternBody}>
                        <div className={styles.patternMeta}>
                          <h4 className={styles.patternName}>{pattern.title}</h4>
                          <div className={styles.patternBadges}>
                            {pattern.metadata.totalAmount && (
                              <span className={styles.amountValue}>
                                {formatCurrency(pattern.metadata.totalAmount)}
                              </span>
                            )}
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
                          {pattern.metadata.transactionCount && (
                            <span>Transactions: {pattern.metadata.transactionCount}</span>
                          )}
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

              <div className={styles.detailGrid}>
                {selectedPattern.metadata.totalAmount && (
                  <div>
                    <h4 className={styles.fieldTitle}>Total Amount</h4>
                    <p className={styles.fieldValue}>
                      {formatCurrency(selectedPattern.metadata.totalAmount)}
                    </p>
                  </div>
                )}
                {selectedPattern.metadata.transactionCount && (
                  <div>
                    <h4 className={styles.fieldTitle}>Transaction Count</h4>
                    <p className={styles.fieldValue}>{selectedPattern.metadata.transactionCount}</p>
                  </div>
                )}
                {selectedPattern.metadata.averageAmount && (
                  <div>
                    <h4 className={styles.fieldTitle}>Average Amount</h4>
                    <p className={styles.fieldValue}>
                      {formatCurrency(selectedPattern.metadata.averageAmount)}
                    </p>
                  </div>
                )}
                {selectedPattern.metadata.largestTransaction && (
                  <div>
                    <h4 className={styles.fieldTitle}>Largest Transaction</h4>
                    <p className={styles.fieldValue}>
                      {formatCurrency(selectedPattern.metadata.largestTransaction)}
                    </p>
                  </div>
                )}
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
              <button onClick={() => setSelectedPattern(null)} className={styles.secondaryButton}>
                Close
              </button>
              <button className={styles.primaryButton}>Add to Investigation</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && transactionPatterns.length === 0 && (
        <div className={styles.emptyState}>
          <DollarSign className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No financial patterns detected yet</h3>
          <p className={styles.emptyBody}>
            Start financial transaction analysis to identify suspicious patterns in money flows,
            timing, amounts, and geographic distribution.
          </p>
          {analysisMessage ? <p className={styles.warningNote}>{analysisMessage}</p> : null}
          <button onClick={analyzeTransactions} className={styles.primaryButton}>
            Start Financial Analysis
          </button>
        </div>
      )}
    </div>
  );
};
