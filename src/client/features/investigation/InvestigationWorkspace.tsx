import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@client/contexts/AuthContext';
import {
  Investigation,
  EvidenceItem,
  TimelineEvent,
  Annotation,
  Investigator,
  Hypothesis,
} from '@client/types/investigation';
import Icon from '@client/components/common/Icon';

import { ChainOfCustodyModal } from './ChainOfCustodyModal';
import type {
  NetworkNode,
  NetworkEdge,
} from '@client/components/visualizations/NetworkVisualization';
import { DocumentModal } from '@client/components/documents/DocumentModal';
import { EvidenceModal } from '@client/components/common/EvidenceModal';
import { AnimatedSegmentedControl } from '@client/components/common/AnimatedSegmentedControl';

// Hooks & Services
import { useToasts } from '@client/components/common/useToasts';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { useMediaQuery } from '@client/hooks/useResponsive';

import { CreateRelationshipModal as _CreateRelationshipModal2 } from '@client/components/entities/CreateRelationshipModal';
import { apiClient } from '@client/services/apiClient';
import {
  investigationActions,
  investigationsApi,
  normalizeEvidenceListItem,
  useCaseFolder,
  useEvidenceNavigation,
  useInvestigationList,
} from '@client/domains/investigations';
import type { InvestigationCaseEvidenceItemDto } from '@shared/dto/investigations';
import { PerformanceMonitor } from '@client/utils/performanceMonitor';
import { getCaseFolderEvidenceReturnPath } from './investigationRouteUtils';
import { trackInvestigationEvent } from '@client/utils/investigationTelemetry';

// UI Library
import {
  Badge,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Flex,
  Grid,
  LqText,
  Stack,
  Surface,
  Textarea,
  TextInput,
  cn,
} from '@client/design-system/lib';
import styles from './InvestigationWorkspace.module.css';
import { CloseButton as _CloseButton } from '@client/components/common/CloseButton';

const FinancialTransactionMapper = lazy(
  () => import('@client/components/visualizations/FinancialTransactionMapper'),
);
const InvestigationTimelineBuilder = lazy(() =>
  import('./InvestigationTimelineBuilder').then((module) => ({
    default: module.InvestigationTimelineBuilder,
  })),
);
const InvestigationExportTools = lazy(() =>
  import('./InvestigationExportTools').then((module) => ({
    default: module.InvestigationExportTools,
  })),
);
const ForensicAnalysisWorkspace = lazy(() =>
  import('./ForensicAnalysisWorkspace').then((module) => ({
    default: module.ForensicAnalysisWorkspace,
  })),
);
const DataIntegrityPanel = lazy(() =>
  import('@client/components/visualizations/DataIntegrityPanel').then((module) => ({
    default: module.DataIntegrityPanel,
  })),
);
const EvidencePacketExporter = lazy(() =>
  import('./EvidencePacketExporter').then((module) => ({ default: module.EvidencePacketExporter })),
);
const InvestigationTasksPanel = lazy(() =>
  import('./InvestigationTasksPanel').then((module) => ({
    default: module.InvestigationTasksPanel,
  })),
);
const InvestigationEvidencePanel = lazy(() =>
  import('./InvestigationEvidencePanel').then((module) => ({
    default: module.InvestigationEvidencePanel,
  })),
);
const InvestigationActivityFeed = lazy(() =>
  import('./InvestigationActivityFeed').then((module) => ({
    default: module.InvestigationActivityFeed,
  })),
);
const InvestigationCaseFolder = lazy(() => import('./InvestigationCaseFolder'));
const EvidenceNotebook = lazy(() =>
  import('./EvidenceNotebook').then((module) => ({ default: module.EvidenceNotebook })),
);
const HypothesisTestingFramework = lazy(() =>
  import('./HypothesisTestingFramework').then((module) => ({
    default: module.HypothesisTestingFramework,
  })),
);
const InvestigationTeamManagement = lazy(() =>
  import('./InvestigationTeamManagement').then((module) => ({
    default: module.InvestigationTeamManagement,
  })),
);
const InvestigationBoard = lazy(() =>
  import('./InvestigationBoard').then((module) => ({ default: module.InvestigationBoard })),
);
const InvestigationLeadsPanel = lazy(() =>
  import('./InvestigationLeadsPanel').then((module) => ({
    default: module.InvestigationLeadsPanel,
  })),
);
const SubjectDossierPanel = lazy(() =>
  import('./SubjectDossierPanel').then((module) => ({ default: module.SubjectDossierPanel })),
);
const CommunicationAnalysis = lazy(() =>
  import('./CommunicationAnalysis').then((module) => ({ default: module.CommunicationAnalysis })),
);
const IcebergIntelligence = lazy(() =>
  import('./IcebergIntelligence').then((module) => ({ default: module.IcebergIntelligence })),
);
const NetworkVisualization = lazy(() =>
  import('@client/components/visualizations/NetworkVisualization').then((module) => ({
    default: module.NetworkVisualization,
  })),
);
const MobileInvestigationShell = lazy(() =>
  import('./mobile/MobileInvestigationShell').then((module) => ({
    default: module.MobileInvestigationShell,
  })),
);

const css = <T,>(style: T) => style;

const PanelLoadingState = () => (
  <Flex align="center" justify="center" minH="12rem" role="status" aria-live="polite">
    <Icon name="Loader2" className="animate-spin" size="lg" />
    <span className="sr-only">Loading case view</span>
  </Flex>
);

// --- Type Helpers & Normalizers ---

interface RawTimelineEvent {
  id: number | string;
  title: string;
  start_date: string;
  description?: string;
  type: string;
  confidence?: number;
  entities_json?: string;
  documents_json?: string;
  created_at?: string;
  updated_at?: string;
}

const TIMELINE_EVENT_TYPES: TimelineEvent['type'][] = [
  'document',
  'meeting',
  'location',
  'communication',
  'hypothesis',
  'other',
];

const toTimelineEventType = (rawType: string): TimelineEvent['type'] => {
  const normalized = rawType.toLowerCase() as TimelineEvent['type'];
  return TIMELINE_EVENT_TYPES.includes(normalized) ? normalized : 'other';
};

// Network type helpers — preserved for future network visualization features

// --- Component Definition ---

