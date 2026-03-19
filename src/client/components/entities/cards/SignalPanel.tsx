import React from 'react';
import { SignalMetrics } from '../../../utils/forensics';
import Tooltip from '../../common/Tooltip';

interface SignalPanelProps {
  metrics: SignalMetrics;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ metrics }) => {
  return (
    <div className="flex flex-col gap-1 w-full py-1">
      <Tooltip
        content="Exposure: relative mention volume across the corpus. Computed from log10(mentions+1) scaled to 0–100."
        position="top-end"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
          <span className="text-[var(--text-muted)] w-16">Exposure</span>
          <div className="flex-1 h-[3px] bg-[var(--glass-bg)]/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--app-bg)]/70 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, metrics.exposure)}%` }}
            />
          </div>
        </div>
      </Tooltip>

      <Tooltip
        content="Network: connectivity score from relationship density. Based on connection count, capped for visualization."
        position="top-end"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
          <span className="text-[var(--text-muted)] w-16">Network</span>
          <div className="flex-1 h-[3px] bg-[var(--glass-bg)]/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--app-bg)]/70 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, metrics.connectivity)}%` }}
            />
          </div>
        </div>
      </Tooltip>

      <Tooltip
        content="Source: corroboration from distinct evidence types and document diversity contributing to the signal."
        position="top-end"
      >
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide">
          <span className="text-[var(--text-muted)] w-16">Source</span>
          <div className="flex-1 h-[3px] bg-[var(--glass-bg)]/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--app-bg)]/70 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, metrics.corroboration)}%` }}
            />
          </div>
        </div>
      </Tooltip>
    </div>
  );
};
