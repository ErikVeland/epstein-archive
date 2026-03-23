import React, { useState, useEffect, useMemo, useCallback, Profiler } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Activity,
  AlertTriangle,
  ExternalLink,
  Calendar,
  ShieldAlert,
  Image as ImageIcon,
  BookOpen,
  Clock,
  Sparkles,
  Link2,
  Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { SignalPanel } from '../entities/cards/SignalPanel';
import { DriverChips } from '../entities/cards/DriverChips';
import { apiClient } from '../../services/apiClient';
import { cn } from '../../utils/cn';
import {
  calculateEvidenceLadder,
  calculateSignalMetrics,
  generateDriverChips,
  type PersonAdapter,
} from '../../utils/forensics';
import { Skeleton } from './Skeleton';
import { NetworkGraph } from '../visualizations/NetworkGraph';
import Icon from './Icon';
import { useScrollLock } from '../../hooks/useScrollLock';
import { FixedSizeList as List } from 'react-window';
import { InfiniteLoader } from 'react-window-infinite-loader';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { CloseButton } from './CloseButton';

// Type-safe wrappers for virtualized components to bypass React 18/TS mismatches
const TypedAutoSizer = AutoSizer as unknown as React.ComponentType<{
  children: (props: { width: number; height: number }) => React.ReactNode;
}>;
const TypedInfiniteLoader = InfiniteLoader as unknown as React.ComponentType<{
  isItemLoaded: (index: number) => boolean;
  itemCount: number;
  loadMoreItems: (startIndex: number, stopIndex: number) => Promise<void> | void;
  children: (props: {
    onItemsRendered: (props: {
      visibleStartIndex: number;
      visibleStopIndex: number;
      overscanStartIndex: number;
      overscanStopIndex: number;
    }) => void;
    ref: React.Ref<HTMLElement> | ((instance: HTMLElement | null) => void);
  }) => React.ReactNode;
}>;
import { Tabs, TabItem } from './Tabs';

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
  // Media metadata fields
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
  fileReferences: Record<string, unknown>[]; // Kept for types but unused in virtualized view
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
  };
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeEvidenceDocument = (raw: Record<string, unknown>): EvidenceDocument => ({
  id: (raw.id ?? raw.document_id ?? raw.documentId) as string | number | undefined,
  title: (raw.title ?? raw.fileName ?? raw.file_name) as string | undefined,
  fileName: (raw.fileName ?? raw.file_name ?? raw.title) as string | undefined,
  content: (raw.content ??
    raw.context_snippet ??
    raw.contentSnippet ??
    raw.mention_context ??
    raw.description) as string | undefined,
  contentPreview: (raw.contentPreview ??
    raw.content_preview ??
    raw.context_snippet ??
    raw.mention_context ??
    raw.description) as string | undefined,
  evidenceType: (raw.evidenceType ?? raw.evidence_type) as string | undefined,
  redFlagRating: Number(raw.redFlagRating ?? raw.red_flag_rating ?? 0),
  keyword: (raw.keyword ?? raw.flag_type) as string | undefined,
  dateCreated: (raw.dateCreated ?? raw.date_created ?? raw.created_at) as string | undefined,
  source_collection: (raw.source_collection ?? raw.source_path ?? raw.file_path) as
    | string
    | undefined,
});

const normalizeEntityMediaItem = (raw: Record<string, unknown>, index: number): EntityPhoto => {
  const metadata =
    raw.metadata && typeof raw.metadata === 'object'
      ? (raw.metadata as Record<string, unknown>)
      : {};
  const id = raw.id ?? index;
  const filePath = (raw.filePath ?? raw.file_path) as string | undefined;
  const thumbnailPath = (raw.thumbnailPath ?? raw.thumbnail_path) as string | undefined;
  const fallbackUrl =
    typeof id === 'string' || typeof id === 'number' ? `/api/media/images/${id}` : undefined;

  return {
    id: id as string | number,
    url: (raw.url ?? thumbnailPath ?? filePath ?? fallbackUrl) as string | undefined,
    fullUrl: (raw.fullUrl ?? filePath ?? fallbackUrl) as string | undefined,
    thumbnailUrl: (raw.thumbnailUrl ?? thumbnailPath ?? fallbackUrl) as string | undefined,
    title: (raw.title ?? metadata.title ?? metadata.caption) as string | undefined,
    caption: (raw.caption ?? raw.description ?? metadata.caption) as string | undefined,
    filename: (raw.filename ?? raw.fileName ?? filePath) as string | undefined,
    sourceType: (raw.sourceType ?? raw.fileType ?? raw.file_type) as string | undefined,
    type: (raw.type ?? raw.fileType ?? raw.file_type) as string | undefined,
    date: (raw.date ?? raw.dateTaken ?? raw.date_taken ?? metadata.date) as string | undefined,
    dateTaken: (raw.dateTaken ?? raw.date_taken) as string | undefined,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
    timestamp: (raw.timestamp ?? raw.createdAt ?? raw.created_at) as string | undefined,
    taggedPeople: toStringArray(raw.people ?? raw.relatedEntities ?? metadata.people),
    people: toStringArray(raw.people ?? raw.relatedEntities ?? metadata.people),
    entities: toStringArray(raw.relatedEntities ?? metadata.entities),
    riskRating: Number(raw.riskRating ?? raw.redFlagRating ?? raw.red_flag_rating ?? 0),
    redFlagRating: Number(raw.redFlagRating ?? raw.red_flag_rating ?? 0),
    directEvidence: Boolean(raw.directEvidence ?? metadata.directEvidence),
    verified: Boolean(raw.verified ?? raw.verificationStatus === 'verified'),
    filePath,
    thumbnailPath,
    metadata,
  };
};

const getRiskClass = (rating: number) => {
  if (rating >= 5) return 'risk-critical';
  if (rating >= 4) return 'risk-high';
  if (rating >= 3) return 'risk-medium';
  if (rating >= 2) return 'risk-low';
  return 'risk-minimal';
};

