import React from 'react';
import s from './SourceBadge.module.css';

interface SourceBadgeProps {
  source: 'Seventh Production' | 'Black Book' | 'Public Record' | string;
  className?: string;
}

function getVariantClass(source: string): string {
  switch (source) {
    case 'Black Book':
      return s.blackBook;
    case 'Seventh Production':
      return s.seventhProduction;
    case 'Public Record':
      return s.publicRecord;
    default:
      return s.fallback;
  }
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className = '' }) => {
  return <span className={`${s.root} ${getVariantClass(source)} ${className}`}>{source}</span>;
};
