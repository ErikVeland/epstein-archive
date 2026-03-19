import React from 'react';

const PersonCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6 relative overflow-hidden shadow-[var(--glass-shadow)]">
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      {/* Mention intensity bar */}
      <div className="mb-4 h-1 bg-[var(--glass-border)] rounded-full overflow-hidden animate-pulse"></div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 w-full">
          {/* Icon placeholder */}
          <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-3 h-12 w-12 shrink-0"></div>
          <div className="flex-1">
            {/* Name placeholder */}
            <div className="h-6 bg-[var(--glass-bg-strong)] rounded w-3/4 mb-2"></div>
            {/* Role placeholder */}
            <div className="h-4 bg-[var(--glass-bg-strong)] rounded w-1/2"></div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          {/* Likelihood score placeholder */}
          <div className="h-6 w-16 bg-[var(--glass-bg-strong)] rounded-full mb-2 ml-auto"></div>
          {/* Mentions placeholder */}
          <div className="h-3 w-12 bg-[var(--glass-bg-strong)] rounded ml-auto"></div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status placeholder */}
        <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-3 h-10"></div>

        {/* Key Evidence placeholder */}
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 h-24">
          <div className="space-y-2">
            <div className="h-2 bg-[var(--glass-bg-strong)] rounded w-full"></div>
            <div className="h-2 bg-[var(--glass-bg-strong)] rounded w-5/6"></div>
            <div className="h-2 bg-[var(--glass-bg-strong)] rounded w-4/6"></div>
          </div>
        </div>
      </div>

      {/* Footer placeholder */}
      <div className="mt-6 pt-4 border-t border-[var(--glass-border)] flex justify-between">
        <div className="h-3 w-20 bg-[var(--glass-bg-strong)] rounded"></div>
        <div className="h-3 w-24 bg-[var(--glass-bg-strong)] rounded"></div>
      </div>
    </div>
  );
};

export default PersonCardSkeleton;
