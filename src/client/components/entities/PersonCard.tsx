import React from 'react';
import { Person } from '@client/types';
import { formatNumber } from '@client/utils/search';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import Icon from '../common/Icon';
import { getEntityTypeIcon } from '@client/utils/entityTypeIcons';
import {
  calculateEvidenceLadder,
  calculateSignalMetrics,
  generateDriverChips,
} from '@client/utils/forensics';
import { Button } from '@client/design-system/lib';
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

const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onClick,
  onDocumentClick,
  searchTerm,
}) => {
  const rating = Number(person.redFlagRating ?? 0);

  // Forensic Calculations
  const evidenceLevel = calculateEvidenceLadder(person);
  const signalMetrics = calculateSignalMetrics(person);
  const driverChips = generateDriverChips(person);

  const photos = React.useMemo(() => person.photos || [], [person.photos]);

  // Identity
  const entityType = person.entityType;
  const role = person.title || person.role || person.primaryRole || 'Unknown';
  const portraitUrl = `/api/entities/${person.id}/portrait`;
  const hasPhotos = photos.length > 0;

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
    <article className={`surface-panel group ${styles.card}`}>
      <Button
        unstyled
        type="button"
        onClick={onClick}
        className={styles.clickTarget}
        aria-label={`Open profile for ${person.name}`}
      >
        {/* 1. IDENTITY HEADER */}
        <div className={styles.identityHeader}>
          {/* Zoomed Avatar */}
          <div className={styles.avatar}>
            {hasPhotos ? (
              <img
                src={portraitUrl}
                alt={person.name}
                className={styles.avatarImg}
                loading="lazy"
                onError={(e) => {
                  // Fallback to icon if portrait specifically fails
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector(`.${styles.avatarFallback}`)) {
                    const fallback = document.createElement('div');
                    fallback.className = styles.avatarFallback;
                    parent.appendChild(fallback);
                  }
                }}
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
                  <Icon name="Book" />
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

        <div className={styles.provenanceRow}>
          <ProvenanceBadge
            sourceDocumentId={person.sourceDocumentId}
            sourceHash={person.sourceHash}
            reviewState={person.reviewState}
            confidence={person.confidence}
            extractionMethod={person.extractionMethod}
            showLabel={false}
          />
          {person.provenanceStatus === 'missing' && (
            <span className={styles.missingSource}>Source missing</span>
          )}
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
      </Button>

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
          {person.sourceDocumentId != null && onDocumentClick && (
            <Button
              unstyled
              type="button"
              className={styles.sourceButton}
              onClick={(event) => {
                event.stopPropagation();
                onDocumentClick(
                  {
                    id: person.sourceDocumentId,
                    title: `Source document ${person.sourceDocumentId}`,
                    sourceDocumentId: person.sourceDocumentId,
                  },
                  searchTerm,
                );
              }}
            >
              <Icon name="FileText" size="sm" />
              Source
            </Button>
          )}
        </div>
        <Button variant="glass" size="sm" onClick={onClick} className={styles.profileLink}>
          Profile <Icon name="ArrowRight" />
        </Button>
      </div>
    </article>
  );
};

export default PersonCard;
