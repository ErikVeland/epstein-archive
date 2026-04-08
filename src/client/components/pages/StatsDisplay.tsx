import Icon from '../common/Icon';
import type { IconName } from '../common/Icon';
import { useCountUp } from '../../hooks/useCountUp';
import { riskToneFromRating } from '../../utils/riskSemantics';
import s from './StatsDisplay.module.css';

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
    <div className={s.grid}>
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
        className={`surface-glass ${s.btn} ${s.btnHoverAccentBorder}`}
        title="Reset all filters"
      >
        <div className={s.statHeader}>
          <span className={s.statLabel}>Documents</span>
          <span className={`chip ${s.chipIcon} ${s.chipFile}`}>
            <Icon name="FileText" size="xs" />
          </span>
        </div>
        <div className={`data-emphasis ${s.statValue}`}>{documentsCount.toLocaleString()}</div>
        <div className={s.statFooter}>{stats.totalPeople.toLocaleString()} Subjects</div>
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
      className={`surface-glass ${s.btn} ${active ? s.btnActive : ''}`}
      title={`Filter by ${label}`}
    >
      <div className={s.statHeader}>
        <span className={s.statLabel}>{label}</span>
        <span className={`chip ${s.chipIcon} ${tone.className}`}>
          <Icon name={icon} size="xs" />
        </span>
      </div>
      <div className={`data-emphasis ${s.statValue}`}>{value.toLocaleString()}</div>
      <div className={s.statFooter}>{label === 'High Risk' ? 'Priority One' : 'Monitor'}</div>
    </button>
  );
}

function MetricStat({ label, icon, value }: { label: string; icon: IconName; value: number }) {
  return (
    <div className={`surface-glass ${s.btn}`}>
      <div className={s.statHeader}>
        <span className={s.statLabel}>{label}</span>
        <span className={`chip ${s.chipIcon} ${s.chipInfo}`}>
          <Icon name={icon} size="xs" />
        </span>
      </div>
      <div className={`data-emphasis ${s.statValue}`}>{value.toLocaleString()}</div>
    </div>
  );
}
