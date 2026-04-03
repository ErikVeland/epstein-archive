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

// Design System
import { Surface, Box, Flex, LqText } from '../../design-system/lib';

// Sub-components
import { DocumentHeader } from './subcomponents/DocumentHeader';
import { DocumentMetadataRail } from './subcomponents/DocumentMetadataRail';
import { DocumentPDFTab } from './subcomponents/DocumentPDFTab';
import { DocumentAnalysisTab } from './subcomponents/DocumentAnalysisTab';
import { deriveSummary, normalizeList } from './DocumentModalUtils';
import { isVisualMediaItem } from '../../utils/evidenceUtils';

interface DocEntityRecord {
  id?: string | number;
  name?: string;
  fullName?: string;
  entityType?: string;
  type?: string;
  mentions?: number;
  [key: string]: unknown;
}

interface DocRecord {
  id?: string | number;
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
              <Surface
                variant="glass-highlight"
                className="rounded-full px-2 py-0.5 border-amber-500/40 bg-amber-500/15"
              >
                <LqText
                  variant="xs"
                  color="accent"
                  weight="bold"
                  className="uppercase tracking-wider"
                >
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
      <Box className="fixed inset-0 backdrop-blur-md z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60">
        <Surface variant="glass-strong" className="p-8 flex flex-col items-center gap-4">
          <Box className="text-center">
            <LqText variant="h3" weight="bold" className="mb-1">
              Loading document
            </LqText>
            <LqText variant="small" color="muted">
              Fetching the linked record and related evidence.
            </LqText>
          </Box>
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </Surface>
      </Box>,
      document.body,
    );
  }

  if (!doc) {
    return createPortal(
      <Box className="fixed inset-0 backdrop-blur-md z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60">
        <Surface variant="glass-strong" className="p-8">
          <LqText variant="h3" weight="bold" className="mb-2">
            Unable to load document
          </LqText>
          <LqText variant="body" color="muted" className="mb-6">
            Please try again or open in the Document Browser.
          </LqText>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-[var(--radius-lg)] bg-[var(--accent)] text-black font-bold uppercase tracking-wider text-xs hover:bg-[var(--accent)]/90 transition-colors"
          >
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
            metadata={doc.metadata as any}
            title={doc.title || doc.fileName || ''}
          />
        );
      case 'analysis':
        return (
          <DocumentAnalysisTab
            doc={doc as any}
            id={id}
            textSubview={textSubview}
            setTextSubview={setTextSubview}
            localSearchTerm={localSearchTerm}
            summary={summary}
            showRecoveryHighlights={showRecoveryHighlights}
            setShowRecoveryHighlights={setShowRecoveryHighlights}
            isReadingMode={isReadingMode}
            setIsReadingMode={setIsReadingMode}
            setSelectedEntity={setSelectedEntity as any}
            setEntityModalId={setEntityModalId}
            entities={entities as any}
            groupedEntities={groupedEntities as any}
            relatedDocs={(relatedDocs || []).filter((d) => d.id !== undefined) as any}
            isLoadingRelated={isLoadingRelated}
            onNavigateToDoc={(newId) => navigate(`${location.pathname}?documentId=${newId}`)}
            cleanText={cleanText}
            ocrText={ocrText}
          />
        );
      case 'provenance':
        return <ProvenancePanel document={doc as any} />;
      default:
        return null;
    }
  };

  return createPortal(
    <Box
      id="DocumentModal"
      ref={modalRef}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300 backdrop-blur-sm bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
      onClick={onClose}
    >
      <Surface
        variant="glass-strong"
        className="rounded-none md:rounded-[var(--radius-xl)] flex flex-col border-0 pointer-events-auto overflow-hidden"
        style={{
          width: 'clamp(960px, 94vw, 1500px)',
          height: 'clamp(600px, 90vh, 1000px)',
          boxShadow: '0 0 0 1px var(--glass-border), var(--glass-shadow)',
        }}
        onClick={(e) => e.stopPropagation()}
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
          tabsClassName="px-4 md:px-8 border-b border-[var(--glass-border)]"
          bodyRef={contentRef}
          bodyClassName="selection:bg-[var(--accent)]/30"
          bodyScrollable={false}
          bodyTestId="document-modal-scroll-region"
        >
          <CollapsibleSplitPane
            left={
              <Box
                className="h-full overflow-y-auto custom-scrollbar px-5 md:px-12 py-8 md:py-10"
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                data-testid={`document-modal-tabpanel-${activeTab}`}
              >
                <Box className="max-w-4xl mx-auto">{renderTabContent()}</Box>
              </Box>
            }
            right={
              <aside className="h-full bg-[var(--glass-bg)] overflow-y-auto custom-scrollbar border-l border-[var(--glass-border)]">
                <DocumentMetadataRail
                  doc={doc}
                  id={id}
                  activeRailSection={activeRailSection}
                  expandedEntities={expandedEntities}
                  setExpandedEntities={setExpandedEntities}
                  entities={entities as any}
                  selectedEntity={selectedEntity as any}
                  setSelectedEntity={setSelectedEntity as any}
                  caseLinks={caseLinks}
                  timelineReferences={timelineReferences}
                  rightPaneScrollRef={rightPaneScrollRef as React.RefObject<HTMLDivElement>}
                  onOpenDossier={setEntityModalId}
                  threadCount={thread?.messages?.length || 0}
                />
              </aside>
            }
            collapsedRight={
              <Flex
                direction="column"
                align="center"
                className="h-full pt-14 pb-8 bg-transparent overflow-visible"
              >
                <Surface
                  variant="glass-highlight"
                  className="rounded-full py-6 px-2 flex flex-col items-center gap-6 border-[var(--glass-border)] backdrop-blur-md"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRailSection('metadata');
                      setRightPaneCollapsed(false);
                    }}
                    className="relative group w-12 h-12 rounded-full flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                    title="Core metadata"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                  <Box className="w-6 h-px bg-[var(--glass-border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRailSection('entities');
                      setRightPaneCollapsed(false);
                    }}
                    className="relative group w-10 h-10 rounded-full inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                    aria-label="Live entities"
                  >
                    <Users className="w-5 h-5" />
                    <Surface
                      variant="glass-strong"
                      className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    >
                      <LqText variant="xs" weight="bold" className="uppercase tracking-widest">
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
                    className="relative group w-10 h-10 rounded-full inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                    aria-label="Case references"
                  >
                    <Link2 className="w-5 h-5" />
                    <Surface
                      variant="glass-strong"
                      className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    >
                      <LqText variant="xs" weight="bold" className="uppercase tracking-widest">
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
                    className="relative group w-10 h-10 rounded-full inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                    aria-label="Timeline hooks"
                  >
                    <Calendar className="w-5 h-5" />
                    <Surface
                      variant="glass-strong"
                      className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                    >
                      <LqText variant="xs" weight="bold" className="uppercase tracking-widest">
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
