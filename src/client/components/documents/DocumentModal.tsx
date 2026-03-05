import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Link2,
  Sparkles,
  Users,
  X,
  Search,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { CloseButton } from '../common/CloseButton';
import { CollapsibleSplitPane } from '../common/CollapsibleSplitPane';
import { EvidenceModal } from '../common/EvidenceModal';
import { DocumentAnnotationSystem } from './DocumentAnnotationSystem';
import { InvestigationTextRenderer } from './InvestigationTextRenderer';
import { DocumentDiffView } from './DocumentDiffView';
import { ProvenancePanel } from './ProvenancePanel';
import { ViewerShell } from '../viewer/ViewerShell';
import { PDFVariantViewer } from './PDFVariantViewer';

interface Props {
  id: string;
  searchTerm?: string;
  onClose: () => void;
  initialDoc?: any;
}

type ViewerTab = 'analysis' | 'pdf' | 'annotations' | 'provenance';

type TextSubview = 'clean' | 'ocr' | 'diff';

const VIEWER_TABS: Array<{
  key: ViewerTab;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}> = [
  { key: 'analysis', label: 'Summary & Analysis' },
  { key: 'pdf', label: 'PDF View' },
  { key: 'annotations', label: 'Annotations' },
  { key: 'provenance', label: 'Provenance' },
];

const formatDate = (value: string | null | undefined): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

const normalizeList = (candidate: unknown): string[] => {
  if (!candidate) return [];
  if (Array.isArray(candidate)) {
    return candidate.map((entry) => String(entry || '').trim()).filter((entry) => entry.length > 0);
  }
  if (typeof candidate === 'string') {
    return candidate
      .split(/[\n;,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
};

const toSentenceBullets = (text: string, max = 5): string[] => {
  if (!text) return [];

  const lineBullets = text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\u2022\d.)\s]+/, '').trim())
    .filter((line) => line.length > 20);
  if (lineBullets.length >= 2) return lineBullets.slice(0, max);

  const sentenceBullets = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 35)
    .slice(0, max);

  return sentenceBullets;
};

