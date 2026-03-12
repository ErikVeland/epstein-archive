import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Investigation, EvidenceItem, TimelineEvent } from '../../types/investigation';
import {
  Microscope,
  FileSearch,
  Network,
  DollarSign,
  Link,
  BarChart3,
  Download,
  Settings,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useToasts } from '../common/useToasts';
import { ForensicDocumentAnalyzer } from './ForensicDocumentAnalyzer';
import EntityRelationshipMapper from '../entities/EntityRelationshipMapper';
import FinancialTransactionMapper from '../visualizations/FinancialTransactionMapper';
import MultiSourceCorrelationEngine from './MultiSourceCorrelationEngine';
import ForensicReportGenerator from './ForensicReportGenerator';
import { transformToNetwork } from '../../utils/networkDataUtils';
import { computeForensicConfidence, type ConfidenceResult } from '../../utils/forensicConfidence';
import { CloseButton } from '../common/CloseButton';

interface ForensicAnalysisWorkspaceProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  onEvidenceUpdate: (evidence: EvidenceItem[]) => void;
  timelineEvents: TimelineEvent[];
  useGlobalContext?: boolean;
}

export const ForensicAnalysisWorkspace: React.FC<ForensicAnalysisWorkspaceProps> = ({
  investigation,
  evidence,
  onEvidenceUpdate,
  timelineEvents,
  useGlobalContext = false,
}) => {
  const { addToast } = useToasts();
  const [activeTool, setActiveTool] = useState<
    'documents' | 'entities' | 'financial' | 'correlation' | 'reports'
  >('documents');
  const [showToolSettings, setShowToolSettings] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [enabledTools, setEnabledTools] = useState({
    documents: true,
    entities: true,
    financial: true,
    correlation: true,
    reports: true,
  });
  const [showReliabilityInfo, setShowReliabilityInfo] = useState(false);
  const [selectedConfidenceTool, setSelectedConfidenceTool] = useState<string | null>(null);
  const [toolRunState, setToolRunState] = useState<
    Record<string, 'not_run' | 'running' | 'complete' | 'needs_input'>
  >({
    documents: 'not_run',
    entities: 'not_run',
    financial: 'not_run',
    correlation: 'not_run',
    reports: 'not_run',
  });

  // Generate network data for the Entity Mapper
  const networkData = useMemo(() => {
    const people: any[] = [];
    const documents = (evidence || []).map((ev) => ({
      id: ev.id,
      title: ev.title || ev.id,
      mentionedEntities: [],
    }));
    return transformToNetwork(people, documents);
  }, [evidence]);

  const forensicTools = [
    {
      id: 'documents',
      name: 'Document Analysis',
      description: 'Forensic document authentication and analysis',
      icon: FileSearch,
      component: ForensicDocumentAnalyzer,
      enabled: enabledTools.documents,
    },
    {
      id: 'entities',
      name: 'Entity Mapping',
      description: 'Network visualization and relationship analysis',
      icon: Network,
      component: EntityRelationshipMapper,
      enabled: enabledTools.entities,
    },
    {
      id: 'financial',
      name: 'Financial Analysis',
      description: 'Transaction flow and money laundering detection',
      icon: DollarSign,
      component: FinancialTransactionMapper,
      enabled: enabledTools.financial,
    },
    {
      id: 'correlation',
      name: 'Multi-Source Correlation',
      description: 'Cross-reference analysis and pattern detection',
      icon: Link,
      component: MultiSourceCorrelationEngine,
      enabled: enabledTools.correlation,
    },
    {
      id: 'reports',
      name: 'Report Generation',
      description: 'Automated forensic report creation',
      icon: BarChart3,
      component: ForensicReportGenerator,
      enabled: enabledTools.reports,
    },
  ];

  const enabledToolsList = forensicTools.filter((tool) => tool.enabled);

  const toggleTool = (toolId: string) => {
    setEnabledTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId as keyof typeof prev],
    }));
  };

  const getToolStats = () => {
    const financialCount = evidence.filter((e) =>
      (e.type || '').toLowerCase().includes('financial'),
    ).length;
    const documentCount = evidence.filter((e) =>
      (e.type || '').toLowerCase().includes('document'),
    ).length;
    const correlationCount = timelineEvents.length;
    const modelCertainty = useGlobalContext ? 0.7 : 0.75;

    const runMetadata = (() => {
      let ingestRunId: string | null = null;
      let rulesetVersion: string | null = null;
      let modelId: string | null = null;
      for (const item of evidence) {
        const meta = ((item as any).metadata || (item as any).metadata_json || {}) as
          | Record<string, unknown>
          | string;
        const parsed =
          typeof meta === 'string'
            ? (() => {
                try {
                  return JSON.parse(meta);
                } catch {
                  return {};
                }
              })()
            : meta;
        if (!ingestRunId)
          ingestRunId = (parsed as any).ingest_run_id || (parsed as any).ingestRunId || null;
        if (!rulesetVersion) rulesetVersion = (parsed as any).rulesetVersion || 'forensic-rules-v1';
        if (!modelId) modelId = (parsed as any).modelId || (parsed as any).agentic_model_id || null;
      }
      return { ingestRunId, rulesetVersion, modelId };
    })();

    const documentsCoverage = documentCount / Math.max(1, evidence.length || 1);
    const entitiesCoverage = networkData.entities.length / Math.max(1, evidence.length || 1);
    const financialCoverage = financialCount / Math.max(1, evidence.length || 1);
    const correlationCoverage = correlationCount / Math.max(1, timelineEvents.length || 1);
    const reportsCoverage =
      (documentCount + timelineEvents.length) /
      Math.max(1, evidence.length + timelineEvents.length);

    const documentSignal = Math.min(
      1,
      evidence.filter((e) => (e.authenticityScore || 0) > 70).length / Math.max(1, documentCount),
    );
    const financialSignal = Math.min(
      1,
      evidence.filter((e) => (e.authenticityScore || 0) > 60).length /
        Math.max(1, financialCount || 1),
    );

    const entityCorroboration = Math.min(
      1,
      networkData.relationships.length / Math.max(1, networkData.entities.length * 2),
    );
    const correlationCorroboration = Math.min(
      1,
      (timelineEvents.filter((e) => (e.documents?.length || 0) > 0).length || 0) /
        Math.max(1, timelineEvents.length || 1),
    );

    const computed = {
      documents: {
        count: documentCount,
        coverage: documentsCoverage,
        signalQuality: documentSignal,
        corroboration: Math.min(1, timelineEvents.length / Math.max(1, documentCount || 1)),
        modelCertainty,
      },
      entities: {
        count: networkData.entities.length,
        coverage: entitiesCoverage,
        signalQuality: Math.min(1, networkData.entities.length / 20),
        corroboration: entityCorroboration,
        modelCertainty: null as number | null,
      },
      financial: {
        count: financialCount,
        coverage: financialCoverage,
        signalQuality: financialSignal,
        corroboration: Math.min(1, financialCount / 10),
        modelCertainty: null as number | null,
      },
      correlation: {
        count: correlationCount,
        coverage: correlationCoverage,
        signalQuality: Math.min(1, correlationCount / 30),
        corroboration: correlationCorroboration,
        modelCertainty,
      },
      reports: {
        count: documentCount + timelineEvents.length > 0 ? 1 : 0,
        coverage: Math.min(1, reportsCoverage),
        signalQuality: Math.min(1, (documentSignal + correlationCorroboration) / 2 || 0),
        corroboration: Math.min(1, (entityCorroboration + correlationCorroboration) / 2 || 0),
        modelCertainty,
      },
    };

    const confidenceFor = (
      toolId: string,
      count: number,
      coverage: number,
      signalQuality: number,
      corroboration: number,
      modelCertaintyValue: number | null,
      factorInputs: Record<string, unknown>,
    ): ConfidenceResult => {
      return computeForensicConfidence({
        toolId,
        count,
        ingestRunId: runMetadata.ingestRunId,
        rulesetVersion: runMetadata.rulesetVersion || 'forensic-rules-v1',
        modelId: runMetadata.modelId,
        factors: {
          coverage,
          signalQuality,
          corroboration,
          modelCertainty: modelCertaintyValue,
        },
        factorInputs,
      });
    };

    return {
      documents: {
        ...computed.documents,
        confidenceDetails: confidenceFor(
          'documents',
          computed.documents.count,
          computed.documents.coverage,
          computed.documents.signalQuality,
          computed.documents.corroboration,
          computed.documents.modelCertainty,
          {
            totalEvidenceCount: evidence.length,
            documentCount,
            timelineCount: timelineEvents.length,
          },
        ),
      },
      entities: {
        ...computed.entities,
        confidenceDetails: confidenceFor(
          'entities',
          computed.entities.count,
          computed.entities.coverage,
          computed.entities.signalQuality,
          computed.entities.corroboration,
          computed.entities.modelCertainty,
          {
            entityCount: networkData.entities.length,
            relationshipCount: networkData.relationships.length,
          },
        ),
      },
      financial: {
        ...computed.financial,
        confidenceDetails: confidenceFor(
          'financial',
          computed.financial.count,
          computed.financial.coverage,
          computed.financial.signalQuality,
          computed.financial.corroboration,
          computed.financial.modelCertainty,
          {
            financialCount,
            verifiedFinancialCount: evidence.filter((e) => (e.authenticityScore || 0) > 60).length,
          },
        ),
      },
      correlation: {
        ...computed.correlation,
        confidenceDetails: confidenceFor(
          'correlation',
          computed.correlation.count,
          computed.correlation.coverage,
          computed.correlation.signalQuality,
          computed.correlation.corroboration,
          computed.correlation.modelCertainty,
          {
            timelineEventCount: timelineEvents.length,
            linkedTimelineEvents: timelineEvents.filter((e) => (e.documents?.length || 0) > 0)
              .length,
          },
        ),
      },
      reports: {
        ...computed.reports,
        confidenceDetails: confidenceFor(
          'reports',
          computed.reports.count,
          computed.reports.coverage,
          computed.reports.signalQuality,
          computed.reports.corroboration,
          computed.reports.modelCertainty,
          {
            reportInputEvidenceCount: evidence.length,
            reportInputTimelineCount: timelineEvents.length,
          },
        ),
      },
    };
  };

  const stats = getToolStats();
  const location = useLocation();
  const docIdParam = (() => {
    try {
      const p = new URLSearchParams(location.search);
      return p.get('docId') || '';
    } catch {
      return '';
    }
  })();

  const downloadBriefing = async () => {
    try {
      const response = await fetch(`/api/investigations/${investigation.id}/briefing`);
      if (!response.ok) throw new Error('Failed');
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `forensic-briefing-${investigation.id}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      addToast({ text: 'Forensic briefing exported', type: 'success' });
    } catch (_error) {
      addToast({ text: 'Failed to export briefing', type: 'error' });
    }
  };

  const getRequiredInput = (toolId: string) => {
    switch (toolId) {
      case 'documents':
        return 'Link at least 1 document evidence item.';
      case 'entities':
        return 'Link at least 2 entities or person records.';
      case 'financial':
        return 'Link at least 3 financial evidence items.';
      case 'correlation':
        return 'Add timeline events and linked evidence.';
      case 'reports':
        return 'Run at least one tool and add case notes.';
      default:
        return 'Link investigation evidence.';
    }
  };

  const resolveToolStatus = (toolId: keyof typeof stats) => {
    const stat = stats[toolId];
    if (toolRunState[toolId] === 'running') return 'Running';
    if (stat.count === 0) return 'Needs input';
    if (toolRunState[toolId] === 'complete') return 'Complete';
    return 'Not run';
  };

  const runTool = async (
    toolId: 'documents' | 'entities' | 'financial' | 'correlation' | 'reports',
  ) => {
    if ((stats as any)[toolId].count === 0) {
      addToast({ text: getRequiredInput(toolId), type: 'warning' });
      return;
    }
    setToolRunState((prev) => ({ ...prev, [toolId]: 'running' }));
    setActiveTool(toolId);
    await new Promise((resolve) => setTimeout(resolve, 250));
    setToolRunState((prev) => ({ ...prev, [toolId]: 'complete' }));
    onEvidenceUpdate(evidence);
    addToast({
      text: `${forensicTools.find((t) => t.id === toolId)?.name} ready`,
      type: 'success',
    });
  };

  return (
    <div className="min-h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Microscope className="w-6 h-6 text-red-400" />
            <div>
              <h1 className="text-xl font-semibold text-gray-100">Forensic Analysis Workspace</h1>
              <p className="text-sm text-gray-400">
                {investigation.title} - Advanced forensic tools for criminal investigation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowToolSettings(!showToolSettings)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Tools</span>
            </button>
            <button
              onClick={downloadBriefing}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Export Briefing</span>
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setShowReliabilityInfo((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700"
          >
            <Info className="w-3.5 h-3.5" />
            What does confidence mean?
          </button>
        </div>
        {showReliabilityInfo && (
          <div className="mt-3 p-3 rounded-lg border border-gray-600 bg-gray-800 text-xs text-gray-300">
            Confidence = internal scoring of completeness + evidence quality for this investigation,
            not truth.
            <div className="mt-2 text-gray-400">
              Coverage (40%) + Signal quality (25%) + Corroboration (25%) + Model certainty (10%).
              Tools with zero inputs show N/A.
            </div>
          </div>
        )}

        {/* Tool Settings */}
        {showToolSettings && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Enabled Forensic Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {forensicTools.map((tool) => (
                <label key={tool.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledTools[tool.id as keyof typeof enabledTools]}
                    onChange={() => toggleTool(tool.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">{tool.name}</span>
                  {enabledTools[tool.id as keyof typeof enabledTools] ? (
                    <Eye className="w-3 h-3 text-green-400 ml-auto" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-gray-500 ml-auto" />
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Collapsible Sidebar */}
        <div
          className={`${toolsCollapsed ? 'w-16' : 'w-full md:w-80'} bg-gray-800 border-b md:border-b-0 md:border-r border-gray-700 transition-all duration-300 overflow-x-hidden`}
        >
          {/* Tool Selection */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-lg font-semibold text-gray-100 ${toolsCollapsed ? 'hidden' : ''}`}
              >
                Forensic Tools
              </h2>
              <button
                onClick={() => setToolsCollapsed(!toolsCollapsed)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700"
                title={toolsCollapsed ? 'Expand tools' : 'Collapse tools'}
              >
                {toolsCollapsed ? (
                  <ArrowRight className="w-5 h-5" />
                ) : (
                  <ArrowRight className="w-5 h-5 rotate-180" />
                )}
              </button>
            </div>
            <div className="space-y-2">
              {enabledToolsList.map((tool) => {
                const Icon = tool.icon;
                const toolStats = stats[tool.id as keyof typeof stats];
                return (
                  <div key={tool.id} className="relative group">
                    <button
                      onClick={() => setActiveTool(tool.id as any)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        activeTool === tool.id
                          ? 'bg-red-900 border border-red-600'
                          : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                      } ${toolsCollapsed ? 'p-3 flex items-center justify-center' : ''}`}
                      title={toolsCollapsed ? `${tool.name}: ${tool.description}` : ''}
                    >
                      <div
                        className={`flex items-center ${toolsCollapsed ? 'justify-center' : 'gap-3 mb-2'}`}
                      >
                        <Icon className="w-5 h-5 text-red-400" />
                        {!toolsCollapsed && (
                          <span className="font-medium text-gray-100">{tool.name}</span>
                        )}
                      </div>
                      {!toolsCollapsed && (
                        <>
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2 break-words">
                            {tool.description}
                          </p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">
                              {toolStats.count.toLocaleString()} items
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                toolStats.confidenceDetails.finalScore === null
                                  ? 'bg-gray-700 text-gray-200'
                                  : toolStats.confidenceDetails.finalScore >= 90
                                    ? 'bg-green-900 text-green-200'
                                    : toolStats.confidenceDetails.finalScore >= 80
                                      ? 'bg-yellow-900 text-yellow-200'
                                      : 'bg-red-900 text-red-200'
                              }`}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConfidenceTool(tool.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedConfidenceTool(tool.id);
                                }
                              }}
                            >
                              {toolStats.confidenceDetails.finalScore === null
                                ? 'N/A'
                                : `${toolStats.confidenceDetails.finalScore}% confidence`}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-gray-400">
                              {resolveToolStatus(tool.id as keyof typeof stats)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runTool(tool.id as any);
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-gray-600 hover:bg-gray-500 text-gray-100"
                              >
                                Run tool
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTool(tool.id as any);
                                }}
                                className="px-2 py-1 text-[11px] rounded border border-gray-500 text-gray-200 hover:bg-gray-700"
                              >
                                View
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 text-[11px] text-gray-500">
                            {getRequiredInput(tool.id)}
                          </div>
                        </>
                      )}
                    </button>

                    {/* Popover summary for collapsed view */}
                    {toolsCollapsed && (
                      <div className="absolute left-full ml-2 top-0 w-64 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-10 hidden group-hover:block">
                        <h4 className="font-medium text-gray-100 mb-1">{tool.name}</h4>
                        <p className="text-xs text-gray-400 mb-2">{tool.description}</p>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">
                            {toolStats.count.toLocaleString()} items
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              toolStats.confidenceDetails.finalScore === null
                                ? 'bg-gray-700 text-gray-200'
                                : toolStats.confidenceDetails.finalScore >= 90
                                  ? 'bg-green-900 text-green-200'
                                  : toolStats.confidenceDetails.finalScore >= 80
                                    ? 'bg-yellow-900 text-yellow-200'
                                    : 'bg-red-900 text-red-200'
                            }`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedConfidenceTool(tool.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedConfidenceTool(tool.id);
                              }
                            }}
                          >
                            {toolStats.confidenceDetails.finalScore === null
                              ? 'N/A'
                              : `${toolStats.confidenceDetails.finalScore}% confidence`}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500">
                          {resolveToolStatus(tool.id as keyof typeof stats)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Investigation Summary */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Investigation Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    investigation.status === 'active'
                      ? 'bg-green-900 text-green-200'
                      : investigation.status === 'review'
                        ? 'bg-yellow-900 text-yellow-200'
                        : 'bg-gray-900 text-gray-200'
                  }`}
                >
                  {investigation.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Priority</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    investigation.priority === 'critical'
                      ? 'bg-red-900 text-red-200'
                      : investigation.priority === 'high'
                        ? 'bg-orange-900 text-orange-200'
                        : investigation.priority === 'medium'
                          ? 'bg-yellow-900 text-yellow-200'
                          : 'bg-green-900 text-green-200'
                  }`}
                >
                  {investigation.priority}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Evidence Items</span>
                <span className="text-gray-100">{evidence.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Timeline Events</span>
                <span className="text-gray-100">{timelineEvents.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Team Size</span>
                <span className="text-gray-100">{investigation.team.length}</span>
              </div>
            </div>

            {investigation.hypothesis && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Hypothesis</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{investigation.hypothesis}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-900">
          <div className="h-full">
            {activeTool === 'documents' && (
              <ForensicDocumentAnalyzer documentId={docIdParam || evidence[0]?.id || ''} />
            )}
            {activeTool === 'entities' && (
              <EntityRelationshipMapper
                entities={networkData.entities}
                relationships={networkData.relationships}
              />
            )}
            {activeTool === 'financial' && (
              <FinancialTransactionMapper
                investigationId={useGlobalContext ? undefined : investigation.id}
              />
            )}
            {activeTool === 'correlation' && <MultiSourceCorrelationEngine />}
            {activeTool === 'reports' && (
              <ForensicReportGenerator
                investigationId={useGlobalContext ? undefined : Number(investigation.id)}
              />
            )}
          </div>
        </div>
      </div>

      {selectedConfidenceTool && (
        <div className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 text-gray-100 max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Confidence details</h3>
                <p className="text-xs text-gray-400">
                  {forensicTools.find((t) => t.id === selectedConfidenceTool)?.name}
                </p>
              </div>
              <CloseButton
                onClick={() => setSelectedConfidenceTool(null)}
                size="sm"
                label="Close confidence details"
                className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
              />
            </div>
            {(() => {
              const details = (stats as any)[selectedConfidenceTool]?.confidenceDetails as
                | ConfidenceResult
                | undefined;
              if (!details) return null;
              return (
                <div className="p-4 space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded border border-gray-700 bg-gray-800">
                      <p className="text-xs text-gray-400">Final score</p>
                      <p className="text-xl font-semibold">
                        {details.finalScore === null ? 'N/A' : `${details.finalScore}%`}
                      </p>
                    </div>
                    <div className="p-3 rounded border border-gray-700 bg-gray-800">
                      <p className="text-xs text-gray-400">Algorithm</p>
                      <p>{details.algorithm}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded border border-gray-700 bg-gray-800">
                    <p className="text-xs text-gray-400 mb-2">Weight breakdown</p>
                    <p>
                      Coverage 40% / Signal quality 25% / Corroboration 25% / Model certainty 10%
                    </p>
                  </div>
                  <div className="p-3 rounded border border-gray-700 bg-gray-800">
                    <p className="text-xs text-gray-400 mb-2">Raw factors</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Coverage: {details.factors.coverage ?? 'N/A'}</div>
                      <div>Signal quality: {details.factors.signalQuality ?? 'N/A'}</div>
                      <div>Corroboration: {details.factors.corroboration ?? 'N/A'}</div>
                      <div>Model certainty: {details.factors.modelCertainty ?? 'N/A'}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded border border-gray-700 bg-gray-800">
                    <p className="text-xs text-gray-400 mb-2">Per-factor inputs</p>
                    <pre className="text-xs whitespace-pre-wrap break-words text-gray-300">
                      {JSON.stringify(details.factorInputs, null, 2)}
                    </pre>
                  </div>
                  <div className="p-3 rounded border border-gray-700 bg-gray-800">
                    <p className="text-xs text-gray-400 mb-2">Missing inputs</p>
                    {details.missingInputs.length > 0 ? (
                      <ul className="list-disc pl-5 text-xs text-amber-200">
                        {details.missingInputs.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-200">No missing inputs.</p>
                    )}
                  </div>
                  <div className="p-3 rounded border border-gray-700 bg-gray-800 text-xs space-y-1">
                    <p>
                      Determinism:{' '}
                      {details.determinism.deterministic ? 'deterministic' : 'non-deterministic'}
                    </p>
                    <p>{details.determinism.reason}</p>
                    <p>ingest_run_id: {details.metadata.ingestRunId || 'N/A'}</p>
                    <p>rulesetVersion: {details.metadata.rulesetVersion || 'N/A'}</p>
                    <p>modelId: {details.metadata.modelId || 'N/A'}</p>
                    <p>computed_at: {details.metadata.computedAt}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ForensicAnalysisWorkspace;
