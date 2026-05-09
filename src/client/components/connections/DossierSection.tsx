import { useState } from 'react';
import { Surface, Flex, LqText } from '@client/design-system/lib';
import Icon from '@client/components/common/Icon';
import type { ReactNode } from 'react';
import styles from './DossierSection.module.css';

interface DossierSectionProps {
  icon: string;
  title: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function DossierSection({
  icon,
  title,
  count,
  children,
  defaultOpen = true,
}: DossierSectionProps) {
  const [open, setOpen] = useState(defaultOpen || count > 0);
  const isEmpty = count === 0;

  return (
    <Surface variant="glass" className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Flex align="center" gap="sm">
          <Icon name={icon as Parameters<typeof Icon>[0]['name']} size="sm" />
          <LqText variant="small" weight="semibold">
            {title}
          </LqText>
        </Flex>
        <Flex align="center" gap="sm">
          <span className={isEmpty ? styles.countEmpty : styles.count}>{count}</span>
          <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size="xs" />
        </Flex>
      </button>
      {open && (
        <div className={styles.body}>
          {isEmpty ? <p className={styles.empty}>No {title.toLowerCase()} found</p> : children}
        </div>
      )}
    </Surface>
  );
}
