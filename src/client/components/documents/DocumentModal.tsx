import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Users, Link2, Calendar } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { EvidenceModal } from '../common/EvidenceModal';
import { CollapsibleSplitPane } from '../common/CollapsibleSplitPane';
import { ViewerShell } from '../viewer/ViewerShell';
import { ProvenancePanel } from './ProvenancePanel';

// Sub-components
import { DocumentHeader } from './subcomponents/DocumentHeader';
import { DocumentMetadataRail } from './subcomponents/DocumentMetadataRail';
import { DocumentPDFTab } from './subcomponents/DocumentPDFTab';
import { DocumentAnalysisTab } from './subcomponents/DocumentAnalysisTab';
import { deriveSummary, normalizeList } from './DocumentModalUtils';

interface Props {
  id: string;
  searchTerm?: string;
  onClose: () => void;
  initialDoc?: any;
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

  const urlParams = new URLSearchParams(location.search);
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

  const readTab = (): ViewerTab => {
    const current = urlParams.get('modalTab');
    if (current && BASE_VIEWER_TABS.some((tab) => tab.key === current)) {
      return current as ViewerTab;
    }
    return 'analysis';
  };

  const activeTab = readTab();

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

  const [doc, setDoc] = useState<any | null>(initialDoc || null);
  const [thread, setThread] = useState<{ threadId: string; messages: any[] } | null>(null);
  const [relatedDocs, setRelatedDocs] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
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
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [activeRailSection, setActiveRailSection] = useState<
    'metadata' | 'entities' | 'case' | 'timeline'
  >('metadata');
  const rightPaneScrollRef = useRef<HTMLDivElement | null>(null);
  const hasAutoSwitchedNoOcrRef = useRef(false);
  const hasAnyText = useMemo(
    () => Boolean(String(doc?.contentRefined || doc?.content || '').trim()),
    [doc?.content, doc?.contentRefined],
  );

  const viewerTabs = useMemo(
    () =>
      BASE_VIEWER_TABS.map((tab) => {
        if (tab.key !== 'pdf' || hasAnyText) return tab;
        return {
          ...tab,
          label: (
            <span className="inline-flex items-center gap-2">
              <span>Original Document</span>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                No OCR yet
              </span>
            </span>
          ),
        };
      }),
    [hasAnyText],
  );

  const { modalRef } = useModalFocusTrap(true);
  useScrollLock(true);

  useEffect(() => {
    hasAutoSwitchedNoOcrRef.current = false;
  }, [id]);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getDocument(id)
      .then((nextDoc) => {
        if (mounted) setDoc(nextDoc);
      })
      .catch(() => {
        // Keep initial doc if request fails.
      });

    apiClient
      .getDocumentThread(id)
      .then((nextThread) => {
        if (mounted) setThread(nextThread);
      })
      .catch(() => {
        // optional
      });

    setIsLoadingRelated(true);
    apiClient
      .getRelatedDocuments(id)
      .then((docs) => {
        if (mounted) setRelatedDocs(docs);
      })
      .catch(() => {
        // optional
      })
      .finally(() => {
        if (mounted) setIsLoadingRelated(false);
      });

    return () => {
      mounted = false;
    };
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

  useEffect(() => {
    const modeFromUrl = new URLSearchParams(location.search).get('textMode') as TextSubview;
    if (modeFromUrl && modeFromUrl !== textSubview) {
      setTextSubviewState(modeFromUrl);
    }
  }, [location.search, textSubview, setTextSubviewState]);

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
    const byName = new Map<string, any>();

    [...fromDoc, ...fromMentioned].forEach((entity: any) => {
      const name = String(entity?.fullName || entity?.name || '').trim();
      if (!name) return;
      if (!byName.has(name.toLowerCase())) {
        byName.set(name.toLowerCase(), { ...entity, name });
      }
    });

