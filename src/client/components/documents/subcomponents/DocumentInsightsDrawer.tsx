import React from 'react';
import Icon from '@client/components/common/Icon';
import { formatDate } from '../DocumentModalUtils';
import styles from './DocumentInsightsDrawer.module.css';

import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';
import { Flex } from '@client/design-system/components/layout/Flex';
import { LqText } from '@client/design-system/components/typography/Text';
import { Button } from '@client/design-system/lib';

interface InsightsDrawerEntity {
  id?: string | number;
  name?: string;
  fullName?: string;
  entityType?: string;
  type?: string;
  role?: string;
  primaryRole?: string;
  mentions?: number;
  [key: string]: unknown;
}

interface InsightsDrawerRelatedDoc {
  id: string | number;
  title?: string;
  fileName?: string;
  evidenceType?: string;
  dateCreated?: string;
}

interface DocumentInsightsDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  summary: { bullets: string[]; sourceLabel: string };
  entities: InsightsDrawerEntity[];
  groupedEntities: Array<[string, InsightsDrawerEntity[]]>;
  relatedDocs: InsightsDrawerRelatedDoc[];
  isLoadingRelated: boolean;
  setSelectedEntity: (e: InsightsDrawerEntity | null) => void;
  setEntityModalId: (id: string) => void;
  onNavigateToDoc: (id: string) => void;
}

export const DocumentInsightsDrawer: React.FC<DocumentInsightsDrawerProps> = ({
  isOpen,
  onToggle,
  summary,
  entities,
  groupedEntities,
  relatedDocs,
  isLoadingRelated,
  setSelectedEntity,
  setEntityModalId,
  onNavigateToDoc,
}) => {
  const hasInsights = summary.bullets.length > 0 || entities.length > 0 || relatedDocs.length > 0;

  return (
    <Box className={styles.drawerRoot}>
      {/* Toggle handle */}
      <Button
        unstyled
        onClick={onToggle}
        className={styles.drawerHandle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Collapse insights panel' : 'Expand insights panel'}
      >
        <Flex align="center" gap="sm">
          <Icon name="Sparkles" size="sm" className={styles.handleIcon} />
          <LqText variant="xs" weight="semibold">
            Document Insights
          </LqText>
          {!hasInsights && (
            <LqText variant="xs" color="muted">
              {' '}
              — no insights available
            </LqText>
          )}
        </Flex>
        <Icon name={isOpen ? 'ChevronDown' : 'ChevronUp'} size="sm" className={styles.chevron} />
      </Button>

      {/* Drawer body */}
      {isOpen && (
        <Box className={styles.drawerBody}>
          {/* Key Insights */}
          {summary.bullets.length > 0 && (
            <Surface variant="glass-highlight" className={styles.insightsCard}>
              <Flex align="center" gap="sm" className={styles.sectionTitle}>
                <Icon name="Sparkles" className={styles.sparklesIcon} />
                <LqText variant="h4" weight="semibold">
                  Key Insights
                </LqText>
              </Flex>
              <ul className={styles.insightList}>
                {summary.bullets.slice(0, 5).map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
              <Box className={styles.sourceMeta}>
                <Box className={styles.sourceDot} />
                <LqText variant="xs" color="muted">
                  {summary.sourceLabel}
                </LqText>
              </Box>
            </Surface>
          )}

          {/* Extracted Entities */}
          {entities.length > 0 && (
            <Box className={styles.section}>
              <Flex align="center" justify="between" className={styles.sectionHeader}>
                <LqText variant="h4" weight="semibold">
                  Extracted Entities
                </LqText>
                <LqText variant="xs" color="muted">
                  {entities.length} total
                </LqText>
              </Flex>
              <Box className={styles.entityGroups}>
                {groupedEntities.map(([groupName, groupItems]) => (
                  <Box as="section" key={groupName} className={styles.entityGroup}>
                    <Flex align="center" gap="sm" className={styles.groupTitle}>
                      <LqText variant="xs" weight="bold">
                        {groupName}
                      </LqText>
                      <Box className={styles.groupRule} />
                      <LqText variant="xs" color="muted">
                        {groupItems.length}
                      </LqText>
                    </Flex>
                    <Box className={styles.entityGrid}>
                      {groupItems.map((entity, idx) => (
                        <Surface
                          key={`${String(entity.id ?? entity.name)}-${idx}`}
                          variant="glass-highlight"
                          className={styles.entityCard}
                        >
                          <Button
                            unstyled
                            className={styles.entityBtn}
                            onClick={() => setSelectedEntity(entity)}
                          >
                            {entity.name || entity.fullName}
                          </Button>
                          <LqText variant="xs" className={styles.entityRole}>
                            {entity.primaryRole || entity.role || entity.entityType || 'ENTITY'}
                          </LqText>
                          {(entity.mentions ?? 0) > 0 && (
                            <Flex align="center" justify="between" className={styles.entityFooter}>
                              <LqText variant="xs" color="muted">
                                {entity.mentions} mentions
                              </LqText>
                              <Button
                                unstyled
                                onClick={() => setEntityModalId(String(entity.id))}
                                className={styles.dossierBtn}
                              >
                                Dossier
                              </Button>
                            </Flex>
                          )}
                        </Surface>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Related Documents */}
          <Box className={styles.section}>
            <Flex align="center" justify="between" className={styles.sectionHeader}>
              <LqText variant="h4" weight="semibold">
                Related Documents
              </LqText>
              <LqText variant="xs" color="muted">
                shared entity links
              </LqText>
            </Flex>
            {isLoadingRelated ? (
              <Box className={styles.loadingState}>
                <Box className={styles.spinner} />
                <LqText variant="xs" color="muted">
                  Analysing cross-references…
                </LqText>
              </Box>
            ) : relatedDocs.length === 0 ? (
              <LqText variant="xs" color="muted" className={styles.emptyRelated}>
                No related documents identified through shared entities.
              </LqText>
            ) : (
              <Box className={styles.relatedList}>
                {relatedDocs.slice(0, 10).map((doc) => (
                  <Surface
                    as="button"
                    key={doc.id}
                    variant="glass-highlight"
                    className={styles.relatedBtn}
                    onClick={() => onNavigateToDoc(String(doc.id))}
                  >
                    <LqText weight="medium" className={styles.relatedTitle}>
                      {doc.title || doc.fileName}
                    </LqText>
                    <Flex align="center" gap="sm" className={styles.relatedMeta}>
                      <LqText variant="xs" color="muted">
                        {doc.evidenceType}
                      </LqText>
                      <LqText variant="xs" color="muted">
                        {formatDate(doc.dateCreated)}
                      </LqText>
                    </Flex>
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

export default DocumentInsightsDrawer;
