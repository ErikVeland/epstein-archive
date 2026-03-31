import React, { useState, useEffect, useMemo, useCallback, Profiler } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { apiClient } from '../../services/apiClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import { TabItem } from './Tabs';

// Subcomponents
import { EvidenceModalHeader } from './subcomponents/EvidenceModalHeader';
import { EvidenceOverviewTab } from './subcomponents/EvidenceOverviewTab';
import { EvidenceDocumentsTab } from './subcomponents/EvidenceDocumentsTab';
import { EvidenceMediaTab } from './subcomponents/EvidenceMediaTab';
import { EvidenceNetworkTab } from './subcomponents/EvidenceNetworkTab';
import { EvidenceInvestigationsTab } from './subcomponents/EvidenceInvestigationsTab';

// Utilities
import {
  getRiskClass,
  resolveEntityPhotoUrl,
  isVisualMediaItem,
  normalizeEvidenceDocument,
  normalizeEntityMediaItem,
} from '../../utils/evidenceUtils';
import {
  calculateEvidenceLadder,
  calculateSignalMetrics,
  generateDriverChips,
  type PersonAdapter,
} from '../../utils/forensics';

// Styles
import s from './EvidenceModal.module.css';

export interface EntityPhoto {
  id?: number | string;
  url?: string;
  fullUrl?: string;
  imageUrl?: string;
  image_url?: string;
  src?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  thumbUrl?: string;
  thumb_url?: string;
  title?: string;
  caption?: string;
  filename?: string;
  sourceType?: string;
  type?: string;
  date?: string;
  createdAt?: string;
  timestamp?: string;
  taggedPeople?: string[];
  people?: string[];
  entities?: string[];
  riskRating?: number;
  redFlagRating?: number;
  directEvidence?: boolean;
  verified?: boolean;
  filePath?: string;
  thumbnailPath?: string;
  dateTaken?: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceDocument {
  id?: string | number;
  title?: string;
  fileName?: string;
  content?: string;
  contentPreview?: string;
  evidenceType?: string;
  redFlagRating?: number;
  keyword?: string;
  dateCreated?: string;
  source_collection?: string;
}

export interface InvestigationEntity {
  id?: string | number;
  uuid?: string;
  title?: string;
  description?: string;
  status?: string;
  updated_at?: string;
  _fallbackReason?: string;
}

export interface SignificantPassage {
  documentId?: string | number;
  source?: string;
  passage?: string;
  mention_context?: string;
  contentSnippet?: string;
  text?: string;
  content?: string;
  filename?: string;
  keyword?: string;
}

const EVIDENCE_TABS: TabItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'investigations', label: 'Investigations' },
  { key: 'media', label: 'Media' },
  { key: 'network', label: 'Network' },
];

type EvidenceModalTab = 'overview' | 'evidence' | 'media' | 'network' | 'investigations';

const isEvidenceModalTab = (value: string): value is EvidenceModalTab =>
  ['overview', 'evidence', 'media', 'network', 'investigations'].includes(value);

interface EvidenceModalProps {
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface BlackBookEntry {
  id: number;
  phoneNumbers?: string[];
  notes?: string;
}

interface EntityDetails {
  id: string;
  fullName: string;
  primaryRole: string;
  bio: string;
  description?: string;
  mentions: number;
  likelihoodLevel: string;
  redFlagRating: number;
  fileReferences: Record<string, unknown>[];
  significantPassages: SignificantPassage[];
  photos: EntityPhoto[];
  evidenceTypes: string[];
  blackBookEntries?: BlackBookEntry[];
  birthDate?: string | null;
  deathDate?: string | null;
}

interface EntityEvidenceFallbackResponse {
  evidence?: Array<Record<string, unknown>>;
  stats?: {
    totalEvidence?: number;
    typeBreakdown?: Array<{
      evidence_type?: string;
      count?: number;
    }>;
  };
}

interface EntityEvidenceResponse extends EntityEvidenceFallbackResponse {
  evidence?: Array<Record<string, unknown>>;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ entityId, isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromUrl = useCallback((): EvidenceModalTab => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('entityTab');
    if (isEvidenceModalTab(tab as string)) {
      return tab as EvidenceModalTab;
    }
    return 'overview';
  }, [location.search]);

