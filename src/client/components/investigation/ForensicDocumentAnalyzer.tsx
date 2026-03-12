import React, { useState, useEffect } from 'react';
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

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ForensicAnalysis {
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
  technical?: any;
  structure?: any;
  linguistics?: any;
  network?: any;
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

interface ForensicDocumentAnalyzerProps {
  documentId: string;
  onAnalysisComplete?: (analysis: ForensicAnalysis) => void;
  caseContext?: {
    caseId: string;
    investigationFocus: string[];
    keyEntities: string[];
    timelineRange: { start: string; end: string };
  };
}

export const ForensicDocumentAnalyzer: React.FC<ForensicDocumentAnalyzerProps> = ({
  documentId,
  onAnalysisComplete,
  caseContext,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analysis, setAnalysis] = useState<ForensicAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'entities' | 'patterns' | 'anomalies' | 'metadata'
  >('dashboard');
  const [metrics, setMetrics] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [topJs, setTopJs] = useState<any[]>([]);
  const [topDensity, setTopDensity] = useState<any[]>([]);
  const [topRisk, setTopRisk] = useState<any[]>([]);
  const [compareAId, setCompareAId] = useState('');
  const [compareBId, setCompareBId] = useState('');
  const [compareA, setCompareA] = useState<any | null>(null);
  const [compareB, setCompareB] = useState<any | null>(null);
  const [hoveredId, setHoveredId] = useState<string>('');
  const [quickMetrics, setQuickMetrics] = useState<Record<string, any>>({});
  const [activeId, setActiveId] = useState<string>(documentId);
  useEffect(() => {
    setActiveId(documentId);
  }, [documentId]);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const a = params.get('compareA');
      const b = params.get('compareB');
      if (a) setCompareAId(a);
      if (b) setCompareBId(b);
    } catch (err) {
      console.error('Error parsing URL parameters:', err);
    }
  }, []);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    factors: false,
    fileInfo: false,
    docProps: false,
    textAnalysis: false,
  });
  const [docMeta, setDocMeta] = useState<{
    source_collection?: string;
    source_original_url?: string;
    credibility_score?: number;
    sensitivity_flags?: string[];
    filePath?: string;
    originalFilePath?: string;
    cleanedPath?: string;
  } | null>(null);

  useEffect(() => {
    // Resize observation no longer needed for PDF width here as it's handled in child or CSS
  }, []);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        if (activeId) {
          const res = await fetch(`/api/evidence/${activeId}`);
          if (res.ok) {
            const data = await res.json();
            const meta = data.metadata || {};
            setDocMeta({
              source_collection: meta.source_collection || data.source_collection,
              source_original_url: meta.source_original_url,
              credibility_score: meta.credibility_score,
              sensitivity_flags: Array.isArray(meta.sensitivity_flags)
                ? meta.sensitivity_flags
                : [],
              filePath: data.filePath,
              originalFilePath: data.original_file_path || data.originalFilePath,
              cleanedPath: data.cleanedPath,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching document metadata:', err);
      }
    };
    fetchDoc();
  }, [activeId]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        if (activeId) {
          const res = await fetch(`/api/forensic/metrics/${activeId}`);
          if (res.ok) {
            const data = await res.json();
            setMetrics(data);
          }
        }
      } catch (err) {
        console.error('Error fetching metrics:', err);
      }
    };
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/forensic/metrics-summary');
        if (res.ok) setSummary(await res.json());
      } catch (err) {
        console.error('Error fetching summary:', err);
      }
    };
    const fetchTop = async () => {
      try {
        const [jsRes, denRes, riskRes] = await Promise.all([
          fetch('/api/forensic/metrics-list/top?by=js&limit=10'),
          fetch('/api/forensic/metrics-list/top?by=density&limit=10'),
          fetch('/api/forensic/metrics-list/top?by=risk&limit=10'),
        ]);
        if (jsRes.ok) {
          const d = await jsRes.json();
          setTopJs(d.data || []);
        }
        if (denRes.ok) {
          const d = await denRes.json();
          setTopDensity(d.data || []);
        }
        if (riskRes.ok) {
          const d = await riskRes.json();
          setTopRisk(d.data || []);
        }
      } catch (err) {
        console.error('Error fetching top metrics:', err);
      }
    };
    if (activeTab === 'dashboard' && activeId) {
      fetchMetrics();
      fetchSummary();
      fetchTop();
    }
  }, [activeTab, activeId]);

  const startForensicAnalysis = async () => {
    if (!documentId) return;
    setIsAnalyzing(true);
    try {
      if (documentId) {
        const params = new URLSearchParams();
        if (caseContext?.caseId) params.set('caseId', caseContext.caseId);
        if (caseContext?.keyEntities?.length)
          params.set('keyEntities', caseContext.keyEntities.join(','));
        const query = params.toString() ? `?${params.toString()}` : '';
        const resp = await fetch(`/api/forensic/analyze/${documentId}${query}`);
        const data = await resp.json();
        setAnalysis(data);
        if (onAnalysisComplete) onAnalysisComplete(data);
      }
    } catch (e) {
      console.error('Forensic analysis failed', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
    <div className="h-full bg-gray-900 text-gray-100 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col gap-6 p-6">
          {/* Document Viewer */}
          <div className="flex flex-col bg-gray-800 rounded-lg overflow-hidden min-h-[500px]">
            <PDFVariantViewer documentId={documentId} className="flex-1" />
          </div>

          {/* Analysis Panel */}
          <div className="flex flex-col bg-gray-800 rounded-lg overflow-hidden">
            {!analysis && !isAnalyzing && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Fingerprint className="w-20 h-20 text-gray-600 mb-6" />
                <h3 className="text-xl font-semibold text-gray-300 mb-3">No Analysis Yet</h3>
                <p className="text-gray-400 text-center mb-6 max-w-sm">
                  Perform forensic analysis to authenticate this document and extract key
                  information
                </p>
                <button
                  onClick={startForensicAnalysis}
                  disabled={!documentId}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${documentId ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                >
                  <Fingerprint className="w-5 h-5" />
                  Analyze Document
                </button>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mb-6"></div>
                <h3 className="text-xl font-semibold text-gray-300 mb-3">Analyzing Document...</h3>
                <p className="text-gray-400 text-center max-w-sm">
                  Performing forensic analysis and cross-referencing with case database
                </p>
              </div>
            )}

            {analysis && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Authenticity Score - Always Visible */}
                <div className="bg-gray-800 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Authenticity Score</h3>
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
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
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
                  <p className="text-sm text-gray-400 capitalize">
                    Verdict:{' '}
                    <span className="text-white font-medium">{analysis.authenticity.verdict}</span>
                  </p>

                  {/* Collapsible Factors */}
                  <button
                    onClick={() => toggleSection('factors')}
                    className="flex items-center gap-2 mt-4 text-sm text-gray-400 hover:text-gray-300"
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
                        <div key={idx} className="p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white capitalize">
                              {factor.type.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-gray-400">{factor.score}%</span>
                          </div>
                          <p className="text-xs text-gray-400">{factor.description}</p>
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
                  onChange={(key) => setActiveTab(key as any)}
                  className="!bg-gray-800 !border-gray-700 !px-6"
                />

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Technical Forensics */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Technical Forensics</h4>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div>
                            Producer:{' '}
                            <span className="text-gray-100">
                              {metrics?.technical?.producer ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            Creator:{' '}
                            <span className="text-gray-100">
                              {metrics?.technical?.creator ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            Created:{' '}
                            <span className="text-gray-100">
                              {metrics?.technical?.creationDate ?? '—'}
                            </span>
                          </div>
                          <div>
                            Modified:{' '}
                            <span className="text-gray-100">
                              {metrics?.technical?.modificationDate ?? '—'}
                            </span>
                          </div>
                          <div>
                            Page Count:{' '}
                            <span className="text-gray-100">
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
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
                            >
                              Download Metrics JSON
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Structural Analysis */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Structural</h4>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div>
                            JavaScript:{' '}
                            <span className="text-gray-100">
                              {metrics?.structural?.containsJavascript
                                ? 'Detected'
                                : 'None/Unknown'}
                            </span>
                          </div>
                          <div>
                            Font Count:{' '}
                            <span className="text-gray-100">
                              {metrics?.structural?.fontCount ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            PDF Version:{' '}
                            <span className="text-gray-100">
                              {metrics?.structural?.pdfVersion ?? 'Unknown'}
                            </span>
                          </div>
                          <div>
                            JS Object IDs:{' '}
                            <span className="text-gray-100">
                              {Array.isArray(metrics?.structural?.jsObjectIds)
                                ? metrics.structural.jsObjectIds.length
                                : 0}
                            </span>
                          </div>
                          {Array.isArray(metrics?.structural?.jsObjectIds) &&
                            metrics.structural.jsObjectIds.length > 0 && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-gray-300">Show IDs</summary>
                                <div className="text-xs text-gray-300">
                                  {metrics.structural.jsObjectIds.join(', ')}
                                </div>
                              </details>
                            )}
                        </div>
                      </div>
                      {/* Linguistic */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Linguistic</h4>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div>
                            Flesch-Kincaid:{' '}
                            <span className="text-gray-100">
                              {metrics?.linguistic?.readabilityFKGL ?? '—'}
                            </span>
                          </div>
                          <div>
                            Sentiment:{' '}
                            <span className="text-gray-100 capitalize">
                              {metrics?.linguistic?.sentiment ?? 'neutral'}
                            </span>
                          </div>
                          <div>
                            TTR:{' '}
                            <span className="text-gray-100">
                              {metrics?.linguistic?.typeTokenRatio ?? '—'}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Temporal */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Temporal</h4>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div>
                            Business Hours:{' '}
                            <span className="text-gray-100">
                              {metrics?.temporal?.businessHours ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            Day of Week:{' '}
                            <span className="text-gray-100">
                              {metrics?.temporal?.dayOfWeek ?? '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Network */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Network</h4>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div>
                            Entity Density / 1000 words:{' '}
                            <span className="text-gray-100">
                              {metrics?.network?.entityDensityPer1000Words ?? '—'}
                            </span>
                          </div>
                          <div>
                            Risk Score:{' '}
                            <span className="text-gray-100">
                              {metrics?.network?.riskScore ?? '—'}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Readability Distribution */}
                      <div className="p-4 bg-gray-700 rounded-lg col-span-1 md:col-span-2">
                        <h4 className="text-white font-medium mb-2">
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
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Sentiment Breakdown</h4>
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
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Top JS-heavy PDFs</h4>
                        <div className="text-xs text-gray-300 space-y-1">
                          {topJs.slice(0, 5).map((t: any) => (
                            <div
                              key={t.id}
                              className="flex justify-between items-center"
                              onMouseEnter={async () => {
                                setHoveredId(String(t.id));
                                if (!quickMetrics[String(t.id)]) {
                                  try {
                                    const r = await fetch(`/api/forensic/metrics/${t.id}`);
                                    if (r.ok) {
                                      const m = await r.json();
                                      setQuickMetrics((prev) => ({ ...prev, [String(t.id)]: m }));
                                    }
                                  } catch {
                                    // Ignore fetch errors
                                  }
                                }
                              }}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => {
                                const idStr = String(t.id);
                                if (!location.pathname.startsWith('/investigations')) {
                                  navigate(`/investigations?tab=forensic&docId=${idStr}`);
                                } else {
                                  setActiveId(idStr);
                                  try {
                                    const params = new URLSearchParams(window.location.search);
                                    params.set('tab', 'forensic');
                                    params.set('docId', idStr);
                                    const url = `${window.location.pathname}?${params.toString()}`;
                                    window.history.replaceState(null, '', url);
                                  } catch {
                                    // Ignore fetch errors
                                  }
                                }
                              }}
                            >
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setCompareAId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-gray-600 text-white rounded text-xs"
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => setCompareBId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-gray-600 text-white rounded text-xs"
                                >
                                  B
                                </button>
                              </div>
                              {hoveredId === String(t.id) && (
                                <div className="ml-2 text-[10px] text-gray-300">
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
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">High Entity Density</h4>
                        <div className="text-xs text-gray-300 space-y-1">
                          {topDensity.slice(0, 5).map((t: any) => (
                            <div
                              key={t.id}
                              className="flex justify-between items-center"
                              onMouseEnter={async () => {
                                setHoveredId(String(t.id));
                                if (!quickMetrics[String(t.id)]) {
                                  try {
                                    const r = await fetch(`/api/forensic/metrics/${t.id}`);
                                    if (r.ok) {
                                      const m = await r.json();
                                      setQuickMetrics((prev) => ({ ...prev, [String(t.id)]: m }));
                                    }
                                  } catch {
                                    // Ignore fetch errors
                                  }
                                }
                              }}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => {
                                const idStr = String(t.id);
                                if (!location.pathname.startsWith('/investigations')) {
                                  navigate(`/investigations?tab=forensic&docId=${idStr}`);
                                } else {
                                  setActiveId(idStr);
                                  try {
                                    const params = new URLSearchParams(window.location.search);
                                    params.set('tab', 'forensic');
                                    params.set('docId', idStr);
                                    const url = `${window.location.pathname}?${params.toString()}`;
                                    window.history.replaceState(null, '', url);
                                  } catch {
                                    // Ignore fetch errors
                                  }
                                }
                              }}
                            >
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setCompareAId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-gray-600 text-white rounded text-xs"
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => setCompareBId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-gray-600 text-white rounded text-xs"
                                >
                                  B
                                </button>
                              </div>
                              {hoveredId === String(t.id) && (
                                <div className="ml-2 text-[10px] text-gray-300">
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
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Highest Risk Score</h4>
                        <div className="text-xs text-gray-300 space-y-1">
                          {topRisk.slice(0, 5).map((t: any) => (
                            <div
                              key={t.id}
                              className="flex justify-between items-center"
                              onMouseEnter={async () => {
                                setHoveredId(String(t.id));
                                if (!quickMetrics[String(t.id)]) {
                                  try {
                                    const r = await fetch(`/api/forensic/metrics/${t.id}`);
                                    if (r.ok) {
                                      const m = await r.json();
                                      setQuickMetrics((prev) => ({ ...prev, [String(t.id)]: m }));
                                    }
                                  } catch {
                                    // Ignore fetch errors
                                  }
                                }
                              }}
                              onMouseLeave={() => setHoveredId('')}
                              onClick={() => {
                                const idStr = String(t.id);
                                if (!location.pathname.startsWith('/investigations')) {
                                  navigate(`/investigations?tab=forensic&docId=${idStr}`);
                                } else {
                                  setActiveId(idStr);
                                  try {
                                    const params = new URLSearchParams(window.location.search);
                                    params.set('tab', 'forensic');
                                    params.set('docId', idStr);
                                    const url = `${window.location.pathname}?${params.toString()}`;
                                    window.history.replaceState(null, '', url);
                                  } catch {
                                    // Ignore fetch errors
                                  }
                                }
                              }}
                            >
                              <span className="truncate max-w-[50%]">{t.fileName}</span>
                              <span className="mr-2">{t.score}%</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setCompareAId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-gray-600 text-white rounded text-xs"
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => setCompareBId(String(t.id))}
                                  className="px-1.5 py-0.5 bg-gray-600 text-white rounded text-xs"
                                >
                                  B
                                </button>
                              </div>
                              {hoveredId === String(t.id) && (
                                <div className="ml-2 text=[10px] text-gray-300">
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
                      <div className="p-4 bg-gray-700 rounded-lg col-span-1 md:col-span-2">
                        <h4 className="text-white font-medium mb-2">Compare Documents</h4>
                        <div className="flex gap-2 mb-2">
                          <input
                            value={compareAId}
                            onChange={(e) => setCompareAId(e.target.value)}
                            placeholder="Doc ID A"
                            className="bg-gray-600 text-white p-2 rounded text-sm"
                          />
                          <input
                            value={compareBId}
                            onChange={(e) => setCompareBId(e.target.value)}
                            placeholder="Doc ID B"
                            className="bg-gray-600 text-white p-2 rounded text-sm"
                          />
                          <button
                            onClick={async () => {
                              try {
                                const [a, b] = await Promise.all([
                                  fetch(`/api/forensic/metrics/${compareAId}`),
                                  fetch(`/api/forensic/metrics/${compareBId}`),
                                ]);
                                if (a.ok) setCompareA(await a.json());
                                if (b.ok) setCompareB(await b.json());
                                const params = new URLSearchParams(window.location.search);
                                if (compareAId) params.set('compareA', compareAId);
                                else params.delete('compareA');
                                if (compareBId) params.set('compareB', compareBId);
                                else params.delete('compareB');
                                const url = `${window.location.pathname}?${params.toString()}`;
                                window.history.replaceState(null, '', url);
                              } catch {
                                // Ignore fetch errors
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                          >
                            Load
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-700 rounded p-3">
                            <h5 className="text-white text-sm mb-2">FKGL</h5>
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
                          <div className="bg-gray-700 rounded p-3">
                            <h5 className="text-white text-sm mb-2">Entity Density / 1000</h5>
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
                          className="p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors cursor-pointer"
                          onClick={() => setSelectedEntity(entity)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              {React.createElement(getEntityIcon(entity.type), {
                                className: 'w-5 h-5 text-gray-300',
                              })}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-white font-medium truncate">{entity.text}</p>
                                <span className="text-xs text-gray-400 ml-2">
                                  {Math.round(entity.confidence)}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 capitalize mb-1">{entity.type}</p>
                              <p className="text-xs text-gray-500 line-clamp-2">{entity.context}</p>
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
                          className="p-4 bg-gray-700 rounded-lg border-l-4"
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
                            <span className="text-xs text-gray-400 uppercase font-medium">
                              {pattern.type}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded font-medium ${pattern.significance === 'high' ? 'bg-red-700 text-white' : pattern.significance === 'medium' ? 'bg-yellow-700 text-white' : 'bg-green-700 text-white'}`}
                            >
                              {pattern.significance}
                            </span>
                          </div>
                          <div className="bg-gray-700/50 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                              <div>
                                <h4 className="text-white font-medium mb-1">{pattern.type}</h4>
                                <p className="text-sm text-gray-400 mb-2">{pattern.description}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Severity:</span>
                                  <div className="flex-1 h-1.5 bg-gray-600 rounded-full w-24">
                                    <div
                                      className={`h-full rounded-full ${
                                        pattern.severity === 'high'
                                          ? 'bg-red-500'
                                          : pattern.severity === 'medium'
                                            ? 'bg-yellow-500'
                                            : 'bg-blue-500'
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6 border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{selectedEntity.name}</h3>
                <span className="text-sm text-gray-400 capitalize">{selectedEntity.type}</span>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Analysis</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Sentiment</span>
                    <span
                      className={
                        selectedEntity.sentiment === 'negative' ? 'text-red-400' : 'text-green-400'
                      }
                    >
                      {selectedEntity.sentiment}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Confidence</span>
                    <span className="text-white">
                      {(selectedEntity.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
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
