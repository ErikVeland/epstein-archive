import Icon, { IconName } from '@client/components/common/Icon';
import { SheetDialog } from '@client/components/common/SheetDialog';
import styles from './MobileMoreDrawer.module.css';

import { Button } from '@client/design-system/lib';

export type MoreTool =
  | 'timeline'
  | 'iceberg'
  | 'forensic'
  | 'communications'
  | 'hypotheses'
  | 'export';

interface ToolEntry {
  id: MoreTool;
  title: string;
  subtitle: string;
  iconName: IconName;
}

const TOOLS: ToolEntry[] = [
  {
    id: 'timeline',
    title: 'Timeline',
    subtitle: 'Review events in date order',
    iconName: 'Calendar',
  },
  {
    id: 'iceberg',
    title: 'Discovery',
    subtitle: 'Explore leads and supporting sources',
    iconName: 'Layers',
  },
  {
    id: 'forensic',
    title: 'Source analysis',
    subtitle: 'Review documents and connections',
    iconName: 'Microscope',
  },
  {
    id: 'communications',
    title: 'Communications',
    subtitle: 'Review communication patterns',
    iconName: 'MessageSquare',
  },
  {
    id: 'hypotheses',
    title: 'Hypotheses',
    subtitle: 'Test and refine questions',
    iconName: 'Target',
  },
  {
    id: 'export',
    title: 'Export',
    subtitle: 'Create a report or evidence packet',
    iconName: 'Download',
  },
];

interface MobileMoreDrawerProps {
  onSelectTool: (tool: MoreTool) => void;
  onClose: () => void;
  editable?: boolean;
}

export function MobileMoreDrawer({
  onSelectTool,
  onClose,
  editable = true,
}: MobileMoreDrawerProps) {
  const visibleTools = editable
    ? TOOLS
    : TOOLS.filter((tool) => !['forensic', 'hypotheses', 'export'].includes(tool.id));
  return (
    <SheetDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="More tools"
      description="Open another view for this case."
      bodyClassName={styles.toolList}
    >
      {visibleTools.map(({ id, title, subtitle, iconName }) => (
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
    </SheetDialog>
  );
}
