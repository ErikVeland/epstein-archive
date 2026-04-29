import React from 'react';
import Icon from '@client/components/common/Icon';
import { useDegradedMode } from '@client/contexts/useDegradedMode';
import s from './DegradedBanner.module.css';

export const DegradedBanner: React.FC = () => {
  const { isDegraded } = useDegradedMode();
  if (!isDegraded) return null;

  return (
    <div className={s.banner}>
      <Icon name="AlertTriangle" className={s.icon} size="md" />
      <div className={s.text}>
        <strong className={s.strong}>System under heavy load</strong>
        <span className={s.detail}>
          Auto-retries have been paused. Functionality may be limited or cached. Please wait a
          moment before trying again.
        </span>
      </div>
    </div>
  );
};
