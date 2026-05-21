import React from 'react';
import EmailClient from '@client/features/email/EmailClient';
import styles from './EmailPage.module.css';

export const EmailPage: React.FC = () => {
  return (
    <div className={styles.root}>
      <EmailClient />
    </div>
  );
};
