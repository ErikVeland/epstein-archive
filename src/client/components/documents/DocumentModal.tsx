import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@client/services/apiClient';
import { useModalFocusTrap } from '@client/hooks/useModalFocusTrap';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { useIsMobile } from '@client/hooks/useIsMobile';
import { EvidenceModal } from '../common/EvidenceModal';
import { CollapsibleSplitPane } from '../common/CollapsibleSplitPane';
import { ViewerShell } from '../viewer/ViewerShell';
import { ProvenancePanel } from './ProvenancePanel';
import { LiquidSheet } from '../common/LiquidSheet';
import { Tabs } from '../common/Tabs';
import styles from './DocumentModal.module.css';

// Design System
import { LqText } from '@client/design-system/components/typography/Text';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';

// Sub-components
import { DocumentHeader } from './subcomponents/DocumentHeader';
import { DocumentMetadataRail, type EntityRecord } from './subcomponents/DocumentMetadataRail';
import {
  DocumentUnifiedTab,
  type ViewMode,
  VALID_VIEW_MODES,
} from './subcomponents/DocumentUnifiedTab';
import { DocumentAssetsTab } from './subcomponents/DocumentAssetsTab';
import { ClaimsTab } from '../common/subcomponents/ClaimsTab';
import { deriveSummary, normalizeList } from './DocumentModalUtils';
import { isVisualMediaItem } from '@client/utils/evidenceUtils';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import type { ProvenanceDocument } from './ProvenancePanel';
import type { SearchPassageResultDto } from '@shared/dto/search';

import { Button, NativeSelect, cn } from '@client/design-system/lib';

export interface DocEntityRecord {
  id?: string | number;
  name?: string;
  fullName?: string;
  entityType?: string;
  type?: string;
  role?: string;
  primaryRole?: string;
  mentions?: number;
  [key: string]: unknown;
}

export interface DocRecord {
  id: string | number;
  title?: string;
  fileName?: string;
  description?: string;
  contentPreview?: string;
  contentRefined?: string;
  content?: string;
  evidenceType?: string;
  ingestRunId?: string | null;
  ingest_run_id?: string | null;
  entities?: DocEntityRecord[];
  mentionedEntities?: DocEntityRecord[];
  metadata?: Record<string, unknown>;
  caseLinks?: string[] | null;
  timelineReferences?: string[] | null;
  [key: string]: unknown;
}

interface Props {
  id: string;
  searchTerm?: string;
  onClose: () => void;
  initialDoc?: DocRecord;
}

type ViewerTab = 'viewer' | 'provenance' | 'assets' | 'claims';
type TextSubview = 'clean' | 'ocr' | 'diff';

