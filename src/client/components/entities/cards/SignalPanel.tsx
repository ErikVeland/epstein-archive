import React from 'react';
import { SignalMetrics } from '../../../utils/forensics';
import Tooltip from '../../common/Tooltip';

interface SignalPanelProps {
  metrics: SignalMetrics;
}

function barColor(pct: number): string {
  if (pct >= 70) return 'var(--accent-danger)';
  if (pct >= 40) return 'var(--accent-warning)';
  if (pct >= 15) return 'var(--accent)';
  return 'var(--text-muted)';
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ metrics }) => {
  const bars: { label: string; value: number; tooltip: string }[] = [
    {
      label: 'Exposure',
      value: metrics.exposure,
      tooltip:
        'Exposure: relative mention volume across the corpus. Computed from log10(mentions+1) scaled to 0–100.',
    },
    {
      label: 'Network',
      value: metrics.connectivity,
      tooltip:
        'Network: connectivity score from relationship density. Based on connection count, capped for visualization.',
    },
    {
      label: 'Source',
      value: metrics.corroboration,
      tooltip:
        'Source: corroboration from distinct evidence types and document diversity contributing to the signal.',
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--space-1)] w-full py-[var(--space-1)]">
      {bars.map(({ label, value, tooltip }) => {
        const pct = Math.max(5, value);
        const color = barColor(value);
        return (
          <Tooltip key={label} content={tooltip} position="top-end">
            <div className="flex items-center gap-[var(--space-2)] text-[10px] font-medium tracking-wide">
              <span className="text-[var(--text-muted)] w-16">{label}</span>
              <div className="flex-1 h-[3px] bg-[var(--glass-bg)]/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="w-6 text-right tabular-nums" style={{ color, opacity: 0.85 }}>
                {Math.round(value)}
              </span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
};
