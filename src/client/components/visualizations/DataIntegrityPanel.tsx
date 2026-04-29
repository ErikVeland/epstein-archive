import React from 'react';
import Icon from '@client/components/common/Icon';
import { Button } from '@client/design-system/lib';
import styles from './DataIntegrityPanel.module.css';

interface DataIntegrityStats {
  entitiesWithDocuments: number;
  totalEntities: number;
  documentsWithMetadata: number;
  totalDocuments: number;
  lastRefresh: string;
}

interface DataIntegrityPanelProps {
  stats: DataIntegrityStats;
}

export const DataIntegrityPanel: React.FC<DataIntegrityPanelProps> = ({ stats }) => {
  const entityLinkPercentage =
    stats.totalEntities > 0
      ? Math.round((stats.entitiesWithDocuments / stats.totalEntities) * 100)
      : 0;

  const documentMetadataPercentage =
    stats.totalDocuments > 0
      ? Math.round((stats.documentsWithMetadata / stats.totalDocuments) * 100)
      : 0;

  const getProgressClassName = (percentage: number) => {
    if (percentage >= 95) return `${styles.progressFill} ${styles.progressFillHigh}`;
    if (percentage >= 80) return `${styles.progressFill} ${styles.progressFillMedium}`;
    return `${styles.progressFill} ${styles.progressFillLow}`;
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Icon name="Database" className={styles.titleIcon} />
          Data Integrity
        </h3>
        <span className={styles.lastRefresh}>
          <Icon name="Clock" className={styles.refreshIcon} />
          {stats.lastRefresh}
        </span>
      </div>

      {/* Progress Bars */}
      <div className={styles.metrics}>
        {/* Entities with document links */}
        <div>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Entities with document links</span>
            <span className={styles.metricValue}>{entityLinkPercentage}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={getProgressClassName(entityLinkPercentage)}
              style={{ width: `${entityLinkPercentage}%` }}
            />
          </div>
          <div className={styles.metricFootnote}>
            {(stats.entitiesWithDocuments ?? 0).toLocaleString()} of{' '}
            {(stats.totalEntities ?? 0).toLocaleString()} entities linked
          </div>
        </div>

        {/* Documents with complete metadata */}
        <div>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Documents with complete metadata</span>
            <span className={styles.metricValue}>{documentMetadataPercentage}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={getProgressClassName(documentMetadataPercentage)}
              style={{ width: `${documentMetadataPercentage}%` }}
            />
          </div>
          <div className={styles.metricFootnote}>
            {(stats.documentsWithMetadata ?? 0).toLocaleString()} of{' '}
            {(stats.totalDocuments ?? 0).toLocaleString()} documents complete
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <Button variant="ghost" size="sm" className={styles.methodologyButton}>
          Methodology & Sources
          <Icon name="AlertTriangle" className={styles.methodologyIcon} />
        </Button>
      </div>
    </div>
  );
};
