import React from 'react';
import { sourceBadgeTokens, spacingTokens } from '@design-system';

interface SourceBadgeProps {
  source: 'Seventh Production' | 'Black Book' | 'Public Record' | string;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className = '' }) => {
  // Get source badge color
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Black Book':
        return sourceBadgeTokens.blackBook;
      case 'Seventh Production':
        return sourceBadgeTokens.seventhProduction;
      case 'Public Record':
        return sourceBadgeTokens.publicRecord;
      default:
        return sourceBadgeTokens.fallback;
    }
  };

  return (
    <span
      className={`
      ${spacingTokens.chipPadding}
      rounded-full 
      text-xs 
      font-medium
      border 
      shadow-sm 
      backdrop-blur-sm
      ${getSourceColor(source)}
      ${className}
    `}
    >
      {source}
    </span>
  );
};
