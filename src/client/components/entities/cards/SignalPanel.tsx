import React from 'react';
import { SignalMetrics } from '../../../utils/forensics';
import Tooltip from '../../common/Tooltip';
import styles from './SignalPanel.module.css';

interface SignalPanelProps {
  metrics: SignalMetrics;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ metrics }) => {
  return (
    <div className={styles.root}>
      <Tooltip
        content="Exposure: relative mention volume across the corpus. Computed from log10(mentions+1) scaled to 0–100."
        position="top-end"
      >
        <div className={styles.row}>
          <span className={styles.label}>Exposure</span>
          <div className={styles.track}>
            <div
              className={`${styles.fill} ${styles.exposureFill}`}
              style={{ width: `${Math.max(5, metrics.exposure)}%` }}
            />
          </div>
        </div>
      </Tooltip>

      <Tooltip
        content="Network: connectivity score from relationship density. Based on connection count, capped for visualization."
        position="top-end"
      >
        <div className={styles.row}>
          <span className={styles.label}>Network</span>
          <div className={styles.track}>
            <div
              className={`${styles.fill} ${styles.networkFill}`}
              style={{ width: `${Math.max(5, metrics.connectivity)}%` }}
            />
          </div>
        </div>
      </Tooltip>

      <Tooltip
        content="Source: corroboration from distinct evidence types and document diversity contributing to the signal."
        position="top-end"
      >
        <div className={styles.row}>
          <span className={styles.label}>Source</span>
          <div className={styles.track}>
            <div
              className={`${styles.fill} ${styles.sourceFill}`}
              style={{ width: `${Math.max(5, metrics.corroboration)}%` }}
            />
          </div>
        </div>
      </Tooltip>
    </div>
  );
};
