import React from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { InvestigationTextRenderer } from '../InvestigationTextRenderer';
import { DocumentDiffView } from '../DocumentDiffView';
import { DocumentAnnotationSystem } from '../DocumentAnnotationSystem';
import { formatDate } from '../DocumentModalUtils';

type TextSubview = 'clean' | 'ocr' | 'diff';

interface DocumentAnalysisTabProps {
  doc: any;
  id: string;
  textSubview: TextSubview;
  setTextSubview: (mode: TextSubview) => void;
  localSearchTerm: string;
  summary: { bullets: string[]; sourceLabel: string };
  showRecoveryHighlights: boolean;
  setShowRecoveryHighlights: (value: boolean) => void;
  isReadingMode: boolean;
  setIsReadingMode: (value: boolean) => void;
  setSelectedEntity: (value: any) => void;
  setEntityModalId: (value: string) => void;
  entities: any[];
  groupedEntities: Array<[string, any[]]>;
  relatedDocs: any[];
  isLoadingRelated: boolean;
  onNavigateToDoc: (newId: string) => void;
  cleanText: string;
  ocrText: string;
}

export const DocumentAnalysisTab: React.FC<DocumentAnalysisTabProps> = ({
  doc,
  id,
  textSubview,
  setTextSubview,
  localSearchTerm,
  summary,
  showRecoveryHighlights,
  setShowRecoveryHighlights,
  isReadingMode,
  setIsReadingMode,
  setSelectedEntity,
  setEntityModalId,
  entities,
  groupedEntities,
  relatedDocs,
  isLoadingRelated,
  onNavigateToDoc,
  cleanText,
  ocrText,
}) => {
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

      {(cleanText.trim() || ocrText.trim()) && (
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
      )}

      {!cleanText.trim() && !ocrText.trim() ? (
        <div className="space-y-4">
          <div className="surface-quiet p-4 border-l-4 border-slate-600/50 flex items-center gap-3">
            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
            <p className="text-xs text-slate-400">
              Text extraction is pending for this record. Open the Original Document tab for the
              source asset.
            </p>
          </div>
        </div>
      ) : textSubview === 'diff' ? (
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
          <section className="surface-quiet p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Annotations</h3>
            <DocumentAnnotationSystem
              documentId={String(doc.id || id)}
              content={cleanText || ocrText}
              searchTerm={localSearchTerm}
              mode="inline"
            />
          </section>

          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Extracted Entities</h3>
              <span className="text-xs text-slate-500 uppercase tracking-widest">
                {entities.length} TOTAL
              </span>
            </div>
            {entities.length === 0 ? (
              <div className="surface-quiet p-12 text-center">
                <p className="text-sm text-slate-500">
                  No extracted entities available in this record.
                </p>
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
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                className="text-left font-medium text-cyan-300 hover:text-cyan-100 truncate block w-full"
                                onClick={() => setSelectedEntity(entity)}
                              >
                                {entity.name}
                              </button>
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                {entity.primaryRole || entity.role || entity.entityType || 'ENTITY'}
                              </span>
                            </div>
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
                    onClick={() => onNavigateToDoc(String(relatedDoc.id))}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="text-left font-bold text-slate-100 group-hover:text-cyan-400 truncate text-base block">
                          {relatedDoc.title || relatedDoc.fileName}
                        </span>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentAnalysisTab;
