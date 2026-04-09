import React from 'react';
import { VideoBrowser } from './VideoBrowser';
import styles from '../../App.module.css';

const VideoTab: React.FC = () => {
  return (
    <div className={styles.hFull}>
      <VideoBrowser />
    </div>
  );
};

export default VideoTab;
