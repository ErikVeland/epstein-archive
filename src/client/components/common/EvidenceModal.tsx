import React, { useState, useEffect, useMemo, useCallback, Profiler } from 'react';
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
const TypedAutoSizer = AutoSizer as any;
const TypedInfiniteLoader = InfiniteLoader as any;
import { Tabs, TabItem } from './Tabs';

const EVIDENCE_TABS: TabItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'investigations', label: 'Investigations' },
  { key: 'media', label: 'Media' },
  { key: 'network', label: 'Network' },
];

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
  fileReferences: any[]; // Kept for types but unused in virtualized view
  significantPassages: any[];
  photos: any[];
  evidenceTypes: string[];
  blackBookEntries?: BlackBookEntry[];
  birthDate?: string | null;
  deathDate?: string | null;
}

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
      <mark key={`${segment}-${idx}`} className="bg-amber-400/35 text-amber-100 px-0.5 rounded">
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

const resolveEntityPhotoUrl = (photo: any, preferThumbnail = true): string | null => {
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
  const [entity, setEntity] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Documents Pagination State
  const [documents, setDocuments] = useState<any[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [docsInitialized, setDocsInitialized] = useState(false);
  const [docFilters, setDocFilters] = useState({ search: '', source: 'all', sort: 'relevance' });

  // Investigations State
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [isInvestigationsLoading, setIsInvestigationsLoading] = useState(false);
  const [investigationsInitialized, setInvestigationsInitialized] = useState(false);

  // Lazy load tabs - only fetch data when tab is activated
  const [tabsLoaded, setTabsLoaded] = useState<Set<string>>(new Set(['overview']));

  // Mark tab as loaded when activated
  const handleTabChange = useCallback(
    (tab: 'overview' | 'evidence' | 'media' | 'network' | 'investigations') => {
      const params = new URLSearchParams(location.search);
      params.set('entityTab', tab);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      setActiveTab(tab);
      setTabsLoaded((prev) => new Set(prev).add(tab));
    },
    [location.pathname, location.search, navigate],
  );

  // Relationships (Network) State
  const [relationships, setRelationships] = useState<
    Array<{
      entity_id: string;
      relationship_type: string;
      strength: number;
      confidence: number;
      name?: string;
    }>
  >([]);
  const [networkLoading, setNetworkLoading] = useState(false);
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

  const isHighProfileEntity = useMemo(() => {
    const name = String(entity?.fullName || '').toLowerCase();
    return (
      name.includes('jeffrey epstein') ||
      name.includes('ghislaine maxwell') ||
      name.includes('donald trump')
    );
  }, [entity?.fullName]);

  const fetchEntityDetails = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiClient.get(`/entities/${entityId}`)) as EntityDetails;
      setEntity(data);
    } catch (_err) {
      console.error('Failed to load entity details');
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchEntityDetails();
    }
  }, [isOpen, entityId, fetchEntityDetails]);

  useEffect(() => {
    if (!isOpen) return;
    setTabsLoaded((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab, isOpen]);

  useEffect(() => {
    const urlTab = getTabFromUrl();
    if (urlTab !== activeTab) {
      if (import.meta.env.DEV) {
        console.warn('[EvidenceModal] URL tab changed; syncing modal tab', {
          urlTab,
          activeTab,
        });
      }
      setActiveTab(urlTab);
      setTabsLoaded((prev) => new Set(prev).add(urlTab));
    }
  }, [activeTab, getTabFromUrl]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const quickAction = params.get('entityAction');
    if (!quickAction) return;

    if (quickAction === 'timeline') {
      setActiveQuickAction('timeline');
      setActiveTab('network');
      setTabsLoaded((prev) => new Set(prev).add('network'));
      return;
    }

    if (quickAction === 'search') {
      setActiveQuickAction('search');
      setActiveTab('evidence');
      setTabsLoaded((prev) => new Set(prev).add('evidence'));
      const query = params.get('entitySearch');
      if (query) {
        setDocFilters((prev) => ({ ...prev, search: query }));
      }
      return;
    }

    if (quickAction === 'blackbook') {
      setActiveQuickAction('blackbook');
      if (entity?.fullName) {
        navigateFromModal(`/blackbook?search=${encodeURIComponent(entity.fullName)}`);
      }
    }
  }, [entity?.fullName, location.search, navigateFromModal]);

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

        const newDocs = response.data || [];
        const total = response.total || 0;

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

  useEffect(() => {
    // Only load relationships if network tab has been activated
    if (isOpen && entityId && activeTab === 'network' && tabsLoaded.has('network')) {
      const fetchRelationships = async () => {
        setNetworkLoading(true);
        try {
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
          const withNames = await Promise.all(
            top.map(async (r) => {
              try {
                const e = await apiClient.get(`/entities/${r.entity_id}`);
                return { ...r, name: (e as any).fullName || (e as any).name || r.entity_id };
              } catch {
                return { ...r, name: r.entity_id };
              }
            }),
          );
          setRelationships(withNames);
        } catch (e) {
          console.error('Error loading relationships', e);
          setRelationships([]);
        } finally {
          setNetworkLoading(false);
        }
      };
      fetchRelationships();
    }
  }, [isOpen, entityId, activeTab, tabsLoaded]);

  useEffect(() => {
    if (!(isOpen && entityId && activeTab === 'investigations' && tabsLoaded.has('investigations')))
      return;
    let mounted = true;
    const loadInvestigations = async () => {
      setIsInvestigationsLoading(true);
      try {
        const response = (await apiClient.get(`/entities/${entityId}/investigations`)) as any;
        if (!mounted) return;
        const primary = Array.isArray(response) ? response : [];
        if (primary.length > 0 || !isHighProfileEntity) {
          setInvestigations(primary);
        } else {
          const fallbackResp = (await apiClient.get('/investigations?status=open&limit=6')) as any;
          const fallbackItems = Array.isArray(fallbackResp?.data)
            ? fallbackResp.data
            : Array.isArray(fallbackResp)
              ? fallbackResp
              : [];
          setInvestigations(
            fallbackItems.map((item: any) => ({
              ...item,
              _fallbackReason: 'Suggested open case',
            })),
          );
        }
      } catch (error) {
        console.error('Error loading entity investigations', error);
        if (mounted) setInvestigations([]);
      } finally {
        if (mounted) {
          setInvestigationsInitialized(true);
          setIsInvestigationsLoading(false);
        }
      }
    };
    loadInvestigations();
    return () => {
      mounted = false;
    };
  }, [activeTab, entityId, isHighProfileEntity, isOpen, tabsLoaded]);

  // Forensic Calculations
  const forensicData = useMemo(() => {
    if (!entity) return null;
    const personAdapter = {
      ...entity,
      name: entity.fullName, // Required by PersonAdapter
      files: 0,
      contexts: [],
      evidenceTypes: entity.evidenceTypes || [],
    } as any;

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
    (doc: any) => {
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
        <article
          data-testid="entity-evidence-row"
          className="bg-slate-950 border border-slate-800 rounded-[var(--radius-md)] p-4 hover:border-slate-600 transition-colors h-full flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
          role="button"
          tabIndex={0}
          onClick={() => openDocumentFromEvidence(doc.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openDocumentFromEvidence(doc.id);
            }
          }}
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span className="semantic-chip text-[10px] px-2 h-6 border-slate-700/70 bg-slate-900/70 text-slate-300">
                    {doc.evidenceType || 'Document'}
                  </span>
                  <span className="font-mono">#{doc.id}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-100 truncate">
                  {doc.title || doc.fileName || `Document ${doc.id}`}
                </h4>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  openDocumentFromEvidence(doc.id, { newTab: true });
                }}
                className="control h-8 px-3 text-xs text-slate-200 flex items-center gap-1"
              >
                Open <ExternalLink size={12} />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-2 line-clamp-2">
              {highlightTerms(excerpt, [entity?.fullName, doc.keyword])}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/70 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
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
        </article>
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
            PerformanceMonitor.logRender(`EvidenceModal-${id}`, actualDuration, phase as any);
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
            className="relative w-full max-w-6xl h-[85vh] surface-glass overflow-hidden flex flex-col"
          >
            <div className="flex bg-slate-950/70 p-4 md:p-6 border-b border-slate-800 items-start gap-4 md:gap-6 shrink-0">
              <div className="relative shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[var(--radius-md)] bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-inner">
                  {loading ? (
                    <div className="w-full h-full animate-pulse bg-slate-800" />
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
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Search size={32} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-8 w-64 bg-slate-800 rounded animate-pulse" />
                    <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
                    <div className="flex gap-3 pt-1">
                      <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-3xl font-bold text-slate-100 truncate">
                        {entity?.fullName}
                      </h2>
                      <span className={`semantic-chip ${getRiskClass(entity?.redFlagRating || 0)}`}>
                        <ShieldAlert size={12} />
                        Risk {(entity?.redFlagRating || 0).toFixed(0)}/5
                      </span>
                    </div>
                    <div className="text-slate-400 text-lg mb-4">
                      <span>{entity?.primaryRole}</span>
                      {(entity?.birthDate || entity?.deathDate) && (
                        <span className="ml-3 text-sm text-slate-500">
                          {entity?.birthDate ? `b. ${entity.birthDate}` : ''}
                          {entity?.deathDate ? ` • d. ${entity.deathDate}` : ''}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed mb-4 max-w-4xl">
                      <span className="font-semibold text-slate-100">Forensic Summary:</span>{' '}
                      {forensicSummary}
                    </p>

                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={() => handleQuickAction('blackbook')}
                        data-testid="entity-modal-action-blackbook"
                        className="text-xs text-purple-300 hover:text-purple-200 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <BookOpen size={12} />
                        Black Book
                      </button>
                      <button
                        onClick={() => handleQuickAction('timeline')}
                        data-testid="entity-modal-action-timeline"
                        className="text-xs text-blue-300 hover:text-blue-200 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Calendar size={12} />
                        Timeline
                      </button>
                      <button
                        onClick={() => handleQuickAction('search')}
                        data-testid="entity-modal-action-search"
                        className="text-xs text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Search size={12} />
                        Search
                      </button>
                    </div>
                    {activeQuickAction && (
                      <p
                        data-testid="entity-modal-context"
                        className="text-[11px] text-slate-500 mb-2"
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
                  onChange={(key) => handleTabChange(key as any)}
                  className="!bg-transparent !border-none !px-0"
                />
              </div>

              <CloseButton
                onClick={onClose}
                size="md"
                label="Close entity profile"
                className="text-slate-400 hover:text-white"
              />
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 min-h-0 relative bg-slate-900">
              {/* 1. OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div
                  className="absolute inset-0 overflow-y-auto custom-scrollbar"
                  data-testid="entity-modal-tab-overview"
                >
                  {loading && (
                    <div className="p-6 space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-48 w-full rounded-xl bg-slate-900" />
                        <Skeleton className="h-48 w-full rounded-xl bg-slate-900" />
                      </div>
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-48 bg-slate-900" />
                        <Skeleton className="h-24 w-full rounded-lg bg-slate-900" />
                        <Skeleton className="h-24 w-full rounded-lg bg-slate-900" />
                      </div>
                    </div>
                  )}

                  {!loading && entity && forensicData && (
                    <div className="p-6 space-y-8">
                      {/* METRICS & SIGNAL PANEL */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-950/50 rounded-[var(--radius-lg)] p-5 border border-slate-800 flex flex-col justify-between">
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span
                              className={`semantic-chip ${getRiskClass(entity.redFlagRating || 0)}`}
                            >
                              <ShieldAlert size={12} />
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
                                      : 'text-slate-300 border-slate-700 bg-slate-800/60'
                              }`}
                            >
                              <Sparkles size={12} />
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
                            <div className="p-3 bg-slate-900 rounded-[var(--radius-md)] border border-slate-800">
                              <div className="text-xl font-bold text-cyan-300">
                                {entity.mentions}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">Mentions</div>
                            </div>
                            <div className="p-3 bg-slate-900 rounded-[var(--radius-md)] border border-slate-800">
                              <div className="text-xl font-bold text-blue-300">
                                {totalDocs > 0 ? totalDocs : entity.mentions}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">Documents</div>
                            </div>
                            <div className="p-3 bg-slate-900 rounded-[var(--radius-md)] border border-slate-800">
                              <div className="text-xl font-bold text-orange-300">
                                {entity.photos?.length || 0}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">Media</div>
                            </div>
                            <div className="p-3 bg-slate-900 rounded-[var(--radius-md)] border border-slate-800">
                              <div className="text-xl font-bold text-emerald-300">
                                {entity.evidenceTypes?.length || 0}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">Source Types</div>
                            </div>
                          </div>
                          <div className="mt-6 pt-6 border-t border-slate-800/50">
                            <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                              <Activity size={14} /> KEY DRIVERS
                            </h4>
                            <DriverChips chips={forensicData.drivers} />
                          </div>
                        </div>

                        <div className="bg-slate-950/50 rounded-[var(--radius-lg)] p-5 border border-slate-800">
                          <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between">
                            <span>FORENSIC SIGNALS</span>
                            <span className="text-xs font-mono text-slate-500">EXO-METRICS v2</span>
                          </h4>
                          <SignalPanel metrics={forensicData.signals} />

                          <div className="mt-6 p-3 bg-slate-900/80 rounded-lg border border-slate-800/80">
                            <div className="text-xs text-slate-400 leading-relaxed">
                              <span className="text-indigo-400 font-medium">Analysis:</span>{' '}
                              {forensicData.ladder.description}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* HIGH SIGNIFICANCE EVIDENCE */}
                      {entity.significantPassages && entity.significantPassages.length > 0 && (
                        <div>
                          <h3 className="text-slate-300 font-semibold flex items-center gap-2 font-mono uppercase tracking-widest text-xs mb-4">
                            <AlertTriangle size={14} className="text-amber-500" /> High Significance
                            Evidence
                          </h3>
                          <div className="grid gap-4">
                            {entity.significantPassages.map((passage, idx) => (
                              <article
                                key={idx}
                                className={`bg-slate-950 border border-slate-800 rounded-[var(--radius-md)] p-4 hover:border-indigo-500/30 transition-colors ${
                                  passage.documentId
                                    ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/70'
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
                                <div className="flex items-start gap-4">
                                  <div className="mt-1 shrink-0 p-2 bg-slate-900 rounded-[var(--radius-sm)] text-slate-400 transition-colors">
                                    <FileText size={16} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <span className="semantic-chip text-[10px] px-2 h-6 border-slate-700/70 bg-slate-900/70 text-slate-300">
                                        {passage.source || 'Document'}
                                      </span>
                                      <span className="text-xs font-mono text-slate-400">
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
                                          className="ml-auto text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                                        >
                                          Open source <ExternalLink size={11} />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-indigo-500/50 pl-4 mb-3">
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
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                      <span className="inline-flex items-center gap-1">
                                        <FileText size={10} />{' '}
                                        {passage.filename || 'Untitled source'}
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-amber-300">
                                        <AlertTriangle size={10} />
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
                          className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-5 mb-8"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-purple-400 font-semibold flex items-center gap-2">
                              <Icon name="Book" size="sm" />
                              Black Book Entry
                            </h3>
                            <button
                              onClick={() =>
                                navigateFromModal(
                                  `/blackbook?search=${encodeURIComponent(entity.fullName)}`,
                                )
                              }
                              className="text-xs text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 transition-colors"
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
                                        className="px-2 py-1 bg-purple-900/40 text-purple-200 text-xs rounded border border-purple-800/50 flex items-center gap-1"
                                      >
                                        <Icon name="Phone" size="xs" /> {phone}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {entry.notes && (
                                  <p className="text-slate-400 text-sm italic border-l-2 border-purple-800/50 pl-3">
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
                        <h3 className="text-slate-300 font-semibold mb-3">Biography</h3>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-4xl">
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
                  <div className="p-4 bg-slate-950/30 border-b border-slate-800 flex flex-col md:flex-row gap-3 shrink-0">
                    <div className="relative flex-1 max-w-md">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search relevant documents..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        value={docFilters.search}
                        onChange={(e) => handleFilterChange({ search: e.target.value })}
                      />
                    </div>
                    <div className="text-xs text-slate-400 md:ml-auto self-center">
                      <span data-testid="entity-evidence-count">
                        {isDocsLoading
                          ? 'Loading evidence...'
                          : `${totalDocs.toLocaleString()} evidence sources`}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 bg-slate-900 overflow-hidden">
                    {isDocsLoading && documents.length === 0 ? (
                      <div className="p-4 space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-24 bg-slate-950 border border-slate-800 rounded-[var(--radius-md)] p-3 flex gap-4 items-center animate-pulse"
                          >
                            <div className="w-12 h-12 rounded bg-slate-800" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-3/4 bg-slate-800 rounded" />
                              <div className="h-3 w-1/2 bg-slate-800 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !isDocsLoading && documents.length === 0 ? (
                      <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-slate-400 text-center px-6">
                        <FileText size={44} className="mb-3 opacity-30" />
                        <h4 className="text-slate-200 font-semibold mb-1">
                          No Linked Evidence Found
                        </h4>
                        <p className="text-sm text-slate-500 max-w-md">
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
                                  className="control h-9 px-4 text-xs text-slate-200"
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
                                    {({
                                      onItemsRendered,
                                      ref,
                                    }: {
                                      onItemsRendered: any;
                                      ref: any;
                                    }) => (
                                      <List
                                        className="custom-scrollbar"
                                        data-testid="entity-evidence-virtual-list"
                                        height={height}
                                        itemCount={totalDocs}
                                        itemSize={180}
                                        width={width}
                                        onItemsRendered={onItemsRendered}
                                        ref={ref}
                                      >
                                        {({ index, style }: any) => {
                                          const doc = documents[index];
                                          if (!doc) {
                                            return (
                                              <div style={style} className="p-4">
                                                <div className="h-full bg-slate-950/20 border border-slate-800/50 rounded-lg animate-pulse" />
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
                  {entity.photos && entity.photos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {entity.photos.map((photo: any, i) => {
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
                            className="bg-slate-950 border border-slate-800 rounded-[var(--radius-md)] overflow-hidden"
                          >
                            <div className="aspect-video bg-slate-900 overflow-hidden">
                              {brokenMediaIds[String(photo.id)] ? (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900">
                                  <ImageIcon size={28} />
                                </div>
                              ) : (
                                <img
                                  src={photo.url}
                                  alt={title}
                                  className="w-full h-full object-cover"
                                  onError={(event) => {
                                    const id = String(photo.id || i);
                                    const fallbackUrl = photo.fullUrl || `/api/media/images/${id}`;
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
                            <div className="p-3">
                              <div className="flex items-start gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-slate-100 line-clamp-2 flex-1">
                                  {title}
                                </h4>
                                {riskRating > 0 && (
                                  <span className={`semantic-chip ${getRiskClass(riskRating)}`}>
                                    <ShieldAlert size={12} />
                                    {riskRating.toFixed(0)}/5
                                  </span>
                                )}
                                {hasDirectSignal && (
                                  <span className="semantic-chip evidence-direct">
                                    <Sparkles size={12} />
                                    Direct
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar size={12} />
                                  {date}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <ImageIcon size={12} />
                                  {sourceType}
                                </span>
                              </div>

                              {taggedPeople.length > 0 && (
                                <div className="mt-3 text-xs text-slate-300">
                                  <span className="text-slate-500">Tagged people:</span>{' '}
                                  {taggedPeople.slice(0, 3).join(', ')}
                                  {taggedPeople.length > 3 ? ` +${taggedPeople.length - 3}` : ''}
                                </div>
                              )}

                              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-end">
                                <button
                                  onClick={() => window.open(photo.url, '_blank')}
                                  className="control h-9 px-3 text-xs text-slate-200 flex items-center gap-1"
                                  aria-label={`Open media item ${title}`}
                                  title="Open media in new tab"
                                >
                                  View <ExternalLink size={12} />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-slate-500">
                      <Search size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No media files found for this entity.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. NETWORK TAB */}
              {activeTab === 'network' && (
                <div
                  className="absolute inset-0 overflow-hidden bg-slate-900"
                  data-testid="entity-modal-tab-network"
                >
                  {networkLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <Search size={32} className="mx-auto mb-4 opacity-20 animate-pulse" />
                      <p>Loading network graph...</p>
                    </div>
                  ) : relationships.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
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
                <div className="h-full flex flex-col min-h-0">
                  <div className="p-4 bg-slate-950/30 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Briefcase size={16} className="text-indigo-400" />
                      Linked Investigations
                    </h3>
                    <div className="text-xs text-slate-400">
                      {isInvestigationsLoading
                        ? 'Loading cases...'
                        : `${investigations.length} open cases`}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 bg-slate-900 custom-scrollbar">
                    {isInvestigationsLoading && (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 space-y-3 animate-pulse"
                          >
                            <div className="h-5 w-1/3 bg-slate-800 rounded" />
                            <div className="h-4 w-2/3 bg-slate-800 rounded" />
                            <div className="flex gap-3">
                              <div className="h-6 w-20 bg-slate-800 rounded-full" />
                              <div className="h-6 w-20 bg-slate-800 rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isInvestigationsLoading &&
                      investigationsInitialized &&
                      investigations.length === 0 && (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 text-center px-6">
                          <Briefcase size={48} className="mb-4 opacity-20" />
                          <h4 className="text-slate-200 font-semibold mb-2">
                            No Active Investigations
                          </h4>
                          <p className="text-sm text-slate-500 max-w-sm">
                            This entity is not currently linked as primary evidence in any open
                            investigation workflows.
                          </p>
                        </div>
                      )}

                    {!isInvestigationsLoading &&
                      investigations.map((inv) => (
                        <div
                          key={inv.id}
                          className="group bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="min-w-0">
                              <h4 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                                {inv.title}
                              </h4>
                              <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                {inv.description || 'No case description provided.'}
                              </p>
                            </div>
                            <button
                              onClick={() => navigateFromModal(`/investigations/${inv.uuid}`)}
                              className="control flex h-10 px-4 items-center gap-2 text-sm font-medium whitespace-nowrap"
                            >
                              Open Case
                              <ExternalLink size={14} />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/50">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border',
                                inv.status === 'open'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                              )}
                            >
                              {inv.status}
                            </span>
                            {inv._fallbackReason && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-500/20 text-indigo-300 bg-indigo-500/10">
                                {inv._fallbackReason}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock size={12} />
                              Updated {new Date(inv.updated_at).toLocaleDateString()}
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
