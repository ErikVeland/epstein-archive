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
      className="h-full overflow-y-auto custom-scrollbar px-6 pt-8 space-y-6 pb-10"
    >
      <section
        data-rail-section="metadata"
        className={`surface-glass-card p-6 border-l-[3px] transition-colors ${
          activeRailSection === 'metadata'
            ? 'border-l-[var(--accent)] bg-[var(--glass-bg-strong)]'
            : 'border-l-transparent'
        }`}
      >
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-text-muted mb-5 font-bold flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-[var(--accent)]" />
          Core Metadata
        </h3>
        <div className="space-y-5">
          <div className="bg-[var(--glass-bg)] p-4 rounded-[var(--radius-md)] border border-[var(--glass-border)]">
            <span className="text-[10px] text-text-dim block mb-1.5 uppercase font-bold tracking-widest">
              System Index ID
            </span>
            <span className="font-mono text-sm text-[var(--accent)] break-all leading-tight">
              {String(doc.id || id)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 px-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-dim block uppercase font-bold tracking-widest">
                Origin Collection
              </span>
              <span className="text-sm text-text-strong font-medium">
                {doc.metadata?.source_collection || 'Classified / Internal'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-dim block uppercase font-bold tracking-widest">
                Thread Depth
              </span>
              <span className="text-sm text-text-strong font-medium font-mono">
                {threadCount} Related Comms
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        data-rail-section="entities"
        className={`surface-glass-card p-6 border-l-[3px] transition-colors ${
          activeRailSection === 'entities'
            ? 'border-l-[var(--accent)] bg-[var(--glass-bg-strong)]'
            : 'border-l-transparent'
        }`}
      >
        <button
          type="button"
          onClick={() => setExpandedEntities((prev) => !prev)}
          className="w-full flex items-center justify-between text-left group"
        >
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-text-muted font-bold">
            Live Entities ({entities.length})
          </h3>
          <ChevronDown
            className={`w-4 h-4 text-text-muted transition-all duration-300 ${expandedEntities ? 'rotate-180 text-[var(--accent)]' : 'group-hover:text-text-strong'}`}
          />
        </button>
        {expandedEntities && (
          <div className="mt-5 space-y-2">
            {entities.length === 0 && (
              <p className="text-xs text-text-dim italic">No entities flagged in this record.</p>
            )}
            {entities.map((entity, index) => (
              <button
                key={`${entity.id || entity.name}-${index}`}
                className={`w-full text-left px-4 py-3 rounded-[var(--radius-sm)] text-sm transition-all border ${
                  selectedEntity?.name === entity.name
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)] shadow-sm'
                    : 'bg-[var(--glass-bg)] border-transparent text-text-muted hover:bg-[var(--glass-bg-strong)] hover:border-[var(--glass-border)]'
                }`}
                onClick={() => setSelectedEntity(entity)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{entity.name}</span>
                  <span className="text-[9px] uppercase text-text-dim font-bold tracking-wider ml-2">
                    {entity.entityType || 'ENT'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedEntity && (
          <div className="mt-5 p-5 bg-[var(--glass-bg)] rounded-[var(--radius-md)] border border-[var(--accent)]/20 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase font-bold text-[var(--accent)]/80 tracking-widest">
                Active Focus
              </span>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-text-muted hover:text-text-strong transition-colors"
                aria-label="Clear active focus"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-lg text-text-strong font-display mb-3">{selectedEntity.name}</div>
            {Number.isFinite(Number(selectedEntity.id)) && (
              <button
                className="control !h-10 !bg-[var(--accent)]/10 !border-[var(--accent)]/20 text-[var(--accent)] text-[11px] font-bold tracking-widest hover:!bg-[var(--accent)]/20 w-full"
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
        className={`surface-glass-card p-6 border-l-[3px] transition-colors ${
          activeRailSection === 'case'
            ? 'border-l-[var(--accent)] bg-[var(--glass-bg-strong)]'
            : 'border-l-transparent'
        }`}
      >
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-text-muted mb-4 font-bold flex items-center gap-2">
          Case Reference
        </h3>
        {caseLinks.length === 0 ? (
          <p className="text-sm text-text-dim italic">No formal linkage.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {caseLinks.map((entry, index) => (
              <span
                key={`case-link-${index}`}
                className="px-3 py-1.5 bg-[var(--glass-bg)] text-text-strong text-[11px] font-bold uppercase tracking-wider rounded-[var(--radius-sm)] border border-[var(--glass-border)]"
              >
                {entry}
              </span>
            ))}
          </div>
        )}
      </section>

      <section
        data-rail-section="timeline"
        className={`surface-glass-card p-6 border-l-[3px] transition-colors ${
          activeRailSection === 'timeline'
            ? 'border-l-[var(--accent)] bg-[var(--glass-bg-strong)]'
            : 'border-l-transparent'
        }`}
      >
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-text-muted mb-4 font-bold flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-text-muted" />
          Timeline Hook
        </h3>
        {timelineReferences.length === 0 ? (
          <p className="text-sm text-text-dim italic">No chronological tag.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {timelineReferences.map((entry, index) => (
              <span
                key={`timeline-ref-${index}`}
                className="px-3 py-1.5 bg-[var(--glass-bg)] text-text-strong text-[11px] font-bold uppercase tracking-wider rounded-[var(--radius-sm)] border border-[var(--glass-border)]"
              >
                {entry}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="pt-6 border-t border-[var(--glass-border)]">
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
          className="w-full !bg-[var(--accent-investigate)]/10 !border-[var(--accent-investigate)]/30 text-[var(--accent-investigate)] hover:!bg-[var(--accent-investigate)]/20 uppercase tracking-widest text-[11px] font-bold shadow-none"
        />
      </section>
    </div>
  );
};

export default DocumentMetadataRail;
