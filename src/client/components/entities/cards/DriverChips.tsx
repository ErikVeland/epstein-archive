import React from 'react';
import { DriverChip } from '../../../utils/forensics';
import { Tooltip, TooltipTrigger, TooltipPortal, TooltipContent } from '../../../design-system/lib';
import styles from './DriverChips.module.css';

interface DriverChipsProps {
  chips: DriverChip[];
  className?: string;
}

export const DriverChips: React.FC<DriverChipsProps> = ({ chips, className = '' }) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      {chips.map((chip, idx) => {
        const style =
          chip.type === 'critical'
            ? 'risk-critical'
            : chip.type === 'verified'
              ? 'risk-minimal'
              : chip.type === 'unverified'
                ? 'risk-low'
                : styles.chipNeutral;
        const descriptions: Record<string, string> = {
          critical: 'Direct evidence driver (e.g., Black Book, Flight Logs).',
          verified: 'Verified media driver (e.g., photos).',
          context: 'Context indicator (e.g., high exposure or network hub).',
          unverified: 'Agentic or inferred-only indicator.',
        };
        const content = `${chip.label} — ${descriptions[chip.type] || ''}`;

        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <span className={`${styles.chip} ${style}`}>{chip.label}</span>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="top" align="end">
                {content}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        );
      })}
    </div>
  );
};
