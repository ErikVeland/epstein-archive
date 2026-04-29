import Icon, { IconName } from '@client/components/common/Icon';
import styles from './MobileMoreDrawer.module.css';

import { Button } from '@client/design-system/lib';

export type MoreTool = 'timeline' | 'forensic' | 'communications' | 'hypotheses' | 'export';

interface ToolEntry {
  id: MoreTool;
  title: string;
  subtitle: string;
  iconName: IconName;
}

const TOOLS: ToolEntry[] = [
  {
    id: 'timeline',
    title: 'Event Chronology',
    subtitle: 'Timeline of events',
    iconName: 'Calendar',
  },
  {
    id: 'forensic',
    title: 'Forensic Workbench',
    subtitle: 'Document analysis, network',
    iconName: 'Microscope',
  },
  {
    id: 'communications',
    title: 'Communications',
    subtitle: 'Pattern analysis',
    iconName: 'MessageSquare',
  },
  {
    id: 'hypotheses',
    title: 'Hypotheses',
    subtitle: 'Test and refine theories',
    iconName: 'Target',
  },
  {
    id: 'export',
    title: 'Export & Report',
    subtitle: 'Reports, JSON packet, ZIP bundle',
    iconName: 'Download',
  },
];

interface MobileMoreDrawerProps {
  onSelectTool: (tool: MoreTool) => void;
  onClose: () => void;
}

export function MobileMoreDrawer({ onSelectTool, onClose }: MobileMoreDrawerProps) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />
        <div className={styles.title}>More Tools</div>
        {TOOLS.map(({ id, title, subtitle, iconName }) => (
          <Button
            unstyled
            key={id}
            className={styles.row}
            type="button"
            onClick={() => {
              onSelectTool(id);
              onClose();
            }}
          >
            <div className={styles.iconBox}>
              <Icon name={iconName} size="sm" />
            </div>
            <div className={styles.rowBody}>
              <span className={styles.rowTitle}>{title}</span>
              <span className={styles.rowSubtitle}>{subtitle}</span>
            </div>
            <Icon name="ChevronRight" size="sm" className={styles.chevron} />
          </Button>
        ))}
      </div>
    </div>
  );
}
