import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDegradedMode } from '../../contexts/useDegradedMode';
import s from './DegradedBanner.module.css';

export const DegradedBanner: React.FC = () => {
  const { isDegraded } = useDegradedMode();
  if (!isDegraded) return null;

  return (
    <div className={s.banner}>
      <AlertTriangle className={s.icon} size={20} />
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
