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
    <div className="h-full bg-[var(--glass-bg-strong)] text-[var(--text-primary)] flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col gap-6 p-6">
          {/* Document Viewer */}
          <div className="flex flex-col bg-[var(--glass-bg)] rounded-[var(--radius-lg)] overflow-hidden min-h-[500px]">
            <PDFVariantViewer documentId={documentId} className="flex-1" />
          </div>

          {/* Analysis Panel */}
          <div className="flex flex-col bg-[var(--glass-bg)] rounded-[var(--radius-lg)] overflow-hidden">
            {!analysis && !isAnalyzing && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Fingerprint className="w-20 h-20 text-[var(--text-primary)] mb-6" />
                <h3 className="text-xl font-semibold text-[var(--text-secondary)] mb-3">
                  No Analysis Yet
                </h3>
                <p className="text-[var(--text-muted)] text-center mb-6 max-w-sm">
                  Perform forensic analysis to authenticate this document and extract key
                  information
                </p>
                <button
                  onClick={startForensicAnalysis}
                  disabled={!documentId}
                  className={`flex items-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] transition-colors font-medium ${documentId ? 'bg-red-600 hover:bg-red-700 text-[var(--text-primary)]' : 'bg-[var(--glass-bg-highlight)] text-[var(--text-muted)] cursor-not-allowed'}`}
                >
                  <Fingerprint className="w-5 h-5" />
                  Analyze Document
                </button>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mb-6"></div>
                <h3 className="text-xl font-semibold text-[var(--text-secondary)] mb-3">
                  Analyzing Document...
                </h3>
                <p className="text-[var(--text-muted)] text-center max-w-sm">
                  Performing forensic analysis and cross-referencing with case database
                </p>
              </div>
            )}

            {analysis && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Authenticity Score - Always Visible */}
                <div className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)] p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      Authenticity Score
                    </h3>
                    <div className="flex items-center gap-2">
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
                        className={`text-3xl font-bold ${
                          analysis.authenticity.score >= 90
                            ? 'text-green-500'
                            : analysis.authenticity.score >= 70
                              ? 'text-yellow-500'
                              : 'text-red-500'
                        }`}
                      >
                        {analysis.authenticity.score}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[var(--glass-bg-highlight)] rounded-full h-2.5 mb-3">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        analysis.authenticity.score >= 90
                          ? 'bg-green-500'
                          : analysis.authenticity.score >= 70
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${analysis.authenticity.score}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] capitalize">
                    Verdict:{' '}
                    <span className="text-[var(--text-primary)] font-medium">
                      {analysis.authenticity.verdict}
                    </span>
                  </p>

                  {/* Collapsible Factors */}
                  <button
                    onClick={() => toggleSection('factors')}
                    className="flex items-center gap-2 mt-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {expandedSections.factors ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {expandedSections.factors ? 'Hide' : 'Show'} Authenticity Factors
                  </button>
                  {expandedSections.factors && (
                    <div className="mt-3 space-y-2">
                      {analysis.authenticity.factors.map((factor, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                              {factor.type.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-[var(--text-muted)]">
                              {factor.score}%
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">{factor.description}</p>
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
                      count: analysis.entities.length,
                    },
                    {
                      key: 'patterns',
                      label: 'Patterns',
                      icon: <FileText className="w-4 h-4" />,
                      count: analysis.patterns.length,
                    },
                    {
                      key: 'anomalies',
                      label: 'Anomalies',
                      icon: <AlertTriangle className="w-4 h-4" />,
                      count: analysis.anomalies.length,
                    },
                    { key: 'metadata', label: 'Metadata', icon: <FileText className="w-4 h-4" /> },
                  ]}
                  activeTab={activeTab}
                  onChange={(key) =>
                    setActiveTab(
                      key as 'dashboard' | 'entities' | 'patterns' | 'anomalies' | 'metadata',
                    )
                  }
                  className="!bg-[var(--glass-bg)] !border-[var(--glass-border)] !px-6"
                />

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Technical Forensics */}
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">
                          Technical Forensics
                        </h4>
                        <div className="text-sm text-[var(--text-secondary)] space-y-1">
                          <div>
                            Producer:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.technical?.producer ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            Creator:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.technical?.creator ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            Created:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.technical?.creationDate ?? '—'}
                            </span>
                          </div>
                          <div>
                            Modified:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.technical?.modificationDate ?? '—'}
                            </span>
                          </div>
                          <div>
                            Page Count:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.technical?.pageCount ?? '—'}
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
                              className="px-2 py-1 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded text-xs hover:bg-[var(--glass-bg-highlight)]"
                            >
                              Download Metrics JSON
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Structural Analysis */}
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">Structural</h4>
                        <div className="text-sm text-[var(--text-secondary)] space-y-1">
                          <div>
                            JavaScript:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.structural?.containsJavascript
                                ? 'Detected'
                                : 'None/Unknown'}
                            </span>
                          </div>
                          <div>
                            Font Count:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.structural?.fontCount ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            PDF Version:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.structural?.pdfVersion ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            JS Object IDs:{' '}
                            <span className="text-[var(--text-primary)]">
                              {Array.isArray(metrics?.structural?.jsObjectIds)
                                ? metrics.structural.jsObjectIds.length
                                : 0}
                            </span>
                          </div>
                          {Array.isArray(metrics?.structural?.jsObjectIds) &&
                            metrics.structural.jsObjectIds.length > 0 && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-[var(--text-secondary)]">
                                  Show IDs
                                </summary>
                                <div className="text-xs text-[var(--text-secondary)]">
                                  {metrics.structural.jsObjectIds.join(', ')}
                                </div>
                              </details>
                            )}
                        </div>
                      </div>
                      {/* Linguistic */}
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">Linguistic</h4>
                        <div className="text-sm text-[var(--text-secondary)] space-y-1">
                          <div>
                            Flesch-Kincaid:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.linguistic?.readabilityFKGL ?? '—'}
                            </span>
                          </div>
                          <div>
                            Sentiment:{' '}
                            <span className="text-[var(--text-primary)] capitalize">
                              {metrics?.linguistic?.sentiment ?? 'neutral'}
                            </span>
                          </div>
                          <div>
                            TTR:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.linguistic?.typeTokenRatio ?? '—'}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Temporal */}
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">Temporal</h4>
                        <div className="text-sm text-[var(--text-secondary)] space-y-1">
                          <div>
                            Business Hours:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.temporal?.businessHours ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            Day of Week:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.temporal?.dayOfWeek ?? '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Network */}
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">Network</h4>
                        <div className="text-sm text-[var(--text-secondary)] space-y-1">
                          <div>
                            Entity Density / 1000 words:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.network?.entityDensityPer1000Words ?? '—'}
                            </span>
                          </div>
                          <div>
                            Risk Score:{' '}
                            <span className="text-[var(--text-primary)]">
                              {metrics?.network?.riskScore ?? '—'}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Readability Distribution */}
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] col-span-1 md:col-span-2">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">
                          Readability Distribution (FKGL)
                        </h4>
                        <div className="h-40">
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
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">
                          Sentiment Breakdown
                        </h4>
                        <div className="h-40">
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
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">
                          Top JS-heavy PDFs
                        </h4>
                        <div className="text-xs text-[var(--text-secondary)] space-y-1">
                          {topJs.slice(0, 5).map((t) => (
                            <div
                              key={t.id}
                              className="flex justify-between items-center"
                              onMouseEnter={() => void previewMetric(String(t.id))}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => openForensicDocument(String(t.id))}
                            >
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setCompareAId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded text-xs"
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => setCompareBId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded text-xs"
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
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">
                          High Entity Density
                        </h4>
                        <div className="text-xs text-[var(--text-secondary)] space-y-1">
                          {topDensity.slice(0, 5).map((t) => (
                            <div
                              key={t.id}
                              className="flex justify-between items-center"
                              onMouseEnter={() => void previewMetric(String(t.id))}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => openForensicDocument(String(t.id))}
                            >
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setCompareAId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded text-xs"
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => setCompareBId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded text-xs"
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
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">
                          Highest Risk Score
                        </h4>
                        <div className="text-xs text-[var(--text-secondary)] space-y-1">
                          {topRisk.slice(0, 5).map((t) => (
                            <div
                              key={t.id}
                              className="flex justify-between items-center"
                              onMouseEnter={() => void previewMetric(String(t.id))}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => openForensicDocument(String(t.id))}
                            >
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}%</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setCompareAId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded text-xs"
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => setCompareBId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded text-xs"
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
                      <div className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] col-span-1 md:col-span-2">
                        <h4 className="text-[var(--text-primary)] font-medium mb-2">
                          Compare Documents
                        </h4>
                        <div className="flex gap-2 mb-2">
                          <input
                            value={compareAId}
                            onChange={(e) => setCompareAId(e.target.value)}
                            placeholder="Doc ID A"
                            className="bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] p-2 rounded text-sm"
                          />
                          <input
                            value={compareBId}
                            onChange={(e) => setCompareBId(e.target.value)}
                            placeholder="Doc ID B"
                            className="bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] p-2 rounded text-sm"
                          />
                          <button
                            onClick={() => void loadComparison()}
                            className="px-3 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded text-sm"
                          >
                            Load
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-[var(--glass-bg-highlight)] rounded p-3">
                            <h5 className="text-[var(--text-primary)] text-sm mb-2">FKGL</h5>
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={[
                                    { name: 'A', val: compareA?.linguistic?.readabilityFKGL || 0 },
                                    { name: 'B', val: compareB?.linguistic?.readabilityFKGL || 0 },
                                  ]}
                                >
                                  <XAxis dataKey="name" stroke="#ccc" tick={{ fill: '#ccc' }} />
                                  <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} />
                                  <Bar dataKey="val" fill="#34d399" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="bg-[var(--glass-bg-highlight)] rounded p-3">
                            <h5 className="text-[var(--text-primary)] text-sm mb-2">
                              Entity Density / 1000
                            </h5>
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={[
                                    {
                                      name: 'A',
                                      val: compareA?.network?.entityDensityPer1000Words || 0,
                                    },
                                    {
                                      name: 'B',
                                      val: compareB?.network?.entityDensityPer1000Words || 0,
                                    },
                                  ]}
                                >
                                  <XAxis dataKey="name" stroke="#ccc" tick={{ fill: '#ccc' }} />
                                  <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} />
                                  <Bar dataKey="val" fill="#f59e0b" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'entities' && (
                    <div className="space-y-3">
                      {analysis.entities.map((entity, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg)] transition-colors cursor-pointer"
                          onClick={() => setSelectedEntity(entity)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] flex items-center justify-center flex-shrink-0">
                              {React.createElement(getEntityIcon(entity.type), {
                                className: 'w-5 h-5 text-[var(--text-secondary)]',
                              })}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[var(--text-primary)] font-medium truncate">
                                  {entity.text}
                                </p>
                                <span className="text-xs text-[var(--text-muted)] ml-2">
                                  {Math.round(entity.confidence)}%
                                </span>
                              </div>
                              <p className="text-sm text-[var(--text-muted)] capitalize mb-1">
                                {entity.type}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                                {entity.context}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'patterns' && (
                    <div className="space-y-3">
                      {analysis.patterns.map((pattern, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] border-l-4"
                          style={{
                            borderLeftColor:
                              pattern.significance === 'high'
                                ? '#ef4444'
                                : pattern.significance === 'medium'
                                  ? '#f59e0b'
                                  : '#10b981',
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-[var(--text-muted)] uppercase font-medium">
                              {pattern.type}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded font-medium ${pattern.significance === 'high' ? 'bg-red-700 text-[var(--text-primary)]' : pattern.significance === 'medium' ? 'bg-yellow-700 text-[var(--text-primary)]' : 'bg-green-700 text-[var(--text-primary)]'}`}
                            >
                              {pattern.significance}
                            </span>
                          </div>
                          <div className="bg-[var(--glass-bg-highlight)]/50 rounded-[var(--radius-lg)] p-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                              <div>
                                <h4 className="text-[var(--text-primary)] font-medium mb-1">
                                  {pattern.type}
                                </h4>
                                <p className="text-sm text-[var(--text-muted)] mb-2">
                                  {pattern.description}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[var(--text-muted)]">
                                    Severity:
                                  </span>
                                  <div className="flex-1 h-1.5 bg-[var(--glass-bg-highlight)] rounded-full w-24">
                                    <div
                                      className={`h-full rounded-full ${
                                        pattern.severity === 'high'
                                          ? 'bg-red-500'
                                          : pattern.severity === 'medium'
                                            ? 'bg-yellow-500'
                                            : 'bg-[var(--accent)]'
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

                  {activeTab === 'metadata' && (
                    <div className="p-4">
                      <DocumentMetadataPanel
                        document={{
                          fileName: analysis.metadata.fileInfo.name,
                          fileType: analysis.metadata.fileInfo.type,
                          fileSize: analysis.metadata.fileInfo.size,
                          contentHash: analysis.metadata.fileInfo.hash,
                          dateCreated: analysis.metadata.fileInfo.created,
                          dateModified: analysis.metadata.fileInfo.modified,
                          redFlagRating: metrics?.network?.riskScore
                            ? Math.ceil(metrics.network.riskScore / 20)
                            : 0,
                          tags: analysis.metadata.tags,
                          metadata: {
                            technical: metrics?.technical || analysis.metadata.technical,
                            structure: metrics?.structural || analysis.metadata.structure,
                            linguistics: metrics?.linguistic || analysis.metadata.linguistics,
                            network: metrics?.network || analysis.metadata.network,
                            source_collection: docMeta?.source_collection,
                            source_original_url: docMeta?.source_original_url,
                            tags: analysis.metadata.tags,
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
        <div className="fixed inset-0 bg-[var(--glass-bg-strong)] bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-xl)] max-w-lg w-full p-6 border border-[var(--glass-border)] shadow-[var(--glass-shadow)]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                  {selectedEntity.name}
                </h3>
                <span className="text-sm text-[var(--text-muted)] capitalize">
                  {selectedEntity.type}
                </span>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--glass-bg-highlight)]/50 p-4 rounded-[var(--radius-lg)]">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Analysis</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-muted)] block">Sentiment</span>
                    <span
                      className={
                        selectedEntity.sentiment === 'negative' ? 'text-red-400' : 'text-green-400'
                      }
                    >
                      {selectedEntity.sentiment}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Confidence</span>
                    <span className="text-[var(--text-primary)]">
                      {(selectedEntity.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="px-4 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors"
                >
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
