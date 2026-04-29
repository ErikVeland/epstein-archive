import React from 'react';
import Icon, { IconName } from '@client/components/common/Icon';
import styles from './EvidenceLadder.module.css';

export interface EvidenceLadderProps {
  level: 1 | 2 | 3; // 1: Primary, 2: Derived, 3: Agentic
  confidence: number;
  ingestRunId?: string;
  evidencePack?: Record<string, unknown>;
  wasAgentic?: boolean;
  className?: string;
}

type LevelVariant = 'primary' | 'derived' | 'agentic';

const LEVEL_CONFIG: Record<
  number,
  {
    variant: LevelVariant;
    name: string;
    description: string;
    icon: IconName;
  }
> = {
  1: {
    variant: 'primary',
    name: 'Primary Source',
    description: 'Direct mention in original evidentiary document.',
    icon: 'Search',
  },
  2: {
    variant: 'derived',
    name: 'Derived Link',
    description: 'Established via proximity or co-occurrence analysis.',
    icon: 'Shield',
  },
  3: {
    variant: 'agentic',
    name: 'Agentic Inference',
    description: 'Derived using LLM-assisted context reconciliation.',
    icon: 'Activity', // Brain is not in our Icon component, using Activity as fallback
  },
};

export const EvidenceLadder: React.FC<EvidenceLadderProps> = ({
  level,
  confidence,
  ingestRunId,
  evidencePack,
  wasAgentic,
  className = '',
}) => {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];
  const { variant, name, description, icon: iconName } = config;

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Active Level Badge */}
      <div className={`${styles.activeBadge} ${styles[`activeBadge--${variant}`]}`}>
        <div className={`${styles.iconBox} ${styles[`iconBox--${variant}`]}`}>
          <Icon name={iconName} size="md" className={styles[`iconColor--${variant}`]} />
        </div>
        <div className={styles.badgeContent}>
          <div className={styles.badgeHeader}>
            <h4 className={`${styles.levelName} ${styles[`levelName--${variant}`]}`}>{name}</h4>
            <div className={styles.confidencePill}>
              <span className={styles.confidenceLabel}>Confidence</span>
              <span
                className={
                  confidence * 100 > 80
                    ? styles['confidenceValue--high']
                    : styles['confidenceValue--low']
                }
              >
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className={styles.levelDescription}>{description}</p>
        </div>
      </div>

      {/* Forensic Provenance */}
      {(ingestRunId || wasAgentic) && (
        <div className={styles.provenanceGrid}>
          {ingestRunId && (
            <div className={styles.provenanceItem}>
              <Icon name="Database" size="sm" className={styles.provenanceIcon} />
              <div className={styles.provenanceBody}>
                <span className={styles.provenanceTitle}>Ingest Run</span>
                <span className={styles.provenanceValue}>{ingestRunId}</span>
              </div>
            </div>
          )}
          {wasAgentic && (
            <div className={styles.provenanceItemAgentic}>
              <Icon name="Fingerprint" size="sm" className={styles.provenanceIconAgentic} />
              <div className={styles.provenanceBodyFull}>
                <span className={styles.provenanceTitleAgentic}>Agentic Stamp</span>
                <span className={styles.provenanceValueAgentic}>LLM-Processed</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence Pack Details (Optional) */}
      {evidencePack && (
        <div className={styles.evidencePack}>
          <div className={styles.evidencePackHeader}>
            <Icon name="ChevronRight" size="xs" />
            Structural Context
          </div>
          <div className={styles.evidencePackTags}>
            {Number(evidencePack.proximity || 0) > 0 && (
              <span className={styles.evidencePackTag}>
                PROX: {Number(evidencePack.proximity || 0)} chars
              </span>
            )}
            {Number(evidencePack.document_count || 0) > 0 && (
              <span className={styles.evidencePackTag}>
                DOCS: {Number(evidencePack.document_count || 0)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
