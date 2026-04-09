import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { pdfjs } from 'react-pdf';
import {
  FileText,
  Fingerprint,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PDFVariantViewer } from '../documents/PDFVariantViewer';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DocumentMetadataPanel } from '../documents/DocumentMetadataPanel';
import { Tabs } from '../common/Tabs';
import { useForensicDocumentData } from '../../hooks/useForensicDocumentData';
import { useScrollLock } from '../../hooks/useScrollLock';
import styles from './ForensicDocumentAnalyzer.module.css';
import { ForensicMetricRecord } from '../../types/forensics';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface ForensicAnalysis {
  id: string;
  documentId: string;
  authenticity: {
    score: number;
    factors: AuthenticityFactor[];
    verdict: 'authentic' | 'suspicious' | 'forged' | 'inconclusive';
  };
  metadata: DocumentMetadata;
  entities: DetectedEntity[];
  patterns: DetectedPattern[];
  anomalies: DetectedAnomaly[];
  timestamp: string;
}

interface AuthenticityFactor {
  type: 'font' | 'formatting' | 'metadata' | 'language' | 'timeline' | 'cross_reference';
  score: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface DocumentMetadata {
  fileInfo: {
    name: string;
    size: number;
    type: string;
    created: string;
    modified: string;
    hash: string;
  };
  documentProperties?: {
    author?: string;
    creationDate?: string;
    modificationDate?: string;
    producer?: string;
    creator?: string;
    pageCount?: number;
  };
  textAnalysis: {
    wordCount: number;
    characterCount: number;
    averageWordLength: number;
    readingLevel: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    writingStyle: 'formal' | 'informal' | 'technical' | 'legal';
  };
  technical?: Record<string, unknown>;
  structure?: Record<string, unknown>;
  linguistics?: Record<string, unknown>;
  network?: Record<string, unknown>;
  tags?: string[];
}

interface DetectedEntity {
  type:
    | 'person'
    | 'organization'
    | 'location'
    | 'date'
    | 'phone'
    | 'email'
    | 'money'
    | 'address'
    | 'url';
  text: string;
  position: { start: number; end: number };
  confidence: number;
  context: string;
  crossReferences: string[];
  name?: string;
  sentiment?: string;
}

interface DetectedPattern {
  type: 'communication' | 'financial' | 'travel' | 'meeting' | 'relationship' | 'transaction';
  description: string;
  entities: string[];
  confidence: number;
  significance: 'low' | 'medium' | 'high';
  severity?: 'low' | 'medium' | 'high';
  timeline?: {
    startDate?: string;
    endDate?: string;
    frequency?: 'once' | 'recurring' | 'ongoing';
  };
}

interface DetectedAnomaly {
  type: 'temporal' | 'linguistic' | 'formatting' | 'logical' | 'cross_reference';
  description: string;
  severity: 'minor' | 'significant' | 'critical';
  explanation: string;
  requiresInvestigation: boolean;
  relatedEvidence?: string[];
}

export interface ForensicCaseContext {
  caseId: string;
  investigationFocus: string[];
  keyEntities: string[];
  timelineRange: { start: string; end: string };
}

interface ForensicDocumentAnalyzerProps {
  documentId: string;
  onAnalysisComplete?: (analysis: ForensicAnalysis) => void;
  caseContext?: ForensicCaseContext;
}

export const ForensicDocumentAnalyzer: React.FC<ForensicDocumentAnalyzerProps> = ({
  documentId,
  onAnalysisComplete,
  caseContext,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);
  useScrollLock(!!selectedEntity);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'entities' | 'patterns' | 'anomalies' | 'metadata'
  >('dashboard');
  const [hoveredId, setHoveredId] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    factors: false,
    fileInfo: false,
    docProps: false,
    textAnalysis: false,
  });
  const {
    analysis,
    compareA,
    compareAId,
    compareB,
    compareBId,
    isAnalyzing,
    loadComparison,
    loadQuickMetric,
    metrics,
    quickMetrics,
    setActiveId,
    setCompareAId,
    setCompareBId,
    startForensicAnalysis,
    summary,
    topDensity,
    topJs,
    topRisk,
  } = useForensicDocumentData({
    documentId,
    activeTab,
    caseContext,
    onAnalysisComplete,
    locationSearch: location.search,
  }) as {
    analysis: ForensicAnalysis | null;
    compareA: ForensicMetricRecord | null;
    compareAId: string;
    compareB: ForensicMetricRecord | null;
    compareBId: string;
    docMeta: { source_collection?: string; source_original_url?: string } | null;
    isAnalyzing: boolean;
    loadComparison: () => Promise<void>;
    loadQuickMetric: (id: string) => Promise<void>;
    metrics: ForensicMetricRecord | null;
    quickMetrics: Record<string, ForensicMetricRecord>;
    setActiveId: (id: string) => void;
    setCompareAId: (id: string) => void;
    setCompareBId: (id: string) => void;
    startForensicAnalysis: () => Promise<void>;
    summary: {
      readabilityBuckets: Array<{ range: string; count: number }>;
      sentimentCounts: { positive: number; neutral: number; negative: number };
    } | null;
    topDensity: Array<{ id: number | string; fileName: string; score: number }>;
    topJs: Array<{ id: number | string; fileName: string; score: number }>;
    topRisk: Array<{ id: number | string; fileName: string; score: number }>;
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const openForensicDocument = (id: string) => {
    if (!location.pathname.startsWith('/investigations')) {
      navigate(`/investigations?tab=forensic&docId=${id}`);
      return;
    }

    setActiveId(id);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', 'forensic');
      params.set('docId', id);
      const query = params.toString();
      const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    } catch {
      // Ignore URL sync failures and keep the in-memory selection.
    }
  };

  const previewMetric = async (id: string) => {
    setHoveredId(id);
    await loadQuickMetric(id);
  };

  const getEntityIcon = (type: DetectedEntity['type']) => {
    switch (type) {
      case 'person':
        return User;
      case 'organization':
        return FileText;
      case 'location':
        return MapPin;
      case 'date':
        return Clock;
      case 'phone':
        return Phone;
      case 'email':
        return Mail;
      case 'money':
        return DollarSign;
      case 'address':
        return MapPin;
      case 'url':
        return FileText;
      default:
        return FileText;
    }
  };

  return (
    <div className={styles.root}>
      {/* Main Content */}
      <div className={styles.contentWrapper}>
        <div className={styles.content}>
          {/* Document Viewer */}
          <div className={styles.viewerPanel}>
            <PDFVariantViewer documentId={documentId} className="flex-1" />
          </div>

          {/* Analysis Panel */}
          <div className={styles.analysisPanel}>
            {!analysis && !isAnalyzing && (
              <div className={styles.emptyState}>
                <Fingerprint className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>No Analysis Yet</h3>
                <p className={styles.emptyDescription}>
                  Perform forensic analysis to authenticate this document and extract key
                  information
                </p>
                <button
                  onClick={startForensicAnalysis}
                  disabled={!documentId}
                  className={`${styles.analyzeButton} ${documentId ? styles.analyzeButtonEnabled : styles.analyzeButtonDisabled}`}
                >
                  <Fingerprint className={styles.iconButton} />
                  Analyze Document
                </button>
              </div>
            )}

            {isAnalyzing && (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <h3 className={styles.emptyTitle}>Analyzing Document...</h3>
                <p className={styles.emptyDescription}>
                  Performing forensic analysis and cross-referencing with case database
                </p>
              </div>
            )}

            {analysis && (
              <div className={styles.analysisWrapper}>
                {/* Authenticity Score - Always Visible */}
                <div className={styles.authenticityHeader}>
                  <div className={styles.scoreRow}>
                    <h3 className={styles.scoreTitle}>Authenticity Score</h3>
                    <div className={styles.scoreDisplay}>
                      {analysis.authenticity.verdict === 'authentic' && (
                        <CheckCircle className={styles.statusIconSuccess} />
                      )}
                      {analysis.authenticity.verdict === 'suspicious' && (
                        <AlertTriangle className={styles.statusIconWarning} />
                      )}
                      {analysis.authenticity.verdict === 'forged' && (
                        <XCircle className={styles.statusIconError} />
                      )}
                      <span
                        className={`${styles.scoreValue} ${
                          analysis.authenticity.score >= 90
                            ? styles.scoreHigh
                            : analysis.authenticity.score >= 70
                              ? styles.scoreMedium
                              : styles.scoreLow
                        }`}
                      >
                        {analysis.authenticity.score}%
                      </span>
                    </div>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={`${styles.progressBarFill} ${
                        analysis.authenticity.score >= 90
                          ? styles.bgHigh
                          : analysis.authenticity.score >= 70
                            ? styles.bgMedium
                            : styles.bgLow
                      }`}
                      style={{ width: `${analysis.authenticity.score}%` }}
                    ></div>
                  </div>
                  <p className={styles.verdictText}>
                    Verdict:{' '}
                    <span className={styles.verdictValue}>{analysis.authenticity.verdict}</span>
                  </p>

                  {/* Collapsible Factors */}
                  <button
                    onClick={() => toggleSection('factors')}
                    className={styles.toggleFactorsButton}
                  >
                    {expandedSections.factors ? (
                      <ChevronUp className={styles.iconSmall} />
                    ) : (
                      <ChevronDown className={styles.iconSmall} />
                    )}
                    {expandedSections.factors ? 'Hide' : 'Show'} Authenticity Factors
                  </button>
                  {expandedSections.factors && (
                    <div className={styles.factorsList}>
                      {analysis.authenticity.factors.map((factor, idx) => (
                        <div key={idx} className={styles.factorItem}>
                          <div className={styles.factorHeader}>
                            <span className={styles.factorType}>
                              {factor.type.replace('_', ' ')}
                            </span>
                            <span className={styles.factorScore}>{factor.score}%</span>
                          </div>
                          <p className={styles.factorDescription}>{factor.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <Tabs
                  tabs={[
                    {
                      key: 'dashboard',
                      label: 'Dashboard',
                      icon: <FileText className={styles.tabIcon} />,
                    },
                    {
                      key: 'entities',
                      label: 'Entities',
                      icon: <User className={styles.tabIcon} />,
                      count: analysis.entities.length,
                    },
                    {
                      key: 'patterns',
                      label: 'Patterns',
                      icon: <FileText className={styles.tabIcon} />,
                      count: analysis.patterns.length,
                    },
                    {
                      key: 'anomalies',
                      label: 'Anomalies',
                      icon: <AlertTriangle className={styles.tabIcon} />,
                      count: analysis.anomalies.length,
                    },
                    {
                      key: 'metadata',
                      label: 'Metadata',
                      icon: <FileText className={styles.tabIcon} />,
                    },
                  ]}
                  activeTab={activeTab}
                  onChange={(key) =>
                    setActiveTab(
                      key as 'dashboard' | 'entities' | 'patterns' | 'anomalies' | 'metadata',
                    )
                  }
                  className={styles.tabs}
                />

                {/* Tab Content */}
                <div className={styles.tabContent}>
                  {activeTab === 'dashboard' && (
                    <div className={styles.dashboardGrid}>
                      {/* Technical Forensics */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>Technical Forensics</h4>
                        <div className={styles.metricList}>
                          <div>
                            Producer:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.technical?.producer ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            Creator:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.technical?.creator ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            Created:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.technical?.creationDate ?? '—'}
                            </span>
                          </div>
                          <div>
                            Modified:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.technical?.modificationDate ?? '—'}
                            </span>
                          </div>
                          <div>
                            Page Count:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.technical?.pageCount ?? '—'}
                            </span>
                          </div>
                          <div className={styles.spacer}>
                            <button
                              onClick={async () => {
                                const r = await fetch(
                                  `/api/forensic/metrics/${documentId}/download`,
                                );
                                const b = await r.blob();
                                const url = URL.createObjectURL(b);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `metrics-${documentId}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className={styles.downloadButton}
                            >
                              Download Metrics JSON
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Structural Analysis */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>Structural</h4>
                        <div className={styles.metricList}>
                          <div>
                            JavaScript:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.structural?.containsJavascript
                                ? 'Detected'
                                : 'None/Unknown'}
                            </span>
                          </div>
                          <div>
                            Font Count:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.structural?.fontCount ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            PDF Version:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.structural?.pdfVersion ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            JS Object IDs:{' '}
                            <span className={styles.metricValue}>
                              {Array.isArray(metrics?.structural?.jsObjectIds)
                                ? metrics?.structural?.jsObjectIds?.length
                                : 0}
                            </span>
                          </div>
                          {Array.isArray(metrics?.structural?.jsObjectIds) &&
                            (metrics?.structural?.jsObjectIds?.length ?? 0) > 0 && (
                              <details className={styles.details}>
                                <summary className={styles.summary}>Show IDs</summary>
                                <div className={styles.detailsContent}>
                                  {metrics?.structural?.jsObjectIds?.join(', ')}
                                </div>
                              </details>
                            )}
                        </div>
                      </div>
                      {/* Linguistic */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>Linguistic</h4>
                        <div className={styles.metricList}>
                          <div>
                            Flesch-Kincaid:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.linguistic?.readabilityFKGL ?? '—'}
                            </span>
                          </div>
                          <div>
                            Sentiment:{' '}
                            <span className={`${styles.metricValue} capitalize`}>
                              {metrics?.linguistic?.sentiment ?? 'neutral'}
                            </span>
                          </div>
                          <div>
                            TTR:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.linguistic?.typeTokenRatio ?? '—'}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Temporal */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>Temporal</h4>
                        <div className={styles.metricList}>
                          <div>
                            Business Hours:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.temporal?.businessHours ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            Day of Week:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.temporal?.dayOfWeek ?? '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Network */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>Network</h4>
                        <div className={styles.metricList}>
                          <div>
                            Entity Density / 1000 words:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.network?.entityDensityPer1000Words ?? '—'}
                            </span>
                          </div>
                          <div>
                            Risk Score:{' '}
                            <span className={styles.metricValue}>
                              {metrics?.network?.riskScore ?? '—'}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Readability Distribution */}
                      <div className={`${styles.metricCard} ${styles.colSpan2}`}>
                        <h4 className={styles.metricTitle}>Readability Distribution (FKGL)</h4>
                        <div className={styles.chartContainer}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summary?.readabilityBuckets || []}>
                              <XAxis
                                dataKey="range"
                                stroke="var(--text-muted)"
                                tick={{ fill: 'var(--text-muted)' }}
                              />
                              <YAxis
                                stroke="var(--text-muted)"
                                tick={{ fill: 'var(--text-muted)' }}
                                allowDecimals={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'var(--glass-bg-strong)',
                                  border: '1px solid var(--glass-border)',
                                  color: 'var(--text-primary)',
                                  borderRadius: 'var(--radius-md)',
                                }}
                              />
                              <Bar dataKey="count" fill="var(--accent)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      {/* Sentiment Breakdown */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>Sentiment Breakdown</h4>
                        <div className={styles.chartContainer}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  {
                                    name: 'positive',
                                    value: summary?.sentimentCounts?.positive || 0,
                                  },
                                  {
                                    name: 'neutral',
                                    value: summary?.sentimentCounts?.neutral || 0,
                                  },
                                  {
                                    name: 'negative',
                                    value: summary?.sentimentCounts?.negative || 0,
                                  },
                                ]}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={60}
                                fill="var(--accent)"
                                label
                              >
                                {[
                                  'var(--accent-green)',
                                  'var(--text-muted)',
                                  'var(--accent-red)',
                                ].map((c, i) => (
                                  <Cell key={i} fill={c} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'var(--glass-bg-strong)',
                                  border: '1px solid var(--glass-border)',
                                  color: 'var(--text-primary)',
                                  borderRadius: 'var(--radius-md)',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      {/* Top JS-heavy PDFs */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>Top JS-heavy PDFs</h4>
                        <div className={styles.topList}>
                          {topJs.slice(0, 5).map((t) => (
                            <div
                              key={t.id}
                              className={styles.topListItem}
                              onMouseEnter={() => void previewMetric(String(t.id))}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => openForensicDocument(String(t.id))}
                            >
                              <span className={styles.entityName}>{t.fileName}</span>
                              <span className={styles.entityConfidence}>{t.score}</span>
                              <div className={styles.topListActions}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompareAId(String(t.id));
                                  }}
                                  className={styles.actionButton}
                                >
                                  A
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompareBId(String(t.id));
                                  }}
                                  className={styles.actionButton}
                                >
                                  B
                                </button>
                              </div>
                              {hoveredId === String(t.id) && (
                                <div className={styles.entityConfidence}>
                                  <span>
                                    FKGL:{' '}
                                    {quickMetrics[String(t.id)]?.linguistic?.readabilityFKGL ?? '—'}
                                  </span>
                                  <span className="ml-2 capitalize">
                                    Sentiment:{' '}
                                    {quickMetrics[String(t.id)]?.linguistic?.sentiment ?? 'neutral'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* High Entity Density */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>High Entity Density</h4>
                        <div className={styles.topList}>
                          {topDensity.slice(0, 5).map((t) => (
                            <div
                              key={t.id}
                              className={styles.topListItem}
                              onMouseEnter={() => void previewMetric(String(t.id))}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => openForensicDocument(String(t.id))}
                            >
                              <span className={styles.entityName}>{t.fileName}</span>
                              <span className={styles.entityConfidence}>{t.score}</span>
                              <div className={styles.topListActions}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompareAId(String(t.id));
                                  }}
                                  className={styles.actionButton}
                                >
                                  A
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompareBId(String(t.id));
                                  }}
                                  className={styles.actionButton}
                                >
                                  B
                                </button>
                              </div>
                              {hoveredId === String(t.id) && (
                                <div className={styles.entityConfidence}>
                                  <span>
                                    FKGL:{' '}
                                    {quickMetrics[String(t.id)]?.linguistic?.readabilityFKGL ?? '—'}
                                  </span>
                                  <span className="ml-2 capitalize">
                                    Sentiment:{' '}
                                    {quickMetrics[String(t.id)]?.linguistic?.sentiment ?? 'neutral'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Highest Risk Score */}
                      <div className={styles.metricCard}>
                        <h4 className={styles.metricTitle}>Highest Risk Score</h4>
                        <div className={styles.topList}>
                          {topRisk.slice(0, 5).map((t) => (
                            <div
                              key={t.id}
                              className={styles.topListItem}
                              onMouseEnter={() => void previewMetric(String(t.id))}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => openForensicDocument(String(t.id))}
                            >
                              <span className={styles.entityName}>{t.fileName}</span>
                              <span className={styles.entityConfidence}>{t.score}%</span>
                              <div className={styles.topListActions}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompareAId(String(t.id));
                                  }}
                                  className={styles.actionButton}
                                >
                                  A
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompareBId(String(t.id));
                                  }}
                                  className={styles.actionButton}
                                >
                                  B
                                </button>
                              </div>
                              {hoveredId === String(t.id) && (
                                <div className={styles.entityConfidence}>
                                  <span>
                                    FKGL:{' '}
                                    {quickMetrics[String(t.id)]?.linguistic?.readabilityFKGL ?? '—'}
                                  </span>
                                  <span className="ml-2 capitalize">
                                    Sentiment:{' '}
                                    {quickMetrics[String(t.id)]?.linguistic?.sentiment ?? 'neutral'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Compare Documents */}
                      <div className={`${styles.metricCard} ${styles.colSpan2}`}>
                        <h4 className={styles.metricTitle}>Compare Documents</h4>
                        <div className={styles.compareInputs}>
                          <input
                            value={compareAId}
                            onChange={(e) => setCompareAId(e.target.value)}
                            placeholder="Doc ID A"
                            className={styles.compareInput}
                          />
                          <input
                            value={compareBId}
                            onChange={(e) => setCompareBId(e.target.value)}
                            placeholder="Doc ID B"
                            className={styles.compareInput}
                          />
                          <button onClick={loadComparison} className={styles.compareButton}>
                            Compare
                          </button>
                        </div>
                        <div className={styles.dashboardGrid}>
                          <div className={styles.metricCard}>
                            <h5
                              className={`${styles.metricTitle} ${styles.iconSmall} ${styles.spacer}`}
                            >
                              FKGL
                            </h5>
                            <div className={styles.chartContainer}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={[
                                    {
                                      name: 'Doc A',
                                      val: compareA?.linguistic?.readabilityFKGL ?? 0,
                                    },
                                    {
                                      name: 'Doc B',
                                      val: compareB?.linguistic?.readabilityFKGL ?? 0,
                                    },
                                  ]}
                                >
                                  <XAxis
                                    dataKey="name"
                                    stroke="var(--text-muted)"
                                    tick={{ fill: 'var(--text-muted)' }}
                                  />
                                  <YAxis
                                    stroke="var(--text-muted)"
                                    tick={{ fill: 'var(--text-muted)' }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: 'var(--glass-bg-strong)',
                                      border: '1px solid var(--glass-border)',
                                      color: 'var(--text-primary)',
                                      borderRadius: 'var(--radius-md)',
                                    }}
                                  />
                                  <Bar dataKey="val" fill="var(--accent-red)" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className={styles.metricCard}>
                            <h5
                              className={`${styles.metricTitle} ${styles.iconSmall} ${styles.spacer}`}
                            >
                              Entity Density
                            </h5>
                            <div className={styles.chartContainer}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={[
                                    {
                                      name: 'Doc A',
                                      val: compareA?.network?.entityDensityPer1000Words ?? 0,
                                    },
                                    {
                                      name: 'Doc B',
                                      val: compareB?.network?.entityDensityPer1000Words ?? 0,
                                    },
                                  ]}
                                >
                                  <XAxis
                                    dataKey="name"
                                    stroke="var(--text-muted)"
                                    tick={{ fill: 'var(--text-muted)' }}
                                  />
                                  <YAxis
                                    stroke="var(--text-muted)"
                                    tick={{ fill: 'var(--text-muted)' }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: 'var(--glass-bg-strong)',
                                      border: '1px solid var(--glass-border)',
                                      color: 'var(--text-primary)',
                                      borderRadius: 'var(--radius-md)',
                                    }}
                                  />
                                  <Bar dataKey="val" fill="var(--accent-green)" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'entities' && (
                    <div className={styles.entityList}>
                      {analysis.entities.map((entity, idx) => (
                        <div
                          key={idx}
                          className={styles.entityItem}
                          onClick={() => setSelectedEntity(entity)}
                        >
                          <div className={styles.entityInner}>
                            <div className={styles.entityIconWrapper}>
                              {React.createElement(getEntityIcon(entity.type), {
                                className: styles.entityIcon,
                              })}
                            </div>
                            <div className={styles.entityInfo}>
                              <div className={styles.entityHeaderLine}>
                                <h4 className={styles.entityName}>{entity.text}</h4>
                                <span className={styles.entityConfidence}>
                                  {Math.round(entity.confidence * 100)}% confidence
                                </span>
                              </div>
                              <div className={styles.entityType}>{entity.type}</div>
                              <p className={styles.entityContext}>{entity.context}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'patterns' && (
                    <div className={styles.patternList}>
                      {analysis.patterns.map((pattern, idx) => (
                        <div
                          key={idx}
                          className={styles.patternItem}
                          style={{
                            borderLeftColor:
                              pattern.significance === 'high'
                                ? 'var(--accent-red)'
                                : pattern.significance === 'medium'
                                  ? 'var(--accent-yellow)'
                                  : 'var(--accent-green)',
                          }}
                        >
                          <div className={styles.patternHeaderLine}>
                            <span className={styles.patternTypeLabel}>{pattern.type} Pattern</span>
                            <span
                              className={`${styles.significanceBadge} ${
                                pattern.significance === 'high'
                                  ? styles.badgeHigh
                                  : pattern.significance === 'medium'
                                    ? styles.badgeMedium
                                    : styles.badgeLow
                              }`}
                            >
                              {pattern.significance} significance
                            </span>
                          </div>
                          <h4 className={styles.metricTitle}>{pattern.description}</h4>
                          <div className={styles.patternInner}>
                            <AlertTriangle className={styles.alertIcon} />
                            <p className={styles.entityContext}>
                              Involves: {pattern.entities.join(', ')}
                            </p>
                          </div>
                          <div className={styles.severityContainer}>
                            <span className={styles.severityLabel}>Confidence</span>
                            <div className={styles.severityTrack}>
                              <div
                                className={styles.severityBar}
                                style={{
                                  width: `${pattern.confidence * 100}%`,
                                  backgroundColor: 'var(--accent)',
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'anomalies' && (
                    <div className={styles.anomalyList}>
                      {analysis.anomalies.map((anomaly, idx) => (
                        <div key={idx} className={styles.anomalyItem}>
                          <div className={styles.patternHeaderLine}>
                            <span className={styles.patternTypeLabel}>{anomaly.type} Anomaly</span>
                            <span
                              className={`${styles.anomalySeverity} ${
                                anomaly.severity === 'critical'
                                  ? styles.sentimentNegative
                                  : styles.sentimentPositive
                              }`}
                            >
                              {anomaly.severity}
                            </span>
                          </div>
                          <p className={styles.anomalyDescription}>{anomaly.description}</p>
                          <p className={styles.anomalyContext}>{anomaly.explanation}</p>
                          {anomaly.requiresInvestigation && (
                            <div className={`${styles.severityContainer} ${styles.spacer}`}>
                              <AlertTriangle className={styles.alertIcon} />
                              <span className={styles.sentimentNegative}>
                                Requires immediate investigation
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'metadata' && analysis && (
                    <div className={styles.dashboardGrid}>
                      <DocumentMetadataPanel
                        document={{
                          id: documentId,
                          metadata: {
                            technical: metrics?.technical || analysis.metadata.technical,
                            structure: metrics?.structural || analysis.metadata.structure,
                            linguistics: metrics?.linguistic || analysis.metadata.linguistics,
                            network: metrics?.network || analysis.metadata.network,
                            tags: analysis.metadata.tags,
                          },
                        }}
                        className={styles.metricCard}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entity Detail Modal */}
      {selectedEntity && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <div className={styles.entityInfo}>
                <h3 className={styles.modalTitle}>{selectedEntity.text}</h3>
                <span className={styles.modalSubtitle}>{selectedEntity.type}</span>
              </div>
              <button onClick={() => setSelectedEntity(null)} className={styles.modalClose}>
                <XCircle className={styles.iconButton} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalAnalysis}>
                <h4 className={styles.modalSectionTitle}>Analysis</h4>
                <div className={styles.modalGrid}>
                  <div>
                    <span className={styles.modalLabel}>Confidence Score</span>
                    <span className={styles.modalValue}>
                      {Math.round(selectedEntity.confidence * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className={styles.modalLabel}>Detected Text</span>
                    <span className={styles.modalValue}>{selectedEntity.text}</span>
                  </div>
                </div>
              </div>

              {selectedEntity.context && (
                <div className={styles.modalAnalysis}>
                  <h4 className={styles.modalSectionTitle}>Contextual Presence</h4>
                  <p className={styles.entityContext}>{selectedEntity.context}</p>
                </div>
              )}

              {selectedEntity.crossReferences && selectedEntity.crossReferences.length > 0 && (
                <div className={styles.modalAnalysis}>
                  <h4 className={styles.modalSectionTitle}>Cross-References</h4>
                  <div className={styles.tagList}>
                    {selectedEntity.crossReferences.map((ref, i) => (
                      <span key={i} className={styles.tag}>
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button onClick={() => setSelectedEntity(null)} className={styles.downloadButton}>
                  Close Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForensicDocumentAnalyzer;
