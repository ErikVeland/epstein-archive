import React from 'react';
import { SignalMetrics } from '@client/utils/forensics';
import { Tooltip, TooltipTrigger, TooltipPortal, TooltipContent } from '@client/design-system/lib';
import styles from './SignalPanel.module.css';

interface SignalPanelProps {
  metrics: SignalMetrics;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ metrics }) => {
  return (
    <div className={styles.root}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={styles.row}>
            <span className={styles.label}>Exposure</span>
            <div className={styles.track}>
              <div
                className={`${styles.fill} ${styles.exposureFill}`}
                style={{ width: `${Math.max(5, metrics.exposure)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="top" align="end">
            Exposure: relative mention volume across the corpus. Computed from log10(mentions+1)
            scaled to 0–100.
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className={styles.row}>
            <span className={styles.label}>Network</span>
            <div className={styles.track}>
              <div
                className={`${styles.fill} ${styles.networkFill}`}
                style={{ width: `${Math.max(5, metrics.connectivity)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="top" align="end">
            Network: connectivity score from relationship density. Based on connection count, capped
            for visualization.
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className={styles.row}>
            <span className={styles.label}>Source</span>
            <div className={styles.track}>
              <div
                className={`${styles.fill} ${styles.sourceFill}`}
                style={{ width: `${Math.max(5, metrics.corroboration)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="top" align="end">
            Source: corroboration from distinct evidence types and document diversity contributing
            to the signal.
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </div>
  );
};
