import Icon from '../common/Icon';
import type { IconName } from '../common/Icon';
import { useCountUp } from '../../hooks/useCountUp';
import { riskToneFromRating } from '../../utils/riskSemantics';

interface StatsDisplayProps {
  stats: {
    totalPeople: number;
    totalFiles: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    totalMentions: number;
  };
  selectedRiskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  onRiskLevelClick?: (level: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  onResetFilters?: () => void;
}

export function StatsDisplay({
  stats,
  selectedRiskLevel,
  onRiskLevelClick,
  onResetFilters,
}: StatsDisplayProps) {
  const highRiskCount = useCountUp(stats.highRisk, 1400);
  const mediumRiskCount = useCountUp(stats.mediumRisk, 1600);
  const mentionsCount = useCountUp(stats.totalMentions, 1800);
  const documentsCount = useCountUp(stats.totalFiles, 1900);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-4">
      <RiskStat
        label="High Risk"
        icon="AlertTriangle"
        rating={4}
        value={highRiskCount}
        active={selectedRiskLevel === 'HIGH'}
        onClick={() => onRiskLevelClick?.('HIGH')}
      />
      <RiskStat
        label="Medium Risk"
        icon="ShieldAlert"
        rating={3}
        value={mediumRiskCount}
        active={selectedRiskLevel === 'MEDIUM'}
        onClick={() => onRiskLevelClick?.('MEDIUM')}
      />
      <MetricStat label="Mentions" icon="MessageSquare" value={mentionsCount} />
      <button
        onClick={onResetFilters}
        className="surface-glass p-3 text-left hover:border-[var(--accent)]/40 transition-colors"
        title="Reset all filters"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--text-muted)]">
            Documents
          </span>
          <span className="chip h-6 px-2 flex items-center text-[var(--chip-accent)] border-[var(--chip-accent-border)]">
            <Icon name="FileText" size="xs" />
          </span>
        </div>
        <div className="data-emphasis text-[var(--text-primary)] tabular-nums">
          {documentsCount.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-[var(--text-muted)] uppercase tracking-[0.1em]">
          {stats.totalPeople.toLocaleString()} Subjects
        </div>
      </button>
    </div>
  );
}

function RiskStat({
  label,
  icon,
  rating,
  value,
  active,
  onClick,
}: {
  label: string;
  icon: IconName;
  rating: number;
  value: number;
  active?: boolean;
  onClick: () => void;
}) {
  const tone = riskToneFromRating(rating);

  return (
    <button
      onClick={onClick}
      className={`surface-glass p-3 text-left transition-colors ${active ? 'ring-2 ring-[var(--accent)]/45' : ''}`}
      title={`Filter by ${label}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--text-muted)]">
          {label}
        </span>
        <span className={`chip h-6 px-2 flex items-center ${tone.className}`}>
          <Icon name={icon} size="xs" />
        </span>
      </div>
      <div className="data-emphasis text-[var(--text-primary)] tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)] uppercase tracking-[0.1em]">
        {label === 'High Risk' ? 'Priority One' : 'Monitor'}
      </div>
    </button>
  );
}

function MetricStat({ label, icon, value }: { label: string; icon: IconName; value: number }) {
  return (
    <div className="surface-glass p-3 text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--text-muted)]">
          {label}
        </span>
        <span className="chip h-6 px-2 flex items-center text-[var(--accent)] border-[var(--accent)]/25">
          <Icon name={icon} size="xs" />
        </span>
      </div>
      <div className="data-emphasis text-[var(--text-primary)] tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
