import React from 'react';
import { EvidenceLadderLevel } from '../../../utils/forensics';
import Icon from '../../common/Icon';
import type { IconName } from '../../common/Icon';
import { riskToneFromRating } from '../../../utils/riskSemantics';
import styles from './EvidenceBadge.module.css';

interface EvidenceBadgeProps {
  level: EvidenceLadderLevel;
  ratingObjective?: number;
  ratingSubjective?: number;
}

const FlagStack = ({ count, riskClassName }: { count: number; riskClassName: string }) => {
  const n = Math.max(0, Math.min(5, count || 0));
  return (
    <div className={styles.flagContainer}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className={`${styles.flagIcon} ${riskClassName}`}>
          <Icon name="Flag" className={styles.flagSvg} />
        </span>
      ))}
    </div>
  );
};

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  level,
  ratingObjective,
  ratingSubjective,
}) => {
  const objective = Number(ratingObjective || 0);
  const subjective = Number(ratingSubjective || 0);
  const hasObjective = objective > 0;
  const hasSubjective = subjective > 0;
  const collapseDuplicateStacks = hasObjective && hasSubjective && objective === subjective;

  if (hasObjective || hasSubjective) {
    return (
      <div className={styles.ratingBadge}>
        {hasObjective ? (
          <div
            className={styles.ratingSection}
            title={collapseDuplicateStacks ? 'Risk Rating' : 'Objective Risk Rating'}
          >
            <FlagStack count={objective} riskClassName={riskToneFromRating(objective).className} />
          </div>
        ) : null}
        {!collapseDuplicateStacks && hasSubjective ? (
          <div className={styles.ratingSection} title="Subjective Risk Rating">
            <FlagStack
              count={subjective}
              riskClassName={riskToneFromRating(subjective).className}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const ladderConfig = {
    L1: { color: 'evidence-direct', icon: 'AlertCircle', label: 'Direct Evidence' },
    L2: { color: 'evidence-inferred', icon: 'AlertTriangle', label: 'Inferred Evidence' },
    L3: { color: 'evidence-agentic', icon: 'HelpCircle', label: 'Agentic Evidence' },
    NONE: { color: 'text-muted', icon: 'ArrowDown', label: 'No Signal' },
  } as const satisfies Record<
    EvidenceLadderLevel,
    { color: string; icon: IconName; label: string }
  >;
  const cfg = ladderConfig[level] || ladderConfig.NONE;

  return (
    <div className={`semantic-chip ${cfg.color}`} title={`Evidence Level: ${cfg.label}`}>
      <Icon name={cfg.icon} className={styles.flagSvg} />
      <span className={styles.levelLabel}>{cfg.label}</span>
    </div>
  );
};
