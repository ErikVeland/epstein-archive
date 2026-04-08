import React from 'react';
import { Calendar, ChevronDown, FileText, X } from 'lucide-react';
import { AddToInvestigationButton } from '../../common/AddToInvestigationButton';
import styles from './DocumentMetadataRail.module.css';

import { Surface } from '../../../design-system/components/surfaces/Surface';
import { Box } from '../../../design-system/components/layout/Box';
import { LqText } from '../../../design-system/components/typography/Text';

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
    <Box
      ref={rightPaneScrollRef as React.RefObject<HTMLDivElement>}
      className={styles.railContainer}
    >
      <Surface
        variant="glass-highlight"
        data-rail-section="metadata"
        className={`${styles.sectionCard} ${styles.section} ${activeRailSection === 'metadata' ? styles.sectionActive : ''}`}
      >
        <h3 className={styles.sectionHeading}>
          <FileText size={16} className={styles.iconAccent} />
          Core Metadata
        </h3>
        <Box className={styles.metaFieldsStack}>
          <Box className={styles.metaIdBox}>
            <LqText variant="xs" className={styles.metaLabel}>
              System Index ID
            </LqText>
            <LqText variant="xs" weight="medium" className={styles.metaIdValue}>
              {String(doc.id || id)}
            </LqText>
          </Box>
          <Box className={styles.metaGrid}>
            <Box className={styles.metaField}>
              <LqText variant="xs" className={styles.metaLabel}>
                Origin Collection
              </LqText>
              <LqText variant="xs" weight="medium" className={styles.metaValue}>
                {(doc.metadata?.source_collection as string | undefined) || 'Classified / Internal'}
              </LqText>
            </Box>
            <Box className={styles.metaField}>
              <LqText variant="xs" className={styles.metaLabel}>
                Thread Depth
              </LqText>
              <LqText variant="xs" weight="medium" className={styles.metaValueMono}>
                {threadCount} Related Comms
              </LqText>
            </Box>
          </Box>
        </Box>
      </Surface>

      <Surface
        variant="glass-highlight"
        data-rail-section="entities"
        className={`${styles.sectionCard} ${styles.section} ${activeRailSection === 'entities' ? styles.sectionActive : ''}`}
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
          <Box className={styles.entitiesList}>
            {entities.length === 0 && (
              <LqText variant="small" color="muted" className={styles.emptyEntities}>
                No entities flagged in this record.
              </LqText>
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
                <Box className={styles.entityRow}>
                  <span className={styles.entityName}>{entity.name}</span>
                  <span className={styles.entityType}>{entity.entityType || 'ENT'}</span>
                </Box>
              </button>
            ))}
          </Box>
        )}

        {selectedEntity && (
          <Box className={styles.selectedEntityCard}>
            <Box className={styles.selectedEntityHeader}>
              <LqText variant="xs" className={styles.selectedEntityLabel}>
                Active Focus
              </LqText>
              <button
                onClick={() => setSelectedEntity(null)}
                className={styles.clearButton}
                aria-label="Clear active focus"
              >
                <X size={16} />
              </button>
            </Box>
            <LqText variant="body" weight="semibold" className={styles.selectedEntityName}>
              {selectedEntity.name}
            </LqText>
            {Number.isFinite(Number(selectedEntity.id)) && (
              <button
                className={styles.deepLinkButton}
                onClick={() => onOpenDossier(String(selectedEntity.id))}
              >
                Deep Link
              </button>
            )}
          </Box>
        )}
      </Surface>

      <Surface
        variant="glass-highlight"
        data-rail-section="case"
        className={`${styles.sectionCard} ${styles.section} ${activeRailSection === 'case' ? styles.sectionActive : ''}`}
      >
        <h3 className={styles.sectionHeadingSmGap}>Case Reference</h3>
        {caseLinks.length === 0 ? (
          <LqText variant="small" color="muted" className={styles.emptyText}>
            No formal linkage.
          </LqText>
        ) : (
          <Box className={styles.tagRow}>
            {caseLinks.map((entry, index) => (
              <span key={`case-link-${index}`} className={styles.tag}>
                {entry}
              </span>
            ))}
          </Box>
        )}
      </Surface>

      <Surface
        variant="glass-highlight"
        data-rail-section="timeline"
        className={`${styles.sectionCard} ${styles.section} ${activeRailSection === 'timeline' ? styles.sectionActive : ''}`}
      >
        <h3 className={styles.sectionHeading}>
          <Calendar size={16} className={styles.iconMuted} />
          Timeline Hook
        </h3>
        {timelineReferences.length === 0 ? (
          <LqText variant="small" color="muted" className={styles.emptyText}>
            No chronological tag.
          </LqText>
        ) : (
          <Box className={styles.tagRow}>
            {timelineReferences.map((entry, index) => (
              <span key={`timeline-ref-${index}`} className={styles.tag}>
                {entry}
              </span>
            ))}
          </Box>
        )}
      </Surface>

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
          className={styles.addToInvestigationButton}
        />
      </section>
    </Box>
  );
};

export default DocumentMetadataRail;