const deriveSummary = (doc: any): { bullets: string[]; sourceLabel: string } => {
  const metadata = doc?.metadata || {};
  const aiSummary =
    (typeof metadata.ai_summary === 'string' && metadata.ai_summary.trim()) ||
    (typeof metadata.summary === 'string' && metadata.summary.trim()) ||
    (typeof doc?.ai_summary === 'string' && doc.ai_summary.trim()) ||
    '';

  const aiBullets = toSentenceBullets(aiSummary, 5);
  if (aiBullets.length > 0) {
    return { bullets: aiBullets, sourceLabel: 'AI summary' };
  }

  const extractedText = String(doc?.contentRefined || doc?.content || '').trim();
  const extractedBullets = toSentenceBullets(extractedText, 5);
  if (extractedBullets.length > 0) {
    return { bullets: extractedBullets, sourceLabel: 'Derived from extracted text' };
  }

  return { bullets: [], sourceLabel: 'No summary available for this document.' };
};

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
    if (current && VIEWER_TABS.some((tab) => tab.key === current)) {
      return current as ViewerTab;
    }
    return 'analysis';
  };

  const activeTab = readTab();

  const setActiveTab = (tab: ViewerTab) => {
    if (contentRef.current) {
      scrollPositions.current[activeTab] = contentRef.current.scrollTop;
    }
    const params = new URLSearchParams(location.search);
    params.set('modalTab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

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

  const { modalRef } = useModalFocusTrap(true);
  useScrollLock(true);

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

  const entities = useMemo(() => {
    const fromDoc = Array.isArray(doc?.entities) ? doc.entities : [];
    const fromMentioned = Array.isArray(doc?.mentionedEntities) ? doc.mentionedEntities : [];
    const byName = new Map<string, any>();

    [...fromDoc, ...fromMentioned].forEach((entity: any) => {
      const name = String(entity?.full_name || entity?.name || '').trim();
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
      const type = (ent.entity_type || ent.type || 'unknown').toLowerCase();
      if (type === 'person' || type === 'individual') groups['People'].push(ent);
      else if (type === 'organization' || type === 'company' || type === 'agency')
        groups['Organizations'].push(ent);
      else if (type === 'location' || type === 'address' || type === 'place')
        groups['Locations'].push(ent);
      else if (type === 'email' || type === 'phone') groups['Communication'].push(ent);
      else groups['Other'].push(ent);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
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

  const downloadText = () => {
    const blob = new Blob([String(doc.content || '')], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.fileName || 'document'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cleanText = String(doc.contentRefined || doc.content || '');
  const ocrText = String(doc.content || '');

  const entitiesPanel = (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Extracted Entities</h3>
        <span className="text-xs text-slate-500 uppercase tracking-widest">
          {entities.length} TOTAL
        </span>
      </div>
      {entities.length === 0 ? (
        <div className="surface-quiet p-12 text-center">
          <p className="text-sm text-slate-500">No extracted entities available in this record.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedEntities.map(([groupName, groupItems]) => (
            <section key={groupName} className="space-y-4">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 font-black flex items-center gap-3">
                {groupName}
                <div className="h-px flex-1 bg-cyan-900/30" />
                <span className="text-slate-600">{groupItems.length}</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupItems.map((entity, index) => (
                  <div
                    key={`${entity.id || entity.name}-${index}`}
                    className="surface-quiet p-4 hover:border-cyan-500/40 transition-all group relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="text-left font-medium text-cyan-300 hover:text-cyan-100 truncate block w-full"
                          onClick={() => setSelectedEntity(entity)}
                        >
                          {entity.name}
                        </button>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                          {entity.primary_role || entity.role || entity.entity_type || 'ENTITY'}
                        </span>
                      </div>
                      {entity.risk_rating && (
                        <div
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            entity.risk_rating > 3
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          RISK {entity.risk_rating}
                        </div>
                      )}
                    </div>
                    {entity.mentions > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 uppercase font-bold">
                          {entity.mentions} Mentions
                        </span>
                        <button
                          onClick={() => setEntityModalId(String(entity.id))}
                          className="text-[9px] text-cyan-500/60 hover:text-cyan-400 uppercase font-black tracking-widest"
                        >
                          View Dossier
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );

  const relatedPanel = (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Related Documents</h3>
        <span className="text-xs text-slate-500 uppercase tracking-widest">
          SHARED ENTITY LINKS
        </span>
      </div>

      {isLoadingRelated ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500 italic">Analyzing cross-references...</p>
        </div>
      ) : relatedDocs.length === 0 ? (
        <div className="surface-quiet p-12 text-center">
          <p className="text-sm text-slate-500">
            No related documents identified through shared entities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {relatedDocs.map((relatedDoc) => (
            <div
              key={relatedDoc.id}
              className="surface-quiet p-5 hover:border-cyan-500/40 transition-all group border-l-4 border-l-slate-800 hover:border-l-cyan-500 cursor-pointer"
              onClick={() => navigate(`${location.pathname}?documentId=${relatedDoc.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`${location.pathname}?documentId=${relatedDoc.id}`);
                }
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-left font-bold text-slate-100 group-hover:text-cyan-400 truncate text-base">
                      {relatedDoc.title || relatedDoc.fileName}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {relatedDoc.evidenceType}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(relatedDoc.dateCreated)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
                    {relatedDoc.sharedEntities?.map((ent: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-cyan-950/40 text-cyan-400 text-[10px] font-bold rounded border border-cyan-900/30 whitespace-nowrap"
                      >
                        {ent}
                      </span>
                    ))}
                  </div>
                  <div className="text-[9px] text-slate-600 uppercase font-black tracking-widest flex items-center gap-2">
                    <Users className="w-2.5 h-2.5" />
                    {relatedDoc.sharedCount} SHARED ENTITIES
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const mainPanel = () => {
    switch (activeTab) {
      case 'pdf':
        return <PDFVariantViewer documentId={id} className="h-[calc(100vh-320px)] min-h-[600px]" />;
      case 'analysis':
        return (
          <div className="space-y-8">
            {textSubview === 'clean' && (
              <section className="surface-quiet p-4 border-l-4 border-violet-500/50 mb-6 group hover:border-violet-400 transition-colors">
                <h3 className="text-sm font-semibold text-slate-100 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-300" />
                  Key Insights
                </h3>
                {summary.bullets.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 text-slate-200 text-sm leading-relaxed">
                    {summary.bullets.slice(0, 5).map((bullet, index) => (
                      <li key={`summary-${index}`}>{bullet}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 text-sm italic">
                    No summary insights available for this document.
                  </p>
                )}
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-4 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-violet-500" />
                  {summary.sourceLabel}
                </div>
              </section>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {(['clean', 'ocr', 'diff'] as TextSubview[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTextSubview(mode)}
                  className={`px-3 py-1.5 rounded-md text-xs uppercase tracking-wider border transition-colors ${
                    textSubview === mode
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                      : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'clean' ? 'Clean Text' : mode === 'ocr' ? 'Raw OCR' : 'Diff View'}
                </button>
              ))}
            </div>
            {textSubview === 'diff' ? (
              <DocumentDiffView cleanText={cleanText} originalText={ocrText} />
            ) : (
              <InvestigationTextRenderer
                document={doc}
                mode={textSubview}
                searchTerm={localSearchTerm}
                showRecoveryHighlights={textSubview !== 'ocr' && showRecoveryHighlights}
                isReadingMode={isReadingMode}
                onToggleReadingMode={() => setIsReadingMode(!isReadingMode)}
                onToggleRecoveryHighlights={setShowRecoveryHighlights}
                onEntitySelect={(entity) => setSelectedEntity(entity)}
              />
            )}

            {textSubview === 'clean' && (
              <div className="pt-12 border-t border-white/5 space-y-12">
                {entitiesPanel}
                {relatedPanel}
              </div>
            )}
          </div>
        );
      case 'annotations':
        return (
          <div className="h-full flex flex-col">
            <DocumentAnnotationSystem
              documentId={String(doc.id || id)}
              content={cleanText || ocrText}
              searchTerm={localSearchTerm}
              mode="full"
            />
          </div>
        );
      case 'provenance':
        return <ProvenancePanel document={doc} />;
      default:
        return null;
    }
  };

  const rightPaneContent = (
    <div className="space-y-6 pb-8">
      <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 overflow-hidden shadow-xl shadow-black/20">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-5 font-black flex items-center gap-2.5">
          <FileText className="w-3.5 h-3.5 text-cyan-500/80" />
          Core Metadata
        </h3>
        <div className="space-y-5">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 group hover:border-cyan-500/20 transition-all">
            <span className="text-[9px] text-slate-500 block mb-1.5 uppercase font-black tracking-widest">
              System Index ID
            </span>
            <span className="font-mono text-sm text-cyan-200 break-all leading-tight">
              {String(doc.id || id)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 px-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-500 block uppercase font-black tracking-widest">
                Origin Collection
              </span>
              <span className="text-xs text-slate-200 font-medium">
                {doc.metadata?.source_collection || 'Classified / Internal'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-500 block uppercase font-black tracking-widest">
                Thread Depth
              </span>
              <span className="text-xs text-slate-200 font-medium font-mono">
                {thread?.messages?.length || 0} Related Comms
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-lg shadow-black/10">
        <button
          type="button"
          onClick={() => setExpandedEntities((prev) => !prev)}
          className="w-full flex items-center justify-between text-left group"
        >
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">
            Live Entities ({entities.length})
          </h3>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-all duration-300 ${expandedEntities ? 'rotate-180 text-cyan-400' : 'group-hover:text-slate-300'}`}
          />
        </button>
        {expandedEntities && (
          <div className="mt-4 space-y-1.5">
            {entities.length === 0 && (
              <p className="text-xs text-slate-600 italic">No entities flagged in this record.</p>
            )}
            {entities.map((entity, index) => (
              <button
                key={`${entity.id || entity.name}-${index}`}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all border ${
                  selectedEntity?.name === entity.name
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-100'
                    : 'bg-slate-800/40 border-transparent text-slate-400 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
                onClick={() => setSelectedEntity(entity)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{entity.name}</span>
                  <span className="text-[8px] uppercase text-slate-600 font-black">
                    {entity.entity_type || 'ENT'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedEntity && (
          <div className="mt-4 p-4 bg-slate-900/60 rounded-lg border border-cyan-500/20 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black text-cyan-400/80 tracking-widest">
                Active Focus
              </span>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-slate-600 hover:text-slate-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-base text-slate-100 font-bold mb-1">{selectedEntity.name}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-4">
              {selectedEntity.entity_type || 'Unclassified Entity'}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <AddToInvestigationButton
                item={{
                  id: String(selectedEntity.id || selectedEntity.entity_id || selectedEntity.name),
                  title: selectedEntity.name,
                  description: selectedEntity.summary || selectedEntity.role || '',
                  type: 'entity',
                  sourceId: String(
                    selectedEntity.id || selectedEntity.entity_id || selectedEntity.name,
                  ),
                  metadata: { entity_id: selectedEntity.id || selectedEntity.entity_id || null },
                }}
                variant="quick"
                className="w-full justify-center !h-9 text-[10px]"
              />
              {Number.isFinite(Number(selectedEntity.id)) && (
                <button
                  className="control !h-9 !bg-cyan-600/20 !border-cyan-500/30 text-cyan-200 text-[10px] font-bold hover:!bg-cyan-500/30 w-full"
                  onClick={() => setEntityModalId(String(selectedEntity.id))}
                >
                  Deep Link
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5">
        <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-lg shadow-black/10">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4 font-black">
            Case Reference
          </h3>
          {caseLinks.length === 0 ? (
            <p className="text-xs text-slate-500/80 italic font-light">No formal linkage.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {caseLinks.map((entry, index) => (
                <span
                  key={`case-link-${index}`}
                  className="px-2.5 py-1.5 bg-slate-950/50 text-slate-200 text-[10px] font-bold rounded-lg border border-white/5 hover:border-cyan-500/30 transition-colors"
                >
                  {entry}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-lg shadow-black/10">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4 font-black">
            Timeline Hook
          </h3>
          {timelineReferences.length === 0 ? (
            <p className="text-xs text-slate-500/80 italic font-light">No chronological tag.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {timelineReferences.map((entry, index) => (
                <span
                  key={`timeline-ref-${index}`}
                  className="px-2.5 py-1.5 bg-slate-950/50 text-slate-200 text-[10px] font-bold rounded-lg border border-white/5 hover:border-cyan-500/30 transition-colors"
                >
                  {entry}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="pt-4 border-t border-slate-800/60">
        <AddToInvestigationButton
          item={{
            id: String(doc.id || id),
            title: doc.title || doc.fileName || `Document ${id}`,
            description: doc.description || doc.contentPreview || '',
            type: 'document',
            sourceId: String(doc.id || id),
            metadata: {
              document_id: doc.id || id,
              ingest_run_id: doc.ingestRunId || doc.ingest_run_id || null,
            },
          }}
          variant="quick"
          className="w-full !bg-cyan-600/10 !border-cyan-500/30 text-cyan-200 hover:!bg-cyan-600/20"
        />
        {relatedDocs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-800/60">
            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">
              Discovery Context
            </h4>
            <div className="space-y-3">
              {relatedDocs.slice(0, 3).map((rd) => (
                <button
                  key={rd.id}
                  onClick={() => navigate(`${location.pathname}?documentId=${rd.id}`)}
                  className="w-full text-left group"
                >
                  <div className="text-[11px] text-slate-400 group-hover:text-cyan-300 font-medium truncate mb-0.5 line-clamp-1">
                    {rd.title || rd.fileName}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500/40"
                        style={{ width: `${Math.min(100, rd.sharedCount * 20)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-600 font-bold">{rd.sharedCount}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );

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
            <div className="flex items-center gap-4 py-6 px-8 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-900/20">
                <FileText className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h2
                  id="document-modal-title"
                  className="text-2xl font-bold text-white tracking-tight truncate leading-tight"
                >
                  {doc.title || doc.fileName}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      doc.evidenceType === 'email'
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                        : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                    }`}
                  >
                    {doc.evidenceType || doc.fileType || 'Unclassified Record'}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(doc.dateModified || doc.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          }
          actions={
            <>
              <div className="relative group lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Find in record..."
                  className="control !h-12 w-full pl-10 pr-4 !bg-slate-950/40 border-white/5 focus:!border-cyan-500/50 transition-all text-sm"
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                />
              </div>
              <div className="h-8 w-px bg-white/5 mx-1 md:block hidden" />
              {canReturnToCase && (
                <button
                  onClick={handleBackToCase}
                  className="control !h-12 px-5 flex items-center gap-2 text-slate-300 hover:text-white group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Case</span>
                </button>
              )}
              <button
                onClick={downloadText}
                className="control !h-12 w-12 flex items-center justify-center text-slate-400 hover:text-cyan-400"
                title="Download Document"
              >
                <Download className="w-5 h-5" />
              </button>
              <CloseButton
                onClick={onClose}
                size="md"
                label="Close"
                className="!h-12 !w-12 text-slate-400 hover:text-rose-400 hover:border-rose-500/30"
              />
            </>
          }
          tabs={VIEWER_TABS}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as ViewerTab)}
          tabsClassName="px-4 md:px-8"
          bodyRef={contentRef}
          bodyClassName="selection:bg-cyan-500/30"
          bodyTestId="document-modal-scroll-region"
        >
          <CollapsibleSplitPane
            left={
              <div
                className="h-full px-5 md:px-12 py-8 md:py-10"
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                data-testid={`document-modal-tabpanel-${activeTab}`}
              >
                <div className="max-w-4xl mx-auto">{mainPanel()}</div>
              </div>
            }
            right={
              <aside className="h-full bg-slate-950/10">
                <div className="h-full px-6 md:px-8 py-8 md:py-10">{rightPaneContent}</div>
              </aside>
            }
            collapsedRight={
              <div className="h-full flex flex-col items-center py-8 gap-8 bg-slate-900/10">
                <button
                  type="button"
                  onClick={() => setRightPaneCollapsed(false)}
                  className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-all shadow-lg shadow-cyan-900/20"
                  title="Expand Intelligence Rail"
                >
                  <Sparkles className="w-6 h-6" />
                </button>
                <div className="w-8 h-px bg-white/5" />
                <Users className="w-5 h-5 text-slate-600 hover:text-cyan-400/60 cursor-pointer transition-colors" />
                <Link2 className="w-5 h-5 text-slate-600 hover:text-cyan-400/60 cursor-pointer transition-colors" />
                <Calendar className="w-5 h-5 text-slate-600 hover:text-cyan-400/60 cursor-pointer transition-colors" />
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
