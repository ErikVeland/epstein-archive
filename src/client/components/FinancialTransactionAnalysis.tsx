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
    <div className="bg-[var(--text-primary)] rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)]">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Financial Transaction Analysis
            </h2>
            <p className="text-sm text-[var(--text-primary)] mt-1">
              Analyze financial flows, timing patterns, and transaction anomalies
            </p>
          </div>
          <button
            onClick={analyzeTransactions}
            disabled={isAnalyzing}
            className="flex items-center px-4 py-2 bg-green-600 text-[var(--text-primary)] rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Start Financial Analysis'}
          </button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="px-6 py-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">
              Analyzing financial transaction patterns...
            </span>
            <span className="text-sm text-green-700">{analysisProgress}%</span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      {!isAnalyzing && transactionPatterns.length > 0 && (
        <div className="px-6 py-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Filter className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Filter by type:
              </span>
              <div className="flex gap-2">
                {['all', 'flow', 'timing', 'amount', 'geographic', 'entity', 'anomaly'].map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type as typeof filterType)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        filterType === type
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[var(--app-bg)] text-[var(--text-primary)] hover:bg-[var(--app-bg)]'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1 text-xs border border-[var(--glass-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
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
        <div className="px-6 py-4 bg-[var(--app-bg)] border-b border-[var(--glass-border)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  transactionPatterns.reduce(
                    (sum, pattern) => sum + (pattern.metadata.totalAmount || 0),
                    0,
                  ),
                )}
              </div>
              <div className="text-sm text-[var(--text-primary)]">Total Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {transactionPatterns.reduce(
                  (sum, pattern) => sum + (pattern.metadata.transactionCount || 0),
                  0,
                )}
              </div>
              <div className="text-sm text-[var(--text-primary)]">Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {transactionPatterns.filter((p) => p.severity === 'critical').length}
              </div>
              <div className="text-sm text-[var(--text-primary)]">Critical Patterns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {Math.round(
                  transactionPatterns.reduce((sum, pattern) => sum + pattern.confidence, 0) /
                    transactionPatterns.length,
                )}
                %
              </div>
              <div className="text-sm text-[var(--text-primary)]">Avg Confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Results */}
      {!isAnalyzing && sortedPatterns.length > 0 && (
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Detected Financial Patterns ({sortedPatterns.length})
            </h3>
            <p className="text-sm text-[var(--text-primary)]">
              Analysis identified {transactionPatterns.length} suspicious financial patterns
              {filterType !== 'all' && ` (${sortedPatterns.length} matching current filter)`}
            </p>
          </div>

          <div className="grid gap-4">
            {sortedPatterns.map((pattern) => {
              const Icon = getPatternIcon(pattern.type);

              return (
                <div
                  key={pattern.id}
                  className={`border rounded-[var(--radius-lg)] p-4 cursor-pointer transition-all hover:shadow-[var(--glass-shadow)] ${
                    selectedPattern?.id === pattern.id ? 'ring-2 ring-green-500' : ''
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
                            {pattern.metadata.totalAmount && (
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {formatCurrency(pattern.metadata.totalAmount)}
                              </span>
                            )}
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
        <div className="fixed inset-0 bg-[var(--glass-bg-strong)] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--text-primary)] rounded-[var(--radius-lg)] p-6 w-full max-w-2xl max-h-96 overflow-auto">
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

              <div className="grid grid-cols-2 gap-4">
                {selectedPattern.metadata.totalAmount && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      Total Amount
                    </h4>
                    <p className="text-sm text-[var(--text-primary)] font-medium">
                      {formatCurrency(selectedPattern.metadata.totalAmount)}
                    </p>
                  </div>
                )}
                {selectedPattern.metadata.transactionCount && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      Transaction Count
                    </h4>
                    <p className="text-sm text-[var(--text-primary)] font-medium">
                      {selectedPattern.metadata.transactionCount}
                    </p>
                  </div>
                )}
                {selectedPattern.metadata.averageAmount && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      Average Amount
                    </h4>
                    <p className="text-sm text-[var(--text-primary)] font-medium">
                      {formatCurrency(selectedPattern.metadata.averageAmount)}
                    </p>
                  </div>
                )}
                {selectedPattern.metadata.largestTransaction && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      Largest Transaction
                    </h4>
                    <p className="text-sm text-[var(--text-primary)] font-medium">
                      {formatCurrency(selectedPattern.metadata.largestTransaction)}
                    </p>
                  </div>
                )}
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
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 mr-2 flex-shrink-0"></span>
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
              <button className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-green-600 rounded-md hover:bg-green-700 transition-colors">
                Add to Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && transactionPatterns.length === 0 && (
        <div className="p-12 text-center">
          <DollarSign className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
            No financial patterns detected yet
          </h3>
          <p className="text-sm text-[var(--text-primary)] mb-4">
            Start financial transaction analysis to identify suspicious patterns in money flows,
            timing, amounts, and geographic distribution.
          </p>
          {analysisMessage ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
              {analysisMessage}
            </p>
          ) : null}
          <button
            onClick={analyzeTransactions}
            className="px-4 py-2 bg-green-600 text-[var(--text-primary)] text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            Start Financial Analysis
          </button>
        </div>
      )}
    </div>
  );
};
