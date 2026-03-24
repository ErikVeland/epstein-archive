import React from 'react';

interface DocumentSkeletonProps {
  count?: number;
}

const DocumentSkeleton: React.FC<DocumentSkeletonProps> = ({ count = 12 }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 relative overflow-hidden"
          aria-label="Loading document preview"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-[var(--glass-highlight)] to-transparent"></div>

          {/* Document header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] w-12 h-12 animate-pulse"></div>
              <div>
                <div className="h-5 w-32 bg-[var(--glass-bg-highlight)] rounded mb-2 animate-pulse"></div>
                <div className="h-3 w-24 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
              </div>
            </div>
            <div className="h-6 w-12 bg-[var(--glass-bg-highlight)] rounded-full animate-pulse"></div>
          </div>

          {/* Document preview */}
          <div className="space-y-2 mb-4">
            <div className="h-3 w-full bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
            <div className="h-3 w-5/6 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
            <div className="h-3 w-4/6 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
          </div>

          {/* Document metadata */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)]">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-16 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
              <div className="h-3 w-12 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
            </div>
            <div className="h-3 w-20 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </>
  );
};

export default DocumentSkeleton;
