import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { Button, Select } from '@client/design-system/lib';
import { useIsMobile } from '@client/hooks/useIsMobile';
import { MobileStackHeader } from '../layout/MobileStackHeader';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import styles from './FinancialTransactionMapper.module.css';

interface Transaction {
  id: string;
  fromEntity: string;
  toEntity: string;
  amount: number;
  currency: string;
  date: string;
  type: 'payment' | 'transfer' | 'investment' | 'loan' | 'shell_company' | 'offshore';
  method: 'wire' | 'cash' | 'check' | 'crypto' | 'shell';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suspiciousIndicators: string[];
  sourceDocuments: string[];
}

interface TransactionFlow {
  entity: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  transactionCount: number;
  riskScore: number;
  connections: string[];
}

interface FinancialPattern {
  type: 'layering' | 'structuring' | 'integration' | 'shell_network' | 'round_trip';
  confidence: number;
  transactions: string[];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface FinancialTransactionMapperProps {
  investigationId?: string | number;
}

interface FinancialSnapshot {
  financialTransactions?: Record<string, unknown>[];
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  }
  return '';
}

function normalizeType(value: string): Transaction['type'] {
  const normalized = value.toLowerCase();
  if (
    normalized === 'payment' ||
    normalized === 'transfer' ||
    normalized === 'investment' ||
    normalized === 'loan' ||
    normalized === 'shell_company' ||
    normalized === 'offshore'
  ) {
    return normalized;
  }
  return 'transfer';
}

function normalizeMethod(value: string): Transaction['method'] {
  const normalized = value.toLowerCase();
  if (
    normalized === 'wire' ||
    normalized === 'cash' ||
    normalized === 'check' ||
    normalized === 'crypto' ||
    normalized === 'shell'
  ) {
    return normalized;
  }
  return 'wire';
}

function normalizeRisk(value: string, rating: unknown): Transaction['riskLevel'] {
  const normalized = value.toLowerCase();
  if (
    normalized === 'low' ||
    normalized === 'medium' ||
    normalized === 'high' ||
    normalized === 'critical'
  ) {
    return normalized;
  }

  const numeric = Number(rating);
  if (Number.isFinite(numeric)) {
    if (numeric >= 9) return 'critical';
    if (numeric >= 7) return 'high';
    if (numeric >= 3) return 'medium';
    return 'low';
  }

  return 'medium';
}

function normalizeTransaction(tx: Record<string, unknown>): Transaction {
  const rawId = firstString(tx.id, tx.transactionId);
  return {
    id: rawId.startsWith('tx-') ? rawId : `tx-${rawId}`,
    fromEntity: firstString(tx.fromEntity, tx.from_entity, tx.fromEntityName, tx.from_entity_name),
    toEntity: firstString(tx.toEntity, tx.to_entity, tx.toEntityName, tx.to_entity_name),
    amount: Number(tx.amount || 0),
    currency: firstString(tx.currency) || 'USD',
    date: firstString(tx.date, tx.transaction_date),
    type: normalizeType(firstString(tx.type, tx.transactionType, tx.transaction_type)),
    method: normalizeMethod(firstString(tx.method)),
    riskLevel: normalizeRisk(
      firstString(tx.riskLevel, tx.risk_level),
      tx.riskRating ?? tx.risk_rating,
    ),
    description: firstString(tx.description),
    suspiciousIndicators: Array.isArray(tx.suspiciousIndicators)
      ? (tx.suspiciousIndicators as string[])
      : [],
    sourceDocuments: Array.isArray(tx.sourceDocuments)
      ? (tx.sourceDocuments as string[])
      : Array.isArray(tx.sourceDocumentIds)
        ? (tx.sourceDocumentIds as string[])
        : [],
  };
}

async function loadFinancialSnapshot(): Promise<Transaction[]> {
  const response = await fetch('/data/dashboard_snapshot.json');
  if (!response.ok) return [];
  const snapshot = (await response.json()) as FinancialSnapshot;
  return (snapshot.financialTransactions || []).map(normalizeTransaction);
}

function getRiskScoreValue(riskLevel: string): number {
  switch (riskLevel) {
    case 'low':
      return 1;
    case 'medium':
      return 3;
    case 'high':
      return 7;
    case 'critical':
      return 10;
    default:
      return 0;
  }
}

