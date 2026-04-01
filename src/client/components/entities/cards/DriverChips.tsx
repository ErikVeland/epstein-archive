import React from 'react';
import { DriverChip } from '../../../utils/forensics';
import Tooltip from '../../common/Tooltip';

interface DriverChipsProps {
  chips: DriverChip[];
  className?: string;
}

export const DriverChips: React.FC<DriverChipsProps> = ({ chips, className = '' }) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-[var(--space-1)] ${className}`}>
      {chips.map((chip, idx) => {
        const style =
          chip.type === 'critical'
            ? 'risk-critical'
            : chip.type === 'verified'
              ? 'risk-minimal'
              : chip.type === 'unverified'
                ? 'risk-low'
                : 'bg-[var(--glass-bg)]/60 text-[var(--text-muted)] border-[var(--glass-border)]';
        const descriptions: Record<string, string> = {
          critical: 'Direct evidence driver (e.g., Black Book, Flight Logs).',
          verified: 'Verified media driver (e.g., photos).',
          context: 'Context indicator (e.g., high exposure or network hub).',
          unverified: 'Agentic or inferred-only indicator.',
        };
        const content = `${chip.label} — ${descriptions[chip.type] || ''}`;

        return (
          <Tooltip key={idx} content={content} position="top-end">
            <span
              className={`px-[var(--space-2)] py-[var(--space-1)] rounded text-[10px] uppercase font-medium tracking-wide border ${style}`}
            >
              {chip.label}
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
};
