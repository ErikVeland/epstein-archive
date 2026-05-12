import React from 'react';
import { Surface, Button, LqText } from '@client/design-system/lib';
import styles from './SensitiveWarningBanner.module.css';

export const SensitiveWarningBanner: React.FC<{ onAccept: () => void }> = ({ onAccept }) => {
  return (
    <Surface variant="glass" className={styles.banner}>
      <h2 className={styles.heading}>SENSITIVE CONTENT WARNING</h2>
      <LqText variant="small" className={styles.body}>
        This research layer contains highly sensitive information, survivor testimonies, and
        depositions regarding victims and witnesses. The following material details abuse and may be
        distressing. Please proceed with caution and utmost respect.
      </LqText>
      <Button variant="danger" onClick={onAccept} className={styles.action}>
        I Understand, Proceed to Testimony Records
      </Button>
    </Surface>
  );
};