function analyzeTransactionFlows(transactions: Transaction[]): TransactionFlow[] {
  const entityMap = new Map<string, TransactionFlow>();

  transactions.forEach((tx) => {
    if (!entityMap.has(tx.fromEntity)) {
      entityMap.set(tx.fromEntity, {
        entity: tx.fromEntity,
        inflow: 0,
        outflow: 0,
        netFlow: 0,
        transactionCount: 0,
        riskScore: 0,
        connections: [],
      });
    }
    if (!entityMap.has(tx.toEntity)) {
      entityMap.set(tx.toEntity, {
        entity: tx.toEntity,
        inflow: 0,
        outflow: 0,
        netFlow: 0,
        transactionCount: 0,
        riskScore: 0,
        connections: [],
      });
    }

    const fromFlow = entityMap.get(tx.fromEntity) as TransactionFlow;
    const toFlow = entityMap.get(tx.toEntity) as TransactionFlow;

    fromFlow.outflow += tx.amount;
    fromFlow.netFlow -= tx.amount;
    fromFlow.transactionCount++;
    fromFlow.riskScore += getRiskScoreValue(tx.riskLevel);
    if (!fromFlow.connections.includes(tx.toEntity)) fromFlow.connections.push(tx.toEntity);

    toFlow.inflow += tx.amount;
    toFlow.netFlow += tx.amount;
    toFlow.transactionCount++;
    toFlow.riskScore += getRiskScoreValue(tx.riskLevel);
    if (!toFlow.connections.includes(tx.fromEntity)) toFlow.connections.push(tx.fromEntity);
  });

  return Array.from(entityMap.values());
}

function detectRoundTripPattern(transactions: Transaction[]): FinancialPattern | null {
  const epsteinOutflows = transactions.filter((tx) => tx.fromEntity === 'Jeffrey Epstein');
  const epsteinInflows = transactions.filter((tx) => tx.toEntity === 'Jeffrey Epstein');

  const suspiciousRoundTrip = epsteinOutflows.some((outTx) =>
    epsteinInflows.some((inTx) => {
      const daysDiff = Math.abs(
        (new Date(inTx.date).getTime() - new Date(outTx.date).getTime()) / (1000 * 3600 * 24),
      );
      return daysDiff < 365 && Math.abs(inTx.amount - outTx.amount) < outTx.amount * 0.2;
    }),
  );

  if (suspiciousRoundTrip) {
    return {
      type: 'round_trip',
      confidence: 78,
      transactions: transactions.map((tx) => tx.id),
      description: 'Suspicious round-trip transactions suggesting artificial fund movement',
      severity: 'high',
    };
  }
  return null;
}

function detectFinancialPatterns(transactions: Transaction[]): FinancialPattern[] {
  const patterns: FinancialPattern[] = [];

  const layeringTxs = transactions.filter(
    (tx) => tx.type === 'transfer' && tx.riskLevel === 'critical' && tx.amount > 5000000,
  );
  if (layeringTxs.length >= 2) {
    patterns.push({
      type: 'layering',
      confidence: 85,
      transactions: layeringTxs.map((tx) => tx.id),
      description: 'Multiple large transfers suggesting money laundering layering phase',
      severity: 'critical',
    });
  }

  const shellTxs = transactions.filter(
    (tx) =>
      tx.type === 'transfer' &&
      (tx.method === 'shell' || tx.toEntity.includes('Trust') || tx.toEntity.includes('LLC')),
  );
  if (shellTxs.length >= 2) {
    patterns.push({
      type: 'shell_network',
      confidence: 92,
      transactions: shellTxs.map((tx) => tx.id),
      description: 'Network of shell companies used to obscure beneficial ownership',
      severity: 'high',
    });
  }

  const epsteinTxs = transactions.filter(
    (tx) => tx.fromEntity === 'Jeffrey Epstein' || tx.toEntity === 'Jeffrey Epstein',
  );
  const roundTripPattern = detectRoundTripPattern(epsteinTxs);
  if (roundTripPattern) patterns.push(roundTripPattern);

  return patterns;
}

