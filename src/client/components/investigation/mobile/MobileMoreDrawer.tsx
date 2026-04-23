import React from 'react';
import { Calendar, Microscope, MessageSquare, Target, Download, ChevronRight } from 'lucide-react';
import styles from './MobileMoreDrawer.module.css';

import { Button } from '../../../design-system/lib';

export type MoreTool = 'timeline' | 'forensic' | 'communications' | 'hypotheses' | 'export';

interface ToolEntry {
  id: MoreTool;
  title: string;
  subtitle: string;
  Icon: React.ElementType;
}

const TOOLS: ToolEntry[] = [
  { id: 'timeline', title: 'Event Chronology', subtitle: 'Timeline of events', Icon: Calendar },
  {
    id: 'forensic',
    title: 'Forensic Workbench',
    subtitle: 'Document analysis, network',
    Icon: Microscope,
  },
  {
    id: 'communications',
    title: 'Communications',
    subtitle: 'Pattern analysis',
    Icon: MessageSquare,
  },
  { id: 'hypotheses', title: 'Hypotheses', subtitle: 'Test and refine theories', Icon: Target },
  {
    id: 'export',
    title: 'Export & Report',
    subtitle: 'Reports, JSON packet, ZIP bundle',
    Icon: Download,
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
        {TOOLS.map(({ id, title, subtitle, Icon }) => (
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
              <Icon size={18} />
            </div>
            <div className={styles.rowBody}>
              <span className={styles.rowTitle}>{title}</span>
              <span className={styles.rowSubtitle}>{subtitle}</span>
            </div>
            <ChevronRight size={16} className={styles.chevron} />
          </Button>
        ))}
      </div>
    </div>
  );
}
