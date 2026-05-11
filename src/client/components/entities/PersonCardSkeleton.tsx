import React from 'react';
import styles from './PersonCardSkeleton.module.css';

const PersonCardSkeleton: React.FC = () => {
  return (
    <div className={styles.card} data-testid="subject-card">
      {/* Shimmer effect */}
      <div className={styles.shimmer} />

      {/* Mention intensity bar */}
      <div className={styles.mentionBar} />

      <div className={styles.header}>
        <div className={styles.identityRow}>
          {/* Icon placeholder */}
          <div className={styles.iconPlaceholder} />
          <div className={styles.nameBlock}>
            {/* Name placeholder */}
            <div className={styles.nameLine} />
            {/* Role placeholder */}
            <div className={styles.roleLine} />
          </div>
        </div>
        <div className={styles.scoreBlock}>
          {/* Likelihood score placeholder */}
          <div className={styles.scoreLine} />
          {/* Mentions placeholder */}
          <div className={styles.mentionsLine} />
        </div>
      </div>

      <div className={styles.bodyStack}>
        {/* Status placeholder */}
        <div className={styles.statusPlaceholder} />

        {/* Key Evidence placeholder */}
        <div className={styles.evidencePlaceholder}>
          <div className={styles.evidenceLines}>
            <div className={`${styles.evidenceLine} ${styles.evidenceLineFull}`} />
            <div className={`${styles.evidenceLine} ${styles.evidenceLineMost}`} />
            <div className={`${styles.evidenceLine} ${styles.evidenceLineHalf}`} />
          </div>
        </div>
      </div>

      {/* Footer placeholder */}
      <div className={styles.footer}>
        <div className={styles.footerLineShort} />
        <div className={styles.footerLineLong} />
      </div>
    </div>
  );
};

export default PersonCardSkeleton;
