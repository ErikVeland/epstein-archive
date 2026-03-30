import React from 'react';
import s from './StatsSkeleton.module.css';

const StatsSkeleton: React.FC = () => {
  return (
    <div className={s.grid}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className={s.card}>
          {/* Shimmer effect */}
          <div className={s.shimmer}></div>
          <div className={`${s.barIcon} animate-pulse`}></div>
          <div className={`${s.barValue} animate-pulse`}></div>
          <div className={`${s.barLabel} animate-pulse`}></div>
        </div>
      ))}
    </div>
  );
};

export default StatsSkeleton;
