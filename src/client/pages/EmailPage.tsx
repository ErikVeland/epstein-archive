import React from 'react';
import EmailClient from '../components/email/EmailClient';
import { MobileEmailShell } from '../components/email/mobile/MobileEmailShell';
import { useIsMobile } from '../hooks/useIsMobile';
import styles from './EmailPage.module.css';

export const EmailPage: React.FC = () => {
  const isMobile = useIsMobile();

  return <div className={styles.root}>{isMobile ? <MobileEmailShell /> : <EmailClient />}</div>;
};
