import { Inbox, Mail, MessageSquare, SlidersHorizontal } from 'lucide-react';
import styles from './MobileEmailBottomNav.module.css';

import { Button } from '../../../design-system/lib';

export type EmailDest = 'mailboxes' | 'threads' | 'message';

interface MobileEmailBottomNavProps {
  activeDest: EmailDest;
  onSetActiveDest: (dest: EmailDest) => void;
  hasSelectedThread: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
}

export function MobileEmailBottomNav({
  activeDest,
  onSetActiveDest,
  hasSelectedThread,
  activeFilterCount,
  onOpenFilters,
}: MobileEmailBottomNavProps) {
  return (
    <nav className={styles.nav} aria-label="Email navigation">
      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'mailboxes' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('mailboxes')}
        aria-label="Mailboxes"
      >
        <Inbox size={20} />
        <span className={styles.label}>Mailboxes</span>
      </Button>

      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'threads' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('threads')}
        aria-label="Threads"
      >
        <Mail size={20} />
        <span className={styles.label}>Threads</span>
      </Button>

      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'message' ? styles.slotActive : ''} ${
          !hasSelectedThread ? styles.slotDisabled : ''
        }`}
        onClick={() => hasSelectedThread && onSetActiveDest('message')}
        aria-label="Message"
        aria-disabled={!hasSelectedThread}
      >
        <MessageSquare size={20} />
        <span className={styles.label}>Message</span>
      </Button>

      <Button
        unstyled
        className={`${styles.slot} ${activeFilterCount > 0 ? styles.slotActive : ''}`}
        onClick={onOpenFilters}
        aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
      >
        <span className={styles.filterIconWrap}>
          <SlidersHorizontal size={20} />
          {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
        </span>
        <span className={styles.label}>Filters</span>
      </Button>
    </nav>
  );
}
