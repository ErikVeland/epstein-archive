import React from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { InvestigationTextRenderer } from '../InvestigationTextRenderer';
import { DocumentDiffView } from '../DocumentDiffView';
import { DocumentAnnotationSystem } from '../DocumentAnnotationSystem';
import { formatDate } from '../DocumentModalUtils';
import styles from './DocumentAnalysisTab.module.css';

import { Surface } from '../../../design-system/components/surfaces/Surface';
import { Box } from '../../../design-system/components/layout/Box';
import { Flex } from '../../../design-system/components/layout/Flex';
import { LqText } from '../../../design-system/components/typography/Text';

type TextSubview = 'clean' | 'ocr' | 'diff';

interface DocEntity {
  id?: string | number;
  name?: string;
  fullName?: string;
  entityType?: string;
  type?: string;
  role?: string;
  primaryRole?: string;
  mentions?: number;
  entities?: DocEntity[];
  mentionedEntities?: DocEntity[];
  metadata?: Record<string, unknown>;
  unredaction_metrics?: Record<string, unknown>;
  content?: string;
  contentRefined?: string;
  [key: string]: unknown;
}

interface RelatedDoc {
  id: string | number;
  title?: string;
  fileName?: string;
  evidenceType?: string;
  dateCreated?: string;
}

interface DocumentAnalysisTabProps {
  doc: DocEntity;
  id: string;
  textSubview: TextSubview;
  setTextSubview: (mode: TextSubview) => void;
  localSearchTerm: string;
  summary: { bullets: string[]; sourceLabel: string };
  showRecoveryHighlights: boolean;
  setShowRecoveryHighlights: (value: boolean) => void;
  isReadingMode: boolean;
  setIsReadingMode: (value: boolean) => void;
  setSelectedEntity: (value: DocEntity | null) => void;
  setEntityModalId: (value: string) => void;
  entities: DocEntity[];
  groupedEntities: Array<[string, DocEntity[]]>;
  relatedDocs: RelatedDoc[];
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
  const hasAnyText = cleanText.trim() || ocrText.trim();

  return (
    <Box className={styles.root}>
      {textSubview === 'clean' && (
        <Surface variant="glass-highlight" className={styles.insightsCard}>
          <Flex align="center" gap="sm" className={styles.insightsTitle}>
            <Sparkles className={styles.sparklesIcon} />
            <LqText variant="h3" weight="semibold">
              Key Insights
            </LqText>
          </Flex>
          {summary.bullets.length > 0 ? (
            <ul className={styles.insightList}>
              {summary.bullets.slice(0, 5).map((bullet, index) => (
                <li key={`summary-${index}`}>{bullet}</li>
              ))}
            </ul>
          ) : (
            <LqText variant="body" color="muted" className={styles.mutedItalic}>
              No summary insights available for this document.
            </LqText>
          )}
          <Box className={styles.sourceMeta}>
            <Box className={styles.sourceDot} />
            {summary.sourceLabel}
          </Box>
        </Surface>
      )}

      {hasAnyText && (
        <Flex gap="sm" className={styles.textModeTabs}>
          {(['clean', 'ocr', 'diff'] as TextSubview[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTextSubview(mode)}
              className={`${styles.modeButton} ${textSubview === mode ? styles.modeButtonActive : ''}`}
            >
              {mode === 'clean' ? 'Clean Text' : mode === 'ocr' ? 'Raw OCR' : 'Diff View'}
            </button>
          ))}
        </Flex>
      )}

