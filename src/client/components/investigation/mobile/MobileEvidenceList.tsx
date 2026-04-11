import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { investigationsApi } from '../../../domains/investigations';
import type { InvestigationCaseEvidenceItemDto } from '@shared/dto/investigations';
import styles from './MobileEvidenceList.module.css';

const FILTER_CHIPS = ['All', 'Documents', 'Testimony', 'Unsorted', 'Flagged'] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

interface MobileEvidenceListProps {
  investigationId: string;
}

/** Items without an evidenceLadder assignment are treated as "unsorted". */
function isUnsorted(item: InvestigationCaseEvidenceItemDto): boolean {
  return !item.evidenceLadder;
}

/** Items with a non-zero redFlagRating are treated as "flagged". */
function isFlagged(item: InvestigationCaseEvidenceItemDto): boolean {
  return (item.redFlagRating ?? 0) > 0;
}

export function MobileEvidenceList({ investigationId }: MobileEvidenceListProps) {
  const navigate = useNavigate();
  const [evidence, setEvidence] = useState<InvestigationCaseEvidenceItemDto[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterChip>('All');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setFetchError(null);
    investigationsApi
      .getCaseFolder(investigationId)
      .then((folder) => {
        if (active) setEvidence(folder.all ?? []);
      })
      .catch((error) => {
        if (active) {
          console.error(error);
          setFetchError('Failed to load evidence.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [investigationId]);

  const handleView = (item: InvestigationCaseEvidenceItemDto) => {
    if (item.documentId) {
      navigate(`/documents?id=${item.documentId}`);
    } else if (item.sourcePath) {
      window.open(`/files/${encodeURIComponent(item.sourcePath)}`, '_blank', 'noopener');
    }
  };

  const filtered = evidence.filter((item) => {
    const matchesSearch =
      search === '' || (item.title ?? '').toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'All' ||
      (filter === 'Unsorted' && isUnsorted(item)) ||
      (filter === 'Flagged' && isFlagged(item)) ||
      (filter === 'Documents' && item.type === 'document') ||
      (filter === 'Testimony' && item.type === 'testimony');

    return matchesSearch && matchesFilter;
  });

  const unsorted = filtered.filter(isUnsorted);
  const sorted = filtered.filter((item) => !isUnsorted(item));

  if (loading) {
    return <div className={styles.empty}>Loading evidence...</div>;
  }

  if (fetchError) {
    return <div className={styles.empty}>{fetchError}</div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.stickyHeader}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search evidence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.filterRow}>
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              className={`${styles.chip} ${filter === chip ? styles.chipActive : ''}`}
              onClick={() => setFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.list}>
        {unsorted.length > 0 && (
          <>
            <div className={styles.groupHeader}>
              <span className={styles.unsortedDot} />
              Unsorted
            </div>
            {unsorted.map((item) => (
              <EvidenceCard key={item.id} item={item} onView={handleView} />
            ))}
          </>
        )}

        {sorted.length > 0 && (
          <>
            <div className={styles.groupHeader}>Evidence</div>
            {sorted.map((item) => (
              <EvidenceCard key={item.id} item={item} onView={handleView} />
            ))}
          </>
        )}

        {filtered.length === 0 && <div className={styles.empty}>No evidence found</div>}
      </div>
    </div>
  );
}

interface EvidenceCardProps {
  item: InvestigationCaseEvidenceItemDto;
  onView: (item: InvestigationCaseEvidenceItemDto) => void;
}

function EvidenceCard({ item, onView }: EvidenceCardProps) {
  const canView = !!item.documentId || !!item.sourcePath;

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.typeLabel}>{item.type ?? 'unknown'}</span>
        <span className={styles.cardTitle}>{item.title ?? 'Untitled'}</span>
      </div>
      <div className={styles.cardMeta}>
        {isFlagged(item) && (
          <span className={styles.flaggedBadge}>Flagged ({item.redFlagRating})</span>
        )}
        {item.relevance && <span>{item.relevance}</span>}
      </div>
      <div className={styles.cardActions}>
        <button className={styles.cardBtn} onClick={() => onView(item)} disabled={!canView}>
          View
        </button>
      </div>
    </div>
  );
}
