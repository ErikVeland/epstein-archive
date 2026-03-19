import React from 'react';

interface SourceBadgeProps {
  source: 'Seventh Production' | 'Black Book' | 'Public Record' | string;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className = '' }) => {
  // Get source badge color
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Black Book':
        return 'bg-gradient-to-r from-purple-900/60 to-purple-800/40 border-purple-500/30 text-purple-200 shadow-purple-900/20';
      case 'Seventh Production':
        return 'bg-gradient-to-r from-cyan-900/60 to-cyan-800/40 border-[var(--accent)]/30 text-cyan-200 shadow-cyan-900/20';
      case 'Public Record':
        return 'bg-gradient-to-r from-emerald-900/60 to-emerald-800/40 border-emerald-500/30 text-emerald-200 shadow-emerald-900/20';
      default:
        return 'bg-[var(--glass-bg)]/60 border-[var(--glass-border)] text-[var(--text-muted)]';
    }
  };

  return (
    <span
      className={`
      px-2 
      py-1 
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
