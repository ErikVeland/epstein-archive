import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { apiClient } from '@client/services/apiClient';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { useModalFocusTrap } from '@client/hooks/useModalFocusTrap';
import { TabItem } from './Tabs';
import { LiquidSheet } from './LiquidSheet';
import { useIsMobile } from '@client/hooks/useResponsive';

// Subcomponents
import { EvidenceModalHeader } from './subcomponents/EvidenceModalHeader';
import { EvidenceOverviewTab } from './subcomponents/EvidenceOverviewTab';
import { EvidenceDocumentsTab } from './subcomponents/EvidenceDocumentsTab';
import { EvidenceMediaTab } from './subcomponents/EvidenceMediaTab';
import {
  EvidenceNetworkTab,
  GraphNode,
  GraphRelationship,
} from './subcomponents/EvidenceNetworkTab';
import { EvidenceInvestigationsTab } from './subcomponents/EvidenceInvestigationsTab';
import { ClaimsTab } from './subcomponents/ClaimsTab';
import { EntityFlightsTab } from './subcomponents/EntityFlightsTab';
import { EntityFinancialTab } from './subcomponents/EntityFinancialTab';
import { EntityPropertiesTab } from './subcomponents/EntityPropertiesTab';

// Utilities
import {
  getRiskClass,
  resolveEntityPhotoUrl,
  isVisualMediaItem,
  normalizeEvidenceDocument,
  normalizeEntityMediaItem,
} from '@client/utils/evidenceUtils';
import {
  calculateEvidenceLadder,
  calculateSignalMetrics,
  generateDriverChips,
  type PersonAdapter,
} from '@client/utils/forensics';

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
  fileType?: string;
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
  metadata?: {
    isSensitive?: boolean;
    [key: string]: unknown;
  };
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
  { key: 'claims', label: 'AI Claims' },
  { key: 'investigations', label: 'Investigations' },
  { key: 'flights', label: 'Flights' },
  { key: 'financial', label: 'Financial' },
  { key: 'properties', label: 'Properties' },
  { key: 'media', label: 'Media' },
  { key: 'network', label: 'Network' },
];

type EvidenceModalTab =
  | 'overview'
  | 'evidence'
  | 'claims'
  | 'media'
  | 'network'
  | 'investigations'
  | 'flights'
  | 'financial'
  | 'properties';

