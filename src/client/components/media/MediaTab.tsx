import React from 'react';
import PhotoBrowser from './PhotoBrowser';
import styles from '@client/App.module.css';

type MediaTabProps = Record<string, never>;

export const MediaTab: React.FC<MediaTabProps> = () => {
  return (
    <div className={styles.hFull}>
      <PhotoBrowser />
    </div>
  );
};

export default MediaTab;
