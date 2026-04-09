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

import styles from './ForensicAnalysisWorkspace.module.css';

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
    const people: never[] = [];
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
        const meta = (item.metadata || item.metadata_json || {}) as
          | Record<string, unknown>
          | string;
        const parsed =
          typeof meta === 'string'
            ? (() => {
                try {
                  return JSON.parse(meta) as Record<string, unknown>;
                } catch {
                  return {};
                }
              })()
            : meta;
        const parsedMeta = parsed as Record<string, unknown>;
        if (!ingestRunId)
          ingestRunId =
            (parsedMeta.ingest_run_id as string | null) ||
            (parsedMeta.ingestRunId as string | null) ||
            null;
        if (!rulesetVersion)
          rulesetVersion = (parsedMeta.rulesetVersion as string | null) || 'forensic-rules-v1';
        if (!modelId)
          modelId =
            (parsedMeta.modelId as string | null) ||
            (parsedMeta.agentic_model_id as string | null) ||
            null;
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
    if (stats[toolId].count === 0) {
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
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIdentity}>
            <Microscope className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>Forensic Analysis Workspace</h1>
              <p className={styles.headerSubtitle}>
                {investigation.title} - Advanced forensic tools for criminal investigation
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={() => setShowToolSettings(!showToolSettings)}
              className={styles.headerButton}
            >
              <Settings className="w-4 h-4" />
              <span>Tools</span>
            </button>
            <button onClick={downloadBriefing} className={styles.exportButton}>
              <Download className="w-4 h-4" />
              <span>Export Briefing</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReliabilityInfo((prev) => !prev)}
            className={styles.reliabilityToggle}
          >
            <Info className="w-3.5 h-3.5" />
            What does confidence mean?
          </button>
        </div>
        {showReliabilityInfo && (
          <div className={styles.reliabilityInfo}>
            Confidence = internal scoring of completeness + evidence quality for this investigation,
            not truth.
            <div className={styles.reliabilityDetails}>
              Coverage (40%) + Signal quality (25%) + Corroboration (25%) + Model certainty (10%).
              Tools with zero inputs show N/A.
            </div>
          </div>
        )}

        {/* Tool Settings */}
        {showToolSettings && (
          <div className={styles.toolSettings}>
            <h3 className={styles.toolSettingsTitle}>Enabled Forensic Tools</h3>
            <div className={styles.toolSettingsGrid}>
              {forensicTools.map((tool) => (
                <label key={tool.id} className={styles.toolCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={enabledTools[tool.id as keyof typeof enabledTools]}
                    onChange={() => toggleTool(tool.id)}
                    className={styles.toolCheckbox}
                  />
                  <span>{tool.name}</span>
                  {enabledTools[tool.id as keyof typeof enabledTools] ? (
                    <Eye className={`w-3 h-3 text-green-400 ${styles.toolStatusIcon}`} />
                  ) : (
                    <EyeOff
                      className={`w-3 h-3 text-[var(--text-muted)] ${styles.toolStatusIcon}`}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`${styles.layout} ${toolsCollapsed ? styles.sidebarCollapsed : ''}`}>
        {/* Collapsible Sidebar */}
        <aside className={`${styles.sidebar} ${toolsCollapsed ? styles.sidebarCollapsed : ''}`}>
          {/* Tool Selection */}
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitleRow}>
              {!toolsCollapsed && <h2 className={styles.sidebarTitle}>Forensic Tools</h2>}
              <button
                onClick={() => setToolsCollapsed(!toolsCollapsed)}
                className={styles.collapseButton}
                title={toolsCollapsed ? 'Expand tools' : 'Collapse tools'}
              >
                {toolsCollapsed ? (
                  <ArrowRight className="w-5 h-5" />
                ) : (
                  <ArrowRight className="w-5 h-5 rotate-180" />
                )}
              </button>
            </div>
            <div className={styles.toolList}>
              {enabledToolsList.map((tool) => {
                const Icon = tool.icon;
                const toolStats = stats[tool.id as keyof typeof stats];
                const finalScore = toolStats.confidenceDetails.finalScore;

                return (
                  <div key={tool.id} className="relative group">
                    <button
                      onClick={() =>
                        setActiveTool(
                          tool.id as
                            | 'documents'
                            | 'entities'
                            | 'financial'
                            | 'correlation'
                            | 'reports',
                        )
                      }
                      className={`${styles.toolCard} ${activeTool === tool.id ? styles.toolCardActive : ''}`}
                      title={toolsCollapsed ? `${tool.name}: ${tool.description}` : ''}
                    >
                      <div className={styles.toolCardHeader}>
                        <Icon className={styles.toolIcon} />
                        {!toolsCollapsed && <span className={styles.toolName}>{tool.name}</span>}
                      </div>

                      {!toolsCollapsed && (
                        <>
                          <p className={styles.toolDescription}>{tool.description}</p>
                          <div className={styles.toolStats}>
                            <span className={styles.itemCount}>
                              {toolStats.count.toLocaleString()} items
                            </span>
                            <button
                              type="button"
                              className={`${styles.confidenceBadge} ${
                                finalScore === null
                                  ? styles.confidenceNA
                                  : finalScore >= 90
                                    ? styles.confidenceHigh
                                    : finalScore >= 80
                                      ? styles.confidenceMedium
                                      : styles.confidenceLow
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConfidenceTool(tool.id);
                              }}
                            >
                              {finalScore === null ? 'N/A' : `${finalScore}% confidence`}
                            </button>
                          </div>
                          <div className={styles.toolFooter}>
                            <span className={styles.toolStatus}>
                              {resolveToolStatus(tool.id as keyof typeof stats)}
                            </span>
                            <div className={styles.toolActionRow}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runTool(
                                    tool.id as
                                      | 'documents'
                                      | 'entities'
                                      | 'financial'
                                      | 'correlation'
                                      | 'reports',
                                  );
                                }}
                                className={styles.toolActionBtn}
                              >
                                Run tool
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTool(
                                    tool.id as
                                      | 'documents'
                                      | 'entities'
                                      | 'financial'
                                      | 'correlation'
                                      | 'reports',
                                  );
                                }}
                                className={`${styles.toolActionBtn} ${styles.toolActionBtnBorder}`}
                              >
                                View
                              </button>
                            </div>
                          </div>
                          <div className={styles.requiredInputHint}>
                            {getRequiredInput(tool.id)}
                          </div>
                        </>
                      )}
                    </button>

                    {/* Popover summary for collapsed view */}
                    {toolsCollapsed && (
                      <div className={styles.collapsedPopover}>
                        <h4 className="font-medium text-[var(--text-primary)] mb-1">{tool.name}</h4>
                        <p className="text-xs text-[var(--text-muted)] mb-2">{tool.description}</p>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-muted)]">
                            {toolStats.count.toLocaleString()} items
                          </span>
                          <button
                            type="button"
                            className={`${styles.confidenceBadge} ${
                              finalScore === null
                                ? styles.confidenceNA
                                : finalScore >= 90
                                  ? styles.confidenceHigh
                                  : finalScore >= 80
                                    ? styles.confidenceMedium
                                    : styles.confidenceLow
                            }`}
                            onClick={() => setSelectedConfidenceTool(tool.id)}
                          >
                            {finalScore === null ? 'N/A' : `${finalScore}% confidence`}
                          </button>
                        </div>
                        <div className="mt-2 text-[11px] text-[var(--text-muted)]">
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
          {!toolsCollapsed && (
            <div className={styles.summarySection}>
              <h3 className={styles.summaryTitle}>Investigation Summary</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Status</span>
                  <span
                    className={`${styles.statusBadge} ${
                      investigation.status === 'active'
                        ? styles.statusActive
                        : investigation.status === 'review'
                          ? styles.statusReview
                          : styles.statusDefault
                    }`}
                  >
                    {investigation.status}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Priority</span>
                  <span
                    className={`${styles.priorityBadge} ${
                      investigation.priority === 'critical'
                        ? styles.priorityCritical
                        : investigation.priority === 'high'
                          ? styles.priorityHigh
                          : investigation.priority === 'medium'
                            ? styles.priorityMedium
                            : styles.priorityLow
                    }`}
                  >
                    {investigation.priority}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Evidence Items</span>
                  <span className={styles.summaryValue}>{evidence.length}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Timeline Events</span>
                  <span className={styles.summaryValue}>{timelineEvents.length}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Team Size</span>
                  <span className={styles.summaryValue}>{investigation.team.length}</span>
                </div>
              </div>

              {investigation.hypothesis && (
                <div className={styles.hypothesisBox}>
                  <h4 className={styles.hypothesisTitle}>Hypothesis</h4>
                  <p className={styles.hypothesisText}>{investigation.hypothesis}</p>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          <div className={styles.toolContainer}>
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
        </main>
      </div>

      {selectedConfidenceTool && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Confidence details</h3>
                <p className={styles.modalSubtitle}>
                  {forensicTools.find((t) => t.id === selectedConfidenceTool)?.name}
                </p>
              </div>
              <CloseButton
                onClick={() => setSelectedConfidenceTool(null)}
                size="sm"
                label="Close confidence details"
                className="bg-transparent border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]"
              />
            </div>
            {(() => {
              const details = (stats as Record<string, { confidenceDetails?: ConfidenceResult }>)[
                selectedConfidenceTool
              ]?.confidenceDetails;
              if (!details) return null;
              return (
                <div className={styles.modalBody}>
                  <div className={styles.confidenceDetailsGrid}>
                    <div className={styles.detailBox}>
                      <p className={styles.detailLabel}>Final score</p>
                      <p className={styles.detailValueLarge}>
                        {details.finalScore === null ? 'N/A' : `${details.finalScore}%`}
                      </p>
                    </div>
                    <div className={styles.detailBox}>
                      <p className={styles.detailLabel}>Algorithm</p>
                      <p>{details.algorithm}</p>
                    </div>
                  </div>
                  <div className={styles.weightBreakdown}>
                    <p className={styles.detailLabel + ' mb-2'}>Weight breakdown</p>
                    <p>
                      Coverage 40% / Signal quality 25% / Corroboration 25% / Model certainty 10%
                    </p>
                  </div>
                  <div className={styles.rawFactors}>
                    <p className={styles.detailLabel + ' mb-2'}>Raw factors</p>
                    <div className={styles.rawFactorsGrid}>
                      <div>Coverage: {details.factors.coverage ?? 'N/A'}</div>
                      <div>Signal quality: {details.factors.signalQuality ?? 'N/A'}</div>
                      <div>Corroboration: {details.factors.corroboration ?? 'N/A'}</div>
                      <div>Model certainty: {details.factors.modelCertainty ?? 'N/A'}</div>
                    </div>
                  </div>
                  <div className={styles.factorInputs}>
                    <p className={styles.detailLabel + ' mb-2'}>Per-factor inputs</p>
                    <pre className={styles.preformatted}>
                      {JSON.stringify(details.factorInputs, null, 2)}
                    </pre>
                  </div>
                  <div className={styles.missingInputs}>
                    <p className={styles.detailLabel + ' mb-2'}>Missing inputs</p>
                    {details.missingInputs.length > 0 ? (
                      <ul className={styles.missingList}>
                        {details.missingInputs.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.noMissingText}>No missing inputs.</p>
                    )}
                  </div>
                  <div className={styles.metadataBox}>
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
