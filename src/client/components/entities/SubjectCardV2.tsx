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
import Tooltip from '../common/Tooltip';
import { riskToneFromRating } from '../../utils/riskSemantics';
import { type EvidenceLadderLevel } from '../../utils/forensics';

interface SubjectCardV2Props {
  subject: SubjectCardDTO;
  style?: React.CSSProperties; // Required for react-window
  onClick?: () => void;
}

const SubjectCardV2: React.FC<SubjectCardV2Props> = React.memo(({ subject, style, onClick }) => {
  const navigate = useNavigate();
  const topPhotoId = subject.topPhotoId;
  const avatarUrl = topPhotoId ? `/api/media/images/${topPhotoId}/thumbnail` : null;

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
        className="group relative surface-glass-card p-4 bg-transparent text-left transition-all duration-300 hover:border-[var(--glass-border-highlight)] flex flex-col h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
        style={{
          boxShadow: `inset 0 1px 0 color-mix(in srgb, var(--text-strong) 5%, transparent), 0 12px 26px color-mix(in srgb, var(--bg-dark) 36%, transparent), 0 0 0 1px color-mix(in srgb, ${riskTone.cssVar} 22%, transparent)`,
        }}
      >
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-shrink-0 relative w-10 h-10 rounded-[var(--radius-md)] overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-bg-strong)]">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={subject.name}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                {getEntityTypeIcon('Person', 'sm', subject.role)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="type-h2 text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                {subject.name}
              </h3>
              <EvidenceBadge
                level={forensics.evidenceLadder as EvidenceLadderLevel}
                ratingObjective={forensics.redFlagObjective}
                ratingSubjective={forensics.redFlagSubjective}
              />
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider truncate">
              {subject.role}
            </div>
          </div>
        </div>

        <div className="mb-2">
          <SignalPanel metrics={forensics.signalStrength} />
          <div className="mt-2 text-[10px] text-[var(--text-muted)] flex flex-wrap gap-1">
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

        <div className="grid grid-cols-3 gap-1 py-3 mt-1 shadow-[0_-1px_0_var(--glass-border)] mb-auto">
          <Metric label="Mentions" value={stats.mentions} />
          <Metric label="Docs" value={stats.documents} />
          <Metric label="Sources" value={stats.distinctSources} />
        </div>

        <div className="mt-3 pt-3 shadow-[0_-1px_0_var(--glass-border)] flex items-center justify-between">
          <Tooltip content="Add this entity to the current investigation" position="top-end">
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
          </Tooltip>
          <Tooltip content="Open full profile for this entity" position="top-end">
            <button
              type="button"
              onClick={handleProfileClick}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:brightness-110 flex items-center gap-1"
            >
              View <Icon name="ArrowRight" size="xs" />
            </button>
          </Tooltip>
        </div>
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
    <Tooltip content={content} position="top">
      <div className="flex flex-col items-center">
        <span className="text-[8px] uppercase text-[var(--text-muted)] font-bold tracking-wider">
          {label}
        </span>
        <span
          className={`font-mono ${highlight ? 'text-amber-400' : 'text-[var(--text-primary)]'} data-emphasis`}
        >
          {formatNumber(value)}
        </span>
      </div>
    </Tooltip>
  );
};

export default SubjectCardV2;
