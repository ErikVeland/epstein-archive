import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Investigation,
  EvidenceItem,
  TimelineEvent,
  Annotation,
  Investigator,
  Hypothesis,
} from '../../types/investigation';
import {
  Calendar,
  Cpu,
  User,
  ArrowRight,
  Search,
  Download,
  Plus,
  Users,
  Target,
  FileText,
  BarChart3,
  Share2,
  Microscope,
  DollarSign,
  MessageSquare,
  LayoutDashboard,
  Activity,
  FolderOpen,
  Flag,
  Upload,
  Crosshair,
  Loader2,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// Specialized Analytical Views
import FinancialTransactionMapper from '../visualizations/FinancialTransactionMapper';
import { ChainOfCustodyModal } from './ChainOfCustodyModal';
import { NetworkNode, NetworkEdge } from '../visualizations/NetworkVisualization';
import { InvestigationTimelineBuilder } from './InvestigationTimelineBuilder';
import { InvestigationExportTools } from './InvestigationExportTools';
import { ForensicAnalysisWorkspace } from './ForensicAnalysisWorkspace';
import { DataIntegrityPanel } from '../visualizations/DataIntegrityPanel';
import { EvidencePacketExporter } from './EvidencePacketExporter';
// These panels exist but are not currently rendered in the active workspace layout
// They are preserved as imports for future use
import { InvestigationTasksPanel } from './InvestigationTasksPanel';

import { InvestigationEvidencePanel } from './InvestigationEvidencePanel';
import { InvestigationActivityFeed } from './InvestigationActivityFeed';
import { InvestigationCaseFolder } from './InvestigationCaseFolder';
import { EvidenceNotebook } from './EvidenceNotebook';
import { HypothesisTestingFramework } from './HypothesisTestingFramework';
import { InvestigationTeamManagement } from './InvestigationTeamManagement';
import { InvestigationBoard } from './InvestigationBoard';
import { InvestigationLeadsPanel } from './InvestigationLeadsPanel';
import { SubjectDossierPanel } from './SubjectDossierPanel';
import { CommunicationAnalysis } from './CommunicationAnalysis';
import { AgenticDiscoveryBoard } from './AgenticDiscoveryBoard';
import { DocumentModal } from '../documents/DocumentModal';
import { EvidenceModal } from '../common/EvidenceModal';

// Hooks & Services
import { useToasts } from '../common/useToasts';
import { useInvestigationOnboarding } from '../../hooks/useInvestigationOnboarding';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileInvestigationShell } from './mobile/MobileInvestigationShell';
import { InvestigationOnboarding } from './InvestigationOnboarding';
import { NetworkVisualization } from '../visualizations/NetworkVisualization';

import { CreateRelationshipModal as _CreateRelationshipModal2 } from '../entities/CreateRelationshipModal';
import { apiClient } from '../../services/apiClient';
import {
  investigationActions,
  investigationsApi,
  normalizeEvidenceListItem,
  useCaseFolder,
  useEvidenceNavigation,
  useInvestigationList,
} from '../../domains/investigations';
import type { InvestigationCaseEvidenceItemDto } from '@shared/dto/investigations';
import { PerformanceMonitor } from '../../utils/performanceMonitor';

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
  TextArea,
  cn,
} from '../../design-system/lib';
import styles from './InvestigationWorkspace.module.css';
import { CloseButton as _CloseButton } from '../common/CloseButton';