const textLooksLikeGibberish = (text: string): boolean => {
  if (!text) return true;
  const t = text.trim();
  if (t.length < 18) return true;
  const symbolRatio = (t.match(/[^a-zA-Z0-9\s,.;:'"!?()-]/g)?.length || 0) / t.length;
  const runCaps = /[A-Z]{8,}/.test(t);
  return symbolRatio > 0.2 || runCaps;
};

const normalizeEvidenceSnippet = (raw: string, fallbackTitle: string): string => {
  if (!raw) return fallbackTitle;
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/[_=]{3,}/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .trim();
  if (textLooksLikeGibberish(cleaned)) return fallbackTitle;
  return cleaned.slice(0, 460);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightTerms = (text: string, terms: Array<string | undefined | null>) => {
  const needles = Array.from(
    new Set(terms.filter((t): t is string => Boolean(t && t.trim())).map((t) => t.trim())),
  );
  if (needles.length === 0) return text;
  const pattern = new RegExp(`(${needles.map((t) => escapeRegExp(t)).join('|')})`, 'ig');
  return text.split(pattern).map((segment, idx) =>
    needles.some((needle) => needle.toLowerCase() === segment.toLowerCase()) ? (
      <mark
        key={`${segment}-${idx}`}
        className="bg-[var(--accent-glow)] text-[var(--accent)] px-1 rounded-sm"
      >
        {segment}
      </mark>
    ) : (
      <React.Fragment key={`${segment}-${idx}`}>{segment}</React.Fragment>
    ),
  );
};

const formatMetaDate = (value?: string | null): string => {
  if (!value) return 'Date unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unknown';
  return parsed.toLocaleDateString();
};

const resolveEntityPhotoUrl = (
  photo: EntityPhoto | undefined | null,
  preferThumbnail = true,
): string | null => {
  if (!photo) return null;

  const thumbCandidates = [
    photo.thumbnailUrl,
    photo.thumbnail_url,
    photo.thumbUrl,
    photo.thumb_url,
  ];
  const mainCandidates = [photo.url, photo.fullUrl, photo.imageUrl, photo.image_url, photo.src];
  const id = photo.id ? String(photo.id) : null;
  const generatedThumb = id ? `/api/media/images/${id}/thumbnail` : null;
  const generatedMain = id ? `/api/media/images/${id}` : null;

  const ordered = preferThumbnail
    ? [...thumbCandidates, generatedThumb, ...mainCandidates, generatedMain]
    : [...mainCandidates, generatedMain, ...thumbCandidates, generatedThumb];

  for (const candidate of ordered) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
};

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ entityId, isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const getTabFromUrl = useCallback(():
    | 'overview'
    | 'evidence'
    | 'media'
    | 'network'
    | 'investigations' => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('entityTab');
    if (
      tab === 'evidence' ||
      tab === 'media' ||
      tab === 'network' ||
      tab === 'overview' ||
      tab === 'investigations'
    ) {
      return tab;
    }
    return 'overview';
  }, [location.search]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'evidence' | 'media' | 'network' | 'investigations'
  >(getTabFromUrl());
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

  // Lazy load tabs - only fetch data when tab is activated
  const [tabsLoaded, setTabsLoaded] = useState<Set<string>>(new Set(['overview']));
  const urlState = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      tab: getTabFromUrl(),
      quickAction: params.get('entityAction'),
      entitySearch: params.get('entitySearch'),
    };
  }, [getTabFromUrl, location.search]);

  // Mark tab as loaded when activated
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
      const data = (await apiClient.get(`/entities/${entityId}`)) as EntityDetails;
      return data;
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
      if (import.meta.env.DEV) {
        console.warn('[EvidenceModal] URL tab changed; syncing modal tab', {
          urlTab: urlState.tab,
          activeTab,
        });
      }
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
        const response = (await apiClient.get(endpoint)) as {
          data?: EvidenceDocument[];
          total?: number;
        };

        let newDocs = Array.isArray(response.data) ? response.data : [];
        let total = response.total || 0;

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
          total =
            filteredFallbackDocs.length ||
            Number(fallback?.stats?.totalEvidence || fallbackDocs.length || 0);
        }

        setDocuments((prev) => [...prev, ...newDocs]);
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

    // Initial load
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

  type RelationshipEntry = {
    entity_id: string;
    relationship_type: string;
    strength: number;
    confidence: number;
    name?: string;
  };

  const networkEnabled =
    isOpen && !!entityId && activeTab === 'network' && tabsLoaded.has('network');
  const { data: relationships = [], isLoading: networkLoading } = useQuery<RelationshipEntry[]>({
    queryKey: ['relationships', entityId],
    queryFn: async () => {
      const resp = (await apiClient.get(`/relationships?entityId=${entityId}`)) as {
        relationships: Array<{
          entity_id: string;
          relationship_type: string;
          strength: number;
          confidence: number;
        }>;
      };
      let rels = resp.relationships || [];
      if (!rels.length) {
        const graphResp = (await apiClient.get(`/entities/${entityId}/graph?depth=2`)) as {
          edges?: Array<{
            source_id?: string | number;
            target_id?: string | number;
            relationship_type?: string;
            proximity_score?: number;
            weight?: number;
            confidence?: number;
          }>;
        };
        const graphEdges = Array.isArray(graphResp?.edges) ? graphResp.edges : [];
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
          try {
            const e = await apiClient.get(`/entities/${r.entity_id}`);
            const entityData = e as { fullName?: string; name?: string };
            return { ...r, name: entityData.fullName || entityData.name || r.entity_id };
          } catch {
            return { ...r, name: r.entity_id };
          }
        }),
      );
    },
    enabled: networkEnabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const investigationsEnabled =
    isOpen &&
    !!entityId &&
    activeTab === 'investigations' &&
    tabsLoaded.has('investigations') &&
    entity !== undefined;
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
      const fallbackResp = (await apiClient.get('/investigations?status=open&limit=6')) as
        | { data?: InvestigationEntity[] }
        | InvestigationEntity[];
      const fallbackItems: InvestigationEntity[] = Array.isArray(
        (fallbackResp as { data?: InvestigationEntity[] })?.data,
      )
        ? (fallbackResp as { data: InvestigationEntity[] }).data
        : Array.isArray(fallbackResp)
          ? (fallbackResp as InvestigationEntity[])
          : [];
      return fallbackItems.map((item) => ({
        ...item,
        _fallbackReason: 'Suggested open case',
      }));
    },
    enabled: investigationsEnabled,
    staleTime: 60_000,
  });

  const mediaEnabled = isOpen && !!entityId && activeTab === 'media' && tabsLoaded.has('media');
  const { data: mediaItems = [], isLoading: isMediaLoading } = useQuery<EntityPhoto[]>({
    queryKey: ['entityMedia', entityId],
    queryFn: async () => {
      const response = await fetch(`/api/entities/${entityId}/media`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (response.status === 204) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch entity media: ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      return Array.isArray(payload)
        ? payload.map((item, index) =>
            normalizeEntityMediaItem(item as Record<string, unknown>, index),
          )
        : [];
    },
    enabled: mediaEnabled,
    staleTime: 60_000,
  });

  // Forensic Calculations
  const forensicData = useMemo(() => {
    if (!entity) return null;
    const personAdapter: PersonAdapter = {
      ...entity,
      name: entity.fullName, // Required by PersonAdapter
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

  // Network Graph Data
  const graphData = useMemo(() => {
    if (!entity) return { entities: [], relationships: [] };

    const centralNode = {
      id: entity.id,
      name: entity.fullName,
      role: entity.primaryRole,
      type: 'Person',
      connectionCount: relationships.length,
      riskLevel: entity.redFlagRating || 0,
      photoUrl: entity.photos?.[0]?.url,
    };

    const relatedNodes = relationships.map((r) => ({
      id: r.entity_id,
      name: r.name || r.entity_id,
      role: 'Associate',
      type: 'Person',
      connectionCount: 1,
      riskLevel: 0,
    }));

    const links = relationships.map((r) => ({
      sourceId: String(entity.id),
      targetId: String(r.entity_id),
      source: String(entity.id),
      target: String(r.entity_id),
      type: r.relationship_type,
      weight: r.strength,
    }));

    return {
      entities: [centralNode, ...relatedNodes],
      relationships: links,
    };
  }, [entity, relationships]);

  const renderEvidenceCard = useCallback(
    (doc: EvidenceDocument) => {
      const excerpt = normalizeEvidenceSnippet(
        doc.contentPreview || doc.content || doc.title || '',
        doc.title || doc.fileName || `Document ${doc.id}`,
      );
      const significanceReason =
        (doc.redFlagRating || 0) >= 4
          ? 'High risk score in source record.'
          : doc.evidenceType
            ? `Matched in ${doc.evidenceType} evidence.`
            : 'Directly linked through entity mention context.';

      return (
        <button
          data-testid="entity-evidence-row"
          type="button"
          className="surface-glass-card p-6 h-full w-full flex flex-col justify-between bg-transparent text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 group"
          onClick={() => openDocumentFromEvidence(doc.id)}
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <span className="semantic-chip text-[10px] px-2 h-6 border-[var(--glass-border)] bg-[var(--glass-bg)] text-text-default uppercase tracking-widest">
                    {doc.evidenceType || 'Document'}
                  </span>
                  <span className="font-mono opacity-60">#{doc.id}</span>
                </div>
                <h4 className="text-base font-display text-text-strong truncate group-hover:text-[var(--accent)] transition-colors duration-300">
                  {doc.title || doc.fileName || `Document ${doc.id}`}
                </h4>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  openDocumentFromEvidence(doc.id, { newTab: true });
                }}
                className="control h-8 px-3 text-xs text-text-default flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Open <ExternalLink size={12} />
              </button>
            </div>
            <p className="text-sm text-text-muted leading-relaxed mt-4 line-clamp-2">
              {highlightTerms(excerpt, [entity?.fullName, doc.keyword])}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-text-dim uppercase tracking-wider font-medium">
            <span className="inline-flex items-center gap-1">
              <Clock size={10} />
              {doc.dateCreated ? new Date(doc.dateCreated).toLocaleDateString() : 'Date unknown'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Link2 size={10} />
              {doc.source_collection || 'Archive'}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-300/80">
              <AlertTriangle size={10} />
              {significanceReason}
            </span>
          </div>
        </button>
      );
    },
    [entity?.fullName, openDocumentFromEvidence],
  );
  const usePlainEvidenceList = totalDocs > 0 && totalDocs <= 500;

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
      const nextTab = action === 'timeline' ? 'network' : 'evidence';
      setActiveTab(nextTab);
      setTabsLoaded((prev) => new Set(prev).add(nextTab));
    },
    [entity?.fullName, location.pathname, location.search, navigate, navigateFromModal],
  );

  const forensicSummary = useMemo(() => {
    if (!entity || !forensicData) return '';
    const docsCount = totalDocs > 0 ? totalDocs : documents.length || entity.mentions;
    const mediaCount = entity.photos?.length || 0;
    const relationCount = relationships.length;
    const riskDescriptor =
      (entity.redFlagRating || 0) >= 4
        ? 'high direct exposure'
        : (entity.redFlagRating || 0) >= 2
          ? 'moderate exposure'
          : 'limited direct exposure';
    return `${riskDescriptor} across ${docsCount.toLocaleString()} documents; appears in ${mediaCount.toLocaleString()} verified media items; connected to ${relationCount.toLocaleString()} relationship signals.`;
  }, [documents.length, entity, forensicData, relationships.length, totalDocs]);

  // Scroll Lock
  useScrollLock(isOpen);

  // Performance monitoring
  const onRenderCallback = useCallback(
    (id: string, phase: 'mount' | 'update' | 'nested-update', actualDuration: number) => {
      if (typeof window !== 'undefined' && actualDuration > 16) {
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
    },
    [],
  );

  if (!isOpen) return null;

  const headerPhoto = entity?.photos?.[0];
  const headerPhotoId = headerPhoto?.id ? String(headerPhoto.id) : 'header-photo';
  const headerPhotoUrl = resolveEntityPhotoUrl(headerPhoto, true);

  return createPortal(
    <Profiler id="EvidenceModal" onRender={onRenderCallback}>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            data-testid="evidence-modal"
            className="relative w-full max-w-6xl h-[85vh] surface-glass overflow-hidden flex flex-col shadow-[var(--glass-shadow)]"
          >
            <div className="app-header-glass flex p-6 md:p-10 items-start gap-6 md:gap-10 shrink-0 relative z-10">
              <div className="relative shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[var(--bg-dark)] ring-1 ring-[var(--glass-border)] overflow-hidden shadow-[var(--glass-shadow-soft)] relative">
                  {loading ? (
                    <div className="w-full h-full animate-pulse bg-white/5" />
                  ) : headerPhotoUrl && !brokenMediaIds[headerPhotoId] ? (
                    <img
                      src={headerPhotoUrl}
                      alt={entity?.fullName || 'Profile image'}
                      className="w-full h-full object-cover"
                      onError={(event) => {
                        const fallbackUrl = resolveEntityPhotoUrl(headerPhoto, false);
                        const img = event.currentTarget;
                        if (
                          fallbackUrl &&
                          img.dataset.fallbackApplied !== '1' &&
                          fallbackUrl !== img.src
                        ) {
                          img.dataset.fallbackApplied = '1';
                          img.src = fallbackUrl;
                          return;
                        }
                        setBrokenMediaIds((prev) => ({ ...prev, [headerPhotoId]: true }));
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-primary)]">
                      <Search size={32} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-10 w-64 bg-white/5 rounded-md animate-pulse" />
                    <div className="h-6 w-48 bg-white/5 rounded-md animate-pulse" />
                    <div className="flex gap-4 pt-2">
                      <div className="h-4 w-24 bg-white/5 rounded-md animate-pulse" />
                      <div className="h-4 w-24 bg-white/5 rounded-md animate-pulse" />
                      <div className="h-4 w-24 bg-white/5 rounded-md animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-4xl md:text-5xl font-display font-medium text-text-strong tracking-tight truncate">
                        {entity?.fullName}
                      </h2>
                      <span className={`semantic-chip ${getRiskClass(entity?.redFlagRating || 0)}`}>
                        <ShieldAlert size={12} className="opacity-80" />
                        Risk {(entity?.redFlagRating || 0).toFixed(0)}/5
                      </span>
                    </div>
                    <div className="text-[var(--accent)] text-lg md:text-xl font-light tracking-widest uppercase mb-6 flex items-center flex-wrap gap-3">
                      <span>{entity?.primaryRole}</span>
                      {(entity?.birthDate || entity?.deathDate) && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/30" />
                          <span className="text-sm font-mono text-text-muted">
                            {entity?.birthDate ? `b. ${entity.birthDate}` : ''}
                            {entity?.deathDate ? ` • d. ${entity.deathDate}` : ''}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="border-l border-[var(--glass-border)] pl-5 py-1 mb-6">
                      <span className="font-sans font-semibold text-xs tracking-[0.2em] uppercase text-[var(--accent)] opacity-80 block mb-2">
                        Forensic Profile
                      </span>
                      <p className="text-base text-text-muted leading-relaxed max-w-3xl">
                        {forensicSummary}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <button
                        onClick={() => handleQuickAction('blackbook')}
                        data-testid="entity-modal-action-blackbook"
                        className="control h-10 px-4 text-xs font-semibold uppercase tracking-wider text-[var(--accent-investigate)] hover:text-[var(--text-primary)] flex items-center gap-2"
                      >
                        <BookOpen size={14} />
                        Black Book Entry
                      </button>
                      <button
                        onClick={() => handleQuickAction('timeline')}
                        data-testid="entity-modal-action-timeline"
                        className="text-xs text-[var(--accent)] hover:text-blue-200 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Calendar size={12} />
                        Timeline
                      </button>
                      <button
                        onClick={() => handleQuickAction('search')}
                        data-testid="entity-modal-action-search"
                        className="text-xs text-[var(--accent)] hover:text-cyan-200 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Search size={12} />
                        Search
                      </button>
                    </div>
                    {activeQuickAction && (
                      <p
                        data-testid="entity-modal-context"
                        className="text-[11px] text-[var(--text-muted)] mb-2"
                      >
                        Context:{' '}
                        {activeQuickAction === 'blackbook'
                          ? 'Black Book'
                          : activeQuickAction === 'timeline'
                            ? 'Timeline'
                            : 'Search'}
                      </p>
                    )}
                  </>
                )}

                {/* ACTION TABS */}
                <Tabs
                  tabs={EVIDENCE_TABS}
                  activeTab={activeTab}
                  onChange={(key) => {
                    if (isEvidenceModalTab(key)) {
                      handleTabChange(key);
                    }
                  }}
                  className="!bg-transparent !border-none !px-0"
                />
              </div>

              <CloseButton
                onClick={onClose}
                size="md"
                label="Close entity profile"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              />
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 min-h-0 relative bg-[var(--glass-bg-strong)]">
              {/* 1. OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div
                  className="absolute inset-0 overflow-y-auto custom-scrollbar"
                  data-testid="entity-modal-tab-overview"
                >
                  {loading && (
                    <div className="p-6 space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-48 w-full rounded-[var(--radius-lg)] bg-[var(--glass-bg)]" />
                        <Skeleton className="h-48 w-full rounded-[var(--radius-lg)] bg-[var(--glass-bg)]" />
                      </div>
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-48 rounded-[var(--radius-sm)] bg-[var(--glass-bg)]" />
                        <Skeleton className="h-24 w-full rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
                        <Skeleton className="h-24 w-full rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
                      </div>
                    </div>
                  )}

                  {!loading && entity && forensicData && (
                    <div className="p-6 space-y-8">
                      {/* METRICS & SIGNAL PANEL */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                        <div className="surface-glass-card p-6 flex flex-col justify-between">
                          <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span
                              className={`semantic-chip ${getRiskClass(entity.redFlagRating || 0)}`}
                            >
                              <ShieldAlert size={12} className="opacity-80" />
                              Risk {(entity.redFlagRating || 0).toFixed(0)}/5
                            </span>
                            <span
                              className={`semantic-chip ${
                                forensicData.ladder.level === 'L1'
                                  ? 'evidence-direct'
                                  : forensicData.ladder.level === 'L2'
                                    ? 'evidence-inferred'
                                    : forensicData.ladder.level === 'L3'
                                      ? 'evidence-agentic'
                                      : 'text-text-muted border-[var(--glass-border)] bg-[var(--glass-bg)]'
                              }`}
                            >
                              <Sparkles size={12} className="opacity-80" />
                              {forensicData.ladder.level === 'L1'
                                ? 'Direct Evidence'
                                : forensicData.ladder.level === 'L2'
                                  ? 'Inferred Evidence'
                                  : forensicData.ladder.level === 'L3'
                                    ? 'Agentic Evidence'
                                    : 'Evidence Unspecified'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-4 bg-[var(--glass-bg)] rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)] flex flex-col items-center justify-center text-center">
                              <div className="text-2xl font-display text-[var(--accent)] mb-1">
                                {entity.mentions}
                              </div>
                              <div className="text-[10px] font-semibold tracking-widest uppercase text-text-dim">
                                Mentions
                              </div>
                            </div>
                            <div className="p-4 bg-[var(--glass-bg)] rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)] flex flex-col items-center justify-center text-center">
                              <div className="text-2xl font-display text-[var(--accent-emails)] mb-1">
                                {totalDocs > 0 ? totalDocs : entity.mentions}
                              </div>
                              <div className="text-[10px] font-semibold tracking-widest uppercase text-text-dim">
                                Documents
                              </div>
                            </div>
                            <div className="p-4 bg-[var(--glass-bg)] rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)] flex flex-col items-center justify-center text-center">
                              <div className="text-2xl font-display text-[var(--accent)] mb-1">
                                {entity.photos?.length || 0}
                              </div>
                              <div className="text-[10px] font-semibold tracking-widest uppercase text-text-dim">
                                Media
                              </div>
                            </div>
                            <div className="p-4 bg-[var(--glass-bg)] rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--glass-border)_42%,transparent)] flex flex-col items-center justify-center text-center">
                              <div className="text-2xl font-display text-[var(--accent-evidence)] mb-1">
                                {entity.evidenceTypes?.length || 0}
                              </div>
                              <div className="text-[10px] font-semibold tracking-widest uppercase text-text-dim">
                                Source Types
                              </div>
                            </div>
                          </div>
                          <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
                            <h4 className="text-[11px] font-semibold tracking-[0.2em] text-text-muted uppercase mb-4 flex items-center gap-2">
                              <Activity size={12} className="text-[var(--accent)]" /> Key Drivers
                            </h4>
                            <DriverChips chips={forensicData.drivers} />
                          </div>
                        </div>

                        <div className="surface-glass-card p-6">
                          <h4 className="text-[11px] font-semibold tracking-[0.2em] text-text-muted uppercase mb-5 flex items-center justify-between">
                            <span>Forensic Signals</span>
                            <span className="font-mono text-[9px] text-text-dim opacity-70">
                              EXO-METRICS v2
                            </span>
                          </h4>
                          <SignalPanel metrics={forensicData.signals} />

                          <div className="mt-6 p-4 surface-quiet rounded-[var(--radius-md)] border-l-2 border-l-[var(--accent)]">
                            <div className="text-sm text-text-muted leading-relaxed">
                              <span className="text-text-default font-medium uppercase text-xs tracking-wider block mb-1">
                                Analysis
                              </span>{' '}
                              {forensicData.ladder.description}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* HIGH SIGNIFICANCE EVIDENCE */}
                      {entity.significantPassages && entity.significantPassages.length > 0 && (
                        <div className="mt-10">
                          <h3 className="text-text-strong font-medium flex items-center gap-3 font-sans tracking-wide text-sm mb-6 pb-2 border-b border-[var(--glass-border)]">
                            <AlertTriangle size={16} className="text-[var(--risk-critical)]" /> High
                            Significance Evidence
                          </h3>
                          <div className="grid gap-4">
                            {entity.significantPassages.map((passage, idx) => (
                              <article
                                key={idx}
                                className={`surface-glass-card p-6 hover:bg-[var(--glass-bg-strong)] transition-colors ${
                                  passage.documentId
                                    ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50'
                                    : ''
                                }`}
                                role={passage.documentId ? 'button' : undefined}
                                tabIndex={passage.documentId ? 0 : undefined}
                                onClick={
                                  passage.documentId
                                    ? () => openDocumentFromEvidence(passage.documentId)
                                    : undefined
                                }
                                onKeyDown={
                                  passage.documentId
                                    ? (event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          openDocumentFromEvidence(passage.documentId);
                                        }
                                      }
                                    : undefined
                                }
                              >
                                <div className="flex items-start gap-5">
                                  <div className="mt-1 shrink-0 p-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] text-text-muted transition-colors">
                                    <FileText size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                      <span className="semantic-chip text-[10px] px-2 h-6 border-[var(--glass-border)] bg-[var(--glass-bg)] text-text-default uppercase tracking-widest">
                                        {passage.source || 'Document'}
                                      </span>
                                      <span className="text-xs font-mono text-text-dim">
                                        #{passage.documentId || 'n/a'}
                                      </span>
                                      {passage.documentId && (
                                        <button
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openDocumentFromEvidence(passage.documentId, {
                                              newTab: true,
                                            });
                                          }}
                                          className="ml-auto text-xs font-semibold tracking-wider uppercase text-[var(--accent)] hover:text-[var(--text-primary)] flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                                        >
                                          Open source <ExternalLink size={12} />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-text-muted text-sm leading-relaxed border-l-[3px] border-[var(--glass-border)] pl-4 mb-4">
                                      {highlightTerms(
                                        normalizeEvidenceSnippet(
                                          passage.passage ||
                                            passage.mention_context ||
                                            passage.contentSnippet ||
                                            passage.text ||
                                            passage.content ||
                                            '',
                                          passage.filename ||
                                            `Document ${passage.documentId || ''}`,
                                        ),
                                        [entity.fullName, passage.keyword],
                                      )}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium tracking-wider uppercase text-text-dim">
                                      <span className="inline-flex items-center gap-1.5">
                                        <FileText size={12} />{' '}
                                        {passage.filename || 'Untitled source'}
                                      </span>
                                      <span className="inline-flex items-center gap-1.5 text-[var(--risk-medium)]">
                                        <AlertTriangle size={12} />
                                        Why significant:{' '}
                                        {passage.keyword
                                          ? 'Matched high-risk phrase.'
                                          : 'Direct mention context in high-signal evidence.'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* BLACK BOOK ENTRY */}
                      {entity.blackBookEntries && entity.blackBookEntries.length > 0 && (
                        <div
                          ref={blackBookSectionRef}
                          className="surface-glass-card border-l-[3px] border-l-[var(--accent-investigate)] p-6 mb-10 mt-10"
                        >
                          <div className="flex items-center justify-between mb-5">
                            <h3 className="text-text-strong font-medium flex items-center gap-2 font-sans tracking-wide text-sm">
                              <BookOpen size={16} className="text-[var(--accent-investigate)]" />
                              Black Book Entry
                            </h3>
                            <button
                              onClick={() =>
                                navigateFromModal(
                                  `/blackbook?search=${encodeURIComponent(entity.fullName)}`,
                                )
                              }
                              className="text-[11px] font-bold tracking-widest uppercase text-text-muted hover:text-[var(--accent-investigate)] flex items-center gap-1.5 transition-colors"
                            >
                              View in Black Book <ExternalLink size={12} />
                            </button>
                          </div>

                          <div className="space-y-4">
                            {entity.blackBookEntries.map((entry, idx) => (
                              <div key={idx} className="space-y-3">
                                {entry.phoneNumbers && entry.phoneNumbers.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {entry.phoneNumbers.map((phone: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-3 py-1.5 bg-[var(--glass-bg)] text-text-default text-xs font-mono rounded-[var(--radius-sm)] border border-[var(--glass-border)] flex items-center gap-2"
                                      >
                                        <Icon name="Phone" size="xs" className="opacity-60" />{' '}
                                        {phone}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {entry.notes && (
                                  <p className="text-text-muted text-sm italic border-l-[3px] border-[var(--glass-border)] pl-4 py-1">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* BIO */}
                      <div>
                        <h3 className="text-[var(--text-secondary)] font-semibold mb-3">
                          Biography
                        </h3>
                        <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-4xl">
                          {entity.bio || entity.description || 'No biographical data available.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. EVIDENCE TAB */}
              {activeTab === 'evidence' && (
                <div
                  className="h-full flex flex-col min-h-0"
                  data-testid="entity-modal-tab-evidence"
                >
                  {/* FILTERS TOOLBAR */}
                  <div className="p-5 md:p-6 border-b border-[color:color-mix(in_srgb,var(--glass-border)_60%,transparent)] flex flex-col md:flex-row gap-4 shrink-0 bg-transparent">
                    <div className="relative flex-1 max-w-lg header-search-pill">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-[var(--accent)]"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search relevant documents..."
                        className="w-full bg-transparent border-none pl-12 pr-6 py-3 text-sm text-text-strong font-medium placeholder:text-text-muted focus:outline-none focus:ring-0"
                        value={docFilters.search}
                        onChange={(e) => handleFilterChange({ search: e.target.value })}
                      />
                    </div>
                    <div className="text-[11px] font-semibold tracking-widest uppercase text-text-muted md:ml-auto self-center bg-[var(--glass-bg)] px-4 py-2 rounded-full soft-glass-outline">
                      <span data-testid="entity-evidence-count">
                        {isDocsLoading
                          ? 'Loading evidence...'
                          : `${totalDocs.toLocaleString()} evidence sources`}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 bg-transparent overflow-hidden">
                    {isDocsLoading && documents.length === 0 ? (
                      <div className="p-6 space-y-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-28 surface-glass-card rounded-[var(--radius-lg)] p-5 flex gap-5 items-center animate-pulse"
                          >
                            <div className="w-14 h-14 rounded bg-white/5" />
                            <div className="flex-1 space-y-3">
                              <div className="h-5 w-3/4 bg-white/5 rounded" />
                              <div className="h-4 w-1/2 bg-white/5 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !isDocsLoading && documents.length === 0 ? (
                      <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-text-dim text-center px-6">
                        <FileText size={44} className="mb-4 opacity-30 text-[var(--accent)]" />
                        <h4 className="text-text-strong font-display text-xl mb-2">
                          No Linked Evidence Found
                        </h4>
                        <p className="text-sm text-text-muted max-w-md">
                          We could not find evidence items for "{entity?.fullName}" using current
                          filters.
                        </p>
                      </div>
                    ) : (
                      <div className="h-full w-full" data-testid="entity-evidence-list-container">
                        {usePlainEvidenceList ? (
                          <div
                            className="h-full overflow-y-auto custom-scrollbar p-2 px-4 space-y-2"
                            data-testid="entity-evidence-plain-list"
                          >
                            {documents.map((doc) => (
                              <div key={String(doc.id)} className="min-h-[164px]">
                                {renderEvidenceCard(doc)}
                              </div>
                            ))}
                            {hasNextPage && (
                              <div className="py-3 flex justify-center">
                                <button
                                  type="button"
                                  className="control h-9 px-4 text-xs text-[var(--text-primary)]"
                                  disabled={isNextPageLoading}
                                  onClick={() => void loadNextPage(documents.length)}
                                  data-testid="entity-evidence-load-more"
                                >
                                  {isNextPageLoading ? 'Loading more…' : 'Load more evidence'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          typeof TypedAutoSizer !== 'undefined' && (
                            <TypedAutoSizer>
                              {({ height, width }: { height: number; width: number }) =>
                                !Number.isFinite(height) ||
                                !Number.isFinite(width) ||
                                height < 120 ||
                                width < 200 ? (
                                  <div
                                    className="h-full overflow-y-auto custom-scrollbar p-2 px-4 space-y-2"
                                    data-testid="entity-evidence-fallback-list"
                                  >
                                    {documents
                                      .slice(0, Math.min(documents.length, 20))
                                      .map((doc) => (
                                        <div
                                          key={String(doc.id)}
                                          className="min-h-[164px]"
                                          data-testid="entity-evidence-fallback-row"
                                        >
                                          {renderEvidenceCard(doc)}
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <TypedInfiniteLoader
                                    isItemLoaded={isItemLoaded}
                                    itemCount={totalDocs}
                                    loadMoreItems={loadNextPage}
                                  >
                                    {({ onItemsRendered, ref }) => (
                                      <List
                                        className="custom-scrollbar"
                                        data-testid="entity-evidence-virtual-list"
                                        height={height}
                                        itemCount={totalDocs}
                                        itemSize={180}
                                        width={width}
                                        onItemsRendered={onItemsRendered}
                                        ref={
                                          ref as unknown as React.Ref<
                                            import('react-window').FixedSizeList
                                          >
                                        }
                                      >
                                        {({
                                          index,
                                          style,
                                        }: {
                                          index: number;
                                          style: React.CSSProperties;
                                        }) => {
                                          const doc = documents[index];
                                          if (!doc) {
                                            return (
                                              <div style={style} className="p-4">
                                                <div className="h-full bg-slate-950/20 soft-glass-outline rounded-[var(--radius-lg)] animate-pulse" />
                                              </div>
                                            );
                                          }

                                          return (
                                            <div style={style} className="p-2 px-4">
                                              {renderEvidenceCard(doc)}
                                            </div>
                                          );
                                        }}
                                      </List>
                                    )}
                                  </TypedInfiniteLoader>
                                )
                              }
                            </TypedAutoSizer>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. MEDIA TAB */}
              {activeTab === 'media' && entity && (
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6">
                  {isMediaLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <Search size={48} className="mx-auto mb-4 opacity-20 animate-pulse" />
                      <p>Loading linked media…</p>
                    </div>
                  ) : (mediaItems.length > 0 ? mediaItems : entity.photos || []).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {(mediaItems.length > 0 ? mediaItems : entity.photos || []).map(
                        (photo, i) => {
                          const title =
                            photo.title || photo.caption || photo.filename || `Media item ${i + 1}`;
                          const sourceType = photo.sourceType || photo.type || 'Media';
                          const date = formatMetaDate(
                            photo.date || photo.createdAt || photo.timestamp,
                          );
                          const taggedPeople = Array.isArray(photo.taggedPeople)
                            ? photo.taggedPeople
                            : Array.isArray(photo.people)
                              ? photo.people
                              : Array.isArray(photo.entities)
                                ? photo.entities
                                : [];
                          const riskRating = Number(photo.riskRating || photo.redFlagRating || 0);
                          const hasDirectSignal = Boolean(photo.directEvidence || photo.verified);

                          return (
                            <article
                              key={i}
                              className="surface-glass-card overflow-hidden group soft-glass-outline"
                            >
                              <div className="aspect-video bg-[var(--bg-dark)] overflow-hidden relative border-b border-[color:color-mix(in_srgb,var(--glass-border)_60%,transparent)]">
                                {brokenMediaIds[String(photo.id)] ? (
                                  <div className="w-full h-full flex items-center justify-center text-text-dim">
                                    <ImageIcon size={28} />
                                  </div>
                                ) : (
                                  <img
                                    src={photo.url || photo.thumbnailUrl || photo.fullUrl}
                                    alt={title}
                                    className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                                    onError={(event) => {
                                      const id = String(photo.id || i);
                                      const fallbackUrl =
                                        photo.fullUrl ||
                                        photo.filePath ||
                                        `/api/media/images/${id}`;
                                      const img = event.currentTarget;
                                      if (img.dataset.fallbackApplied !== '1') {
                                        img.dataset.fallbackApplied = '1';
                                        img.src = fallbackUrl;
                                        return;
                                      }
                                      setBrokenMediaIds((prev) => ({ ...prev, [id]: true }));
                                    }}
                                  />
                                )}
                              </div>
                              <div className="p-5">
                                <div className="flex items-start gap-3 mb-3">
                                  <h4 className="text-base font-display text-text-strong line-clamp-2 flex-1 group-hover:text-[var(--accent)] transition-colors">
                                    {title}
                                  </h4>
                                  {riskRating > 0 && (
                                    <span
                                      className={`semantic-chip ${getRiskClass(riskRating)} shrink-0`}
                                    >
                                      <ShieldAlert size={12} className="opacity-80" />
                                      {riskRating.toFixed(0)}/5
                                    </span>
                                  )}
                                  {hasDirectSignal && (
                                    <span className="semantic-chip evidence-direct shrink-0">
                                      <Sparkles size={12} className="opacity-80" />
                                      Direct
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-semibold tracking-wider uppercase text-text-dim flex flex-wrap items-center gap-4">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    {date}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <ImageIcon size={12} />
                                    {sourceType}
                                  </span>
                                </div>

                                {taggedPeople.length > 0 && (
                                  <div className="mt-4 text-[11px] font-mono text-text-muted">
                                    <span className="text-text-dim uppercase tracking-widest font-sans font-semibold mr-2">
                                      Tagged:
                                    </span>{' '}
                                    {taggedPeople.slice(0, 3).join(', ')}
                                    {taggedPeople.length > 3 ? ` +${taggedPeople.length - 3}` : ''}
                                  </div>
                                )}

                                <div className="mt-5 pt-4 border-t border-[var(--glass-border)] flex items-center justify-end">
                                  <button
                                    onClick={() =>
                                      window.open(
                                        photo.fullUrl ||
                                          photo.url ||
                                          `/api/media/images/${photo.id}`,
                                        '_blank',
                                      )
                                    }
                                    className="control h-8 px-4 text-xs font-semibold tracking-wider uppercase text-text-default flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Open media item ${title}`}
                                    title="Open media in new tab"
                                  >
                                    View <ExternalLink size={12} />
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-[var(--text-muted)]">
                      <Search size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No media files found for this entity.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. NETWORK TAB */}
              {activeTab === 'network' && (
                <div
                  className="absolute inset-0 overflow-hidden bg-[var(--glass-bg-strong)]"
                  data-testid="entity-modal-tab-network"
                >
                  {networkLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <Search size={32} className="mx-auto mb-4 opacity-20 animate-pulse" />
                      <p>Loading network graph...</p>
                    </div>
                  ) : relationships.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <Search size={32} className="mx-auto mb-4 opacity-20" />
                      <p>No connections found.</p>
                    </div>
                  ) : (
                    <NetworkGraph
                      entities={graphData.entities}
                      relationships={graphData.relationships}
                      onEntityClick={(node) => {
                        if (String(node.id) !== String(entity?.id)) {
                          window.open(`/entities/${node.id}`, '_blank');
                        }
                      }}
                      maxNodes={50}
                    />
                  )}
                </div>
              )}

              {/* 5. INVESTIGATIONS TAB */}
              {activeTab === 'investigations' && (
                <div className="h-full flex flex-col min-h-0 bg-transparent">
                  <div className="p-6 border-b border-[color:color-mix(in_srgb,var(--glass-border)_60%,transparent)] flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-semibold text-text-strong flex items-center gap-3 font-sans tracking-wide">
                      <Briefcase size={16} className="text-[var(--accent-investigate)]" />
                      Linked Investigations
                    </h3>
                    <div className="text-[11px] font-semibold tracking-widest uppercase text-text-muted bg-[var(--glass-bg)] px-4 py-2 rounded-full soft-glass-outline">
                      {isInvestigationsLoading
                        ? 'Loading cases...'
                        : `${investigations.length} open cases`}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                    {isInvestigationsLoading && (
                      <div className="space-y-5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="surface-glass-card p-6 space-y-4 animate-pulse">
                            <div className="h-6 w-1/3 bg-white/5 rounded" />
                            <div className="h-4 w-2/3 bg-white/5 rounded" />
                            <div className="flex gap-4">
                              <div className="h-6 w-24 bg-white/5 rounded-full" />
                              <div className="h-6 w-24 bg-white/5 rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isInvestigationsLoading &&
                      investigationsInitialized &&
                      investigations.length === 0 && (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-text-dim text-center px-6">
                          <Briefcase
                            size={48}
                            className="mb-4 opacity-30 text-[var(--accent-investigate)]"
                          />
                          <h4 className="text-text-strong font-display text-xl mb-2">
                            No Active Investigations
                          </h4>
                          <p className="text-sm text-text-muted max-w-sm">
                            This entity is not currently linked as primary evidence in any open
                            investigation workflows.
                          </p>
                        </div>
                      )}

                    {!isInvestigationsLoading &&
                      investigations.map((inv) => (
                        <div
                          key={inv.id}
                          className="group surface-glass-card p-6 border-l-[3px] border-l-[var(--accent-investigate)]"
                        >
                          <div className="flex items-start justify-between gap-5 mb-4">
                            <div className="min-w-0">
                              <h4 className="text-lg font-display text-text-strong group-hover:text-[var(--accent-investigate)] transition-colors truncate">
                                {inv.title}
                              </h4>
                              <p className="text-sm text-text-muted mt-2 line-clamp-2">
                                {inv.description || 'No case description provided.'}
                              </p>
                            </div>
                            <button
                              onClick={() => navigateFromModal(`/investigations/${inv.uuid}`)}
                              className="control flex h-10 px-5 items-center gap-2 text-[11px] font-bold tracking-widest uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Open Case
                              <ExternalLink size={14} />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[var(--glass-border)]">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-3 py-1 rounded-[var(--radius-sm)] uppercase tracking-wider border',
                                inv.status === 'open'
                                  ? 'bg-[var(--glass-bg)] text-[var(--accent-investigate)] border-[var(--accent-investigate)]/20'
                                  : 'bg-[var(--glass-bg)] text-text-dim border-[var(--glass-border)]',
                              )}
                            >
                              {inv.status}
                            </span>
                            {inv._fallbackReason && (
                              <span className="text-[10px] font-bold px-3 py-1 rounded-[var(--radius-sm)] uppercase tracking-wider border border-[var(--accent)]/20 text-[var(--accent)] bg-[var(--glass-bg)]">
                                {inv._fallbackReason}
                              </span>
                            )}
                            <span className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase text-text-dim">
                              <Clock size={12} className="opacity-70" />
                              Updated {formatMetaDate(inv.updated_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </Profiler>,
    document.body,
  );
};
