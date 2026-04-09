import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Investigation,
  EvidenceItem,
  TimelineEvent,
  Annotation,
  Investigator,
} from '../../types/investigation';
// EvidenceChainService available for future chain-of-custody workflow extensions
// import { EvidenceChainService } from '../../services/evidenceChainService';
import {
  Calendar,
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
  Network,
  DollarSign,
  MessageSquare,
  LayoutDashboard,
  Activity,
  FolderOpen,
  Flag,
  BookOpen,
  Upload,
  Crosshair,
} from 'lucide-react';
import FinancialTransactionMapper from '../visualizations/FinancialTransactionMapper';
import { ChainOfCustodyModal } from './ChainOfCustodyModal';
import {
  NetworkVisualization,
  NetworkNode,
  NetworkEdge,
} from '../visualizations/NetworkVisualization';
import { InvestigationTimelineBuilder } from './InvestigationTimelineBuilder';
import { InvestigationExportTools } from './InvestigationExportTools';
import { ForensicAnalysisWorkspace } from './ForensicAnalysisWorkspace';
import { useInvestigationOnboarding } from '../../hooks/useInvestigationOnboarding';
import { useScrollLock } from '../../hooks/useScrollLock';
import { InvestigationOnboarding } from './InvestigationOnboarding';
import { useLocation, useNavigate } from 'react-router-dom';
import { DataIntegrityPanel } from '../visualizations/DataIntegrityPanel';
import { EvidencePacketExporter } from './EvidencePacketExporter';
import { InvestigationTasksPanel } from './InvestigationTasksPanel';
import { InvestigationMemoryPanel } from './InvestigationMemoryPanel';
import { InvestigationEvidencePanel } from './InvestigationEvidencePanel';
import { EvidenceNotebook } from './EvidenceNotebook';
import { HypothesisTestingFramework } from './HypothesisTestingFramework';
import { InvestigationTeamManagement } from './InvestigationTeamManagement';
import { InvestigationBoard } from './InvestigationBoard';
import { InvestigationLeadsPanel } from './InvestigationLeadsPanel';
import { SubjectDossierPanel } from './SubjectDossierPanel';
import { useToasts } from '../common/useToasts';
import { CollapsibleSplitPane } from '../common/CollapsibleSplitPane';
import { CreateRelationshipModal } from '../entities/CreateRelationshipModal';
import { CommunicationAnalysis } from './CommunicationAnalysis';
import { InvestigationActivityFeed } from './InvestigationActivityFeed';
import { InvestigationCaseFolder } from './InvestigationCaseFolder';
import { DocumentModal } from '../documents/DocumentModal';
import { EvidenceModal } from '../common/EvidenceModal';
import { apiClient } from '../../services/apiClient';
import type {
  InvestigationCaseEvidenceItemDto,
  InvestigationEvidenceByTypeResponseDto,
} from '@shared/dto/investigations';
import type { EntityListItemDto } from '@shared/dto/entities';
import {
  investigationActions,
  investigationsApi,
  normalizeEvidenceListItem,
  useCaseFolder,
  useEvidenceNavigation,
  useInvestigationList,
} from '../../domains/investigations';
import type { Hypothesis } from '../../types/investigation';
import styles from './InvestigationWorkspace.module.css';

/** Shape of a raw timeline event row returned by the timeline-events API. */
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

/** Minimal shape of a graph-node returned by /api/entities/:id/graph */
interface RawGraphNode {
  id: number | string;
  label: string;
  type?: string;
}

/** Minimal shape of a graph-edge returned by /api/entities/:id/graph */
interface RawGraphEdge {
  source_id: number | string;
  target_id: number | string;
  relationship_type?: string;
  proximity_score?: number;
  confidence?: number;
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

const NETWORK_NODE_TYPES = [
  'person',
  'document',
  'organization',
  'location',
  'event',
  'evidence',
] as const;
type NetworkNodeType = (typeof NETWORK_NODE_TYPES)[number];
function toNetworkNodeType(raw: string): NetworkNodeType {
  const lower = raw.toLowerCase() as NetworkNodeType;
  return NETWORK_NODE_TYPES.includes(lower) ? lower : 'person';
}

const NETWORK_EDGE_TYPES = [
  'connection',
  'communication',
  'financial',
  'legal',
  'family',
  'business',
  'evidence',
] as const;
type NetworkEdgeType = (typeof NETWORK_EDGE_TYPES)[number];
function toNetworkEdgeType(raw: string): NetworkEdgeType {
  const lower = raw.toLowerCase() as NetworkEdgeType;
  return NETWORK_EDGE_TYPES.includes(lower) ? lower : 'connection';
}

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

  const {
    investigations,
    setInvestigations,
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
  useScrollLock(showNewInvestigationModal);
  const [showCreateRelationshipModal, setShowCreateRelationshipModal] = useState(false);
  const [newInvestigation, setNewInvestigation] = useState<{
    title: string;
    description: string;
    hypothesis: string;
    priority: Investigation['priority'];
    dueDate: string;
  }>({
    title: '',
    description: '',
    hypothesis: '',
    priority: 'medium',
    dueDate: '',
  });
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [annotations, _setAnnotations] = useState<Annotation[]>([]);
  const [_evidenceLoading, setEvidenceLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [selectedNetworkNode, setSelectedNetworkNode] = useState<NetworkNode | null>(null);
  const [selectedNetworkEdge, setSelectedNetworkEdge] = useState<NetworkEdge | null>(null);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [networkEdges, setNetworkEdges] = useState<NetworkEdge[]>([]);
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
  const [analyticsRange, setAnalyticsRange] = useState<'30d' | '90d' | 'all'>('90d');
  const [analyticsSourceType, setAnalyticsSourceType] = useState<
    'all' | 'document' | 'entity' | 'media'
  >('all');
  const [analyticsIncludeAgentic, setAnalyticsIncludeAgentic] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState({
    overview: false,
    trends: false,
    signals: false,
  });
  const [analyticsData, setAnalyticsData] = useState<{
    kpis: {
      evidenceItems: number;
      timelineEvents: number;
      entitiesLinked: number;
      documentsLinked: number;
    };
    topSources: Array<{ type: string; count: number }>;
    evidenceTimeline: Array<{ day: string; count: number }>;
    sourceActivity: Array<{ source: string; count: number }>;
    spikes: Array<{ day: string; count: number }>;
    highRiskEntities: Array<{ id: string; name: string; score: number }>;
    strongestConnections: Array<{ source: string; target: string; confidence: number }>;
    citedDocuments: Array<{ id: string; title: string; mentions: number }>;
  }>({
    kpis: { evidenceItems: 0, timelineEvents: 0, entitiesLinked: 0, documentsLinked: 0 },
    topSources: [],
    evidenceTimeline: [],
    sourceActivity: [],
    spikes: [],
    highRiskEntities: [],
    strongestConnections: [],
    citedDocuments: [],
  });
  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showLeadsPanel, setShowLeadsPanel] = useState(false);
  const [showDossierPanel, setShowDossierPanel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMarkdown, setImportMarkdown] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [custodyEvidenceId, setCustodyEvidenceId] = useState<string | null>(null);

  // Determine active tab from URL
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
    | 'casefolder';

  const getActiveTab = (): ActiveTab => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as ActiveTab | null;
    const did = params.get('docId');

    if (did) return 'forensic'; // Special handling for docId
    if (
      tab &&
      [
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
        'casefolder',
      ].includes(tab)
    ) {
      return tab;
    }
    return 'overview'; // default
  };