    return Array.from(byName.values());
  }, [doc]);

  const groupedEntities = useMemo(() => {
    const groups: Record<string, any[]> = {
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

    return Object.entries(groups).filter(([_, items]) => items.length > 0) as [string, any[]][];
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

  if (!doc) {
    return createPortal(
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1050] flex items-center justify-center p-4">
        <div className="surface-glass p-6 pointer-events-auto">
          <div className="text-white font-semibold mb-2">Unable to load document</div>
          <div className="text-slate-400 mb-4">
            Please try again or open in the Document Browser.
          </div>
          <button onClick={onClose} className="control px-4 text-white">
            Close
          </button>
        </div>
      </div>,
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
            docId={doc.id || id}
            content={cleanText || ocrText}
            searchTerm={localSearchTerm}
            openOriginalDocument={openOriginalDocument}
            isEmail={String(doc.evidenceType || '').toLowerCase() === 'email'}
            metadata={doc.metadata}
            title={doc.title || doc.fileName}
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
            relatedDocs={relatedDocs}
            isLoadingRelated={isLoadingRelated}
            onNavigateToDoc={(newId) => navigate(`${location.pathname}?documentId=${newId}`)}
            cleanText={cleanText}
            ocrText={ocrText}
          />
        );
      case 'provenance':
        return <ProvenancePanel document={doc} />;
      default:
        return null;
    }
  };

  return createPortal(
    <div
      id="DocumentModal"
      ref={modalRef}
      className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[10000] flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-none md:rounded-3xl w-full h-full flex flex-col border-0 md:border md:border-white/10 pointer-events-auto overflow-hidden shadow-2xl"
        style={{
          width: 'clamp(960px, 94vw, 1500px)',
          height: 'clamp(600px, 90vh, 1000px)',
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
          tabsClassName="px-4 md:px-8"
          bodyRef={contentRef}
          bodyClassName="selection:bg-cyan-500/30"
          bodyScrollable={false}
          bodyTestId="document-modal-scroll-region"
        >
          <CollapsibleSplitPane
            left={
              <div
                className="h-full overflow-y-auto custom-scrollbar px-5 md:px-12 py-8 md:py-10"
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                data-testid={`document-modal-tabpanel-${activeTab}`}
              >
                <div className="max-w-4xl mx-auto">{renderTabContent()}</div>
              </div>
            }
            right={
              <aside className="h-full bg-slate-950/10 overflow-y-auto custom-scrollbar">
                <DocumentMetadataRail
                  doc={doc}
                  id={id}
                  activeRailSection={activeRailSection}
                  expandedEntities={expandedEntities}
                  setExpandedEntities={setExpandedEntities}
                  entities={entities}
                  selectedEntity={selectedEntity}
                  setSelectedEntity={setSelectedEntity}
                  caseLinks={caseLinks}
                  timelineReferences={timelineReferences}
                  rightPaneScrollRef={rightPaneScrollRef as any}
                  onOpenDossier={setEntityModalId}
                  threadCount={thread?.messages?.length || 0}
                />
              </aside>
            }
            collapsedRight={
              <div className="h-full flex flex-col items-center pt-14 pb-8 gap-8 bg-slate-950/40 overflow-visible">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRailSection('metadata');
                    setRightPaneCollapsed(false);
                  }}
                  className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-all shadow-lg shadow-cyan-900/20"
                  title="Core metadata"
                >
                  <Sparkles className="w-6 h-6" />
                </button>
                <div className="w-8 h-px bg-white/5" />
                <button
                  type="button"
                  onClick={() => {
                    setActiveRailSection('entities');
                    setRightPaneCollapsed(false);
                  }}
                  className="relative group w-10 h-10 rounded-xl inline-flex items-center justify-center text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  aria-label="Live entities"
                >
                  <Users className="w-5 h-5" />
                  <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Live Entities
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRailSection('case');
                    setRightPaneCollapsed(false);
                  }}
                  className="relative group w-10 h-10 rounded-xl inline-flex items-center justify-center text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  aria-label="Case references"
                >
                  <Link2 className="w-5 h-5" />
                  <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Case References
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRailSection('timeline');
                    setRightPaneCollapsed(false);
                  }}
                  className="relative group w-10 h-10 rounded-xl inline-flex items-center justify-center text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  aria-label="Timeline hooks"
                >
                  <Calendar className="w-5 h-5" />
                  <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    Timeline Hooks
                  </span>
                </button>
              </div>
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
      </div>
    </div>,
    document.body,
  );
};

export default DocumentModal;
