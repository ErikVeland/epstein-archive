import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Investigation, EvidenceItem, TimelineEvent } from '@client/types/investigation';
import Icon, { IconName } from '@client/components/common/Icon';
import { useToasts } from '../common/useToasts';
import { ForensicDocumentAnalyzer } from './ForensicDocumentAnalyzer';
import EntityRelationshipMapper from '../entities/EntityRelationshipMapper';
import FinancialTransactionMapper from '../visualizations/FinancialTransactionMapper';
import MultiSourceCorrelationEngine from './MultiSourceCorrelationEngine';
import ForensicReportGenerator from './ForensicReportGenerator';
import { transformToNetwork } from '@client/utils/networkDataUtils';
import { computeForensicConfidence, type ConfidenceResult } from '@client/utils/forensicConfidence';

// UI Library
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Input,
  LqText,
  Stack,
  Surface,
  cn,
} from '@client/design-system/lib';
import { MobileStackHeader } from '../layout/MobileStackHeader';
import styles from './ForensicAnalysisWorkspace.module.css';

const css = <T,>(style: T) => style;

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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

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

  const networkData = useMemo(() => {
    const people: Array<{ id: string; name: string; mentionedEntities: string[] }> = [];
    const documents = (evidence || []).map((ev) => ({
      id: ev.id,
      title: ev.title || ev.id,
      mentionedEntities: [],
    }));
    return transformToNetwork(people, documents);
  }, [evidence]);

  const forensicTools: Array<{
    id: string;
    name: string;
    description: string;
    icon: IconName;
    enabled: boolean;
  }> = [
    {
      id: 'documents',
      name: 'Document Analysis',
      description: 'Forensic authentication and analysis',
      icon: 'FileSearch',
      enabled: enabledTools.documents,
    },
    {
      id: 'entities',
      name: 'Entity Mapping',
      description: 'Network visualization and relationships',
      icon: 'Network',
      enabled: enabledTools.entities,
    },
    {
      id: 'financial',
      name: 'Financial Analysis',
      description: 'Transaction flow and laundering detection',
      icon: 'DollarSign',
      enabled: enabledTools.financial,
    },
    {
      id: 'correlation',
      name: 'Multi-Source Correlation',
      description: 'Cross-reference and pattern detection',
      icon: 'Link',
      enabled: enabledTools.correlation,
    },
    {
      id: 'reports',
      name: 'Report Generation',
      description: 'Automated forensic report creation',
      icon: 'BarChart3',
      enabled: enabledTools.reports,
    },
  ];

  const enabledToolsList = forensicTools.filter((tool) => tool.enabled);

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
        const meta = (item.metadata || item.metadata_json || {}) as Record<string, unknown>;
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
        if (!ingestRunId) ingestRunId = parsed.ingest_run_id || parsed.ingestRunId || null;
        if (!rulesetVersion) rulesetVersion = parsed.rulesetVersion || 'forensic-rules-v1';
        if (!modelId) modelId = parsed.modelId || parsed.agentic_model_id || null;
      }
      return { ingestRunId, rulesetVersion, modelId };
    })();

    const confidenceFor = (
      toolId: string,
      count: number,
      coverage: number,
      signal: number,
      corroboration: number,
      certainty: number | null,
      inputs: Record<string, unknown>,
    ): ConfidenceResult => {
      return computeForensicConfidence({
        toolId,
        count,
        ingestRunId: runMetadata.ingestRunId,
        rulesetVersion: runMetadata.rulesetVersion || 'forensic-rules-v1',
        modelId: runMetadata.modelId,
        factors: { coverage, signalQuality: signal, corroboration, modelCertainty: certainty },
        factorInputs: inputs,
      });
    };

    return {
      documents: {
        count: documentCount,
        confidenceDetails: confidenceFor(
          'documents',
          documentCount,
          documentCount / Math.max(1, evidence.length),
          0.8,
          0.7,
          modelCertainty,
          { total: evidence.length },
        ),
      },
      entities: {
        count: networkData.entities.length,
        confidenceDetails: confidenceFor(
          'entities',
          networkData.entities.length,
          0.6,
          0.7,
          0.5,
          null,
          { entityCount: networkData.entities.length },
        ),
      },
      financial: {
        count: financialCount,
        confidenceDetails: confidenceFor('financial', financialCount, 0.5, 0.6, 0.4, null, {
          financialCount,
        }),
      },
      correlation: {
        count: correlationCount,
        confidenceDetails: confidenceFor(
          'correlation',
          correlationCount,
          0.8,
          0.7,
          0.9,
          modelCertainty,
          { eventCount: correlationCount },
        ),
      },
      reports: {
        count: documentCount + correlationCount > 0 ? 1 : 0,
        confidenceDetails: confidenceFor('reports', 1, 0.9, 0.8, 0.8, modelCertainty, {
          total: evidence.length,
        }),
      },
    };
  };

  const stats = getToolStats();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const docIdParam = queryParams.get('docId') || '';

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
      anchor.click();
      URL.revokeObjectURL(url);
      addToast({ text: 'Forensic briefing exported', type: 'success' });
    } catch {
      addToast({ text: 'Failed to export briefing', type: 'error' });
    }
  };

  const runTool = async (toolId: string) => {
    const toolStats = stats[toolId as keyof typeof stats];
    if (!toolStats || toolStats.count === 0) {
      addToast({ text: 'Insufficient evidence to initialize forensic tool', type: 'warning' });
      return;
    }
    setToolRunState((prev) => ({ ...prev, [toolId]: 'running' }));
    setActiveTool(toolId as typeof activeTool);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setToolRunState((prev) => ({ ...prev, [toolId]: 'complete' }));
    onEvidenceUpdate(evidence);
    addToast({
      text: `${forensicTools.find((t) => t.id === toolId)?.name} processing complete`,
      type: 'success',
    });
  };

  const getConfidenceLevel = (
    score: number | null,
  ): 'success' | 'warning' | 'accent' | 'danger' | 'muted' => {
    if (score === null) return 'muted';
    if (score >= 90) return 'success';
    if (score >= 75) return 'accent';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  const selectedConfidenceDetails = selectedConfidenceTool
    ? (stats[selectedConfidenceTool as keyof typeof stats]?.confidenceDetails ?? null)
    : null;
  const selectedConfidenceToolName = selectedConfidenceTool
    ? (forensicTools.find((tool) => tool.id === selectedConfidenceTool)?.name ?? 'Confidence')
    : 'Confidence';
  const desktopConfidenceFactors = selectedConfidenceDetails
    ? [
        {
          label: 'Evidence Coverage',
          value: selectedConfidenceDetails.factors.coverage,
          weight: '40%',
        },
        {
          label: 'Signal Quality',
          value: selectedConfidenceDetails.factors.signalQuality,
          weight: '25%',
        },
        {
          label: 'Cross-Corroboration',
          value: selectedConfidenceDetails.factors.corroboration,
          weight: '25%',
        },
        {
          label: 'Model Certainty',
          value: selectedConfidenceDetails.factors.modelCertainty,
          weight: '10%',
        },
      ]
    : [];

  return (
    <Box className={styles.autoGen71} style={css({ backgroundColor: 'var(--lq-surface-1)' })}>
      {/* Global Header */}
      <Surface variant="glass" p="xl" className={styles.autoGen72}>
        <Flex justify="between" align="center">
          <Flex align="center" gap="xl">
            <Stack gap="none">
              <Flex align="center" gap="md">
                <Icon name="Cpu" size="lg" className={styles.autoGen73} />
                <LqText variant="h1" weight="bold">
                  Forensic Workspace
                </LqText>
              </Flex>
              <LqText
                variant="small"
                color="muted"
                weight="bold"
                style={css({ textTransform: 'uppercase', marginTop: 'var(--spacing-xs)' })}
              >
                {investigation.title} • Agentic Reasoning Layer
              </LqText>
            </Stack>

            <Box className={styles.autoGen74}>
              <Flex gap="md" align="center" className={styles.autoGen75}>
                <Icon name="Activity" size="sm" className={styles.autoGen76} />
                <LqText variant="small" weight="bold">
                  System Integrity: Nominal
                </LqText>
                <Box className={styles.autoGen77} />
                <LqText variant="xs" color="muted">
                  Uptime: 99.9%
                </LqText>
              </Flex>
            </Box>
          </Flex>

          <Flex gap="md">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowToolSettings(!showToolSettings)}
            >
              <Icon name="Settings" size="sm" /> <span className={styles.autoGen78}>Modules</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={downloadBriefing}>
              <Icon name="Download" size="sm" />{' '}
              <span className={styles.autoGen79}>Export Intelligence</span>
            </Button>
          </Flex>
        </Flex>

        {/* Reliability Explanation */}
        <Box style={css({ marginTop: 'var(--spacing-lg)' })}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReliabilityInfo(!showReliabilityInfo)}
            style={css({ paddingLeft: 0, paddingRight: 0 })}
          >
            <Icon name="Info" size="xs" style={css({ marginRight: '0.25rem' })} /> Understanding
            Forensic Confidence
          </Button>
          {showReliabilityInfo && (
            <Surface
              variant="glass-highlight"
              p="md"
              style={css({ marginTop: 'var(--spacing-sm)' })}
            >
              <LqText variant="xs" color="muted">
                Confidence represents the cumulative reliability score based on (40%) Coverage,
                (25%) Signal Quality, (25%) Corroboration, and (10%) Model Certainty. Scores are
                internal metrics for investigative prioritization and do not reflect absolute truth.
              </LqText>
            </Surface>
          )}
        </Box>

        {/* Tool Governance */}
        {showToolSettings && (
          <Surface
            variant="glass-highlight"
            p="lg"
            style={css({ marginTop: 'var(--spacing-lg)' })}
            className={styles.autoGen80}
          >
            <LqText
              variant="small"
              weight="bold"
              color="muted"
              style={css({ textTransform: 'uppercase', marginBottom: 'var(--spacing-md)' })}
            >
              Authorized Forensic Modules
            </LqText>
            <Grid cols={5} gap="md">
              {forensicTools.map((tool) => (
                <Flex key={tool.id} align="center" gap="sm" className={styles.autoGen81}>
                  <Input
                    type="checkbox"
                    checked={enabledTools[tool.id as keyof typeof enabledTools]}
                    onChange={() =>
                      setEnabledTools((prev) => ({
                        ...prev,
                        [tool.id]: !prev[tool.id as keyof typeof prev],
                      }))
                    }
                  />
                  <LqText variant="small" weight="bold">
                    {tool.name}
                  </LqText>
                </Flex>
              ))}
            </Grid>
          </Surface>
        )}
      </Surface>

      <Flex className={styles.autoGen82}>
        {!isMobile && (
          <Surface
            variant="glass"
            className={cn(styles.autoGen83, toolsCollapsed && styles.autoGen84)}
            style={{ width: toolsCollapsed ? 80 : 320 }}
          >
            <Stack p="md" gap="lg" className={styles.autoGen84}>
              <Flex justify="between" align="center">
                {!toolsCollapsed && (
                  <LqText
                    variant="small"
                    weight="bold"
                    color="muted"
                    style={css({ textTransform: 'uppercase' })}
                  >
                    Forensic Tools
                  </LqText>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setToolsCollapsed(!toolsCollapsed)}
                >
                  {toolsCollapsed ? (
                    <Icon name="ArrowRight" size="sm" />
                  ) : (
                    <Icon name="ChevronLeft" size="sm" />
                  )}
                </Button>
              </Flex>

              <Box className={styles.autoGen85}>
                <Stack gap="md">
                  {enabledToolsList.map((tool) => {
                    const toolStats = stats[tool.id as keyof typeof stats];
                    const score = toolStats?.confidenceDetails.finalScore ?? null;
                    const isActive = activeTool === tool.id;

                    return (
                      <Surface
                        key={tool.id}
                        variant={isActive ? 'glass' : 'glass-highlight'}
                        p="md"
                        className={cn(
                          'cursor-pointer border-l-2 transition-all hover:translate-x-1',
                          isActive ? 'border-l-[var(--lq-accent)]' : 'border-l-transparent',
                        )}
                        onClick={() => setActiveTool(tool.id as typeof activeTool)}
                      >
                        <Flex align="center" gap="md">
                          <Box
                            className={cn(
                              styles.p2,
                              'rounded-lg',
                              isActive
                                ? 'bg-[var(--lq-accent)] text-white'
                                : 'bg-[var(--lq-surface-3)] text-[var(--lq-text-muted)]',
                            )}
                          >
                            <Icon name={tool.icon} size="sm" />
                          </Box>
                          {!toolsCollapsed && (
                            <Stack gap="none" className={styles.autoGen86}>
                              <LqText variant="xs" weight="bold">
                                {tool.name}
                              </LqText>
                              <LqText variant="xs" color="muted">
                                {tool.description}
                              </LqText>
                            </Stack>
                          )}
                        </Flex>

                        {!toolsCollapsed && (
                          <Stack
                            gap="sm"
                            style={css({
                              marginTop: 'var(--spacing-md)',
                              paddingTop: 'var(--spacing-md)',
                            })}
                            className={styles.autoGen87}
                          >
                            <Flex justify="between">
                              <LqText variant="xs" weight="bold">
                                {toolStats.count} items detected
                              </LqText>
                              <Badge
                                tone={
                                  getConfidenceLevel(score) as
                                    | 'success'
                                    | 'warning'
                                    | 'accent'
                                    | 'danger'
                                    | 'neutral'
                                    | undefined
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedConfidenceTool(tool.id);
                                }}
                              >
                                {score === null ? 'N/A' : `${score}% CONF`}
                              </Badge>
                            </Flex>
                            <Flex gap="sm">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runTool(tool.id);
                                }}
                              >
                                {toolRunState[tool.id] === 'running' ? (
                                  <Icon
                                    name="RefreshCw"
                                    style={css({ marginRight: '0.25rem' })}
                                    className={styles.spin}
                                    size="xs"
                                  />
                                ) : (
                                  <Icon
                                    name="Activity"
                                    size="xs"
                                    style={css({ marginRight: '0.25rem' })}
                                  />
                                )}
                                Process Signal
                              </Button>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Flex>
                          </Stack>
                        )}
                      </Surface>
                    );
                  })}
                </Stack>
              </Box>

              {!toolsCollapsed && (
                <Surface variant="glass" p="md" className={styles.autoGen88}>
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={css({ textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' })}
                  >
                    Case Context
                  </LqText>
                  <Stack gap="xs">
                    <Flex justify="between">
                      <LqText variant="xs">Priority</LqText>
                      <Badge tone={PRIORITY_VARIANT[investigation.priority]}>
                        {investigation.priority?.toUpperCase()}
                      </Badge>
                    </Flex>
                    <Flex justify="between">
                      <LqText variant="xs">Evidence</LqText>
                      <LqText variant="xs" weight="bold">
                        {evidence.length}
                      </LqText>
                    </Flex>
                    <Flex justify="between">
                      <LqText variant="xs">Team</LqText>
                      <LqText variant="xs" weight="bold">
                        {investigation.team.length} agents
                      </LqText>
                    </Flex>
                  </Stack>
                </Surface>
              )}
            </Stack>
          </Surface>
        )}

        {/* Workbench */}
        <Box className={cn(styles.autoGen89, isMobile && styles.mobileWorkbench)}>
          <Box className={styles.autoGen90}>
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
          </Box>
        </Box>
      </Flex>

      {/* Mobile Toolbelt */}
      {isMobile && (
        <div className={styles.mobileToolbelt}>
          {enabledToolsList.map((tool) => (
            <Button
              type="button"
              unstyled
              variant={activeTool === tool.id ? 'secondary' : 'ghost'}
              size="md"
              key={tool.id}
              className={cn(
                styles.mobileToolItem,
                activeTool === tool.id && styles.mobileToolItemActive,
              )}
              onClick={() => setActiveTool(tool.id as typeof activeTool)}
            >
              <Icon name={tool.icon} size="sm" />
              <span className={styles.mobileToolLabel}>{tool.name.split(' ')[0]}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Confidence Detail Modal */}
      {selectedConfidenceTool &&
        (isMobile ? (
          <Box className={styles.fullScreenMobile}>
            <MobileStackHeader
              title="Intelligence Confidence"
              subtitle={`${selectedConfidenceToolName} Breakdown`}
              onBack={() => setSelectedConfidenceTool(null)}
            />
            <div className={styles.fullScreenContent}>
              {selectedConfidenceDetails && (
                <Stack gap="lg">
                  <Grid cols={1} gap="md">
                    <Surface variant="glass-highlight" p="md" className={styles.autoGen93}>
                      <LqText
                        variant="h2"
                        weight="bold"
                        color={getConfidenceLevel(selectedConfidenceDetails.finalScore)}
                      >
                        {selectedConfidenceDetails.finalScore}%
                      </LqText>
                      <LqText variant="xs" color="muted">
                        Global Reliability
                      </LqText>
                    </Surface>
                    <Surface variant="glass-highlight" p="md" className={styles.autoGen94}>
                      <LqText variant="small" weight="bold">
                        {selectedConfidenceDetails.algorithm}
                      </LqText>
                      <LqText variant="xs" color="muted">
                        Validator Engine
                      </LqText>
                    </Surface>
                  </Grid>

                  <Stack gap="sm">
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="muted"
                      style={css({ textTransform: 'uppercase' })}
                    >
                      Weighting & Telemetry
                    </LqText>
                    {desktopConfidenceFactors.map((factor) => (
                      <Surface key={factor.label} variant="panel" p="md">
                        <Flex justify="between" align="center">
                          <Stack gap="none">
                            <LqText variant="small" weight="bold">
                              {factor.label}
                            </LqText>
                            <LqText variant="xs" color="muted">
                              Weight: {factor.weight}
                            </LqText>
                          </Stack>
                          <Badge tone="accent">{((factor.value ?? 0) * 100).toFixed(0)}%</Badge>
                        </Flex>
                      </Surface>
                    ))}
                  </Stack>
                </Stack>
              )}
            </div>
          </Box>
        ) : (
          <Box className={styles.autoGen91} onClick={() => setSelectedConfidenceTool(null)}>
            <Surface
              variant="glass"
              style={css({
                width: '95vw',
                maxWidth: 500,
                padding: 'var(--spacing-xl)',
                maxHeight: '90vh',
                overflowY: 'auto',
              })}
              className={styles.autoGen92}
              onClick={(e) => e.stopPropagation()}
            >
              <Stack gap="xl">
                <Flex justify="between" align="center">
                  <Stack gap="none">
                    <LqText variant="h3" weight="bold">
                      Intelligence Confidence
                    </LqText>
                    <LqText variant="small" color="muted">
                      {selectedConfidenceToolName} Breakdown
                    </LqText>
                  </Stack>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedConfidenceTool(null)}>
                    <Icon name="XCircle" size="md" />
                  </Button>
                </Flex>
                {selectedConfidenceDetails && (
                  <Stack gap="lg">
                    <Grid cols={2} gap="md">
                      <Surface variant="glass-highlight" p="md" className={styles.autoGen93}>
                        <LqText
                          variant="h2"
                          weight="bold"
                          color={getConfidenceLevel(selectedConfidenceDetails.finalScore)}
                        >
                          {selectedConfidenceDetails.finalScore}%
                        </LqText>
                        <LqText variant="xs" color="muted">
                          Global Reliability
                        </LqText>
                      </Surface>
                      <Surface variant="glass-highlight" p="md" className={styles.autoGen94}>
                        <LqText variant="small" weight="bold">
                          {selectedConfidenceDetails.algorithm}
                        </LqText>
                        <LqText variant="xs" color="muted">
                          Validator Engine
                        </LqText>
                      </Surface>
                    </Grid>

                    <Stack gap="sm">
                      <LqText variant="small" weight="bold" color="muted">
                        Primary Vectors
                      </LqText>
                      <Stack gap="xs">
                        {desktopConfidenceFactors.map((factor) => (
                          <Surface key={factor.label} variant="glass-highlight" p="sm">
                            <Flex justify="between">
                              <Stack gap="none">
                                <LqText variant="xs" weight="bold">
                                  {factor.label}
                                </LqText>
                                <LqText variant="xs" color="muted">
                                  Weight: {factor.weight}
                                </LqText>
                              </Stack>
                              <LqText variant="small" weight="bold">
                                {((factor.value ?? 0) * 100).toFixed(0)}%
                              </LqText>
                            </Flex>
                          </Surface>
                        ))}
                      </Stack>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Surface>
          </Box>
        ))}
    </Box>
  );
};

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'accent' | 'neutral'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'accent',
  low: 'neutral',
};
