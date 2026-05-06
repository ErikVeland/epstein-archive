import React from 'react';
import Icon from '@client/components/common/Icon';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';
import { ProvenanceBadge } from '@client/components/common/ProvenanceBadge';
import type { ExtractionMethod, ProvenanceStatus, ReviewState } from '@shared/dto/provenance';
import styles from './DocumentMetadataRail.module.css';

import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';
import { LqText } from '@client/design-system/components/typography/Text';

import { Button, HIGSettingsGroup, HIGSettingsRow, HIGStackRow } from '@client/design-system/lib';

interface DocRecord {
  id?: string | number;
  title?: string;
  fileName?: string;
  description?: string;
  contentPreview?: string;
  ingestRunId?: string | null;
  ingest_run_id?: string | null;
  metadata?: Record<string, unknown>;
  sourceDocumentId?: number | null;
  sourceHash?: string | null;
  extractionMethod?: ExtractionMethod | null;
  confidence?: number | null;
  reviewState?: ReviewState;
  lastVerifiedAt?: string | null;
  provenanceStatus?: ProvenanceStatus;
  evidenceType?: string;
}

export interface EntityRecord {
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
  summary?: { bullets: string[]; sourceLabel: string } | null;
  relatedDocs?: DocRecord[];
  onNavigateToDoc?: (newId: string) => void;
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
  summary = null,
  relatedDocs = [],
  onNavigateToDoc,
}) => {
  const [expandedSummary, setExpandedSummary] = React.useState(true);
  const [expandedRelated, setExpandedRelated] = React.useState(false);
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
          <Icon name="FileText" size="sm" className={styles.iconAccent} />
          Core Metadata
        </h3>
        <Box className={styles.metaFieldsStack}>
          <HIGSettingsGroup>
            <HIGSettingsRow label="Index ID" value={String(doc.id || id)} isMono />
            <HIGSettingsRow
              label="Provenance"
              value={
                <ProvenanceBadge
                  sourceDocumentId={doc.sourceDocumentId}
                  sourceHash={doc.sourceHash}
                  reviewState={doc.reviewState}
                  confidence={doc.confidence}
                  extractionMethod={doc.extractionMethod}
                  provenanceStatus={doc.provenanceStatus}
                />
              }
            />
            <HIGSettingsRow
              label="Collection"
              value={(doc.metadata?.source_collection as string | undefined) || 'Classified'}
            />
            <HIGSettingsRow
              label="Source Hash"
              value={doc.sourceHash ? `${doc.sourceHash.slice(0, 8)}...` : 'N/A'}
              isMono
            />
            <HIGSettingsRow label="Last Verified" value={doc.lastVerifiedAt || 'Never'} />
            <HIGSettingsRow label="Thread Depth" value={`${threadCount} Messages`} />
          </HIGSettingsGroup>
        </Box>
      </Surface>

      {summary ? (
        <Surface variant="glass-highlight" className={`${styles.sectionCard} ${styles.section}`}>
          <Button
            unstyled
            type="button"
            onClick={() => setExpandedSummary(!expandedSummary)}
            className={styles.sectionToggle}
          >
            <h3 className={styles.sectionToggleHeading}>
              <Icon name="Sparkles" size="sm" className={styles.iconAccent} />
              Key Insights &amp; Summary
            </h3>
            <Icon
              name="ChevronDown"
              size="sm"
              className={`${styles.chevronIcon} ${expandedSummary ? styles.chevronRotated : ''}`}
            />
          </Button>
          {expandedSummary && (
            <Box className={styles.summaryContent}>
              {summary.bullets && summary.bullets.length > 0 ? (
                <ul className={styles.insightList}>
                  {summary.bullets.map((bullet, index) => (
                    <li key={`summary-${index}`} className={styles.insightItem}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : (
                <LqText variant="xs" color="muted" className={styles.emptyText}>
                  No summary insights available for this document.
                </LqText>
              )}
              <Box className={styles.sourceMeta}>
                <Box className={styles.sourceDot} />
                {summary.sourceLabel}
              </Box>
            </Box>
          )}
        </Surface>
      ) : (
        <Surface variant="glass-highlight" className={`${styles.sectionCard} ${styles.section}`}>
          <h3 className={styles.sectionToggleHeading} style={{ pointerEvents: 'none' }}>
            <Icon name="Sparkles" size="sm" className={styles.iconAccent} />
            Key Insights &amp; Summary
          </h3>
          <Box className={styles.summaryContent}>
            <Box className={styles.summaryPending}>
              <Box className={styles.pendingPulse} />
              <LqText variant="xs" color="muted">
                AI enrichment pending — summaries will appear after the pipeline completes this
                document.
              </LqText>
            </Box>
          </Box>
        </Surface>
      )}

      <Surface
        variant="glass-highlight"
        data-rail-section="entities"
        className={`${styles.sectionCard} ${styles.section} ${activeRailSection === 'entities' ? styles.sectionActive : ''}`}
      >
        <Button
          unstyled
          type="button"
          onClick={() => setExpandedEntities((prev) => !prev)}
          className={styles.entitiesToggle}
        >
          <h3 className={styles.entitiesHeading}>Live Entities ({entities.length})</h3>
          <Icon
            name="ChevronDown"
            size="sm"
            className={`${styles.chevronIcon} ${expandedEntities ? styles.chevronRotated : ''}`}
          />
        </Button>
        {expandedEntities && (
          <Box className={styles.entitiesList}>
            {entities.length === 0 && (
              <LqText variant="small" color="muted" className={styles.emptyEntities}>
                No entities flagged in this record.
              </LqText>
            )}
            {entities.map((entity, index) => (
              <HIGStackRow
                key={`${entity.id || entity.name}-${index}`}
                icon="User"
                title={entity.name}
                subtitle={entity.entityType || 'Entity'}
                onClick={() => setSelectedEntity(entity)}
                isActive={selectedEntity?.name === entity.name}
              />
            ))}
          </Box>
        )}

        {selectedEntity && (
          <Box className={styles.selectedEntityCard}>
            <Box className={styles.selectedEntityHeader}>
              <LqText variant="xs" className={styles.selectedEntityLabel}>
                Active Focus
              </LqText>
              <Button
                unstyled
                onClick={() => setSelectedEntity(null)}
                className={styles.clearButton}
                aria-label="Clear active focus"
              >
                <Icon name="X" size="sm" />
              </Button>
            </Box>
            <LqText variant="body" weight="semibold" className={styles.selectedEntityName}>
              {selectedEntity.name}
            </LqText>
            {Number.isFinite(Number(selectedEntity.id)) && (
              <Button
                unstyled
                className={styles.deepLinkButton}
                onClick={() => onOpenDossier(String(selectedEntity.id))}
              >
                Deep Link
              </Button>
            )}
          </Box>
        )}
      </Surface>

      {relatedDocs && relatedDocs.length > 0 && (
        <Surface variant="glass-highlight" className={`${styles.sectionCard} ${styles.section}`}>
          <Button
            unstyled
            type="button"
            onClick={() => setExpandedRelated(!expandedRelated)}
            className={styles.sectionToggle}
          >
            <h3 className={styles.sectionToggleHeading}>
              <Icon name="Link2" size="sm" className={styles.iconMuted} />
              Related Documents ({relatedDocs.length})
            </h3>
            <Icon
              name="ChevronDown"
              size="sm"
              className={`${styles.chevronIcon} ${expandedRelated ? styles.chevronRotated : ''}`}
            />
          </Button>
          {expandedRelated && (
            <Box className={styles.relatedList}>
              {relatedDocs.map((relatedDoc, index) => (
                <HIGStackRow
                  key={`${relatedDoc.id}-${index}`}
                  icon="FileText"
                  title={relatedDoc.title || relatedDoc.fileName}
                  subtitle={relatedDoc.evidenceType || 'Document'}
                  onClick={() => onNavigateToDoc?.(String(relatedDoc.id))}
                />
              ))}
            </Box>
          )}
        </Surface>
      )}

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
          <Icon name="Calendar" size="sm" className={styles.iconMuted} />
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
