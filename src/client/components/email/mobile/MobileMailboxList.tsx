import { useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { EmailMailboxDTO } from '../../../services/apiClient';
import { riskToneFromRating } from '../../../utils/riskSemantics';
import { Button, SearchField } from '../../../design-system/lib';
import styles from './MobileMailboxList.module.css';

const RISK_RANK: Record<string, number> = {
  high: 4,
  medium: 3,
  low: 2,
  minimal: 1,
};

const formatTime = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const age = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (age < oneDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (age < oneDay * 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

interface MobileMailboxListProps {
  mailboxes: EmailMailboxDTO[];
  selectedMailboxId: string;
  onSelect: (mailboxId: string) => void;
  showSuppressedJunk: boolean;
  onToggleJunk: () => void;
}

export function MobileMailboxList({
  mailboxes,
  selectedMailboxId,
  onSelect,
  showSuppressedJunk,
  onToggleJunk,
}: MobileMailboxListProps) {
  const [search, setSearch] = useState('');

  const filtered = mailboxes
    .filter((m) => !search || m.displayName.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => {
      if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
      const ra = RISK_RANK[a.riskSummary ?? ''] ?? 0;
      const rb = RISK_RANK[b.riskSummary ?? ''] ?? 0;
      if (ra !== rb) return rb - ra;
      return b.totalThreads - a.totalThreads;
    });

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <SearchField
            density="compact"
            placeholder="Search mailboxes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            rootClassName={styles.searchFieldRoot}
            className={styles.searchInput}
          />
        </div>
        <Button
          className={styles.junkToggle}
          onClick={onToggleJunk}
          type="button"
          variant="ghost"
          size="sm"
        >
          {showSuppressedJunk ? 'Hide junk' : 'Show junk'}
        </Button>
      </div>

      <div className={styles.list}>
        {filtered.map((mailbox) => {
          const active = mailbox.mailboxId === selectedMailboxId;
          const riskTone = riskToneFromRating(RISK_RANK[mailbox.riskSummary ?? ''] ?? null);

          return (
            <Button
              key={mailbox.mailboxId}
              className={`${styles.row} ${active ? styles.rowActive : ''} ${
                mailbox.isVip ? styles.rowVip : ''
              }`}
              onClick={() => onSelect(mailbox.mailboxId)}
              type="button"
              variant="ghost"
              size="sm"
            >
              <div className={styles.rowLeft}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{mailbox.displayName}</span>
                  {mailbox.isVip && <Sparkles className={styles.vipIcon} size={13} />}
                  {mailbox.isVerified && !mailbox.isVip && (
                    <ShieldCheck className={styles.verifiedIcon} size={13} />
                  )}
                </div>
                <div className={styles.meta}>
                  {mailbox.totalThreads.toLocaleString()} threads
                  {mailbox.riskSummary && (
                    <span className={`${styles.riskBadge} ${riskTone.className}`}>
                      {mailbox.riskSummary.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.rowRight}>
                <span className={styles.time}>{formatTime(mailbox.lastActivityAt)}</span>
              </div>
            </Button>
          );
        })}

        {filtered.length === 0 && (
          <div className={styles.empty}>No mailboxes match &ldquo;{search}&rdquo;</div>
        )}
      </div>
    </div>
  );
}
