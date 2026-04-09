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
    docMeta,
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
  });

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
                  <Fingerprint className="w-5 h-5" />
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
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {analysis.authenticity.verdict === 'suspicious' && (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      )}
                      {analysis.authenticity.verdict === 'forged' && (
                        <XCircle className="w-5 h-5 text-red-500" />
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
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
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
                      icon: <FileText className="w-4 h-4" />,
                    },
                    {
                      key: 'entities',
                      label: 'Entities',
                      icon: <User className="w-4 h-4" />,
                      count: (analysis as ForensicAnalysis).entities.length,
                    },
                    {
                      key: 'patterns',
                      label: 'Patterns',
                      icon: <FileText className="w-4 h-4" />,
                      count: (analysis as ForensicAnalysis).patterns.length,
                    },
                    {
                      key: 'anomalies',
                      label: 'Anomalies',
                      icon: <AlertTriangle className="w-4 h-4" />,
                      count: (analysis as ForensicAnalysis).anomalies.length,
                    },
                    { key: 'metadata', label: 'Metadata', icon: <FileText className="w-4 h-4" /> },
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
                              {(metrics as ForensicMetricRecord)?.technical?.producer ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            Creator:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.technical?.creator ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            Created:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.technical?.creationDate ?? '—'}
                            </span>
                          </div>
                          <div>
                            Modified:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.technical?.modificationDate ??
                                '—'}
                            </span>
                          </div>
                          <div>
                            Page Count:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.technical?.pageCount ?? '—'}
                            </span>
                          </div>
                          <div className="mt-2">
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
                              {(metrics as ForensicMetricRecord)?.structural?.containsJavascript
                                ? 'Detected'
                                : 'None/Unknown'}
                            </span>
                          </div>
                          <div>
                            Font Count:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.structural?.fontCount ??
                                'Unknown'}
                            </span>
                          </div>
                          <div>
                            PDF Version:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.structural?.pdfVersion ??
                                'Unknown'}
                            </span>
                          </div>
                          <div>
                            JS Object IDs:{' '}
                            <span className={styles.metricValue}>
                              {Array.isArray(
                                (metrics as ForensicMetricRecord)?.structural?.jsObjectIds,
                              )
                                ? (metrics as ForensicMetricRecord).structural?.jsObjectIds?.length
                                : 0}
                            </span>
                          </div>
                          {Array.isArray(
                            (metrics as ForensicMetricRecord)?.structural?.jsObjectIds,
                          ) &&
                            ((metrics as ForensicMetricRecord).structural?.jsObjectIds?.length ??
                              0) > 0 && (
                              <details className={styles.details}>
                                <summary className={styles.summary}>Show IDs</summary>
                                <div className={styles.detailsContent}>
                                  {(metrics as ForensicMetricRecord).structural?.jsObjectIds?.join(
                                    ', ',
                                  )}
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
                              {(metrics as ForensicMetricRecord)?.linguistic?.readabilityFKGL ??
                                '—'}
                            </span>
                          </div>
                          <div>
                            Sentiment:{' '}
                            <span className={`${styles.metricValue} capitalize`}>
                              {(metrics as ForensicMetricRecord)?.linguistic?.sentiment ??
                                'neutral'}
                            </span>
                          </div>
                          <div>
                            TTR:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.linguistic?.typeTokenRatio ?? '—'}
                              %
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
                              {(metrics as ForensicMetricRecord)?.temporal?.businessHours
                                ? 'Yes'
                                : 'No'}
                            </span>
                          </div>
                          <div>
                            Day of Week:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.temporal?.dayOfWeek ?? '—'}
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
                              {(metrics as ForensicMetricRecord)?.network
                                ?.entityDensityPer1000Words ?? '—'}
                            </span>
                          </div>
                          <div>
                            Risk Score:{' '}
                            <span className={styles.metricValue}>
                              {(metrics as ForensicMetricRecord)?.network?.riskScore ?? '—'}%
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
                              <XAxis dataKey="range" stroke="#ccc" tick={{ fill: '#ccc' }} />
                              <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#374151',
                                  border: 'none',
                                  color: '#fff',
                                }}
                              />
                              <Bar dataKey="count" fill="#60a5fa" />
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
                                fill="#8884d8"
                                label
                              >
                                {['#10b981', '#9ca3af', '#ef4444'].map((c, i) => (
                                  <Cell key={i} fill={c} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#374151',
                                  border: 'none',
                                  color: '#fff',
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
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}</span>
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
                                <div className="ml-2 text-[10px] text-[var(--text-secondary)]">
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
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}</span>
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
                                <div className="ml-2 text-[10px] text-[var(--text-secondary)]">
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
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}%</span>
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
                                <div className="ml-2 text-[10px] text-[var(--text-secondary)]">
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
                            <h5 className={`${styles.metricValue} text-sm mb-2`}>FKGL</h5>
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
                                  <XAxis dataKey="name" stroke="#ccc" tick={{ fill: '#ccc' }} />
                                  <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} />
                                  <Tooltip />
                                  <Bar dataKey="val" fill="#ef4444" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className={styles.metricCard}>
                            <h5 className={`${styles.metricValue} text-sm mb-2`}>Entity Density</h5>
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
                                  <XAxis dataKey="name" stroke="#ccc" tick={{ fill: '#ccc' }} />
                                  <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} />
                                  <Tooltip />
                                  <Bar dataKey="val" fill="#10b981" />
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
                      {(analysis as ForensicAnalysis).entities.map((entity, index) => (
                        <div
                          key={index}
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
                                <p className={styles.entityName}>{entity.text}</p>
                                <span className={styles.entityConfidence}>
                                  {Math.round(entity.confidence)}%
                                </span>
                              </div>
                              <p className={styles.entityType}>{entity.type}</p>
                              <p className={styles.entityContext}>{entity.context}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'patterns' && (
                    <div className={styles.patternList}>
                      {(analysis as ForensicAnalysis).patterns.map((pattern, index) => (
                        <div
                          key={index}
                          className={styles.patternItem}
                          style={{
                            borderLeftColor:
                              pattern.significance === 'high'
                                ? 'var(--status-error)'
                                : pattern.significance === 'medium'
                                  ? 'var(--status-warning)'
                                  : 'var(--status-success)',
                          }}
                        >
                          <div className={styles.patternHeaderLine}>
                            <span className={styles.patternTypeLabel}>{pattern.type}</span>
                            <span
                              className={`${styles.significanceBadge} ${
                                pattern.significance === 'high'
                                  ? styles.badgeHigh
                                  : pattern.significance === 'medium'
                                    ? styles.badgeMedium
                                    : styles.badgeLow
                              }`}
                            >
                              {pattern.significance}
                            </span>
                          </div>
                          <div className={styles.patternCard}>
                            <div className={styles.patternInner}>
                              <AlertTriangle className={styles.alertIcon} />
                              <div className="flex-1">
                                <h4 className={styles.patternTitle}>{pattern.type}</h4>
                                <p className={styles.patternDescription}>{pattern.description}</p>
                                <div className={styles.severityContainer}>
                                  <span className={styles.severityLabel}>Severity:</span>
                                  <div className={styles.severityTrack}>
                                    <div
                                      className={`${styles.severityBar} ${
                                        pattern.severity === 'high'
                                          ? styles.barHigh
                                          : pattern.severity === 'medium'
                                            ? styles.barMedium
                                            : styles.barLow
                                      }`}
                                      style={{
                                        width:
                                          pattern.severity === 'high'
                                            ? '100%'
                                            : pattern.severity === 'medium'
                                              ? '60%'
                                              : '30%',
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'anomalies' && (
                    <div className={styles.anomalyList}>
                      {(analysis as ForensicAnalysis).anomalies.map((anomaly, index) => (
                        <div key={index} className={styles.anomalyItem}>
                          <div className={styles.anomalyHeader}>
                            <AlertTriangle className={styles.alertIcon} />
                            <h4 className={styles.anomalyType}>{anomaly.type}</h4>
                            <span className={styles.anomalySeverity}>{anomaly.severity}</span>
                          </div>
                          <p className={styles.anomalyDescription}>{anomaly.description}</p>
                          <div className={styles.anomalyContext}>
                            Explanation: {anomaly.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'metadata' && (
                    <div className={styles.metadataPanel}>
                      <DocumentMetadataPanel
                        document={{
                          fileName: (analysis as ForensicAnalysis).metadata.fileInfo.name,
                          fileType: (analysis as ForensicAnalysis).metadata.fileInfo.type,
                          fileSize: (analysis as ForensicAnalysis).metadata.fileInfo.size,
                          contentHash: (analysis as ForensicAnalysis).metadata.fileInfo.hash,
                          dateCreated: (analysis as ForensicAnalysis).metadata.fileInfo.created,
                          dateModified: (analysis as ForensicAnalysis).metadata.fileInfo.modified,
                          redFlagRating: (metrics as ForensicMetricRecord | null)?.network
                            ?.riskScore
                            ? Math.ceil(
                                ((metrics as ForensicMetricRecord | null)?.network?.riskScore ??
                                  0) / 20,
                              )
                            : 0,
                          tags: (analysis as ForensicAnalysis).metadata.tags,
                          metadata: {
                            technical:
                              (metrics as ForensicMetricRecord | null)?.technical ||
                              (analysis as ForensicAnalysis).metadata.technical,
                            structure:
                              (metrics as ForensicMetricRecord | null)?.structural ||
                              (analysis as ForensicAnalysis).metadata.structure,
                            linguistics:
                              (metrics as ForensicMetricRecord | null)?.linguistic ||
                              (analysis as ForensicAnalysis).metadata.linguistics,
                            network:
                              (metrics as ForensicMetricRecord | null)?.network ||
                              (analysis as ForensicAnalysis).metadata.network,
                            source_collection: docMeta?.source_collection,
                            source_original_url: docMeta?.source_original_url,
                            tags: (analysis as ForensicAnalysis).metadata.tags,
                          },
                        }}
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
              <div>
                <h3 className={styles.modalTitle}>{selectedEntity.name}</h3>
                <span className={styles.modalSubtitle}>{selectedEntity.type}</span>
              </div>
              <button onClick={() => setSelectedEntity(null)} className={styles.modalClose}>
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalAnalysis}>
                <h4 className={styles.modalSectionTitle}>Analysis</h4>
                <div className={styles.modalGrid}>
                  <div>
                    <span className={styles.modalLabel}>Sentiment</span>
                    <span
                      className={
                        selectedEntity.sentiment === 'negative'
                          ? styles.sentimentNegative
                          : styles.sentimentPositive
                      }
                    >
                      {selectedEntity.sentiment}
                    </span>
                  </div>
                  <div>
                    <span className={styles.modalLabel}>Confidence</span>
                    <span className={styles.modalValue}>
                      {(selectedEntity.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button onClick={() => setSelectedEntity(null)} className={styles.modalButton}>
                  Close
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
