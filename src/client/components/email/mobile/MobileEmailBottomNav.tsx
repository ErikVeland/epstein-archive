import Icon from '@client/components/common/Icon';
import styles from './MobileEmailBottomNav.module.css';

import { Button } from '@client/design-system/lib';

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
        <Icon name="Inbox" size="md" />
        <span className={styles.label}>Mailboxes</span>
      </Button>

      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'threads' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('threads')}
        aria-label="Threads"
      >
        <Icon name="Mail" size="md" />
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
        <Icon name="MessageSquare" size="md" />
        <span className={styles.label}>Message</span>
      </Button>

      <Button
        unstyled
        className={`${styles.slot} ${activeFilterCount > 0 ? styles.slotActive : ''}`}
        onClick={onOpenFilters}
        aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
      >
        <span className={styles.filterIconWrap}>
          <Icon name="SlidersHorizontal" size="md" />
          {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
        </span>
        <span className={styles.label}>Filters</span>
      </Button>
    </nav>
  );
}
