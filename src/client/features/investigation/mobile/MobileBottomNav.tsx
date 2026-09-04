import Icon from '@client/components/common/Icon';
import styles from './MobileBottomNav.module.css';

import { Button } from '@client/design-system/lib';

type ActiveDest = 'board' | 'evidence' | 'activity';

interface MobileBottomNavProps {
  activeDest: ActiveDest;
  onSetActiveDest: (dest: ActiveDest) => void;
  onCapture: () => void;
  onMore: () => void;
  canCapture: boolean;
  canViewBoard: boolean;
}

export function MobileBottomNav({
  activeDest,
  onSetActiveDest,
  onCapture,
  onMore,
  canCapture,
  canViewBoard,
}: MobileBottomNavProps) {
  return (
    <nav className={styles.nav} aria-label="Investigation navigation">
      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'board' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('board')}
        aria-label={canViewBoard ? 'Board' : 'Sign in to open the board'}
      >
        <Icon name={canViewBoard ? 'LayoutDashboard' : 'Lock'} size="md" />
        <span className={styles.label}>Board</span>
      </Button>

      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'evidence' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('evidence')}
        aria-label="Evidence"
      >
        <Icon name="FileText" size="md" />
        <span className={styles.label}>Evidence</span>
      </Button>

      <div className={styles.fabSlot}>
        <Button
          unstyled
          className={styles.fab}
          onClick={onCapture}
          aria-label={canCapture ? 'Capture evidence' : 'Sign in to add evidence'}
        >
          <Icon name={canCapture ? 'Plus' : 'LogIn'} size="lg" />
        </Button>
      </div>

      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'activity' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('activity')}
        aria-label="Activity"
      >
        <Icon name="Activity" size="md" />
        <span className={styles.label}>Activity</span>
      </Button>

      <Button unstyled className={styles.slot} onClick={onMore} aria-label="More tools">
        <Icon name="MoreHorizontal" size="md" />
        <span className={styles.label}>More</span>
      </Button>
    </nav>
  );
}
