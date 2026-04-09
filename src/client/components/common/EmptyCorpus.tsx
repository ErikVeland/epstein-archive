import React from 'react';
import Icon from './Icon';
import type { IconName } from './Icon';
import styles from './EmptyCorpus.module.css';

interface EmptyCorpusProps {
  icon: IconName;
  title: string;
  body: string;
  command?: string;
}

export function EmptyCorpus({ icon, title, body, command }: EmptyCorpusProps): React.ReactElement {
  return (
    <div className={styles.root}>
      <div className={styles.iconCircle}>
        <Icon name={icon} size="xl" color="gray" />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{body}</p>
      {command !== undefined && (
        <div className={styles.commandBlock}>
          <span className={styles.commandLabel}>To populate this section, run:</span>
          <code className={styles.command}>{command}</code>
        </div>
      )}
    </div>
  );
}
