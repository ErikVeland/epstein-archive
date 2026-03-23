import React from 'react';
import { Person } from '../../types';
import { formatNumber } from '../../utils/search';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import Icon from '../common/Icon';
import { getEntityTypeIcon } from '../../utils/entityTypeIcons';
import {
  calculateEvidenceLadder,
  calculateSignalMetrics,
  generateDriverChips,
} from '../../utils/forensics';
import { SignalPanel } from './cards/SignalPanel';
import { EvidenceBadge } from './cards/EvidenceBadge';
import { DriverChips } from './cards/DriverChips';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  onDocumentClick?: (document: Record<string, unknown>, searchTerm?: string) => void;
  searchTerm?: string;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, onClick, searchTerm }) => {
  const rating = Number(person.redFlagRating ?? 0);

  // Forensic Calculations
  const evidenceLevel = calculateEvidenceLadder(person);
  const signalMetrics = calculateSignalMetrics(person);
  const driverChips = generateDriverChips(person);

  const photos = React.useMemo(() => person.photos || [], [person.photos]);

  // Identity
  const entityType = person.entityType;
  const role = person.title || person.role || person.primaryRole || 'Unknown';
  const avatarPhoto = photos.length > 0 ? photos[0] : null;

  // Highlight helper
  const highlightText = (text: string, term?: string) => {
    if (!term || !text || !term.trim()) return text;
    try {
      const escapedTerm = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      return text.split(regex).map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-[var(--accent-warning)]/30 text-[var(--accent-warning)] px-0 rounded font-medium"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      );
    } catch {
      return text;
    }
  };

  const filesCount = person.files ?? person.fileReferences?.length ?? 0;

  return (
    <article className="surface-glass-card group relative p-4 flex flex-col h-full">
      <button
        type="button"
        onClick={onClick}
        className="w-full bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset rounded-[var(--radius-lg)]"
        aria-label={`Open profile for ${person.name}`}
      >
        {/* 1. IDENTITY HEADER */}
        <div className="flex items-start gap-4 mb-3">
          {/* Zoomed Avatar */}
          <div className="flex-shrink-0 relative w-12 h-12 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--glass-border)] group-hover:border-[var(--accent)]/50 transition-colors bg-[var(--glass-bg-strong)]">
            {avatarPhoto ? (
              <img
                src={`/api/media/images/${avatarPhoto.id}/thumbnail`}
                alt={person.name}
                className="w-full h-full object-cover object-top scale-125 transform transition-transform duration-700 group-hover:scale-150"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--glass-bg)]">
                {getEntityTypeIcon(entityType ?? '', 'md', role)}
              </div>
            )}
            {rating >= 4 && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-[var(--accent-danger)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                {highlightText(person.name, searchTerm)}
              </h3>
              <EvidenceBadge
                level={evidenceLevel.level}
                ratingObjective={rating}
                ratingSubjective={Number(person.redFlagScore ?? 0)}
              />
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[var(--type-xs)] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
                {role}
              </span>
              {/* Black Book Badge */}
              {(person.hasBlackBook ||
                (person.blackBookEntries && person.blackBookEntries.length > 0)) && (
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded text-[var(--type-xs)] font-bold text-[var(--accent)] uppercase tracking-wider"
                  title="Listed in Jeffrey Epstein's Black Book"
                >
                  <Icon name="Book" size="xs" />
                  BB
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. SIGNAL BLOCK (Visual) */}
        <div className="mb-3 bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-3 border border-[var(--glass-border)]">
          <SignalPanel metrics={signalMetrics} />
          <DriverChips chips={driverChips} />
        </div>

        {/* 3. CORE METRICS (Compact) */}
        <div className="grid grid-cols-3 gap-2 py-2 border-t border-[var(--glass-border)] mb-3">
          <div className="flex flex-col items-center">
            <span className="text-[var(--type-xs)] uppercase text-[var(--text-muted)] font-bold tracking-wider">
              Mentions
            </span>
            <span className="text-xs font-mono text-[var(--text-primary)]">
              {formatNumber(person.mentions)}
            </span>
          </div>
          <div className="flex flex-col items-center border-l border-[var(--glass-border)]">
            <span className="text-[var(--type-xs)] uppercase text-[var(--text-muted)] font-bold tracking-wider">
              Docs
            </span>
            <span className="text-xs font-mono text-[var(--text-primary)]">
              {formatNumber(filesCount)}
            </span>
          </div>
          <div className="flex flex-col items-center border-l border-[var(--glass-border)]">
            <span className="text-[var(--type-xs)] uppercase text-[var(--text-muted)] font-bold tracking-wider">
              Risk
            </span>
            <span
              className={`text-xs font-mono font-bold ${rating >= 4 ? 'text-[var(--accent-danger)]' : 'text-[var(--text-muted)]'}`}
            >
              {rating > 0 ? `${rating}/5` : '-'}
            </span>
          </div>
        </div>
      </button>

      {/* 4. FOOTER / ACTION */}
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <AddToInvestigationButton
            item={{
              id: person.id?.toString() || '',
              title: person.name,
              description: role,
              type: 'entity',
              sourceId: person.id?.toString() || '',
            }}
            variant="icon"
          />
          {person.bio && (
            <span className="text-[var(--type-xs)] text-[var(--text-muted)] truncate max-w-[120px] italic">
              "{person.bio.slice(0, 30)}..."
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClick}
          className="text-[var(--type-xs)] font-bold uppercase tracking-wider text-[var(--accent)] hover:brightness-110 flex items-center gap-1"
        >
          Profile <Icon name="ArrowRight" size="xs" />
        </button>
      </div>
    </article>
  );
};

export default PersonCard;
