import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubjectCardDTO } from '../../types';
import { formatNumber } from '../../utils/search';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import Icon from '../common/Icon';
import { getEntityTypeIcon } from '../../utils/entityTypeIcons';
import { SignalPanel } from './cards/SignalPanel';
import { EvidenceBadge } from './cards/EvidenceBadge';
import { DriverChips } from './cards/DriverChips';
import { Tooltip, TooltipTrigger, TooltipPortal, TooltipContent } from '../../design-system/lib';
import { riskToneFromRating } from '../../utils/riskSemantics';
import { type EvidenceLadderLevel } from '../../utils/forensics';
import { Flex } from '../../design-system/components/layout/Flex';
import { Stack } from '../../design-system/components/layout/Stack';
import { Grid } from '../../design-system/components/layout/Grid';
import { Button } from '../../design-system/lib';
import styles from './SubjectCardV2.module.css';

interface SubjectCardV2Props {
  subject: SubjectCardDTO;
  style?: React.CSSProperties; // Required for react-window
  onClick?: () => void;
}

const SubjectCardV2: React.FC<SubjectCardV2Props> = React.memo(({ subject, style, onClick }) => {
  const navigate = useNavigate();
  const portraitUrl = `/api/entities/${subject.id}/portrait`;
  const hasPhotos = subject.topPhotoId != null;

  // Safety fallbacks
  const stats = subject.stats || {
    mentions: 0,
    documents: 0,
    distinctSources: 0,
    verifiedMedia: 0,
  };
  const forensics = subject.forensics || {
    riskLevel: 'LOW',
    evidenceLadder: 'NONE',
    signalStrength: { exposure: 0, connectivity: 0, corroboration: 0 },
    driverLabels: [],
  };
  const riskRating = Number(
    forensics.redFlagObjective || forensics.redFlagSubjective || subject.redFlagRating || 0,
  );
  const riskTone = riskToneFromRating(riskRating);

  const handleCardClick = () => {
    if (onClick) onClick();
    else navigate(`/entity/${subject.id}`);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/entity/${subject.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div style={style}>
      <article
        data-testid="subject-card"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        className={styles.card}
        style={{
          boxShadow: `inset 0 1px 0 color-mix(in srgb, var(--text-strong) 5%, transparent), 0 12px 26px color-mix(in srgb, var(--bg-dark) 36%, transparent), 0 0 0 1px color-mix(in srgb, ${riskTone.cssVar} 22%, transparent)`,
        }}
      >
        <Flex align="center" gap="md" className={styles.headerRow}>
          <div className={styles.avatarShell}>
            {hasPhotos ? (
              <img
                src={portraitUrl}
                alt={subject.name}
                className={styles.avatarImage}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector(`.${styles.avatarFallback}`)) {
                    const fallback = document.createElement('div');
                    fallback.className = styles.avatarFallback;
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <Flex align="center" justify="center" className={styles.avatarFallback}>
                {getEntityTypeIcon('Person', 'sm', subject.role)}
              </Flex>
            )}
          </div>

          <div className={styles.subjectMeta}>
            <Flex align="center" justify="between">
              <h3 className={styles.subjectName}>{subject.name}</h3>
              <EvidenceBadge
                level={forensics.evidenceLadder as EvidenceLadderLevel}
                ratingObjective={forensics.redFlagObjective}
                ratingSubjective={forensics.redFlagSubjective}
              />
            </Flex>
            <div className={styles.subjectRole}>{subject.role}</div>
          </div>
        </Flex>

        <div className={styles.signalBlock}>
          <SignalPanel metrics={forensics.signalStrength} />
          <div className={styles.driverBlock}>
            <DriverChips
              chips={(forensics.driverLabels || []).map((label) => {
                let type: 'critical' | 'verified' | 'context' | 'unverified' = 'context';
                const l = label.toLowerCase();
                if (l.includes('black book') || l.includes('flight')) type = 'critical';
                else if (l.includes('photo') || l.includes('verified')) type = 'verified';
                else if (l.includes('ai') || l.includes('derived')) type = 'unverified';

                return { label, type };
              })}
            />
          </div>
        </div>

        <Grid cols={3} gap="sm" className={styles.metricGrid}>
          <Metric label="Mentions" value={stats.mentions} />
          <Metric label="Docs" value={stats.documents} />
          <Metric label="Sources" value={stats.distinctSources} />
        </Grid>

        <Flex align="center" justify="between" className={styles.footerRow}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <AddToInvestigationButton
                  item={{
                    id: subject.id,
                    title: subject.name,
                    description: subject.role,
                    type: 'entity',
                    sourceId: subject.id,
                  }}
                  variant="icon"
                  stopPropagation
                />
              </span>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="top" align="end">
                Add this entity to the current investigation
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="glass"
                size="sm"
                onClick={handleProfileClick}
                className={styles.viewButton}
              >
                View <Icon name="ArrowRight" />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="top" align="end">
                Open full profile for this entity
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </Flex>
      </article>
    </div>
  );
});

const Metric = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) => {
  const descriptions: Record<string, string> = {
    Mentions: 'Total mentions across documents. Higher implies broader exposure.',
    Docs: 'Approximate count of documents mentioning this entity.',
    Sources: 'Distinct evidence types associated with this entity.',
    Media: 'Verified photos or media linked to this entity.',
  };
  const content = descriptions[label] || '';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Stack align="center" gap="xs">
          <span className={styles.metricLabel}>{label}</span>
          <span
            className={`${styles.metricValue} ${highlight ? styles.metricValueHighlight : ''} data-emphasis`}
          >
            {formatNumber(value)}
          </span>
        </Stack>
      </TooltipTrigger>
      {content && (
        <TooltipPortal>
          <TooltipContent side="top">{content}</TooltipContent>
        </TooltipPortal>
      )}
    </Tooltip>
  );
};

export default SubjectCardV2;
