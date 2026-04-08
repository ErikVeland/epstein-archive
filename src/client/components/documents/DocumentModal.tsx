import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Users, Link2, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { EvidenceModal } from '../common/EvidenceModal';
import { CollapsibleSplitPane } from '../common/CollapsibleSplitPane';
import { ViewerShell } from '../viewer/ViewerShell';
import { ProvenancePanel } from './ProvenancePanel';
import styles from './DocumentModal.module.css';

// Design System
import { LqText } from '../../design-system/components/typography/Text';
import { Flex } from '../../design-system/components/layout/Flex';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';

// Sub-components
import { DocumentHeader } from './subcomponents/DocumentHeader';
import { DocumentMetadataRail } from './subcomponents/DocumentMetadataRail';
import { DocumentPDFTab } from './subcomponents/DocumentPDFTab';
import { DocumentAnalysisTab } from './subcomponents/DocumentAnalysisTab';
import { deriveSummary, normalizeList } from './DocumentModalUtils';
import { isVisualMediaItem } from '../../utils/evidenceUtils';

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

type ViewerTab = 'analysis' | 'pdf' | 'provenance';
type TextSubview = 'clean' | 'ocr' | 'diff';

const BASE_VIEWER_TABS: Array<{
  key: ViewerTab;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}> = [
  { key: 'pdf', label: 'Original Document' },
  { key: 'analysis', label: 'Summary & Analysis' },
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
      navigate(`/investigations/${caseIdFromQuery}?tab=casefolder`);
      return;
    }
    onClose();
  };

  const activeTab = useMemo((): ViewerTab => {
    const current = urlParams.get('modalTab');
    if (current && BASE_VIEWER_TABS.some((tab) => tab.key === current)) {
      return current as ViewerTab;
    }
    return 'analysis';
  }, [urlParams]);

  const setActiveTab = useCallback(
    (tab: ViewerTab) => {
      if (contentRef.current) {
        scrollPositions.current[activeTab] = contentRef.current.scrollTop;
      }
      const params = new URLSearchParams(location.search);
      params.set('modalTab', tab);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    },
    [activeTab, location.pathname, location.search, navigate],
  );

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = scrollPositions.current[activeTab] || 0;
    }
  }, [activeTab]);

  const [selectedEntity, setSelectedEntity] = useState<DocEntityRecord | null>(null);
  const [entityModalId, setEntityModalId] = useState<string | null>(null);
  const [showRecoveryHighlights, setShowRecoveryHighlights] = useState(true);
  const [expandedEntities, setExpandedEntities] = useState(false);
  const [rightPaneCollapsed, setRightPaneCollapsed] = useState(true);
  const [rightPaneWidth, setRightPaneWidth] = useState(320);
  const [textSubview, setTextSubviewState] = useState<TextSubview>(
    (urlParams.get('textMode') as TextSubview) || 'clean',
  );

  const setTextSubview = (mode: TextSubview) => {
    setTextSubviewState(mode);
    const params = new URLSearchParams(window.location.search);
    params.set('textMode', mode);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const [localSearchTerm, setLocalSearchTerm] = useState(initialSearchTerm || '');
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [activeRailSection, setActiveRailSection] = useState<
    'metadata' | 'entities' | 'case' | 'timeline'
  >('metadata');
  const rightPaneScrollRef = useRef<HTMLDivElement | null>(null);
  const hasAutoSwitchedNoOcrRef = useRef(false);

  const {
    data: fetchedDoc,
    isLoading: isLoadingDoc,
    isFetching: isFetchingDoc,
  } = useQuery<DocRecord | null>({
    queryKey: ['document', id],
    queryFn: () => apiClient.getDocument(id) as Promise<DocRecord>,
    initialData: initialDoc as DocRecord | undefined,
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
    queryFn: () => apiClient.getRelatedDocuments(id) as Promise<DocRecord[]>,
    staleTime: 30_000,
  });

  const hasAnyText = useMemo(
    () => Boolean(String(doc?.contentRefined || doc?.content || '').trim()),
    [doc?.content, doc?.contentRefined],
  );

  const viewerTabs = useMemo(
    () =>
      BASE_VIEWER_TABS.map((tab) => {
        if (tab.key !== 'pdf' || hasAnyText) return tab;

        const isVisual = isVisualMediaItem(doc as Parameters<typeof isVisualMediaItem>[0]);
        const badgeLabel = isVisual ? 'Processed Photo' : 'No text extracted';

        return {
          ...tab,
          label: (
            <Flex align="center" gap="sm">
              <LqText variant="small" as="span">
                Original Document
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

  const { modalRef } = useModalFocusTrap({ isActive: true, onEscape: onClose });
  useScrollLock(true);

  useEffect(() => {
    hasAutoSwitchedNoOcrRef.current = false;
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasExplicitTab = params.has('modalTab');

    if (
      hasExplicitTab ||
      hasAnyText ||
      hasAutoSwitchedNoOcrRef.current ||
      activeTab !== 'analysis'
    ) {
      return;
    }

    hasAutoSwitchedNoOcrRef.current = true;
    setActiveTab('pdf');
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
    if (!localSearchTerm || !contentRef.current || activeTab !== 'analysis') return;
    const timeout = setTimeout(() => {
      const firstMark = contentRef.current?.querySelector('mark');
      if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(timeout);
  }, [activeTab, textSubview, localSearchTerm, doc?.content, doc?.contentRefined]);

  const modeFromUrl = urlParams.get('textMode') as TextSubview;
  if (modeFromUrl && modeFromUrl !== textSubview) {
    setTextSubviewState(modeFromUrl);
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
    return createPortal(
      <Box className={styles.errorOverlay}>
        <Surface variant="glass-strong" className={styles.errorCard}>
          <LqText variant="h3" weight="bold">
            Unable to load document
          </LqText>
          <LqText variant="body" color="muted">
            Please try again or open in the Document Browser.
          </LqText>
          <button onClick={onClose} className={styles.errorCloseButton}>
            Close
          </button>
        </Surface>
      </Box>,
      document.body,
    );
  }

  const getOriginalDocumentUrl = () => `/api/documents/${id}/file?variant=dirty`;

  const downloadOriginalDocument = () => {
    const link = document.createElement('a');
    link.href = getOriginalDocumentUrl();
    link.download = `${doc.fileName || 'original-document'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openOriginalDocument = () => {
    window.open(getOriginalDocumentUrl(), '_blank', 'noopener,noreferrer');
  };

  const cleanText = String(doc.contentRefined || doc.content || '');
  const ocrText = String(doc.content || '');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pdf':
        return (
          <DocumentPDFTab
            documentId={id}
            docId={String(doc.id ?? id)}
            content={cleanText || ocrText}
            searchTerm={localSearchTerm}
            openOriginalDocument={openOriginalDocument}
            isEmail={String(doc.evidenceType || '').toLowerCase() === 'email'}
            metadata={doc.metadata as never}
            title={doc.title || doc.fileName || ''}
          />
        );
      case 'analysis':
        return (
          <DocumentAnalysisTab
            doc={doc}
            id={id}
            textSubview={textSubview}
            setTextSubview={setTextSubview}
            localSearchTerm={localSearchTerm}
            summary={summary}
            showRecoveryHighlights={showRecoveryHighlights}
            setShowRecoveryHighlights={setShowRecoveryHighlights}
            isReadingMode={isReadingMode}
            setIsReadingMode={setIsReadingMode}
            setSelectedEntity={setSelectedEntity}
            setEntityModalId={setEntityModalId}
            entities={entities}
            groupedEntities={groupedEntities}
            relatedDocs={(relatedDocs || []).filter((d): d is DocRecord => d.id !== undefined)}
            isLoadingRelated={isLoadingRelated}
            onNavigateToDoc={(newId) => navigate(`${location.pathname}?documentId=${newId}`)}
            cleanText={cleanText}
            ocrText={ocrText}
          />
        );
      case 'provenance':
        return <ProvenancePanel document={doc as never} />; // Workaround for slight interface mismatch without using any
      default:
        return null;
    }
  };

  return createPortal(
    <Box
      id="DocumentModal"
      ref={modalRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
      onClick={onClose}
    >
      <Surface variant="glass-strong" className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
                  entities={entities as never[]}
                  selectedEntity={selectedEntity as never}
                  setSelectedEntity={setSelectedEntity as never}
                  caseLinks={caseLinks}
                  timelineReferences={timelineReferences}
                  rightPaneScrollRef={rightPaneScrollRef as React.RefObject<HTMLDivElement>}
                  onOpenDossier={setEntityModalId}
                  threadCount={thread?.messages?.length || 0}
                />
              </aside>
            }
            collapsedRight={
              <Flex direction="column" align="center" className={styles.collapsedPane}>
                <Surface variant="glass-highlight" className={styles.collapsedIcons}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRailSection('metadata');
                      setRightPaneCollapsed(false);
                    }}
                    className={styles.railIconPrimary}
                    title="Core metadata"
                  >
                    <Sparkles className={styles.railIconGlyph} />
                  </button>
                  <Box className={styles.railDivider} />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRailSection('entities');
                      setRightPaneCollapsed(false);
                    }}
                    className={styles.railIcon}
                    aria-label="Live entities"
                  >
                    <Users className={styles.railIconGlyph} />
                    <Surface variant="glass-strong" className={styles.railTooltip}>
                      <LqText variant="xs" weight="bold" className={styles.railTooltipLabel}>
                        Live Entities
                      </LqText>
                    </Surface>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRailSection('case');
                      setRightPaneCollapsed(false);
                    }}
                    className={styles.railIcon}
                    aria-label="Case references"
                  >
                    <Link2 className={styles.railIconGlyph} />
                    <Surface variant="glass-strong" className={styles.railTooltip}>
                      <LqText variant="xs" weight="bold" className={styles.railTooltipLabel}>
                        Case References
                      </LqText>
                    </Surface>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRailSection('timeline');
                      setRightPaneCollapsed(false);
                    }}
                    className={styles.railIcon}
                    aria-label="Timeline hooks"
                  >
                    <Calendar className={styles.railIconGlyph} />
                    <Surface variant="glass-strong" className={styles.railTooltip}>
                      <LqText variant="xs" weight="bold" className={styles.railTooltipLabel}>
                        Timeline Hooks
                      </LqText>
                    </Surface>
                  </button>
                </Surface>
              </Flex>
            }
            defaultRightWidth={rightPaneWidth}
            minRightWidth={360}
            maxRightWidth={520}
            collapsedWidth={88}
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
