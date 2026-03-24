import { useState, useEffect } from 'react';
import {
  Link,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Mail,
  DollarSign,
  User,
  Building,
  Calendar,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';

interface DataSource {
  id: string;
  type: 'financial' | 'communication' | 'travel' | 'document' | 'social' | 'legal';
  name: string;
  description: string;
  lastUpdated: string;
  reliability: 'low' | 'medium' | 'high' | 'verified';
  recordCount: number;
  coverage: number; // percentage of complete data
}

interface CorrelationResult {
  id: string;
  type: 'temporal' | 'spatial' | 'entity' | 'financial' | 'behavioral' | 'communication';
  confidence: number;
  description: string;
  sources: string[];
  entities: string[];
  timeRange: { start: string; end: string };
  location?: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  anomalies: string[];
}

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  type: 'automatic' | 'manual' | 'ml_suggested';
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  lastTriggered?: string;
  triggerCount: number;
}

export default function MultiSourceCorrelationEngine() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);
  const [correlationRules, setCorrelationRules] = useState<CorrelationRule[]>([]);
  const [selectedCorrelation, setSelectedCorrelation] = useState<CorrelationResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSignificance, setFilterSignificance] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const recomputeCorrelations = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisProgress(30);

      const resp = await fetch('/api/analytics/correlations');
      if (!resp.ok) throw new Error('Failed to fetch correlations');
      const data = await resp.json();

      setAnalysisProgress(80);

      setDataSources(data.dataSources || []);
      setCorrelations(data.correlations || []);
      setCorrelationRules(data.rules || []);

      setAnalysisProgress(100);
    } catch {
      setDataSources([]);
      setCorrelationRules([]);
      setCorrelations([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load real data initially
  useEffect(() => {
    recomputeCorrelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCorrelationAnalysis = async () => {
    await recomputeCorrelations();
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'financial':
        return <DollarSign className="w-5 h-5" />;
      case 'communication':
        return <Mail className="w-5 h-5" />;
      case 'travel':
        return <MapPin className="w-5 h-5" />;
      case 'document':
        return <Activity className="w-5 h-5" />;
      case 'social':
        return <User className="w-5 h-5" />;
      case 'legal':
        return <Building className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'verified':
        return 'text-green-400 bg-green-900';
      case 'high':
        return 'text-[var(--accent)] bg-blue-900';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900';
      case 'low':
        return 'text-red-400 bg-red-900';
      default:
        return 'text-[var(--text-muted)] bg-[var(--glass-bg-strong)]';
    }
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'critical':
        return 'border-red-500 bg-red-900';
      case 'high':
        return 'border-yellow-500 bg-yellow-900';
      case 'medium':
        return 'border-[var(--accent)] bg-blue-900';
      case 'low':
        return 'border-green-500 bg-green-900';
      default:
        return 'border-[var(--glass-border)] bg-[var(--glass-bg-strong)]';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 80) return 'text-yellow-400';
    if (confidence >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const filteredCorrelations = correlations.filter((correlation) => {
    const matchesSearch =
      searchTerm === '' ||
      correlation.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      correlation.entities.some((entity) =>
        entity.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesType = filterType === 'all' || correlation.type === filterType;
    const matchesSignificance =
      filterSignificance === 'all' || correlation.significance === filterSignificance;

    return matchesSearch && matchesType && matchesSignificance;
  });

  const exportCorrelations = () => {
    const data = {
      correlations: filteredCorrelations,
      dataSources: dataSources,
      correlationRules: correlationRules,
      exportDate: new Date().toISOString(),
      summary: {
        totalCorrelations: filteredCorrelations.length,
        criticalCorrelations: filteredCorrelations.filter((c) => c.significance === 'critical')
          .length,
        averageConfidence:
          filteredCorrelations.reduce((sum, c) => sum + c.confidence, 0) /
          filteredCorrelations.length,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `correlation-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--glass-bg-strong)] text-[var(--text-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-400 mb-2">Multi-Source Correlation Engine</h1>
          <p className="text-[var(--text-muted)]">
            Advanced cross-reference analysis connecting disparate data sources
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Search Correlations
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search descriptions or entities..."
                  className="w-full pl-10 pr-4 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Correlation Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Types</option>
                <option value="temporal">Temporal</option>
                <option value="spatial">Spatial</option>
                <option value="entity">Entity</option>
                <option value="financial">Financial</option>
                <option value="behavioral">Behavioral</option>
                <option value="communication">Communication</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Significance
              </label>
              <select
                value={filterSignificance}
                onChange={(e) => setFilterSignificance(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={runCorrelationAnalysis}
                disabled={isAnalyzing}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-[var(--glass-bg-highlight)] disabled:cursor-not-allowed rounded-[var(--radius-lg)] transition-colors flex items-center justify-center gap-2 whitespace-nowrap min-w-[160px]"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[var(--glass-border)] border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    Run Analysis
                  </>
                )}
              </button>
            </div>
          </div>

          {isAnalyzing && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-[var(--text-muted)] mb-2">
                <span>Analysis Progress</span>
                <span>{analysisProgress}%</span>
              </div>
              <div className="w-full bg-[var(--glass-bg-highlight)] rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="text-sm text-[var(--text-muted)]">
              Found {filteredCorrelations.length} correlations from {dataSources.length} data
              sources
            </div>
            <button
              onClick={exportCorrelations}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-blue-700 rounded-[var(--radius-lg)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Results
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--text-muted)] text-sm whitespace-nowrap">Active Sources</p>
                <p className="text-2xl font-bold text-[var(--accent)]">{dataSources.length}</p>
              </div>
              <Activity className="w-8 h-8 text-[var(--accent)]" />
            </div>
          </div>

          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--text-muted)] text-sm whitespace-nowrap">
                  Total Correlations
                </p>
                <p className="text-2xl font-bold text-green-400">{filteredCorrelations.length}</p>
              </div>
              <Link className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--text-muted)] text-sm whitespace-nowrap">
                  Critical Findings
                </p>
                <p className="text-2xl font-bold text-yellow-400">
                  {filteredCorrelations.filter((c) => c.significance === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--text-muted)] text-sm whitespace-nowrap">Avg Confidence</p>
                <p className="text-2xl font-bold text-purple-400">
                  {filteredCorrelations.length > 0
                    ? Math.round(
                        filteredCorrelations.reduce((sum, c) => sum + c.confidence, 0) /
                          filteredCorrelations.length,
                      )
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Correlation Results */}
          <div className="md:col-span-1 xl:col-span-2">
            <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                Correlation Results
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredCorrelations.map((correlation) => (
                  <article
                    key={correlation.id}
                    className={`p-4 rounded-[var(--radius-lg)] cursor-pointer transition-colors border-l-4 ${
                      selectedCorrelation?.id === correlation.id
                        ? 'bg-red-900 border-red-500'
                        : `${getSignificanceColor(correlation.significance)} border-opacity-50`
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                            correlation.type === 'temporal'
                              ? 'bg-blue-900 text-blue-200'
                              : correlation.type === 'spatial'
                                ? 'bg-green-900 text-green-200'
                                : correlation.type === 'financial'
                                  ? 'bg-yellow-900 text-yellow-200'
                                  : correlation.type === 'communication'
                                    ? 'bg-purple-900 text-purple-200'
                                    : 'bg-[var(--glass-bg-strong)] text-[var(--text-primary)]'
                          }`}
                        >
                          {correlation.type}
                        </span>
                        <span
                          className={`text-sm font-medium ${getConfidenceColor(correlation.confidence)}`}
                        >
                          {correlation.confidence}% confidence
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          correlation.significance === 'critical'
                            ? 'bg-red-900 text-red-200'
                            : correlation.significance === 'high'
                              ? 'bg-yellow-900 text-yellow-200'
                              : correlation.significance === 'medium'
                                ? 'bg-blue-900 text-blue-200'
                                : 'bg-green-900 text-green-200'
                        }`}
                      >
                        {correlation.significance.toUpperCase()}
                      </span>
                      <div>
                        <AddToInvestigationButton
                          item={{
                            id: correlation.id,
                            title: `Correlation: ${correlation.description.substring(0, 50)}...`,
                            description: correlation.description,
                            type: 'evidence',
                            sourceId: correlation.id,
                            metadata: {
                              confidence: correlation.confidence,
                              type: correlation.type,
                              significance: correlation.significance,
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
                          className="hover:bg-[var(--glass-bg-highlight)] p-1"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCorrelation(correlation)}
                      className="w-full bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset rounded-[var(--radius-md)]"
                      aria-label={`Open ${correlation.type} correlation details`}
                    >
                      <p className="text-[var(--text-primary)] mb-3">{correlation.description}</p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {correlation.entities.map((entity, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] rounded text-xs"
                          >
                            {entity}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {correlation.timeRange.start} to {correlation.timeRange.end}
                        </span>
                        {correlation.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {correlation.location}
                          </span>
                        )}
                        <span>{correlation.sources.length} sources</span>
                      </div>

                      {correlation.anomalies.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-red-400 font-medium mb-1">Anomalies:</p>
                          <div className="flex flex-wrap gap-1">
                            {correlation.anomalies.map((anomaly, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-red-900 text-red-200 rounded text-xs"
                              >
                                {anomaly}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Data Sources */}
            <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Data Sources
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {dataSources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getSourceIcon(source.type)}
                      <span className="font-medium text-[var(--text-primary)] text-sm">
                        {source.name}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{source.description}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span
                        className={`px-2 py-1 rounded ${getReliabilityColor(source.reliability)}`}
                      >
                        {source.reliability.toUpperCase()}
                      </span>
                      <span className="text-[var(--text-muted)]">{source.recordCount} records</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                        <span>Coverage</span>
                        <span>{source.coverage}%</span>
                      </div>
                      <div className="w-full bg-[var(--glass-bg-highlight)] rounded-full h-1">
                        <div
                          className="bg-[var(--accent)] h-1 rounded-full"
                          style={{ width: `${source.coverage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Correlation Rules */}
            <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Correlation Rules
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {correlationRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-[var(--text-primary)] text-sm">
                        {rule.name}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          rule.enabled
                            ? 'bg-green-900 text-green-200'
                            : 'bg-[var(--glass-bg-strong)] text-[var(--text-primary)]'
                        }`}
                      >
                        {rule.enabled ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{rule.description}</p>
                    <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
                      <span>Sensitivity: {rule.sensitivity}</span>
                      <span>Triggers: {rule.triggerCount}</span>
                    </div>
                    {rule.lastTriggered && (
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        Last: {new Date(rule.lastTriggered).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Correlation Details */}
            {selectedCorrelation && (
              <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Correlation Details
                  </h3>
                  <AddToInvestigationButton
                    item={{
                      id: selectedCorrelation.id,
                      title: `Correlation: ${selectedCorrelation.description.substring(0, 50)}...`,
                      description: selectedCorrelation.description,
                      type: 'evidence',
                      sourceId: selectedCorrelation.id,
                      metadata: {
                        confidence: selectedCorrelation.confidence,
                        type: selectedCorrelation.type,
                        significance: selectedCorrelation.significance,
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
                    className="text-xs"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)]">
                      Type
                    </label>
                    <p className="text-[var(--text-primary)] capitalize">
                      {selectedCorrelation.type}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)]">
                      Confidence
                    </label>
                    <p
                      className={`text-[var(--text-primary)] text-lg font-semibold ${getConfidenceColor(selectedCorrelation.confidence)}`}
                    >
                      {selectedCorrelation.confidence}%
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)]">
                      Time Range
                    </label>
                    <p className="text-[var(--text-primary)]">
                      {selectedCorrelation.timeRange.start} to {selectedCorrelation.timeRange.end}
                    </p>
                  </div>
                  {selectedCorrelation.location && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-muted)]">
                        Location
                      </label>
                      <p className="text-[var(--text-primary)]">{selectedCorrelation.location}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                      Evidence
                    </label>
                    <div className="space-y-1">
                      {selectedCorrelation.evidence.map((evidence, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[var(--text-secondary)]">{evidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                      Data Sources
                    </label>
                    <div className="space-y-1">
                      {selectedCorrelation.sources.map((sourceId, index) => {
                        const source = dataSources.find((s) => s.id === sourceId);
                        return (
                          <div key={index} className="flex items-center gap-2">
                            {source && getSourceIcon(source.type)}
                            <span className="text-sm text-[var(--text-secondary)]">
                              {source?.name || sourceId}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