const VALID_VIEWER_TABS = new Set<ViewerTab>(['viewer', 'provenance', 'assets', 'claims']);
const VALID_TEXT_SUBVIEWS = new Set<TextSubview>(['clean', 'ocr', 'diff']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function verifyResolvedPassage(
  passage: SearchPassageResultDto,
  requestedCitationId: string,
): SearchPassageResultDto {
  const citationId = String(passage.citationId || '').trim();
  const documentId = String(passage.documentId || '').trim();
  const { pageNumber } = passage;
  const rawAssetSha256 = passage.assetSha256;

  if (citationId !== requestedCitationId || !documentId || documentId.length > 200) {
    throw new Error('The passage citation response is invalid.');
  }
  if (pageNumber !== null && (!Number.isInteger(pageNumber) || pageNumber < 1)) {
    throw new Error('The passage page number is invalid.');
  }
  if (!Number.isInteger(passage.sentenceIndex) || passage.sentenceIndex < 0) {
    throw new Error('The passage sentence index is invalid.');
  }
  if (rawAssetSha256 !== null && !SHA256_PATTERN.test(rawAssetSha256)) {
    throw new Error('The passage asset hash is invalid.');
  }

  return {
    ...passage,
    citationId,
    documentId,
    assetSha256: rawAssetSha256?.toLowerCase() ?? null,
  };
}

const BASE_VIEWER_TABS: Array<{
  key: ViewerTab;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}> = [
  { key: 'viewer', label: 'Document Viewer' },
  { key: 'claims', label: 'AI Claims' },
  { key: 'assets', label: 'Recovered Assets' },
  { key: 'provenance', label: 'Provenance' },
];

export const DocumentModal: React.FC<Props> = ({
  id,
  searchTerm: initialSearchTerm,
  onClose,
  initialDoc,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const backLinkState = useBackLinkState();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});

  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const caseIdFromQuery = urlParams.get('caseId');
  const canReturnToCase =
    location.pathname.startsWith('/investigations') ||
    location.pathname.startsWith('/investigate/case/') ||
    !!caseIdFromQuery;

  const handleBackToCase = () => {
    if (caseIdFromQuery) {
      onClose();
      navigate(`/investigations/${encodeURIComponent(caseIdFromQuery)}?tab=casefolder`);
      return;
    }
    onClose();
  };

  const activeTab = useMemo((): ViewerTab => {
    const current = urlParams.get('modalTab');
    if (current && VALID_VIEWER_TABS.has(current as ViewerTab)) {
      return current as ViewerTab;
    }
    return 'viewer';
  }, [urlParams]);

  const setActiveTab = useCallback(
    (tab: ViewerTab) => {
      if (contentRef.current) {
        scrollPositions.current[activeTab] = contentRef.current.scrollTop;
      }
      const params = new URLSearchParams(location.search);
      params.set('modalTab', tab);
      navigate(`${location.pathname}?${params.toString()}`, {
        replace: true,
        state: location.state,
      });
    },
    [activeTab, location.pathname, location.search, location.state, navigate],
  );

  const [selectedEntity, setSelectedEntity] = useState<DocEntityRecord | null>(null);
  const [entityModalId, setEntityModalId] = useState<string | null>(null);
  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setEntityModalId(null);
  }
  const [showRecoveryHighlights, setShowRecoveryHighlights] = useState(true);
  const [expandedEntities, setExpandedEntities] = useState(false);
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(true);
  const isMobile = useIsMobile();
  const [rightPaneWidth, setRightPaneWidth] = useState(() => (isMobile ? 300 : 320));
  const [textSubview, setTextSubviewState] = useState<TextSubview>(() => {
    const current = urlParams.get('textMode');
    return current && VALID_TEXT_SUBVIEWS.has(current as TextSubview)
      ? (current as TextSubview)
      : 'clean';
  });

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Prefer explicit ?viewMode param; fall back to legacy ?textMode for backwards compat
    const vm = urlParams.get('viewMode');
    if (vm && VALID_VIEW_MODES.has(vm as ViewMode)) return vm as ViewMode;
    const tm = urlParams.get('textMode');
    if (tm === 'ocr') return 'ocr';
    if (tm === 'clean') return 'clean';
    return 'clean';
  });

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      const params = new URLSearchParams(location.search);
      params.set('viewMode', mode);
      // Remove legacy param to avoid confusion
      params.delete('textMode');
      navigate(`${location.pathname}?${params.toString()}`, {
        replace: true,
        state: location.state,
      });
    },
    [location.pathname, location.search, location.state, navigate],
  );

  const getScrollKey = useCallback(
    (
      tab: ViewerTab = activeTab,
      mode: TextSubview = textSubview,
      documentId: string = id,
      mobile: boolean = isMobile,
    ) =>
      `${documentId}:${tab}:${tab === 'viewer' ? mode : 'static'}:${mobile ? 'mobile' : 'desktop'}`,
    [activeTab, id, isMobile, textSubview],
  );

  const getScrollContainer = useCallback(
    (mobile: boolean = isMobile) => (mobile ? mobileScrollAreaRef.current : contentRef.current),
    [isMobile],
  );

  const persistScrollPosition = useCallback(
    (
      tab: ViewerTab = activeTab,
      mode: TextSubview = textSubview,
      documentId: string = id,
      mobile: boolean = isMobile,
    ) => {
      const container = getScrollContainer(mobile);
      if (!container) return;
      scrollPositions.current[getScrollKey(tab, mode, documentId, mobile)] = container.scrollTop;
    },
    [activeTab, getScrollContainer, getScrollKey, id, isMobile, textSubview],
  );

  const _setTextSubview = (mode: TextSubview) => {
    persistScrollPosition();
    setTextSubviewState(mode);
    const params = new URLSearchParams(location.search);
    params.set('textMode', mode);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true, state: location.state });
  };

  const passageId = urlParams.get('passage');
  const { data: addressedPassage, isError: passageResolutionFailed } =
    useQuery<SearchPassageResultDto>({
      queryKey: ['evidencePassage', passageId],
      queryFn: async () => {
        if (!passageId) throw new Error('A passage citation is required.');
        const passage = await apiClient.get<SearchPassageResultDto>(
          `/search/passages/${encodeURIComponent(passageId)}`,
          { useCache: false },
        );
        return verifyResolvedPassage(passage, passageId);
      },
      enabled: Boolean(passageId),
      retry: 1,
      staleTime: 5 * 60_000,
    });

  useEffect(() => {
    if (!passageId || !addressedPassage) return;

    const params = new URLSearchParams(location.search);
    const resolvedDocumentId = addressedPassage.documentId;
    let canonicalPath = location.pathname;
    let changed = false;
    const documentPathMatch = location.pathname.match(/^\/(documents|evidence)\/[^/]+$/);

    if (documentPathMatch) {
      const nextPath = `/${documentPathMatch[1]}/${encodeURIComponent(resolvedDocumentId)}`;
      if (nextPath !== location.pathname) {
        canonicalPath = nextPath;
        changed = true;
      }
    }

    if (params.get('documentId') !== resolvedDocumentId) {
      params.set('documentId', resolvedDocumentId);
      changed = true;
    }

    if (addressedPassage.pageNumber === null) {
      if (params.has('page')) {
        params.delete('page');
        changed = true;
      }
    } else if (params.get('page') !== String(addressedPassage.pageNumber)) {
      params.set('page', String(addressedPassage.pageNumber));
      changed = true;
    }

    if (addressedPassage.assetSha256 === null) {
      if (params.has('assetSha256')) {
        params.delete('assetSha256');
        changed = true;
      }
    } else if (params.get('assetSha256') !== addressedPassage.assetSha256) {
      params.set('assetSha256', addressedPassage.assetSha256);
      changed = true;
    }

    if (!changed) return;
    navigate(`${canonicalPath}?${params.toString()}`, {
      replace: true,
      state: location.state,
    });
  }, [addressedPassage, location.pathname, location.search, location.state, navigate, passageId]);

  const passageSearchTerm =
    addressedPassage?.quote || urlParams.get('q') || initialSearchTerm || '';
  const [localSearchTerm, setLocalSearchTerm] = useState(passageSearchTerm);
  const [blockedCitationDownloadId, setBlockedCitationDownloadId] = useState<string | null>(null);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [activeRailSection, setActiveRailSection] = useState<
    'metadata' | 'entities' | 'case' | 'timeline'
  >('metadata');
  const rightPaneScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const hasAutoSwitchedNoOcrRef = useRef(false);

  useEffect(() => {
    setLocalSearchTerm(passageSearchTerm);
  }, [passageSearchTerm]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let changed = false;
    const rawModalTab = params.get('modalTab');
    const rawTextMode = params.get('textMode');

    if (rawModalTab && !VALID_VIEWER_TABS.has(rawModalTab as ViewerTab)) {
      params.delete('modalTab');
      changed = true;
    }

    if (rawTextMode && !VALID_TEXT_SUBVIEWS.has(rawTextMode as TextSubview)) {
      params.delete('textMode');
      changed = true;
    }

    const rawViewMode = params.get('viewMode');
    if (rawViewMode && !VALID_VIEW_MODES.has(rawViewMode as ViewMode)) {
      params.delete('viewMode');
      changed = true;
    }

    if (!changed) return;
    navigate(`${location.pathname}?${params.toString()}`, { replace: true, state: location.state });
  }, [location.pathname, location.search, location.state, navigate]);

  const {
    data: fetchedDoc,
    isLoading: isLoadingDoc,
    isFetching: isFetchingDoc,
  } = useQuery<DocRecord | null>({
    queryKey: ['document', id],
    queryFn: () => apiClient.getDocument(id) as unknown as Promise<DocRecord>,
    placeholderData: (initialDoc ?? undefined) as DocRecord | undefined,
    staleTime: 30_000,
  });
  const doc = fetchedDoc ?? null;

  const { data: thread = null } = useQuery<{ threadId: string; messages: unknown[] } | null>({
    queryKey: ['documentThread', id],
    queryFn: () => apiClient.getDocumentThread(id),
    staleTime: 30_000,
  });

  const { data: relatedDocs = [], isLoading: isLoadingRelated } = useQuery<DocRecord[]>({
    queryKey: ['relatedDocuments', id],
    queryFn: () => apiClient.getRelatedDocuments(id) as unknown as Promise<DocRecord[]>,
    staleTime: 30_000,
  });

  const hasAnyText = useMemo(
    () => Boolean(String(doc?.contentRefined || doc?.content || '').trim()),
    [doc?.content, doc?.contentRefined],
  );

  const viewerTabs = useMemo(
    () =>
      BASE_VIEWER_TABS.map((tab) => {
        if (tab.key !== 'viewer' || hasAnyText) return tab;

        const isVisual = isVisualMediaItem(doc as Parameters<typeof isVisualMediaItem>[0]);
        const badgeLabel = isVisual ? 'Processed Photo' : 'No text extracted';

        return {
          ...tab,
          label: (
            <Flex align="center" gap="sm">
              <LqText variant="small" as="span">
                Document Viewer
              </LqText>
              <Surface variant="glass-highlight" className={styles.pdfBadge}>
                <LqText variant="xs" color="accent" weight="bold">
                  {badgeLabel}
                </LqText>
              </Surface>
            </Flex>
          ),
        };
      }),
    [hasAnyText, doc],
  );

  const { modalRef } = useModalFocusTrap({ isActive: true && !isMobile, onEscape: onClose });
  // useScrollLock is handled by LiquidSheet on mobile and naturally by modal overlays on desktop.
  // We only need to ensure it's called for the desktop modal if it's not a native <dialog>.
  useScrollLock(!isMobile);

  useEffect(() => {
    hasAutoSwitchedNoOcrRef.current = false;
  }, [id]);

  useEffect(() => {
    const key = getScrollKey(activeTab, textSubview, id, isMobile);
    const positions = scrollPositions.current;
    const restoreScroll = () => {
      const container = getScrollContainer(isMobile);
      if (!container) return;
      container.scrollTop = positions[key] ?? 0;
    };

    const frame = window.requestAnimationFrame(restoreScroll);

    return () => {
      window.cancelAnimationFrame(frame);
      const container = getScrollContainer(isMobile);
      if (!container) return;
      positions[key] = container.scrollTop;
    };
  }, [activeTab, getScrollContainer, getScrollKey, id, isMobile, textSubview]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasExplicitTab = params.has('modalTab');

    if (hasExplicitTab || hasAnyText || hasAutoSwitchedNoOcrRef.current || activeTab !== 'viewer') {
      return;
    }

    hasAutoSwitchedNoOcrRef.current = true;
    setActiveTab('viewer');
  }, [activeTab, hasAnyText, location.search, setActiveTab]);

  useEffect(() => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Opened document ${doc?.title || doc?.fileName || 'untitled'}`;
    document.body.appendChild(announcement);
    return () => {
      document.body.removeChild(announcement);
    };
  }, [doc?.title, doc?.fileName]);

  useEffect(() => {
    if (!localSearchTerm || activeTab !== 'viewer') return;
    const timeout = setTimeout(() => {
      const marks = getScrollContainer(isMobile)?.querySelectorAll('mark');
      if (!marks || marks.length === 0) return;
      const requestedOccurrence = addressedPassage?.quoteOccurrence;
      const targetIndex =
        requestedOccurrence !== null && requestedOccurrence !== undefined
          ? Math.min(Math.max(0, requestedOccurrence), marks.length - 1)
          : 0;
      marks[targetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(timeout);
  }, [
    activeTab,
    addressedPassage?.quoteOccurrence,
    doc?.content,
    doc?.contentRefined,
    getScrollContainer,
    isMobile,
    localSearchTerm,
    textSubview,
  ]);

  const modeFromUrl = urlParams.get('textMode') as TextSubview;
  if (modeFromUrl && VALID_TEXT_SUBVIEWS.has(modeFromUrl) && modeFromUrl !== textSubview) {
    setTextSubviewState(modeFromUrl);
  }

  // Sync viewMode from URL when navigating back/forward
  const viewModeFromUrl = urlParams.get('viewMode') as ViewMode | null;
  if (viewModeFromUrl && VALID_VIEW_MODES.has(viewModeFromUrl) && viewModeFromUrl !== viewMode) {
    setViewModeState(viewModeFromUrl);
  }

  useEffect(() => {
    const syncPaneMode = () => {
      if (window.innerWidth < 1024) {
        setRightPaneCollapsed(true);
      }
    };
    syncPaneMode();
    window.addEventListener('resize', syncPaneMode);
    return () => window.removeEventListener('resize', syncPaneMode);
  }, []);

  useEffect(() => {
    if (rightPaneCollapsed) return;
    const scroller = rightPaneScrollRef.current;
    if (!scroller) return;
    const target = scroller.querySelector<HTMLElement>(
      `[data-rail-section="${activeRailSection}"]`,
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeRailSection, rightPaneCollapsed]);

  const entities = useMemo(() => {
    const fromDoc = Array.isArray(doc?.entities) ? doc.entities : [];
    const fromMentioned = Array.isArray(doc?.mentionedEntities) ? doc.mentionedEntities : [];
    const byName = new Map<string, DocEntityRecord>();

    [...fromDoc, ...fromMentioned].forEach((entity: DocEntityRecord) => {
      const name = String(entity?.fullName || entity?.name || '').trim();
      if (!name) return;
      if (!byName.has(name.toLowerCase())) {
        byName.set(name.toLowerCase(), { ...entity, name });
      }
    });

    return Array.from(byName.values());
  }, [doc]);

  const groupedEntities = useMemo(() => {
    const groups: Record<string, DocEntityRecord[]> = {
      People: [],
      Organizations: [],
      Locations: [],
      Communication: [],
      Other: [],
    };

    entities.forEach((ent) => {
      const type = (ent.entityType || ent.type || 'unknown').toLowerCase();
      if (type === 'person' || type === 'individual') groups['People'].push(ent);
      else if (type === 'organization' || type === 'company' || type === 'agency')
        groups['Organizations'].push(ent);
      else if (type === 'location' || type === 'address' || type === 'place')
        groups['Locations'].push(ent);
      else if (type === 'email' || type === 'phone') groups['Communication'].push(ent);
      else groups['Other'].push(ent);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0) as [
      string,
      DocEntityRecord[],
    ][];
  }, [entities]);

  const caseLinks = useMemo(
    () =>
      normalizeList(
        doc?.caseLinks ||
          doc?.metadata?.caseLinks ||
          doc?.metadata?.case_refs ||
          doc?.metadata?.legalCase,
      ),
    [doc],
  );

  const timelineReferences = useMemo(
    () =>
      normalizeList(
        doc?.timelineReferences ||
          doc?.metadata?.timelineReferences ||
          doc?.metadata?.timeline_refs ||
          doc?.metadata?.timeline,
      ),
    [doc],
  );

  const summary = useMemo(() => deriveSummary(doc || {}), [doc]);

  if (!doc && (isLoadingDoc || isFetchingDoc)) {
    return createPortal(
      <Box className={styles.loadingOverlay}>
        <Surface variant="glass-strong" className={styles.loadingCard}>
          <Box className={styles.loadingText}>
            <LqText variant="h3" weight="bold">
              Loading document
            </LqText>
            <LqText variant="small" color="muted">
              Fetching the linked record and related evidence.
            </LqText>
          </Box>
          <div className={styles.spinner} />
        </Surface>
      </Box>,
      document.body,
    );
  }

  if (!doc) {
    const citationFailed = Boolean(passageId && passageResolutionFailed);
    return createPortal(
      <Box className={styles.errorOverlay}>
        <Surface variant="glass-strong" className={styles.errorCard}>
          <LqText variant="h3" weight="bold">
            {citationFailed ? 'Unable to verify passage citation' : 'Unable to load document'}
          </LqText>
          <LqText variant="body" color="muted">
            {citationFailed
              ? 'The citation did not resolve to a valid evidence location.'
              : 'Please try again or open in the Document Browser.'}
          </LqText>
          <Button unstyled onClick={onClose} className={styles.errorCloseButton}>
            Close
          </Button>
        </Surface>
      </Box>,
      document.body,
    );
  }

  const getOriginalDocumentUrl = (): string | null => {
    const targetDocumentId = addressedPassage?.documentId || id;
    const params = new URLSearchParams({ variant: 'original' });

    if (passageId) {
      if (!addressedPassage?.assetSha256) return null;
      params.set('assetSha256', addressedPassage.assetSha256);
    }

    return `/api/documents/${encodeURIComponent(String(targetDocumentId))}/file?${params.toString()}`;
  };

  const downloadOriginalDocument = () => {
    const sourceUrl = getOriginalDocumentUrl();
    if (!sourceUrl) {
      setBlockedCitationDownloadId(passageId);
      return;
    }

    setBlockedCitationDownloadId(null);
    const link = document.createElement('a');
    link.href = sourceUrl;
    link.download = `${doc.fileName || 'original-document'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openOriginalDocument = () => {
    const sourceUrl = getOriginalDocumentUrl();
    if (!sourceUrl) {
      setBlockedCitationDownloadId(passageId);
      return;
    }

    setBlockedCitationDownloadId(null);
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  };

  const cleanText = String(doc.contentRefined || doc.content || '');
  const ocrText = String(doc.content || '');

  const renderTabContent = () => {
    const isEmail = String(doc.evidenceType || '').toLowerCase() === 'email';
    const citationDownloadBlocked = Boolean(
      passageId && blockedCitationDownloadId === passageId && !addressedPassage?.assetSha256,
    );
    return (
      <>
        {passageId && (passageResolutionFailed || citationDownloadBlocked) && (
          <Box p="md" role="alert" className={styles.emailViewerBanner}>
            <LqText variant="small" weight="semibold">
              {passageResolutionFailed
                ? 'This passage citation could not be verified. The document is open without a pinned passage.'
                : 'Original download stopped. This citation does not resolve to a pinned source asset.'}
            </LqText>
          </Box>
        )}
        {isEmail && (
          <Box p="md" className={styles.emailViewerBanner}>
            <Flex align="center" justify="between" gap="sm">
              <LqText variant="small">
                This document is an email. For the best experience, use the specialized Email
                Viewer.
              </LqText>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  persistScrollPosition();
                  onClose();
                  navigate(`/emails?messageId=${id}`, { state: backLinkState });
                }}
              >
                Open Email Viewer
              </Button>
            </Flex>
          </Box>
        )}
        {(() => {
          switch (activeTab) {
            case 'viewer':
              return (
                <DocumentUnifiedTab
                  doc={doc}
                  id={id}
                  localSearchTerm={localSearchTerm}
                  summary={summary}
                  setSelectedEntity={setSelectedEntity}
                  setEntityModalId={setEntityModalId as (id: string) => void}
                  cleanText={cleanText}
                  ocrText={ocrText}
                  openOriginalDocument={openOriginalDocument}
                  isEmail={isEmail}
                  metadata={doc.metadata as Record<string, unknown> | null | undefined}
                  title={doc.title || doc.fileName || ''}
                  entities={entities}
                  groupedEntities={groupedEntities}
                  relatedDocs={(relatedDocs || []).filter(
                    (d): d is DocRecord => d.id !== undefined,
                  )}
                  isLoadingRelated={isLoadingRelated}
                  showRecoveryHighlights={showRecoveryHighlights}
                  setShowRecoveryHighlights={setShowRecoveryHighlights}
                  isReadingMode={isReadingMode}
                  setIsReadingMode={setIsReadingMode}
                  onNavigateToDoc={(newId) => {
                    persistScrollPosition();
                    const params = new URLSearchParams(location.search);
                    params.set('documentId', newId);
                    navigate(`${location.pathname}?${params.toString()}`, {
                      state: location.state,
                    });
                  }}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                />
              );
            case 'provenance':
              return <ProvenancePanel document={doc as ProvenanceDocument} />;
            case 'assets':
              return <DocumentAssetsTab documentId={id} />;
            case 'claims':
              return (
                <ClaimsTab documentId={id} onOpenEntity={(entId) => setEntityModalId(entId)} />
              );
            default:
              return null;
          }
        })()}
      </>
    );
  };

  if (isMobile) {
    return (
      <LiquidSheet
        isOpen={id !== undefined}
        onClose={onClose}
        ariaLabel={`Document: ${doc.title || doc.fileName || 'Untitled'}`}
        className={styles.mobileSheet}
        contentClassName={styles.mobileSheetContent}
        showHandle={false}
      >
        <div className={styles.mobileLayout}>
          <div className={styles.viewerWrapper}>
            <div className={styles.mobileHeaderChrome}>
              <DocumentHeader
                doc={doc}
                localSearchTerm={localSearchTerm}
                setLocalSearchTerm={setLocalSearchTerm}
                canReturnToCase={canReturnToCase}
                handleBackToCase={handleBackToCase}
                downloadOriginalDocument={downloadOriginalDocument}
                onClose={onClose}
              />
              <div className={styles.mobileTabsDropdownContainer}>
                <label htmlFor="doc-mobile-tabs-select" className={styles.mobileTabsLabel}>
                  Section:
                </label>
                <NativeSelect
                  id="doc-mobile-tabs-select"
                  className={styles.mobileTabsSelect}
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as ViewerTab)}
                >
                  {viewerTabs.map((tab) => {
                    const labelStr =
                      typeof tab.label === 'string'
                        ? tab.label
                        : tab.key === 'viewer'
                          ? 'Document Viewer'
                          : tab.key === 'claims'
                            ? 'AI Claims'
                            : tab.key === 'assets'
                              ? 'Recovered Assets'
                              : 'Provenance';
                    return (
                      <option key={tab.key} value={tab.key}>
                        {labelStr}
                      </option>
                    );
                  })}
                </NativeSelect>
              </div>

              <div className={styles.desktopTabsContainer}>
                <Tabs
                  tabs={viewerTabs}
                  activeTab={activeTab}
                  onChange={(key) => setActiveTab(key as ViewerTab)}
                  variant="viewer"
                  className={styles.tabsOverride}
                />
              </div>
            </div>

            <div className={styles.mobileScrollArea} ref={mobileScrollAreaRef}>
              {renderTabContent()}
            </div>
          </div>

          <div className={styles.mobileBottomBar} aria-label="Document details">
            <Button
              unstyled
              onClick={() => {
                setActiveRailSection('metadata');
                setRightPaneCollapsed(false);
              }}
              className={cn(
                styles.bottomBarItem,
                !rightPaneCollapsed &&
                  activeRailSection === 'metadata' &&
                  styles.bottomBarItemActive,
              )}
              aria-label="Open document metadata"
            >
              <Icon name="Sparkles" size="md" />
              <span>Metadata</span>
            </Button>
            <Button
              unstyled
              onClick={() => {
                setActiveRailSection('entities');
                setRightPaneCollapsed(false);
              }}
              className={cn(
                styles.bottomBarItem,
                !rightPaneCollapsed &&
                  activeRailSection === 'entities' &&
                  styles.bottomBarItemActive,
              )}
              aria-label="Open document entities"
            >
              <Icon name="Users" size="md" />
              <span>Entities</span>
            </Button>
            <Button
              unstyled
              onClick={() => {
                setActiveRailSection('case');
                setRightPaneCollapsed(false);
              }}
              className={cn(
                styles.bottomBarItem,
                !rightPaneCollapsed && activeRailSection === 'case' && styles.bottomBarItemActive,
              )}
              aria-label="Open case references"
            >
              <Icon name="Link2" size="md" />
              <span>Case</span>
            </Button>
            <Button
              unstyled
              onClick={() => {
                setActiveRailSection('timeline');
                setRightPaneCollapsed(false);
              }}
              className={cn(
                styles.bottomBarItem,
                !rightPaneCollapsed &&
                  activeRailSection === 'timeline' &&
                  styles.bottomBarItemActive,
              )}
              aria-label="Open timeline references"
            >
              <Icon name="Calendar" size="md" />
              <span>Timeline</span>
            </Button>
          </div>

          {/* Metadata Overlay when not collapsed on mobile */}
          {!rightPaneCollapsed && (
            <div className={styles.mobileMetadataOverlay}>
              <div className={styles.overlayHeader}>
                <LqText variant="h3" weight="bold">
                  {activeRailSection === 'metadata'
                    ? 'Record Intelligence'
                    : activeRailSection === 'entities'
                      ? 'Live Entities'
                      : activeRailSection === 'case'
                        ? 'Case References'
                        : 'Timeline Hooks'}
                </LqText>
                <Button
                  unstyled
                  onClick={() => setRightPaneCollapsed(true)}
                  className={styles.overlayClose}
                  aria-label="Close document details"
                >
                  <Icon name="X" size="md" />
                </Button>
              </div>
              <div className={styles.overlayContent}>
                <DocumentMetadataRail
                  doc={doc}
                  id={id}
                  activeRailSection={activeRailSection}
                  expandedEntities={expandedEntities}
                  setExpandedEntities={setExpandedEntities}
                  entities={entities as EntityRecord[]}
                  selectedEntity={selectedEntity as EntityRecord | null}
                  setSelectedEntity={setSelectedEntity as (value: EntityRecord | null) => void}
                  caseLinks={caseLinks}
                  timelineReferences={timelineReferences}
                  rightPaneScrollRef={rightPaneScrollRef as React.RefObject<HTMLDivElement>}
                  onOpenDossier={setEntityModalId}
                  threadCount={thread?.messages?.length || 0}
                />
              </div>
            </div>
          )}
        </div>
      </LiquidSheet>
    );
  }

  return createPortal(
    <Box
      id="DocumentModal"
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
      onClick={onClose}
    >
      <Surface
        variant="glass-strong"
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
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
        <ViewerShell
          header={
            <DocumentHeader
              doc={doc}
              localSearchTerm={localSearchTerm}
              setLocalSearchTerm={setLocalSearchTerm}
              canReturnToCase={canReturnToCase}
              handleBackToCase={handleBackToCase}
              downloadOriginalDocument={downloadOriginalDocument}
              onClose={onClose}
            />
          }
          tabs={viewerTabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as ViewerTab)}
          tabsClassName={styles.tabsBar}
          bodyRef={contentRef}
          bodyClassName={styles.bodyContent}
          bodyScrollable={false}
          bodyTestId="document-modal-scroll-region"
        >
          <CollapsibleSplitPane
            left={
              <Box
                className={`custom-scrollbar ${styles.contentPane}`}
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                data-testid={`document-modal-tabpanel-${activeTab}`}
              >
                <Box className={styles.contentInner}>{renderTabContent()}</Box>
              </Box>
            }
            right={
              <aside className={`custom-scrollbar ${styles.metadataAside}`}>
                <DocumentMetadataRail
                  doc={doc}
                  id={id}
                  activeRailSection={activeRailSection}
                  expandedEntities={expandedEntities}
                  setExpandedEntities={setExpandedEntities}
                  entities={entities as EntityRecord[]}
                  selectedEntity={selectedEntity as EntityRecord | null}
                  setSelectedEntity={setSelectedEntity as (value: EntityRecord | null) => void}
                  caseLinks={caseLinks}
                  timelineReferences={timelineReferences}
                  rightPaneScrollRef={rightPaneScrollRef as React.RefObject<HTMLDivElement>}
                  onOpenDossier={setEntityModalId}
                  threadCount={thread?.messages?.length || 0}
                  summary={summary}
                  relatedDocs={(relatedDocs || []).filter(
                    (d): d is DocRecord => d.id !== undefined,
                  )}
                  onNavigateToDoc={(newId) => {
                    persistScrollPosition();
                    const params = new URLSearchParams(location.search);
                    params.set('documentId', newId);
                    navigate(`${location.pathname}?${params.toString()}`, {
                      state: location.state,
                    });
                  }}
                />
              </aside>
            }
            collapsedRight={
              <Flex direction="column" align="center" className={styles.collapsedPane}>
                <Surface variant="glass-highlight" className={styles.collapsedIcons}>
                  <Button
                    unstyled
                    type="button"
                    onClick={() => {
                      setActiveRailSection('metadata');
                      setRightPaneCollapsed(false);
                    }}
                    className={styles.railIconPrimary}
                    title="Core metadata"
                  >
                    <Icon name="Sparkles" className={styles.railIconGlyph} />
                  </Button>
                  <Box className={styles.railDivider} />
                  <Button
                    unstyled
                    type="button"
                    onClick={() => {
                      setActiveRailSection('entities');
                      setRightPaneCollapsed(false);
                    }}
                    className={styles.railIcon}
                    aria-label="Live entities"
                  >
                    <Icon name="Users" className={styles.railIconGlyph} />
                    <Surface variant="glass-strong" className={styles.railTooltip}>
                      <LqText variant="xs" weight="bold" className={styles.railTooltipLabel}>
                        Live Entities
                      </LqText>
                    </Surface>
                  </Button>
                  <Button
                    unstyled
                    type="button"
                    onClick={() => {
                      setActiveRailSection('case');
                      setRightPaneCollapsed(false);
                    }}
                    className={styles.railIcon}
                    aria-label="Case references"
                  >
                    <Icon name="Link2" className={styles.railIconGlyph} />
                    <Surface variant="glass-strong" className={styles.railTooltip}>
                      <LqText variant="xs" weight="bold" className={styles.railTooltipLabel}>
                        Case References
                      </LqText>
                    </Surface>
                  </Button>
                  <Button
                    unstyled
                    type="button"
                    onClick={() => {
                      setActiveRailSection('timeline');
                      setRightPaneCollapsed(false);
                    }}
                    className={styles.railIcon}
                    aria-label="Timeline hooks"
                  >
                    <Icon name="Calendar" className={styles.railIconGlyph} />
                    <Surface variant="glass-strong" className={styles.railTooltip}>
                      <LqText variant="xs" weight="bold" className={styles.railTooltipLabel}>
                        Timeline Hooks
                      </LqText>
                    </Surface>
                  </Button>
                </Surface>
              </Flex>
            }
            defaultRightWidth={rightPaneWidth}
            minRightWidth={isMobile ? 280 : 360}
            maxRightWidth={isMobile ? 420 : 520}
            collapsedWidth={isMobile ? 72 : 88}
            rightCollapsed={rightPaneCollapsed}
            onRightCollapsedChange={setRightPaneCollapsed}
            onRightWidthChange={setRightPaneWidth}
          />
        </ViewerShell>

        {/* Sub-modals - Layers */}
        {entityModalId && (
          <EvidenceModal
            entityId={entityModalId}
            isOpen={true}
            onClose={() => setEntityModalId(null)}
          />
        )}
      </Surface>
    </Box>,
    document.body,
  );
};

export default DocumentModal;
