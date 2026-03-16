import React from 'react';
import { Calendar, ChevronDown, FileText, X } from 'lucide-react';
import { AddToInvestigationButton } from '../../common/AddToInvestigationButton';

interface DocumentMetadataRailProps {
  doc: any;
  id: string;
  activeRailSection: 'metadata' | 'entities' | 'case' | 'timeline';
  expandedEntities: boolean;
  setExpandedEntities: (value: boolean | ((prev: boolean) => boolean)) => void;
  entities: any[];
  selectedEntity: any;
  setSelectedEntity: (value: any) => void;
  caseLinks: string[];
  timelineReferences: string[];
  rightPaneScrollRef: React.RefObject<HTMLDivElement>;
  onOpenDossier: (id: string) => void;
  threadCount: number;
}

export const DocumentMetadataRail: React.FC<DocumentMetadataRailProps> = ({
  doc,
  id,
  activeRailSection,
  expandedEntities,
  setExpandedEntities,
  entities,
  selectedEntity,
  setSelectedEntity,
  caseLinks,
  timelineReferences,
  rightPaneScrollRef,
  onOpenDossier,
  threadCount,
}) => {
  return (
    <div
      ref={rightPaneScrollRef}
      className="h-full overflow-y-auto custom-scrollbar px-4 pt-6 space-y-6 pb-8"
    >
      <section
        data-rail-section="metadata"
        className={`bg-slate-900/40 border rounded-2xl p-5 overflow-hidden shadow-xl shadow-black/20 ${
          activeRailSection === 'metadata' ? 'border-cyan-500/35' : 'border-white/5'
        }`}
      >
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-5 font-black flex items-center gap-2.5">
          <FileText className="w-3.5 h-3.5 text-cyan-500/80" />
          Core Metadata
        </h3>
        <div className="space-y-5">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5">
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
                {threadCount} Related Comms
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        data-rail-section="entities"
        className={`bg-slate-900/40 border rounded-2xl p-5 shadow-lg shadow-black/10 ${
          activeRailSection === 'entities' ? 'border-cyan-500/35' : 'border-white/5'
        }`}
      >
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
                  <span className="text-[8px] uppercase text-slate-600 font-black ml-1">
                    {entity.entityType || 'ENT'}
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
            {Number.isFinite(Number(selectedEntity.id)) && (
              <button
                className="control !h-9 !bg-cyan-600/20 !border-cyan-500/30 text-cyan-200 text-[10px] font-bold hover:!bg-cyan-500/30 w-full"
                onClick={() => onOpenDossier(String(selectedEntity.id))}
              >
                Deep Link
              </button>
            )}
          </div>
        )}
      </section>

      <section
        data-rail-section="case"
        className={`bg-slate-900/40 border rounded-2xl p-5 shadow-lg shadow-black/10 ${
          activeRailSection === 'case' ? 'border-cyan-500/35' : 'border-white/5'
        }`}
      >
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
                className="px-2.5 py-1.5 bg-slate-950/50 text-slate-200 text-[10px] font-bold rounded-lg border border-white/5"
              >
                {entry}
              </span>
            ))}
          </div>
        )}
      </section>

      <section
        data-rail-section="timeline"
        className={`bg-slate-900/40 border rounded-2xl p-5 shadow-lg shadow-black/10 ${
          activeRailSection === 'timeline' ? 'border-cyan-500/35' : 'border-white/5'
        }`}
      >
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4 font-black flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          Timeline Hook
        </h3>
        {timelineReferences.length === 0 ? (
          <p className="text-xs text-slate-500/80 italic font-light">No chronological tag.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {timelineReferences.map((entry, index) => (
              <span
                key={`timeline-ref-${index}`}
                className="px-2.5 py-1.5 bg-slate-950/50 text-slate-200 text-[10px] font-bold rounded-lg border border-white/5"
              >
                {entry}
              </span>
            ))}
          </div>
        )}
      </section>

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
      </section>
    </div>
  );
};

export default DocumentMetadataRail;
