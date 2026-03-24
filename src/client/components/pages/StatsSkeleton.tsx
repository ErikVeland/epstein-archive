import React from 'react';

const StatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-3 md:p-6 relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-[var(--glass-highlight)] to-transparent"></div>
          <div className="h-3 md:h-4 w-3 md:w-4 bg-[var(--glass-bg-highlight)] rounded mb-1 md:mb-2 animate-pulse"></div>
          <div className="h-6 md:h-8 w-12 md:w-16 bg-[var(--glass-bg-highlight)] rounded mb-1 animate-pulse"></div>
          <div className="h-2 md:h-3 w-16 md:w-24 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  );
};

export default StatsSkeleton;
