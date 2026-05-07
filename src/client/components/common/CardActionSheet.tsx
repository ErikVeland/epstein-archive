import { SheetDialog } from './SheetDialog';
import Icon from './Icon';
import { Button } from '@client/design-system/lib';
import styles from './CardActionSheet.module.css';
import type { IconName } from './Icon';

export interface CardAction {
  label: string;
  icon: IconName;
  onClick: () => void;
  destructive?: boolean;
}

interface CardActionSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  actions: CardAction[];
}

/**
 * A bottom sheet showing a short list of quick actions triggered by a
 * long-press on a card. Built on SheetDialog — portals to document.body,
 * animated from the bottom edge, includes a drag handle.
 */
export function CardActionSheet({ open, onClose, title, actions }: CardActionSheetProps) {
  return (
    <SheetDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={title}
      hideCloseButton
    >
      <div className={styles.list}>
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant={action.destructive ? 'danger' : 'ghost'}
            size="md"
            className={`${styles.row} ${action.destructive ? styles.destructive : ''}`}
            onClick={() => {
              onClose();
              action.onClick();
            }}
          >
            <Icon name={action.icon} size="sm" className={styles.rowIcon} />
            <span className={styles.rowLabel}>{action.label}</span>
          </Button>
        ))}
      </div>
    </SheetDialog>
  );
}