export default function FinancialTransactionMapper({
  investigationId,
}: FinancialTransactionMapperProps = {}) {
  const isMobile = useIsMobile();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [viewMode, setViewMode] = useState<'flow' | 'network' | 'timeline' | 'patterns'>('flow');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterAmount, setFilterAmount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['financial-transactions', investigationId],
    queryFn: async () => {
      const endpoint = investigationId
        ? `/api/investigations/${investigationId}/transactions`
        : '/api/financial/transactions';

      const response = await fetch(endpoint);
      if (!response.ok) {
        return loadFinancialSnapshot();
      }

      const data = await response.json();
      // An empty array is a valid response (investigation has no transactions).
      // Do not replace a legitimate empty result with unrelated snapshot data.
      if (!data) return loadFinancialSnapshot();
      if (data.length === 0) return [];

      return (data as Record<string, unknown>[]).map(normalizeTransaction);
    },
  });

  const flowAnalysis = useMemo(() => analyzeTransactionFlows(transactions), [transactions]);
  const detectedPatterns = useMemo(() => detectFinancialPatterns(transactions), [transactions]);

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      searchTerm === '' ||
      tx.fromEntity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.toEntity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = filterRisk === 'all' || tx.riskLevel === filterRisk;

    const matchesAmount =
      filterAmount === 'all' ||
      (filterAmount === 'small' && tx.amount < 100000) ||
      (filterAmount === 'medium' && tx.amount >= 100000 && tx.amount < 5000000) ||
      (filterAmount === 'large' && tx.amount >= 5000000);

    const matchesDate =
      (!dateRange.start || tx.date >= dateRange.start) &&
      (!dateRange.end || tx.date <= dateRange.end);

    return matchesSearch && matchesRisk && matchesAmount && matchesDate;
  });

  const exportTransactionData = () => {
    const data = {
      transactions: filteredTransactions,
      flowAnalysis: flowAnalysis,
      detectedPatterns: detectedPatterns,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epstein-financial-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header - HIDDEN ON MOBILE (Uses Workspace Header) */}
        {!isMobile && (
          <div className={styles.header}>
            <h1 className={styles.title}>Financial Transaction Mapper</h1>
            <p className={styles.subtitle}>
              Advanced forensic analysis of financial flows and suspicious patterns
            </p>
          </div>
        )}

        {/* Controls - Stacked Layout */}
        <div className={`${styles.panel} ${styles.controls}`}>
          {/* Search Row */}
          <div className={styles.searchRow}>
            <div className={styles.searchWrap}>
              <Icon name="Search" className={styles.searchIcon} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search entities, descriptions, or transaction details..."
                className={styles.textInput}
              />
            </div>
          </div>

          {/* Filters Row - Stacked Layout */}
          <div className={styles.filters}>
            <div className={styles.filterGrid}>
              <div>
                <label className={styles.fieldLabel}>Risk Level</label>
                <Select
                  size="sm"
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className={styles.selectInput}
                  options={[
                    { value: 'all', label: 'All Risk Levels' },
                    { value: 'low', label: 'Low Risk' },
                    { value: 'medium', label: 'Medium Risk' },
                    { value: 'high', label: 'High Risk' },
                    { value: 'critical', label: 'Critical Risk' },
                  ]}
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Amount Range</label>
                <Select
                  size="sm"
                  value={filterAmount}
                  onChange={(e) => setFilterAmount(e.target.value)}
                  className={styles.selectInput}
                  options={[
                    { value: 'all', label: 'All Amounts' },
                    { value: 'small', label: 'Under $100K' },
                    { value: 'medium', label: '$100K - $5M' },
                    { value: 'large', label: 'Over $5M' },
                  ]}
                />
              </div>
            </div>

            <div className={styles.filterGrid}>
              <div>
                <label className={styles.fieldLabel}>Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className={styles.dateInput}
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className={styles.dateInput}
                />
              </div>
            </div>
          </div>

          {/* Actions Row */}
          <div className={styles.actionsRow}>
            <div className={styles.actionsLeft}>
              <Select
                size="sm"
                value={viewMode}
                onChange={(e) =>
                  setViewMode(e.target.value as 'flow' | 'network' | 'timeline' | 'patterns')
                }
                className={styles.selectInput}
                options={[
                  { value: 'flow', label: 'Flow Analysis' },
                  { value: 'network', label: 'Network View' },
                  { value: 'timeline', label: 'Timeline' },
                  { value: 'patterns', label: 'Detected Patterns' },
                ]}
              />

              <span className={styles.transactionCount}>
                {filteredTransactions.length} transactions
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={exportTransactionData}
              className={styles.exportButton}
            >
              <Icon name="Download" className={styles.calendarIcon} />
              Export Data
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <div>
                <p className={styles.summaryLabel}>Total Transactions</p>
                <p
                  className={`${styles.summaryValue} ${styles.summaryAccent} ${isMobile ? styles.summaryMobile : ''}`}
                >
                  {filteredTransactions.length}
                </p>
              </div>
              <Icon name="TrendingUp" className={`${styles.summaryIcon} ${styles.summaryAccent}`} />
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <div>
                <p className={styles.summaryLabel}>Total Value</p>
                <p
                  className={`${styles.summaryValue} ${styles.summaryGreen} ${isMobile ? styles.summaryMobile : ''}`}
                >
                  {formatCurrency(filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                </p>
              </div>
              <Icon name="DollarSign" className={`${styles.summaryIcon} ${styles.summaryGreen}`} />
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <div>
                <p className={styles.summaryLabel}>High Risk</p>
                <p
                  className={`${styles.summaryValue} ${styles.summaryYellow} ${isMobile ? styles.summaryMobile : ''}`}
                >
                  {
                    filteredTransactions.filter(
                      (tx) => tx.riskLevel === 'high' || tx.riskLevel === 'critical',
                    ).length
                  }
                </p>
              </div>
              <Icon
                name="AlertTriangle"
                className={`${styles.summaryIcon} ${styles.summaryYellow}`}
              />
            </div>
          </div>

          {!isMobile && (
            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <div>
                  <p className={styles.summaryLabel}>Patterns Detected</p>
                  <p className={`${styles.summaryValue} ${styles.summaryRed}`}>
                    {detectedPatterns.length}
                  </p>
                </div>
                <Icon name="Filter" className={`${styles.summaryIcon} ${styles.summaryRed}`} />
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className={styles.contentGrid}>
          {/* Transaction List */}
          <div className={styles.mainColumn}>
            <div className={styles.panel}>
              <h2 className={styles.sectionTitle}>Transactions</h2>
              <div className={styles.transactionList}>
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className={`${
                      selectedTransaction?.id === transaction.id
                        ? `${styles.transactionItem} ${styles.transactionItemSelected}`
                        : styles.transactionItem
                    }`}
                  >
                    <div className={styles.transactionHeader}>
                      <div className={styles.transactionTop}>
                        <div className={styles.transactionRoute}>
                          <Icon name="User" className={styles.routeIconMuted} />
                          <span className={styles.routeEntity} title={transaction.fromEntity}>
                            {transaction.fromEntity}
                          </span>
                          <Icon name="TrendingDown" className={styles.routeIconDanger} />
                          <Icon name="User" className={styles.routeIconMuted} />
                          <span className={styles.routeEntity} title={transaction.toEntity}>
                            {transaction.toEntity}
                          </span>
                        </div>
                        <div
                          className={styles.riskActions}
                          title={`Risk Level: ${transaction.riskLevel.toUpperCase()}`}
                        >
                          {transaction.riskLevel === 'critical' && (
                            <Icon
                              name="ShieldAlert"
                              className={`${styles.riskIcon} ${styles.riskCritical}`}
                            />
                          )}
                          {transaction.riskLevel === 'high' && (
                            <Icon
                              name="Shield"
                              className={`${styles.riskIcon} ${styles.riskHigh}`}
                            />
                          )}
                          {transaction.riskLevel === 'medium' && (
                            <Icon
                              name="ShieldCheck"
                              className={`${styles.riskIcon} ${styles.riskMedium}`}
                            />
                          )}
                          {transaction.riskLevel === 'low' && (
                            <Icon
                              name="Shield"
                              className={`${styles.riskIcon} ${styles.riskLow}`}
                            />
                          )}
                          <span onClick={(e) => e.stopPropagation()}>
                            <AddToInvestigationButton
                              item={{
                                id: transaction.id,
                                title: `Transaction: ${transaction.fromEntity} -> ${transaction.toEntity}`,
                                description: transaction.description,
                                type: 'evidence',
                                sourceId: transaction.id,
                                metadata: {
                                  amount: transaction.amount,
                                  date: transaction.date,
                                  type: transaction.type,
                                },
                              }}
                              investigations={[]} // This needs to be populated from context or props
                              onAddToInvestigation={(invId, item, relevance) => {
                                console.log('Add to investigation', invId, item, relevance);
                                const event = new CustomEvent('add-to-investigation', {
                                  detail: { investigationId: invId, item, relevance },
                                });
                                window.dispatchEvent(event);
                              }}
                              variant="icon"
                              className={styles.addButton}
                            />
                          </span>
                        </div>
                      </div>

                      <div className={styles.transactionMeta}>
                        <span className={styles.amount}>
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </span>
                        <span className={styles.calendarMeta}>
                          <Icon name="Calendar" className={styles.calendarIcon} />
                          {transaction.date}
                        </span>
                        <span className={styles.typeText}>
                          {transaction.type.replace('_', ' ')}
                        </span>
                      </div>

                      <p className={styles.description}>{transaction.description}</p>
                    </div>

                    {transaction.suspiciousIndicators.length > 0 && (
                      <div className={styles.indicatorWrap}>
                        <div className={styles.indicatorList}>
                          {transaction.suspiciousIndicators.map((indicator, index) => (
                            <span key={index} className={styles.indicatorBadge}>
                              <span className={styles.indicatorText}>{indicator}</span>
                              <Icon name="AlertTriangle" className={styles.indicatorIcon} />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className={styles.sideColumn}>
            {/* Entity Flow Analysis */}
            <div className={styles.panel}>
              <h3 className={styles.sectionTitle}>Entity Flow Analysis</h3>
              <div className={styles.flowList}>
                {flowAnalysis.slice(0, 5).map((flow, index) => (
                  <div key={index} className={styles.flowCard}>
                    <div className={styles.flowHeader}>
                      <span className={styles.flowEntity} title={flow.entity}>
                        {flow.entity}
                      </span>
                      <span
                        className={`${
                          flow.riskScore > 20
                            ? `${styles.scoreBadge} ${styles.scoreHigh}`
                            : flow.riskScore > 10
                              ? `${styles.scoreBadge} ${styles.scoreMedium}`
                              : `${styles.scoreBadge} ${styles.scoreLow}`
                        }`}
                      >
                        {flow.riskScore}
                      </span>
                    </div>
                    <div className={styles.flowGrid}>
                      <div
                        className={styles.ellipsisText}
                        title={`In: ${formatCurrency(flow.inflow)}`}
                      >
                        In: {formatCurrency(flow.inflow)}
                      </div>
                      <div
                        className={styles.ellipsisText}
                        title={`Out: ${formatCurrency(flow.outflow)}`}
                      >
                        Out: {formatCurrency(flow.outflow)}
                      </div>
                      <div
                        className={styles.ellipsisText}
                        title={`Net: ${formatCurrency(Math.abs(flow.netFlow))}`}
                      >
                        Net: {formatCurrency(Math.abs(flow.netFlow))}
                      </div>
                    </div>
                    <div className={`${styles.flowFooter} ${styles.ellipsisText}`}>
                      {flow.transactionCount} tx • {flow.connections.length} conn
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected Patterns */}
            {detectedPatterns.length > 0 && (
              <div className={styles.panel}>
                <h3 className={styles.sectionTitle}>Detected Patterns</h3>
                <div className={styles.patternList}>
                  {detectedPatterns.map((pattern, index) => (
                    <div key={index} className={styles.patternCard}>
                      <div className={styles.patternHeader}>
                        <span className={styles.patternName}>{pattern.type.replace('_', ' ')}</span>
                        <span
                          className={`${
                            pattern.severity === 'critical'
                              ? `${styles.severityBadge} ${styles.severityCritical}`
                              : pattern.severity === 'high'
                                ? `${styles.severityBadge} ${styles.severityHigh}`
                                : `${styles.severityBadge} ${styles.severityLow}`
                          }`}
                        >
                          {pattern.severity.substring(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <p className={styles.patternDescription} title={pattern.description}>
                        {pattern.description}
                      </p>
                      <div className={styles.patternMeta}>
                        <span>{pattern.confidence}% conf</span>
                        <span>{pattern.transactions.length} tx</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Details - Full Screen Stack on Mobile */}
            {selectedTransaction && (
              <div className={styles.detailsOverlay}>
                {isMobile && (
                  <MobileStackHeader
                    title="Transaction Details"
                    subtitle={`${selectedTransaction.fromEntity} -> ${selectedTransaction.toEntity}`}
                    onBack={() => setSelectedTransaction(null)}
                  />
                )}
                <div className={styles.detailsCard}>
                  {/* Mobile Close Button - HUD Only */}
                  {!isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTransaction(null)}
                      className={styles.mobileClose}
                    >
                      <Icon name="X" className={styles.closeIcon} />
                    </Button>
                  )}

                  <div className={`${styles.detailsHeader} ${styles.detailsHeaderCompact}`}>
                    {!isMobile && <h3 className={styles.sectionTitle}>Details</h3>}
                    <AddToInvestigationButton
                      item={{
                        id: selectedTransaction.id,
                        title: `Transaction: ${selectedTransaction.fromEntity} -> ${selectedTransaction.toEntity}`,
                        description: selectedTransaction.description,
                        type: 'evidence',
                        sourceId: selectedTransaction.id,
                        metadata: {
                          amount: selectedTransaction.amount,
                          date: selectedTransaction.date,
                          type: selectedTransaction.type,
                        },
                      }}
                      investigations={[]} // This needs to be populated from context or props
                      onAddToInvestigation={(invId, item, relevance) => {
                        console.log('Add to investigation', invId, item, relevance);
                        const event = new CustomEvent('add-to-investigation', {
                          detail: { investigationId: invId, item, relevance },
                        });
                        window.dispatchEvent(event);
                      }}
                      variant="button"
                      size="sm"
                    />
                  </div>
                  <div className={styles.detailsList}>
                    <div className={styles.detailBlock}>
                      <label>From</label>
                      <p className={styles.detailText} title={selectedTransaction.fromEntity}>
                        {selectedTransaction.fromEntity}
                      </p>
                    </div>
                    <div className={styles.detailBlock}>
                      <label>To</label>
                      <p className={styles.detailText} title={selectedTransaction.toEntity}>
                        {selectedTransaction.toEntity}
                      </p>
                    </div>
                    <div className={styles.detailBlock}>
                      <label>Amount</label>
                      <p className={styles.detailValue}>
                        {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                      </p>
                    </div>
                    <div className={styles.detailBlock}>
                      <label>Date</label>
                      <p className={styles.detailText}>{selectedTransaction.date}</p>
                    </div>
                    <div className={styles.detailBlock}>
                      <label>Type</label>
                      <p className={`${styles.detailText} ${styles.capitalized}`}>
                        {selectedTransaction.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className={styles.detailBlock}>
                      <label>Method</label>
                      <p className={`${styles.detailText} ${styles.capitalized}`}>
                        {selectedTransaction.method}
                      </p>
                    </div>
                    <div className={styles.detailBlock}>
                      <label>Description</label>
                      <p className={styles.detailText}>{selectedTransaction.description}</p>
                    </div>

                    {selectedTransaction.sourceDocuments.length > 0 && (
                      <div className={styles.detailBlock}>
                        <label className={styles.sourceLabel}>Source Documents</label>
                        <div className={styles.sourceList}>
                          {selectedTransaction.sourceDocuments.map((doc, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              className={styles.sourceButton}
                              onClick={() => {
                                const normalized = String(doc).trim();
                                if (!normalized) return;
                                const docId = normalized.replace(/^doc[-_:]/i, '');
                                const isLikelyId = /^[a-zA-Z0-9_-]+$/.test(docId);
                                const target = isLikelyId
                                  ? `/documents/${encodeURIComponent(docId)}`
                                  : `/documents?search=${encodeURIComponent(normalized)}`;
                                window.location.assign(target);
                              }}
                              title={doc}
                            >
                              {doc}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
