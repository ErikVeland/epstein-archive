import { Person } from '@client/types';
import { EvidenceLadderLevel, SignalMetrics, DriverChip } from '@client/utils/forensics';

export interface SubjectCardProps {
  person: Person;
  onClick: () => void;
  searchTerm?: string;
  damningMode?: boolean; // If true, apply stricter highlighting
}

export interface SignalPanelProps {
  metrics: SignalMetrics;
  className?: string;
}

export interface EvidenceBadgeProps {
  level: EvidenceLadderLevel;
  className?: string;
}

export interface DriverChipsProps {
  chips: DriverChip[];
  className?: string;
}