      {!hasAnyText ? (
        <Box className={styles.emptyStateWrap}>
          <Surface variant="glass-highlight" className={styles.emptyState}>
            <FileText className={styles.emptyIcon} />
            <LqText color="muted" className={styles.emptyText}>
              Text extraction is pending for this record. Open the Original Document tab for the
              source asset.
            </LqText>
          </Surface>
        </Box>
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
        <Box className={styles.cleanSection}>
          <Surface variant="glass-highlight" className={styles.surfacePad}>
            <LqText variant="h3" weight="bold" className={styles.sectionTitle}>
              Annotations
            </LqText>
            <DocumentAnnotationSystem
              documentId={String(doc.id || id)}
              content={cleanText || ocrText}
              searchTerm={localSearchTerm}
              mode="inline"
            />
          </Surface>

          <Box className={styles.sectionStack}>
            <Flex align="center" justify="between" className={styles.sectionHeader}>
              <LqText variant="h3" weight="semibold" className={styles.headingLg}>
                Extracted Entities
              </LqText>
              <LqText variant="xs" weight="bold" className={styles.metaCaps}>
                {entities.length} TOTAL
              </LqText>
            </Flex>
            {entities.length === 0 ? (
              <Surface variant="glass-highlight" className={styles.centeredState}>
                <LqText color="muted" className={styles.mutedItalic}>
                  No extracted entities available in this record.
                </LqText>
              </Surface>
            ) : (
              <Box className={styles.entityGroups}>
                {groupedEntities.map(([groupName, groupItems]) => (
                  <Box as="section" key={groupName} className={styles.entityGroup}>
                    <Flex align="center" gap="sm" className={styles.groupTitle}>
                      <LqText variant="h4" weight="semibold">
                        {groupName}
                      </LqText>
                      <Box className={styles.groupRule} />
                      <LqText variant="xs" weight="bold" className={styles.groupCount}>
                        {groupItems.length}
                      </LqText>
                    </Flex>
                    <Box className={styles.entityGrid}>
                      {groupItems.map((entity, index) => (
                        <Surface
                          key={`${entity.id || entity.name}-${index}`}
                          variant="glass-highlight"
                          className={styles.entityCard}
                        >
                          <Box className={styles.entityCardTop}>
                            <Flex direction="column" className={styles.entityCardBody}>
                              <button
                                type="button"
                                className={styles.entityButton}
                                onClick={() => setSelectedEntity(entity)}
                              >
                                {entity.name}
                              </button>
                              <LqText variant="xs" className={styles.entityRole}>
                                {entity.primaryRole || entity.role || entity.entityType || 'ENTITY'}
                              </LqText>
                            </Flex>
                          </Box>
                          {(entity.mentions ?? 0) > 0 && (
                            <Flex align="center" justify="between" className={styles.entityFooter}>
                              <LqText variant="xs" className={styles.entityMentions}>
                                {entity.mentions} Mentions
                              </LqText>
                              <button
                                onClick={() => setEntityModalId(String(entity.id))}
                                className={styles.entityAction}
                              >
                                View Dossier
                              </button>
                            </Flex>
                          )}
                        </Surface>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Box className={styles.sectionStack}>
            <Flex align="center" justify="between" className={styles.sectionHeader}>
              <LqText variant="h3" weight="semibold" className={styles.headingLg}>
                Related Documents
              </LqText>
              <LqText variant="xs" weight="bold" className={styles.metaCaps}>
                SHARED ENTITY LINKS
              </LqText>
            </Flex>
            {isLoadingRelated ? (
              <Box className={styles.spinnerWrap}>
                <Box className={styles.spinner} />
                <LqText variant="small" color="muted" className={styles.mutedItalic}>
                  Analyzing cross-references...
                </LqText>
              </Box>
            ) : relatedDocs.length === 0 ? (
              <Surface variant="glass-highlight" className={styles.centeredState}>
                <LqText color="muted" className={styles.mutedItalic}>
                  No related documents identified through shared entities.
                </LqText>
              </Surface>
            ) : (
              <Box className={styles.relatedList}>
                {relatedDocs.map((relatedDoc) => (
                  <Surface
                    as="button"
                    key={relatedDoc.id}
                    variant="glass-highlight"
                    className={styles.relatedButton}
                    onClick={() => onNavigateToDoc(String(relatedDoc.id))}
                  >
                    <Box className={styles.relatedButtonRow}>
                      <Flex direction="column" className={styles.entityCardBody}>
                        <LqText weight="medium" className={styles.relatedTitle}>
                          {relatedDoc.title || relatedDoc.fileName}
                        </LqText>
                        <Flex align="center" gap="sm" className={styles.relatedMeta}>
                          <LqText variant="xs" className={styles.relatedType}>
                            {relatedDoc.evidenceType}
                          </LqText>
                          <Box className={styles.relatedDot} />
                          <LqText variant="xs" className={styles.relatedDate}>
                            {formatDate(relatedDoc.dateCreated)}
                          </LqText>
                        </Flex>
                      </Flex>
                    </Box>
                  </Surface>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DocumentAnalysisTab;
