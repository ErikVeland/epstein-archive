import { LayoutDashboard, FileText, Plus, Activity, MoreHorizontal } from 'lucide-react';
import styles from './MobileBottomNav.module.css';

import { Button } from '../../../design-system/lib';

type ActiveDest = 'board' | 'evidence' | 'activity';

interface MobileBottomNavProps {
  activeDest: ActiveDest;
  onSetActiveDest: (dest: ActiveDest) => void;
  onCapture: () => void;
  onMore: () => void;
}

export function MobileBottomNav({
  activeDest,
  onSetActiveDest,
  onCapture,
  onMore,
}: MobileBottomNavProps) {
  return (
    <nav className={styles.nav} aria-label="Investigation navigation">
      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'board' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('board')}
        aria-label="Board"
      >
        <LayoutDashboard size={20} />
        <span className={styles.label}>Board</span>
      </Button>

      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'evidence' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('evidence')}
        aria-label="Evidence"
      >
        <FileText size={20} />
        <span className={styles.label}>Evidence</span>
      </Button>

      <div className={styles.fabSlot}>
        <Button unstyled className={styles.fab} onClick={onCapture} aria-label="Capture evidence">
          <Plus size={24} />
        </Button>
      </div>

      <Button
        unstyled
        className={`${styles.slot} ${activeDest === 'activity' ? styles.slotActive : ''}`}
        onClick={() => onSetActiveDest('activity')}
        aria-label="Activity"
      >
        <Activity size={20} />
        <span className={styles.label}>Activity</span>
      </Button>

      <Button unstyled className={styles.slot} onClick={onMore} aria-label="More tools">
        <MoreHorizontal size={20} />
        <span className={styles.label}>More</span>
      </Button>
    </nav>
  );
}
