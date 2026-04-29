import Icon from '../common/Icon';
import type { IconName } from '../common/Icon';
import { useCountUp } from '@client/hooks/useCountUp';
import { riskToneFromRating } from '@client/utils/riskSemantics';
import { Surface, Stack, Text as LqText, cn } from '@client/design-system/lib';
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
      <Surface
        onClick={onResetFilters}
        variant="glass"
        className={cn(s.card, s.interactive, s.btnHoverAccentBorder)}
        title="Reset all filters"
      >
        <Stack gap="sm">
          <div className={s.statHeader}>
            <LqText variant="xs" color="muted" weight="bold" className={s.statLabel}>
              Documents
            </LqText>
            <span className={cn('chip', s.chipIcon, s.chipFile)}>
              <Icon name="FileText" />
            </span>
          </div>
          <LqText variant="h2" weight="bold" className={s.statValue}>
            {documentsCount.toLocaleString()}
          </LqText>
          <LqText variant="xs" color="muted" className={s.statFooter}>
            {stats.totalPeople.toLocaleString()} Subjects
          </LqText>
        </Stack>
      </Surface>
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
    <Surface
      onClick={onClick}
      variant={active ? 'glass-highlight' : 'glass'}
      className={cn(s.card, s.interactive, active && s.cardActive)}
      title={`Filter by ${label}`}
    >
      <Stack gap="sm">
        <div className={s.statHeader}>
          <LqText variant="xs" color="muted" weight="bold" className={s.statLabel}>
            {label}
          </LqText>
          <span className={cn('chip', s.chipIcon, tone.className)}>
            <Icon name={icon} />
          </span>
        </div>
        <LqText variant="h2" weight="bold" className={s.statValue}>
          {value.toLocaleString()}
        </LqText>
        <LqText variant="xs" color="muted" className={s.statFooter}>
          {label === 'High Risk' ? 'Priority One' : 'Monitor'}
        </LqText>
      </Stack>
    </Surface>
  );
}

function MetricStat({ label, icon, value }: { label: string; icon: IconName; value: number }) {
  return (
    <Surface className={s.card} variant="glass">
      <Stack gap="sm">
        <div className={s.statHeader}>
          <LqText variant="xs" color="muted" weight="bold" className={s.statLabel}>
            {label}
          </LqText>
          <span className={cn('chip', s.chipIcon, s.chipInfo)}>
            <Icon name={icon} />
          </span>
        </div>
        <LqText variant="h2" weight="bold" className={s.statValue}>
          {value.toLocaleString()}
        </LqText>
      </Stack>
    </Surface>
  );
}
