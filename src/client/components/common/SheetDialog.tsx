import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../design-system/lib';
import { cn } from '../../utils/cn';
import { CloseButton } from './CloseButton';
import styles from './SheetDialog.module.css';

interface SheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
  hideCloseButton?: boolean;
}

export function SheetDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  bodyClassName,
  hideCloseButton = false,
}: SheetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(styles.content, contentClassName)}>
        <div className={styles.dragHandle} aria-hidden="true" />
        <div className={styles.headerRow}>
          <DialogHeader className={styles.header}>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {!hideCloseButton ? (
            <CloseButton
              onClick={() => onOpenChange(false)}
              label={`Close ${typeof title === 'string' ? title : 'sheet'}`}
              className={styles.closeButton}
            />
          ) : null}
        </div>
        <div className={cn(styles.body, bodyClassName)}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}

export default SheetDialog;
