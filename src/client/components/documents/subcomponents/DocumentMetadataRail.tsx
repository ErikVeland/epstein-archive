import React from 'react';
import { Calendar, ChevronDown, FileText, X } from 'lucide-react';
import { AddToInvestigationButton } from '../../common/AddToInvestigationButton';
import styles from './DocumentMetadataRail.module.css';

interface DocRecord {
  id?: string | number;
  title?: string;
  fileName?: string;
  description?: string;
  contentPreview?: string;
  ingestRunId?: string | null;
  ingest_run_id?: string | null;
  metadata?: Record<string, unknown>;
}

interface EntityRecord {
  id?: string | number;
  name?: string;
  fullName?: string;
  entityType?: string;
  [key: string]: unknown;
}

interface DocumentMetadataRailProps {
  doc: DocRecord;
  id: string;
  activeRailSection: 'metadata' | 'entities' | 'case' | 'timeline';
  expandedEntities: boolean;
  setExpandedEntities: (value: boolean | ((prev: boolean) => boolean)) => void;
  entities: EntityRecord[];
  selectedEntity: EntityRecord | null;
  setSelectedEntity: (value: EntityRecord | null) => void;
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
    <div ref={rightPaneScrollRef} className={`${styles.railContainer} custom-scrollbar`}>
      <section
        data-rail-section="metadata"
        className={`surface-glass-card p-6 ${styles.section} ${activeRailSection === 'metadata' ? styles.sectionActive : ''}`}
      >
        <h3 className={styles.sectionHeading}>
          <FileText size={16} className={styles.iconAccent} />
          Core Metadata
        </h3>
        <div className={styles.metaFieldsStack}>
          <div className={styles.metaIdBox}>
            <span className={styles.metaLabel}>System Index ID</span>
            <span className={styles.metaIdValue}>{String(doc.id || id)}</span>
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaField}>
              <span className={styles.metaLabel}>Origin Collection</span>
              <span className={styles.metaValue}>
                {(doc.metadata?.source_collection as string | undefined) || 'Classified / Internal'}
              </span>
            </div>
            <div className={styles.metaField}>
              <span className={styles.metaLabel}>Thread Depth</span>
              <span className={styles.metaValueMono}>{threadCount} Related Comms</span>
            </div>
          </div>
        </div>
      </section>

      <section
        data-rail-section="entities"
        className={`surface-glass-card p-6 ${styles.section} ${activeRailSection === 'entities' ? styles.sectionActive : ''}`}
      >
        <button
          type="button"
          onClick={() => setExpandedEntities((prev) => !prev)}
          className={styles.entitiesToggle}
        >
          <h3 className={styles.entitiesHeading}>Live Entities ({entities.length})</h3>
          <ChevronDown
            size={16}
            className={`${styles.chevronIcon} ${expandedEntities ? styles.chevronRotated : ''}`}
          />
        </button>
        {expandedEntities && (
          <div className={styles.entitiesList}>
            {entities.length === 0 && (
              <p className={styles.emptyEntities}>No entities flagged in this record.</p>
            )}
            {entities.map((entity, index) => (
              <button
                key={`${entity.id || entity.name}-${index}`}
                className={`${styles.entityButton} ${
                  selectedEntity?.name === entity.name
                    ? styles.entityButtonActive
                    : styles.entityButtonDefault
                }`}
                onClick={() => setSelectedEntity(entity)}
              >
                <div className={styles.entityRow}>
                  <span className={styles.entityName}>{entity.name}</span>
                  <span className={styles.entityType}>{entity.entityType || 'ENT'}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedEntity && (
          <div className={styles.selectedEntityCard}>
            <div className={styles.selectedEntityHeader}>
              <span className={styles.selectedEntityLabel}>Active Focus</span>
              <button
                onClick={() => setSelectedEntity(null)}
                className={styles.clearButton}
                aria-label="Clear active focus"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.selectedEntityName}>{selectedEntity.name}</div>
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
        className={`surface-glass-card p-6 ${styles.section} ${activeRailSection === 'case' ? styles.sectionActive : ''}`}
      >
        <h3 className={styles.sectionHeadingSmGap}>Case Reference</h3>
        {caseLinks.length === 0 ? (
          <p className={styles.emptyText}>No formal linkage.</p>
        ) : (
          <div className={styles.tagRow}>
            {caseLinks.map((entry, index) => (
              <span key={`case-link-${index}`} className={styles.tag}>
                {entry}
              </span>
            ))}
          </div>
        )}
      </section>

      <section
        data-rail-section="timeline"
        className={`surface-glass-card p-6 ${styles.section} ${activeRailSection === 'timeline' ? styles.sectionActive : ''}`}
      >
        <h3 className={styles.sectionHeading}>
          <Calendar size={16} className={styles.iconMuted} />
          Timeline Hook
        </h3>
        {timelineReferences.length === 0 ? (
          <p className={styles.emptyText}>No chronological tag.</p>
        ) : (
          <div className={styles.tagRow}>
            {timelineReferences.map((entry, index) => (
              <span key={`timeline-ref-${index}`} className={styles.tag}>
                {entry}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.addSection}>
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