const isEvidenceModalTab = (value: string): value is EvidenceModalTab =>
  [
    'overview',
    'evidence',
    'claims',
    'media',
    'network',
    'investigations',
    'flights',
    'financial',
    'properties',
  ].includes(value);

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
      evidenceType?: string;
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
  const isMobile = useIsMobile();

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

      const page = Math.floor(startIndex / 50) + 1;
      try {
        const qs = new URLSearchParams();
        if (docFilters.search.trim()) qs.set('search', docFilters.search.trim());
        qs.set('page', String(page));
        qs.set('limit', '50');
        if (docFilters.source !== 'all') qs.set('source', docFilters.source);
        qs.set('sort', docFilters.sort);

        const endpoint = `/entities/${entityId}/documents?${qs.toString()}`;

        let newDocs: EvidenceDocument[] = [];
        let total = 0;
        const canUseEvidenceSummary =
          page === 1 && docFilters.source === 'all' && docFilters.sort === 'relevance';

        const getEvidenceSummaryDocs = async () => {
          const fallback =
            entityEvidence ??
            ((await apiClient.get(
              `/entities/${entityId}/evidence`,
            )) as EntityEvidenceFallbackResponse);
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

          return {
            docs: filteredFallbackDocs,
            total: filteredFallbackDocs.length || Number(fallback?.stats?.totalEvidence || 0),
          };
        };

        if (canUseEvidenceSummary) {
          const summary = await getEvidenceSummaryDocs();
          newDocs = summary.docs;
          total = summary.total;
        } else {
          try {
            const response = (await apiClient.get(endpoint)) as Record<string, unknown>;
            if (response && typeof response === 'object') {
              const rawDocs = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.evidence)
                  ? response.evidence
                  : Array.isArray(response.results)
                    ? response.results
                    : Array.isArray(response)
                      ? response
                      : [];

              // Normalize documents for consistency
              newDocs = (rawDocs as Record<string, unknown>[]).map(
                (d) => normalizeEvidenceDocument(d) as unknown as EvidenceDocument,
              );

              total = Number(
                response.total ??
                  response.count ??
                  response.totalResults ??
                  (Array.isArray(response) ? response.length : 0),
              );
            }
            // Validate items have IDs
            newDocs = newDocs.filter(
              (d) =>
                d &&
                (d.id !== undefined || (d as Record<string, unknown>).document_id !== undefined),
            );
          } catch (primaryError) {
            console.warn('Primary documents endpoint failed, trying fallback:', primaryError);
          }
        }

        if (page === 1 && newDocs.length === 0) {
          try {
            const summary = await getEvidenceSummaryDocs();
            newDocs = summary.docs;
            total = summary.total;
          } catch (fallbackError) {
            console.warn('Fallback evidence endpoint also failed:', fallbackError);
          }
        }

        setDocuments((prev) => {
          const combined = page === 1 ? newDocs : [...prev, ...newDocs];
          const seen = new Set();
          return combined.filter((d) => {
            if (!d || !d.id || seen.has(d.id)) return false;
            seen.add(d.id);
            return true;
          });
        });
        setTotalDocs(total);
        setHasNextPage(newDocs.length > 0 && page * 50 < total);
      } catch (error) {
        console.error('Error loading evidence page', error);
        if (page === 1) {
          setDocuments([]);
          setTotalDocs(0);
        }
      } finally {
        setIsNextPageLoading(false);
        setDocsInitialized(true);
      }
    },
    [isNextPageLoading, docFilters, entityId, entityEvidence],
  );

  useEffect(() => {
    if (!(isOpen && entityId && activeTab === 'evidence' && tabsLoaded.has('evidence'))) return;
    if (!docsInitialized && !isNextPageLoading) {
      loadNextPage(0);
    }
  }, [
    activeTab,
    docFilters,
    entityId,
    isOpen,
    tabsLoaded,
    docsInitialized,
    isNextPageLoading,
    loadNextPage,
  ]);

  const { data: relationshipSummary = [] } = useQuery<Record<string, unknown>[]>({
    queryKey: ['relationships-summary', entityId],
    queryFn: async () => {
      const resp = (await apiClient.get(`/relationships?entityId=${entityId}`)) as Record<
        string,
        unknown
      >;
      return Array.isArray(resp.relationships) ? resp.relationships : [];
    },
    enabled: isOpen && !!entityId,
    staleTime: 60_000,
  });

  const networkEnabled =
    isOpen && !!entityId && activeTab === 'network' && tabsLoaded.has('network');
  const { data: relationships = [], isLoading: networkLoading } = useQuery<
    Record<string, unknown>[]
  >({
    queryKey: ['relationships', entityId],
    queryFn: async () => {
      const resp = (await apiClient.get(`/relationships?entityId=${entityId}`)) as Record<
        string,
        unknown
      >;
      let rels = (resp.relationships as Record<string, unknown>[]) || [];
      if (!rels.length) {
        const graphResp = (await apiClient.get(`/entities/${entityId}/graph?depth=2`)) as Record<
          string,
          unknown
        >;
        const graphEdges = Array.isArray(graphResp?.edges)
          ? (graphResp.edges as Record<string, unknown>[])
          : [];
        rels = graphEdges.slice(0, 80).map((edge) => ({
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
        top.map(async (r) => {
          const relatedEntityId = r.related_entity_id || r.entity_id;
          try {
            const e = (await apiClient.get(`/entities/${relatedEntityId}`)) as Record<
              string,
              unknown
            >;
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
      const fallbackResp = (await apiClient.get('/investigations?status=open&limit=6')) as Record<
        string,
        unknown
      >;
      const fallbackItems = Array.isArray(fallbackResp?.data)
        ? (fallbackResp.data as Record<string, unknown>[])
        : Array.isArray(fallbackResp)
          ? (fallbackResp as Record<string, unknown>[])
          : [];
      return fallbackItems.map((item) => ({
        ...item,
        _fallbackReason: 'Suggested open case',
      }));
    },
    enabled: investigationsEnabled,
    staleTime: 60_000,
  });

  const mediaEnabled = isOpen && !!entityId && (activeTab === 'media' || activeTab === 'overview');
  const {
    data: mediaItems = [],
    isLoading: isMediaLoading,
    isError: isMediaError,
  } = useQuery<EntityPhoto[]>({
    queryKey: ['entityMedia', entityId],
    queryFn: async () => {
      const response = await fetch(`/api/entities/${entityId}/media`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status}`);
      }
      const payload = (await response.json()) as Record<string, unknown>[];
      if (!Array.isArray(payload)) {
        throw new Error('Media response was not an array');
      }
      return payload.map((item, index) => normalizeEntityMediaItem(item, index));
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
    entityEvidence?.stats?.typeBreakdown?.filter((item) => item.evidence_type || item.evidenceType)
      .length ||
    entity?.evidenceTypes?.length ||
    0;

  const overviewSignificantPassages: SignificantPassage[] = useMemo(() => {
    if (entity?.significantPassages && entity.significantPassages.length > 0)
      return entity.significantPassages;
    if (Array.isArray(entityEvidence?.evidence)) {
      return (entityEvidence.evidence as Array<Record<string, unknown>>)
        .slice(0, 5)
        .map((item) => ({
          documentId: (item.documentId || item.document_id) as string | number | undefined,
          filename: (item.title ||
            item.fileName ||
            item.file_name ||
            item.filename ||
            item.sourcePath ||
            item.source_path ||
            'Untitled source') as string,
          passage: (item.contentPreview ||
            item.contextSnippet ||
            item.context_snippet ||
            item.description ||
            item.caption ||
            item.title ||
            '') as string,
          source: (item.evidenceType || item.evidence_type || 'Document') as string,
          keyword: (item.evidenceType || item.evidence_type) as string | undefined,
          dateCreated: (item.dateCreated || item.created_at || item.last_processed_at) as
            | string
            | undefined,
          collection: (item.source_collection || item.collection) as string | undefined,
        }));
    }
    return [];
  }, [entity, entityEvidence]);

  useScrollLock(isOpen);
  const { modalRef } = useModalFocusTrap({ isActive: isOpen && !isMobile, onEscape: onClose });

  const headerMediaItems = mediaItems.length > 0 ? mediaItems : entity?.photos || [];
  const headerPhoto =
    headerMediaItems.find((item) => isVisualMediaItem(item)) || headerMediaItems[0];

  const headerPhotoUrl = resolveEntityPhotoUrl(headerPhoto, true);

  if (isMobile) {
    return (
      <LiquidSheet isOpen={isOpen} onClose={onClose} className={s.mobileSheet}>
        <div className={s.mobileContent}>
          <EvidenceModalHeader
            entity={entity ?? null}
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
            headerPhoto={headerPhoto ?? null}
          />

          <div className={s.contentArea}>
            {activeTab === 'overview' && (
              <EvidenceOverviewTab
                entity={entity ?? null}
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
                usePlainEvidenceList
                entityId={entityId}
                entityName={entity?.fullName || ''}
                openDocument={openDocumentFromEvidence}
              />
            )}

            {activeTab === 'claims' && (
              <ClaimsTab
                entityId={entityId}
                onOpenDocument={(docId) => navigateFromModal(`/documents?id=${docId}`)}
              />
            )}

            {activeTab === 'media' && (
              <EvidenceMediaTab
                entity={entity ?? null}
                mediaItems={mediaItems}
                isMediaLoading={isMediaLoading}
                isMediaError={isMediaError}
                brokenMediaIds={brokenMediaIds}
                setBrokenMediaIds={setBrokenMediaIds}
                onOpenEntity={(id) => navigateFromModal(`/entity/${id}`)}
              />
            )}

            {activeTab === 'network' && (
              <EvidenceNetworkTab
                networkLoading={networkLoading}
                relationships={relationships as GraphRelationship[]}
                graphData={
                  graphData as { entities: GraphNode[]; relationships: GraphRelationship[] }
                }
                entity={entity ?? null}
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

            {activeTab === 'flights' && tabsLoaded.has('flights') && (
              <EntityFlightsTab entityId={entityId} />
            )}

            {activeTab === 'financial' && tabsLoaded.has('financial') && (
              <EntityFinancialTab entityId={entityId} entityName={entity?.fullName} />
            )}

            {activeTab === 'properties' && tabsLoaded.has('properties') && (
              <EntityPropertiesTab entityId={entityId} />
            )}
          </div>
        </div>
      </LiquidSheet>
    );
  }

  return createPortal(
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
          ref={modalRef}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          data-testid="evidence-modal"
          className={s.modal}
          tabIndex={-1}
          onPointerDown={(e) => {
            const startY = e.clientY;
            const handlePointerMove = (moveEvent: PointerEvent) => {
              const deltaY = moveEvent.clientY - startY;
              if (deltaY > 100) {
                onClose();
                document.removeEventListener('pointermove', handlePointerMove);
              }
            };
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener(
              'pointerup',
              () => document.removeEventListener('pointermove', handlePointerMove),
              { once: true },
            );
          }}
        >
          <EvidenceModalHeader
            entity={entity ?? null}
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
            headerPhoto={headerPhoto ?? null}
          />

          <div className={s.contentArea}>
            {activeTab === 'overview' && (
              <EvidenceOverviewTab
                entity={entity ?? null}
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
                usePlainEvidenceList
                entityId={entityId}
                entityName={entity?.fullName || ''}
                openDocument={openDocumentFromEvidence}
              />
            )}

            {activeTab === 'claims' && (
              <ClaimsTab
                entityId={entityId}
                onOpenDocument={(docId) => navigateFromModal(`/documents?id=${docId}`)}
              />
            )}

            {activeTab === 'media' && (
              <EvidenceMediaTab
                entity={entity ?? null}
                mediaItems={mediaItems}
                isMediaLoading={isMediaLoading}
                isMediaError={isMediaError}
                brokenMediaIds={brokenMediaIds}
                setBrokenMediaIds={setBrokenMediaIds}
                onOpenEntity={(id) => navigateFromModal(`/entity/${id}`)}
              />
            )}

            {activeTab === 'network' && (
              <EvidenceNetworkTab
                networkLoading={networkLoading}
                relationships={relationships as GraphRelationship[]}
                graphData={
                  graphData as { entities: GraphNode[]; relationships: GraphRelationship[] }
                }
                entity={entity ?? null}
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

            {activeTab === 'flights' && tabsLoaded.has('flights') && (
              <EntityFlightsTab entityId={entityId} />
            )}

            {activeTab === 'financial' && tabsLoaded.has('financial') && (
              <EntityFinancialTab entityId={entityId} entityName={entity?.fullName} />
            )}

            {activeTab === 'properties' && tabsLoaded.has('properties') && (
              <EntityPropertiesTab entityId={entityId} />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};
