import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDegradedMode } from '../../contexts/useDegradedMode';

export const DegradedBanner: React.FC = () => {
  const { isDegraded } = useDegradedMode();
  if (!isDegraded) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/50 rounded-[var(--radius-lg)] p-3 flex items-center gap-3 mb-4 mt-4 text-amber-500 max-w-2xl mx-auto shadow-[var(--glass-shadow)] shadow-amber-500/5">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <div className="text-sm">
        <strong className="font-semibold block">System under heavy load</strong>
        <span className="opacity-90">
          Auto-retries have been paused. Functionality may be limited or cached. Please wait a
          moment before trying again.
        </span>
      </div>
    </div>
  );
};