  const activeTab = getActiveTab();
  const {
    caseFolder,
    loading: caseFolderLoading,
    error: caseFolderError,
    reload: reloadCaseFolder,
  } = useCaseFolder(selectedInvestigation?.id, { enabled: !!selectedInvestigation });

  const mobileTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'casefolder', label: 'Case Folder' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'hypotheses', label: 'Hypotheses' },
    { id: 'notebook', label: 'Notebook' },
    { id: 'financial', label: 'Financial' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'communications', label: 'Communications' },
    { id: 'forensic', label: 'Forensic' },
    { id: 'team', label: 'Team' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'export', label: 'Export' },
  ] as const;

  const desktopTabs = [
    { id: 'board', label: 'Investigation Board', icon: LayoutDashboard },
    { id: 'overview', label: 'Overview', icon: Search },
    { id: 'activity', label: 'Activity Feed', icon: Activity },
    { id: 'casefolder', label: 'Case Folder', icon: FolderOpen },
    { id: 'evidence', label: 'Evidence', icon: FileText },
    { id: 'hypotheses', label: 'Hypotheses', icon: Target },
    { id: 'notebook', label: 'Notebook', icon: FileText },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'communications', label: 'Communications', icon: MessageSquare },
    { id: 'forensic', label: 'Forensic', icon: Microscope },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'export', label: 'Export', icon: Download },
  ] as const;

  // Navigate to a tab
  const navigateToTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(location.search);
      params.set('tab', tab);
      navigate(`${location.pathname}?${params.toString()}`);
    },
    [location.pathname, location.search, navigate],
  );

  const loadInvestigation = useCallback(
    async (id: string) => {
      try {
        const loaded = await loadInvestigationFromDomain(id);
        if (!loaded) return;
        const { investigation, raw: inv } = loaded;

        // Update URL to shareable investigation path
        const shareId = inv.uuid || inv.id;
        navigate(`/investigations/${shareId}`, { replace: true });

        // Fetch timeline events
        try {
          const timelineData = await investigationsApi.getTimelineEvents(String(id));
          const events = ((timelineData as RawTimelineEvent[]) || []).map((e) => ({
            id: String(e.id),
            title: e.title,
            startDate: new Date(e.start_date),
            description: e.description || '',
            type: toTimelineEventType(e.type),
            confidence: Number(e.confidence || 80),
            entities: (() => {
              try {
                return JSON.parse(e.entities_json || '[]') as string[];
              } catch {
                return [];
              }
            })(),
            documents: (() => {
              try {
                return JSON.parse(e.documents_json || '[]') as string[];
              } catch {
                return [];
              }
            })(),
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
        } catch (err) {
          console.error('Error fetching timeline events:', err);
        }

        if (onInvestigationSelect) onInvestigationSelect(investigation);
      } catch (error) {
        console.error('Error loading investigation:', error);
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
      console.error('Error fetching evidence:', error);
    } finally {
      setEvidenceLoading(false);
    }
  }, []);

  // Copy shareable URL to clipboard
  const copyShareUrl = () => {
    if (selectedInvestigation) {
      // Use uuid if available (format: maxwell-epstein-network-001), otherwise use id
      const shareId = selectedInvestigation.uuid || selectedInvestigation.id;
      const shareUrl = `${window.location.origin}/investigations/${shareId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  };
  // Handle special URL parameters (focus on entity)
  useEffect(() => {
    let cancelled = false;
    try {
      const params = new URLSearchParams(location.search);
      const focusId = params.get('focus');

      if (focusId) {
        // If focusing on an entity, ensure we're on the analytics tab
        const tab = params.get('tab');
        if (!tab) {
          navigateToTab('analytics');
        }

        // Fetch validity of the ID and get details
        apiClient
          .get<EntityListItemDto>(`/entities/${focusId}`)
          .then((entity) => {
            if (!cancelled && entity) {
              const node: NetworkNode = {
                id: String(entity.id),
                type:
                  entity.entityType === 'ORGANIZATION'
                    ? 'organization'
                    : entity.entityType === 'LOCATION'
                      ? 'location'
                      : 'person',
                label: entity.fullName,
                description: entity.primaryRole || 'Person of Interest',
                importance: entity.redFlagRating || 0,
                metadata: {
                  mentions: entity.mentions || 0,
                  riskLevel:
                    (entity.redFlagRating || 0) >= 5
                      ? 'critical'
                      : (entity.redFlagRating || 0) >= 4
                        ? 'high'
                        : (entity.redFlagRating || 0) >= 2
                          ? 'medium'
                          : 'low',
                  category: entity.primaryRole || 'Person of Interest',
                  documents: [],
                  connections: [],
                },
              };
              setSelectedNetworkNode(node);
            }
          })
          .catch((err) => console.error('Error fetching focused entity:', err));
      }

      // Auto-select first investigation if needed - DISABLED to show dashboard
      // if (!selectedInvestigation && investigations.length > 0) {
      //   setSelectedInvestigation(investigations[0]);
      // }
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
    }
    return () => {
      cancelled = true;
    };
  }, [
    location.search,
    investigations.length,
    selectedInvestigation,
    investigations,
    navigateToTab,
  ]);

  // Handle "Add to Investigation" custom event
  useEffect(() => {
    const handleAddToInvestigation = async (event: CustomEvent) => {
      const { investigationId, item, relevance } = event.detail;

      // If no investigation ID provided, use the currently selected one if available
      const targetInvestigationId = investigationId || selectedInvestigation?.id;

      if (!targetInvestigationId) {
        // Prompt user to select investigation or create new one (could be improved)
        addToast({ text: 'Please select an investigation first.', type: 'error' });
        return;
      }

      try {
        await investigationActions.addEvidence(String(targetInvestigationId), {
          title: item.title,
          description: item.description,
          type: item.type,
          sourceId: item.sourceId,
          documentId: item.sourceId,
          relevance: relevance || 'high',
        });

        // If we are currently viewing this investigation, refresh evidence + case folder
        if (selectedInvestigation?.id === String(targetInvestigationId)) {
          await loadEvidenceItems(String(targetInvestigationId));
          await reloadCaseFolder();
        }
        addToast({ text: 'Item added to investigation successfully.', type: 'success' });
      } catch (error) {
        console.error('Error adding to investigation:', error);
        addToast({ text: 'Error adding item to investigation.', type: 'error' });
      }
    };

    window.addEventListener(
      'add-to-investigation',
      handleAddToInvestigation as unknown as EventListener,
    );
    return () => {
      window.removeEventListener(
        'add-to-investigation',
        handleAddToInvestigation as unknown as EventListener,
      );
    };
  }, [addToast, loadEvidenceItems, reloadCaseFolder, selectedInvestigation]);

  // Investigation onboarding hook
  const { hasSeenOnboarding, markOnboardingAsSeen } = useInvestigationOnboarding();

  useEffect(() => {
    loadInvestigations();
  }, [loadInvestigations]);

  useEffect(() => {
    if (!selectedInvestigation) return;
    void loadEvidenceItems(String(selectedInvestigation.id));
  }, [loadEvidenceItems, selectedInvestigation]);

  const closeCaseFolderDocumentModal = useCallback(() => {
    setCaseFolderDocumentId(null);
    if (caseFolderFocusReturnEl && typeof caseFolderFocusReturnEl.focus === 'function') {
      caseFolderFocusReturnEl.focus();
    }
  }, [caseFolderFocusReturnEl]);

  const closeCaseFolderEntityModal = useCallback(() => {
    setCaseFolderEntityId(null);
    if (caseFolderFocusReturnEl && typeof caseFolderFocusReturnEl.focus === 'function') {
      caseFolderFocusReturnEl.focus();
    }
  }, [caseFolderFocusReturnEl]);

  const handleCaseFolderEvidenceClick = useCallback(
    async (item: InvestigationCaseEvidenceItemDto, triggerEl?: HTMLElement | null) => {
      if (!selectedInvestigation) return;
      return investigationActions.openEvidence(item, {
        navigate,
        setDocumentId: (id) => setCaseFolderDocumentId(String(id)),
        setEntityId: (id) => setCaseFolderEntityId(String(id)),
        setFocusReturnEl: setCaseFolderFocusReturnEl,
        triggerEl,
        addToast,
        isAdmin,
        onRemoveBrokenLink: async (investigationEvidenceId: number) => {
          try {
            await investigationsApi.removeEvidenceLink(investigationEvidenceId);
            await reloadCaseFolder();
            addToast({ text: 'Broken evidence link removed.', type: 'success' });
          } catch (error) {
            console.error('Failed to remove broken evidence link:', error);
            addToast({ text: 'Failed to remove broken evidence link.', type: 'error' });
          }
        },
      });
    },
    [addToast, isAdmin, navigate, reloadCaseFolder, selectedInvestigation],
  );

  const { deepLinkedEvidenceId } = useEvidenceNavigation({
    selectedInvestigationId: selectedInvestigation ? String(selectedInvestigation.id) : null,
    location,
    activeTab,
    navigateToTab,
    loadCaseFolder: reloadCaseFolder,
    openEvidence: async (item, triggerEl) => {
      const result = await handleCaseFolderEvidenceClick(
        item as InvestigationCaseEvidenceItemDto,
        triggerEl,
      );
      return result || false;
    },
    addToast: ({ text, type }) => addToast({ text, type }),
  });

  const handleTimelineOpenSource = useCallback(
    (event: TimelineEvent) => {
      const primaryDocument = Array.isArray(event.documents) ? event.documents[0] : null;
      if (primaryDocument) {
        const evidenceMatch = evidenceItems.find((item) => item.id === String(primaryDocument));
        if (evidenceMatch?.type === 'entity') {
          setCaseFolderEntityId(String(evidenceMatch.sourceId || primaryDocument));
          return;
        }
        const documentId = evidenceMatch?.sourceId || String(primaryDocument);
        setCaseFolderDocumentId(documentId);
        return;
      }

      const primaryEntity = Array.isArray(event.entities) ? event.entities[0] : null;
      if (primaryEntity) {
        setCaseFolderEntityId(String(primaryEntity));
        return;
      }

      addToast({
        text: 'No linked source on this timeline event yet.',
        type: 'info',
      });
    },
    [addToast, evidenceItems],
  );

  useEffect(() => {
    if (import.meta.env.PROD) return;
    const checkAffordances = () => {
      const root = document.querySelector('.investigation-workspace');
      if (!root) return;
      const suspiciousLabels = ['coming soon', 'not implemented', 'todo', 'placeholder'];
      const candidates = Array.from(root.querySelectorAll('button, a, [role="button"]'));
      candidates.forEach((el) => {
        const text = (el.textContent || '').trim().toLowerCase();
        if (!text) return;
        const isSuspicious = suspiciousLabels.some((token) => text.includes(token));
        const disabled =
          (el as HTMLButtonElement).disabled ||
          el.getAttribute('aria-disabled') === 'true' ||
          el.hasAttribute('disabled');
        const explicitlyGated =
          (el.getAttribute('title') || '').toLowerCase().includes('not available yet') ||
          (el.getAttribute('data-gated-reason') || '').trim().length > 0;
        if (isSuspicious && !disabled && !explicitlyGated) {
          // eslint-disable-next-line no-console
          console.warn(
            '[Investigations invariant] Suspicious interactive label without gating:',
            text,
            el,
          );
        }
      });
    };
    const handle = window.requestAnimationFrame(checkAffordances);
    return () => window.cancelAnimationFrame(handle);
  }, [activeTab, location.pathname, selectedInvestigation]);

  useEffect(() => {
    if (investigationId) {
      loadInvestigation(investigationId);
    }
  }, [investigationId, loadInvestigation]);

  // Fetch real network data and database stats
  useEffect(() => {
    const fetchNetworkData = async () => {
      if (activeTab !== 'analytics') return;
      try {
        const { PerformanceMonitor } = await import('../../utils/performanceMonitor');
        PerformanceMonitor.mark('investigation-network-fetch-start');
        let entities: EntityListItemDto[] = [];

        if (useGlobalContext) {
          // Fetch top global entities
          const entitiesResp = await fetch(
            '/api/entities?limit=100&sortBy=red_flag_rating&sortOrder=desc',
          );
          const entitiesData = (await entitiesResp.json()) as { data?: EntityListItemDto[] };
          entities = entitiesData.data || [];
        } else {
          // Fetch entities scoped to investigation evidence
          // Filter evidenceItems for entities
          const entityEvidence = evidenceItems.filter(
            (e) => e.type === 'entity' || e.type === 'person' || e.type === 'organization',
          );

          if (entityEvidence.length > 0) {
            // Fetch details for each entity
            const cappedEvidence = entityEvidence.slice(0, 100);
            const entityPromises = cappedEvidence.map((e) =>
              fetch(`/api/entities/${e.sourceId}`).then((r) =>
                r.ok ? (r.json() as Promise<EntityListItemDto>) : null,
              ),
            );
            const results = await Promise.all(entityPromises);
            entities = results.filter((e): e is EntityListItemDto => e !== null);
          }
        }

        // Transform entities to network nodes
        const nodes: NetworkNode[] = entities.map((e) => ({
          id: String(e.id),
          type: toNetworkNodeType(e.entityType || 'person'),
          label: e.fullName,
          description: e.primaryRole || 'Person of Interest',
          importance: e.redFlagRating || 0,
          metadata: {
            mentions: e.mentions || 0,
            riskLevel:
              (e.redFlagRating || 0) >= 4
                ? 'critical'
                : (e.redFlagRating || 0) >= 3
                  ? 'high'
                  : (e.redFlagRating || 0) >= 2
                    ? 'medium'
                    : 'low',
            category: e.primaryRole || 'Person of Interest',
          },
        }));

        const edges: NetworkEdge[] = [];

        // If we are in analytics tab or use global context, ensure Jeffrey Epstein (ID 1) is present
        // and fetch his immediate network to build a richer graph.
        const epsteinId = '1';
        if (!nodes.find((n) => n.id === epsteinId)) {
          try {
            const epsteinResp = await fetch(`/api/entities/${epsteinId}`);
            if (epsteinResp.ok) {
              const e = await epsteinResp.json();
              nodes.push({
                id: String(e.id),
                type: 'person',
                label: e.fullName || e.name,
                description: 'Primary Subject',
                importance: 5,
                metadata: {
                  mentions: e.mentions || 0,
                  riskLevel: 'critical',
                  category: 'High Value Target',
                },
              });
            }
          } catch (_e) {
            console.warn('Could not fetch Epstein root node');
          }
        }

        // Fetch a broader graph slice to make the "Hops" filter useful
        // We'll fetch the graph for Epstein up to 1 hop by default (depth=1)
        try {
          const graphResp = await fetch(`/api/entities/${epsteinId}/graph?depth=1`);
          if (graphResp.ok) {
            const graphData = (await graphResp.json()) as {
              nodes: RawGraphNode[];
              edges: RawGraphEdge[];
            };

            // Merge nodes
            graphData.nodes.forEach((gn) => {
              if (!nodes.find((n) => n.id === String(gn.id))) {
                nodes.push({
                  id: String(gn.id),
                  label: gn.label,
                  type: toNetworkNodeType(gn.type || 'person'),
                  importance: 1,
                  metadata: { category: 'Connected Entity' },
                });
              }
            });

            // Merge edges
            graphData.edges.forEach((ge) => {
              const edgeId = `graph-edge-${ge.source_id}-${ge.target_id}`;
              if (!edges.find((e) => e.id === edgeId)) {
                edges.push({
                  id: edgeId,
                  source: String(ge.source_id),
                  target: String(ge.target_id),
                  type: toNetworkEdgeType(ge.relationship_type || 'connection'),
                  strength: Math.min(10, Math.round((ge.proximity_score ?? 0) * 10) || 5),
                  metadata: {
                    confidence: ge.confidence || 0.8,
                    context: ge.relationship_type,
                  },
                });
              }
            });
          }
        } catch (e) {
          console.warn('Could not fetch Epstein graph slice', e);
        }

        setNetworkNodes(nodes);
        setNetworkEdges(edges);
        PerformanceMonitor.mark('investigation-network-fetch-end');
        PerformanceMonitor.measure(
          'investigation-network-fetch-duration',
          'investigation-network-fetch-start',
          'investigation-network-fetch-end',
        );

        // Fetch database stats
        const statsResp = await fetch('/api/stats');
        const stats = await statsResp.json();
        setDbStats({
          totalEntities: stats.totalEntities || 0,
          totalDocuments: stats.totalDocuments || 0,
          entitiesWithDocuments: stats.entitiesWithDocuments || 0,
          documentsWithMetadata: stats.documentsWithMetadata || 0,
        });
      } catch (error) {
        console.error('Error fetching network data:', error);
        // Set empty arrays on error; never inject fallback records
        setNetworkNodes([]);
        setNetworkEdges([]);
      }
    };

    if (selectedInvestigation) {
      fetchNetworkData();
    }
  }, [
    activeTab,
    selectedInvestigation?.id,
    evidenceItems,
    useGlobalContext,
    selectedInvestigation,
  ]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (activeTab !== 'analytics' || !selectedInvestigation) return;
      setAnalyticsLoading({ overview: true, trends: true, signals: true });
      try {
        const evidenceByTypeResp = await fetch(
          `/api/investigations/${selectedInvestigation.id}/evidence-by-type`,
        );
        const evidenceByType: InvestigationEvidenceByTypeResponseDto = evidenceByTypeResp.ok
          ? ((await evidenceByTypeResp.json()) as InvestigationEvidenceByTypeResponseDto)
          : { all: [], byType: {}, counts: {}, total: 0 };
        const allEvidence = Array.isArray(evidenceByType?.all) ? evidenceByType.all : [];
        const rangeDays = analyticsRange === '30d' ? 30 : analyticsRange === '90d' ? 90 : null;
        const rangeStart = rangeDays ? Date.now() - rangeDays * 24 * 60 * 60 * 1000 : null;

        const filteredEvidence = allEvidence.filter((item) => {
          const addedAt = item?.addedAt ? new Date(item.addedAt).getTime() : null;
          const inRange = rangeStart ? !!addedAt && addedAt >= rangeStart : true;
          const sourcePass =
            analyticsSourceType === 'all' ||
            String(item?.targetType || item?.type || '')
              .toLowerCase()
              .includes(analyticsSourceType);
          const agenticPass = analyticsIncludeAgentic
            ? true
            : !String(item?.addedBy || '')
                .toLowerCase()
                .includes('agent');
          return inRange && sourcePass && agenticPass;
        });

        const documentLinked = filteredEvidence.filter(
          (item) => item?.targetType === 'document',
        ).length;
        const entityLinked = filteredEvidence.filter(
          (item) => item?.targetType === 'entity',
        ).length;

        const topSourcesMap = new Map<string, number>();
        filteredEvidence.forEach((item) => {
          const t = String(item?.type || item?.targetType || 'unknown').toLowerCase();
          topSourcesMap.set(t, (topSourcesMap.get(t) || 0) + 1);
        });
        const topSources = Array.from(topSourcesMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const evidenceTimelineMap = new Map<string, number>();
        filteredEvidence.forEach((item) => {
          const raw = item?.addedAt;
          if (!raw) return;
          const day = new Date(raw).toISOString().slice(0, 10);
          evidenceTimelineMap.set(day, (evidenceTimelineMap.get(day) || 0) + 1);
        });
        const evidenceTimeline = Array.from(evidenceTimelineMap.entries())
          .map(([day, count]) => ({ day, count }))
          .sort((a, b) => a.day.localeCompare(b.day))
          .slice(-20);

        const spikes = evidenceTimeline.filter((point) => point.count >= 5);

        const sourceActivity = topSources.slice(0, 6).map((row) => ({
          source: row.type,
          count: row.count,
        }));

        const highRiskEntities = networkNodes
          .map((node) => ({
            id: node.id,
            name: node.label,
            score: Number(node.importance || 0),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        const strongestConnections = networkEdges
          .map((edge) => ({
            source: networkNodes.find((n) => n.id === edge.source)?.label || edge.source,
            target: networkNodes.find((n) => n.id === edge.target)?.label || edge.target,
            confidence: Math.round(((edge.metadata?.confidence as number) || 0) * 100),
          }))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 6);

        const citedDocumentsMap = new Map<
          string,
          { id: string; title: string; mentions: number }
        >();
        timelineEvents.forEach((event) => {
          (event.documents || []).forEach((docId) => {
            const key = String(docId);
            const existing = citedDocumentsMap.get(key);
            if (existing) {
              existing.mentions += 1;
            } else {
              const evidenceDoc = evidenceItems.find(
                (item) => item.id === key || item.sourceId === key,
              );
              citedDocumentsMap.set(key, {
                id: key,
                title: evidenceDoc?.title || `Document ${key}`,
                mentions: 1,
              });
            }
          });
        });

        setAnalyticsData({
          kpis: {
            evidenceItems: filteredEvidence.length,
            timelineEvents: timelineEvents.length,
            entitiesLinked: entityLinked,
            documentsLinked: documentLinked,
          },
          topSources,
          evidenceTimeline,
          sourceActivity,
          spikes,
          highRiskEntities,
          strongestConnections,
          citedDocuments: Array.from(citedDocumentsMap.values())
            .sort((a, b) => b.mentions - a.mentions)
            .slice(0, 5),
        });

        setAnalyticsLoading({ overview: false, trends: false, signals: false });
      } catch (error) {
        console.error('Error loading analytics:', error);
        setAnalyticsLoading({ overview: false, trends: false, signals: false });
        addToast({ text: 'Failed to load analytics summary.', type: 'error' });
      }
    };

    loadAnalytics();
  }, [
    activeTab,
    addToast,
    analyticsIncludeAgentic,
    analyticsRange,
    analyticsSourceType,
    evidenceItems,
    networkEdges,
    networkNodes,
    selectedInvestigation,
    timelineEvents,
  ]);
  const createInvestigation = async () => {
    if (!newInvestigation.title || !newInvestigation.description) {
      return;
    }

    try {
      const created = await createInvestigationFromDomain({
        title: newInvestigation.title,
        description: newInvestigation.description,
        hypothesis: newInvestigation.hypothesis,
      });
      setSelectedInvestigation(created.investigation);
      if (onInvestigationSelect) {
        onInvestigationSelect(created.investigation);
      }
      const shareId =
        (created.raw['uuid'] as string | undefined) || (created.raw['id'] as string | undefined);
      if (shareId) {
        navigate(`/investigations/${shareId}`, { replace: true });
      }
      await loadInvestigations();
      setShowNewInvestigationModal(false);
      setNewInvestigation({
        title: '',
        description: '',
        hypothesis: '',
        priority: 'medium',
        dueDate: '',
      });
    } catch (error) {
      console.error('Error creating investigation:', error);
      addToast({ text: 'Failed to create investigation.', type: 'error' });
    }
  };

  const getStatusColor = (status: Investigation['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-[var(--app-bg)] text-[var(--text-primary)]';
      default:
        return 'bg-[var(--app-bg)] text-[var(--text-primary)]';
    }
  };

  const getPriorityColor = (priority: Investigation['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-[var(--app-bg)] text-[var(--text-primary)]';
    }
  };

  const deleteTimelineEvent = async (eventId: string) => {
    if (!selectedInvestigation) return;
    try {
      await fetch(`/api/investigations/${selectedInvestigation.id}/timeline-events/${eventId}`, {
        method: 'DELETE',
      });
      // Refresh
      const timelineResp = await fetch(
        `/api/investigations/${selectedInvestigation.id}/timeline-events`,
      );
      if (timelineResp.ok) {
        const timelineData = (await timelineResp.json()) as RawTimelineEvent[];
        const events = timelineData.map((e) => ({
          id: String(e.id),
          title: e.title,
          startDate: new Date(e.start_date),
          description: e.description || '',
          type: toTimelineEventType(e.type),
          confidence: e.confidence || 80,
          documents: JSON.parse(e.documents_json || '[]') as string[],
          hypothesisIds: [], // Add if schema supports
          entities: JSON.parse(e.entities_json || '[]') as string[],
          evidence: [],
          importance: 'medium' as const,
          tags: [],
          sources: [],
          createdBy: 'system',
          createdAt: new Date(e.created_at || e.start_date || Date.now()),
          updatedAt: new Date(),
          layerId: 'default',
        }));
        setTimelineEvents(events);
      }
    } catch (e) {
      console.error('Error deleting event:', e);
    }
  };

  const saveTimelineEvent = async (event: Partial<TimelineEvent>) => {
    if (!selectedInvestigation) return;
    try {
      const isNew = !event.id || event.id.startsWith('event-');
      const url = isNew
        ? `/api/investigations/${selectedInvestigation.id}/timeline-events`
        : `/api/investigations/${selectedInvestigation.id}/timeline-events/${event.id}`;

      const method = isNew ? 'POST' : 'PATCH';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          type: event.type,
          startDate: event.startDate?.toISOString(),
          confidence: event.confidence,
          documents: event.documents,
          entities: event.entities,
        }),
      });

      // Refresh
      const timelineResp = await fetch(
        `/api/investigations/${selectedInvestigation.id}/timeline-events`,
      );
      if (timelineResp.ok) {
        const timelineData = (await timelineResp.json()) as RawTimelineEvent[];
        const events = timelineData.map((e) => ({
          id: String(e.id),
          title: e.title,
          startDate: new Date(e.start_date),
          description: e.description || '',
          type: toTimelineEventType(e.type),
          confidence: e.confidence || 80,
          documents: JSON.parse(e.documents_json || '[]') as string[],
          hypothesisIds: [],
          entities: JSON.parse(e.entities_json || '[]') as string[],
          evidence: [],
          importance: 'medium' as const,
          tags: [],
          sources: [],
          createdBy: 'system',
          createdAt: new Date(e.created_at || e.start_date || Date.now()),
          updatedAt: new Date(),
          layerId: 'default',
        }));
        setTimelineEvents(events);
      }
    } catch (e) {
      console.error('Error saving event:', e);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.tabLoading}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Investigation Onboarding Overlay */}
      {!hasSeenOnboarding && !selectedInvestigation && (
        <InvestigationOnboarding onComplete={markOnboardingAsSeen} onSkip={markOnboardingAsSeen} />
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitleGroup}>
            <h2 className={styles.headerTitle}>Investigation Workspace</h2>
            <p className={styles.headerSubtitle}>
              Collaborative investigation platform for journalists and researchers
            </p>
          </div>

          <div className={styles.headerActionGroup}>
            {selectedInvestigation && (
              <>
                <div className={styles.scopeSelector}>
                  <button
                    onClick={() => setUseGlobalContext(false)}
                    className={`${styles.scopeButton} ${
                      !useGlobalContext ? styles.scopeButtonActive : ''
                    }`}
                  >
                    Investigation Scope
                  </button>
                  <button
                    onClick={() => setUseGlobalContext(true)}
                    className={`${styles.scopeButton} ${
                      useGlobalContext ? styles.scopeButtonActive : ''
                    }`}
                  >
                    Global Context
                  </button>
                </div>
                <button onClick={() => setShowTasksPanel(true)} className={styles.auxButton}>
                  <Flag className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Tasks
                </button>
                <button onClick={() => setShowMemoryPanel(true)} className={styles.auxButton}>
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
                  Memory
                </button>
                <button
                  onClick={() => setShowLeadsPanel(true)}
                  className={`${styles.auxButton} ${styles.leadsButton}`}
                >
                  <Crosshair className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Leads
                </button>
                <button onClick={() => setShowDossierPanel(true)} className={styles.auxButton}>
                  <User className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                  Subject
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className={`${styles.auxButton} ${styles.importButton}`}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Import Report
                </button>
              </>
            )}

            {!selectedInvestigation && (
              <button
                onClick={() => setShowNewInvestigationModal(true)}
                className={styles.newInvButton}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>New Investigation</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Investigation Dashboard */}
      {!selectedInvestigation && (
        <div className={styles.dashboard}>
          <div className={styles.dashboardContent}>
            {/* Welcome / Hero Section */}
            <div className={styles.dashboardHero}>
              <h1 className={styles.dashboardHeroTitle}>Investigation Dashboard</h1>
              <p className={styles.dashboardHeroSubtitle}>
                Manage your investigations, organize evidence, and collaborate with your team.
                Select an active investigation below or start a new one.
              </p>
            </div>

            {/* Actions Grid */}
            <div className={styles.dashboardActions}>
              <button
                onClick={() => setShowNewInvestigationModal(true)}
                className={styles.actionCard}
              >
                <div className={styles.actionIconBox}>
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className={styles.actionCardTitle}>New Investigation</h3>
                <p className={styles.actionCardDesc}>
                  Start a fresh investigation. Define your hypothesis, set a scope, and begin
                  gathering evidence.
                </p>
              </button>

              <div className={styles.statsCombinedCard}>
                <div>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
                    {investigations.length} Active Investigations
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {investigations.filter((i) => i.status === 'active').length} active,{' '}
                    {investigations.filter((i) => i.status === 'review').length} in review
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Investigations List */}
            <div className={styles.recentSection}>
              <h2 className={styles.recentSectionTitle}>
                <Target className="w-6 h-6 text-[var(--text-muted)]" />
                Recent Investigations
              </h2>

              {investigations.length === 0 ? (
                <div className="text-center py-20 border border-[var(--glass-border)] rounded-[var(--radius-xl)] bg-[var(--glass-bg-strong)]/50 border-dashed">
                  <Microscope className="w-12 h-12 text-[var(--text-primary)] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[var(--text-secondary)]">
                    No investigations yet
                  </h3>
                  <p className="text-[var(--text-muted)] mt-2 max-w-sm mx-auto">
                    Your workspace is empty. Create your first investigation to start building your
                    case.
                  </p>
                </div>
              ) : (
                <div className={styles.recentGrid}>
                  {investigations.map((investigation) => (
                    <div
                      key={investigation.id}
                      className={styles.invCard}
                      onClick={() => loadInvestigation(investigation.id)}
                    >
                      <div className="flex-1">
                        <div className={styles.invCardHeader}>
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wide ${getStatusColor(investigation.status)}`}
                          >
                            {investigation.status}
                          </span>
                          {(isAdmin || investigation.leadInvestigator === currentUser.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm('Are you sure you want to delete this investigation?')
                                ) {
                                  fetch(`/api/investigations/${investigation.id}`, {
                                    method: 'DELETE',
                                  }).then(() => loadInvestigations());
                                }
                              }}
                              className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1"
                              title="Delete investigation"
                            >
                              <span className="sr-only">Delete</span>×
                            </button>
                          )}
                        </div>
                        <h3 className={styles.invTitle}>{investigation.title}</h3>
                        <p className={styles.invDesc}>{investigation.description}</p>
                      </div>

                      <div className={styles.invFooter}>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          <span>{investigation.leadInvestigator}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{investigation.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout - Column on mobile, Row on desktop */}
      {selectedInvestigation && (
        <div className={styles.layoutContainer}>
          {/* Mobile Navigation */}
          <div className={styles.mobileNav}>
            <div className={styles.mobileNavContent}>
              <button onClick={() => setSelectedInvestigation(null)} className={styles.backButton}>
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <div className={styles.mobileTabsScroll}>
                <div className={styles.mobileTabsList}>
                  {mobileTabs.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => navigateToTab(option.id)}
                      className={`${styles.mobileTab} ${
                        activeTab === option.id ? styles.mobileTabActive : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Pane (reusable collapsible + resizable component) */}
          <div className={styles.desktopSidebar}>
            <CollapsibleSplitPane
              mode="singleRight"
              left={null}
              right={
                <div className={styles.sidebarInner}>
                  <div className={styles.sidebarBackHeader}>
                    <button
                      onClick={() => setSelectedInvestigation(null)}
                      className={styles.backButton}
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      <span className="font-medium">Back to Dashboard</span>
                    </button>
                  </div>

                  <div className={styles.sidebarInvInfo}>
                    <h3 className={styles.sidebarInvTitle} title={selectedInvestigation.title}>
                      {selectedInvestigation.title}
                    </h3>
                    <button onClick={copyShareUrl} className={styles.shareButton}>
                      <Share2 className="w-3.5 h-3.5" />
                      {shareCopied ? 'Copied!' : 'Share'}
                    </button>
                  </div>

                  <nav className={styles.nav}>
                    {desktopTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => navigateToTab(tab.id)}
                        className={`${styles.navButton} ${
                          activeTab === tab.id ? styles.navButtonActive : ''
                        }`}
                        title={tab.label}
                      >
                        <tab.icon className={styles.navIcon} />
                        <span className="block truncate">{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              }
              collapsedRight={
                <div className="h-full py-4 flex flex-col items-center gap-3">
                  <button
                    onClick={() => setSelectedInvestigation(null)}
                    className="control h-8 w-8 p-0 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    aria-label="Back to dashboard"
                    title="Back to dashboard"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div className="h-px w-6 bg-[var(--glass-bg-highlight)]/80" />
                  {desktopTabs.map((tab) => (
                    <button
                      key={`collapsed-${tab.id}`}
                      onClick={() => navigateToTab(tab.id)}
                      className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-900/40 text-[var(--accent)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]/50'
                      }`}
                      title={tab.label}
                      aria-label={tab.label}
                    >
                      <tab.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              }
              defaultRightWidth={sidebarWidth}
              minRightWidth={280}
              maxRightWidth={460}
              collapsedWidth={84}
              rightCollapsed={sidebarCollapsed}
              onRightCollapsedChange={setSidebarCollapsed}
              onRightWidthChange={setSidebarWidth}
              dividerAriaLabel="Resize investigation navigation panel"
              collapseAriaLabel="Collapse investigation navigation panel"
              expandAriaLabel="Expand investigation navigation panel"
            />
          </div>

          {/* Main Content */}
          <div className={styles.mainContent}>
            {activeTab === 'board' && selectedInvestigation && (
              <InvestigationBoard investigationId={selectedInvestigation.id} />
            )}
            {activeTab === 'overview' && (
              <div className="max-w-4xl">
                <h3 className={styles.tabTitle}>Investigation Overview</h3>

                <div className={styles.overviewGrid}>
                  <div className={styles.infoBox}>
                    <h4 className={styles.infoLabel}>Hypothesis</h4>
                    <p className={styles.infoText}>{selectedInvestigation.hypothesis}</p>
                  </div>

                  <div className={styles.infoBox}>
                    <h4 className={styles.infoLabel}>Status & Priority</h4>
                    <div className="space-y-4">
                      <div className={styles.statusRow}>
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                            selectedInvestigation.status,
                          )}`}
                        >
                          {selectedInvestigation.status}
                        </span>
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(
                            selectedInvestigation.priority,
                          )}`}
                        >
                          {selectedInvestigation.priority} priority
                        </span>
                      </div>
                      {selectedInvestigation.dueDate && (
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            Due: {selectedInvestigation.dueDate.toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Data Integrity Panel */}
                <div className="mb-8">
                  <DataIntegrityPanel
                    stats={{
                      entitiesWithDocuments: dbStats.entitiesWithDocuments,
                      totalEntities: dbStats.totalEntities,
                      documentsWithMetadata: dbStats.documentsWithMetadata,
                      totalDocuments: dbStats.totalDocuments,
                      lastRefresh: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
                    }}
                  />
                </div>

                <div>
                  <h4 className={styles.infoLabel}>Recent Activity</h4>
                  <div className={styles.infoBox}>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center border border-[var(--accent)]/30">
                        <User className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div>
                        <p className="text-[var(--text-primary)] text-sm">
                          Investigation created by{' '}
                          <span className="text-[var(--text-primary)] font-medium">
                            {selectedInvestigation.leadInvestigator}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {selectedInvestigation.createdAt.toLocaleDateString()} at{' '}
                          {selectedInvestigation.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && selectedInvestigation && (
              <InvestigationActivityFeed investigationId={selectedInvestigation.id} />
            )}

            {activeTab === 'casefolder' && selectedInvestigation && (
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

            {activeTab === 'evidence' && selectedInvestigation && (
              <div>
                <InvestigationEvidencePanel
                  investigationId={selectedInvestigation.id}
                  onChainOfCustody={(id) => setCustodyEvidenceId(id)}
                />
              </div>
            )}

            {activeTab === 'hypotheses' && (
              <HypothesisTestingFramework
                investigationId={selectedInvestigation.id}
                initialHypothesis={selectedInvestigation.hypothesis}
                evidenceItems={evidenceItems}
                onHypothesesUpdate={(updated) => setHypotheses(updated as Hypothesis[])}
              />
            )}
            {activeTab === 'notebook' && selectedInvestigation && (
              <div>
                <EvidenceNotebook investigationId={Number(selectedInvestigation.id)} />
              </div>
            )}

            {activeTab === 'financial' && (
              <FinancialTransactionMapper
                investigationId={useGlobalContext ? undefined : selectedInvestigation?.id}
              />
            )}

            {activeTab === 'communications' && selectedInvestigation && (
              <CommunicationAnalysis
                investigation={selectedInvestigation}
                evidence={evidenceItems}
                onOpenCaseFolder={() => navigateToTab('casefolder')}
              />
            )}

            {activeTab === 'timeline' && selectedInvestigation && (
              <InvestigationTimelineBuilder
                investigation={selectedInvestigation}
                events={timelineEvents}
                evidence={evidenceItems}
                hypotheses={hypotheses}
                onEventsUpdate={setTimelineEvents}
                onSaveEvent={saveTimelineEvent}
                onDeleteEvent={deleteTimelineEvent}
                onOpenSource={handleTimelineOpenSource}
              />
            )}

            {activeTab === 'forensic' && selectedInvestigation && (
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
                onTeamUpdate={(updatedInvestigation) => {
                  setSelectedInvestigation(updatedInvestigation);
                  // Update the investigations list as well
                  setInvestigations(
                    investigations.map((inv) =>
                      inv.id === updatedInvestigation.id ? updatedInvestigation : inv,
                    ),
                  );
                }}
              />
            )}

            {activeTab === 'export' && selectedInvestigation && (
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">
                  Export & Publish Investigation
                </h3>

                <div className="space-y-6 mb-8">
                  <InvestigationExportTools
                    investigation={selectedInvestigation}
                    evidence={evidenceItems}
                    timelineEvents={timelineEvents}
                    hypotheses={hypotheses}
                    annotations={annotations}
                  />

                  <div className="bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6">
                    <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                      Evidence Packet Export
                    </h4>
                    <p className="text-[var(--text-muted)] mb-4">
                      Export this investigation as a comprehensive evidence packet containing
                      entities, documents, metadata, and Red Flag Index scores.
                    </p>
                    <EvidencePacketExporter
                      investigationId={selectedInvestigation.id}
                      investigationTitle={selectedInvestigation.title}
                      onExport={(format, meta) => {
                        addToast({
                          text: `Evidence packet export started (${format.toUpperCase()}) — "${meta.investigationTitle}"`,
                          type: 'info',
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                      Investigation Analytics
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Overview first, then trends and signal insights from real investigation data.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={analyticsRange}
                      onChange={(e) => setAnalyticsRange(e.target.value as '30d' | '90d' | 'all')}
                      className="px-3 py-2 text-sm bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)]"
                    >
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="all">All time</option>
                    </select>
                    <select
                      value={analyticsSourceType}
                      onChange={(e) =>
                        setAnalyticsSourceType(
                          e.target.value as 'all' | 'document' | 'entity' | 'media',
                        )
                      }
                      className="px-3 py-2 text-sm bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)]"
                    >
                      <option value="all">All sources</option>
                      <option value="document">Documents</option>
                      <option value="entity">Entities</option>
                      <option value="media">Media</option>
                    </select>
                    <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]">
                      <input
                        type="checkbox"
                        checked={analyticsIncludeAgentic}
                        onChange={(e) => setAnalyticsIncludeAgentic(e.target.checked)}
                      />
                      Include agentic
                    </label>
                    {isAdmin && (
                      <button
                        onClick={() => setShowCreateRelationshipModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors text-sm"
                      >
                        <Network className="w-4 h-4" />
                        <span>Add Connection</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                    Overview KPIs
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      ['Evidence items', analyticsData.kpis.evidenceItems],
                      ['Timeline events', analyticsData.kpis.timelineEvents],
                      ['Entities linked', analyticsData.kpis.entitiesLinked],
                      ['Documents linked', analyticsData.kpis.documentsLinked],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4"
                      >
                        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                          {label}
                        </p>
                        {analyticsLoading.overview ? (
                          <div className="h-8 mt-2 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                        ) : (
                          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-2">
                            {value as number}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-3">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Top sources</p>
                    {analyticsLoading.overview ? (
                      <div className="h-6 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                    ) : analyticsData.topSources.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analyticsData.topSources.map((item) => (
                          <span
                            key={`${item.type}-${item.count}`}
                            className="px-2 py-1 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded text-xs"
                          >
                            {item.type}: {item.count}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">
                        Link evidence to this case to generate source analytics.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      Trends
                    </h4>
                    {analyticsLoading.trends ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                      </div>
                    ) : analyticsData.evidenceTimeline.length > 0 ? (
                      <div className="space-y-2">
                        {analyticsData.evidenceTimeline.map((point) => (
                          <div key={point.day} className="flex items-center gap-3">
                            <span className="w-24 text-xs text-[var(--text-muted)]">
                              {point.day}
                            </span>
                            <div className="flex-1 h-2 bg-[var(--glass-bg-highlight)] rounded overflow-hidden">
                              <div
                                className="h-full bg-[var(--accent)]"
                                style={{ width: `${Math.min(100, point.count * 10)}%` }}
                              />
                            </div>
                            <span className="text-xs text-[var(--text-primary)]">
                              {point.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">
                        No trend data yet. Add evidence and timeline entries.
                      </p>
                    )}
                  </div>

                  <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      Activity by Source Type
                    </h4>
                    {analyticsLoading.trends ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                      </div>
                    ) : analyticsData.sourceActivity.length > 0 ? (
                      <div className="space-y-2">
                        {analyticsData.sourceActivity.map((row) => (
                          <div
                            key={row.source}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-[var(--text-secondary)] capitalize">
                              {row.source}
                            </span>
                            <span className="text-[var(--text-primary)]">{row.count}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-[var(--glass-border)]">
                          <p className="text-xs text-[var(--text-muted)] mb-1">Spikes / bursts</p>
                          {analyticsData.spikes.length > 0 ? (
                            <div className="space-y-1">
                              {analyticsData.spikes.map((spike) => (
                                <p key={spike.day} className="text-xs text-amber-300">
                                  {spike.day}: {spike.count} items
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)]">
                              No burst periods detected.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">
                        Source activity appears after evidence is linked.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      Network / Signals
                    </h4>
                    {analyticsLoading.signals ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-[var(--text-muted)] mb-2">
                            Highest-risk entities
                          </p>
                          {analyticsData.highRiskEntities.length > 0 ? (
                            analyticsData.highRiskEntities.map((entity) => (
                              <div key={entity.id} className="flex justify-between text-sm">
                                <span className="text-[var(--text-primary)]">{entity.name}</span>
                                <span className="text-red-300">{entity.score}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-[var(--text-muted)]">
                              Add entity evidence to derive risk signals.
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)] mb-2">
                            Strongest connections
                          </p>
                          {analyticsData.strongestConnections.length > 0 ? (
                            analyticsData.strongestConnections.map((connection, idx) => (
                              <div
                                key={`${connection.source}-${connection.target}-${idx}`}
                                className="text-xs text-[var(--text-secondary)]"
                              >
                                {connection.source} {'->'} {connection.target} (
                                {connection.confidence}%)
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-[var(--text-muted)]">
                              No connection edges available.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      Most-cited Documents
                    </h4>
                    {analyticsLoading.signals ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                        <div className="h-4 bg-[var(--glass-bg-highlight)] rounded animate-pulse" />
                      </div>
                    ) : analyticsData.citedDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {analyticsData.citedDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-[var(--text-primary)] truncate">
                              {doc.title}
                            </span>
                            <span className="text-xs px-2 py-1 bg-[var(--glass-bg-highlight)] rounded text-[var(--text-primary)]">
                              {doc.mentions} cites
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">
                        Documents appear here once referenced by timeline events.
                      </p>
                    )}
                  </div>
                </div>

                <div className="liquid-glass-card rounded-[var(--radius-xl)] overflow-hidden">
                  <NetworkVisualization
                    nodes={networkNodes}
                    edges={networkEdges}
                    onNodeClick={(node) => {
                      setSelectedNetworkNode(node);
                      setSelectedNetworkEdge(null);
                    }}
                    onEdgeClick={(edge) => {
                      setSelectedNetworkEdge(edge);
                      setSelectedNetworkNode(null);
                    }}
                    selectedNodeId={selectedNetworkNode?.id}
                    selectedEdgeId={selectedNetworkEdge?.id}
                    height={420}
                    showFilters={true}
                    showLegend={true}
                    interactive={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Investigation Modal */}
      {showNewInvestigationModal && (
        <div className="fixed inset-0 bg-[var(--glass-bg-strong)] backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-glass-modal rounded-[var(--radius-xl)] p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">
              Create New Investigation
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={newInvestigation.title}
                  onChange={(e) =>
                    setNewInvestigation({ ...newInvestigation, title: e.target.value })
                  }
                  className="w-full px-3 h-10 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-slate-500"
                  placeholder="Enter investigation title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Description *
                </label>
                <textarea
                  value={newInvestigation.description}
                  name="description"
                  onChange={(e) =>
                    setNewInvestigation({ ...newInvestigation, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-slate-500"
                  rows={3}
                  placeholder="Describe the investigation focus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Hypothesis
                </label>
                <textarea
                  value={newInvestigation.hypothesis}
                  onChange={(e) =>
                    setNewInvestigation({ ...newInvestigation, hypothesis: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-slate-500"
                  rows={2}
                  placeholder="What do you aim to prove or disprove?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Priority
                  </label>
                  <select
                    value={newInvestigation.priority}
                    onChange={(e) =>
                      setNewInvestigation({
                        ...newInvestigation,
                        priority: e.target.value as Investigation['priority'],
                      })
                    }
                    className="w-full px-3 h-10 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newInvestigation.dueDate}
                    onChange={(e) =>
                      setNewInvestigation({ ...newInvestigation, dueDate: e.target.value })
                    }
                    className="w-full px-3 h-10 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowNewInvestigationModal(false)}
                className="px-4 h-10 flex items-center justify-center text-sm font-medium text-[var(--text-secondary)] bg-[var(--glass-bg)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createInvestigation}
                disabled={!newInvestigation.title || !newInvestigation.description}
                className="px-4 h-10 flex items-center justify-center text-sm font-medium text-[var(--text-primary)] bg-[var(--accent)] rounded-[var(--radius-lg)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[var(--glass-shadow)] shadow-blue-900/20"
              >
                Create Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateRelationshipModal && (
        <CreateRelationshipModal
          onClose={() => setShowCreateRelationshipModal(false)}
          onSuccess={() => {}}
          initialSourceId={selectedNetworkNode?.id}
        />
      )}
      {selectedInvestigation && showTasksPanel && (
        <InvestigationTasksPanel
          investigationId={selectedInvestigation.id}
          onClose={() => setShowTasksPanel(false)}
        />
      )}
      {selectedInvestigation && showMemoryPanel && (
        <InvestigationMemoryPanel
          investigationId={selectedInvestigation.id}
          onClose={() => setShowMemoryPanel(false)}
        />
      )}
      {selectedInvestigation && showLeadsPanel && (
        <InvestigationLeadsPanel
          investigationId={selectedInvestigation.id}
          onClose={() => setShowLeadsPanel(false)}
          onConvertToTask={(lead) => {
            setShowLeadsPanel(false);
            setShowTasksPanel(true);
            addToast({ text: `Open Tasks panel to create task: "${lead.title}"`, type: 'info' });
          }}
        />
      )}
      {selectedInvestigation && showDossierPanel && (
        <SubjectDossierPanel
          investigationId={selectedInvestigation.id}
          onClose={() => setShowDossierPanel(false)}
          onOpenDocument={(docId) => setCaseFolderDocumentId(docId)}
        />
      )}
      {selectedInvestigation && showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)] w-full max-w-2xl flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Import Investigation Report
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Paste a structured Markdown report. The system will automatically extract EFTA
              document references, timeline events, hypotheses, and open leads.
            </p>
            <textarea
              rows={14}
              value={importMarkdown}
              onChange={(e) => setImportMarkdown(e.target.value)}
              placeholder="# Investigation Title&#10;&#10;## Key Evidence&#10;- **[EFTA00000000](https://epstein.live/documents/...)**: Notes...&#10;&#10;## Timeline&#10;- **2009-02-01**: Kremlin Penthouse Offer - Doronin offers Epstein penthouse across from Kremlin.&#10;&#10;> [!NOTE]&#10;> **Lead (Moscow Penthouse)**: Locate the notes on the Kremlin deal."
              className="w-full px-3 py-2 font-mono text-xs rounded-[var(--radius-lg)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-[var(--radius-lg)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!importMarkdown.trim() || importLoading}
                onClick={async () => {
                  setImportLoading(true);
                  try {
                    const { apiClient: ac } = await import('../../services/apiClient');
                    const result = await ac.post('/investigations/import-report', {
                      markdown: importMarkdown,
                    });
                    const r = result as {
                      investigationId: number;
                      addedEvidence: number;
                      addedTimelineEvents: number;
                      addedHypotheses: number;
                      addedLeads: number;
                    };
                    addToast({
                      text: `Synced — ${r.addedEvidence} evidence, ${r.addedTimelineEvents} events, ${r.addedLeads} leads`,
                      type: 'success',
                    });
                    setShowImportModal(false);
                    setImportMarkdown('');
                    await loadInvestigations();
                  } catch {
                    addToast({ text: 'Import failed. Check the report format.', type: 'error' });
                  } finally {
                    setImportLoading(false);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {importLoading && (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {importLoading ? 'Importing...' : 'Import Report'}
              </button>
            </div>
          </div>
        </div>
      )}
      {caseFolderEntityId && (
        <EvidenceModal
          entityId={caseFolderEntityId}
          isOpen={!!caseFolderEntityId}
          onClose={closeCaseFolderEntityModal}
        />
      )}
      {caseFolderDocumentId && (
        <DocumentModal id={caseFolderDocumentId} onClose={closeCaseFolderDocumentModal} />
      )}
      {custodyEvidenceId && (
        <ChainOfCustodyModal
          evidenceId={custodyEvidenceId}
          onClose={() => setCustodyEvidenceId(null)}
        />
      )}
    </div>
  );
};