const css = <T,>(style: T) => style;

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
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToasts();
  const isMobile = useIsMobile();
  const [showImportModal, setShowImportModal] = useState(false);

  const {
    investigations,
    selectedInvestigation,
    setSelectedInvestigation,
    isLoading,
    loadInvestigations,
    loadInvestigation: loadInvestigationFromDomain,
    createInvestigation: createInvestigationFromDomain,
  } = useInvestigationList({
    currentUser,
    onError: (message) => addToast({ text: message, type: 'error' }),
  });

  const [showNewInvestigationModal, setShowNewInvestigationModal] = useState(false);
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
    },
    [location.pathname, location.search, navigate],
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
        navigate(`/investigations/${shareId}`, { replace: true });

        try {
          const timelineData = await investigationsApi.getTimelineEvents(String(id));
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
    [loadInvestigationFromDomain, navigate, onInvestigationSelect],
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

  const createInvestigation = async () => {
    if (!newInvestigation.title || !newInvestigation.description) return;
    try {
      const created = await createInvestigationFromDomain({
        title: newInvestigation.title,
        description: newInvestigation.description,
        hypothesis: newInvestigation.hypothesis,
      });
      setSelectedInvestigation(created.investigation);
      if (onInvestigationSelect) onInvestigationSelect(created.investigation);
      const shareId = created.raw['uuid'] || created.raw['id'];
      if (shareId) navigate(`/investigations/${shareId}`, { replace: true });
      await loadInvestigations();
      setShowNewInvestigationModal(false);
    } catch (_error) {
      addToast({ text: 'Creation failed.', type: 'error' });
    }
  };

  const closeCaseFolderDocumentModal = () => {
    setCaseFolderDocumentId(null);
    caseFolderFocusReturnEl?.focus();
  };

  const closeCaseFolderEntityModal = () => {
    setCaseFolderEntityId(null);
    caseFolderFocusReturnEl?.focus();
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

  const { hasSeenOnboarding, markOnboardingAsSeen } = useInvestigationOnboarding();

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
    (item) => item.hash || item.chainOfCustody?.length || item.source || item.originalFilePath,
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
        <Flex justify="between" align="center" gap="md">
          <Stack gap="none">
            <LqText variant="xs" color="muted" weight="bold" className={styles.kickerText}>
              Case Readiness
            </LqText>
            <LqText variant={compact ? 'small' : 'body'} weight="bold">
              {readinessScore}/{readinessChecks.length} checks complete
            </LqText>
          </Stack>
          <Badge
            variant={exportReady ? 'success' : 'warning'}
            label={exportReady ? 'EXPORT READY' : 'NEEDS REVIEW'}
          />
        </Flex>

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
                <CheckCircle2 size={16} className={styles.iconSuccess} />
              ) : (
                <AlertTriangle size={16} className={styles.iconWarning} />
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
          <Button variant="secondary" size="sm" onClick={() => navigateToTab('casefolder')}>
            Add Evidence
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
        <Loader2 className={cn('animate-spin', styles.iconAccent)} size={48} />
      </Flex>
    );
  }

  return (
    <Box fullHeight flex direction="column" bgcolor="var(--lq-surface-1)">
      {/* Unified Premium Header */}
      <Surface variant="glass" p="lg" className={styles.headerSurface}>
        <Flex direction="column" gap="lg" px="xl" py="lg">
          <Flex align="center" gap="xs" className={styles.breadcrumbs}>
            <LqText
              variant="xs"
              color="muted"
              onClick={() => navigate('/')}
              style={css({ cursor: 'pointer', opacity: 0.7 })}
            >
              Home
            </LqText>
            <ArrowRight size={10} className={styles.iconMuted} />
            <LqText variant="xs" color="muted" weight="bold">
              Investigations
            </LqText>
          </Flex>

          {selectedInvestigation ? (
            <Flex justify="between" align="center" fullWidth>
              <Stack gap="none">
                <LqText variant="bombastic" className={styles.headerTitle}>
                  Investigation
                </LqText>
                <LqText
                  variant="symbolic"
                  color="secondary"
                  weight="bold"
                  className="tracking-symbolic"
                >
                  Forensic Intelligence • 12 Active Investigators • Collaborative Analysis
                </LqText>
              </Stack>

              <Flex align="center" gap="sm">
                <Surface variant="glass-highlight" p="xs" className={styles.scopeToggleSurface}>
                  <Button
                    variant={!useGlobalContext ? 'accent-solid' : 'ghost'}
                    onClick={() => setUseGlobalContext(false)}
                  >
                    Investigation Scope
                  </Button>
                  <Button
                    variant={useGlobalContext ? 'accent-solid' : 'ghost'}
                    onClick={() => setUseGlobalContext(true)}
                  >
                    Global Context
                  </Button>
                </Surface>
                <Button variant="glass" size="sm" onClick={() => setShowTasksPanel(true)}>
                  <Flag size={16} className={styles.iconWarning} /> Tasks
                </Button>
                <Button variant="glass" size="sm" onClick={() => setShowLeadsPanel(true)}>
                  <Crosshair size={16} className={styles.iconWarning} /> Leads
                </Button>
                <Button variant="glass" size="sm" onClick={() => setShowDossierPanel(true)}>
                  <User size={16} className={styles.iconAccent} /> Subject
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowImportModal(true)}>
                  <Upload size={16} /> Import Report
                </Button>
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
                  High-signal case orchestration, evidence chaining, and collaborative analysis
                  across the archive.
                </LqText>
              </Box>

              <Flex direction="column" align="end" gap="md" className={styles.heroActions}>
                <LqText variant="xs" color="muted" className={styles.heroCountLabel}>
                  {investigations.filter((i) => i.status === 'active').length} active of{' '}
                  {investigations.length.toLocaleString()} total investigations
                </LqText>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowNewInvestigationModal(true)}
                >
                  <Plus size={20} /> New Investigation
                </Button>
              </Flex>
            </Flex>
          )}
        </Flex>
      </Surface>

      {/* Dashboard View */}
      {!selectedInvestigation && (
        <Box grow p="xl" className={cn(styles.scrollArea, styles.dashboard)}>
          <Stack gap="xl" className={styles.dashboardContent}>
            <Stack gap="sm" className={styles.dashboardHero}>
              <LqText variant="h1" weight="bold" className={styles.dashboardHeroTitle}>
                Investigation Dashboard
              </LqText>
              <LqText variant="small" color="muted" className={styles.dashboardHeroSubtitle}>
                Manage forensic intelligence, organize evidence, and coordinate analytical workflows
                with the localized data baseline.
              </LqText>
            </Stack>

            <Grid cols={{ sm: 1, md: 2 }} gap="xl" className={styles.dashboardActions}>
              <Surface
                variant="glass-highlight"
                className={styles.actionCard}
                onClick={() => setShowNewInvestigationModal(true)}
              >
                <Stack p="xl" align="center" textAlign="center" gap="md">
                  <Box className={styles.actionIconBox}>
                    <Plus size={32} />
                  </Box>
                  <Stack gap="xs">
                    <LqText
                      variant="h3"
                      weight="black"
                      style={css({ textTransform: 'uppercase', letterSpacing: '0.05em' })}
                    >
                      Initiate
                    </LqText>
                    <LqText variant="symbolic" color="muted">
                      Strategic Focus Phase
                    </LqText>
                  </Stack>
                </Stack>
              </Surface>

              <Surface variant="glass" className={cn(styles.actionCard, styles.statsCombinedCard)}>
                <Stack p="xl" align="center" textAlign="center" gap="md">
                  <Box className={styles.actionIconBox}>
                    <Target size={32} />
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
                <Microscope size={24} className={styles.iconAccent} />
                <LqText variant="h3" weight="bold" className={styles.recentSectionTitle}>
                  Recent Analytical Records
                </LqText>
              </Flex>

              {investigations.length === 0 ? (
                <Surface variant="glass" p="xxl">
                  <Flex
                    direction="column"
                    align="center"
                    gap="lg"
                    style={css({ textAlign: 'center' })}
                  >
                    <Activity size={48} className={styles.iconMuted} />
                    <Stack gap="xs" align="center">
                      <LqText variant="h3" weight="bold">
                        Start with a focused question
                      </LqText>
                      <LqText variant="small" color="muted" className={styles.emptyStateText}>
                        Create an investigation, add the first source document or subject, then use
                        the readiness panel to move toward export.
                      </LqText>
                    </Stack>
                    <Flex gap="sm" wrap="wrap" justify="center">
                      <Button variant="primary" onClick={() => setShowNewInvestigationModal(true)}>
                        <Plus size={16} /> New Investigation
                      </Button>
                      <Button variant="secondary" onClick={() => navigate('/documents')}>
                        <Search size={16} /> Browse Documents
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
                      onClick={() => loadInvestigation(inv.id)}
                    >
                      <Stack style={css({ height: '100%' })}>
                        <Box p="lg">
                          <Flex justify="between" mb="md">
                            {getStatusBadge(inv.status)}
                            {(isAdmin || inv.leadInvestigator === currentUser.id) && (
                              <Button
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Purge this record?')) {
                                    fetch(`/api/investigations/${encodeURIComponent(inv.id)}`, {
                                      method: 'DELETE',
                                    }).then(() => loadInvestigations());
                                  }
                                }}
                              >
                                <XCircle size={14} />
                              </Button>
                            )}
                          </Flex>
                          <Stack gap="sm" className={styles.invCardBody}>
                            <LqText variant="body" weight="bold" className={styles.invTitle}>
                              {inv.title}
                            </LqText>
                            <LqText variant="xs" color="muted" className={styles.invDesc}>
                              {inv.description}
                            </LqText>
                          </Stack>
                        </Box>
                        <Surface variant="glass-highlight" mt="auto">
                          <Flex justify="between" p="md">
                            <Flex align="center" gap="xs">
                              <User size={12} className={styles.iconAccent} />
                              <LqText variant="xs" weight="bold">
                                {inv.leadInvestigator}
                              </LqText>
                            </Flex>
                            <Flex align="center" gap="xs">
                              <Calendar size={12} className={styles.iconMuted} />
                              <LqText variant="xs" color="muted">
                                {new Date(inv.createdAt).toLocaleDateString()}
                              </LqText>
                            </Flex>
                          </Flex>
                        </Surface>
                      </Stack>
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
        <MobileInvestigationShell
          currentUser={currentUser}
          selectedInvestigation={selectedInvestigation}
          timelineEvents={timelineEvents}
          evidenceItems={evidenceItems}
          investigationId={String(selectedInvestigation.id)}
          onInvestigationSelect={onInvestigationSelect}
        />
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
                  <ArrowRight className="rotate-180" size={16} /> Back to Dashboard
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
                    <Share2 size={14} />{' '}
                    {shareCopied ? 'Access Token Copied' : 'Share Investigation'}
                  </Button>
                </Stack>

                {renderCaseReadinessPanel(true)}

                <Stack gap="xs" className={styles.nav}>
                  {[
                    { id: 'board', label: 'Investigation Board', icon: LayoutDashboard },
                    { id: 'intelligence', label: 'Discovery Intelligence', icon: Cpu },
                    { id: 'overview', label: 'Intelligence Overview', icon: Search },
                    { id: 'activity', label: 'Activity Log', icon: Activity },
                    { id: 'casefolder', label: 'Primary Evidence Folder', icon: FolderOpen },
                    { id: 'evidence', label: 'Evidence Matrix', icon: FileText },
                    { id: 'hypotheses', label: 'Hypothesis Framework', icon: Target },
                    { id: 'notebook', label: 'Analyst Notebook', icon: FileText },
                    { id: 'financial', label: 'Financial Correlator', icon: DollarSign },
                    { id: 'timeline', label: 'Event Chronology', icon: Calendar },
                    { id: 'communications', label: 'Comms Analysis', icon: MessageSquare },
                    { id: 'forensic', label: 'Forensic Workbench', icon: Microscope },
                    { id: 'team', label: 'Asset Management', icon: Users },
                    { id: 'analytics', label: 'Signal Intelligence', icon: BarChart3 },
                    { id: 'export', label: 'Final Report / Export', icon: Download },
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
                        <t.icon size={18} className={styles.navIcon} />
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
                </Stack>
              </Stack>
            </Surface>
          </Box>

          {/* Main Content Area (Restored Flow) */}
          <Box grow className={styles.mainContent}>
            <Box p="xl" className={styles.scrollArea}>
              {activeTab === 'board' && (
                <InvestigationBoard investigationId={selectedInvestigation.id} />
              )}
              {activeTab === 'intelligence' && (
                <AgenticDiscoveryBoard investigationId={selectedInvestigation.id} />
              )}
              {activeTab === 'overview' && (
                <Stack gap="xl">
                  <LqText variant="h3" weight="bold" className={styles.tabTitle}>
                    <Search
                      size={20}
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
                            <Clock size={14} className={styles.iconMuted} />
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
                      lastRefresh: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
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
                            This case has no evidence yet. Start from the case folder or document
                            browser so export/report tools have material to package.
                          </LqText>
                        </Stack>
                        <Flex gap="sm" wrap="wrap">
                          <Button variant="primary" onClick={() => navigateToTab('casefolder')}>
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
                      <Loader2 className="animate-spin text-primary" size={48} />
                    </Flex>
                  ) : (
                    <NetworkVisualization nodes={networkNodes} edges={networkEdges} height={700} />
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
                        Compress all investigative signal data into an encrypted evidence packet.
                      </LqText>
                      <EvidencePacketExporter
                        investigationId={selectedInvestigation.id}
                        investigationTitle={selectedInvestigation.title}
                        evidence={evidenceItems}
                        timelineEvents={timelineEvents}
                        hypotheses={hypotheses}
                        annotations={annotations}
                        onExport={(f, _) =>
                          addToast({ text: `Export complete: ${f.toUpperCase()}`, type: 'success' })
                        }
                      />
                    </Stack>
                  </Surface>
                </Stack>
              )}
            </Box>
          </Box>
        </Flex>
      )}

      {/* Unified Modal Suite (Simplified styles via Liquid Glass) */}
      {showNewInvestigationModal && (
        <Box className={styles.modalOverlay} onClick={() => setShowNewInvestigationModal(false)}>
          <Box className={styles.modalBackdrop} />
          <Surface
            variant="panel"
            width={480}
            p="xxxl"
            className={styles.modalPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <Stack gap="xl">
              <Stack gap="xs">
                <LqText variant="h2" weight="bold">
                  Initialize Analytical Track
                </LqText>
                <LqText
                  variant="xs"
                  color="muted"
                  style={css({ textTransform: 'uppercase' })}
                  weight="bold"
                >
                  Strategic Archive Penetration Protocol
                </LqText>
              </Stack>
              <Stack gap="lg">
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    TITLE
                  </LqText>
                  <Input
                    style={css({
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                    })}
                    placeholder="Brief case title..."
                    value={newInvestigation.title}
                    onChange={(e) =>
                      setNewInvestigation({ ...newInvestigation, title: e.target.value })
                    }
                  />
                </Stack>
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    BRIEF DESCRIPTION
                  </LqText>
                  <TextArea
                    style={css({
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                      resize: 'none',
                    })}
                    rows={3}
                    placeholder="Initial goals and scope..."
                    value={newInvestigation.description}
                    onChange={(e) =>
                      setNewInvestigation({ ...newInvestigation, description: e.target.value })
                    }
                  />
                </Stack>
              </Stack>
              <Flex gap="md" mt="md" justify="end">
                <Button variant="ghost" onClick={() => setShowNewInvestigationModal(false)}>
                  Cancel Phase
                </Button>
                <Button
                  variant="secondary"
                  onClick={createInvestigation}
                  disabled={!newInvestigation.title}
                >
                  Initiate
                </Button>
              </Flex>
            </Stack>
          </Surface>
        </Box>
      )}

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

      {/* Onboarding Overlay (Rendered last for correct stacking) */}
      {showImportModal && (
        <Box className={styles.importOverlay} onClick={() => setShowImportModal(false)}>
          <Surface p="xl" variant="glass-strong" style={css({ maxWidth: 500 })}>
            <Stack gap="md">
              <LqText variant="h3">Import Forensic Records</LqText>
              <LqText variant="body" color="muted">
                The high-speed JSON/PDF migration corridor is active. Select your source DOJ volume.
              </LqText>
              <Flex justify="end" gap="sm">
                <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary">Authenticate & Ingest</Button>
              </Flex>
            </Stack>
          </Surface>
        </Box>
      )}

      {!hasSeenOnboarding && !selectedInvestigation && (
        <InvestigationOnboarding onComplete={markOnboardingAsSeen} onSkip={markOnboardingAsSeen} />
      )}
    </Box>
  );
};