interface InvestigationWorkspaceProps {
  investigationId?: string;
  onInvestigationSelect?: (investigation: Investigation) => void;
  currentUser: Investigator;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  investigationId,
  onInvestigationSelect,
  currentUser,
}) => {
  const { isAdmin, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToasts();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const canEditInvestigations =
    isAuthenticated && (user?.role === 'admin' || user?.role === 'investigator');

  const {
    investigations,
    selectedInvestigation,
    setSelectedInvestigation,
    isLoading,
    error: investigationError,
    clearError: clearInvestigationError,
    loadInvestigations,
    loadInvestigation: loadInvestigationFromDomain,
    createInvestigation: createInvestigationFromDomain,
  } = useInvestigationList({
    currentUser,
    onError: (message) => addToast({ text: message, type: 'error' }),
  });

  const [showNewInvestigationModal, setShowNewInvestigationModal] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [newInvestigation, setNewInvestigation] = useState({
    title: '',
    description: '',
    hypothesis: '',
    priority: 'medium' as Investigation['priority'],
    dueDate: '',
  });

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [annotations, _setAnnotations] = useState<Annotation[]>([]);
  const [_evidenceLoading, setEvidenceLoading] = useState(false);
  const [dbStats, setDbStats] = useState({
    totalEntities: 0,
    totalDocuments: 0,
    entitiesWithDocuments: 0,
    documentsWithMetadata: 0,
  });
  const [shareCopied, setShareCopied] = useState(false);
  const [useGlobalContext, setUseGlobalContext] = useState(false);
  const [caseFolderDocumentId, setCaseFolderDocumentId] = useState<string | null>(null);
  const [caseFolderEntityId, setCaseFolderEntityId] = useState<string | null>(null);
  const [caseFolderFocusReturnEl, setCaseFolderFocusReturnEl] = useState<HTMLElement | null>(null);

  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const [showLeadsPanel, setShowLeadsPanel] = useState(false);
  const [showDossierPanel, setShowDossierPanel] = useState(false);
  const [custodyEvidenceId, setCustodyEvidenceId] = useState<string | null>(null);
  const [purgeTargetId, setPurgeTargetId] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [networkEdges, setNetworkEdges] = useState<NetworkEdge[]>([]);
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);

  useScrollLock(showNewInvestigationModal || false);

  // --- Tab Management ---

  type ActiveTab =
    | 'board'
    | 'overview'
    | 'evidence'
    | 'hypotheses'
    | 'notebook'
    | 'financial'
    | 'timeline'
    | 'communications'
    | 'team'
    | 'analytics'
    | 'forensic'
    | 'export'
    | 'activity'
    | 'iceberg'
    | 'intelligence'
    | 'casefolder';

  const getActiveTab = useCallback((): ActiveTab => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as ActiveTab | null;
    const did = params.get('docId');
    if (did) return 'forensic';
    const validTabs: ActiveTab[] = [
      'board',
      'overview',
      'evidence',
      'hypotheses',
      'notebook',
      'financial',
      'timeline',
      'communications',
      'team',
      'analytics',
      'forensic',
      'export',
      'activity',
      'iceberg',
      'intelligence',
      'casefolder',
    ];
    return tab && validTabs.includes(tab) ? tab : 'overview';
  }, [location.search]);

  const activeTab = getActiveTab();

  const navigateToTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(location.search);
      params.set('tab', tab);
      navigate(`${location.pathname}?${params.toString()}`);
      trackInvestigationEvent('investigation_view_opened', {
        caseId: selectedInvestigation ? String(selectedInvestigation.id) : undefined,
        metadata: { view: tab },
      });
    },
    [location.pathname, location.search, navigate, selectedInvestigation],
  );

  // --- Data Loading ---

  const {
    caseFolder,
    loading: caseFolderLoading,
    error: caseFolderError,
    reload: reloadCaseFolder,
  } = useCaseFolder(selectedInvestigation?.id, { enabled: !!selectedInvestigation });

  const loadInvestigation = useCallback(
    async (id: string) => {
      try {
        const loaded = await loadInvestigationFromDomain(id);
        if (!loaded) return;
        const { investigation, raw: inv } = loaded;

        const shareId = inv.uuid || inv.id;
        const nextPathname = `/investigations/${shareId}`;
        if (location.pathname !== nextPathname) {
          navigate(`${nextPathname}${location.search}`, { replace: true });
        }

        try {
          const timelineData = await investigationsApi.getTimelineEvents(String(investigation.id));
          const events = ((timelineData as RawTimelineEvent[]) || []).map((e) => ({
            id: String(e.id),
            title: e.title,
            startDate: new Date(e.start_date),
            description: e.description || '',
            type: toTimelineEventType(e.type),
            confidence: Number(e.confidence || 80),
            entities: JSON.parse(e.entities_json || '[]'),
            documents: JSON.parse(e.documents_json || '[]'),
            hypothesisIds: [],
            evidence: [],
            importance: 'medium' as const,
            tags: [],
            sources: [],
            createdBy: 'system',
            createdAt: new Date(e.created_at || e.start_date || Date.now()),
            updatedAt: new Date(e.updated_at || e.start_date || Date.now()),
            layerId: 'default',
          }));
          setTimelineEvents(events);
        } catch (_err) {
          console.error('Timeline fetch error:');
        }

        if (onInvestigationSelect) onInvestigationSelect(investigation);
      } catch (error) {
        console.error('Investigation load error:', error);
      }
    },
    [
      loadInvestigationFromDomain,
      location.pathname,
      location.search,
      navigate,
      onInvestigationSelect,
    ],
  );

  const loadEvidenceItems = useCallback(async (targetInvestigationId: string) => {
    try {
      setEvidenceLoading(true);
      const page = await investigationsApi.getEvidencePage(String(targetInvestigationId), {
        limit: 250,
        offset: 0,
      });
      setEvidenceItems((page.data || []).map(normalizeEvidenceListItem));
    } catch (error) {
      console.error('Evidence fetch error:', error);
    } finally {
      setEvidenceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvestigations();
  }, [loadInvestigations]);

  useEffect(() => {
    if (selectedInvestigation) {
      void loadEvidenceItems(String(selectedInvestigation.id));
    }
  }, [loadEvidenceItems, selectedInvestigation]);

  useEffect(() => {
    if (investigationId) {
      loadInvestigation(investigationId);
    }
  }, [investigationId, loadInvestigation]);

  useEffect(() => {
    const fetchAnalyticalContext = async () => {
      if (!selectedInvestigation) return;
      try {
        const stats = await apiClient.get<Record<string, unknown>>(
          `/investigations/${encodeURIComponent(selectedInvestigation.id)}/stats`,
        );
        if (
          stats &&
          typeof stats === 'object' &&
          'entitiesWithDocuments' in stats &&
          'totalEntities' in stats
        ) {
          setDbStats(
            stats as {
              totalEntities: number;
              totalDocuments: number;
              entitiesWithDocuments: number;
              documentsWithMetadata: number;
            },
          );
        } else {
          console.warn(
            'Received malformed stats for investigation - likely hitting SPA fallback or missing route',
            { stats, investigationId: selectedInvestigation.id },
          );
        }
      } catch (err) {
        console.error('Failed to fetch investigation analytics context', {
          err,
          investigationId: selectedInvestigation.id,
        });
      }
    };
    fetchAnalyticalContext();
  }, [selectedInvestigation]);

  // --- Analytics & Network Logic (Simplified for brevity but maintaining logic) ---

  useEffect(() => {
    const fetchNetworkData = async () => {
      if (activeTab !== 'analytics' || !selectedInvestigation) return;
      try {
        setIsNetworkLoading(true);
        PerformanceMonitor.mark('investigation-network-fetch-start');

        // Transform evidence and entities into a graph structure
        const nodes: NetworkNode[] = [];
        const edges: NetworkEdge[] = [];

        // Root node: The current investigation/subject target (Defaulting to Epstein for context)
        nodes.push({
          id: 'root-focus',
          type: 'organization',
          label: selectedInvestigation.title,
          importance: 5,
          metadata: { category: 'Investigation Focus' },
        });

        // Add evidence nodes
        evidenceItems.slice(0, 40).forEach((item, idx) => {
          nodes.push({
            id: `ev-${item.id}`,
            type: (item.type === 'document' || item.type === 'testimony'
              ? 'document'
              : 'evidence') as NetworkNode['type'],
            label: item.title || 'Untitled Evidence',
            importance: item.relevance === 'high' ? 4 : 2,
            metadata: {
              evidenceStrength: item.relevance === 'high' ? 'strong' : 'moderate',
              category: item.type,
            },
          });

          edges.push({
            id: `edge-ev-${idx}`,
            source: 'root-focus',
            target: `ev-${item.id}`,
            type: 'connection',
            strength: item.relevance === 'high' ? 8 : 4,
            metadata: { context: 'Directly linked to case' },
          });
        });

        setNetworkNodes(nodes);
        setNetworkEdges(edges);
        PerformanceMonitor.mark('investigation-network-fetch-end');
      } catch (error) {
        console.error('Network data error:', error);
      } finally {
        setIsNetworkLoading(false);
      }
    };
    fetchNetworkData();
  }, [activeTab, selectedInvestigation, useGlobalContext, evidenceItems]);

  // --- Actions ---

  const copyShareUrl = () => {
    if (selectedInvestigation) {
      const shareId = selectedInvestigation.uuid || selectedInvestigation.id;
      const shareUrl = `${window.location.origin}/investigations/${shareId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  };

  const handlePurgeInvestigation = async () => {
    if (!purgeTargetId) return;
    setIsPurging(true);
    try {
      await apiClient.delete(`/investigations/${encodeURIComponent(purgeTargetId)}`);
      setPurgeTargetId(null);
      addToast({ text: 'Investigation removed', type: 'success' });
      void loadInvestigations();
    } catch {
      addToast({ text: 'Failed to remove investigation', type: 'error' });
    } finally {
      setIsPurging(false);
    }
  };

  const openCreateInvestigation = () => {
    if (!canEditInvestigations) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    setCreationError(null);
    setShowNewInvestigationModal(true);
    trackInvestigationEvent('investigation_create_started');
  };

  const createInvestigation = async () => {
    const title = newInvestigation.title.trim();
    if (!title) {
      setCreationError('Enter a case title.');
      return;
    }
    if (!canEditInvestigations) {
      setCreationError('Sign in with an investigator account to create a case.');
      return;
    }
    setCreationError(null);
    try {
      const created = await createInvestigationFromDomain({
        title,
        description: newInvestigation.description.trim() || undefined,
        hypothesis: newInvestigation.hypothesis.trim() || undefined,
      });
      setSelectedInvestigation(created.investigation);
      if (onInvestigationSelect) onInvestigationSelect(created.investigation);
      const shareId = created.raw['uuid'] || created.raw['id'];
      if (shareId) navigate(`/investigations/${shareId}?tab=overview`, { replace: true });
      await loadInvestigations();
      setShowNewInvestigationModal(false);
      setNewInvestigation({
        title: '',
        description: '',
        hypothesis: '',
        priority: 'medium',
        dueDate: '',
      });
      addToast({ text: 'Case created.', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Case creation failed.';
      setCreationError(message);
      addToast({ text: message, type: 'error' });
    }
  };

  const closeCaseFolderEvidenceSurface = () => {
    const returnPath = getCaseFolderEvidenceReturnPath(location.pathname, location.search);
    if (returnPath) {
      navigate(returnPath, { replace: true });
    }
    caseFolderFocusReturnEl?.focus();
  };

  const closeCaseFolderDocumentModal = () => {
    setCaseFolderDocumentId(null);
    closeCaseFolderEvidenceSurface();
  };

  const closeCaseFolderEntityModal = () => {
    setCaseFolderEntityId(null);
    closeCaseFolderEvidenceSurface();
  };

  const handleCaseFolderEvidenceClick = useCallback(
    async (item: InvestigationCaseEvidenceItemDto, triggerEl?: HTMLElement | null) => {
      if (!selectedInvestigation) return false;
      const result = await investigationActions.openEvidence(item, {
        navigate,
        setDocumentId: (id) => setCaseFolderDocumentId(String(id)),
        setEntityId: (id) => setCaseFolderEntityId(String(id)),
        setFocusReturnEl: setCaseFolderFocusReturnEl,
        triggerEl,
        addToast,
        isAdmin,
        onRemoveBrokenLink: async (id: number) => {
          await investigationsApi.removeEvidenceLink(id);
          await reloadCaseFolder();
        },
      });
      return !!result;
    },
    [addToast, isAdmin, navigate, reloadCaseFolder, selectedInvestigation],
  );

  const { deepLinkedEvidenceId } = useEvidenceNavigation({
    selectedInvestigationId: selectedInvestigation ? String(selectedInvestigation.id) : null,
    location,
    activeTab,
    navigateToTab,
    loadCaseFolder: reloadCaseFolder,
    openEvidence: handleCaseFolderEvidenceClick,
    addToast,
  });

  // --- Render Helpers ---

  const getStatusBadge = (status: Investigation['status']) => {
    const variants: Record<string, 'accent' | 'warning' | 'success' | 'muted'> = {
      active: 'accent',
      review: 'warning',
      published: 'success',
      archived: 'muted',
    };
    return <Badge variant={variants[status] || 'muted'} label={status.toUpperCase()} />;
  };

  const getPriorityBadge = (priority: Investigation['priority']) => {
    const variants: Record<string, 'error' | 'warning' | 'accent' | 'muted'> = {
      critical: 'error',
      high: 'warning',
      medium: 'accent',
      low: 'muted',
    };
    return (
      <Badge variant={variants[priority] || 'muted'} label={`${priority.toUpperCase()} PRIORITY`} />
    );
  };

  const unresolvedAnnotations = annotations.filter((annotation) =>
    ['question', 'contradiction', 'tag'].includes(annotation.type),
  ).length;

  const evidenceWithProvenance = evidenceItems.filter(
    (item) => item.hash || item.chainOfCustody?.length || item.source,
  ).length;

  const readinessChecks = [
    {
      label: 'Evidence selected',
      detail:
        evidenceItems.length > 0
          ? `${evidenceItems.length} item${evidenceItems.length === 1 ? '' : 's'} in scope`
          : 'Add documents or entities to the case folder',
      ready: evidenceItems.length > 0,
    },
    {
      label: 'Provenance present',
      detail:
        evidenceItems.length === 0
          ? 'Waiting for evidence'
          : `${evidenceWithProvenance}/${evidenceItems.length} items have source metadata`,
      ready: evidenceItems.length > 0 && evidenceWithProvenance === evidenceItems.length,
    },
    {
      label: 'Timeline reviewed',
      detail:
        timelineEvents.length > 0
          ? `${timelineEvents.length} event${timelineEvents.length === 1 ? '' : 's'} ready`
          : 'Timeline can be added or intentionally skipped',
      ready: timelineEvents.length > 0,
    },
    {
      label: 'Annotations resolved',
      detail:
        unresolvedAnnotations > 0
          ? `${unresolvedAnnotations} annotation${unresolvedAnnotations === 1 ? '' : 's'} need review`
          : 'No unresolved annotations loaded',
      ready: unresolvedAnnotations === 0,
    },
  ];

  const exportReady = readinessChecks[0].ready && readinessChecks[3].ready;
  const readinessScore = readinessChecks.filter((check) => check.ready).length;

  const readinessMetrics = [
    { label: 'Evidence', value: evidenceItems.length },
    { label: 'Events', value: timelineEvents.length },
    { label: 'Hypotheses', value: hypotheses.length },
    { label: 'Flags', value: unresolvedAnnotations },
  ];

  const renderCaseReadinessPanel = (compact = false) => (
    <Surface variant="glass-highlight" p={compact ? 'md' : 'lg'} className={styles.readinessPanel}>
      <Stack gap={compact ? 'sm' : 'md'}>
        <Stack gap="xs">
          <LqText variant="xxs" color="muted" weight="bold" className={styles.kickerText}>
            Case Readiness
          </LqText>
          <Flex justify="between" align="center" gap="md">
            <LqText variant={compact ? 'small' : 'body'} weight="bold">
              {readinessScore}/{readinessChecks.length} checks complete
            </LqText>
            <Badge
              tone={exportReady ? 'success' : 'warning'}
              label={exportReady ? 'EXPORT READY' : 'NEEDS REVIEW'}
            />
          </Flex>
        </Stack>

        {!compact && (
          <Grid cols={{ sm: 2, lg: 4 }} gap="sm">
            {readinessMetrics.map((metric) => (
              <Surface key={metric.label} variant="glass" p="sm" className={styles.readinessMetric}>
                <LqText variant="xxxs" color="muted" weight="bold">
                  {metric.label.toUpperCase()}
                </LqText>
                <LqText variant="small" weight="bold">
                  {metric.value}
                </LqText>
              </Surface>
            ))}
          </Grid>
        )}

        <Stack gap="xs">
          {readinessChecks.map((check) => (
            <Flex key={check.label} gap="sm" align="start" className={styles.readinessCheck}>
              {check.ready ? (
                <Icon name="CheckCircle2" size="sm" className={styles.iconSuccess} />
              ) : (
                <Icon name="AlertTriangle" size="sm" className={styles.iconWarning} />
              )}
              <Stack gap="none">
                <LqText variant="xs" weight="bold">
                  {check.label}
                </LqText>
                <LqText variant="xxxs" color="muted">
                  {check.detail}
                </LqText>
              </Stack>
            </Flex>
          ))}
        </Stack>

        <Flex gap="sm" wrap="wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={
              canEditInvestigations ? () => navigateToTab('casefolder') : openCreateInvestigation
            }
          >
            {canEditInvestigations ? 'Add evidence' : 'Investigator sign-in'}
          </Button>
          <Button
            variant={exportReady ? 'primary' : 'glass'}
            size="sm"
            onClick={() => navigateToTab('export')}
          >
            Open Export Tools
          </Button>
        </Flex>
      </Stack>
    </Surface>
  );

  // --- JSX Rendering ---

  if (isLoading) {
    return (
      <Flex align="center" justify="center" fullHeight>
        <Icon name="Loader2" className={cn('animate-spin', styles.iconAccent)} size="xl" />
      </Flex>
    );
  }

  return (
    <Box fullHeight flex direction="column" className={styles.root}>
      {/* The selected-case header is owned by the mobile shell on small screens. */}
      {(!selectedInvestigation || !isMobile) && (
        <Surface variant="glass" p="lg" className={styles.headerSurface}>
          <Flex direction="column" gap="lg" px="xl" py="lg">
            <Flex align="center" gap="xs" className={styles.breadcrumbs}>
              <Button unstyled type="button" onClick={() => navigate('/')}>
                <LqText variant="xs" color="muted" style={css({ opacity: 0.7 })}>
                  Home
                </LqText>
              </Button>
              <Icon name="ArrowRight" size="xs" className={styles.iconMuted} />
              <LqText variant="xs" color="muted" weight="bold">
                Investigations
              </LqText>
            </Flex>

            {selectedInvestigation ? (
              <Flex justify="between" align="center" fullWidth>
                <Stack gap="none">
                  <LqText as="h1" variant="h2" className={styles.headerTitle}>
                    {selectedInvestigation.title}
                  </LqText>
                  <LqText variant="small" color="secondary">
                    Public case · {canEditInvestigations ? 'Editable' : 'Read-only'}
                  </LqText>
                </Stack>

                <Flex direction="column" align="end" gap="sm">
                  <Stack gap="xs" align="end">
                    <span
                      className={styles.scopeLabelText}
                      style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}
                    >
                      SCOPE
                    </span>
                    <AnimatedSegmentedControl
                      compact
                      minItemWidth="6rem"
                      ariaLabel="Exploration Scope"
                      options={[
                        { value: 'case', label: 'This Case Only', icon: 'Briefcase' },
                        { value: 'global', label: 'Global Archive', icon: 'Globe' },
                      ]}
                      value={useGlobalContext ? 'global' : 'case'}
                      onChange={(val) => setUseGlobalContext(val === 'global')}
                    />
                  </Stack>
                  <Flex align="center" gap="sm">
                    {canEditInvestigations && (
                      <>
                        <Button variant="glass" size="sm" onClick={() => setShowTasksPanel(true)}>
                          <Icon name="Flag" size="sm" className={styles.iconWarning} /> Tasks
                        </Button>
                        <Button variant="glass" size="sm" onClick={() => setShowLeadsPanel(true)}>
                          <Icon name="Crosshair" size="sm" className={styles.iconWarning} /> Leads
                        </Button>
                      </>
                    )}
                    <Button variant="glass" size="sm" onClick={() => setShowDossierPanel(true)}>
                      <Icon name="User" size="sm" className={styles.iconAccent} /> Subject
                    </Button>
                  </Flex>
                </Flex>
              </Flex>
            ) : (
              <Flex
                justify="between"
                align="start"
                gap="lg"
                fullWidth
                className={styles.heroTitleRow}
              >
                <Box className={styles.heroTitleBlock}>
                  <LqText as="h1" variant="h1" weight="bold" className={styles.heroTitle}>
                    Investigations
                  </LqText>
                  <LqText variant="xs" color="secondary" className={styles.heroSubtitle}>
                    Collect public archive sources, test a question, and build a clear evidence
                    trail.
                  </LqText>
                </Box>

                <Flex direction="column" align="end" gap="md" className={styles.heroActions}>
                  <LqText variant="xs" color="muted" className={styles.heroCountLabel}>
                    {investigations.filter((i) => i.status === 'active').length} active of{' '}
                    {investigations.length.toLocaleString()} public cases
                  </LqText>
                  <Button variant="primary" size="md" onClick={openCreateInvestigation}>
                    <Icon name={canEditInvestigations ? 'Plus' : 'LogIn'} size="md" />{' '}
                    {canEditInvestigations ? 'New case' : 'Investigator sign-in'}
                  </Button>
                </Flex>
              </Flex>
            )}
          </Flex>
        </Surface>
      )}

      {/* Dashboard View */}
      {!selectedInvestigation && (
        <Box grow p="xl" className={cn(styles.scrollArea, styles.dashboard)}>
          <Stack gap="xl" className={styles.dashboardContent}>
            <Grid cols={{ sm: 1, md: 2 }} gap="xl" className={styles.dashboardActions}>
              <Button
                unstyled
                type="button"
                className={styles.actionCard}
                onClick={openCreateInvestigation}
              >
                <Stack p="xl" align="center" textAlign="center" gap="md">
                  <Box className={styles.actionIconBox}>
                    <Icon name="Plus" size="xl" />
                  </Box>
                  <Stack gap="xs">
                    <LqText
                      variant="h3"
                      weight="black"
                      style={css({ textTransform: 'uppercase', letterSpacing: '0.05em' })}
                    >
                      {canEditInvestigations ? 'Create a case' : 'Investigator sign-in'}
                    </LqText>
                    <LqText variant="symbolic" color="muted">
                      {canEditInvestigations
                        ? 'Start with a focused question'
                        : 'Sign in to create and edit cases'}
                    </LqText>
                  </Stack>
                </Stack>
              </Button>

              <Surface variant="glass" className={cn(styles.actionCard, styles.statsCombinedCard)}>
                <Stack p="xl" align="center" textAlign="center" gap="md">
                  <Box className={styles.actionIconBox}>
                    <Icon name="Target" size="xl" />
                  </Box>
                  <Stack gap="xs">
                    <LqText
                      variant="h3"
                      weight="black"
                      style={css({ textTransform: 'uppercase', letterSpacing: '0.05em' })}
                    >
                      {investigations.length} Cases
                    </LqText>
                    <LqText variant="symbolic" color="muted">
                      {investigations.filter((i) => i.status === 'active').length} Active •
                      {investigations.filter((i) => i.status === 'review').length} Review
                    </LqText>
                  </Stack>
                </Stack>
              </Surface>
            </Grid>

            <Stack gap="lg" className={styles.recentSection}>
              <Flex align="center" gap="md">
                <Icon name="Microscope" size="lg" className={styles.iconAccent} />
                <LqText variant="h3" weight="bold" className={styles.recentSectionTitle}>
                  Public cases
                </LqText>
              </Flex>

              {investigationError ? (
                <Surface variant="glass" p="xl" role="alert">
                  <Flex
                    direction="column"
                    align="center"
                    gap="md"
                    style={css({ textAlign: 'center' })}
                  >
                    <Icon name="AlertTriangle" size="lg" className={styles.iconWarning} />
                    <Stack gap="xs" align="center">
                      <LqText variant="body" weight="bold">
                        Cases are unavailable
                      </LqText>
                      <LqText variant="small" color="muted">
                        {investigationError}
                      </LqText>
                    </Stack>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        clearInvestigationError();
                        void loadInvestigations();
                      }}
                    >
                      Retry
                    </Button>
                  </Flex>
                </Surface>
              ) : investigations.length === 0 ? (
                <Surface variant="glass" p="xxl">
                  <Flex
                    direction="column"
                    align="center"
                    gap="lg"
                    style={css({ textAlign: 'center' })}
                  >
                    <Icon name="Activity" size="xl" className={styles.iconMuted} />
                    <Stack gap="xs" align="center">
                      <LqText variant="h3" weight="bold">
                        Start with a focused question
                      </LqText>
                      <LqText variant="small" color="muted" className={styles.emptyStateText}>
                        Create a public case, add a source document or subject, and then record what
                        the source supports.
                      </LqText>
                    </Stack>
                    <Flex gap="sm" wrap="wrap" justify="center">
                      <Button variant="primary" onClick={openCreateInvestigation}>
                        <Icon name={canEditInvestigations ? 'Plus' : 'LogIn'} size="sm" />{' '}
                        {canEditInvestigations ? 'New case' : 'Investigator sign-in'}
                      </Button>
                      <Button variant="secondary" onClick={() => navigate('/documents')}>
                        <Icon name="Search" size="sm" /> Browse Documents
                      </Button>
                    </Flex>
                  </Flex>
                </Surface>
              ) : (
                <Grid cols={{ sm: 1, md: 2, lg: 3 }} gap="xl">
                  {investigations.map((inv) => (
                    <Surface
                      key={inv.id}
                      variant="glass"
                      p="lg"
                      className={styles.invCardInteractive}
                    >
                      {(isAdmin || inv.leadInvestigator === currentUser.id) && (
                        <Button
                          iconOnly
                          variant="ghost"
                          className={styles.invCardDelete}
                          aria-label={`Remove ${inv.title}`}
                          onClick={() => setPurgeTargetId(String(inv.id))}
                        >
                          <Icon name="XCircle" size="sm" />
                        </Button>
                      )}
                      <Button
                        unstyled
                        type="button"
                        className={styles.invCardButton}
                        onClick={() => void loadInvestigation(inv.id)}
                      >
                        <Stack style={css({ height: '100%' })}>
                          <Box p="lg">
                            <Flex justify="between" mb="md">
                              {getStatusBadge(inv.status)}
                            </Flex>
                            <Stack gap="sm" className={styles.invCardBody}>
                              <LqText variant="body" weight="bold" className={styles.invTitle}>
                                {inv.title}
                              </LqText>
                              <LqText variant="xs" color="muted" className={styles.invDesc}>
                                {inv.description || 'No description provided.'}
                              </LqText>
                            </Stack>
                          </Box>
                          <Surface variant="glass-highlight" mt="auto">
                            <Flex justify="between" p="md">
                              <LqText variant="xs" color="muted">
                                Public case
                              </LqText>
                              <Flex align="center" gap="xs">
                                <Icon name="Calendar" size="xs" className={styles.iconMuted} />
                                <LqText variant="xs" color="muted">
                                  {new Date(inv.createdAt).toLocaleDateString()}
                                </LqText>
                              </Flex>
                            </Flex>
                          </Surface>
                        </Stack>
                      </Button>
                    </Surface>
                  ))}
                </Grid>
              )}
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Investigation Workspace Layout (Mobile) */}
      {selectedInvestigation && isMobile && (
        <Suspense fallback={<PanelLoadingState />}>
          <MobileInvestigationShell
            currentUser={currentUser}
            selectedInvestigation={selectedInvestigation}
            timelineEvents={timelineEvents}
            evidenceItems={evidenceItems}
            investigationId={String(selectedInvestigation.id)}
            onInvestigationSelect={onInvestigationSelect}
          />
        </Suspense>
      )}

      {/* Investigation Workspace Layout (Restored Flex) */}
      {selectedInvestigation && !isMobile && (
        <Flex grow fullWidth className={styles.layoutContainer}>
          {/* Dashboard Sidebar (Fixed Width) */}
          <Box className={styles.desktopSidebar}>
            <Surface variant="glass" className={styles.sidebarInner} h="100%">
              <Stack p="lg" gap="xl">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedInvestigation(null)}
                  className={styles.backButton}
                >
                  <Icon name="ArrowRight" className="rotate-180" size="sm" /> Back to Dashboard
                </Button>

                <Stack gap="md" className={styles.sidebarInvInfo}>
                  <LqText variant="small" weight="bold" className={styles.sidebarInvTitle}>
                    {selectedInvestigation.title}
                  </LqText>
                  <Button
                    variant="glass-highlight"
                    size="sm"
                    onClick={copyShareUrl}
                    className={styles.shareButton}
                  >
                    <Icon name="Share2" size="sm" />{' '}
                    {shareCopied ? 'Public link copied' : 'Copy public link'}
                  </Button>
                  <LqText variant="xxxs" color="muted">
                    Anyone with this link can view the case.
                  </LqText>
                </Stack>

                {renderCaseReadinessPanel(true)}

                <nav aria-label="Case sections">
                  <Stack gap="xs" className={styles.nav}>
                    {[
                      { id: 'overview', label: 'Overview', iconName: 'Search' },
                      { id: 'casefolder', label: 'Evidence', iconName: 'FolderOpen' },
                      ...(canEditInvestigations
                        ? [
                            { id: 'board', label: 'Board', iconName: 'LayoutDashboard' },
                            { id: 'notebook', label: 'Notes', iconName: 'FileText' },
                          ]
                        : []),
                      { id: 'timeline', label: 'Timeline', iconName: 'Calendar' },
                      { id: 'export', label: 'Export', iconName: 'Download' },
                    ].map((t) => (
                      <Button
                        key={t.id}
                        variant={activeTab === t.id ? 'accent-solid' : 'ghost'}
                        onClick={() => navigateToTab(t.id)}
                        className={cn(
                          styles.navButton,
                          activeTab === t.id ? styles.navButtonActive : '',
                        )}
                      >
                        <Flex align="center" gap="md" grow>
                          <Icon name={t.iconName} size="sm" className={styles.navIcon} />
                          <LqText
                            variant="small"
                            className={styles.navLabel}
                            weight={activeTab === t.id ? 'bold' : 'medium'}
                          >
                            {t.label}
                          </LqText>
                        </Flex>
                      </Button>
                    ))}
                    <details className={styles.advancedNav}>
                      <summary>Advanced tools</summary>
                      <Stack gap="xs" mt="xs">
                        {[
                          ...(canEditInvestigations
                            ? [
                                { id: 'hypotheses', label: 'Hypotheses', iconName: 'Target' },
                                { id: 'team', label: 'Team', iconName: 'Users' },
                              ]
                            : []),
                          { id: 'intelligence', label: 'Discovery', iconName: 'Layers' },
                          { id: 'financial', label: 'Financial links', iconName: 'DollarSign' },
                          {
                            id: 'communications',
                            label: 'Communications',
                            iconName: 'MessageSquare',
                          },
                          { id: 'forensic', label: 'Forensic tools', iconName: 'Microscope' },
                          { id: 'analytics', label: 'Analytics', iconName: 'BarChart3' },
                          { id: 'activity', label: 'Activity', iconName: 'Activity' },
                        ].map((t) => (
                          <Button
                            key={t.id}
                            variant={activeTab === t.id ? 'accent-solid' : 'ghost'}
                            onClick={() => navigateToTab(t.id)}
                            className={cn(
                              styles.navButton,
                              activeTab === t.id ? styles.navButtonActive : '',
                            )}
                          >
                            <Flex align="center" gap="md" grow>
                              <Icon name={t.iconName} size="sm" className={styles.navIcon} />
                              <LqText variant="small" className={styles.navLabel}>
                                {t.label}
                              </LqText>
                            </Flex>
                          </Button>
                        ))}
                      </Stack>
                    </details>
                  </Stack>
                </nav>
              </Stack>
            </Surface>
          </Box>

          {/* Main Content Area (Restored Flow) */}
          <Box grow className={styles.mainContent}>
            <Box p="xl" className={styles.scrollArea}>
              <Suspense fallback={<PanelLoadingState />}>
                {!canEditInvestigations &&
                ['board', 'notebook', 'hypotheses', 'team', 'forensic', 'export'].includes(
                  activeTab,
                ) ? (
                  <Surface variant="glass" p="xl" role="status">
                    <Stack gap="md" align="start">
                      <Icon name="Lock" size="lg" className={styles.iconMuted} />
                      <Stack gap="xs">
                        <LqText variant="h3" weight="bold">
                          Investigator access required
                        </LqText>
                        <LqText variant="small" color="muted">
                          This case is public to view. Editing, notes, analysis, and export require
                          an investigator account.
                        </LqText>
                      </Stack>
                      <Button variant="primary" onClick={openCreateInvestigation}>
                        <Icon name="LogIn" size="sm" /> Investigator sign-in
                      </Button>
                    </Stack>
                  </Surface>
                ) : (
                  <>
                    {activeTab === 'board' && (
                      <InvestigationBoard investigationId={selectedInvestigation.id} />
                    )}
                    {activeTab === 'iceberg' && (
                      <IcebergIntelligence
                        investigationId={selectedInvestigation.id}
                        onOpenDocument={(documentId) => setCaseFolderDocumentId(String(documentId))}
                      />
                    )}
                    {activeTab === 'intelligence' && (
                      <IcebergIntelligence
                        investigationId={selectedInvestigation.id}
                        onOpenDocument={(documentId) => setCaseFolderDocumentId(String(documentId))}
                      />
                    )}
                    {activeTab === 'overview' && (
                      <Stack gap="xl">
                        <LqText variant="h3" weight="bold" className={styles.tabTitle}>
                          <Icon
                            name="Search"
                            size="md"
                            className={styles.iconAccent}
                            style={css({ marginRight: '0.75rem', verticalAlign: 'middle' })}
                          />
                          Intelligence Overview
                        </LqText>
                        <Grid cols={{ sm: 1, lg: 2 }} gap="xl" className={styles.overviewGrid}>
                          <Surface variant="glass-highlight" p="xl" className={styles.infoBox}>
                            <Stack gap="md">
                              <LqText
                                variant="xs"
                                weight="bold"
                                className={styles.infoLabel}
                                style={css({ color: 'var(--lq-accent-3)' })}
                              >
                                Primary Hypothesis
                              </LqText>
                              <LqText variant="small" className={styles.infoText}>
                                {selectedInvestigation.hypothesis}
                              </LqText>
                            </Stack>
                          </Surface>
                          <Surface variant="glass-highlight" p="xl" className={styles.infoBox}>
                            <Stack gap="md">
                              <LqText
                                variant="xs"
                                weight="bold"
                                className={styles.infoLabel}
                                style={css({ color: 'var(--lq-accent-3)' })}
                              >
                                Operational Status
                              </LqText>
                              <Flex gap="md" align="center" className={styles.statusRow}>
                                {getStatusBadge(selectedInvestigation.status)}
                                {getPriorityBadge(selectedInvestigation.priority)}
                              </Flex>
                              {selectedInvestigation.dueDate && (
                                <Flex align="center" gap="sm" mt="xs">
                                  <Icon name="Clock" size="sm" className={styles.iconMuted} />
                                  <LqText variant="xs" color="muted">
                                    Target Completion:{' '}
                                    {new Date(selectedInvestigation.dueDate).toLocaleDateString()}
                                  </LqText>
                                </Flex>
                              )}
                            </Stack>
                          </Surface>
                        </Grid>
                        <DataIntegrityPanel
                          stats={{
                            entitiesWithDocuments: dbStats.entitiesWithDocuments,
                            totalEntities: dbStats.totalEntities,
                            documentsWithMetadata: dbStats.documentsWithMetadata,
                            totalDocuments: dbStats.totalDocuments,
                            lastRefresh:
                              new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
                          }}
                        />
                        {renderCaseReadinessPanel()}
                        {evidenceItems.length === 0 && (
                          <Surface variant="glass" p="xl" className={styles.nextActionPanel}>
                            <Flex gap="lg" align="center" justify="between" wrap="wrap">
                              <Stack gap="xs">
                                <LqText variant="body" weight="bold">
                                  Build the first packet item
                                </LqText>
                                <LqText variant="xs" color="muted">
                                  This case has no evidence yet. Start from the case folder or
                                  document browser so export/report tools have material to package.
                                </LqText>
                              </Stack>
                              <Flex gap="sm" wrap="wrap">
                                <Button
                                  variant="primary"
                                  onClick={() => navigateToTab('casefolder')}
                                >
                                  Open Case Folder
                                </Button>
                                <Button variant="secondary" onClick={() => navigate('/documents')}>
                                  Search Archive
                                </Button>
                              </Flex>
                            </Flex>
                          </Surface>
                        )}
                      </Stack>
                    )}
                    {activeTab === 'activity' && (
                      <InvestigationActivityFeed investigationId={selectedInvestigation.id} />
                    )}
                    {activeTab === 'casefolder' && (
                      <InvestigationCaseFolder
                        investigationId={selectedInvestigation.id}
                        onEvidenceClick={handleCaseFolderEvidenceClick}
                        deepLinkedEvidenceId={deepLinkedEvidenceId}
                        caseFolderData={caseFolder || undefined}
                        caseFolderLoading={caseFolderLoading}
                        caseFolderError={caseFolderError}
                        onReloadCaseFolder={reloadCaseFolder}
                      />
                    )}
                    {activeTab === 'evidence' && (
                      <InvestigationEvidencePanel
                        investigationId={selectedInvestigation.id}
                        onChainOfCustody={setCustodyEvidenceId}
                      />
                    )}
                    {activeTab === 'hypotheses' && (
                      <HypothesisTestingFramework
                        investigationId={selectedInvestigation.id}
                        initialHypothesis={selectedInvestigation.hypothesis}
                        evidenceItems={evidenceItems}
                        onHypothesesUpdate={(u) => setHypotheses(u as Hypothesis[])}
                      />
                    )}
                    {activeTab === 'notebook' && (
                      <EvidenceNotebook investigationId={Number(selectedInvestigation.id)} />
                    )}
                    {activeTab === 'financial' && (
                      <FinancialTransactionMapper
                        investigationId={useGlobalContext ? undefined : selectedInvestigation.id}
                      />
                    )}
                    {activeTab === 'communications' && (
                      <CommunicationAnalysis
                        investigation={selectedInvestigation}
                        evidence={evidenceItems}
                        onOpenCaseFolder={() => navigateToTab('casefolder')}
                      />
                    )}
                    {activeTab === 'timeline' && (
                      <InvestigationTimelineBuilder
                        investigation={selectedInvestigation}
                        events={timelineEvents}
                        evidence={evidenceItems}
                        hypotheses={hypotheses}
                        onEventsUpdate={setTimelineEvents}
                        onSaveEvent={async (e) => {
                          void e;
                        }}
                        onDeleteEvent={async (id) => {
                          void id;
                        }}
                        onOpenSource={(ev) => {
                          void ev;
                        }}
                      />
                    )}
                    {activeTab === 'forensic' && (
                      <ForensicAnalysisWorkspace
                        investigation={selectedInvestigation}
                        evidence={evidenceItems}
                        onEvidenceUpdate={setEvidenceItems}
                        timelineEvents={timelineEvents}
                        useGlobalContext={useGlobalContext}
                      />
                    )}
                    {activeTab === 'team' && (
                      <InvestigationTeamManagement
                        investigation={selectedInvestigation}
                        currentUser={currentUser}
                        onTeamUpdate={setSelectedInvestigation}
                      />
                    )}
                    {activeTab === 'analytics' && (
                      <Box fullHeight style={css({ minHeight: '600px' })}>
                        {isNetworkLoading ? (
                          <Flex align="center" justify="center" h="100%">
                            <Icon name="Loader2" className="animate-spin text-primary" size="xl" />
                          </Flex>
                        ) : (
                          <NetworkVisualization
                            nodes={networkNodes}
                            edges={networkEdges}
                            height={700}
                          />
                        )}
                      </Box>
                    )}
                    {activeTab === 'export' && (
                      <Stack gap="xl">
                        <LqText variant="h3" weight="bold">
                          Export & Forensic Publication
                        </LqText>
                        <InvestigationExportTools
                          investigation={selectedInvestigation}
                          evidence={evidenceItems}
                          timelineEvents={timelineEvents}
                          hypotheses={hypotheses}
                          annotations={annotations}
                        />
                        <Surface variant="glass" p="xl">
                          <Stack gap="md">
                            <LqText variant="body" weight="bold">
                              Forensic Intelligence Summary
                            </LqText>
                            <LqText variant="xs" color="muted">
                              Compress all investigative signal data into an encrypted evidence
                              packet.
                            </LqText>
                            <EvidencePacketExporter
                              investigationId={selectedInvestigation.id}
                              investigationTitle={selectedInvestigation.title}
                              evidence={evidenceItems}
                              timelineEvents={timelineEvents}
                              hypotheses={hypotheses}
                              annotations={annotations}
                              onExport={(f, _) => {
                                trackInvestigationEvent('investigation_export_completed', {
                                  caseId: String(selectedInvestigation.id),
                                  metadata: { format: f },
                                });
                                addToast({
                                  text: `Export complete: ${f.toUpperCase()}`,
                                  type: 'success',
                                });
                              }}
                            />
                          </Stack>
                        </Surface>
                      </Stack>
                    )}
                  </>
                )}
              </Suspense>
            </Box>
          </Box>
        </Flex>
      )}

      <Dialog
        open={showNewInvestigationModal}
        onOpenChange={(open) => {
          setShowNewInvestigationModal(open);
          if (!open) setCreationError(null);
        }}
      >
        <DialogContent className={styles.createDialog}>
          <DialogHeader>
            <DialogTitle>Create a public case</DialogTitle>
            <DialogDescription>
              Give the case a clear question and scope. You can add evidence after you create it.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void createInvestigation();
            }}
          >
            <Stack gap="lg">
              <Surface variant="glass-highlight" p="md" role="note">
                <LqText variant="small">
                  Cases are public. Do not add private, confidential, or personal contact data.
                </LqText>
              </Surface>
              <TextInput
                id="investigation-title"
                label="Case title"
                required
                autoFocus
                placeholder="Example: Payments linked to Property X"
                value={newInvestigation.title}
                invalid={creationError !== null && !newInvestigation.title.trim()}
                onChange={(event) => {
                  setCreationError(null);
                  setNewInvestigation({ ...newInvestigation, title: event.target.value });
                }}
              />
              <Textarea
                id="investigation-question"
                label="Question or hypothesis (optional)"
                rows={3}
                placeholder="What are you trying to confirm or disprove?"
                value={newInvestigation.hypothesis}
                onChange={(event) =>
                  setNewInvestigation({ ...newInvestigation, hypothesis: event.target.value })
                }
              />
              <Textarea
                id="investigation-description"
                label="Context (optional)"
                rows={3}
                placeholder="Add background, boundaries, or a short plan."
                value={newInvestigation.description}
                onChange={(event) =>
                  setNewInvestigation({ ...newInvestigation, description: event.target.value })
                }
              />
              {creationError && (
                <LqText variant="small" color="danger" role="alert">
                  {creationError}
                </LqText>
              )}
              <Flex gap="sm" justify="end" wrap="wrap">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewInvestigationModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={!newInvestigation.title.trim()}>
                  Create case
                </Button>
              </Flex>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>

      <Suspense fallback={<PanelLoadingState />}>
        {selectedInvestigation && showLeadsPanel && (
          <InvestigationLeadsPanel
            investigationId={selectedInvestigation.id}
            onClose={() => setShowLeadsPanel(false)}
          />
        )}

        {selectedInvestigation && showTasksPanel && (
          <InvestigationTasksPanel
            investigationId={selectedInvestigation.id}
            onClose={() => setShowTasksPanel(false)}
          />
        )}

        {selectedInvestigation && showDossierPanel && (
          <SubjectDossierPanel
            investigationId={selectedInvestigation.id}
            onClose={() => setShowDossierPanel(false)}
            onOpenDocument={setCaseFolderDocumentId}
          />
        )}
      </Suspense>

      {caseFolderDocumentId && (
        <DocumentModal id={caseFolderDocumentId} onClose={closeCaseFolderDocumentModal} />
      )}
      {caseFolderEntityId && (
        <EvidenceModal
          entityId={caseFolderEntityId}
          isOpen={true}
          onClose={closeCaseFolderEntityModal}
        />
      )}
      {custodyEvidenceId && (
        <ChainOfCustodyModal
          evidenceId={custodyEvidenceId}
          onClose={() => setCustodyEvidenceId(null)}
        />
      )}

      <Dialog
        open={purgeTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setPurgeTargetId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Investigation</DialogTitle>
            <DialogDescription>
              This will permanently remove the investigation record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Flex gap="sm" justify="end" style={{ marginTop: 'var(--space-4)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPurgeTargetId(null)}
              disabled={isPurging}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePurgeInvestigation}
              disabled={isPurging}
            >
              {isPurging ? 'Removing...' : 'Remove'}
            </Button>
          </Flex>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
