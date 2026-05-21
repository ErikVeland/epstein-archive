import React from 'react';
import { VideoBrowser } from './VideoBrowser';
import styles from '@client/App.module.css';

const VideoTab: React.FC = () => {
  return (
    <div className={styles.hFull}>
      <VideoBrowser />
    </div>
  );
};

export default VideoTab;
