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
import styles from './PersonCard.module.css';

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
          <mark key={i} className={styles.highlight}>
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
    <article className={`surface-glass-card group ${styles.card}`}>
      <button
        type="button"
        onClick={onClick}
        className={styles.clickTarget}
        aria-label={`Open profile for ${person.name}`}
      >
        {/* 1. IDENTITY HEADER */}
        <div className={styles.identityHeader}>
          {/* Zoomed Avatar */}
          <div className={styles.avatar}>
            {avatarPhoto ? (
              <img
                src={`/api/media/images/${avatarPhoto.id}/thumbnail`}
                alt={person.name}
                className={styles.avatarImg}
                loading="lazy"
              />
            ) : (
              <div className={styles.avatarFallback}>
                {getEntityTypeIcon(entityType ?? '', 'md', role)}
              </div>
            )}
            {rating >= 4 && <div className={styles.avatarRatingBar} />}
          </div>

          <div className={styles.nameBlock}>
            <div className={styles.nameRow}>
              <h3 className={styles.name}>{highlightText(person.name, searchTerm)}</h3>
              <EvidenceBadge
                level={evidenceLevel.level}
                ratingObjective={rating}
                ratingSubjective={Number(person.redFlagScore ?? 0)}
              />
            </div>

            <div className={styles.roleRow}>
              <span className={styles.roleLabel}>{role}</span>
              {/* Black Book Badge */}
              {(person.hasBlackBook ||
                (person.blackBookEntries && person.blackBookEntries.length > 0)) && (
                <div
                  className={styles.blackBookBadge}
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
        <div className={styles.signalBlock}>
          <SignalPanel metrics={signalMetrics} />
          <DriverChips chips={driverChips} />
        </div>

        {/* 3. CORE METRICS (Compact) */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCell}>
            <span className={styles.metricLabel}>Mentions</span>
            <span className={styles.metricValue}>{formatNumber(person.mentions)}</span>
          </div>
          <div className={styles.metricCellBordered}>
            <span className={styles.metricLabel}>Docs</span>
            <span className={styles.metricValue}>{formatNumber(filesCount)}</span>
          </div>
          <div className={styles.metricCellBordered}>
            <span className={styles.metricLabel}>Risk</span>
            <span className={rating >= 4 ? styles.metricValueDanger : styles.metricValueMuted}>
              {rating > 0 ? `${rating}/5` : '-'}
            </span>
          </div>
        </div>
      </button>

      {/* 4. FOOTER / ACTION */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
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
            <span className={styles.bioSnippet}>&ldquo;{person.bio.slice(0, 30)}...&rdquo;</span>
          )}
        </div>
        <button type="button" onClick={onClick} className={styles.profileLink}>
          Profile <Icon name="ArrowRight" size="xs" />
        </button>
      </div>
    </article>
  );
};

export default PersonCard;
