import React from 'react';
import { Flex } from '@client/design-system/lib';
import { Button } from '@client/design-system/lib';
import Icon from '@client/components/common/Icon';
import { type EntityConnection } from '@client/types/api';
import styles from './ConnectionCard.module.css';

interface ConnectionCardProps {
  connection: EntityConnection;
  maxScore: number;
  onOpenProfile: (entityId: string) => void;
  onViewPath: (entityId: string) => void;
}

const SIGNAL_ICONS = {
  documents: 'FileText',
  financial: 'DollarSign',
  flights: 'Plane',
  communications: 'Mail',
} as const;

type SignalKey = keyof typeof SIGNAL_ICONS;

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  maxScore,
  onOpenProfile,
  onViewPath,
}) => {
  const scoreBarWidth = Math.min((connection.totalScore / Math.max(maxScore, 1)) * 100, 100);
  const showRiskIcon = connection.riskRating >= 4;

  const relationshipSignal = connection.signals.relationship;
  const showRelationship = relationshipSignal.score > 0 && relationshipSignal.type !== null;

  const handleViewPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewPath(connection.entityId);
  };

  const handleOpenProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenProfile(connection.entityId);
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenProfile(connection.entityId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenProfile(connection.entityId);
    }
  };

  return (
    <article className={styles.card}>
      {/* Header: name + score */}
      <Flex align="center" justify="between" className={styles.headerRow}>
        <Flex align="center" gap="sm" className={styles.nameRow}>
          {showRiskIcon && (
            <Icon
              name="ShieldAlert"
              size="xs"
              color="danger"
              ariaLabel="High risk"
              className={styles.riskIcon}
            />
          )}
          <button
            type="button"
            className={styles.entityName}
            onClick={handleNameClick}
            onKeyDown={handleKeyDown}
            title={`Open profile for ${connection.entityName}`}
          >
            {connection.entityName}
          </button>
        </Flex>
        <span className={styles.totalScore}>{connection.totalScore}</span>
      </Flex>

      {/* Score bar */}
      <div className={styles.scoreBar} aria-hidden="true">
        <div className={styles.scoreBarFill} style={{ width: `${scoreBarWidth}%` }} />
      </div>

      {/* Signal pills */}
      <Flex wrap="wrap" gap="sm" className={styles.pillsRow}>
        {(Object.entries(SIGNAL_ICONS) as [SignalKey, string][]).map(([key, iconName]) => {
          const sig = connection.signals[key];
          if (sig.count === 0) return null;
          return (
            <span key={key} className={`${styles.signalPill} ${styles[`pill_${key}`]}`}>
              <Icon name={iconName} size="xs" color="inherit" ariaHidden />
              <span>{sig.count}</span>
            </span>
          );
        })}

        {showRelationship && (
          <span className={`${styles.signalPill} ${styles.signalPillRel}`}>
            <Icon name="Link2" size="xs" color="inherit" ariaHidden />
            <span className={styles.pillRelType}>
              {(relationshipSignal.type ?? '').replace(/_/g, ' ')}
            </span>
            {relationshipSignal.confidence !== null && (
              <span className={styles.pillConfidence}>
                {Math.round(relationshipSignal.confidence * 100)}%
              </span>
            )}
          </span>
        )}
      </Flex>

      {/* Action buttons */}
      <Flex align="center" gap="sm" className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={handleViewPath} className={styles.actionBtn}>
          <Icon name="Network" size="xs" color="inherit" ariaHidden />
          View path
        </Button>
        <Button variant="glass" size="sm" onClick={handleOpenProfile} className={styles.actionBtn}>
          <Icon name="ArrowRight" size="xs" color="inherit" ariaHidden />
          Open profile
        </Button>
      </Flex>
    </article>
  );
};

export default ConnectionCard;
