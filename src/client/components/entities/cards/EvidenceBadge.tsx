import React from 'react';
import { EvidenceLadderLevel } from '../../../utils/forensics';
import Icon from '../../common/Icon';
import { riskToneFromRating } from '../../../utils/riskSemantics';

interface EvidenceBadgeProps {
  level: EvidenceLadderLevel;
  ratingObjective?: number;
  ratingSubjective?: number;
}

const FlagStack = ({ count, colorVar }: { count: number; colorVar: string }) => {
  const n = Math.max(0, Math.min(5, count || 0));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ color: colorVar }} className="inline-flex">
          <Icon name="Flag" size="xs" className="w-3 h-3" />
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
      <div className="flex items-center gap-2 px-2 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-bg)]/40">
        {hasObjective ? (
          <div
            className="flex items-center gap-1"
            title={collapseDuplicateStacks ? 'Risk Rating' : 'Objective Risk Rating'}
          >
            <FlagStack count={objective} colorVar={riskToneFromRating(objective).cssVar} />
          </div>
        ) : null}
        {!collapseDuplicateStacks && hasSubjective ? (
          <div className="flex items-center gap-1" title="Subjective Risk Rating">
            <FlagStack count={subjective} colorVar={riskToneFromRating(subjective).cssVar} />
          </div>
        ) : null}
      </div>
    );
  }

  const ladderConfig = {
    L1: { color: 'evidence-direct', icon: 'AlertOctagon', label: 'Direct Evidence' },
    L2: { color: 'evidence-inferred', icon: 'AlertTriangle', label: 'Inferred Evidence' },
    L3: { color: 'evidence-agentic', icon: 'HelpCircle', label: 'Agentic Evidence' },
    NONE: { color: 'text-[var(--text-muted)]', icon: 'Minus', label: 'No Signal' },
  } as const;
  const cfg = ladderConfig[level] || ladderConfig.NONE;

  return (
    <div className={`semantic-chip ${cfg.color}`} title={`Evidence Level: ${cfg.label}`}>
      <Icon name={cfg.icon as any} size="xs" className="w-3 h-3" />
      <span className="text-[10px] uppercase tracking-wide">{cfg.label}</span>
    </div>
  );
};
