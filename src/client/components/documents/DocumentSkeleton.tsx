import React from 'react';
import styles from './DocumentSkeleton.module.css';

interface DocumentSkeletonProps {
  count?: number;
}

const DocumentSkeleton: React.FC<DocumentSkeletonProps> = ({ count = 12 }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={styles.card} aria-label="Loading document preview">
          {/* Shimmer effect */}
          <div className={styles.shimmer}></div>

          {/* Document header */}
          <div className={styles.docHeader}>
            <div className={styles.docHeaderLeft}>
              <div className={styles.iconPlaceholder}></div>
              <div>
                <div className={styles.titlePlaceholder}></div>
                <div className={styles.subtitlePlaceholder}></div>
              </div>
            </div>
            <div className={styles.badgePlaceholder}></div>
          </div>

          {/* Document preview */}
          <div className={styles.previewStack}>
            <div className={`${styles.previewLine} ${styles.previewLineFull}`}></div>
            <div className={`${styles.previewLine} ${styles.previewLineMostly}`}></div>
            <div className={`${styles.previewLine} ${styles.previewLineTwoThird}`}></div>
          </div>

          {/* Document metadata */}
          <div className={styles.metaFooter}>
            <div className={styles.metaFooterLeft}>
              <div className={styles.metaChipSm}></div>
              <div className={styles.metaChipXs}></div>
            </div>
            <div className={styles.metaChipMd}></div>
          </div>
        </div>
      ))}
    </>
  );
};

export default DocumentSkeleton;