  const [activeTab, setActiveTab] = useState<EvidenceModalTab>(getTabFromUrl());
  const [activeQuickAction, setActiveQuickAction] = useState<
    'blackbook' | 'timeline' | 'search' | null
  >(null);

  // Documents Pagination State
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [docsInitialized, setDocsInitialized] = useState(false);
  const [docFilters, setDocFilters] = useState({ search: '', source: 'all', sort: 'relevance' });

  // Lazy load tabs
  const [tabsLoaded, setTabsLoaded] = useState<Set<string>>(new Set(['overview']));

  const urlState = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      tab: getTabFromUrl(),
      quickAction: params.get('entityAction'),
      entitySearch: params.get('entitySearch'),
    };
  }, [getTabFromUrl, location.search]);

  const handleTabChange = useCallback(
    (tab: EvidenceModalTab) => {
      const params = new URLSearchParams(location.search);
      params.set('entityTab', tab);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      setActiveTab(tab);
      setTabsLoaded((prev) => new Set(prev).add(tab));
    },
    [location.pathname, location.search, navigate],
  );

  const [brokenMediaIds, setBrokenMediaIds] = useState<Record<string, boolean>>({});
  const blackBookSectionRef = React.useRef<HTMLDivElement | null>(null);

  const navigateFromModal = useCallback(
    (path: string) => {
      onClose();
      navigate(path);
    },
    [navigate, onClose],
  );

  const openDocumentFromEvidence = useCallback(
    (
      documentId: string | number | undefined | null,
      options?: {
        newTab?: boolean;
      },
    ) => {
      if (!documentId) return;
      const path = `/documents?id=${encodeURIComponent(String(documentId))}`;
      if (options?.newTab) {
        window.open(path, '_blank', 'noopener,noreferrer');
        return;
      }
      navigateFromModal(path);
    },
    [navigateFromModal],
  );

  const { data: entity, isLoading: loading } = useQuery<EntityDetails>({
    queryKey: ['entity', entityId],
    queryFn: async () => {
      return (await apiClient.get(`/entities/${entityId}`)) as EntityDetails;
    },
    enabled: isOpen && !!entityId,
    staleTime: 60_000,
  });

  const { data: entityEvidence } = useQuery<EntityEvidenceResponse>({
    queryKey: ['entity-evidence-summary', entityId],
    queryFn: async () => {
      return (await apiClient.get(`/entities/${entityId}/evidence`)) as EntityEvidenceResponse;
    },
    enabled: isOpen && !!entityId,
    staleTime: 60_000,
  });

  const isHighProfileEntity = useMemo(() => {
    const name = String(entity?.fullName || '').toLowerCase();
    return (
      name.includes('jeffrey epstein') ||
      name.includes('ghislaine maxwell') ||
      name.includes('donald trump')
    );
  }, [entity?.fullName]);

  useEffect(() => {
    if (!isOpen) return;
    setDocuments([]);
    setTotalDocs(0);
    setHasNextPage(true);
    setDocsInitialized(false);
    setIsDocsLoading(false);
    setBrokenMediaIds({});
    setTabsLoaded(new Set(['overview']));
  }, [entityId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setTabsLoaded((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (urlState.tab !== activeTab) {
      setActiveTab(urlState.tab);
      setTabsLoaded((prev) => new Set(prev).add(urlState.tab));
    }
  }, [activeTab, urlState.tab]);

  useEffect(() => {
    if (!urlState.quickAction) return;

    if (urlState.quickAction === 'timeline') {
      setActiveQuickAction('timeline');
      setActiveTab('network');
      setTabsLoaded((prev) => new Set(prev).add('network'));
      return;
    }

    if (urlState.quickAction === 'search') {
      setActiveQuickAction('search');
      setActiveTab('evidence');
      setTabsLoaded((prev) => new Set(prev).add('evidence'));
      if (urlState.entitySearch) {
        setDocFilters((prev) =>
          prev.search === urlState.entitySearch
            ? prev
            : { ...prev, search: urlState.entitySearch ?? '' },
        );
      }
      return;
    }

    if (urlState.quickAction === 'blackbook') {
      setActiveQuickAction('blackbook');
      if (entity?.fullName) {
        navigateFromModal(`/blackbook?search=${encodeURIComponent(entity.fullName)}`);
      }
    }
  }, [entity?.fullName, navigateFromModal, urlState.entitySearch, urlState.quickAction]);

  useEffect(() => {
    if (
      activeQuickAction === 'blackbook' &&
      activeTab === 'overview' &&
      blackBookSectionRef.current
    ) {
      blackBookSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeQuickAction, activeTab]);

  const handleFilterChange = (updates: Partial<typeof docFilters>) => {
    setDocFilters((prev) => ({ ...prev, ...updates }));
    setDocuments([]);
    setTotalDocs(0);
    setHasNextPage(true);
    setDocsInitialized(false);
  };

  const isItemLoaded = (index: number) => !hasNextPage || index < documents.length;

  const loadNextPage = useCallback(
    async (startIndex: number) => {
      if (isNextPageLoading) return;
      setIsNextPageLoading(true);

      try {
        const page = Math.floor(startIndex / 50) + 1;
        const qs = new URLSearchParams();
        if (docFilters.search.trim()) qs.set('search', docFilters.search.trim());
        qs.set('page', String(page));
        qs.set('limit', '50');
        if (docFilters.source !== 'all') qs.set('source', docFilters.source);
        qs.set('sort', docFilters.sort);

        const endpoint = `/entities/${entityId}/documents?${qs.toString()}`;
        const response = (await apiClient.get(endpoint)) as any;

        let newDocs: EvidenceDocument[] = [];
        let total = 0;

        if (response && typeof response === 'object') {
          newDocs = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.evidence)
              ? response.evidence
              : Array.isArray(response.results)
                ? response.results
                : [];
          total =
            response.total ??
            response.count ??
            response.totalResults ??
            (Array.isArray(response) ? response.length : 0);
        }

        if (page === 1 && newDocs.length === 0) {
          const fallback = (await apiClient.get(
            `/entities/${entityId}/evidence`,
          )) as EntityEvidenceFallbackResponse;
          const fallbackDocs = Array.isArray(fallback?.evidence)
            ? fallback.evidence.map((item) => normalizeEvidenceDocument(item))
            : [];

          const filteredFallbackDocs = fallbackDocs.filter((doc) => {
            const search = docFilters.search.trim().toLowerCase();
            if (!search) return true;
            return [doc.title, doc.fileName, doc.contentPreview, doc.content, doc.evidenceType]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(search));
          });

          newDocs = filteredFallbackDocs;
          total = filteredFallbackDocs.length || Number(fallback?.stats?.totalEvidence || 0);
        }

        setDocuments((prev) => (page === 1 ? newDocs : [...prev, ...newDocs]));
        setTotalDocs(total);
        setHasNextPage(newDocs.length > 0 && page * 50 < total);
      } catch (error) {
        console.error('Error loading next page of evidence', error);
      } finally {
        setIsNextPageLoading(false);
        setDocsInitialized(true);
      }
    },
    [isNextPageLoading, docFilters, entityId],
  );

  useEffect(() => {
    if (!(isOpen && entityId && activeTab === 'evidence' && tabsLoaded.has('evidence'))) return;
    if (!docsInitialized && !isDocsLoading) {
      setIsDocsLoading(true);
      loadNextPage(0).finally(() => setIsDocsLoading(false));
    }
  }, [
    activeTab,
    docFilters,
    entityId,
    isOpen,
    tabsLoaded,
    docsInitialized,
    isDocsLoading,
    loadNextPage,
  ]);

  const { data: relationshipSummary = [] } = useQuery<any[]>({
    queryKey: ['relationships-summary', entityId],
    queryFn: async () => {
      const resp = (await apiClient.get(`/relationships?entityId=${entityId}`)) as any;
      return Array.isArray(resp.relationships) ? resp.relationships : [];
    },
    enabled: isOpen && !!entityId,
    staleTime: 60_000,
  });

  const networkEnabled =
    isOpen && !!entityId && activeTab === 'network' && tabsLoaded.has('network');
  const { data: relationships = [], isLoading: networkLoading } = useQuery<any[]>({
    queryKey: ['relationships', entityId],
    queryFn: async () => {
      const resp = (await apiClient.get(`/relationships?entityId=${entityId}`)) as any;
      let rels = resp.relationships || [];
      if (!rels.length) {
        const graphResp = (await apiClient.get(`/entities/${entityId}/graph?depth=2`)) as any;
        const graphEdges = Array.isArray(graphResp?.edges) ? graphResp.edges : [];
        rels = graphEdges.slice(0, 80).map((edge: any) => ({
          entity_id:
            String(edge.source_id) === String(entityId)
              ? String(edge.target_id)
              : String(edge.source_id),
          relationship_type: edge.relationship_type || 'associated_with',
          strength: Number(edge.proximity_score || edge.weight || 0),
          confidence: Number(edge.confidence || 0),
        }));
      }

      const top = rels.slice(0, 20);
      return Promise.all(
        top.map(async (r: any) => {
          const relatedEntityId = r.related_entity_id || r.entity_id;
          try {
            const e = (await apiClient.get(`/entities/${relatedEntityId}`)) as any;
            return { ...r, name: e.fullName || e.name || relatedEntityId };
          } catch {
            return { ...r, name: relatedEntityId };
          }
        }),
      );
    },
    enabled: networkEnabled,
    staleTime: 60_000,
  });

  const investigationsEnabled =
    isOpen && !!entityId && activeTab === 'investigations' && tabsLoaded.has('investigations');
  const {
    data: investigations = [],
    isLoading: isInvestigationsLoading,
    isFetched: investigationsInitialized,
  } = useQuery<InvestigationEntity[]>({
    queryKey: ['investigations', entityId, isHighProfileEntity],
    queryFn: async () => {
      const response = (await apiClient.get(
        `/entities/${entityId}/investigations`,
      )) as InvestigationEntity[];
      const primary = Array.isArray(response) ? response : [];
      if (primary.length > 0 || !isHighProfileEntity) {
        return primary;
      }
      const fallbackResp = (await apiClient.get('/investigations?status=open&limit=6')) as any;
      const fallbackItems = Array.isArray(fallbackResp?.data)
        ? fallbackResp.data
        : Array.isArray(fallbackResp)
          ? fallbackResp
          : [];
      return fallbackItems.map((item: any) => ({
        ...item,
        _fallbackReason: 'Suggested open case',
      }));
    },
    enabled: investigationsEnabled,
    staleTime: 60_000,
  });

  const mediaEnabled = isOpen && !!entityId && (activeTab === 'media' || activeTab === 'overview');
  const { data: mediaItems = [], isLoading: isMediaLoading } = useQuery<EntityPhoto[]>({
    queryKey: ['entityMedia', entityId],
    queryFn: async () => {
      const response = await fetch(`/api/entities/${entityId}/media`, { credentials: 'include' });
      if (response.status === 204) return [];
      const payload = (await response.json()) as any[];
      return Array.isArray(payload)
        ? payload.map((item, index) => normalizeEntityMediaItem(item, index))
        : [];
    },
    enabled: mediaEnabled,
    staleTime: 60_000,
  });

  const forensicData = useMemo(() => {
    if (!entity) return null;
    const personAdapter: PersonAdapter = {
      ...entity,
      name: entity.fullName,
      files: 0,
      contexts: [],
      evidenceTypes: entity.evidenceTypes || [],
    };
    return {
      ladder: calculateEvidenceLadder(personAdapter),
      signals: calculateSignalMetrics(personAdapter),
      drivers: generateDriverChips(personAdapter),
    };
  }, [entity]);

  const graphData = useMemo(() => {
    if (!entity) return { entities: [], relationships: [] };
    const centralNode = {
      id: entity.id,
      name: entity.fullName,
      role: entity.primaryRole,
      type: 'Person',
      connectionCount: relationships.length,
      riskLevel: entity.redFlagRating || 0,
      photoUrl: mediaItems[0]?.url || entity.photos?.[0]?.url,
    };
    const relatedNodes = relationships.map((r) => ({
      id: r.related_entity_id || r.entity_id,
      name: r.name || r.related_entity_id || r.entity_id,
      role: 'Associate',
      type: 'Person',
      connectionCount: 1,
      riskLevel: 0,
    }));
    const links = relationships.map((r) => ({
      sourceId: String(entity.id),
      targetId: String(r.related_entity_id || r.entity_id),
      type: r.relationship_type,
      weight: r.strength || 0.1,
    }));
    return { entities: [centralNode, ...relatedNodes], relationships: links };
  }, [entity, mediaItems, relationships]);

  const handleQuickAction = useCallback(
    (action: 'blackbook' | 'timeline' | 'search') => {
      if (!entity?.fullName) return;
      const params = new URLSearchParams(location.search);
      params.set('entityAction', action);
      if (action === 'blackbook') {
        navigateFromModal(`/blackbook?search=${encodeURIComponent(entity.fullName)}`);
        return;
      } else if (action === 'timeline') {
        params.set('entityTab', 'network');
        params.delete('entitySearch');
        setDocFilters((prev) => ({ ...prev, search: '' }));
      } else {
        params.set('entityTab', 'evidence');
        params.set('entitySearch', entity.fullName);
        setDocFilters((prev) => ({ ...prev, search: entity.fullName }));
      }
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      setActiveQuickAction(action);
      const nextTab = (action === 'timeline' ? 'network' : 'evidence') as EvidenceModalTab;
      setActiveTab(nextTab);
      setTabsLoaded((prev) => new Set(prev).add(nextTab));
    },
    [entity?.fullName, location.pathname, location.search, navigate, navigateFromModal],
  );

  const forensicSummary = useMemo(() => {
    if (!entity || !forensicData) return '';
    const docsCount = totalDocs > 0 ? totalDocs : documents.length || entity.mentions;
    const verifiedMediaCount = mediaItems.filter(
      (item) => item.verified || item.directEvidence,
    ).length;
    const mediaCount = verifiedMediaCount || mediaItems.length || entity.photos?.length || 0;
    const relationCount = relationshipSummary.length || relationships.length;
    const riskDescriptor =
      (entity.redFlagRating || 0) >= 4
        ? 'high direct exposure'
        : (entity.redFlagRating || 0) >= 2
          ? 'moderate exposure'
          : 'limited direct exposure';
    const mediaDescriptor =
      verifiedMediaCount > 0 && verifiedMediaCount === mediaCount
        ? 'verified media items'
        : 'media items';
    return `${riskDescriptor} across ${docsCount.toLocaleString()} documents; appears in ${mediaCount.toLocaleString()} ${mediaDescriptor}; connected to ${relationCount.toLocaleString()} relationship signals.`;
  }, [
    documents.length,
    entity,
    forensicData,
    mediaItems,
    relationshipSummary.length,
    relationships.length,
    totalDocs,
  ]);

  const overviewEvidenceTypesCount =
    entityEvidence?.stats?.typeBreakdown?.filter((item) => item.evidence_type).length ||
    entity?.evidenceTypes?.length ||
    0;

  const overviewSignificantPassages: SignificantPassage[] = useMemo(() => {
    if (entity?.significantPassages && entity.significantPassages.length > 0)
      return entity.significantPassages;
    if (Array.isArray(entityEvidence?.evidence)) {
      return entityEvidence.evidence.slice(0, 5).map((item) => ({
        documentId: item.document_id as string | number | undefined,
        source: (item.evidence_type as string | undefined) || 'Document',
        passage: (item.context_snippet || item.description || item.title || '') as string,
        filename: (item.title || item.source_path || 'Untitled source') as string,
        keyword: item.evidence_type as string | undefined,
      }));
    }
    return [];
  }, [entity, entityEvidence]);

  useScrollLock(isOpen);

  const onRenderCallback = useCallback((id: string, phase: any, actualDuration: number) => {
    if (actualDuration > 16) {
      import('../../utils/performanceMonitor.js')
        .then(({ PerformanceMonitor }) => {
          PerformanceMonitor.logRender(
            `EvidenceModal-${id}`,
            actualDuration,
            phase === 'nested-update' ? 'update' : phase,
          );
        })
        .catch(() => {});
    }
  }, []);

  if (!isOpen) return null;

  const headerMediaItems = mediaItems.length > 0 ? mediaItems : entity?.photos || [];
  const headerPhoto =
    headerMediaItems.find((item) => isVisualMediaItem(item)) || headerMediaItems[0];
  const headerPhotoUrl = resolveEntityPhotoUrl(headerPhoto, true);

  return createPortal(
    <Profiler id="EvidenceModal" onRender={onRenderCallback}>
      <AnimatePresence>
        <div className={s.overlay}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={s.backdrop}
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            data-testid="evidence-modal"
            className={s.modal}
          >
            <EvidenceModalHeader
              entity={entity}
              loading={loading}
              headerPhotoUrl={headerPhotoUrl}
              brokenMediaIds={brokenMediaIds}
              setBrokenMediaIds={setBrokenMediaIds}
              handleQuickAction={handleQuickAction}
              activeQuickAction={activeQuickAction}
              tabs={EVIDENCE_TABS}
              activeTab={activeTab}
              onTabChange={(key) => isEvidenceModalTab(key) && handleTabChange(key)}
              onClose={onClose}
              forensicSummary={forensicSummary}
              getRiskClass={getRiskClass}
              resolveEntityPhotoUrl={resolveEntityPhotoUrl}
              isVisualMediaItem={isVisualMediaItem}
              headerPhoto={headerPhoto}
            />

            <div className={s.contentArea}>
              {activeTab === 'overview' && (
                <EvidenceOverviewTab
                  entity={entity}
                  loading={loading}
                  forensicData={forensicData}
                  totalDocs={totalDocs}
                  mediaItems={mediaItems}
                  overviewEvidenceTypesCount={overviewEvidenceTypesCount}
                  overviewSignificantPassages={overviewSignificantPassages}
                  openDocumentFromEvidence={openDocumentFromEvidence}
                  navigateFromModal={navigateFromModal}
                  blackBookSectionRef={blackBookSectionRef}
                />
              )}

              {activeTab === 'evidence' && (
                <EvidenceDocumentsTab
                  docFilters={docFilters}
                  handleFilterChange={handleFilterChange}
                  isDocsLoading={isDocsLoading}
                  totalDocs={totalDocs}
                  documents={documents}
                  loadNextPage={loadNextPage}
                  hasNextPage={hasNextPage}
                  isItemLoaded={isItemLoaded}
                  isNextPageLoading={isNextPageLoading}
                  usePlainEvidenceList={totalDocs > 0 && totalDocs <= 500}
                  entityName={entity?.fullName || ''}
                  openDocument={openDocumentFromEvidence}
                />
              )}

              {activeTab === 'media' && (
                <EvidenceMediaTab
                  entity={entity}
                  mediaItems={mediaItems}
                  isMediaLoading={isMediaLoading}
                  brokenMediaIds={brokenMediaIds}
                  setBrokenMediaIds={setBrokenMediaIds}
                />
              )}

              {activeTab === 'network' && (
                <EvidenceNetworkTab
                  networkLoading={networkLoading}
                  relationships={relationships}
                  graphData={graphData}
                  entity={entity}
                />
              )}

              {activeTab === 'investigations' && (
                <EvidenceInvestigationsTab
                  investigations={investigations}
                  isInvestigationsLoading={isInvestigationsLoading}
                  investigationsInitialized={investigationsInitialized}
                  onOpenCase={(uuid) => navigateFromModal(`/investigations/${uuid}`)}
                />
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </Profiler>,
    document.body,
  );
};
